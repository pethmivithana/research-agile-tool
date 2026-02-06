"""
Impact Analysis routes - ML Service Integration
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.auth import get_current_user
from app.services.database import get_db
from bson import ObjectId
from datetime import datetime
import httpx

router = APIRouter()

# Stub functions - replace with actual implementations
async def check_ml_service_health():
    """Check ML service health - stub implementation"""
    return {
        "available": False,
        "url": "http://localhost:5000",
        "modelsLoaded": {},
        "status": "not_configured"
    }

async def perform_impact_analysis(work_item, sprint, db):
    """Perform impact analysis - stub implementation"""
    return {
        "effort": {
            "estimatedHours": 8.0,
            "confidence": "medium"
        },
        "scheduleRisk": {
            "label": "low",
            "probability": 0.2
        },
        "productivity": {
            "impactDays": 1.0,
            "percentageImpact": 10
        },
        "qualityRisk": {
            "label": "low",
            "probability": 0.1
        },
        "mlMetadata": {
            "modelEvidence": "stub_analysis"
        },
        "overallRiskLevel": "low"
    }

def generate_recommendation(analysis, work_item, sprint, sprint_items):
    """Generate recommendation - stub implementation"""
    return {
        "primary": {
            "title": "Accept with monitoring",
            "type": "accept_with_mitigation"
        }
    }

@router.get("/health")
async def health_check(current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Health check for ML service"""
    try:
        health = await check_ml_service_health()
        
        return {
            "mlService": {
                "available": health.get("available", False),
                "url": health.get("url", "unknown"),
                "modelsLoaded": health.get("modelsLoaded", {}),
                "status": health.get("status", "unknown"),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/backlog/{work_item_id}/analyze")
async def analyze_backlog_item(work_item_id: str, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Analyze a backlog item"""
    try:
        if not ObjectId.is_valid(work_item_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid work item ID"
            )
        
        # Fetch work item
        work_item = await db.work_items.find_one({"_id": ObjectId(work_item_id)})
        if not work_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        print(f"\n{'='*70}")
        print("📋 ANALYZING BACKLOG ITEM")
        print(f"{'='*70}")
        print(f"Work Item ID: {work_item_id}")
        print(f"Title: {work_item.get('title')}")
        print(f"Story Points: {work_item.get('storyPoints')}")
        print(f"Type: {work_item.get('type')}")
        
        # Perform ML analysis
        analysis = await perform_impact_analysis(work_item, None, db)
        
        print("✅ Backlog analysis complete")
        print(f"{'='*70}\n")
        
        return {
            "predicted_hours": analysis.get("effort", {}).get("estimatedHours"),
            "confidence_interval": analysis.get("effort", {}).get("confidence"),
            "schedule_risk": {
                "label": analysis.get("scheduleRisk", {}).get("label"),
                "probability": analysis.get("scheduleRisk", {}).get("probability"),
            },
            "productivity_impact": {
                "days": f"{analysis.get('productivity', {}).get('impactDays', 0):.1f}",
                "drop": f"{analysis.get('productivity', {}).get('percentageImpact', 0)}%",
                "raw_value": analysis.get("productivity", {}).get("impactDays"),
            },
            "quality_risk": {
                "label": analysis.get("qualityRisk", {}).get("label"),
                "probability": analysis.get("qualityRisk", {}).get("probability"),
            },
            "models_status": analysis.get("mlMetadata", {}).get("modelEvidence"),
            "overall_risk": analysis.get("overallRiskLevel"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Backlog analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{sprint_id}/analyze-impact")
async def analyze_mid_sprint_impact(sprint_id: str, body: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Analyze impact of new requirement in sprint"""
    try:
        if not ObjectId.is_valid(sprint_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sprint ID format"
            )
        
        # Fetch sprint
        sprint = await db.sprints.find_one({"_id": ObjectId(sprint_id)})
        if not sprint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sprint not found"
            )
        
        print(f"\n{'='*80}")
        print("🚀 MID-SPRINT IMPACT ANALYSIS")
        print(f"{'='*80}")
        print(f"Sprint ID: {sprint_id}")
        print(f"Request Body: {body}")
        
        # Validate sprint is active
        if sprint.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sprint is not active. Current status: {sprint.get('status')}"
            )
        
        # Build work item from request
        new_work_item = {
            "_id": ObjectId(),
            "title": body.get("title"),
            "description": body.get("description", ""),
            "storyPoints": float(body.get("storyPoints", 1)),
            "priority": body.get("priority", "Medium"),
            "type": body.get("type", "Story"),
            "mlFeatures": {
                "totalLinks": 0,
                "totalComments": 0,
                "sprintLoad7d": 5,
                "teamVelocity14d": sprint.get("metrics", {}).get("velocity", 20.0),
                "velocityRoll5": 3.5,
                "authorPastAvg": 4.0,
                "authorWorkload14d": 3.0,
            },
        }
        
        print(f"\n📦 New Work Item:")
        print(f"  Title: {new_work_item['title']}")
        print(f"  Story Points: {new_work_item['storyPoints']}")
        print(f"  Priority: {new_work_item['priority']}")
        print(f"  Type: {new_work_item['type']}")
        
        # Get current sprint items
        sprint_items = await db.work_items.find({"sprint": ObjectId(sprint_id)}).to_list(500)
        current_load = sum(item.get("storyPoints", 0) or 0 for item in sprint_items)
        
        print(f"\n📊 Current Sprint Load: {len(sprint_items)} items")
        print(f"📈 Current Story Points: {current_load}")
        print(f"📦 Sprint Capacity: {sprint.get('metrics', {}).get('committedSP', 30)} SP")
        
        # Perform ML analysis
        print("\n🤖 Calling ML Service for Impact Analysis...")
        analysis = await perform_impact_analysis(new_work_item, sprint, db)
        
        print("\n✅ ML Analysis Complete")
        print(f"  Effort: {analysis.get('effort', {}).get('estimatedHours')} hours")
        
        # Generate recommendations
        print("\n💡 Generating Recommendations...")
        recommendation = generate_recommendation(analysis, new_work_item, sprint, sprint_items)
        
        print("✅ Recommendations Generated")
        if recommendation and recommendation.get("primary"):
            print(f"  Primary: {recommendation['primary'].get('title')}")
        
        # Calculate sprint context
        now = datetime.utcnow()
        days_remaining = max(0.5, (sprint.get("endDate") - now).days) if sprint.get("endDate") else 10
        
        print(f"\n{'='*80}")
        print("✅ ANALYSIS COMPLETE")
        print(f"{'='*80}\n")
        
        return {
            "predicted_hours": analysis.get("effort", {}).get("estimatedHours"),
            "confidence_interval": analysis.get("effort", {}).get("confidence"),
            "schedule_risk": {
                "label": analysis.get("scheduleRisk", {}).get("label"),
                "probability": analysis.get("scheduleRisk", {}).get("probability"),
            },
            "productivity_impact": {
                "days": f"{analysis.get('productivity', {}).get('impactDays', 0):.1f}",
                "drop": f"{analysis.get('productivity', {}).get('percentageImpact', 0)}%",
                "raw_value": analysis.get("productivity", {}).get("impactDays"),
            },
            "quality_risk": {
                "label": analysis.get("qualityRisk", {}).get("label"),
                "probability": analysis.get("qualityRisk", {}).get("probability"),
            },
            "models_status": analysis.get("mlMetadata", {}).get("modelEvidence"),
            "recommendations": recommendation,
            "sprint_context": {
                "id": str(sprint["_id"]),
                "name": sprint.get("name"),
                "status": sprint.get("status"),
                "daysRemaining": days_remaining,
                "currentLoad": current_load,
                "capacity": sprint.get("metrics", {}).get("committedSP", 30),
            },
            "overall_risk": analysis.get("overallRiskLevel"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n❌ ERROR in analyzeMidSprintImpact:")
        print(f"{'='*80}")
        print(f"Error: {str(e)}")
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/sprints/{sprint_id}/apply-recommendation")
async def apply_recommendation(sprint_id: str, body: dict, current_user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Apply a recommendation"""
    try:
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
                "status": "Backlog",
                "space": sprint.get("space"),
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            })
            created_items.append({"id": str(item.inserted_id), "title": item_data.get("title")})
            message = "Requirement deferred to next sprint. Added to backlog."
        
        elif option_type == "accept_with_mitigation":
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
            message = "Requirement added to sprint with mitigations."
        
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )