"""
Changes routes
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.services.models import ChangeEventCreate, ChangeEventResponse, to_response
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter()

@router.post("/{space_id}/changes")
async def create_change(space_id: str, change: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Create a change event"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        work_item_id = change.get("workItem")
        
        change_data = {
            "space": ObjectId(space_id),
            "workItem": ObjectId(work_item_id) if work_item_id else None,
            "type": change.get("type"),
            "fieldsChanged": change.get("fieldsChanged", []),
            "diffs": change.get("diffs", []),
            "author": ObjectId(current_user["id"]),
            "date": datetime.utcnow(),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.change_events.insert_one(change_data)
        change_data["_id"] = result.inserted_id
        
        return to_response(change_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/changes/{change_id}", response_model=ChangeEventResponse)
async def get_change(change_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get a change event"""
    try:
        if not ObjectId.is_valid(change_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid change ID"
            )
        
        change = await db.change_events.find_one({"_id": ObjectId(change_id)})
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change not found"
            )
        
        # Populate work item and author info
        if change.get("workItem"):
            work_item = await db.work_items.find_one({"_id": change["workItem"]})
            change["workItem_details"] = work_item
        
        author = await db.users.find_one({"_id": change["author"]})
        change["author_details"] = author
        
        return to_response(change)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{space_id}/changes")
async def list_changes(
    space_id: str, 
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_db)
):
    """List changes for a space"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        changes = await db.change_events.find({"space": ObjectId(space_id)}).sort("date", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.change_events.count_documents({"space": ObjectId(space_id)})
        
        # Populate details
        for change in changes:
            if change.get("workItem"):
                work_item = await db.work_items.find_one(
                    {"_id": change["workItem"]},
                    {"title": 1, "type": 1, "priority": 1}
                )
                change["workItem_details"] = work_item
            
            author = await db.users.find_one(
                {"_id": change["author"]},
                {"username": 1, "email": 1}
            )
            change["author_details"] = author
        
        return {
            "changes": changes,
            "pagination": {
                "total": total,
                "limit": limit,
                "skip": skip,
                "hasMore": skip + limit < total
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
