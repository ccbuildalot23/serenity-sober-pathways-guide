@echo off
echo ========================================
echo Starting Development Environment with Serena MCP
echo ========================================
echo.

:: Start Serena MCP Server in background
echo Starting Serena MCP Server...
start /B cmd /c "cd ..\serena && uv run serena-mcp-server"
timeout /t 2 /nobreak > nul

:: Start development server
echo Starting development server...
npm run dev

echo.
echo ========================================
echo Development environment is running
echo Serena MCP Server is active
echo ========================================