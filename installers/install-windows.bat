@echo off
REM Snapshot MCP Server - Windows Installer
REM Double-click this file to install

title Snapshot MCP Server - Windows Installer

cls
echo ================================================
echo    Snapshot MCP Server - Windows Installer
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js is not installed.
    echo.
    echo Please install Node.js first:
    echo   Download from https://nodejs.org/
    echo.
    echo After installing Node.js, run this installer again.
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js found
node --version
echo [✓] npm found
call npm --version
echo.

REM Run the installer
echo Installing Snapshot MCP Server...
echo.

call npx @whenmoon-afk/snapshot-mcp-server

echo.
echo ================================================
echo.
echo [✓] Installation complete!
echo.
echo Next step:
echo   • Restart Claude Desktop (completely quit and reopen)
echo.
echo Then you can use:
echo   • Save a snapshot with: summary: ..., context: ...
echo   • Load latest snapshot
echo   • List all snapshots
echo.
pause
