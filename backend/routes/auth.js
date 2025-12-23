const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ===============================
   JWT TOKEN GENERATOR
================================ */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/* ===============================
   REGISTER (NORMAL + EXTERNAL)
================================ */
router.post(
  '/register',
  [
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6 }),
    body('profileId')
      .optional()
      .isNumeric()
      .withMessage('profileId must be numeric')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, profileId } = req.body;

      /* ===============================
         CHECK EXISTING USER
      =============================== */
      let existingUser;

      if (profileId) {
        existingUser = await User.findOne({ profileId });
      } else {
        existingUser = await User.findOne({ email });
      }

      if (existingUser) {
        const tokens = generateTokens(existingUser._id);
        existingUser.refreshToken = tokens.refreshToken;
        existingUser.onlineStatus = 'online';
        await existingUser.save();

        return res.json({
          message: 'User already exists',
          user: existingUser.toJSON(),
          ...tokens
        });
      }

      /* ===============================
         VALIDATE PASSWORD
      =============================== */
      if (!profileId && !password) {
        return res.status(400).json({
          message: 'Password is required for normal registration'
        });
      }

      /* ===============================
         CREATE USER
      =============================== */
      const user = new User({
        username,
        email,
        password: profileId ? undefined : password,
        profileId: profileId || null
      });

      await user.save();

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        ...tokens
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

/* ===============================
   LOGIN (NORMAL USERS ONLY)
================================ */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user || user.profileId) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      user.onlineStatus = 'online';
      await user.save();

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        ...tokens
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

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
  } catch (err) {
    res.status(500).json({ message: 'Server error during logout' });
  }
});

/* ===============================
   CURRENT USER
================================ */
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});
// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);
    
    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});


// ===============================
// PUBLIC DELETE USER BY PROFILE ID
// ===============================
router.delete(
  '/delete-by-profileId',
  [
    body('profileId')
      .notEmpty()
      .isNumeric()
      .withMessage('profileId is required and must be numeric')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const profileId = Number(req.body.profileId);

      /* ===============================
         FIND USER
      =============================== */
      const user = await User.findOne({ profileId });

      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      /* ===============================
         DELETE USER
      =============================== */
      await User.deleteOne({ profileId });

      res.json({
        message: 'User deleted successfully',
        deletedProfileId: profileId
      });
    } catch (err) {
      console.error('Public delete by profileId error:', err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);


module.exports = router;
