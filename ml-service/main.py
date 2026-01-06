import os
import joblib
import numpy as np
import torch
import torch.nn as nn
import xgboost as xgb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Any, Optional
import warnings
import zipfile
from recommendation_engine import get_recommendations  # Import the helper

# --- 0. WINDOWS / ENV FIXES ---
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
warnings.filterwarnings("ignore")

# --- 1. SETUP ---
# We make this check "Loud" so you know if the library is missing
try:
    from pytorch_tabnet.tab_model import TabNetClassifier
    TABNET_AVAILABLE = True
    print("✅ PyTorch TabNet library found.")
except ImportError:
    print("❌ ERROR: 'pytorch-tabnet' is not installed. Quality Risk will fail.")
    print("👉 Run: pip install pytorch-tabnet")
    TABNET_AVAILABLE = False

app = FastAPI(title="Agile Research ML Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
MODELS_DIR = "models"
loaded_assets = {"effort": None, "productivity": None, "schedule": None, "quality": None}

# --- 2. MODEL ARCHITECTURE ---
class ResearchNet(nn.Module):
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

# --- 3. INPUT SCHEMA ---
class TicketData(BaseModel):
    title: str
    description: str = ""
    issue_type: str = "Story"
    priority: str = "Medium"
    story_points: float = 1.0
    total_links: int = 0
    total_comments: int = 0
    days_since_sprint_start: int = 0
    days_remaining: float = 10.0
    
    # Context Features
    sprint_load_7d: int = 5
    team_velocity_14d: float = 20.0
    velocity_roll_5: float = 3.5
    author_past_avg: float = 4.0
    author_workload_14d: float = 3.0
    
    model_config = ConfigDict(extra='ignore')

class RecommendationRequest(BaseModel):
    """Request for recommendations with analysis results and sprint context"""
    analysis_result: Dict[str, Any]
    item_data: Dict[str, Any]
    sprint_context: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(extra='ignore')

class AnalysisResponse(BaseModel):
    predicted_hours: float
    confidence_interval: str  # e.g., "12.5h - 18.2h"
    schedule_risk_probability: float
    schedule_risk_label: str
    productivity_impact: float
    quality_risk_probability: float
    quality_risk_label: str
    model_evidence: Dict[str, bool]

# --- 4. MODEL LOADING ---
@app.on_event("startup")
def load_models():
    print("\n🔍 INITIALIZING AGILE ML SERVICE...")

    # A. EFFORT (3 Quantile Models + Fixed Artifact)
    try:
        eff_path = os.path.join(MODELS_DIR, "effort_artifacts.pkl")
        if os.path.exists(eff_path):
            eff_art = joblib.load(eff_path)
            
            # Load all 3 JSON models
            m_lower = xgb.XGBRegressor()
            m_lower.load_model(os.path.join(MODELS_DIR, "effort_model_lower.json"))

            m_med = xgb.XGBRegressor()
            m_med.load_model(os.path.join(MODELS_DIR, "effort_model_median.json"))
            
            m_upper = xgb.XGBRegressor()
            m_upper.load_model(os.path.join(MODELS_DIR, "effort_model_upper.json"))

            loaded_assets["effort"] = {
                "tfidf": eff_art["tfidf"], 
                "le_type": eff_art["le_type"], 
                "lower": m_lower,
                "median": m_med,
                "upper": m_upper
            }
            print("✅ Effort Models Loaded (Cone of Uncertainty)")
        else:
            print("❌ Effort Artifacts NOT FOUND.")
    except Exception as e: print(f"❌ Effort Load Error: {e}")

    # B. PRODUCTIVITY
    try:
        prod_path = os.path.join(MODELS_DIR, "productivity_artifacts.pkl")
        if os.path.exists(prod_path):
            prod_art = joblib.load(prod_path)
            xgb_prod = xgb.XGBRegressor()
            xgb_prod.load_model(os.path.join(MODELS_DIR, "model_productivity_xgb.json"))
            input_dim = prod_art.get('input_dim', 9) 
            nn_prod = ResearchNet(input_dim)
            nn_prod.load_state_dict(torch.load(os.path.join(MODELS_DIR, "model_productivity_nn.pth"), map_location='cpu'))
            nn_prod.eval()
            loaded_assets["productivity"] = {
                "scaler": prod_art["scaler"],
                "le_type": prod_art["le_type"],
                "le_prio": prod_art["le_prio"],
                "xgb": xgb_prod, "nn": nn_prod
            }
            print("✅ Productivity Models Loaded")
    except Exception as e: print(f"❌ Productivity Load Error: {e}")

    # C. SCHEDULE
    try:
        sch_model_path = os.path.join(MODELS_DIR, "schedule_risk_model.pkl")
        sch_art_path = os.path.join(MODELS_DIR, "risk_artifacts.pkl")
        if os.path.exists(sch_model_path) and os.path.exists(sch_art_path):
            sch_model = joblib.load(sch_model_path)
            sch_artifacts = joblib.load(sch_art_path)
            loaded_assets["schedule"] = {
                "model": sch_model,
                "imputer": sch_artifacts.get("imputer"),
                "le_type": sch_artifacts.get("le_type"),
                "le_prio": sch_artifacts.get("le_prio"),
                # Robust Label Mapping
                "label_map": sch_artifacts.get("label_map", {0:"Critical Risk", 1:"High Risk", 2:"Low Risk", 3:"Medium Risk"})
            }
            print("✅ Schedule Risk Model Loaded")
        else:
            print(f"❌ Schedule Model missing")
    except Exception as e: print(f"❌ Schedule Load Error: {e}")

    # D. QUALITY
    if TABNET_AVAILABLE:
        try:
            q_zip_path = os.path.join(MODELS_DIR, "tabnet_quality_model.zip")
            if os.path.exists(q_zip_path):
                q_model = TabNetClassifier()
                q_model.load_model(q_zip_path)
                
                le_path = os.path.join(MODELS_DIR, "le_prio_quality.pkl")
                le_p = joblib.load(le_path) if os.path.exists(le_path) else None
                
                loaded_assets["quality"] = {"model": q_model, "le_prio": le_p}
                print("✅ Quality Risk Model Loaded")
            else:
                print(f"❌ Quality Model ZIP NOT FOUND at: {q_zip_path}")
        except Exception as e: 
            print(f"❌ Quality Load Error: {e}")

# --- 5. PREDICTION LOGIC ---

def safe_transform(encoder, value, default=0):
    try: return encoder.transform([value])[0]
    except: return default

def predict_effort(data: TicketData):
    """
    Returns (Median Hours, Confidence Interval String)
    Calculates range using Lower and Upper Quantile Models
    """
    assets = loaded_assets["effort"]
    # Fallback if models not loaded
    if not assets: 
        return float(data.story_points * 8), "Rule-Based"
    
    try:
        # 1. Text Vectorization
        txt = f"{data.title} {data.description}"
        txt_vec = assets["tfidf"].transform([txt]).toarray()
        
        # 2. Context Features
        t_c = safe_transform(assets["le_type"], data.issue_type)
        pressure = 1.0 / max(0.5, data.days_remaining)
        
        # 3. Assemble Vector
        # [sprint_load, velocity, pressure, links, type_code] + [txt_0...txt_99]
        meta = np.array([[data.sprint_load_7d, data.team_velocity_14d, pressure, data.total_links, t_c]])
        vec = np.hstack([meta, txt_vec])
        
        # 4. Predict Quantiles (Output is Story Points -> Convert to Hours * 8)
        raw_lower = float(assets["lower"].predict(vec)[0])
        raw_med = float(assets["median"].predict(vec)[0])
        raw_upper = float(assets["upper"].predict(vec)[0])
        
        # 5. Sanity Checks & Formatting
        h_low = max(0.5, raw_lower * 8.0)
        h_med = max(h_low, raw_med * 8.0)
        h_high = max(h_med, raw_upper * 8.0)
        
        conf_interval = f"{h_low:.1f}h - {h_high:.1f}h"
        
        return h_med, conf_interval

    except Exception as e:
        print(f"Effort Prediction Error: {e}")
        # Return fallback but log the error to console
        return float(data.story_points * 8), "Error"

def predict_productivity(data: TicketData):
    assets = loaded_assets["productivity"]
    if not assets: return 0.0
    try:
        mass = data.story_points * (data.total_links + 1)
        blk = 1 if data.priority in ['Blocker', 'Critical'] else 0
        bug = 1 if data.issue_type == 'Bug' else 0
        t_c = safe_transform(assets["le_type"], data.issue_type)
        p_c = safe_transform(assets["le_prio"], data.priority)
        raw = np.array([[data.story_points, data.total_links, mass, 
                         data.velocity_roll_5, data.author_past_avg, blk, bug, t_c, p_c]])
        scaled = assets["scaler"].transform(raw)
        xgb_out = assets["xgb"].predict(scaled)[0]
        with torch.no_grad():
            nn_out = assets["nn"](torch.FloatTensor(scaled)).item()
        return float(np.expm1(0.7*xgb_out + 0.3*nn_out))
    except: return 0.0

def predict_schedule(data: TicketData):
    assets = loaded_assets["schedule"]
    if not assets: return "Medium Risk", 0.5
    try:
        ld = data.total_links / (data.story_points + 1)
        cd = data.total_comments / (data.story_points + 1)
        pr = data.story_points / max(0.1, data.days_remaining)
        t_c = safe_transform(assets["le_type"], data.issue_type)
        p_c = safe_transform(assets["le_prio"], data.priority)
        
        raw_vec = np.array([[data.story_points, data.total_links, data.total_comments, 
                             data.author_workload_14d, ld, cd, pr, t_c, p_c]])
        
        if assets["imputer"]: final_vec = assets["imputer"].transform(raw_vec)
        else: final_vec = raw_vec
        
        probs = assets["model"].predict_proba(final_vec)[0]
        idx = np.argmax(probs)
        
        label_map = assets.get("label_map", {})
        if label_map:
             # Handle potential string/int key mismatch in JSON
            predicted_label = label_map.get(idx) or label_map.get(str(idx)) or "Medium"
        else:
            fallback = ["Critical", "High", "Low", "Medium"]
            predicted_label = fallback[idx] if idx < 4 else "Medium"
            
        if "Risk" not in predicted_label: predicted_label += " Risk"
            
        return predicted_label, float(probs[idx])
    except Exception as e: 
        print(f"Schedule Error: {e}")
        return "Medium Risk", 0.5

def predict_quality(data: TicketData):
    assets = loaded_assets["quality"]
    if not assets: return "Low", 0.0
    try:
        # Feature Mapping
        if assets["le_prio"]: p_c = safe_transform(assets["le_prio"], data.priority, default=2)
        else: p_c = 2
        comp = data.story_points * (data.total_links + 1)
        
        feature_names = ["Story Points", "Total Links", "Total Comments", "Author Workload", "Complexity Score", "Priority Level"]
        
        vec = np.array([[float(data.story_points), float(data.total_links), float(data.total_comments),
                         float(data.author_workload_14d), float(comp), float(p_c)]])
        
        probs = assets["model"].predict_proba(vec)[0]
        prob_defect = float(probs[1]) 
        
        # Explainability
        explain_matrix, masks = assets["model"].explain(vec)
        top_idx = np.argmax(explain_matrix[0])
        reason = feature_names[top_idx]

        if prob_defect > 0.5:
            print(f"   [Quality] Risk: High ({prob_defect:.2f}). Reason: {reason}")
            return f"High (Due to {reason})", prob_defect
        else:
            return "Low", prob_defect
    except Exception as e:
        print(f"Quality Error: {e}")
        return "Low", 0.0

@app.post("/analyze/mid-sprint-impact", response_model=AnalysisResponse)
def analyze_impact(data: TicketData):
    print(f"\n📨 Analyzing: {data.title}")
    
    # 1. Effort (Returns median + range string)
    eff_h, eff_conf = predict_effort(data)
    
    # 2. Others
    prod_d = predict_productivity(data)
    sch_lbl, sch_prob = predict_schedule(data)
    qual_lbl, qual_prob = predict_quality(data)
    
    # 3. Console Log
    print(f"   Results -> Effort: {eff_h:.1f}h ({eff_conf}) | Sched: {sch_lbl} | Prod: {prod_d:.1f}d | Qual: {qual_lbl} ({qual_prob:.0%})")
    
    # 4. Generate Recommendations (Internal Call)
    analysis_results = {
        "predicted_hours": eff_h,
        "schedule_risk_probability": sch_prob,
        "productivity_impact": prod_d,
        "quality_risk_probability": qual_prob
    }
    item_data = {
        "title": data.title, "description": data.description,
        "story_points": data.story_points, "priority": data.priority, "issue_type": data.issue_type
    }
    try:
        rec_context = {"sprint_load_7d": data.sprint_load_7d, "days_remaining": data.days_remaining}
        _ = get_recommendations(analysis_results, item_data, rec_context)
    except: pass

    return AnalysisResponse(
        predicted_hours=round(eff_h, 1),
        confidence_interval=eff_conf,
        schedule_risk_probability=round(sch_prob, 2),
        schedule_risk_label=sch_lbl,
        productivity_impact=round(prod_d, 1),
        quality_risk_probability=round(qual_prob, 2),
        quality_risk_label=qual_lbl,
        model_evidence={"schedule": loaded_assets["schedule"] is not None}
    )

@app.post("/recommendations/generate")
def generate_recommendations(request: RecommendationRequest):
    print(f"\n🧠 Generating recommendations for: {request.item_data.get('title', 'Unknown')}")
    try:
        recommendations = get_recommendations(
            request.analysis_result,
            request.item_data,
            request.sprint_context
        )
        print(f"   Decision: {recommendations['decision'].upper()}")
        print(f"   Generated {len(recommendations.get('alternative_options', [])) + 1} options")
        return recommendations
    except Exception as e:
        print(f"❌ Recommendation Error: {e}")
        return {
            "decision": "requires_manual_review",
            "primary_recommendation": {"id": "FALLBACK", "title": "Manual Review Required", "description": "Error generating recommendations.", "severity": "medium"},
            "alternative_options": [],
            "risk_summary": {"level": "UNKNOWN", "summary": "Error encountered."}
        }

@app.get("/health")
def health_check():
    # Return "ok" to ensure frontend shows ONLINE
    return {
        "status": "ok",
        "models_loaded": {
            "effort": loaded_assets["effort"] is not None,
            "productivity": loaded_assets["productivity"] is not None,
            "schedule": loaded_assets["schedule"] is not None,
            "quality": loaded_assets["quality"] is not None
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)