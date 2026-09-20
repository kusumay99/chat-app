const express = require("express");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

/* ================= HELPERS ================= */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ================= UPLOAD ================= */
const uploadDir = "uploads/files";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.random();
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage });

/* ======================================================
   SEND MESSAGE
====================================================== */
router.post("/send", auth, upload.single("file"), async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const file = req.file;

    console.log("📤 SEND MESSAGE:", {
      from: req.user._id,
      to: receiverId,
      text,
    });

    // ✅ VALIDATION
    if (!receiverId || !isValidId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiverId",
      });
    }

    if (!text && !file) {
      return res.status(400).json({
        success: false,
        message: "Message required",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ DETECT TYPE
    let messageType = "text";
    if (file) {
      messageType = file.mimetype.startsWith("image/")
        ? "image"
        : "document";
    }

    // ✅ CREATE MESSAGE
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text: text || null,
      messageType,
      fileUrl: file?.path || null,
      fileName: file?.originalname || null,
      fileSize: file?.size || null,
    });

    // ✅ FIND OR CREATE CONVERSATION
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: new Map(),
      });
    }

    // ✅ FIX: Ensure Map exists
    if (!conversation.unreadCount) {
      conversation.unreadCount = new Map();
    }

    const currentUnread =
      conversation.unreadCount.get(receiverId.toString()) || 0;

    conversation.unreadCount.set(
      receiverId.toString(),
      currentUnread + 1
    );

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    return res.json({
      success: true,
      message,
    });
  } catch (err) {
    console.error("🔥 SEND ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ======================================================
   GET MESSAGES
====================================================== */
router.post("/get-messages", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    console.log("📩 GET MESSAGES:", {
      from: req.user._id,
      to: userId,
    });

    // ✅ VALIDATION
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    // ✅ FIND OR CREATE CONVERSATION
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
        unreadCount: new Map(),
      });
    }

    // ✅ GET MESSAGES
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar")
      .sort({ createdAt: 1 });

    // ✅ MARK DELIVERED
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        status: "sent",
      },
      {
        status: "delivered",
        deliveredAt: new Date(),
      }
    );

    return res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("🔥 GET ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ======================================================
   MARK AS READ
====================================================== */
router.post("/mark-read", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    console.log("👁️ MARK READ:", {
      reader: req.user._id,
      sender: userId,
    });

    // ✅ VALIDATION
    if (!userId || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    // ✅ UPDATE MESSAGES
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        status: { $in: ["sent", "delivered"] },
      },
      {
        status: "read",
        readAt: new Date(),
      }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    });

    if (conversation) {
      if (!conversation.unreadCount) {
        conversation.unreadCount = new Map();
      }

      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error("🔥 READ ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ======================================================
   GET CONVERSATIONS
====================================================== */
router.post("/get-conversations", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username avatar")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    const formatted = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      );

      return {
        _id: conv._id,
        otherUser,
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount:
          conv.unreadCount?.get(req.user._id.toString()) || 0,
      };
    });

    return res.json({
      success: true,
      conversations: formatted,
    });
  } catch (err) {
    console.error("🔥 CONVO ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;