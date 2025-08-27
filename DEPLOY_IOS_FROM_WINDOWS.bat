@echo off
REM =====================================================
REM   SERENITY iOS DEPLOYMENT FROM WINDOWS
REM   Quick Start Script - Run This First!
REM =====================================================

cls
echo.
echo  =====================================================
echo    SERENITY iOS APP STORE DEPLOYMENT FROM WINDOWS
echo  =====================================================
echo.
echo  This script will help you deploy your iOS app to the
echo  App Store WITHOUT a Mac computer!
echo.
echo  Total time: ~45 minutes
echo  Total cost: ~$5-10 (GitHub Actions)
echo.
echo  =====================================================
echo.

REM Check prerequisites
echo  CHECKING PREREQUISITES...
echo  -------------------------
echo.

REM Check Git
where git >nul 2>nul
if %errorlevel% equ 0 (
    echo  [OK] Git is installed
) else (
    echo  [ERROR] Git is not installed!
    echo          Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check Node
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo  [OK] Node.js is installed
) else (
    echo  [ERROR] Node.js is not installed!
    echo          Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo  [OK] npm is installed
) else (
    echo  [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo.
echo  [OK] All prerequisites met!
echo.
echo  =====================================================
echo.

REM Display checklist
echo  BEFORE YOU CONTINUE, YOU NEED:
echo  -------------------------------
echo.
echo  1. Apple Developer Account ($99/year)
echo     Sign up: https://developer.apple.com/programs/
echo.
echo  2. GitHub account (free)
echo     Your code must be on GitHub
echo.
echo  3. About 45 minutes of time
echo.
echo  Do you have these ready? (Y/N)
choice /C YN /N /M ">"
if %errorlevel% equ 2 goto :end

echo.
echo  =====================================================
echo.
echo  WHAT THIS SCRIPT WILL DO:
echo  -------------------------
echo.
echo  1. Test your build locally
echo  2. Prepare iOS certificates for GitHub
echo  3. Set up automated deployment
echo  4. Guide you through App Store submission
echo.
echo  Ready to start? (Y/N)
choice /C YN /N /M ">"
if %errorlevel% equ 2 goto :end

echo.
echo  =====================================================
echo  STEP 1: Testing Local Build
echo  =====================================================
echo.

echo  Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Build failed! Please fix errors and try again.
    pause
    exit /b 1
)

echo.
echo  [OK] Build successful!
echo.

echo  Syncing iOS platform...
call npx cap sync ios
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] iOS sync failed!
    pause
    exit /b 1
)

echo.
echo  [OK] iOS platform ready!
echo.

echo  =====================================================
echo  STEP 2: Apple Developer Setup
echo  =====================================================
echo.
echo  Now you need to create certificates on Apple Developer Portal.
echo.
echo  Opening the guide in your browser...
timeout /t 2 >nul
start https://developer.apple.com/account/resources/certificates/list
echo.
echo  Follow these steps:
echo  1. Create an App ID for: com.serenity.recovery
echo  2. Create iOS Distribution Certificate
echo  3. Create App Store Provisioning Profile
echo  4. Create App Store Connect API Key
echo.
echo  Full instructions are in: IOS_WINDOWS_SUBMISSION_GUIDE.md
echo.
echo  Press any key when you have downloaded all certificates...
pause >nul

echo.
echo  =====================================================
echo  STEP 3: Prepare Certificates
echo  =====================================================
echo.
echo  Running certificate preparation script...
echo.

powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-ios-certificates.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Certificate preparation failed!
    echo  Try running manually: 
    echo  powershell .\scripts\prepare-ios-certificates.ps1
    pause
    exit /b 1
)

echo.
echo  [OK] Certificates prepared!
echo.

echo  =====================================================
echo  STEP 4: Configure GitHub Secrets
echo  =====================================================
echo.
echo  Now you need to add secrets to GitHub.
echo.
echo  1. Go to your repository on GitHub
echo  2. Click Settings → Secrets and variables → Actions
echo  3. Add all secrets from github_secrets_config.txt
echo.
echo  Opening GitHub in your browser...
timeout /t 2 >nul
start https://github.com
echo.
echo  Press any key when all secrets are added...
pause >nul

echo.
echo  =====================================================
echo  STEP 5: Deploy to App Store
echo  =====================================================
echo.
echo  Ready to deploy! This will:
echo  - Push code to GitHub
echo  - Trigger automated iOS build
echo  - Upload to TestFlight
echo.
echo  Continue? (Y/N)
choice /C YN /N /M ">"
if %errorlevel% equ 2 goto :end

echo.
echo  Committing changes...
git add .
git commit -m "Deploy iOS app to App Store via GitHub Actions"

echo.
echo  Pushing to GitHub (this triggers the build)...
git push

echo.
echo  =====================================================
echo  DEPLOYMENT STARTED!
echo  =====================================================
echo.
echo  Your iOS app is now building in the cloud!
echo.
echo  NEXT STEPS:
echo  -----------
echo  1. Watch build progress:
echo     https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/actions
echo.
echo  2. Wait ~10 minutes for build to complete
echo.
echo  3. Check TestFlight:
echo     https://appstoreconnect.apple.com
echo.
echo  4. Submit for App Store review!
echo.
echo  Full guide: IOS_WINDOWS_SUBMISSION_GUIDE.md
echo.
echo  =====================================================
echo  Congratulations! Your app is deploying!
echo  =====================================================
echo.

:end
echo  Press any key to exit...
pause >nul
exit /b 0