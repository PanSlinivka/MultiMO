@echo off
setlocal enabledelayedexpansion
title MultiMO Agent - %cd%
echo.
echo ============================================
echo   MultiMO Agent
echo   Project: %cd%
echo ============================================
echo.

:: Check dependencies
where multimo-agent >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] multimo-agent not found.
    echo [FIX] On the server PC, run these commands:
    echo       cd MultiMO
    echo       npm install
    echo       npm run build
    echo       npm link -w packages/agent
    pause
    exit /b 1
)

where claude >nul 2>nul
if %errorlevel% neq 0 (
    echo [SETUP] Installing Claude CLI...
    call npm install -g @anthropic-ai/claude-code
)

:: Register if needed
if not exist ".multimo\agent.json" (
    echo.
    set /p HUB_URL="Enter hub URL: "
    echo.
    echo [REGISTER] Connecting to !HUB_URL!...
    call multimo-agent start --hub !HUB_URL!
    echo.
    echo [INFO] Press any key to start orchestrator...
    pause >nul
)

:: Run orchestrator
echo.
echo [START] Orchestrator running. Send tasks from your phone.
echo [INFO] Press Ctrl+C to stop.
echo.
call multimo-agent orchestrate --ai claude
