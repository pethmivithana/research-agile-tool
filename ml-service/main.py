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
import traceback
from recommendation_engine import get_recommendations  # Import the helper
from sprint_context import SprintContextEngine  # Explicit import for sprint context
from rules_engine import RulesEngine  # Explicit import for rules engine

# --- 0. WINDOWS FIXES ---
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
    schedule_risk_probability: float
    schedule_risk_label: str
    productivity_impact: float
    quality_risk_probability: float
    quality_risk_label: str
    model_evidence: Dict[str, bool]

# --- 4. MODEL LOADING ---
@app.on_event("startup")
def load_models():
    print("\n" + "="*60)
    print("🔍 INITIALIZING AGILE ML SERVICE...")
    print("="*60)
    
    model_status = {}

    # A. EFFORT
    print("\n[1/4] Loading Effort Model...")
    try:
        eff_path = os.path.join(MODELS_DIR, "effort_artifacts.pkl")
        if os.path.exists(eff_path):
            eff_art = joblib.load(eff_path)
            m_med = xgb.XGBRegressor()
            m_med.load_model(os.path.join(MODELS_DIR, "effort_model_median.json"))
            loaded_assets["effort"] = {"tfidf": eff_art["tfidf"], "le_type": eff_art["le_type"], "median": m_med}
            print("   ✅ Effort Model: LOADED (XGBoost + TF-IDF)")
            model_status["effort"] = "✅ LOADED"
        else:
            print(f"   ❌ Effort Model: FILE NOT FOUND at {eff_path}")
            model_status["effort"] = "❌ FILE NOT FOUND"
    except Exception as e:
        print(f"   ❌ Effort Model: LOAD ERROR - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        model_status["effort"] = f"❌ ERROR: {str(e)[:50]}"

    # B. PRODUCTIVITY
    print("\n[2/4] Loading Productivity Model...")
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
            print("   ✅ Productivity Model: LOADED (Hybrid XGBoost + Neural Network)")
            model_status["productivity"] = "✅ LOADED"
        else:
            print(f"   ❌ Productivity Model: FILE NOT FOUND at {prod_path}")
            model_status["productivity"] = "❌ FILE NOT FOUND"
    except Exception as e:
        print(f"   ❌ Productivity Model: LOAD ERROR - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        model_status["productivity"] = f"❌ ERROR: {str(e)[:50]}"

    # C. SCHEDULE
    print("\n[3/4] Loading Schedule Risk Model...")
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
                "le_prio": sch_artifacts.get("le_prio")
            }
            print("   ✅ Schedule Risk Model: LOADED")
            model_status["schedule"] = "✅ LOADED"
        else:
            missing = []
            if not os.path.exists(sch_model_path): missing.append(f"model: {sch_model_path}")
            if not os.path.exists(sch_art_path): missing.append(f"artifacts: {sch_art_path}")
            print(f"   ❌ Schedule Model: FILES NOT FOUND - {', '.join(missing)}")
            model_status["schedule"] = "❌ FILES NOT FOUND"
    except Exception as e:
        print(f"   ❌ Schedule Model: LOAD ERROR - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        model_status["schedule"] = f"❌ ERROR: {str(e)[:50]}"

    # D. QUALITY
    print("\n[4/4] Loading Quality Risk Model...")
    if TABNET_AVAILABLE:
        try:
            q_zip_path = os.path.join(MODELS_DIR, "tabnet_quality_model.zip")
            if os.path.exists(q_zip_path):
                q_model = TabNetClassifier()
                q_model.load_model(q_zip_path)
                
                le_path = os.path.join(MODELS_DIR, "le_prio_quality.pkl")
                le_p = joblib.load(le_path) if os.path.exists(le_path) else None
                
                loaded_assets["quality"] = {"model": q_model, "le_prio": le_p}
                print("   ✅ Quality Risk Model: LOADED (TabNet)")
                model_status["quality"] = "✅ LOADED"
            else:
                print(f"   ❌ Quality Model: FILE NOT FOUND at {q_zip_path}")
                model_status["quality"] = "❌ FILE NOT FOUND"
        except Exception as e:
            print(f"   ❌ Quality Model: LOAD ERROR - {e}")
            print(f"   📋 Traceback:\n{traceback.format_exc()}")
            model_status["quality"] = f"❌ ERROR: {str(e)[:50]}"
    else:
        print("   ❌ Quality Model: TabNet library not available")
        model_status["quality"] = "❌ TABNET NOT INSTALLED"

    # Summary
    print("\n" + "="*60)
    print("📊 MODEL LOADING SUMMARY")
    print("="*60)
    for model_name, status in model_status.items():
        print(f"  {model_name.upper():15} : {status}")
    
    all_loaded = all("✅" in status for status in model_status.values())
    if all_loaded:
        print("\n✅ All 4 models loaded successfully!")
    else:
        failed = [name for name, status in model_status.items() if "❌" in status]
        print(f"\n⚠️  Warning: {len(failed)} model(s) failed to load: {', '.join(failed)}")
        print("   Some predictions may use fallback values.")
    
    print("="*60 + "\n")

# --- 5. PREDICTION LOGIC ---

def safe_transform(encoder, value, default=0):
    try: return encoder.transform([value])[0]
    except: return default

def predict_effort(data: TicketData):
    assets = loaded_assets["effort"]
    if not assets:
        print("   ⚠️  Effort Model: Using fallback (model not loaded)")
        return float(data.story_points * 8), 0.0
    try:
        txt = f"{data.title} {data.description}"
        txt_vec = assets["tfidf"].transform([txt]).toarray()
        t_c = safe_transform(assets["le_type"], data.issue_type)
        pressure = 1.0 / max(0.5, data.days_remaining)
        meta = np.array([[data.sprint_load_7d, data.team_velocity_14d, pressure, data.total_links, t_c]])
        vec = np.hstack([meta, txt_vec])
        est = float(assets["median"].predict(vec)[0])
        return float(est * 8.0), 1.0
    except Exception as e:
        print(f"   ❌ Effort Model: Prediction error - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        return float(data.story_points * 8), 0.0

def predict_productivity(data: TicketData):
    assets = loaded_assets["productivity"]
    if not assets:
        print("   ⚠️  Productivity Model: Using fallback (model not loaded)")
        return 0.0
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
    except Exception as e:
        print(f"   ❌ Productivity Model: Prediction error - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        return 0.0

def predict_schedule(data: TicketData):
    assets = loaded_assets["schedule"]
    if not assets:
        print("   ⚠️  Schedule Model: Using fallback (model not loaded)")
        return "Medium Risk", 0.5
    try:
        ld = data.total_links / (data.story_points + 1)
        cd = data.total_comments / (data.story_points + 1)
        pr = data.story_points / max(0.1, data.days_remaining)
        t_c = safe_transform(assets["le_type"], data.issue_type)
        p_c = safe_transform(assets["le_prio"], data.priority)
        raw_vec = np.array([[data.story_points, data.total_links, data.total_comments, data.author_workload_14d, ld, cd, pr, t_c, p_c]])
        if assets["imputer"]: final_vec = assets["imputer"].transform(raw_vec)
        else: final_vec = raw_vec
        probs = assets["model"].predict_proba(final_vec)[0]
        idx = np.argmax(probs)
        labels = ["Critical Risk", "High Risk", "Low Risk", "Medium Risk"] 
        return labels[idx] if idx < len(labels) else "Medium Risk", float(probs[idx])
    except Exception as e:
        print(f"   ❌ Schedule Model: Prediction error - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        return "Medium Risk", 0.5

def predict_quality(data: TicketData):
    """
    Quality Prediction
    """
    assets = loaded_assets["quality"]
    
    if not assets:
        print("   ⚠️  Quality Model: Using fallback (model not loaded)")
        return "Low", 0.0
    
    try:
        # Feature Prep
        if assets["le_prio"]:
            p_c = safe_transform(assets["le_prio"], data.priority, default=2)
        else:
            prio_map = {'Highest': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Lowest': 4}
            p_c = prio_map.get(data.priority, 2)

        comp = data.story_points * (data.total_links + 1)

        # Construct Vector (6 Features)
        vec = np.array([[
            float(data.story_points),
            float(data.total_links),
            float(data.total_comments),
            float(data.author_workload_14d),
            float(comp),
            float(p_c)
        ]])
        
        # Predict
        probs = assets["model"].predict_proba(vec)[0]
        prob_defect = float(probs[1])
        lbl = "High" if prob_defect > 0.5 else "Low"
        return lbl, prob_defect
        
    except Exception as e:
        print(f"   ❌ Quality Model: Prediction error - {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        return "Low", 0.0

@app.post("/analyze/mid-sprint-impact", response_model=AnalysisResponse)
def analyze_impact(data: TicketData):
    print(f"\n📨 Analyzing: {data.title}")
    print(f"   Type: {data.issue_type} | Priority: {data.priority} | SP: {data.story_points}")
    
    try:
        eff_h, _ = predict_effort(data)
        prod_d = predict_productivity(data)
        sch_lbl, sch_prob = predict_schedule(data)
        qual_lbl, qual_prob = predict_quality(data)
        
        analysis_results = {
            "predicted_hours": eff_h,
            "schedule_risk_probability": sch_prob,
            "productivity_impact": prod_d,
            "quality_risk_probability": qual_prob
        }
        
        # Convert TicketData to dict for recommendation engine
        item_data = {
            "title": data.title,
            "description": data.description,
            "story_points": data.story_points,
            "priority": data.priority,
            "issue_type": data.issue_type
        }
        
        # Note: Recommendations are generated but not returned in this endpoint
        # Use the /recommendations/generate endpoint for full recommendation details
        recs = get_recommendations(analysis_results, item_data)
        
        print(f"   ✅ Results -> Effort: {eff_h:.1f}h | Sched: {sch_lbl} ({sch_prob:.0%}) | Prod: {prod_d:.1f}d | Qual: {qual_lbl} ({qual_prob:.0%})")
        
        return AnalysisResponse(
            predicted_hours=round(eff_h, 1),
            schedule_risk_probability=round(sch_prob, 2),
            schedule_risk_label=sch_lbl,
            productivity_impact=round(prod_d, 1),
            quality_risk_probability=round(qual_prob, 2),
            quality_risk_label=qual_lbl,
            model_evidence={"schedule": loaded_assets["schedule"] is not None}
        )
    except Exception as e:
        print(f"   ❌ Analysis Error: {e}")
        print(f"   📋 Traceback:\n{traceback.format_exc()}")
        raise

@app.post("/recommendations/generate")
def generate_recommendations(request: RecommendationRequest):
    """
    Generate actionable recommendations based on impact analysis results
    """
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
        # Fallback response
        return {
            "decision": "requires_manual_review",
            "primary_recommendation": {
                "id": "FALLBACK",
                "title": "Manual Review Required",
                "description": "Unable to generate automated recommendations. Please review with team lead.",
                "severity": "medium"
            },
            "alternative_options": [],
            "risk_summary": {
                "level": "UNKNOWN",
                "summary": "Recommendation engine encountered an error."
            }
        }

@app.post("/assess-sprint-interruption")
def assess_sprint_interruption_endpoint(request: Dict[str, Any]):
    """
    Assess sprint interruption using 3-Engine Architecture.
    
    Request body:
    {
        "new_ticket": {
            "id": str,
            "title": str,
            "story_points": float,
            "priority": str,
            "business_value": float (optional),
            "urgency": float (optional),
            "risk_penalty": float (optional),
            "description": str (optional),
            "ml_analysis": {"productivity_impact": float} (optional)
        },
        "active_sprint": {
            "id": str,
            "status": str,
            "metrics": {"committedSP": float}
        },
        "sprint_items": [
            {
                "id": str,
                "title": str,
                "story_points": float,
                "status": str,
                "priority": str,
                "business_value": float (optional),
                "urgency": float (optional),
                "risk_penalty": float (optional)
            }
        ]
    }
    """
    try:
        from three_engine_architecture import assess_sprint_interruption
        
        new_ticket = request.get("new_ticket", {})
        active_sprint = request.get("active_sprint", {})
        sprint_items = request.get("sprint_items", [])
        
        # Set defaults for business value if not provided
        if "business_value" not in new_ticket:
            priority_map = {"Highest": 90, "High": 70, "Medium": 50, "Low": 30, "Lowest": 10}
            new_ticket["business_value"] = priority_map.get(new_ticket.get("priority", "Medium"), 50)
            new_ticket["urgency"] = priority_map.get(new_ticket.get("priority", "Medium"), 50)
            new_ticket["risk_penalty"] = 0.0
        
        # Set defaults for sprint items
        for item in sprint_items:
            if "business_value" not in item:
                priority_map = {"Highest": 90, "High": 70, "Medium": 50, "Low": 30, "Lowest": 10}
                item["business_value"] = priority_map.get(item.get("priority", "Medium"), 50)
                item["urgency"] = priority_map.get(item.get("priority", "Medium"), 50)
                item["risk_penalty"] = 0.0
        
        result = assess_sprint_interruption(new_ticket, active_sprint, sprint_items)
        
        print(f"   🔍 Sprint Interruption Assessment: {result['action']}")
        print(f"   📊 Reasoning: {result['reasoning']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Sprint Interruption Assessment Error: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "action": "DEFER",
            "target_to_remove": None,
            "reasoning": f"Error during assessment: {str(e)}",
            "constraints_checked": ["Error"],
            "error": str(e)
        }

@app.get("/health")
def health_check():
    """Check service health and model status"""
    return {
        "status": "online",
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
