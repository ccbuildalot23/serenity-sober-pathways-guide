@echo off
REM Serenity iOS App Store Submission Script for Windows
REM This script prepares and opens your iOS app for App Store submission

echo.
echo ========================================
echo  Serenity iOS App Store Submission Helper
echo ========================================
echo.

REM Step 1: Check environment
echo Checking environment...

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo Environment check passed
echo.

REM Step 2: Build the project
echo Building production bundle...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR: Build failed. Please fix build errors and try again.
    pause
    exit /b 1
)

echo Build completed successfully
echo.

REM Step 3: Sync with iOS
echo Syncing with iOS platform...
call npx cap sync ios

if %errorlevel% neq 0 (
    echo ERROR: iOS sync failed. Please check Capacitor configuration.
    pause
    exit /b 1
)

echo iOS sync completed
echo.

REM Step 4: Display checklist
echo ===========================
echo  Pre-submission Checklist:
echo ===========================
echo [ ] Apple Developer Account active ($99/year)
echo [ ] Xcode installed (version 14.0+) - Mac required
echo [ ] CocoaPods installed (for dependencies)
echo [ ] Test device or simulator ready
echo [ ] App Store Connect account access
echo [ ] Screenshots prepared (in app-store-screenshots/)
echo [ ] Privacy policy live
echo [ ] Support page live
echo.

REM Step 5: Important reminders
echo =======================
echo  Important Reminders:
echo =======================
echo Bundle ID: com.serenity.recovery
echo Version: 1.0.0
echo Build: 1
echo Category: Health and Fitness
echo Age Rating: 17+
echo Demo Account: demo-patient@serenity.app / TestPass123!
echo.

REM Step 6: Quick fixes applied
echo =======================
echo  Quick Fixes Applied:
echo =======================
echo - Vite build configuration fixed
echo - iOS icons generated
echo - Privacy descriptions added
echo - Export compliance configured
echo - Background modes enabled
echo - URL schemes configured
echo.

REM Step 7: Known issues
echo =========================================
echo  MVP Limitations (Address Post-Launch):
echo =========================================
echo - Mock SMS service (crisis alerts work via UI)
echo - Mock push notifications (in-app only)
echo - Limited offline functionality
echo - Basic provider dashboard
echo.

REM Step 8: Next steps
echo ==========================================
echo  IMPORTANT: Mac Required for Next Steps
echo ==========================================
echo.
echo The iOS platform files are ready, but you need a Mac to:
echo 1. Open the project in Xcode
echo 2. Configure signing certificates
echo 3. Archive and upload to App Store
echo.
echo Options:
echo - Use a Mac computer
echo - Use a Mac in the cloud service (MacStadium, MacInCloud)
echo - Use a CI/CD service (Codemagic, Bitrise)
echo.

REM Check if on Mac
if exist "/Applications/Xcode.app" (
    echo Xcode detected! Opening project...
    call npx cap open ios
) else (
    echo.
    echo To continue on a Mac, run:
    echo   npx cap open ios
    echo.
    echo Then follow the steps in IOS_SUBMISSION_GUIDE.md
)

echo.
echo =======================================
echo  Full guide: IOS_SUBMISSION_GUIDE.md
echo =======================================
echo.
pause