@echo off
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
    call multimo-agent start --hub %HUB_URL%
    echo.
)

:: Run orchestrator
echo [START] Orchestrator running. Send tasks from your phone.
echo.
call multimo-agent orchestrate --ai claude
