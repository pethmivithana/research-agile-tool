@echo off
REM Research Agile Tool - Development Startup Script (Windows)

echo.
echo ========================================
echo Research Agile Tool - Starting Services
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB connection...
mongosh mongodb://localhost:27017 --eval "db.adminCommand('ping')" >nul 2>&1
if errorlevel 1 (
    echo WARNING: MongoDB is not running on localhost:27017
    echo Please start MongoDB before running this script
    echo.
)

echo Starting Backend (FastAPI on port 4000)...
start cmd /k "cd backend && venv\Scripts\activate && python main.py"

timeout /t 2 /nobreak

echo Starting ML Service (FastAPI on port 8000)...
start cmd /k "cd ml-service && venv\Scripts\activate && python main.py"

timeout /t 2 /nobreak

echo Starting Frontend (Vite on port 5173)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Services Starting...
echo ========================================
echo.
echo Backend:    http://localhost:4000
echo Frontend:   http://localhost:5173
echo ML Service: http://localhost:8000
echo.
echo API Docs:
echo - Backend:    http://localhost:4000/docs
echo - ML Service: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each terminal to stop services
echo.
