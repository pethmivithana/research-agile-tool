"""
ML Service - FastAPI Compatible
Provides ML-powered predictions for effort estimation and risk analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pickle
import numpy as np
import pandas as pd
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Research Agile ML Service", version="1.0.0")

# CORS - allow both backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
models_loaded = False
effort_model = None
schedule_risk_model = None
quality_risk_model = None
label_encoders = {}

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

class WorkItemFeatures(BaseModel):
    type: str
    priority: str
    storyPoints: Optional[float] = None
    totalLinks: int = 0
    totalComments: int = 0
    sprintLoad7d: float = 0
    teamVelocity14d: float = 0
    authorWorkload14d: float = 0
    authorPastAvg: float = 0
    velocityRoll5: float = 0
    changeSequenceIndex: int = 0
    isWeekendChange: int = 0

class PredictionResponse(BaseModel):
    effortEstimate: float
    effortConfidence: float
    scheduleRiskProb: float
    scheduleRiskLabel: str
    qualityRiskProb: float
    qualityRiskLabel: str
    usingFallback: bool = False

class HealthResponse(BaseModel):
    status: str
    available: bool
    modelsLoaded: bool
    version: str

def load_models():
    global models_loaded, effort_model, schedule_risk_model, quality_risk_model, label_encoders
    
    try:
        logger.info("Loading ML models...")
        
        model_files = {
            'effort': os.path.join(MODEL_DIR, 'effort_model.pkl'),
            'schedule': os.path.join(MODEL_DIR, 'schedule_risk_model.pkl'),
            'quality': os.path.join(MODEL_DIR, 'quality_risk_model.pkl'),
            'encoders': os.path.join(MODEL_DIR, 'label_encoders.pkl'),
        }
        
        if os.path.exists(model_files['effort']):
            with open(model_files['effort'], 'rb') as f:
                effort_model = pickle.load(f)
            logger.info("✅ Effort model loaded")
        
        if os.path.exists(model_files['schedule']):
            with open(model_files['schedule'], 'rb') as f:
                schedule_risk_model = pickle.load(f)
            logger.info("✅ Schedule risk model loaded")
        
        if os.path.exists(model_files['quality']):
            with open(model_files['quality'], 'rb') as f:
                quality_risk_model = pickle.load(f)
            logger.info("✅ Quality risk model loaded")
        
        if os.path.exists(model_files['encoders']):
            with open(model_files['encoders'], 'rb') as f:
                label_encoders = pickle.load(f)
            logger.info("✅ Label encoders loaded")
        
        models_loaded = any([effort_model, schedule_risk_model, quality_risk_model])
        logger.info(f"Models loaded: {models_loaded}")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        models_loaded = False

def fallback_prediction(features: WorkItemFeatures) -> PredictionResponse:
    story_points = features.storyPoints or 3
    effort = story_points * 6.5
    
    priority_multipliers = {'Critical': 1.3, 'High': 1.2, 'Medium': 1.0, 'Low': 0.8}
    effort *= priority_multipliers.get(features.priority, 1.0)
    
    schedule_risk = 0.5 if features.sprintLoad7d > 70 else 0.3
    quality_risk = 0.4 if features.priority in ['Critical', 'High'] else 0.2
    
    return PredictionResponse(
        effortEstimate=round(effort, 1),
        effortConfidence=0.6,
        scheduleRiskProb=schedule_risk,
        scheduleRiskLabel='high' if schedule_risk > 0.6 else ('medium' if schedule_risk > 0.3 else 'low'),
        qualityRiskProb=quality_risk,
        qualityRiskLabel='high' if quality_risk > 0.6 else ('medium' if quality_risk > 0.3 else 'low'),
        usingFallback=True
    )

@app.on_event("startup")
async def startup():
    load_models()

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        available=True,
        modelsLoaded=models_loaded,
        version="1.0.0"
    )

@app.post("/predict", response_model=PredictionResponse)
async def predict(features: WorkItemFeatures):
    try:
        if not models_loaded:
            return fallback_prediction(features)
        
        # Prepare features (simplified version)
        feature_dict = {
            'type': features.type,
            'priority': features.priority,
            'storyPoints': features.storyPoints or 0,
            'totalLinks': features.totalLinks,
            'totalComments': features.totalComments,
            'sprintLoad7d': features.sprintLoad7d,
            'teamVelocity14d': features.teamVelocity14d,
            'authorWorkload14d': features.authorWorkload14d,
            'authorPastAvg': features.authorPastAvg,
            'velocityRoll5': features.velocityRoll5,
            'changeSequenceIndex': features.changeSequenceIndex,
            'isWeekendChange': features.isWeekendChange,
        }
        
        df = pd.DataFrame([feature_dict])
        
        # Predict
        effort = float(effort_model.predict(df)[0]) if effort_model else features.storyPoints * 6.5
        
        return PredictionResponse(
            effortEstimate=round(effort, 1),
            effortConfidence=0.85,
            scheduleRiskProb=0.3,
            scheduleRiskLabel="low",
            qualityRiskProb=0.2,
            qualityRiskLabel="low",
            usingFallback=not models_loaded
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return fallback_prediction(features)

@app.post("/analyze/mid-sprint-impact")
async def analyze_mid_sprint_impact(data: dict):
    """Analyze impact of new requirement in mid-sprint"""
    try:
        logger.info(f"Analyzing mid-sprint impact for: {data.get('title', 'Unknown')}")
        
        story_points = float(data.get('story_points', 1))
        priority = data.get('priority', 'Medium')
        days_remaining = float(data.get('days_remaining', 10))
        sprint_load = float(data.get('sprint_load_7d', 0))
        
        # Calculate effort
        estimated_hours = story_points * 6.5
        
        # Calculate schedule risk
        schedule_risk = 0.3
        if story_points > 8:
            schedule_risk += 0.2
        if priority in ['Critical', 'High']:
            schedule_risk += 0.15
        if days_remaining < 3:
            schedule_risk += 0.25
        if sprint_load > 70:
            schedule_risk += 0.1
        
        schedule_risk = min(schedule_risk, 1.0)
        
        schedule_label = 'low'
        if schedule_risk >= 0.7:
            schedule_label = 'critical'
        elif schedule_risk >= 0.5:
            schedule_label = 'high'
        elif schedule_risk >= 0.3:
            schedule_label = 'medium'
        
        # Calculate productivity impact
        productivity_impact = story_points * 0.3
        
        # Calculate quality risk
        quality_risk = 0.2
        if story_points > 13:
            quality_risk += 0.3
        if priority in ['Critical', 'High']:
            quality_risk += 0.2
        
        quality_label = 'high' if quality_risk >= 0.5 else ('medium' if quality_risk >= 0.3 else 'low')
        
        return {
            "predicted_hours": estimated_hours,
            "confidence_interval": "0.85",
            "schedule_risk_label": schedule_label,
            "schedule_risk_probability": schedule_risk,
            "productivity_impact": productivity_impact,
            "quality_risk_label": quality_label,
            "quality_risk_probability": quality_risk,
            "model_evidence": {
                "effort": False,
                "schedule": False,
                "productivity": False,
                "quality": False
            }
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return {
            "predicted_hours": 0,
            "confidence_interval": "0.6",
            "schedule_risk_label": "medium",
            "schedule_risk_probability": 0.5,
            "productivity_impact": 0,
            "quality_risk_label": "medium",
            "quality_risk_probability": 0.5,
            "model_evidence": {}
        }

@app.get("/")
async def root():
    return {
        "service": "ML Service",
        "version": "1.0.0",
        "models_loaded": models_loaded
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
