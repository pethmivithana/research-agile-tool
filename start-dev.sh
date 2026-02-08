#!/bin/bash

# Research Agile Tool - Development Startup Script (macOS/Linux)

echo ""
echo "========================================"
echo "Research Agile Tool - Starting Services"
echo "========================================"
echo ""

# Check if MongoDB is running
echo "Checking MongoDB connection..."
if ! mongosh mongodb://localhost:27017 --eval "db.adminCommand('ping')" &>/dev/null; then
    echo "WARNING: MongoDB is not running on localhost:27017"
    echo "Please start MongoDB before running this script"
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID $ML_PID $FRONTEND_PID 2>/dev/null
    echo "Services stopped."
    exit
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "Starting Backend (FastAPI on port 4000)..."
(
    cd backend
    source venv/bin/activate
    python main.py
) &
BACKEND_PID=$!
sleep 2

# Start ML Service
echo "Starting ML Service (FastAPI on port 8000)..."
(
    cd ml-service
    source venv/bin/activate
    python main.py
) &
ML_PID=$!
sleep 2

# Start Frontend
echo "Starting Frontend (Vite on port 5173)..."
(
    cd frontend
    npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Services Starting..."
echo "========================================"
echo ""
echo "Backend:    http://localhost:4000"
echo "Frontend:   http://localhost:5173"
echo "ML Service: http://localhost:8000"
echo ""
echo "API Docs:"
echo "- Backend:    http://localhost:4000/docs"
echo "- ML Service: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all processes
wait
