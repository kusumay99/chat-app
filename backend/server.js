const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { connectDB, checkDBHealth, getDBStats } = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const postRoutes = require('./routes/posts');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// 🌍 CORS + Socket.IO setup for ANY frontend IP (mobile/web/expo)
app.use(
  cors({
    origin: '*', // allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: false,
  })
);

const io = new Server(server, {
  cors: {
    origin: '*', // allow any origin to connect
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/uploads', express.static('uploads'));


// Socket.IO handler
socketHandler(io);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbHealthy = await checkDBHealth();
  res.json({
    status: 'OK',
    message: 'Chat App Backend is running',
    database: dbHealthy ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Database statistics endpoint
app.get('/api/db-stats', async (req, res) => {
  const stats = await getDBStats();
  if (stats) {
    res.json({ success: true, stats });
  } else {
    res.status(500).json({ success: false, message: 'Failed to get database statistics' });
  }
});

const PORT = process.env.PORT || 5000;

// ✅ Start server on all interfaces (0.0.0.0) so other devices can reach it
const startServer = async () => {
  await connectDB();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accessible via LAN IP (e.g., http://192.168.x.x:${PORT})`);
    console.log(`📱 Mobile & Web can connect using your machine's IP`);
    console.log(`🔧 API Health: http://<your-ip>:${PORT}/api/health`);
  });
};

startServer();
