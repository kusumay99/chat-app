const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

/* ======================================================
   HELPERS
====================================================== */
const sendError = (res, status = 500, message = "Server error") =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, data = {}, status = 200) =>
  res.status(status).json({ success: true, ...data });

/* ======================================================
   UPLOAD FOLDER
====================================================== */
const uploadDir = path.join(__dirname, "../uploads/avatars");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ======================================================
   MULTER CONFIG
====================================================== */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${req.user._id}-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

/* ======================================================
   🔍 SEARCH USERS
====================================================== */
router.post("/search", auth, async (req, res) => {
  try {
    let { query, profileId, page = 1, limit = 20 } = req.body;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 50) limit = 20;

    const filters = { _id: { $ne: req.user._id } };

    if (query) {
      filters.$or = [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    if (profileId && !isNaN(profileId)) {
      filters.profileId = Number(profileId);
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filters)
        .select("profileId username email avatar onlineStatus lastSeen")
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filters),
    ]);

    return sendSuccess(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ SEARCH ERROR:", err);
    return sendError(res, 500, "Search failed");
  }
});

/* ======================================================
   👤 GET PROFILE
====================================================== */
router.post("/profile", auth, async (req, res) => {
  try {
    const { userId, email, profileId } = req.body;

    let user = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).lean();
    } else if (email) {
      user = await User.findOne({
        email: email.toLowerCase().trim(),
      }).lean();
    } else if (profileId) {
      user = await User.findOne({
        profileId: Number(profileId),
      }).lean();
    } else {
      user = await User.findById(req.user._id).lean();
    }

    if (!user) return sendError(res, 404, "User not found");

    return sendSuccess(res, {
      profile: {
        profileId: user.profileId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        address: user.address,
        contactNumber: user.contactNumber,
        dateOfBirth: user.dateOfBirth,
        onlineStatus: user.onlineStatus,
        lastSeen: user.lastSeen,
      },
    });
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err);
    return sendError(res, 500, "Failed to fetch profile");
  }
});

/* ======================================================
   ✏️ UPDATE PROFILE
====================================================== */
router.put("/update", auth, async (req, res) => {
  try {
    const allowedFields = [
      "username",
      "gender",
      "dateOfBirth",
      "address",
      "contactNumber",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    );

    if (!user) return sendError(res, 404, "User not found");

    return sendSuccess(res, {
      message: "Profile updated successfully",
      user: {
        profileId: user.profileId,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("❌ UPDATE ERROR:", err);
    return sendError(res, 500, "Update failed");
  }
});

/* ======================================================
   🖼️ UPLOAD AVATAR
====================================================== */
router.post("/avatar", auth, (req, res) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) return sendError(res, 400, err.message);

    try {
      if (!req.file) return sendError(res, 400, "No file uploaded");

      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarPath },
        { new: true }
      );

      if (!user) return sendError(res, 404, "User not found");

      return sendSuccess(res, { avatar: user.avatar });
    } catch (err) {
      console.error("❌ AVATAR ERROR:", err);
      return sendError(res, 500, "Upload failed");
    }
  });
});

/* ======================================================
   🟢 UPDATE STATUS
====================================================== */
router.put("/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["online", "offline", "away", "busy"];

    if (!allowed.includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    const update = {
      onlineStatus: status,
    };

    if (status === "offline") {
      update.lastSeen = new Date();
    }

    await User.findByIdAndUpdate(req.user._id, update);

    return sendSuccess(res, { status });
  } catch (err) {
    console.error("❌ STATUS ERROR:", err);
    return sendError(res, 500, "Status update failed");
  }
});

/* ======================================================
   📋 LIST USERS
====================================================== */
router.post("/list", auth, async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.body;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 50) limit = 20;

    const skip = (page - 1) * limit;

    const query = {
      _id: { $ne: req.user._id },
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("profileId username avatar onlineStatus")
        .sort({ onlineStatus: -1, username: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(query),
    ]);

    return sendSuccess(res, {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ LIST ERROR:", err);
    return sendError(res, 500, "Failed to fetch users");
  }
});

module.exports = router;