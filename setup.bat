@echo off
title LiveScene AI — Setup & Launch
color 0A

echo.
echo  ██╗     ██╗██╗   ██╗███████╗███████╗ ██████╗███████╗███╗   ██╗███████╗
echo  ██║     ██║██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝
echo  ██║     ██║██║   ██║█████╗  ███████╗██║     █████╗  ██╔██╗ ██║█████╗
echo  ██║     ██║╚██╗ ██╔╝██╔══╝  ╚════██║██║     ██╔══╝  ██║╚██╗██║██╔══╝
echo  ███████╗██║ ╚████╔╝ ███████╗███████║╚██████╗███████╗██║ ╚████║███████╗
echo  ╚══════╝╚═╝  ╚═══╝  ╚══════╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝╚══════╝
echo.
echo                  Real-Time Scene Narrator ^& Activity Analyzer
echo                  Built with Stream Video SDK + YOLOv8s + Gemini
echo.
echo =========================================================================
echo.

REM ── Locate Python ────────────────────────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Found %PYVER%

REM ── Locate Node ──────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODEVER=%%i
echo [OK] Found Node.js %NODEVER%
echo.

REM ── Check .env exists ─────────────────────────────────────────────────────────
if not exist "livescene-ai\backend\.env" (
    echo [SETUP] Creating backend .env from template…
    copy "livescene-ai\backend\.env.example" "livescene-ai\backend\.env" >nul 2>&1
    echo.
    echo  ┌──────────────────────────────────────────────────────────────────┐
    echo  │  ACTION REQUIRED: Open livescene-ai\backend\.env                │
    echo  │  and add your GEMINI_API_KEY before running the backend.         │
    echo  │  Get a free key at: https://aistudio.google.com/app/apikey       │
    echo  └──────────────────────────────────────────────────────────────────┘
    echo.
)

REM ── Install Python deps ───────────────────────────────────────────────────────
echo [1/4] Installing Python dependencies…
cd livescene-ai\backend
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Try running as Administrator.
    pause
    exit /b 1
)
echo [OK] Python dependencies installed.
cd ..\..

REM ── Install Node deps ─────────────────────────────────────────────────────────
echo [2/4] Installing Node.js dependencies…
cd livescene-ai
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Node dependencies installed.
cd ..

REM ── Launch Backend ────────────────────────────────────────────────────────────
echo.
echo [3/4] Starting backend on http://localhost:5000 …
start "LiveScene AI — Backend" cmd /k "cd /d %~dp0livescene-ai\backend && python run.py"

REM ── Wait for backend to warm up ───────────────────────────────────────────────
echo      Waiting for YOLO model to load (approx 15 seconds)…
timeout /t 15 /nobreak >nul

REM ── Launch Frontend ───────────────────────────────────────────────────────────
echo [4/4] Starting frontend on http://localhost:3000 …
start "LiveScene AI — Frontend" cmd /k "cd /d %~dp0livescene-ai && npm run dev"

REM ── Open browser ──────────────────────────────────────────────────────────────
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo =========================================================================
echo  ✅  LiveScene AI is running!
echo.
echo  Frontend  →  http://localhost:3000
echo  Backend   →  http://localhost:5000
echo  API docs  →  http://localhost:5000/docs
echo.
echo  Close the two terminal windows to stop the servers.
echo =========================================================================
echo.
pause
