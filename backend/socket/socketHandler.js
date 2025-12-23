const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const connectedUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.username} connected with socket ${socket.id}`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);
    
    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      onlineStatus: 'online'
    });

    // Join user to their personal room
    socket.join(socket.userId);

    // Broadcast user online status to their contacts
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      username: socket.user.username,
      onlineStatus: 'online'
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        const { receiverId, content, messageType = 'text' } = data;

        if (!receiverId || (!content && messageType === 'text')) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Create message
        const message = new Message({
          sender: socket.userId,
          receiver: receiverId,
          content,
          messageType
        });

        await message.save();
        await message.populate('sender', 'username avatar');
        await message.populate('receiver', 'username avatar');

        // Update or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, receiverId] }
        });

        if (!conversation) {
          conversation = new Conversation({
            participants: [socket.userId, receiverId]
          });
        }

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        
        // Update unread count for receiver
        const currentUnreadCount = conversation.unreadCount.get(receiverId) || 0;
        conversation.unreadCount.set(receiverId, currentUnreadCount + 1);
        
        await conversation.save();

        // Emit to sender (confirmation)
        socket.emit('messageSent', { message });

        // Emit to receiver if online
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('messageReceived', { message });
          
          // Auto-mark as delivered if receiver is online
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();
          
          // Notify sender about delivery
          socket.emit('messageDelivered', {
            messageId: message._id,
            deliveredAt: message.deliveredAt
          });
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message delivery confirmation
    socket.on('messageDelivered', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === socket.userId) {
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();

          // Notify sender
          const senderSocketId = connectedUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageDelivered', {
              messageId: message._id,
              deliveredAt: message.deliveredAt
            });
          }
        }
      } catch (error) {
        console.error('Message delivered error:', error);
      }
    });

    // Handle message read confirmation
    socket.on('messageRead', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === socket.userId) {
          message.status = 'read';
          message.readAt = new Date();
          await message.save();

          // Notify sender
          const senderSocketId = connectedUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageRead', {
              messageId: message._id,
              readAt: message.readAt
            });
          }
        }
      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', {
          userId: socket.userId,
          username: socket.user.username,
          isTyping
        });
      }
    });

    // Handle user status updates
    socket.on('updateStatus', async (data) => {
      try {
        const { status } = data;
        
        await User.findByIdAndUpdate(socket.userId, {
          onlineStatus: status,
          lastSeen: status === 'offline' ? new Date() : undefined
        });

        // Broadcast status change
        socket.broadcast.emit('userStatusChanged', {
          userId: socket.userId,
          onlineStatus: status,
          lastSeen: status === 'offline' ? new Date() : null
        });
      } catch (error) {
        console.error('Update status error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        onlineStatus: 'offline',
        lastSeen: new Date()
      });

      // Broadcast user offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.userId,
        username: socket.user.username,
        onlineStatus: 'offline',
        lastSeen: new Date()
      });
    });
  });
};

module.exports = socketHandler;
