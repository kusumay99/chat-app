const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

// DB
const { connectDB, checkDBHealth, getDBStats } = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const postRoutes = require("./routes/posts");

// Socket
const socketHandler = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);

/* ======================================================
   MIDDLEWARE
====================================================== */

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (better config)
app.use(
  cors({
    origin: "*", // ⚠️ change to frontend URL in production
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================================================
   SOCKET.IO
====================================================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach socket handler
socketHandler(io);

/* ======================================================
   API ROUTES
====================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/posts", postRoutes);

/* ======================================================
   HEALTH & DB STATS
====================================================== */

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const dbHealthy = await checkDBHealth();

    res.json({
      status: "OK",
      message: "Backend is running",
      database: dbHealthy ? "Connected" : "Disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: err.message,
    });
  }
});

// DB stats
app.get("/api/db-stats", async (req, res) => {
  try {
    const stats = await getDBStats();

    if (!stats) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch DB stats",
      });
    }

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ======================================================
   404 HANDLER
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, "0.0.0.0", () => {
      console.log("====================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
      console.log("====================================");
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
};

startServer();