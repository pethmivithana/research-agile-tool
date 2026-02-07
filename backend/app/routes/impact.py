"""
Impact Analysis routes - ML Service Integration
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime
import httpx
import os

router = APIRouter()

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8000")

async def check_ml_service_health():
    """Check ML service health"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ML_SERVICE_URL}/health", timeout=5.0)
            return response.json() if response.status_code == 200 else {"available": False}
    except:
        return {"available": False, "status": "offline"}

async def call_ml_service(endpoint: str, data: dict):
    """Call ML service endpoint"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ML_SERVICE_URL}{endpoint}",
                json=data,
                timeout=30.0
            )
            if response.status_code == 200:
                return response.json()
            return None
    except Exception as e:
        print(f"ML Service Error: {e}")
        return None

def generate_fallback_analysis(work_item, sprint=None):
    """Generate fallback analysis when ML service is unavailable"""
    story_points = work_item.get("storyPoints", 1) or 1
    priority = work_item.get("priority", "Medium")
    
    # Simple heuristic calculations
    estimated_hours = story_points * 6.5
    
    # Risk based on story points and priority
    schedule_risk_prob = 0.3
    if story_points > 8:
        schedule_risk_prob += 0.2
    if priority in ["Highest", "High"]:
        schedule_risk_prob += 0.15
    
    schedule_risk_label = "Low"
    if schedule_risk_prob >= 0.7:
        schedule_risk_label = "Critical"
    elif schedule_risk_prob >= 0.5:
        schedule_risk_label = "High"
    elif schedule_risk_prob >= 0.3:
        schedule_risk_label = "Medium"
    
    # Productivity impact (days of delay)
    productivity_impact = story_points * 0.3
    
    # Quality risk
    quality_risk_prob = 0.2
    if story_points > 13:
        quality_risk_prob += 0.3
    
    quality_risk_label = "High" if quality_risk_prob >= 0.5 else "Medium" if quality_risk_prob >= 0.3 else "Low"
    
    return {
        "predicted_hours": estimated_hours,
        "confidence_interval": "Heuristic",
        "schedule_risk_probability": schedule_risk_prob,
        "schedule_risk_label": schedule_risk_label,
        "productivity_impact": productivity_impact,
        "quality_risk_probability": quality_risk_prob,
        "quality_risk_label": quality_risk_label,
        "model_evidence": {
            "effort": False,
            "schedule": False,
            "productivity": False,
            "quality": False
        }
    }

def generate_recommendations(analysis, work_item, sprint, sprint_items):
    """Generate recommendations based on analysis"""
    
    schedule_risk = analysis.get("schedule_risk_probability", 0)
    productivity_impact = analysis.get("productivity_impact", 0)
    story_points = work_item.get("storyPoints", 1)
    priority = work_item.get("priority", "Medium")
    
    # Calculate sprint metrics
    current_load = sum(item.get("storyPoints", 0) or 0 for item in sprint_items)
    capacity = sprint.get("metrics", {}).get("committedSP", 30)
    days_remaining = max(0.5, (sprint.get("endDate") - datetime.utcnow()).days) if sprint.get("endDate") else 10
    
    recommendations = {
        "primary_recommendation": None,
        "alternative_options": []
    }
    
    # Decision logic
    if days_remaining < 2 and priority not in ["Highest", "Critical"]:
        # Too late in sprint
        recommendations["primary_recommendation"] = {
            "id": "defer_to_next",
            "type": "defer_to_next_sprint",
            "title": "Defer to Next Sprint",
            "description": f"Sprint ends in {days_remaining:.1f} days. Adding this work now risks delivery quality.",
            "severity": "high",
            "action_steps": [
                "Move item to product backlog",
                "Prioritize for next sprint planning",
                "Notify stakeholders of timeline adjustment"
            ]
        }
    elif current_load + story_points > capacity * 1.2:
        # Sprint is overloaded
        recommendations["primary_recommendation"] = {
            "id": "swap_lower_priority",
            "type": "swap",
            "title": "Swap with Lower Priority Item",
            "description": f"Sprint is at {int((current_load/capacity)*100)}% capacity. Consider swapping with lower priority work.",
            "severity": "critical",
            "action_steps": [
                "Identify lower priority items in sprint",
                "Move lower priority item to backlog",
                "Add new high-priority item",
                "Update sprint commitment"
            ]
        }
        
        # Alternative: defer
        recommendations["alternative_options"].append({
            "id": "defer_alternative",
            "type": "defer_to_next_sprint",
            "title": "Defer to Maintain Quality",
            "description": "Protect current sprint commitments by deferring to next sprint.",
            "severity": "medium",
            "action_steps": [
                "Add to next sprint backlog",
                "Communicate timeline to stakeholders"
            ]
        })
    elif schedule_risk >= 0.7 or productivity_impact > 3:
        # High risk
        recommendations["primary_recommendation"] = {
            "id": "accept_with_mitigation",
            "type": "accept_with_mitigation",
            "title": "Accept with Risk Mitigation",
            "description": f"High impact detected (Schedule Risk: {int(schedule_risk*100)}%, Impact: {productivity_impact:.1f} days). Add with monitoring.",
            "severity": "high",
            "action_steps": [
                "Assign to senior team member",
                "Daily progress check-ins",
                "Identify potential blockers early",
                "Prepare contingency plan"
            ]
        }
        
        # Alternative: split
        if story_points >= 8:
            recommendations["alternative_options"].append({
                "id": "split_work",
                "type": "split",
                "title": "Split Into Smaller Items",
                "description": f"Break {story_points} SP into smaller deliverables to reduce risk.",
                "severity": "medium",
                "action_steps": [
                    f"Create 'Analysis & Design' task ({int(story_points*0.3)} SP)",
                    f"Create 'Implementation' task ({int(story_points*0.7)} SP)",
                    "Add only Phase 1 to current sprint"
                ]
            })
    else:
        # Safe to add
        recommendations["primary_recommendation"] = {
            "id": "accept_normal",
            "type": "accept",
            "title": "Accept - Low Risk",
            "description": f"Analysis shows acceptable risk levels. Sprint has capacity ({int((current_load/capacity)*100)}%).",
            "severity": "low",
            "action_steps": [
                "Add item to sprint backlog",
                "Assign to available team member",
                "Monitor progress in daily standup"
            ]
        }
    
    return recommendations

@router.get("/health")
async def health_check(current_user: dict = Depends(get_current_user)):
    """Health check for ML service"""
    health = await check_ml_service_health()
    
    return {
        "mlService": {
            "available": health.get("available", False),
            "url": ML_SERVICE_URL,
            "status": health.get("status", "unknown"),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/backlog/{work_item_id}/analyze")
async def analyze_backlog_item(
    work_item_id: str, 
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_db)
):
    """Analyze a backlog item"""
    if not ObjectId.is_valid(work_item_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid work item ID"
        )
    
    work_item = await db.work_items.find_one({"_id": ObjectId(work_item_id)})
    if not work_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    print(f"\n📋 Analyzing backlog item: {work_item.get('title')}")
    
    # Prepare ML service payload
    ml_payload = {
        "title": work_item.get("title", ""),
        "description": work_item.get("description", ""),
        "issue_type": work_item.get("type", "Story"),
        "priority": work_item.get("priority", "Medium"),
        "story_points": float(work_item.get("storyPoints", 1) or 1),
        "days_remaining": 10.0,
        "sprint_load_7d": 0,
        "team_velocity_14d": 30.0,
        "velocity_roll_5": 3.5,
        "author_past_avg": 4.0,
        "author_workload_14d": 0.0,
        "total_links": work_item.get("mlFeatures", {}).get("totalLinks", 0),
        "total_comments": work_item.get("mlFeatures", {}).get("totalComments", 0)
    }
    
    # Try ML service, fallback to heuristics
    ml_result = await call_ml_service("/analyze/mid-sprint-impact", ml_payload)
    
    if ml_result:
        analysis = ml_result
    else:
        print("⚠️  ML service unavailable, using fallback")
        analysis = generate_fallback_analysis(work_item)
    
    return {
        "predicted_hours": analysis.get("predicted_hours"),
        "confidence_interval": analysis.get("confidence_interval"),
        "schedule_risk": {
            "label": analysis.get("schedule_risk_label"),
            "probability": analysis.get("schedule_risk_probability"),
        },
        "productivity_impact": {
            "days": f"{analysis.get('productivity_impact', 0):.1f}",
            "drop": f"{int(analysis.get('productivity_impact', 0) * 10)}%",
            "raw_value": analysis.get("productivity_impact"),
        },
        "quality_risk": {
            "label": analysis.get("quality_risk_label"),
            "probability": analysis.get("quality_risk_probability"),
        },
        "models_status": analysis.get("model_evidence"),
        "overall_risk": analysis.get("schedule_risk_label", "Medium"),
    }

@router.post("/sprints/{sprint_id}/analyze-impact")
async def analyze_mid_sprint_impact(
    sprint_id: str, 
    body: dict, 
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_db)
):
    """Analyze impact of new requirement in sprint"""
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sprint ID format"
        )
    
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found"
        )
    
    print(f"\n🚀 Analyzing mid-sprint impact for: {sprint.get('name')}")
    
    if sprint.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sprint is not active. Current status: {sprint.get('status')}"
        )
    
    # Get sprint items
    sprint_items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).to_list(500)
    current_load = sum(item.get("storyPoints", 0) or 0 for item in sprint_items)
    
    # Calculate sprint context
    now = datetime.utcnow()
    days_remaining = max(0.5, (sprint.get("endDate") - now).days) if sprint.get("endDate") else 10
    
    # Prepare ML payload
    ml_payload = {
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "issue_type": body.get("type", "Story"),
        "priority": body.get("priority", "Medium"),
        "story_points": float(body.get("storyPoints", 1)),
        "days_remaining": float(days_remaining),
        "sprint_load_7d": int(current_load),
        "team_velocity_14d": float(sprint.get("metrics", {}).get("velocity", 30.0)),
        "velocity_roll_5": 3.5,
        "author_past_avg": 4.0,
        "author_workload_14d": 3.0,
        "total_links": 0,
        "total_comments": 0
    }
    
    # Call ML service
    ml_result = await call_ml_service("/analyze/mid-sprint-impact", ml_payload)
    
    if ml_result:
        analysis = ml_result
    else:
        print("⚠️  ML service unavailable, using fallback")
        new_work_item = {
            "title": body.get("title"),
            "storyPoints": body.get("storyPoints"),
            "priority": body.get("priority"),
            "type": body.get("type")
        }
        analysis = generate_fallback_analysis(new_work_item, sprint)
    
    # Generate recommendations
    new_work_item = {
        "title": body.get("title"),
        "storyPoints": float(body.get("storyPoints", 1)),
        "priority": body.get("priority", "Medium"),
        "type": body.get("type", "Story")
    }
    
    recommendations = generate_recommendations(analysis, new_work_item, sprint, sprint_items)
    
    return {
        "predicted_hours": analysis.get("predicted_hours"),
        "confidence_interval": analysis.get("confidence_interval"),
        "schedule_risk": {
            "label": analysis.get("schedule_risk_label"),
            "probability": analysis.get("schedule_risk_probability"),
        },
        "productivity_impact": {
            "days": f"{analysis.get('productivity_impact', 0):.1f}",
            "drop": f"{int(analysis.get('productivity_impact', 0) * 10)}%",
            "raw_value": analysis.get("productivity_impact"),
        },
        "quality_risk": {
            "label": analysis.get("quality_risk_label"),
            "probability": analysis.get("quality_risk_probability"),
        },
        "models_status": analysis.get("model_evidence"),
        "recommendations": recommendations,
        "sprint_context": {
            "id": str(sprint["_id"]),
            "name": sprint.get("name"),
            "status": sprint.get("status"),
            "daysRemaining": days_remaining,
            "currentLoad": current_load,
            "capacity": sprint.get("metrics", {}).get("committedSP", 30),
        },
        "overall_risk": analysis.get("schedule_risk_label"),
    }

@router.post("/sprints/{sprint_id}/apply-recommendation")
async def apply_recommendation(
    sprint_id: str, 
    body: dict, 
    current_user: dict = Depends(get_current_user), 
    db = Depends(get_db)
):
    """Apply a recommendation"""
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sprint ID"
        )
    
    option = body.get("option")
    item_data = body.get("itemData")
    
    if not option or not option.get("type"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid option: type is required"
        )
    
    if not item_data or not item_data.get("title"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid itemData: title is required"
        )
    
    sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found"
        )
    
    created_items = []
    message = ""
    
    option_type = option.get("type")
    
    if option_type == "defer_to_next_sprint":
        # Create backlog item
        item = await db.work_items.insert_one({
            "title": item_data.get("title"),
            "description": item_data.get("description", ""),
            "storyPoints": float(item_data.get("storyPoints", 1)),
            "priority": "High",
            "type": item_data.get("type", "Story"),
            "status": "To Do",
            "space": sprint.get("space"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })
        created_items.append({"id": str(item.inserted_id), "title": item_data.get("title")})
        message = "Requirement deferred to next sprint. Added to backlog."
    
    elif option_type in ["accept_with_mitigation", "accept"]:
        # Add to current sprint
        item = await db.work_items.insert_one({
            "title": item_data.get("title"),
            "description": item_data.get("description", ""),
            "storyPoints": float(item_data.get("storyPoints", 1)),
            "priority": item_data.get("priority", "Medium"),
            "type": item_data.get("type", "Story"),
            "status": "To Do",
            "space": sprint.get("space"),
            "sprint": ObjectId(sprint_id),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })
        created_items.append({"id": str(item.inserted_id), "title": item_data.get("title")})
        message = "Requirement added to sprint with mitigations." if option_type == "accept_with_mitigation" else "Requirement added to sprint."
    
    # Update sprint metrics
    all_items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).to_list(500)
    new_committed_sp = sum(item.get("storyPoints", 0) or 0 for item in all_items)
    
    await db.sprints.update_one(
        {"_id": ObjectId(sprint_id)},
        {"$set": {"metrics.committedSP": new_committed_sp, "updatedAt": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": message,
        "createdItems": created_items,
        "updatedSprint": {
            "id": sprint_id,
            "name": sprint.get("name"),
            "workItemCount": len(all_items),
            "committedSP": new_committed_sp,
        },
    }