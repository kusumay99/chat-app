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
  res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    errors
  });

const authError = (res, message = 'Unauthorized') =>
  res.status(401).json({
    success: false,
    error: 'AUTH_ERROR',
    message
  });

const conflictError = (res, message) =>
  res.status(409).json({
    success: false,
    error: 'CONFLICT_ERROR',
    message
  });

const serverError = (res, err, defaultMsg = 'Internal server error') =>
  res.status(500).json({
    success: false,
    error: 'SERVER_ERROR',
    message: err.message || defaultMsg,
    stack: err.stack // remove in production
  });

/* ===============================
   TOKEN GENERATOR
================================ */
const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
});

/* ===============================
   REGISTER
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

      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) return conflictError(res, 'Email already exists');

      const hashedPassword = await bcrypt.hash(password, 10);
      const profileIdNumber = profileId ? Number(profileId) : null;

      const user = await User.create({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        profileId: profileIdNumber
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
          profileId: user.profileId ?? undefined,
          avatar: user.avatar,
          gender: user.gender,
          onlineStatus: user.onlineStatus
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (err) {
      console.error('REGISTER ERROR DETAILS:', err);
      serverError(res, err, 'Registration failed');
    }
  }
);

/* ===============================
   LOGIN
================================ */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required'),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return validationError(res, errors.array());

      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) return authError(res, 'Invalid email or password');

      const isMatch = bcrypt.compare(password, user.password);
      if (!isMatch) return authError(res, 'Invalid email or password');

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
          profileId: user.profileId || undefined,
          avatar: user.avatar,
          gender: user.gender,
          onlineStatus: user.onlineStatus
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (err) {
      console.error('LOGIN ERROR DETAILS:', err);
      serverError(res, err, 'Login failed');
    }
  }
);

/* ===============================
   CURRENT USER
================================ */
// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
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

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout' });
  }
});

/* ===============================
   DELETE BY PROFILE ID
================================ */
router.delete(
  '/delete-by-email',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationError(res, errors.array());
      }

      const user = await User.findOneAndDelete({ email: req.body.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (err) {
      console.error('DELETE ERROR:', err);
      serverError(res, 'User deletion failed');
    }
  }
);


module.exports = router;
