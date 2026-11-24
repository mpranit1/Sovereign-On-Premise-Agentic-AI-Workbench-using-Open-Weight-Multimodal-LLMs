@echo off
echo ========================================================
echo   Sovereign AI Workbench (SAW) - Local Starter
echo ========================================================
echo.

echo [1/2] Starting Backend Server (FastAPI on http://127.0.0.1:8000)...
start "SAW Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend UI (Vite on http://localhost:3000)...
start "SAW Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Sovereign AI Workbench is launching!
echo UI URL:       http://localhost:3000
echo API Docs:     http://127.0.0.1:8000/docs
echo Credentials:  admin / Admin@123456
echo ========================================================
