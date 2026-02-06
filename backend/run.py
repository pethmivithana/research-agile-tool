#!/usr/bin/env python3
"""
Simple launcher script for the FastAPI application
Run this instead of main.py to ensure proper module paths
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 4000))
    
    print("🚀 Starting Research Agile Tool Backend...")
    print(f"📡 Server running on http://localhost:{port}")
    print(f"📚 API Docs: http://localhost:{port}/docs")
    print(f"🔄 ReDoc: http://localhost:{port}/redoc")
    
    # Run the FastAPI app
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        env_file=".env"
    )
