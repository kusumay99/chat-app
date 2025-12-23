# Chat App Mobile Frontend

A React Native mobile application built with Expo and Material Design components that connects to the existing Chat App backend.

## Features

- **Material Design UI**: Modern, responsive interface using React Native Paper
- **Real-time Messaging**: Socket.IO integration for instant messaging
- **User Authentication**: Secure login/register with token-based auth
- **Dark/Light Theme**: Toggle between themes with persistent settings
- **Network Configuration**: Easy backend connection setup
- **Offline Support**: Graceful handling of network issues

## Prerequisites

Before setting up the mobile app, ensure you have:

1. **Node.js** (v16 or higher)
2. **Expo CLI**: `npm install -g @expo/cli`
3. **Expo Go app** on your mobile device (iOS/Android)
4. **Backend server** running on your development machine

## Quick Start

### 1. Install Dependencies

```bash
cd mobile-frontend
npm install
```

### 2. Configure Network Settings

**IMPORTANT**: You need to configure the app to connect to your backend server.

#### Find Your Local IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**macOS/Linux:**
```bash
ifconfig
```
Look for "inet" address under your active network interface

#### Update Configuration

Edit `src/config/api.js` and replace `192.168.1.100` with your actual IP address:

```javascript
const config = {
  development: {
    API_BASE_URL: `http://YOUR_IP_ADDRESS:5000/api`,
    SOCKET_URL: `http://YOUR_IP_ADDRESS:5000`,
  },
  // ...
};
```

**Example:**
```javascript
const config = {
  development: {
    API_BASE_URL: `http://192.168.1.105:5000/api`,
    SOCKET_URL: `http://192.168.1.105:5000`,
  },
  // ...
};
```

### 3. Start the Development Server

```bash
npm start
```

This will start the Expo development server and show a QR code.

### 4. Run on Your Device

1. Install **Expo Go** from App Store (iOS) or Google Play (Android)
2. Scan the QR code with your device camera (iOS) or Expo Go app (Android)
3. The app will load on your device

## Backend Setup

Ensure your backend server is configured to accept connections from mobile devices:

### 1. Update Backend CORS Settings

In your backend `server.js`, make sure CORS is configured for mobile:

```javascript
// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:19006", "*"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:19006", "*"],
  credentials: true
}));
```

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

The server should show:
```
🚀 Server running on port 5000
🌐 Web Frontend: http://localhost:3000
📱 Mobile Frontend: http://localhost:19006
```

## Network Configuration Guide

### Development Setup

1. **Same WiFi Network**: Ensure your development machine and mobile device are on the same WiFi network
2. **Firewall Settings**: Make sure your firewall allows connections on port 5000
3. **IP Address**: Use your machine's local IP address, not `localhost` or `127.0.0.1`

### Testing Connection

1. Open the mobile app
2. Go to **Profile** → **Settings**
3. Under **Network Settings**, test the connection
4. If it fails, verify your IP address and backend status

## Troubleshooting

### Common Issues

#### 1. "Network Error" or "Connection Failed"

**Causes:**
- Wrong IP address in configuration
- Backend server not running
- Firewall blocking connections
- Different WiFi networks

**Solutions:**
1. Verify backend is running: `curl http://YOUR_IP:5000/api/health`
2. Check IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update `src/config/api.js` with correct IP
4. Restart Expo development server
5. Check firewall settings

#### 2. "Socket Connection Failed"

**Causes:**
- Socket.IO connection issues
- CORS configuration problems

**Solutions:**
1. Check backend CORS settings include mobile origins
2. Verify Socket.IO server is running
3. Test with web frontend first

#### 3. "Authentication Failed"

**Causes:**
- API endpoint mismatch
- Token storage issues

**Solutions:**
1. Clear app data: Shake device → "Clear AsyncStorage"
2. Verify API endpoints match backend routes
3. Check network connectivity

#### 4. App Won't Load

**Causes:**
- Expo CLI issues
- Metro bundler problems

**Solutions:**
1. Clear Expo cache: `expo start -c`
2. Restart Metro bundler
3. Clear npm cache: `npm start -- --reset-cache`

### Network Debugging

#### Test Backend Connectivity

```bash
# Test health endpoint
curl http://YOUR_IP:5000/api/health

# Expected response:
{
  "status": "OK",
  "message": "Chat App Backend is running",
  "database": "Connected",
  "timestamp": "..."
}
```

#### Check Mobile Network

In the app:
1. Go to **Settings**
2. Check **Network Status**
3. Use **Test Connection** button

### Advanced Configuration

#### Custom Backend URL

For production or custom setups, modify `src/config/api.js`:

```javascript
const config = {
  development: {
    API_BASE_URL: `http://your-custom-domain.com/api`,
    SOCKET_URL: `http://your-custom-domain.com`,
  },
  production: {
    API_BASE_URL: 'https://your-production-api.com/api',
    SOCKET_URL: 'https://your-production-api.com',
  }
};
```

#### Environment Variables

Create `.env` file in mobile-frontend directory:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000/api
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.100:5000
```

Then update `src/config/api.js`:

```javascript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://192.168.1.100:5000/api';
const SOCKET_URL = Constants.expoConfig?.extra?.socketUrl || 'http://192.168.1.100:5000';
```

## Building for Production

### Android APK

```bash
expo build:android
```

### iOS IPA

```bash
expo build:ios
```

### Expo Application Services (EAS)

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

## Project Structure

```
mobile-frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth, Socket, Theme)
│   ├── navigation/         # Navigation configuration
│   ├── screens/           # Screen components
│   │   ├── auth/          # Login/Register screens
│   │   ├── chat/          # Chat screen
│   │   ├── chats/         # Conversations list
│   │   ├── posts/         # Posts feed
│   │   ├── profile/       # User profile
│   │   ├── settings/      # App settings
│   │   └── users/         # Users list
│   ├── theme/             # Material Design theme
│   └── config/            # API and app configuration
├── App.js                 # Main app component
├── package.json          # Dependencies
└── README.md            # This file
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Dependencies

### Core
- **Expo**: React Native development platform
- **React Navigation**: Navigation library
- **React Native Paper**: Material Design components

### Networking
- **Axios**: HTTP client
- **Socket.IO Client**: Real-time communication

### Storage & Security
- **AsyncStorage**: Local data storage
- **React Native Keychain**: Secure credential storage

### Utilities
- **Date-fns**: Date formatting
- **React Native Vector Icons**: Icon library
- **React Native Toast Message**: Toast notifications

## Support

If you encounter issues:

1. Check this README's troubleshooting section
2. Verify backend server is running and accessible
3. Ensure correct network configuration
4. Test with web frontend first to isolate issues

## License

This project is part of the Chat App suite and follows the same licensing terms.
