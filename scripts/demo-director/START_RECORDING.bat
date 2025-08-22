@echo off
cls
echo.
echo ========================================================
echo         SERENITY DEMO RECORDING SYSTEM
echo ========================================================
echo.
echo CHECKLIST:
echo   [ ] Phone positioned in camera frame
echo   [ ] SMS app open and visible
echo   [ ] Browser ready at localhost:8080
echo   [ ] Loom extension installed
echo   [ ] Microphone working
echo   [ ] Water nearby
echo.
set /p ready="Phone ready and visible to camera? Press ENTER when ready..."
echo.
echo Microphone check...
powershell -Command "Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak('Testing audio. You got this, Christopher. 33 days clean. Your story matters.')"
echo.
echo Starting in...
timeout /t 1 /nobreak > nul
echo 3...
powershell -Command "[console]::beep(500,300)"
timeout /t 1 /nobreak > nul
echo 2...
powershell -Command "[console]::beep(600,300)"
timeout /t 1 /nobreak > nul
echo 1...
powershell -Command "[console]::beep(700,300)"
timeout /t 1 /nobreak > nul
echo.
echo ========================================================
echo    START LOOM RECORDING NOW!
echo ========================================================
echo.
powershell -Command "[console]::beep(1000,500)"
echo Waiting for you to start Loom...
timeout /t 3 /nobreak > nul
echo.
echo Demo beginning...
echo.

REM Check for practice mode
if "%1"=="--practice" (
    echo [PRACTICE MODE - No SMS will be sent]
    node automated-demo-director.js --practice
) else (
    echo [PRODUCTION MODE - Real SMS will be sent]
    node automated-demo-director.js
)

echo.
echo ========================================================
echo         RECORDING COMPLETE!
echo ========================================================
echo.
echo NEXT STEPS:
echo   1. Stop your Loom recording
echo   2. Get the share link from Loom
echo   3. Check email-campaigns.json for templates
echo   4. Send to first 10 providers
echo.
pause