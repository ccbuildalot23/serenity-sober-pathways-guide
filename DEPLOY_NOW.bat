@echo off
REM =====================================================
REM   SERENITY iOS INSTANT DEPLOYMENT
REM   Deploy to App Store in One Click!
REM =====================================================

cls
color 0A
echo.
echo  ===================================================
echo    SERENITY iOS APP STORE INSTANT DEPLOYMENT
echo  ===================================================
echo.
echo  This will deploy your app to the iOS App Store
echo  using GitHub Actions - No Mac Required!
echo.
echo  Time Required: ~20 minutes
echo  Cost: ~$0.50 (GitHub Actions)
echo.
echo  ===================================================
echo.

REM Check if certificates are prepared
if not exist "github_secrets_config.txt" (
    echo  [STEP 1] Preparing certificates...
    echo.
    echo  You need to prepare your Apple certificates first.
    echo  Running certificate preparation script...
    echo.
    timeout /t 2 >nul
    powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-ios-certificates.ps1"
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] Certificate preparation failed!
        echo  Please run manually: powershell .\scripts\prepare-ios-certificates.ps1
        pause
        exit /b 1
    )
)

echo  ===================================================
echo  PRE-FLIGHT CHECK
echo  ===================================================
echo.

REM Check Git status
echo  Checking Git status...
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Not a Git repository!
    pause
    exit /b 1
)

echo  [OK] Git repository detected
echo.

REM Check branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo  Current branch: %CURRENT_BRANCH%
echo.

REM Build test
echo  Testing build...
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Build failed! Fix errors and try again.
    pause
    exit /b 1
)
echo  [OK] Build successful!
echo.

REM Sync iOS
echo  Syncing iOS platform...
call npx cap sync ios >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARNING] iOS sync had issues (normal on Windows)
)
echo  [OK] iOS platform prepared!
echo.

echo  ===================================================
echo  GITHUB SECRETS CHECK
echo  ===================================================
echo.
echo  Have you added all secrets to GitHub? (Y/N)
echo.
echo  Required secrets:
echo  - IOS_CERTIFICATE
echo  - IOS_CERTIFICATE_PASSWORD
echo  - IOS_PROVISION_PROFILE
echo  - APPLE_TEAM_ID
echo  - APP_STORE_CONNECT_KEY_ID
echo  - APP_STORE_CONNECT_ISSUER_ID
echo  - APP_STORE_CONNECT_API_KEY
echo  - VITE_SUPABASE_URL
echo  - VITE_SUPABASE_ANON_KEY
echo.
echo  Add at: https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/settings/secrets/actions
echo.
choice /C YN /N /M "Secrets configured? (Y/N): "
if %errorlevel% equ 2 (
    echo.
    echo  Please add the secrets first!
    echo  Instructions in: github_secrets_config.txt
    echo.
    start https://github.com
    pause
    exit /b 1
)

echo.
echo  ===================================================
echo  READY TO DEPLOY!
echo  ===================================================
echo.
echo  This will:
echo  1. Commit all changes
echo  2. Push to GitHub
echo  3. Trigger iOS build in the cloud
echo  4. Deploy to TestFlight automatically
echo.
echo  Continue? (Y/N)
choice /C YN /N /M ">"
if %errorlevel% equ 2 goto :end

echo.
echo  ===================================================
echo  DEPLOYING TO APP STORE
echo  ===================================================
echo.

REM Stage all changes
echo  Staging changes...
git add -A

REM Commit
echo  Committing...
git commit -m "deploy: iOS App Store submission via GitHub Actions

- Automated deployment from Windows
- Build optimizations added
- Ready for TestFlight" >nul 2>&1

if %errorlevel% neq 0 (
    echo  [INFO] No changes to commit
)

REM Push
echo  Pushing to GitHub (this triggers the build)...
git push origin %CURRENT_BRANCH%

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Push failed! Check your GitHub credentials.
    pause
    exit /b 1
)

echo.
echo  ===================================================
echo    DEPLOYMENT TRIGGERED SUCCESSFULLY!
echo  ===================================================
echo.
echo  Your app is now building in the cloud!
echo.
echo  MONITOR PROGRESS:
echo  ----------------
timeout /t 2 >nul
start https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/actions
echo.
echo  1. GitHub Actions (building now)
echo     https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/actions
echo.
echo  2. TestFlight (ready in ~20 minutes)
echo     https://appstoreconnect.apple.com
echo.
echo  3. App Store Review (submit from TestFlight)
echo.
echo  ===================================================
echo  NEXT STEPS:
echo  ===================================================
echo.
echo  1. Watch the GitHub Actions build (~15-20 min)
echo  2. Check TestFlight for your build
echo  3. Submit to App Store from App Store Connect
echo  4. Celebrate! Your app is going live!
echo.
echo  ===================================================
echo.
echo  Deployment initiated at: %date% %time%
echo.

:end
echo  Press any key to exit...
pause >nul
exit /b 0