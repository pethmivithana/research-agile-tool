"""
Authentication routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.models import UserRegister, UserLogin, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_token, get_current_user
from app.database import get_db
from bson import ObjectId

router = APIRouter()

@router.post("/signup", response_model=TokenResponse)
async def signup(user: UserRegister, db = Depends(get_db)):
    """Sign up a new user"""
    try:
        # Check if email exists
        existing_user = await db.users.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email in use"
            )
        
        # Create user
        password_hash = hash_password(user.password)
        user_data = {
            "username": user.username,
            "email": user.email,
            "passwordHash": password_hash,
            "createdAt": user.__class__.__dict__.get("createdAt", None),
            "updatedAt": user.__class__.__dict__.get("updatedAt", None)
        }
        
        result = await db.users.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Create token
        token = create_token(user_id, user.email)
        
        return TokenResponse(
            token=token,
            user=UserResponse(
                id=user_id,
                username=user.username,
                email=user.email
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db = Depends(get_db)):
    """Login user"""
    try:
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not verify_password(credentials.password, user["passwordHash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid credentials"
            )
        
        # Create token
        user_id = str(user["_id"])
        token = create_token(user_id, user["email"])
        
        return TokenResponse(
            token=token,
            user=UserResponse(
                id=user_id,
                username=user["username"],
                email=user["email"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get current user info"""
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
