@echo off
echo ========================================
echo    Chat App Mobile - Quick Start
echo ========================================
echo.
echo 1. Checking if backend is running...
curl -s http://192.168.1.50:5000/api/health > nul
if %errorlevel% neq 0 (
    echo ❌ Backend not running! Please start it first:
    echo    cd ../backend
    echo    npm run dev
    echo.
    pause
    exit /b 1
)
echo ✅ Backend is running!
echo.

echo 2. Starting mobile app...
echo.
echo 📱 Instructions:
echo    1. Install 'Expo Go' app on your phone
echo    2. Scan the QR code that appears
echo    3. The app will load on your device
echo.
echo 🔧 If you have issues:
echo    - Run: npm run network-test
echo    - Check: npm run setup-check
echo.

npm start
