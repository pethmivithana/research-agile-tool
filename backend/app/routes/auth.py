"""
FILE: app/routes/auth.py
Authentication Routes (Login/Register)
"""

from fastapi import APIRouter, HTTPException, status, Body
from app.services.database import get_db
from app.services.auth import hash_password, verify_password, create_token
# FIX: Import models from services.models, not app.models
from app.services.models import UserRegister, UserLogin, TokenResponse, UserResponse

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
    
    return {
        "id": str(result.inserted_id),
        "email": new_user["email"],
        "name": new_user["name"]
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
            "name": user.get("name")
        }
    }