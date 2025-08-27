@echo off
REM Quick launcher for autonomous optimization
REM Just double-click this file and go take a nap!

echo.
echo ============================================
echo   AUTONOMOUS OPTIMIZATION LAUNCHER
echo   Your code will optimize while you rest!
echo ============================================
echo.

REM Check if PowerShell script exists
if not exist "autonomous-optimize.ps1" (
    echo ERROR: autonomous-optimize.ps1 not found!
    echo Please ensure the script is in the current directory.
    pause
    exit /b 1
)

echo Starting optimization in 5 seconds...
echo Press Ctrl+C to cancel
timeout /t 5 /nobreak > nul

echo.
echo Launching autonomous optimization...
powershell -ExecutionPolicy Bypass -File autonomous-optimize.ps1

echo.
echo ============================================
echo   Optimization process started!
echo   Check the logs when you wake up
echo ============================================
echo.