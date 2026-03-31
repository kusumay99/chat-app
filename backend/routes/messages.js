const express = require('express');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ======================================================
   HELPERS
====================================================== */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ======================================================
   UPLOAD SETUP
====================================================== */
const uploadDir = 'uploads/files';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* ======================================================
   SEND MESSAGE (TEXT / IMAGE / FILE)
====================================================== */
router.post('/send', auth, upload.single('file'), async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const file = req.file;

    if (!receiverId || !isValidId(receiverId)) {
      return res.status(400).json({ success: false, message: 'Valid receiverId required' });
    }

    if (!text && !file) {
      return res.status(400).json({ success: false, message: 'Message text or file required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    /* MESSAGE TYPE LOGIC */
    let messageType = 'text';
    if (file) {
      if (file.mimetype.startsWith('image/')) messageType = 'image';
      else messageType = 'file';
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text: text?.trim() || null,
      messageType,
      fileUrl: file ? file.path : null,
      fileName: file ? file.originalname : null,
      fileSize: file ? file.size : null,
      status: 'sent',
    });

    /* CONVERSATION */
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: {},
      });
    }

    const unread = conversation.unreadCount?.[receiverId] || 0;
    conversation.unreadCount = {
      ...conversation.unreadCount,
      [receiverId]: unread + 1,
    };

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    res.status(201).json({ success: true, message });

  } catch (err) {
    console.error('SEND MESSAGE ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ======================================================
   GET MESSAGES (BODY ONLY)
====================================================== */
router.post('/get-messages', auth, async (req, res) => {
  try {
    const { userId, page = 1, limit = 50 } = req.body;

    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ success: false, message: 'Valid userId required' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
        unreadCount: {},
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    /* UPDATE DELIVERY STATUS */
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        status: 'sent',
      },
      {
        status: 'delivered',
        deliveredAt: new Date(),
      }
    );

    res.json({
      success: true,
      conversationId: conversation._id,
      messages,
    });

  } catch (err) {
    console.error('GET MESSAGES ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ======================================================
   MARK AS READ
====================================================== */
router.post('/mark-read', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !isValidId(userId)) {
      return res.status(400).json({ success: false, message: 'Valid userId required' });
    }

    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        status: { $in: ['sent', 'delivered'] },
      },
      {
        status: 'read',
        readAt: new Date(),
      }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    });

    if (conversation) {
      conversation.unreadCount = {
        ...conversation.unreadCount,
        [req.user._id]: 0,
      };
      await conversation.save();
    }

    res.json({ success: true, message: 'Marked as read' });

  } catch (err) {
    console.error('READ ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   EDIT MESSAGE (BODY ONLY)
====================================================== */
router.post('/edit-message', auth, async (req, res) => {
  try {
    const { messageId, text } = req.body;

    if (!isValidId(messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid messageId' });
    }

    const message = await Message.findById(messageId);

    if (!message || message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    message.text = text?.trim() || message.text;
    message.edited = true;

    await message.save();

    res.json({ success: true, message });

  } catch (err) {
    console.error('EDIT ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   DELETE MESSAGE (SOFT DELETE)
====================================================== */
router.post('/delete-message', auth, async (req, res) => {
  try {
    const { messageId } = req.body;

    if (!isValidId(messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid messageId' });
    }

    const message = await Message.findById(messageId);

    if (!message || message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    await message.save();

    res.json({ success: true, message: 'Deleted' });

  } catch (err) {
    console.error('DELETE ERROR:', err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   GET CONVERSATIONS (BODY ONLY)
====================================================== */
router.post('/get-conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username avatar onlineStatus lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, conversations });

  } catch (err) {
    console.error('CONVERSATION ERROR:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;