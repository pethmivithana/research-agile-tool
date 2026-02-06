#!/bin/bash

# FastAPI Backend Startup Script
# This script sets up and starts the FastAPI backend

echo "🚀 Research Agile Tool - FastAPI Backend"
echo "========================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "✏️  Please edit .env with your configuration"
    echo ""
    echo "Required environment variables:"
    echo "  - MONGODB_URI (e.g., mongodb://localhost:27017/research-agile-tool)"
    echo "  - JWT_SECRET (e.g., your-secret-key-here)"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to cancel..."
fi

# Start the server
echo ""
echo "🎯 Starting FastAPI server on port 4000..."
echo "📚 API Documentation: http://localhost:4000/docs"
echo "🔗 Health Check: http://localhost:4000/health"
echo ""

python main.py
