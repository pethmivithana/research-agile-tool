"""
FastAPI Application - Research Agile Tool Backend
Converted from Node.js Express to Python FastAPI
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import database
from app.database import connect_db, close_db

# Define lifecycle events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    print("✅ Application startup complete")
    yield
    # Shutdown
    await close_db()
    print("✅ Application shutdown complete")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Research Agile Tool API",
    description="Backend API for research agile tool with ML impact analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from app.routes import auth, spaces, sprints, backlog, board, changes, impact

# Register routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(spaces.router, prefix="/api/spaces", tags=["spaces"])
app.include_router(sprints.router, prefix="/api", tags=["sprints"])
app.include_router(backlog.router, prefix="/api", tags=["backlog"])
app.include_router(board.router, prefix="/api", tags=["board"])
app.include_router(changes.router, prefix="/api", tags=["changes"])
app.include_router(impact.router, prefix="/api/impact", tags=["impact"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Research Agile Tool API",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Research Agile Tool API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
