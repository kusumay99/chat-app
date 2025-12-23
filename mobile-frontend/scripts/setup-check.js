#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}`, exists ? 'green' : 'red');
  return exists;
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'ignore' });
    log(`✅ ${description}`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

function checkPackageJson() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredDeps = [
      'expo',
      'react',
      'react-native',
      'react-native-paper',
      '@react-navigation/native',
      'axios',
      'socket.io-client'
    ];
    
    let allPresent = true;
    requiredDeps.forEach(dep => {
      const present = packageJson.dependencies && packageJson.dependencies[dep];
      log(`${present ? '✅' : '❌'} Dependency: ${dep}`, present ? 'green' : 'red');
      if (!present) allPresent = false;
    });
    
    return allPresent;
  } catch (error) {
    log('❌ Error reading package.json', 'red');
    return false;
  }
}

function checkConfiguration() {
  const configPath = path.join(__dirname, '..', 'src', 'config', 'api.js');
  
  if (!fs.existsSync(configPath)) {
    log('❌ Configuration file missing: src/config/api.js', 'red');
    return false;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for placeholder IP
    if (configContent.includes('192.168.1.100')) {
      log('⚠️  Using default IP address (192.168.1.100)', 'yellow');
      log('   Update src/config/api.js with your actual IP address', 'yellow');
      return false;
    }
    
    // Check for localhost
    if (configContent.includes('localhost') || configContent.includes('127.0.0.1')) {
      log('❌ Using localhost - mobile devices cannot connect', 'red');
      log('   Replace localhost with your machine\'s IP address', 'red');
      return false;
    }
    
    log('✅ Configuration file looks good', 'green');
    return true;
  } catch (error) {
    log('❌ Error reading configuration file', 'red');
    return false;
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  const exists = fs.existsSync(nodeModulesPath);
  
  if (!exists) {
    log('❌ node_modules not found - run: npm install', 'red');
    return false;
  }
  
  // Check for key modules
  const keyModules = ['expo', 'react-native-paper', '@react-navigation'];
  let allPresent = true;
  
  keyModules.forEach(module => {
    const modulePath = path.join(nodeModulesPath, module);
    const present = fs.existsSync(modulePath);
    if (!present) {
      log(`❌ Missing module: ${module}`, 'red');
      allPresent = false;
    }
  });
  
  if (allPresent) {
    log('✅ All key modules installed', 'green');
  }
  
  return allPresent;
}

async function runSetupCheck() {
  log('🔍 Chat App Mobile - Setup Verification\n', 'blue');
  
  let allGood = true;
  
  // Check prerequisites
  log('📋 Prerequisites:', 'blue');
  allGood &= checkCommand('node --version', 'Node.js installed');
  allGood &= checkCommand('npm --version', 'npm available');
  
  // Check Expo CLI
  const expoInstalled = checkCommand('expo --version', 'Expo CLI installed');
  if (!expoInstalled) {
    log('   Install with: npm install -g @expo/cli', 'yellow');
    allGood = false;
  }
  
  console.log('');
  
  // Check project files
  log('📁 Project Structure:', 'blue');
  allGood &= checkFile('package.json', 'package.json exists');
  allGood &= checkFile('App.js', 'App.js exists');
  allGood &= checkFile('src/config/api.js', 'API configuration exists');
  allGood &= checkFile('src/contexts/AuthContext.js', 'Auth context exists');
  allGood &= checkFile('src/contexts/SocketContext.js', 'Socket context exists');
  
  console.log('');
  
  // Check dependencies
  log('📦 Dependencies:', 'blue');
  allGood &= checkNodeModules();
  allGood &= checkPackageJson();
  
  console.log('');
  
  // Check configuration
  log('⚙️  Configuration:', 'blue');
  allGood &= checkConfiguration();
  
  console.log('');
  
  // Final status
  if (allGood) {
    log('🎉 Setup verification passed! Ready to start development.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Start backend server: cd ../backend && npm run dev', 'reset');
    log('2. Start mobile app: npm start', 'reset');
    log('3. Scan QR code with Expo Go app', 'reset');
  } else {
    log('❌ Setup verification failed. Please fix the issues above.', 'red');
    log('\nCommon fixes:', 'blue');
    log('1. Install dependencies: npm install', 'reset');
    log('2. Install Expo CLI: npm install -g @expo/cli', 'reset');
    log('3. Update IP address in src/config/api.js', 'reset');
    log('4. Run network test: node scripts/network-test.js', 'reset');
  }
  
  console.log('');
}

// Run setup check
runSetupCheck().catch(console.error);
