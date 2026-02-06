"""
Board routes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.models import WorkItemResponse
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime

router = APIRouter()

ALLOWED_BY_TYPE = {
    "Bug": ["Triaged", "Fixed"],
    "Story": ["Design WIP", "Design Review", "Ready for Development"],
    "Task": ["To Do", "In Progress", "In Review", "Done"],
    "Subtask": ["To Do", "In Progress", "Done"],
}

DEFAULT_COLUMNS = ["To Do", "In Progress", "In Review", "Done"]

@router.get("/board/{sprint_id}")
async def get_board(sprint_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get board for a sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID"
            )
        
        items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).sort("updatedAt", -1).to_list(500)
        
        # Group by status
        grouped = {
            "To Do": [],
            "In Progress": [],
            "In Review": [],
            "Done": []
        }
        
        for item in items:
            status = item.get("status", "To Do")
            if status not in grouped:
                status = "To Do"
            grouped[status].append(WorkItemResponse(**item))
        
        return grouped
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/board/move")
async def move_item(body: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Move item on board"""
    try:
        work_item_id = body.get("workItemId")
        to_col = body.get("toCol")
        
        if not work_item_id or not to_col:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="workItemId and toCol are required"
            )
        
        if not ObjectId.is_valid(work_item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid item ID"
            )
        
        result = await db.work_items.find_one_and_update(
            {"_id": ObjectId(work_item_id)},
            {"$set": {"status": to_col, "updatedAt": datetime.utcnow()}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return {
            "ok": True,
            "item": WorkItemResponse(**result)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )