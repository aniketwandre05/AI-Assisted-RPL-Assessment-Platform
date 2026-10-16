@echo off
title SAKSHAM RPL Assessment Platform
echo ========================================================
echo   SAKSHAM - AI-Assisted RPL Assessment Platform
echo   Ministry of Skill Development & Entrepreneurship (MSDE)
echo ========================================================
echo.
echo [1/2] Starting Flask Backend API on http://127.0.0.1:5000 ...
start "SAKSHAM Backend (Flask)" cmd /k "python run.py"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
cd frontend
start "SAKSHAM Frontend (Vite)" cmd /k "npm run dev"
cd ..

echo.
echo ========================================================
echo   All services launched!
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:5000
echo ========================================================
echo.
pause
