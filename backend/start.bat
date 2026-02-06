@echo off
REM FastAPI Backend Startup Script for Windows
REM This script sets up and starts the FastAPI backend

echo 🚀 Research Agile Tool - FastAPI Backend
echo ========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo ✅ Python found: 
python --version

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
pip install -q -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo 📝 Creating .env from template...
    copy .env.example .env
    echo ✏️  Please edit .env with your configuration
    echo.
    echo Required environment variables:
    echo   - MONGODB_URI (e.g., mongodb://localhost:27017/research-agile-tool)
    echo   - JWT_SECRET (e.g., your-secret-key-here)
    echo.
    pause
)

REM Start the server
echo.
echo 🎯 Starting FastAPI server on port 4000...
echo 📚 API Documentation: http://localhost:4000/docs
echo 🔗 Health Check: http://localhost:4000/health
echo.

python main.py
pause
