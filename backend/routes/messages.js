const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

/* ======================================================
   MULTER CONFIG
====================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/files/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

/* ======================================================
   GET ALL CONVERSATIONS (BODY ONLY)
   body: {}
====================================================== */
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username avatar onlineStatus lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   GET MESSAGES
   body: { userId, page, limit }
====================================================== */
router.post('/messages', auth, async (req, res) => {
  try {
    const { userId, page = 1, limit = 50 } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId]
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ],
      isDeleted: false
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user._id,
        status: 'sent'
      },
      {
        status: 'delivered',
        deliveredAt: new Date()
      }
    );

    res.json({
      conversationId: conversation._id,
      messages: messages.reverse()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   SEND TEXT MESSAGE
   body: { receiverId, content, messageType }
====================================================== */
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId required' });
    }

    if (messageType === 'text' && !content) {
      return res.status(400).json({ message: 'content required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content,
      messageType
    });

    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: new Map()
      });
    }

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    const unread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), unread + 1);

    await conversation.save();

    res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   SEND FILE MESSAGE
   body (form-data): receiverId + file
====================================================== */
router.post('/send-file', auth, upload.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'receiverId required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'file required' });
    }

    let messageType = 'document';
    if (req.file.mimetype.startsWith('image/')) messageType = 'image';
    else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) messageType = 'audio';

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      messageType,
      fileUrl: `/uploads/files/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: new Map()
      });
    }

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    const unread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), unread + 1);

    await conversation.save();

    res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   MARK MESSAGES AS READ
   body: { conversationUserId }
====================================================== */
router.put('/mark-read', auth, async (req, res) => {
  try {
    const { conversationUserId } = req.body;

    if (!conversationUserId) {
      return res.status(400).json({ message: 'conversationUserId required' });
    }

    await Message.updateMany(
      {
        sender: conversationUserId,
        receiver: req.user._id,
        status: { $in: ['sent', 'delivered'] }
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, conversationUserId] }
    });

    if (conversation) {
      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
