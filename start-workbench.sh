#!/usr/bin/env bash
echo "========================================================"
echo "  Sovereign AI Workbench (SAW) - Local Starter"
echo "========================================================"
echo ""

echo "[1/2] Starting Backend Server on http://127.0.0.1:8000..."
(cd backend && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

sleep 2

echo "[2/2] Starting Frontend UI on http://localhost:3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Sovereign AI Workbench is running!"
echo "UI URL:       http://localhost:3000"
echo "API Docs:     http://127.0.0.1:8000/docs"
echo "Credentials:  admin / Admin@123456"
echo "========================================================"

wait $BACKEND_PID $FRONTEND_PID
