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
   ENSURE UPLOAD FOLDER EXISTS
====================================================== */
const uploadDir = 'uploads/files';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ======================================================
   MULTER CONFIG
====================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/* ======================================================
   SEND TEXT MESSAGE
====================================================== */
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({
        success: false,
        message: 'receiverId and text are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'Invalid receiverId' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ success: false, message: 'Receiver not found' });

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text,
      messageType: 'text',
      status: 'sent'
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: new Map()
      });
    }

    const unread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), unread + 1);
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
   SEND FILE MESSAGE
====================================================== */
router.post('/send-file', auth, upload.single('file'), async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ success: false, message: 'receiverId required' });
    if (!req.file) return res.status(400).json({ success: false, message: 'file required' });

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
      fileSize: req.file.size,
      status: 'sent'
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiverId],
        unreadCount: new Map()
      });
    }

    const unread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), unread + 1);
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('SEND FILE ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ======================================================
   GET MESSAGES
====================================================== */
router.post('/messages', auth, async (req, res) => {
  try {
    const { userId, page = 1, limit = 50 } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
        unreadCount: new Map()
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    await Message.updateMany(
      { sender: userId, receiver: req.user._id, status: 'sent' },
      { status: 'delivered', deliveredAt: new Date() }
    );

    res.json({ success: true, conversationId: conversation._id, messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ======================================================
   GET CONVERSATIONS
====================================================== */
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username avatar onlineStatus lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json({ success: true, conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ======================================================
   MARK MESSAGES AS READ
====================================================== */
router.put('/mark-read', auth, async (req, res) => {
  try {
    const { conversationUserId } = req.body;
    if (!conversationUserId) return res.status(400).json({ success: false, message: 'conversationUserId required' });

    await Message.updateMany(
      {
        sender: conversationUserId,
        receiver: req.user._id,
        status: { $in: ['sent', 'delivered'] }
      },
      { status: 'read', readAt: new Date() }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, conversationUserId] }
    });

    if (conversation) {
      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
