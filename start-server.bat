@echo off
title MultiMO Server
echo.
echo ============================================
echo   MultiMO Server - Starting...
echo ============================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [SETUP] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:: Build if needed
if not exist "packages\shared\dist" (
    echo [SETUP] Building...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed
        pause
        exit /b 1
    )
)

:: Link agent CLI globally
echo [SETUP] Registering multimo-agent command...
call npm link -w packages/agent >nul 2>nul

:: Start hub in background
echo [START] Starting hub server on port 3232...
start /b cmd /c "set MULTIMO_PORT=3232 && npx tsx packages\hub\src\index.ts 2>&1"

:: Wait for hub to be ready
echo [WAIT] Waiting for hub to start...
:wait_hub
timeout /t 2 /nobreak >nul
curl -s http://localhost:3232/api/auth/status >nul 2>nul
if %errorlevel% neq 0 goto wait_hub
echo [OK] Hub is running on http://localhost:3232

:: Try to start Cloudflare tunnel
echo.
set CF_PATH=C:\Program Files (x86)\cloudflared\cloudflared.exe
if exist "%CF_PATH%" (
    echo [START] Starting Cloudflare tunnel...
    echo [INFO] Your public URL will appear below:
    echo.
    "%CF_PATH%" tunnel --url http://localhost:3232
) else (
    echo [INFO] Cloudflare not installed. Phone access only on same WiFi.
    echo [INFO] To install: winget install Cloudflare.cloudflared
    echo.
    echo [READY] Hub running at http://localhost:3232
    echo [READY] Open this URL on your phone (same WiFi)
    echo.
    echo Press any key to stop the server...
    pause >nul
)

:: Cleanup
taskkill /f /im "tsx.exe" >nul 2>nul
echo [STOP] Server stopped.
