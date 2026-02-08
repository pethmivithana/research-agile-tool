"""
FILE: app/routes/auth.py
Authentication Routes (Login/Register)
"""

from fastapi import APIRouter, HTTPException, status, Body, Depends
from datetime import datetime, timezone
from app.services.database import get_db
from app.services.auth import hash_password, verify_password, create_token, get_current_user
from app.services.models import UserRegister, UserLogin, TokenResponse, UserResponse
from bson import ObjectId

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserRegister = Body(...)):
    db = get_db()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_pwd = hash_password(user.password)
    
    # Create user document
    new_user = {
        "email": user.email,
        "password": hashed_pwd,
        "name": user.name,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Insert into DB
    result = await db.users.insert_one(new_user)
    
    # Generate token
    token = create_token(str(result.inserted_id), new_user["email"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "email": new_user["email"],
            "name": new_user["name"]
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_credentials: UserLogin = Body(...)):
    db = get_db()
    
    # Find user
    user = await db.users.find_one({"email": user_credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if password field exists
    if "password" not in user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User account is corrupted. Please contact support."
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate token
    token = create_token(str(user["_id"]), user["email"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", "")
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    db = get_db()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", "")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/health")
async def health_check():
    """Health check for auth service"""
    return {
        "status": "healthy",
        "service": "auth"
    }
