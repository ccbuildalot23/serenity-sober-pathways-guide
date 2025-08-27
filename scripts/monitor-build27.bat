@echo off
echo.
echo ========================================
echo   TestFlight Build 27 Monitor Launcher
echo ========================================
echo.

echo 🚀 Starting comprehensive TestFlight monitoring...
echo.
echo Build Details:
echo   - Build Number: 27
echo   - Upload Time: 15:17:45 UTC
echo   - Delivery UUID: 2ead7ca5-a182-41b1-9c1c-11493f4d7ebd
echo   - App ID: 6751502942
echo.

echo 📊 Launching monitoring dashboard...
node testflight-dashboard.js start

echo.
echo ✅ Monitoring complete!
echo.
pause