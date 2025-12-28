const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // 1️⃣ Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token missing'
      });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(' ')[1];

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Find user
    const user = await User.findById(decoded.userId)
      .select('-password -refreshToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token user'
      });
    }

    // 5️⃣ Attach user info to request
    req.user = {
      userId: user._id,
      profileId: user.profileId, // 👈 profileId INCLUDED
      email: user.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired'
    });
  }
};
