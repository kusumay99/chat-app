const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ===============================
   ERROR HELPERS
================================ */
const validationError = (res, errors) =>
  res.status(400).json({ success: false, message: 'Validation failed', errors });

const authError = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, message });

const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, message });

/* ===============================
   TOKEN GENERATOR
================================ */
const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
});

/* ===============================
   AUTO GENERATE UNIQUE PROFILE ID
================================ */
const generateProfileId = async () => {
  let profileId;
  let exists = true;

  while (exists) {
    profileId = Math.floor(100 + Math.random() * 900); // 3-digit
    exists = await User.findOne({ profileId });
  }

  return profileId;
};

/* ===============================
   REGISTER (DUPLICATE USERNAMES ALLOWED)
================================ */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters'),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),

    body('profileId')
      .optional()
      .isNumeric()
      .withMessage('profileId must be numeric')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return validationError(res, errors.array());

      const { username, email, password, profileId } = req.body;
      const normalizedEmail = email.toLowerCase();

      // ✅ EMAIL must be unique
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // ✅ ProfileId must be unique
      let finalProfileId = profileId;
      if (!finalProfileId) {
        finalProfileId = await generateProfileId();
      } else {
        const profileExists = await User.findOne({ profileId: finalProfileId });
        if (profileExists) {
          return res.status(409).json({
            success: false,
            message: 'profileId already in use'
          });
        }
      }

      // 🔐 Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ Username DUPLICATES ARE ALLOWED
      const user = await User.create({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        profileId: finalProfileId
      });

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profileId: user.profileId,
          avatar: user.avatar,
          gender: user.gender,
          onlineStatus: user.onlineStatus
        },
        ...tokens
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      serverError(res, 'Failed to register user');
    }
  }
);

/* ===============================
   LOGIN
================================ */
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return validationError(res, errors.array());

      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) return authError(res, 'Invalid email or password');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return authError(res, 'Invalid email or password');

      if (!user.profileId) {
        user.profileId = await generateProfileId();
      }

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      user.onlineStatus = 'online';
      user.lastSeen = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profileId: user.profileId,
          avatar: user.avatar,
          gender: user.gender,
          onlineStatus: user.onlineStatus
        },
        ...tokens
      });
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      serverError(res, 'Login failed');
    }
  }
);

/* ===============================
   CURRENT USER
================================ */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error('ME ERROR:', err);
    serverError(res, 'Unable to fetch user');
  }
});

/* ===============================
   REFRESH TOKEN
================================ */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return validationError(res, errors.array());

      const { refreshToken } = req.body;
      let decoded;

      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch {
        return authError(res, 'Invalid refresh token');
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return authError(res, 'Invalid refresh token');
      }

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.json({ success: true, ...tokens });
    } catch (err) {
      console.error('REFRESH ERROR:', err);
      serverError(res, 'Token refresh failed');
    }
  }
);

/* ===============================
   LOGOUT
================================ */
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.refreshToken = null;
    user.onlineStatus = 'offline';
    user.lastSeen = new Date();
    await user.save();

    res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('LOGOUT ERROR:', err);
    serverError(res, 'Logout failed');
  }
});

/* ===============================
   DELETE BY PROFILE ID
================================ */
router.delete(
  '/delete-by-profileId',
  [body('profileId').isNumeric().withMessage('profileId must be numeric')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return validationError(res, errors.array());

      const user = await User.findOneAndDelete({ profileId: req.body.profileId });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error('DELETE ERROR:', err);
      serverError(res, 'User deletion failed');
    }
  }
);

module.exports = router;
