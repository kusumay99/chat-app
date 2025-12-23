const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT tokens
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

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    user.onlineStatus = 'online';
    await user.save();

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
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

// Logout
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

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

//  Delete user account
router.delete(
  '/delete',
  auth,
  [body('password').exists()],
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      const isMatch = await user.comparePassword(req.body.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Password incorrect' });
      }

      await User.findByIdAndDelete(user._id);

      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);
