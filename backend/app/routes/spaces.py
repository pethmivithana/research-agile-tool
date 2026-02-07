"""
Spaces routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.models import SpaceCreate, SpaceUpdate, SpaceResponse
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter()

@router.post("", response_model=SpaceResponse)
async def create_space(space: SpaceCreate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Create a new space"""
    try:
        space_data = {
            "name": space.name,
            "owner": ObjectId(current_user["id"]),
            "collaborators": [ObjectId(c) for c in (space.collaborators or [])],
            "settings": space.settings.dict() if space.settings else {},
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.spaces.insert_one(space_data)
        space_data["_id"] = result.inserted_id
        
        return SpaceResponse(**space_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("", response_model=List[SpaceResponse])
async def list_spaces(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """List user's spaces"""
    try:
        user_id = ObjectId(current_user["id"])
        spaces = await db.spaces.find({
            "$or": [
                {"owner": user_id},
                {"collaborators": user_id}
            ]
        }).sort("createdAt", -1).to_list(100)
        
        return [SpaceResponse(**space) for space in spaces]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(space_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get space by ID"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        space = await db.spaces.find_one({"_id": ObjectId(space_id)})
        if not space:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Space not found"
            )
        
        return SpaceResponse(**space)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{space_id}", response_model=SpaceResponse)
async def update_space(space_id: str, space_update: SpaceUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Update space"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        space = await db.spaces.find_one({"_id": ObjectId(space_id)})
        if not space:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Space not found"
            )
        
        # Check ownership
        if str(space["owner"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden"
            )
        
        update_data = {}
        if space_update.name:
            update_data["name"] = space_update.name
        if space_update.collaborators is not None:
            update_data["collaborators"] = [ObjectId(c) for c in space_update.collaborators]
        if space_update.settings:
            update_data["settings"] = space_update.settings.dict()
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.spaces.find_one_and_update(
            {"_id": ObjectId(space_id)},
            {"$set": update_data},
            return_document=True
        )
        
        return SpaceResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{space_id}/collaborators")
async def add_collaborators(space_id: str, body: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Add collaborators to space"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        space = await db.spaces.find_one({"_id": ObjectId(space_id)})
        if not space:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Space not found"
            )
        
        # Check ownership
        if str(space["owner"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden"
            )
        
        collaborators = [ObjectId(c) for c in body.get("collaborators", [])]
        
        result = await db.spaces.find_one_and_update(
            {"_id": ObjectId(space_id)},
            {"$set": {"collaborators": collaborators, "updatedAt": datetime.utcnow()}},
            return_document=True
        )
        
        return SpaceResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
