const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

// DB
const { connectDB, checkDBHealth, getDBStats } = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const postRoutes = require('./routes/posts');

// Socket
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

/* ======================================================
   MIDDLEWARE
====================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: '*', // allow all origins (dev only)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: false
  })
);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ======================================================
   SOCKET.IO
====================================================== */
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket handler
socketHandler(io);

/* ======================================================
   API ROUTES
====================================================== */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);

/* ======================================================
   HEALTH & DB STATS
====================================================== */
app.get('/api/health', async (req, res) => {
  const dbHealthy = await checkDBHealth();
  res.json({
    status: 'OK',
    message: 'Chat App Backend is running',
    database: dbHealthy ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-stats', async (req, res) => {
  const stats = await getDBStats();
  if (stats) {
    res.json({ success: true, stats });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics'
    });
  }
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌐 LAN Access: http://<your-ip>:${PORT}`);
      console.log(`🔧 Health: http://<your-ip>:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
