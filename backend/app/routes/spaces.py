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
        
        # Convert ObjectId to string for response
        response_data = {
            "_id": str(space_data["_id"]),
            "name": space_data["name"],
            "owner": str(space_data["owner"]),
            "collaborators": [str(c) for c in space_data["collaborators"]],
            "settings": space_data.get("settings"),
            "createdAt": space_data.get("createdAt"),
            "updatedAt": space_data.get("updatedAt")
        }
        
        return response_data
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
        
        result = []
        for space in spaces:
            result.append({
                "_id": str(space["_id"]),
                "name": space["name"],
                "owner": str(space["owner"]),
                "collaborators": [str(c) for c in space.get("collaborators", [])],
                "settings": space.get("settings"),
                "createdAt": space.get("createdAt"),
                "updatedAt": space.get("updatedAt")
            })
        return result
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
        
        return {
            "_id": str(space["_id"]),
            "name": space["name"],
            "owner": str(space["owner"]),
            "collaborators": [str(c) for c in space.get("collaborators", [])],
            "settings": space.get("settings"),
            "createdAt": space.get("createdAt"),
            "updatedAt": space.get("updatedAt")
        }
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
        
        return {
            "_id": str(result["_id"]),
            "name": result["name"],
            "owner": str(result["owner"]),
            "collaborators": [str(c) for c in result.get("collaborators", [])],
            "settings": result.get("settings"),
            "createdAt": result.get("createdAt"),
            "updatedAt": result.get("updatedAt")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{space_id}")
async def delete_space(space_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Delete a space"""
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
        
        # Delete all sprints in this space
        await db.sprints.delete_many({"space": ObjectId(space_id)})
        
        # Delete all work items in this space
        await db.work_items.delete_many({"space": ObjectId(space_id)})
        
        # Delete all changes in this space
        await db.change_events.delete_many({"space": ObjectId(space_id)})
        
        # Delete space
        result = await db.spaces.delete_one({"_id": ObjectId(space_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Space not found"
            )
        
        return {"ok": True}
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
