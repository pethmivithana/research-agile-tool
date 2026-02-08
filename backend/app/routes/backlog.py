"""
Backlog routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.models import WorkItemCreate, WorkItemUpdate, WorkItemResponse
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter()

@router.post("/backlog/{space_id}", response_model=WorkItemResponse)
async def create_work_item(space_id: str, item: WorkItemCreate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Create a new work item"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        item_data = {
            "space": ObjectId(space_id),
            "type": item.type,
            "status": item.status,
            "title": item.title,
            "description": item.description,
            "priority": item.priority,
            "storyPoints": item.storyPoints,
            "assignee": ObjectId(item.assignee) if item.assignee else None,
            "parent": ObjectId(item.parent) if item.parent else None,
            "epic": ObjectId(item.epic) if item.epic else None,
            "flags": item.flags or [],
            "mlFeatures": item.mlFeatures.dict() if item.mlFeatures else {},
            "mlAnalysis": item.mlAnalysis.dict() if item.mlAnalysis else {},
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.work_items.insert_one(item_data)
        item_data["_id"] = result.inserted_id
        
        return WorkItemResponse(**item_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/backlog/{space_id}", response_model=List[WorkItemResponse])
async def list_backlog(space_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """List backlog items for a space"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        items = await db.work_items.find({
            "space": ObjectId(space_id),
            "$or": [
                {"sprint": {"$exists": False}},
                {"sprint": None}
            ]
        }).sort("createdAt", -1).to_list(500)
        
        return [WorkItemResponse(**item) for item in items]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/backlog/{item_id}", response_model=WorkItemResponse)
async def update_work_item(item_id: str, item_update: WorkItemUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Update a work item"""
    try:
        if not ObjectId.is_valid(item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid item ID"
            )
        
        update_data = {}
        if item_update.type:
            update_data["type"] = item_update.type
        if item_update.status:
            update_data["status"] = item_update.status
        if item_update.title:
            update_data["title"] = item_update.title
        if item_update.description is not None:
            update_data["description"] = item_update.description
        if item_update.priority:
            update_data["priority"] = item_update.priority
        if item_update.storyPoints is not None:
            update_data["storyPoints"] = item_update.storyPoints
        if item_update.assignee:
            update_data["assignee"] = ObjectId(item_update.assignee)
        if item_update.mlFeatures:
            update_data["mlFeatures"] = item_update.mlFeatures.dict()
        if item_update.mlAnalysis:
            update_data["mlAnalysis"] = item_update.mlAnalysis.dict()
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.work_items.find_one_and_update(
            {"_id": ObjectId(item_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return WorkItemResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/backlog/{item_id}")
async def delete_work_item(item_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Delete a work item"""
    try:
        if not ObjectId.is_valid(item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid item ID"
            )
        
        result = await db.work_items.delete_one({"_id": ObjectId(item_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/work-items/{item_id}", response_model=WorkItemResponse)
async def get_work_item(item_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get a work item by ID"""
    try:
        if not ObjectId.is_valid(item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid item ID"
            )
        
        item = await db.work_items.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return WorkItemResponse(**item)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.patch("/work-items/{item_id}", response_model=WorkItemResponse)
async def patch_work_item(item_id: str, item_update: WorkItemUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Patch a work item (partial update)"""
    try:
        if not ObjectId.is_valid(item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid item ID"
            )
        
        # Build update dict from provided fields
        update_data = {}
        if item_update.type:
            update_data["type"] = item_update.type
        if item_update.status:
            update_data["status"] = item_update.status
        if item_update.title:
            update_data["title"] = item_update.title
        if item_update.description is not None:
            update_data["description"] = item_update.description
        if item_update.priority:
            update_data["priority"] = item_update.priority
        if item_update.storyPoints is not None:
            update_data["storyPoints"] = item_update.storyPoints
        if item_update.assignee:
            update_data["assignee"] = ObjectId(item_update.assignee)
        if item_update.mlFeatures:
            update_data["mlFeatures"] = item_update.mlFeatures.dict()
        if item_update.mlAnalysis:
            update_data["mlAnalysis"] = item_update.mlAnalysis.dict()
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.work_items.find_one_and_update(
            {"_id": ObjectId(item_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return WorkItemResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{sprint_id}/add-items")
async def add_items_to_sprint(sprint_id: str, body: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Add items to sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        item_ids = [ObjectId(id) for id in body.get("itemIds", [])]
        
        result = await db.work_items.update_many(
            {"_id": {"$in": item_ids}},
            {"$set": {"sprint": ObjectId(sprint_id), "updatedAt": datetime.utcnow()}}
        )
        
        return {"ok": True, "modifiedCount": result.modified_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
