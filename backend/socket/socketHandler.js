const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const connectedUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  // 🔐 Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');

      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      const username = socket.user?.username || socket.user?.email || socket.userId;
      console.log(`User ${username} connected with socket ${socket.id}`);

      // Store connection
      connectedUsers.set(socket.userId, socket.id);
      console.log('Connected users:', Array.from(connectedUsers.keys()));

      // Update online status
      await User.findByIdAndUpdate(socket.userId, { onlineStatus: 'online' });

      // Join personal room
      socket.join(socket.userId);

      // Notify others
      socket.broadcast.emit('userOnline', {
        userId: socket.userId,
        username,
        onlineStatus: 'online'
      });

      // ===============================
      // 💬 SEND MESSAGE
      // ===============================
      socket.on('sendMessage', async (data) => {
        try {
          const { receiverId, text, messageType = 'text', fileUrl, fileName, fileSize } = data;

          if (!receiverId || (messageType === 'text' && !text?.trim())) {
            return socket.emit('error', { message: 'Invalid message data' });
          }

          const message = new Message({
            sender: socket.userId,
            receiver: receiverId,
            messageType,
            text: messageType === 'text' ? text.trim() : undefined,
            fileUrl: messageType !== 'text' ? fileUrl : undefined,
            fileName: messageType !== 'text' ? fileName : undefined,
            fileSize: messageType !== 'text' ? fileSize : undefined
          });

          await message.save();
          await message.populate('sender', 'username avatar');
          await message.populate('receiver', 'username avatar');

          // ✅ Conversation handling
          let conversation = await Conversation.findOne({
            participants: { $all: [socket.userId, receiverId] }
          });

          if (!conversation) {
            conversation = new Conversation({
              participants: [socket.userId, receiverId],
              unreadCount: new Map()
            });
          }

          if (!conversation.unreadCount) conversation.unreadCount = new Map();

          conversation.lastMessage = message._id;
          conversation.lastMessageAt = message.createdAt;

          const currentUnread = conversation.unreadCount.get(receiverId) || 0;
          conversation.unreadCount.set(receiverId, currentUnread + 1);

          await conversation.save();

          // Emit events
          socket.emit('messageSent', { message });

          const receiverSocketId = connectedUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageReceived', { message });

            // mark delivered
            message.status = 'delivered';
            message.deliveredAt = new Date();
            await message.save();

            socket.emit('messageDelivered', {
              messageId: message._id,
              deliveredAt: message.deliveredAt
            });
          }
        } catch (err) {
          console.error('Send message error:', err);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // ===============================
      // ✅ MESSAGE DELIVERED
      // ===============================
      socket.on('messageDelivered', async ({ messageId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          if (message.receiver.toString() === socket.userId) {
            message.status = 'delivered';
            message.deliveredAt = new Date();
            await message.save();

            const senderSocketId = connectedUsers.get(message.sender.toString());
            if (senderSocketId) {
              io.to(senderSocketId).emit('messageDelivered', {
                messageId: message._id,
                deliveredAt: message.deliveredAt
              });
            }
          }
        } catch (err) {
          console.error('Message delivered error:', err);
        }
      });

      // ===============================
      // 👁 MESSAGE READ
      // ===============================
      socket.on('messageRead', async ({ messageId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          if (message.receiver.toString() === socket.userId) {
            message.status = 'read';
            message.readAt = new Date();
            await message.save();

            const senderSocketId = connectedUsers.get(message.sender.toString());
            if (senderSocketId) {
              io.to(senderSocketId).emit('messageRead', {
                messageId: message._id,
                readAt: message.readAt
              });
            }
          }
        } catch (err) {
          console.error('Message read error:', err);
        }
      });

      // ===============================
      // ✍️ TYPING
      // ===============================
      socket.on('typing', ({ receiverId, isTyping }) => {
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('userTyping', {
            userId: socket.userId,
            username: socket.user?.username || socket.user?.email || socket.userId,
            isTyping
          });
        }
      });

      // ===============================
      // 🔄 STATUS UPDATE
      // ===============================
      socket.on('updateStatus', async ({ status }) => {
        try {
          await User.findByIdAndUpdate(socket.userId, {
            onlineStatus: status,
            lastSeen: status === 'offline' ? new Date() : undefined
          });

          socket.broadcast.emit('userStatusChanged', {
            userId: socket.userId,
            onlineStatus: status,
            lastSeen: status === 'offline' ? new Date() : null
          });
        } catch (err) {
          console.error('Update status error:', err);
        }
      });

      // ===============================
      // ❌ DISCONNECT
      // ===============================
      socket.on('disconnect', async () => {
        console.log(`User ${username} disconnected`);
        connectedUsers.delete(socket.userId);

        await User.findByIdAndUpdate(socket.userId, {
          onlineStatus: 'offline',
          lastSeen: new Date()
        });

        socket.broadcast.emit('userOffline', {
          userId: socket.userId,
          username,
          onlineStatus: 'offline',
          lastSeen: new Date()
        });
      });
    } catch (err) {
      console.error('Socket connection error:', err);
    }
  });
};

module.exports = socketHandler;