// src/utils/socket.js
import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (userId) => {
  if (socket && socket.connected) return socket;

  socket = io("http://192.168.0.122:5000", {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,

    // ✅ IMPORTANT: send userId to backend
    auth: {
      userId,
    },
  });

  // ===========================
  // CONNECTION EVENTS
  // ===========================
  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ Socket error:", err.message);
  });

  return socket;
};

// ===========================
// GET SOCKET INSTANCE
// ===========================
export const getSocket = () => socket;

// ===========================
// DISCONNECT
// ===========================
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};