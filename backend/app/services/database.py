"""
Database configuration and connection
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
import os

# Ensure we get the connection string
MONGODB_URI = os.getenv("MONGODB_URI")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db = Database()

async def connect_db():
    """Connect to MongoDB"""
    # Fix: Use AsyncIOMotorClient instead of AsyncClient
    db.client = AsyncIOMotorClient(MONGODB_URI)
    
    # get_default_database() uses the database name specified in your MONGODB_URI
    # Example: mongodb://localhost:27017/my_database_name
    db.db = db.client.get_default_database()
    
    # Create indexes
    await create_indexes()
    print("✅ MongoDB connected")

async def close_db():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        print("✅ MongoDB connection closed")

async def create_indexes():
    """Create database indexes"""
    if db.db is None:
        return
    
    # User indexes
    # Note: explicit list of tuples is preferred for create_index in Motor
    await db.db.users.create_index([("email", ASCENDING)], unique=True)
    
    # Space indexes
    await db.db.spaces.create_index([("owner", ASCENDING)])
    await db.db.spaces.create_index([("collaborators", ASCENDING)])
    
    # Sprint indexes
    await db.db.sprints.create_index([("space", ASCENDING), ("status", ASCENDING)])
    await db.db.sprints.create_index([("space", ASCENDING), ("order", ASCENDING)])
    
    # WorkItem indexes
    await db.db.work_items.create_index([("space", ASCENDING)])
    await db.db.work_items.create_index([("sprint", ASCENDING)])
    await db.db.work_items.create_index([("space", ASCENDING), ("sprint", ASCENDING)])
    
    # ChangeEvent indexes
    # Note: -1 is valid for descending, but using pymongo.DESCENDING is more readable
    await db.db.change_events.create_index([("space", ASCENDING), ("date", DESCENDING)])
    await db.db.change_events.create_index([("workItem", ASCENDING)])

async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance (compatible with FastAPI Depends)"""
    return db.db
