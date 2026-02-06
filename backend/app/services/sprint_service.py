"""
Sprint service functions
"""

from datetime import datetime, timedelta
from bson import ObjectId

def auto_dates_from_duration(duration: str, start_date: datetime = None) -> dict:
    """Calculate start and end dates from duration"""
    if start_date is None:
        start_date = datetime.utcnow()
    
    duration_map = {
        "1w": 7,
        "2w": 14,
        "3w": 21,
        "4w": 28,
    }
    
    days = duration_map.get(duration, 14)
    end_date = start_date + timedelta(days=days)
    
    return {
        "startDate": start_date,
        "endDate": end_date,
        "durationDays": days,
    }

async def complete_sprint(sprint_id: str, db):
    """Complete a sprint and move items to next sprint"""
    from bson import ObjectId
    
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    
    if not sprint:
        raise Exception("Sprint not found")
    
    if sprint.get("status") != "active":
        raise Exception("Only active sprints can be completed")
    
    items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).to_list(500)
    
    # Calculate metrics
    done_sp = sum(item.get("storyPoints", 0) or 0 for item in items if item.get("status") == "Done")
    committed_sp = sprint.get("metrics", {}).get("committedSP") or sum(item.get("storyPoints", 0) or 0 for item in items)
    remaining_items = [item for item in items if item.get("status") != "Done"]
    spillover_sp = committed_sp - done_sp
    
    # Find or create next sprint
    next_sprint = await db.sprints.find_one({
        "space": sprint.get("space"),
        "order": sprint.get("order", 1) + 1
    })
    
    if not next_sprint:
        dates = auto_dates_from_duration(sprint.get("duration", "2w"))
        next_sprint_result = await db.sprints.insert_one({
            "space": sprint.get("space"),
            "name": f"Sprint {sprint.get('order', 1) + 1}",
            "duration": sprint.get("duration", "2w"),
            "status": "planned",
            "order": sprint.get("order", 1) + 1,
            "startDate": dates["startDate"],
            "endDate": dates["endDate"],
            "durationDays": dates["durationDays"],
            "numberOfDevelopers": sprint.get("numberOfDevelopers", 5),
            "hoursPerDayPerDeveloper": sprint.get("hoursPerDayPerDeveloper", 6),
            "teamCapacityHours": sprint.get("teamCapacityHours", 120),
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
        })
        next_sprint = await db.sprints.find_one({"_id": next_sprint_result.inserted_id})
    
    # Move incomplete items to next sprint
    for item in remaining_items:
        update_data = {"sprint": next_sprint.get("_id")}
        if item.get("type") in ["Task", "Subtask"]:
            update_data["status"] = "To Do"
        
        await db.work_items.update_one(
            {"_id": item.get("_id")},
            {"$set": update_data}
        )
    
    # Update completed sprint
    await db.sprints.update_one(
        {"_id": ObjectId(sprint_id)},
        {
            "$set": {
                "status": "completed",
                "metrics": {
                    "committedSP": committed_sp,
                    "completedSP": done_sp,
                    "spilloverSP": spillover_sp,
                    "velocity": done_sp,
                    "averageCompletionRate": sprint.get("metrics", {}).get("averageCompletionRate", 0.8),
                    "prevSprintVelocity": sprint.get("metrics", {}).get("prevSprintVelocity", 0)
                },
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Update next sprint with previous velocity
    await db.sprints.update_one(
        {"_id": next_sprint.get("_id")},
        {
            "$set": {
                "metrics.prevSprintVelocity": done_sp,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "completedSprint": sprint,
        "nextSprint": next_sprint,
        "movedItems": len(remaining_items),
        "metrics": {
            "committed": committed_sp,
            "completed": done_sp,
            "spillover": spillover_sp,
            "velocity": done_sp,
        },
    }
