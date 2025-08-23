@echo off
cls
echo.
echo ========================================================
echo    SERENITY PROVIDER ACQUISITION - IMMEDIATE EXECUTION
echo ========================================================
echo.
echo STEP 1: RECORD YOUR DEMO
echo.
cd scripts\demo-director
call START_RECORDING.bat
echo.
echo ========================================================
echo    DEMO RECORDED! NOW SEND TO PROVIDERS
echo ========================================================
echo.
set /p loom_link="Paste your Loom link here: "
echo %loom_link% > DEMO_VIDEO_LINK.txt
echo.
echo Sending to first 10 providers...
cd ..
echo %loom_link% | node send-provider-emails.js
echo.
echo ========================================================
echo    EMAILS SENT! MONITOR FOR RESPONSES
echo ========================================================
echo.
echo Starting CRM monitor...
start cmd /k "node provider-crm.js --monitor"
echo.
echo Starting email tracker...
start cmd /k "node send-provider-emails.js --track-opens"
echo.
echo ========================================================
echo    SUCCESS! YOU'RE NOW LIVE!
echo ========================================================
echo.
echo NEXT STEPS:
echo   1. Check your email for responses
echo   2. LinkedIn to anyone who opens
echo   3. Text follow-up in 2 hours
echo   4. Book demos immediately
echo.
echo Remember: 33 days clean. Every provider helps 50+ patients.
echo.
pause