import os
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Optional
from pytorch_tabnet.tab_model import TabNetClassifier
from sentence_transformers import SentenceTransformer

# --- 1. SETUP ---
app = FastAPI(title="Agile Research ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = "models"

# Storage for loaded models and artifacts
loaded_assets = {
    "effort": None,
    "productivity": None,
    "schedule": None,
    "quality": None,
    "sbert": None
}

# --- 2. MODEL DEFINITIONS ---

class ResearchNet(nn.Module):
    """
    The Neural Network component for the Hybrid Productivity Model.
    Matches the architecture defined in your research notebook.
    """
    def __init__(self, input_dim):
        super(ResearchNet, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, 1)
        )
    
    def forward(self, x):
        return self.model(x)

# --- 3. DATA SCHEMAS ---

class TicketData(BaseModel):
    title: str
    description: str = ""
    issue_type: str = "Story"
    priority: str = "Medium"
    story_points: float = 1.0
    
    # Complexity Metrics
    total_links: int = 0
    total_comments: int = 0
    
    # Context Features (Sprint2Vec / Research Metrics)
    days_since_sprint_start: int = 0
    days_remaining: float = 10.0
    
    # For Effort Model (Sprint Load Context)
    sprint_load_7d: int = 5      
    team_velocity_14d: float = 20.0 
    
    # For Productivity Model (Momentum)
    velocity_roll_5: float = 3.5  
    author_past_avg: float = 4.0  
    
    # For Quality Model (Developer Workload)
    author_workload_14d: float = 3.0 
    
    model_config = ConfigDict(extra='ignore')

class AnalysisResponse(BaseModel):
    predicted_hours: float
    schedule_risk_probability: float
    schedule_risk_label: str
    productivity_impact: float
    quality_risk_probability: float
    quality_risk_label: str
    model_evidence: Dict[str, bool]

# --- 4. LOADING LOGIC ---

@app.on_event("startup")
def load_models():
    print("\n🔍 INITIALIZING AGILE RESEARCH ML SERVICE...")
    
    # 1. Load SBERT
    try:
        print("⏳ Loading SBERT...")
        loaded_assets["sbert"] = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ SBERT Loaded")
    except Exception as e:
        print(f"❌ SBERT Failed: {e}")

    # 2. EFFORT MODEL (Quantile XGBoost)
    try:
        print("⏳ Loading Effort Models...")
        eff_art_path = os.path.join(MODELS_DIR, "effort_artifacts.pkl")
        if os.path.exists(eff_art_path):
            eff_art = joblib.load(eff_art_path)
            
            # Load the 3 quantile models
            m_med = xgb.XGBRegressor()
            m_med.load_model(os.path.join(MODELS_DIR, "effort_model_median.json"))
            
            m_low = xgb.XGBRegressor()
            m_low.load_model(os.path.join(MODELS_DIR, "effort_model_lower.json"))
            
            m_up = xgb.XGBRegressor()
            m_up.load_model(os.path.join(MODELS_DIR, "effort_model_upper.json"))
            
            loaded_assets["effort"] = {
                "tfidf": eff_art["tfidf"],
                "le_type": eff_art["le_type"],
                "median": m_med,
                "lower": m_low,
                "upper": m_up
            }
            print("✅ Effort Models Loaded (Quantile)")
        else:
            print("❌ Effort artifacts not found.")
    except Exception as e:
        print(f"❌ Effort Load Failed: {e}")

    # 3. PRODUCTIVITY MODEL (Hybrid XGBoost + PyTorch)
    try:
        print("⏳ Loading Productivity Models...")
        prod_art_path = os.path.join(MODELS_DIR, "productivity_artifacts.pkl")
        if os.path.exists(prod_art_path):
            prod_art = joblib.load(prod_art_path)
            
            xgb_prod = xgb.XGBRegressor()
            xgb_prod.load_model(os.path.join(MODELS_DIR, "model_productivity_xgb.json"))
            
            # Reconstruct Neural Net with correct dimensions
            input_dim = prod_art.get('input_dim', 9) # Default fallback if key missing
            nn_prod = ResearchNet(input_dim=input_dim)
            nn_prod.load_state_dict(torch.load(os.path.join(MODELS_DIR, "model_productivity_nn.pth"), map_location=torch.device('cpu')))
            nn_prod.eval()
            
            loaded_assets["productivity"] = {
                "scaler": prod_art["scaler"],
                "le_type": prod_art["le_type"], # Ensure consistent naming in your notebook
                "le_prio": prod_art["le_prio"],
                "xgb": xgb_prod,
                "nn": nn_prod
            }
            print("✅ Productivity Models Loaded (Hybrid)")
        else:
             print("❌ Productivity artifacts not found.")
    except Exception as e:
        print(f"❌ Productivity Load Failed: {e}")

    # 4. SCHEDULE RISK (XGBoost Classifier)
    try:
        print("⏳ Loading Schedule Risk Model...")
        sched_path = os.path.join(MODELS_DIR, "schedule_risk_model.pkl")
        if os.path.exists(sched_path):
            sched_model = joblib.load(sched_path)
            loaded_assets["schedule"] = sched_model
            print("✅ Schedule Risk Model Loaded")
        else:
            print("❌ Schedule model file not found.")
    except Exception as e:
        print(f"❌ Schedule Risk Load Failed: {e}")

    # 5. QUALITY RISK (TabNet)
    try:
        print("⏳ Loading Quality Risk Model...")
        qual_path = os.path.join(MODELS_DIR, "tabnet_quality_model.zip")
        le_qual_path = os.path.join(MODELS_DIR, "le_prio_quality.pkl")
        
        if os.path.exists(qual_path) and os.path.exists(le_qual_path):
            qual_model = TabNetClassifier()
            qual_model.load_model(qual_path)
            le_qual = joblib.load(le_qual_path)
            
            loaded_assets["quality"] = {
                "model": qual_model,
                "le_prio": le_qual
            }
            print("✅ Quality Risk Model Loaded")
        else:
            print("❌ Quality model files not found.")
    except Exception as e:
        print(f"❌ Quality Risk Load Failed: {e}")

# --- 5. PREDICTION LOGIC ---

def predict_effort(data: TicketData):
    assets = loaded_assets["effort"]
    if not assets: return 0, [0,0], 0
    
    try:
        # Feature Engineering (Must match training notebook)
        full_text = f"{data.title} {data.description}"
        text_emb = assets["tfidf"].transform([full_text]).toarray()
        
        try:
            type_code = assets["le_type"].transform([data.issue_type])[0]
        except:
            type_code = 0 # Default for unseen labels
            
        pressure_index = 1.0 / max(0.5, data.days_remaining)
        
        # Vector construction: [load, velocity, pressure, links, type] + text_embedding
        meta_features = np.array([[data.sprint_load_7d, data.team_velocity_14d, pressure_index, data.total_links, type_code]])
        input_vec = np.hstack([meta_features, text_emb])
        
        # Predictions
        est = float(assets["median"].predict(input_vec)[0])
        low = float(assets["lower"].predict(input_vec)[0])
        high = float(assets["upper"].predict(input_vec)[0])
        
        # Fibonacci Snapping
        fibs = np.array([1, 2, 3, 5, 8, 13, 21])
        final_est = fibs[(np.abs(fibs - est)).argmin()]
        final_low = fibs[(np.abs(fibs - low)).argmin()]
        final_high = fibs[(np.abs(fibs - high)).argmin()]
        
        # Confidence Score
        spread = high - low
        conf = max(0, 100 - (spread * 10))
        
        return float(final_est), [float(min(final_low, final_est)), float(max(final_high, final_est))], float(conf)
    except Exception as e:
        print(f"Effort Predict Error: {e}")
        return float(data.story_points), [0.0, 0.0], 0.0

def predict_productivity(data: TicketData):
    assets = loaded_assets["productivity"]
    if not assets: return 0.0
    
    try:
        # Feature Engineering
        mass = data.story_points * (data.total_links + 1)
        is_blocker = 1 if data.priority in ['Blocker', 'Critical'] else 0
        is_bug = 1 if data.issue_type == 'Bug' else 0
        
        try: t_enc = assets["le_type"].transform([data.issue_type])[0]
        except: t_enc = 0
        try: p_enc = assets["le_prio"].transform([data.priority])[0]
        except: p_enc = 0
        
        # Feature vector must match training order
        # [SP, Links, Mass, Velocity, AuthorAvg, Blocker, Bug, Type, Prio]
        raw = np.array([[
            data.story_points, data.total_links, mass,
            data.velocity_roll_5, data.author_past_avg,
            is_blocker, is_bug, t_enc, p_enc
        ]])
        
        scaled = assets["scaler"].transform(raw)
        
        # Hybrid Inference
        xgb_pred_log = assets["xgb"].predict(scaled)[0]
        with torch.no_grad():
            nn_pred_log = assets["nn"](torch.FloatTensor(scaled)).item()
            
        # Weighted Ensemble (70/30) & Inverse Log
        final_log = (0.7 * xgb_pred_log) + (0.3 * nn_pred_log)
        days = np.expm1(final_log)
        
        return float(days)
    except Exception as e:
        print(f"Productivity Predict Error: {e}")
        return 0.0

def predict_schedule(data: TicketData):
    model = loaded_assets["schedule"]
    if not model: return "Unknown", 0.0
    
    try:
        # Features for Schedule Risk (Aggregated Proxy)
        # We need to construct a feature vector compatible with the trained model.
        # This is tricky without the exact training feature names, so we approximate
        # based on standard aggregated features:
        # [SP, Links, Comments, Workload, LinkDens, CommDens, Pressure, Type, Prio]
        
        link_dens = data.total_links / (data.story_points + 1)
        comm_dens = data.total_comments / (data.story_points + 1)
        pressure = data.story_points / max(0.1, data.days_remaining)
        
        # Placeholder for encoded type/prio if the model expects them as raw features
        # Note: If your model used OneHot encoding, this part might need adjustment based on training columns
        # A safer bet for deployment is often to use the numeric/continuous features primarily.
        
        input_arr = np.array([[
            data.story_points, 
            data.total_links, 
            data.total_comments,
            data.author_workload_14d, 
            link_dens, 
            comm_dens, 
            pressure,
            0, # Type proxy
            0  # Prio proxy
        ]])
        
        # XGBoost prediction
        pred_idx = model.predict(input_arr)[0]
        probs = model.predict_proba(input_arr)[0]
        
        labels = ["No Risk", "Low Risk", "High Risk", "Critical Risk"]
        
        # Safety check for index
        label = labels[pred_idx] if pred_idx < len(labels) else "Medium Risk"
        prob = float(probs[pred_idx])
        
        return label, prob
    except Exception as e:
        print(f"Schedule Predict Error: {e}")
        return "Medium Risk", 0.5

def predict_quality(data: TicketData):
    assets = loaded_assets["quality"]
    if not assets: return "Unknown", 0.0
    
    try:
        model = assets["model"]
        le_prio = assets["le_prio"]
        
        # Encoding
        try:
            p_code = le_prio.transform([data.priority])[0]
        except:
            p_code = 0
            
        comp_interaction = data.story_points * (data.total_links + 1)
        
        # Features: [SP, Links, Comments, Workload, Complexity, PrioCode]
        feat_arr = np.array([[
            data.story_points,
            data.total_links,
            data.total_comments,
            data.author_workload_14d,
            comp_interaction,
            p_code
        ]])
        
        probs = model.predict_proba(feat_arr)[0]
        # Assuming binary classification: [0: No Defect, 1: Defect]
        risk_prob = float(probs[1])
        label = "High" if risk_prob > 0.5 else "Low"
        
        return label, risk_prob
    except Exception as e:
        print(f"Quality Predict Error: {e}")
        return "Low", 0.0

# --- 6. ENDPOINTS ---

@app.post("/analyze/mid-sprint-impact", response_model=AnalysisResponse)
def analyze_impact_endpoint(data: TicketData):
    print(f"\n📨 Analyzing Ticket: {data.title}")
    
    # Run Predictions
    # Note: Effort output is (estimate, [low, high], confidence)
    # We convert estimate to hours (assuming 1 SP = 8 hours approx for simplicity in response)
    eff_sp, eff_int, eff_conf = predict_effort(data)
    eff_hours = eff_sp * 8.0 
    
    prod_days = predict_productivity(data)
    
    sch_lbl, sch_prob = predict_schedule(data)
    
    qual_lbl, qual_prob = predict_quality(data)
    
    evidence = {
        "effort": loaded_assets["effort"] is not None,
        "productivity": loaded_assets["productivity"] is not None,
        "schedule": loaded_assets["schedule"] is not None,
        "quality": loaded_assets["quality"] is not None
    }
    
    print(f"   --> Effort: {eff_sp} SP ({eff_hours}h)")
    print(f"   --> Schedule: {sch_lbl} ({sch_prob:.2f})")
    print(f"   --> Productivity Impact: {prod_days:.1f} days")
    print(f"   --> Quality Risk: {qual_lbl} ({qual_prob:.2f})")
    
    return AnalysisResponse(
        predicted_hours=round(eff_hours, 1),
        schedule_risk_probability=round(sch_prob, 2),
        schedule_risk_label=sch_lbl,
        productivity_impact=round(prod_days, 1), # Returning days as impact
        quality_risk_probability=round(qual_prob, 2),
        quality_risk_label=qual_lbl,
        model_evidence=evidence
    )

@app.get("/health")
def health():
    return {
        "status": "active", 
        "models": {k: (v is not None) for k,v in loaded_assets.items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)