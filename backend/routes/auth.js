const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Counter = require('../models/Counter');
const auth = require('../middleware/auth');

const router = express.Router();

/* ===============================
   EMAIL CONFIG
================================ */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ===============================
   HELPERS
================================ */

// Generate Tokens
const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  }),
});

// Safe User
const safeUser = (user) => ({
  _id: user._id,
  profileId: user.profileId,
  username: user.username,
  email: user.email,
  avatar: user.avatar || null,
  onlineStatus: user.onlineStatus || 'offline',
});

// Sequential ID
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
};

// OTP Generator
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP
const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Ayrene ✦" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your email • Ayrene',
    html: `<h2>Your OTP: ${otp}</h2><p>Valid for 10 minutes</p>`,
  });
};

// Validation
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

/* ===============================
   SEND OTP (NO PROFILE CREATION)
================================ */
router.post(
  '/send-otp',
  [
    body('email').isEmail(),
    body('username').isLength({ min: 3 }),
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { email, username } = req.body;

      let user = await User.findOne({ email });

      const otp = generateOTP();

      if (!user) {
        // TEMP USER (NOT VERIFIED)
        user = new User({
          email,
          username,
          isVerified: false,
        });
      }

      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;

      await user.save();
      await sendOTP(email, otp);

      res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
      console.error('SEND OTP ERROR:', err);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  }
);

/* ===============================
   VERIFY OTP → CREATE PROFILE
================================ */
router.post(
  '/verify-otp',
  [
    body('email').isEmail(),
    body('otp').notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { email, otp, password } = req.body;

      const user = await User.findOne({ email });

      if (!user)
        return res.status(404).json({ message: 'User not found' });

      if (user.isVerified)
        return res.status(400).json({ message: 'Already verified' });

      if (user.otp !== otp)
        return res.status(400).json({ message: 'Invalid OTP' });

      if (user.otpExpires < Date.now())
        return res.status(400).json({ message: 'OTP expired' });

      // 🔐 HASH PASSWORD
      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
      user.isVerified = true;
      user.otp = null;
      user.otpExpires = null;

      // 🎯 CREATE PROFILE ID ONLY HERE
      user.profileId = await getNextSequence('userId');

      await user.save();

      res.json({
        success: true,
        message: 'Account created successfully',
      });
    } catch (err) {
      console.error('VERIFY OTP ERROR:', err);
      res.status(500).json({ message: 'OTP verification failed' });
    }
  }
);

/* ===============================
   LOGIN
================================ */
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user)
        return res.status(401).json({ message: 'User not found' });

      if (!user.isVerified)
        return res.status(401).json({ message: 'Verify OTP first' });

      const match = await bcrypt.compare(password, user.password);

      if (!match)
        return res.status(401).json({ message: 'Wrong password' });

      const tokens = generateTokens(user._id);

      user.refreshToken = tokens.refreshToken;
      user.onlineStatus = 'online';
      user.lastSeen = new Date();

      await user.save();

      res.json({
        success: true,
        user: safeUser(user),
        ...tokens,
      });
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      res.status(500).json({ message: 'Login failed' });
    }
  }
);

/* ===============================
   REFRESH TOKEN
================================ */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(401).json({ message: 'No token provided' });

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: 'Unauthorized' });

    const tokens = generateTokens(user._id);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (err) {
    console.error('REFRESH ERROR:', err);
    res.status(500).json({ message: 'Refresh failed' });
  }
});

/* ===============================
   CURRENT USER
================================ */
router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ===============================
   LOGOUT
================================ */
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.refreshToken = null;
    user.onlineStatus = 'offline';
    user.lastSeen = new Date();

    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    res.status(500).json({ message: 'Logout failed' });
  }
});

/* ===============================
   DELETE PROFILE (SECURED)
================================ */
router.delete('/delete-profile', auth, async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user._id });

    res.json({
      success: true,
      message: 'Profile deleted',
    });
  } catch (err) {
    console.error('DELETE ERROR:', err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

module.exports = router;