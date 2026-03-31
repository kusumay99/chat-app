const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ================= DEBUG LOGS =================
    console.log("📥 AUTH HEADER:", authHeader);
    console.log("👉 ROUTE:", req.method, req.originalUrl);

    // ================= OPTIONAL: PUBLIC ROUTES =================
    // Uncomment if you want some routes to skip auth
    /*
    const publicRoutes = ["/api/auth/login", "/api/auth/register"];
    if (publicRoutes.includes(req.originalUrl)) {
      return next();
    }
    */

    // ================= TOKEN FORMAT CHECK =================
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    // ================= EXTRACT TOKEN =================
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not provided",
      });
    }

    // ================= VERIFY TOKEN =================
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("❌ JWT ERROR:", err.message);

      return res.status(401).json({
        success: false,
        message:
          err.name === "TokenExpiredError"
            ? "Token expired"
            : "Invalid token",
      });
    }

    // ================= VALIDATE USER ID =================
    if (
      !decoded ||
      !decoded.userId ||
      !mongoose.Types.ObjectId.isValid(decoded.userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // ================= CHECK USER EXISTS =================
    const user = await User.findById(decoded.userId).select("_id");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // ================= ATTACH USER =================
    req.user = {
      _id: user._id,
    };

    next();

  } catch (error) {
    console.error("🔥 AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};