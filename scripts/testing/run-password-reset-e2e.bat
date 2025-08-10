@echo off
setlocal enabledelayedexpansion

REM Password Reset E2E Testing Script for Windows
REM This script runs comprehensive E2E tests for the password reset functionality

echo 🚀 Starting Password Reset E2E Testing Suite
echo ==============================================
echo.

REM Configuration
set TEST_FILE=tests\e2e\password-reset-e2e-comprehensive.spec.ts
set REPORT_DIR=test-results\password-reset-e2e
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%

REM Create report directory
if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"

echo 📋 Test Configuration:
echo   Test File: %TEST_FILE%
echo   Report Directory: %REPORT_DIR%
echo   Timestamp: %TIMESTAMP%
echo.

REM Check if Playwright is installed
npx playwright --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Playwright not found. Installing...
    npm install -D @playwright/test
)

REM Install browsers if needed
echo 🔧 Ensuring Playwright browsers are installed...
npx playwright install --with-deps chromium

echo.
echo 🧪 Running Password Reset E2E Tests...
echo ======================================

REM Run the comprehensive test suite
npx playwright test "%TEST_FILE%" ^
    --reporter=list ^
    --reporter=json:"%REPORT_DIR%\results_%TIMESTAMP%.json" ^
    --reporter=html:"%REPORT_DIR%\html_%TIMESTAMP%" ^
    --project=chromium ^
    --timeout=30000 ^
    --retries=1

if errorlevel 1 (
    echo.
    echo ❌ Test execution failed
    exit /b 1
)

echo.
echo 📊 Test Results Summary
echo =======================

REM Check if results file exists
if exist "%REPORT_DIR%\results_%TIMESTAMP%.json" (
    echo ✅ Test execution completed
    echo 📁 Results saved to: %REPORT_DIR%\results_%TIMESTAMP%.json
    echo 🌐 HTML report: %REPORT_DIR%\html_%TIMESTAMP%\index.html
    
    REM Note: Windows doesn't have jq by default, so we'll show basic info
    echo.
    echo 📈 Test Statistics:
    echo   Results file generated successfully
    echo   Check the HTML report for detailed statistics
) else (
    echo ❌ Test execution failed or results file not found
    exit /b 1
)

echo.
echo 🔍 Test Categories Covered
echo ==========================

echo.
echo ✅ Positive Scenarios:
echo   - Full password reset flow
echo   - Rate limiting behavior
echo.
echo ❌ Negative Scenarios:
echo   - Unregistered email handling
echo   - Invalid email format
echo   - Empty email submission
echo   - Invalid reset tokens
echo   - Expired reset tokens
echo   - Password mismatch validation
echo   - Weak password validation
echo.
echo 🔒 Security Scenarios:
echo   - Email existence privacy
echo   - Network error handling

echo.
echo 📝 Recommendations
echo ==================

echo 🎉 Password reset E2E testing completed!
echo ✅ Check the HTML report for detailed results
echo 🔧 Review any failed tests and address issues
echo 📧 Verify email configuration and Supabase settings

echo.
echo 🔗 Useful Links:
echo   HTML Report: %REPORT_DIR%\html_%TIMESTAMP%\index.html
echo   JSON Results: %REPORT_DIR%\results_%TIMESTAMP%.json
echo   Test File: %TEST_FILE%

echo.
echo 🏁 Password Reset E2E Testing Complete!
echo =======================================
