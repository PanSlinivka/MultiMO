@echo off
title MultiMO Agent
echo.
echo ============================================
echo   MultiMO Agent - Setup
echo ============================================
echo.

:: Check if multimo-agent is available
where multimo-agent >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] multimo-agent not found.
    echo [ERROR] Run start-server.bat first on the server PC.
    echo [ERROR] Or run: npm link -w packages/agent  in the MultiMO directory.
    pause
    exit /b 1
)

:: Check if claude CLI is available
where claude >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] Claude CLI not installed. Installing...
    call npm install -g @anthropic-ai/claude-code
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Claude CLI.
        echo [ERROR] Install manually: npm install -g @anthropic-ai/claude-code
        pause
        exit /b 1
    )
)

:: Ask for hub URL if not registered yet
if not exist ".multimo\agent.json" (
    echo.
    echo [INFO] This project is not connected to MultiMO yet.
    echo.
    set /p HUB_URL="Enter hub URL (from server terminal): "
    echo.
    echo [REGISTER] Connecting to hub...
    call multimo-agent start --hub %HUB_URL%

    :: If we get here, user pressed Ctrl+C or pairing timed out
    echo.
    echo [INFO] Registration complete. Starting orchestrator...
    echo.
) else (
    echo [OK] Agent already registered in this project.
    echo.
)

:: Show AI selection
echo ============================================
echo   Choose your AI:
echo   1. Claude Code (default)
echo   2. Codex
echo   3. Grok
echo   4. Aider
echo   5. Custom command
echo ============================================
echo.
set AI_CHOICE=1
set /p AI_CHOICE="Enter choice (1-5) [1]: "

if "%AI_CHOICE%"=="2" (
    set AI_TYPE=codex
) else if "%AI_CHOICE%"=="3" (
    set AI_TYPE=grok
) else if "%AI_CHOICE%"=="4" (
    set AI_TYPE=aider
) else if "%AI_CHOICE%"=="5" (
    set /p CUSTOM_CMD="Enter command (use {prompt} for task text): "
    echo.
    echo [START] Starting orchestrator with custom command...
    call multimo-agent orchestrate --cmd "%CUSTOM_CMD%"
    goto :end
) else (
    set AI_TYPE=claude
)

echo.
echo [START] Starting orchestrator with %AI_TYPE%...
echo [INFO] Send tasks from your phone. They will be executed automatically.
echo [INFO] Press Ctrl+C to stop.
echo.

call multimo-agent orchestrate --ai %AI_TYPE%

:end
echo.
echo [STOP] Agent stopped.
pause
