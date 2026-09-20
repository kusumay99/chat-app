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
  lastSeen: user.lastSeen,
  isVerified: user.isVerified,
  gender: user.gender || null,
  dateOfBirth: user.dateOfBirth || null,
  address: user.address || null,
  contactNumber: user.contactNumber || null,
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
    subject: "Your Ayrene verification code",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f9fafb; padding:20px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          
          <h2 style="color:#6366f1; margin-bottom:10px;">Ayrene ✦</h2>
          
          <p style="font-size:16px; color:#333;">
            Verify your email address
          </p>

          <p style="font-size:14px; color:#666;">
            Use the OTP below to complete your signup. This code is valid for 10 minutes.
          </p>

          <div style="
            margin: 20px 0;
            font-size: 28px;
            letter-spacing: 6px;
            font-weight: bold;
            color: #111;
          ">
            ${otp}
          </div>

          <p style="font-size:13px; color:#999;">
            If you didn’t request this, you can safely ignore this email.
          </p>

          <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />

          <p style="font-size:12px; color:#aaa;">
            © ${new Date().getFullYear()} Ayrene. All rights reserved.
          </p>

        </div>
      </div>
    `,
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
/* ===============================
   SEND OTP
================================ */
router.post(
  "/send-otp",
  [
    body("email").isEmail(),
    body("username").isLength({ min: 3 }),
  ],
  async (req, res) => {
    try {
      if (!validate(req, res)) return;

      let { email, username } = req.body;

      // ✅ Normalize
      email = email.toLowerCase().trim();
      username = username.trim();

      let user = await User.findOne({ email });

      const otp = generateOTP();

      if (!user) {
        user = new User({
          email,
          username,
          isVerified: false,
        });
      } else {
        if (user.isVerified) {
          return res.status(400).json({
            message: "User already exists. Please login.",
          });
        }
        user.password = undefined; // Clear password if exists (for safety)
      }

      // ✅ Always store OTP as STRING
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;

      await user.save();

      await sendOTP(email, otp);

      res.json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (err) {
      console.error("SEND OTP ERROR:", err);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  }
);

/* ===============================
   VERIFY OTP
================================ */
router.post(
  "/verify-otp",
  [
    body("email").isEmail(),
    body("otp").notEmpty(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      // ✅ Validate request
      if (!validate(req, res)) return;

      let { email, otp, password } = req.body;

      // ✅ Normalize inputs
      email = email.toLowerCase().trim();
      otp = otp.toString().trim();
      password = password.trim(); // 🔥 IMPORTANT FIX


      // ✅ Find user
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "User already verified. Please login.",
        });
      }

      // ✅ OTP check
      if (!user.otp || user.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // ✅ OTP expiry check
      if (!user.otpExpires || user.otpExpires < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }

      // 🔐 Hash password
      user.password = password; // 🔥 plain password

      console.log("HASHED PASSWORD:", user.password);

      // 🎯 Generate profileId safely
      const profileId = await getNextSequence("userId");

      // ✅ Update user (single update)
      user.password = password;
      user.profileId = profileId;
      user.isVerified = true;
      user.otp = null;
      user.otpExpires = null;

      // ✅ Generate tokens (FIXED CONSISTENCY)
      const accessToken = jwt.sign(
        { userId: user._id }, // 🔥 FIXED (was id)
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: user._id }, // 🔥 FIXED (was id)
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      user.refreshToken = refreshToken;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Account created successfully",
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          profileId: user.profileId,
        },
      });
    } catch (err) {
      console.error("VERIFY OTP ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "OTP verification failed",
      });
    }
  }
);


/* ===============================
   LOGIN
================================ */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // ✅ Validate request
      if (!validate(req, res)) return;

      let { email, password } = req.body;

      // 🔥 IMPORTANT FIX 1: Normalize email
      email = email.toLowerCase().trim();
      password = password.trim();

      console.log("RAW PASSWORD (LOGIN):", password);

      // 🔥 IMPORTANT FIX 2: Include password explicitly
      const user = await User.findOne({ email }).select("+password");

      // DEBUG (remove later)
      console.log("LOGIN EMAIL:", email);
      console.log("USER FOUND:", user ? "YES" : "NO");
      console.log("Stored password:", user.password);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Invalid email or password", // 🔒 secure
        });
      }

      // ✅ Check verification
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify OTP before login",
        });
      }

      // 🔥 IMPORTANT FIX 3: Handle missing password
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "Account not properly set. Please register again",
        });
      }

      // 🔥 IMPORTANT FIX 4: Compare password correctly
      const isMatch = await bcrypt.compare(password, user.password);

      console.log("PASSWORD MATCH:", isMatch);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // ✅ Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // ✅ Update session info
      user.refreshToken = refreshToken;
      user.onlineStatus = "online";
      user.lastSeen = new Date();

      await user.save();

      // ✅ Send response
      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: safeUser(user),
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("🔥 LOGIN ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later",
      });
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
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    user: {
      profileId: user.profileId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      contactNumber: user.contactNumber,
    }
  });
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