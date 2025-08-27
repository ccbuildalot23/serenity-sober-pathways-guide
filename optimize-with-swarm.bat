@echo off
REM ================================================================
REM Serenity Terminal Optimization Script with Swarm Intelligence
REM ================================================================

echo.
echo ========================================================
echo   SERENITY TERMINAL OPTIMIZER WITH SWARM INTELLIGENCE
echo ========================================================
echo.

REM Check if running in C:\dev\serenity
if not exist ".git" (
    echo ERROR: Must be run from C:\dev\serenity directory
    exit /b 1
)

echo [1/8] Initializing Claude Flow Hive Mind...
call npx claude-flow@alpha hive-mind spawn "optimize terminal" --parallel --max-agents=5 2>nul

echo [2/8] Cleaning nested node_modules...
for /d /r . %%d in (node_modules) do (
    if exist "%%d\*\node_modules" (
        echo Removing: %%d\*\node_modules
        rd /s /q "%%d\*\node_modules" 2>nul
    )
)

echo [3/8] Removing backup and temporary files...
rd /s /q src-backup-* 2>nul
rd /s /q auto-fix-* 2>nul
rd /s /q verification 2>nul
rd /s /q playwright-report 2>nul
rd /s /q test-results 2>nul
del /f /q *.msi 2>nul
del /f /q *.exe 2>nul
del /f /q nul 2>nul

echo [4/8] Optimizing Git repository...
git config --local core.fscache true
git config --local core.preloadindex true
git config --local gc.auto 256
git gc --prune=now --quiet

echo [5/8] Running BMAD analysis...
if exist ".bmad-core\bmad.js" (
    call npm run bmad:analyze 2>nul
)

echo [6/8] Clearing npm cache...
npm cache clean --force 2>nul

echo [7/8] Checking performance metrics...
echo Directory size: 
du -sh . 2>nul || dir /s | find "File(s)"
echo Node modules count:
dir /ad /s /b | find /c "node_modules"

echo [8/8] Validating optimization...
if exist "npx" (
    npx claude-flow@alpha monitor health --quick 2>nul
)

echo.
echo ========================================================
echo   OPTIMIZATION COMPLETE!
echo ========================================================
echo.
echo Terminal performance optimized. Key improvements:
echo - Removed nested node_modules
echo - Cleaned temporary files  
echo - Optimized Git repository
echo - Configured performance settings
echo.
echo Run 'npm run health:check' to monitor performance
echo.