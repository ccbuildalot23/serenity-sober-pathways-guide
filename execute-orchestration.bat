@echo off
echo ================================================================================
echo SERENITY SOBER PATHWAYS - COMPREHENSIVE ORCHESTRATION SYSTEM
echo ================================================================================
echo.
echo This script will execute the complete optimization orchestration plan 
echo for implementing Phases 2-6 with autonomous swarm coordination.
echo.
echo Available Options:
echo   1. Execute All Phases (Autonomous)
echo   2. Execute Specific Phase (Interactive)  
echo   3. Validation Mode Only
echo   4. Dry Run Mode
echo   5. Cancel
echo.
set /p choice="Please select an option (1-5): "

if "%choice%"=="1" goto execute_all
if "%choice%"=="2" goto execute_phase
if "%choice%"=="3" goto validation
if "%choice%"=="4" goto dry_run
if "%choice%"=="5" goto cancel

echo Invalid selection. Exiting.
goto end

:execute_all
echo.
echo Executing all phases in autonomous mode...
powershell -ExecutionPolicy Bypass -File scripts/run-orchestration-system.ps1 -Phase all -Mode autonomous -EnableSwarm -ContinuousMonitoring -Verbose
goto end

:execute_phase
echo.
set /p phase="Enter phase number (2-6): "
echo Executing Phase %phase% in interactive mode...
powershell -ExecutionPolicy Bypass -File scripts/run-orchestration-system.ps1 -Phase %phase% -Mode interactive -EnableSwarm -ContinuousMonitoring -Verbose
goto end

:validation
echo.
echo Running validation mode...
powershell -ExecutionPolicy Bypass -File scripts/run-orchestration-system.ps1 -Phase validate -Mode validate -Verbose
goto end

:dry_run
echo.
echo Running in dry run mode (no actual changes)...
powershell -ExecutionPolicy Bypass -File scripts/run-orchestration-system.ps1 -Phase all -Mode autonomous -DryRun -EnableSwarm -ContinuousMonitoring -Verbose
goto end

:cancel
echo.
echo Operation cancelled.
goto end

:end
echo.
echo ================================================================================
echo Orchestration complete. Check logs in orchestration-logs/ directory.
echo ================================================================================
pause