"""
Database configuration and connection
"""

from motor.motor_asyncio import AsyncClient, AsyncDatabase
from pymongo import ASCENDING
import os

MONGODB_URI = os.getenv("MONGODB_URI")

class Database:
    client: AsyncClient = None
    db: AsyncDatabase = None

db = Database()

async def connect_db():
    """Connect to MongoDB"""
    db.client = AsyncClient(MONGODB_URI)
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
    if not db.db:
        return
    
    # User indexes
    await db.db.users.create_index("email", unique=True)
    
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
    await db.db.change_events.create_index([("space", ASCENDING), ("date", -1)])
    await db.db.change_events.create_index([("workItem", ASCENDING)])

def get_db() -> AsyncDatabase:
    """Get database instance"""
    return db.db
