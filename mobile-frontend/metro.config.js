const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

// Add support for React Native Paper
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-vector-icons': '@expo/vector-icons',
};

module.exports = config;
