"""
Impact Analysis Service - ML Service Integration
"""

import httpx
import os
from datetime import datetime

PYTHON_SERVICE_URL = os.getenv("PYTHON_SERVICE_URL", "http://localhost:8000")

async def check_ml_service_health() -> dict:
    """Check ML service health"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{PYTHON_SERVICE_URL}/health", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return {
                    "available": True,
                    "url": PYTHON_SERVICE_URL,
                    "status": "online",
                    "modelsLoaded": data.get("models_loaded", {}),
                }
            else:
                return {
                    "available": False,
                    "url": PYTHON_SERVICE_URL,
                    "status": "error",
                }
    except Exception as e:
        print(f"❌ ML Service health check error: {str(e)}")
        return {
            "available": False,
            "url": PYTHON_SERVICE_URL,
            "status": "offline",
            "error": str(e),
        }

def calculate_days_remaining(sprint: dict) -> float:
    """Calculate days remaining in sprint"""
    if not sprint or not sprint.get("endDate"):
        print("⚠️  No sprint end date, using default 10 days")
        return 10.0
    
    now = datetime.utcnow()
    end = sprint.get("endDate")
    if isinstance(end, str):
        end = datetime.fromisoformat(end)
    
    days = max(0.5, (end - now).days)
    print(f"📅 Days remaining in sprint: {days}")
    return float(days)

def calculate_days_since_start(sprint: dict) -> int:
    """Calculate days since sprint start"""
    if not sprint or not sprint.get("startDate"):
        return 0
    
    now = datetime.utcnow()
    start = sprint.get("startDate")
    if isinstance(start, str):
        start = datetime.fromisoformat(start)
    
    return max(0, (now - start).days)

def prepare_ticket_data(work_item: dict, sprint: dict = None) -> dict:
    """Prepare ticket data for ML service"""
    print("\n" + "="*70)
    print("📦 Preparing Ticket Data for ML Service")
    print("="*70)
    
    ticket_data = {
        "title": str(work_item.get("title", "Untitled")),
        "description": str(work_item.get("description", "")),
        "story_points": float(work_item.get("storyPoints", 1)),
        "priority": str(work_item.get("priority", "Medium")),
        "issue_type": str(work_item.get("type", "Story")),
        "total_links": float(work_item.get("mlFeatures", {}).get("totalLinks", 0)),
        "total_comments": float(work_item.get("mlFeatures", {}).get("totalComments", 0)),
        "days_since_sprint_start": calculate_days_since_start(sprint) if sprint else 0,
        "days_remaining": calculate_days_remaining(sprint) if sprint else 10.0,
        "sprint_load_7d": float(work_item.get("mlFeatures", {}).get("sprintLoad7d", 5)),
        "team_velocity_14d": float(work_item.get("mlFeatures", {}).get("teamVelocity14d", sprint.get("metrics", {}).get("velocity", 20.0) if sprint else 20.0)),
        "velocity_roll_5": float(work_item.get("mlFeatures", {}).get("velocityRoll5", 3.5)),
        "author_past_avg": float(work_item.get("mlFeatures", {}).get("authorPastAvg", 4.0)),
        "author_workload_14d": float(work_item.get("mlFeatures", {}).get("authorWorkload14d", 3.0)),
    }
    
    print(f"Title: {ticket_data['title']}")
    print(f"Story Points: {ticket_data['story_points']}")
    print(f"Priority: {ticket_data['priority']}")
    print(f"Issue Type: {ticket_data['issue_type']}")
    
    return ticket_data

async def perform_impact_analysis(work_item: dict, sprint: dict = None, db = None) -> dict:
    """Perform impact analysis using ML service"""
    try:
        # Prepare data
        ticket_data = prepare_ticket_data(work_item, sprint)
        
        # Call ML service
        print("\n🔵 [ML Service] Calling analysis endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PYTHON_SERVICE_URL}/analyze",
                json=ticket_data,
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"❌ [ML Service] Error {response.status_code}: {response.text}")
                # Return fallback analysis
                return get_fallback_analysis()
            
            result = response.json()
            print("✅ [ML Service] Response received")
            
            return result
    
    except Exception as e:
        print(f"❌ ML Service error: {str(e)}")
        # Return fallback analysis
        return get_fallback_analysis()

def get_fallback_analysis() -> dict:
    """Return fallback analysis when ML service is unavailable"""
    return {
        "effort": {
            "estimatedHours": 16,
            "confidence": 0.6,
        },
        "scheduleRisk": {
            "label": "Medium Risk",
            "probability": 0.5,
        },
        "productivity": {
            "impactDays": 1.5,
            "percentageImpact": 25,
        },
        "qualityRisk": {
            "label": "Low",
            "probability": 0.3,
        },
        "mlMetadata": {
            "modelEvidence": {
                "effort_model": "fallback",
                "schedule_risk_model": "fallback",
                "quality_risk_model": "fallback",
            }
        },
        "overallRiskLevel": {
            "level": "medium",
            "score": 0.5,
        },
    }
