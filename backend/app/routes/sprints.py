"""
Sprints routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.models import SprintCreate, SprintUpdate, SprintResponse, to_response
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List

router = APIRouter()

def auto_dates_from_duration(duration: str):
    """Calculate start and end dates from duration string"""
    now = datetime.utcnow()
    
    # Parse duration (e.g., "2w" = 2 weeks, "1w" = 1 week)
    if duration.endswith('w'):
        weeks = int(duration[:-1])
        days = weeks * 7
    elif duration.endswith('d'):
        days = int(duration[:-1])
    else:
        days = 14  # default 2 weeks
    
    return {
        "startDate": now,
        "endDate": now + timedelta(days=days),
        "durationDays": days
    }

async def complete_sprint(sprint_id: str, db):
    """Complete a sprint and calculate metrics"""
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found"
        )
    
    # Get all items in sprint
    items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).to_list(500)
    
    # Calculate metrics
    completed_sp = sum(item.get("storyPoints", 0) or 0 for item in items if item.get("status") == "Done")
    committed_sp = sprint.get("metrics", {}).get("committedSP", 0)
    spillover_sp = committed_sp - completed_sp if committed_sp > completed_sp else 0
    
    # Update sprint
    await db.sprints.update_one(
        {"_id": ObjectId(sprint_id)},
        {
            "$set": {
                "status": "completed",
                "metrics.completedSP": completed_sp,
                "metrics.spilloverSP": spillover_sp,
                "metrics.velocity": completed_sp,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Move incomplete items back to backlog
    await db.work_items.update_many(
        {"sprint": ObjectId(sprint_id), "status": {"$ne": "Done"}},
        {"$unset": {"sprint": ""}, "$set": {"updatedAt": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "metrics": {
            "completedSP": completed_sp,
            "committedSP": committed_sp,
            "spilloverSP": spillover_sp,
            "velocity": completed_sp
        }
    }

@router.get("/sprints/{space_id}", response_model=List[SprintResponse])
async def list_sprints(space_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """List sprints for a space"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        sprints = await db.sprints.find({"space": ObjectId(space_id)}).sort("order", 1).to_list(100)
        return [to_response(sprint) for sprint in sprints]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{space_id}", response_model=SprintResponse)
async def create_sprint(space_id: str, sprint_create: SprintCreate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Create a new sprint"""
    try:
        if not ObjectId.is_valid(space_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid space ID"
            )
        
        # Get last sprint to calculate order
        last_sprint = await db.sprints.find_one({"space": ObjectId(space_id)}, sort=[("order", -1)])
        order = (last_sprint["order"] + 1) if last_sprint else 1
        
        # Get dates from duration
        dates = auto_dates_from_duration(sprint_create.duration)
        
        sprint_data = {
            "space": ObjectId(space_id),
            "name": sprint_create.name or f"Sprint {order}",
            "goal": sprint_create.goal,
            "duration": sprint_create.duration,
            "startDate": dates["startDate"],
            "endDate": dates["endDate"],
            "durationDays": dates["durationDays"],
            "teamCapacityHours": 120,
            "hoursPerDayPerDeveloper": 6,
            "numberOfDevelopers": 5,
            "status": "planned",
            "order": sprint_create.order or order,
            "metrics": {
                "committedSP": 0,
                "completedSP": 0,
                "spilloverSP": 0,
                "velocity": 0,
                "averageCompletionRate": 0.8,
                "prevSprintVelocity": 0
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.sprints.insert_one(sprint_data)
        sprint_data["_id"] = result.inserted_id
        
        return to_response(sprint_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/sprints/{sprint_id}")
async def delete_sprint(sprint_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Delete a sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        # Move items back to backlog
        await db.work_items.update_many(
            {"sprint": ObjectId(sprint_id)},
            {"$unset": {"sprint": ""}, "$set": {"updatedAt": datetime.utcnow()}}
        )
        
        # Delete sprint
        result = await db.sprints.delete_one({"_id": ObjectId(sprint_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found"
            )
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/sprints/{sprint_id}", response_model=SprintResponse)
async def update_sprint(sprint_id: str, sprint_update: SprintUpdate, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Update sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        update_data = {}
        if sprint_update.name:
            update_data["name"] = sprint_update.name
        if sprint_update.goal is not None:
            update_data["goal"] = sprint_update.goal
        if sprint_update.duration:
            update_data["duration"] = sprint_update.duration
        if sprint_update.startDate:
            update_data["startDate"] = sprint_update.startDate
        if sprint_update.endDate:
            update_data["endDate"] = sprint_update.endDate
        if sprint_update.status:
            update_data["status"] = sprint_update.status
        if sprint_update.metrics:
            update_data["metrics"] = sprint_update.metrics.dict()
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.sprints.find_one_and_update(
            {"_id": ObjectId(sprint_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found"
            )
        
        return to_response(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{sprint_id}/start")
async def start_sprint(sprint_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Start a sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        result = await db.sprints.find_one_and_update(
            {"_id": ObjectId(sprint_id)},
            {"$set": {"status": "active", "startDate": datetime.utcnow(), "updatedAt": datetime.utcnow()}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found"
            )
        
        return to_response(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{sprint_id}/complete")
async def complete_sprint_handler(sprint_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Complete a sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        result = await complete_sprint(sprint_id, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/sprints/{sprint_id}/work-items", response_model=List[dict])
async def get_sprint_work_items(sprint_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get work items in a sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).sort("createdAt", -1).to_list(500)
        return items
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
