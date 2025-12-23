const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'No token, authorization denied' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ message: 'Invalid token format' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ SUPPORT MULTIPLE TOKEN SHAPES
    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id ||
      decoded.user?.id ||
      decoded.user?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: 'Invalid token payload' });
    }

    const user = await User.findById(userId).select(
      '-password -refreshToken'
    );

    if (!user) {
      return res
        .status(401)
        .json({ message: 'User not found for this token' });
    }

    req.user = user; // ✅ FULL USER DOC
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
