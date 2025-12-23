import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../config/api';
import Toast from 'react-native-toast-message';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && token) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, token]);

  const initializeSocket = async () => {
    try {
      // Build socket URL from API base (http(s) -> ws(s)) and remove trailing /api
      const apiBase = await getApiBaseUrl();
      let socketHost = apiBase.replace(/^https?:\/\//i, '');
      socketHost = socketHost.replace(/\/+$/, '');
      // If apiBase ends with /api, remove it
      socketHost = socketHost.replace(/\/api$/i, '');
      const protocol = apiBase.startsWith('https') ? 'wss://' : 'ws://';
      const socketUrl = `${protocol}${socketHost}`;

      const newSocket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket'],
        timeout: 20000,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setSocket(newSocket);
        setIsConnected(true);
        Toast.show({
          type: 'success',
          text1: 'Connected',
          text2: 'Real-time messaging enabled',
          visibilityTime: 2000,
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setSocket(null);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Unable to connect to server',
        });
      });

      // Handle incoming messages
      newSocket.on('messageReceived', (data) => {
        setMessages(prev => [...prev, data.message]);
        
        // Auto-mark as delivered
        newSocket.emit('messageDelivered', { messageId: data.message._id });
      });

      // Handle message sent confirmation
      newSocket.on('messageSent', (data) => {
        setMessages(prev => [...prev, data.message]);
      });

      // Handle message delivery status
      newSocket.on('messageDelivered', (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, status: 'delivered', deliveredAt: data.deliveredAt }
            : msg
        ));
      });

      // Handle message read status
      newSocket.on('messageRead', (data) => {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, status: 'read', readAt: data.readAt }
            : msg
        ));
      });

      // Handle user online status
      newSocket.on('userOnline', (data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(data.userId);
          return newSet;
        });
      });

      newSocket.on('userOffline', (data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      // Handle typing indicators
      newSocket.on('userTyping', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (data.isTyping) {
            newMap.set(data.userId, true);
          } else {
            newMap.delete(data.userId);
          }
          return newMap;
        });
      });

      // Handle errors
      newSocket.on('error', (error) => {
        console.error('Socket error:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Socket Error',
          text2: error.message,
        });
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      Toast.show({
        type: 'error',
        text1: 'Connection Failed',
        text2: 'Unable to establish real-time connection',
      });
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      setMessages([]);
      setTypingUsers(new Map());
    }
  };

  const sendMessage = (receiverId, content, messageType = 'text') => {
    if (socket && isConnected) {
      socket.emit('sendMessage', {
        receiverId,
        content,
        messageType
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Not Connected',
        text2: 'Unable to send message. Please check your connection.',
      });
    }
  };

  const markMessageAsRead = (messageId) => {
    if (socket && isConnected) {
      socket.emit('messageRead', { messageId });
    }
  };

  const markMessageAsDelivered = (messageId) => {
    if (socket && isConnected) {
      socket.emit('messageDelivered', { messageId });
    }
  };

  const sendTyping = (receiverId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', { receiverId, isTyping });
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    markMessageAsRead,
    markMessageAsDelivered,
    sendTyping,
    messages,
    setMessages,
    typingUsers
  };
  

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
