const express = require('express');
const multer = require('multer');
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
   HELPER: GET USER BY PROFILE ID
====================================================== */
const getUserByProfileId = async (profileId) => {
  return await User.findOne({ profileId: Number(profileId) });
};

/* ======================================================
   GET ALL CONVERSATIONS
   BODY: {}
====================================================== */
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'profileId username avatar onlineStatus lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender receiver', select: 'profileId username avatar' }
      })
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   GET MESSAGES
   BODY: { profileId, page, limit }
====================================================== */
router.post('/messages', auth, async (req, res) => {
  try {
    const { profileId, page = 1, limit = 50 } = req.body;

    if (!profileId || isNaN(profileId)) {
      return res.status(400).json({ message: 'profileId must be numeric' });
    }

    const otherUser = await getUserByProfileId(profileId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUser._id] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, otherUser._id],
        unreadCount: new Map()
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user._id }
      ],
      isDeleted: false
    })
      .populate('sender', 'profileId username avatar')
      .populate('receiver', 'profileId username avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Mark delivered
    await Message.updateMany(
      {
        sender: otherUser._id,
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
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   SEND TEXT MESSAGE
   BODY: { receiverProfileId, content }
====================================================== */
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverProfileId, content } = req.body;

    if (!receiverProfileId || isNaN(receiverProfileId)) {
      return res.status(400).json({ message: 'receiverProfileId must be numeric' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'content is required' });
    }

    const receiver = await getUserByProfileId(receiverProfileId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiver._id,
      content,
      messageType: 'text'
    });

    await message.populate('sender', 'profileId username avatar');
    await message.populate('receiver', 'profileId username avatar');

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiver._id] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiver._id],
        unreadCount: new Map()
      });
    }

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    const unread = conversation.unreadCount.get(receiver._id.toString()) || 0;
    conversation.unreadCount.set(receiver._id.toString(), unread + 1);

    await conversation.save();

    res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   SEND FILE MESSAGE
   FORM-DATA: receiverProfileId + file
====================================================== */
router.post('/send-file', auth, upload.single('file'), async (req, res) => {
  try {
    const { receiverProfileId } = req.body;

    if (!receiverProfileId || isNaN(receiverProfileId)) {
      return res.status(400).json({ message: 'receiverProfileId must be numeric' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }

    const receiver = await getUserByProfileId(receiverProfileId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    let messageType = 'document';
    if (req.file.mimetype.startsWith('image/')) messageType = 'image';
    else if (req.file.mimetype.startsWith('video/')) messageType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) messageType = 'audio';

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiver._id,
      messageType,
      fileUrl: `/uploads/files/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    await message.populate('sender', 'profileId username avatar');
    await message.populate('receiver', 'profileId username avatar');

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiver._id] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, receiver._id],
        unreadCount: new Map()
      });
    }

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    const unread = conversation.unreadCount.get(receiver._id.toString()) || 0;
    conversation.unreadCount.set(receiver._id.toString(), unread + 1);

    await conversation.save();

    res.status(201).json({ message });
  } catch (err) {
    console.error('Send file error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ======================================================
   MARK MESSAGES AS READ
   BODY: { conversationProfileId }
====================================================== */
router.put('/mark-read', auth, async (req, res) => {
  try {
    const { conversationProfileId } = req.body;

    if (!conversationProfileId || isNaN(conversationProfileId)) {
      return res.status(400).json({ message: 'conversationProfileId must be numeric' });
    }

    const otherUser = await getUserByProfileId(conversationProfileId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Message.updateMany(
      {
        sender: otherUser._id,
        receiver: req.user._id,
        status: { $in: ['sent', 'delivered'] }
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUser._id] }
    });

    if (conversation) {
      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
