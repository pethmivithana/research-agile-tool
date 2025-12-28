import os
import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from pytorch_tabnet.tab_model import TabNetRegressor, TabNetClassifier

# ==========================================
# 1. SETUP & CONFIG
# ==========================================
app = FastAPI(title="Agile AI Engine")

# Allow your Frontend (React/Node) to talk to this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("⏳ Loading SBERT (Text Processor)...")
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

# ==========================================
# 2. DEFINE MODEL ARCHITECTURES
# ==========================================

# This Class MUST match the architecture used during training
class ProductivityMLP(nn.Module):
    def __init__(self, input_dim=10):
        super(ProductivityMLP, self).__init__()
        self.layer1 = nn.Linear(input_dim, 128) # Updated to match your training snippet
        self.bn1 = nn.BatchNorm1d(128)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.3)
        self.layer2 = nn.Linear(128, 64)
        self.bn2 = nn.BatchNorm1d(64)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(0.2)
        self.layer3 = nn.Linear(64, 32)
        self.relu3 = nn.ReLU()
        self.output = nn.Linear(32, 1)

    def forward(self, x):
        x = self.dropout1(self.relu1(self.bn1(self.layer1(x))))
        x = self.dropout2(self.relu2(self.bn2(self.layer2(x))))
        x = self.relu3(self.layer3(x))
        return self.output(x)

# ==========================================
# 3. LOAD MODELS
# ==========================================
MODELS = {}

def load_models():
    print("⏳ Loading AI Models...")
    try:
        # 1. Effort Model (TabNet)
        if os.path.exists("models/tabnet_effort.zip"):
            clf_effort = TabNetRegressor()
            clf_effort.load_model("models/tabnet_effort.zip")
            MODELS['effort'] = clf_effort
            print("✅ Effort Model Loaded")
        else:
            print("❌ Missing: models/tabnet_effort.zip")

        # 2. Quality Risk Model (TabNet)
        if os.path.exists("models/tabnet_quality_risk.zip"):
            clf_quality = TabNetClassifier()
            clf_quality.load_model("models/tabnet_quality_risk.zip")
            MODELS['quality'] = clf_quality
            print("✅ Quality Model Loaded")
        else:
            print("❌ Missing: models/tabnet_quality_risk.zip")

        # 3. Productivity Model (PyTorch MLP)
        if os.path.exists("models/mlp_productivity.pth"):
            # We assume input_dim=13 based on your dataset columns
            model_prod = ProductivityMLP(input_dim=13) 
            state_dict = torch.load("models/mlp_productivity.pth", map_location=torch.device('cpu'))
            
            # Flexible loading in case layer names differ slightly
            try:
                model_prod.load_state_dict(state_dict)
            except:
                # Fallback if architecture slightly mismatches, load strict=False
                model_prod.load_state_dict(state_dict, strict=False)
                
            model_prod.eval()
            MODELS['productivity'] = model_prod
            print("✅ Productivity Model Loaded")
        else:
            print("❌ Missing: models/mlp_productivity.pth")

    except Exception as e:
        print(f"❌ Error loading models: {e}")

load_models()

# ==========================================
# 4. DATA SCHEMAS (Inputs from Frontend)
# ==========================================

class BacklogItem(BaseModel):
    title: str
    description: str
    story_points: float
    priority: str  # e.g., "High", "Medium"

class SprintAction(BaseModel):
    action: str  # "add" or "remove"
    current_sprint_load: float
    team_velocity: float
    ticket: BacklogItem

# ==========================================
# 5. FEATURE ENGINEERING (The Brains)
# ==========================================
def preprocess_features(item: BacklogItem, input_size=13):
    """Convert text & numbers into the vector the models expect"""
    
    # 1. Text Stats
    desc_len = len(item.description)
    title_len = len(item.title)
    
    # 2. Priority to Number
    priority_map = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1, "Minor": 0}
    prio_num = priority_map.get(item.priority, 2)

    # 3. Text Embeddings (SBERT) - Get first 10 dims
    embedding = sbert_model.encode([item.description])[0][:10]
    
    # 4. Construct Array: [Points, Priority, DescLen, TitleLen, ...Embedding]
    # This must match training data structure
    features_list = [item.story_points, prio_num, desc_len, title_len] + list(embedding)
    
    # Pad or Trim to match model input size
    if len(features_list) < input_size:
        features_list += [0] * (input_size - len(features_list))
    else:
        features_list = features_list[:input_size]
        
    return np.array([features_list], dtype=np.float32)

# ==========================================
# 6. API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {"status": "AI Service Online", "models_loaded": list(MODELS.keys())}

# --- ENDPOINT 1: BACKLOG ANALYSIS (Effort & Quality) ---
@app.post("/analyze/ticket")
def analyze_ticket(item: BacklogItem):
    """Calculates Effort and Quality Risk for a new ticket."""
    
    if 'effort' not in MODELS or 'quality' not in MODELS:
        raise HTTPException(status_code=503, detail="Models not fully loaded")

    features = preprocess_features(item, input_size=13)

    # Predict Effort (Hours)
    pred_effort = MODELS['effort'].predict(features)[0][0]
    
    # Predict Quality Risk (Probability of Bug)
    quality_probs = MODELS['quality'].predict_proba(features)
    risk_score = quality_probs[0][1] # Probability of Class 1 (Risk)

    return {
        "effort_hours": round(float(pred_effort), 1),
        "quality_risk": {
            "score": round(float(risk_score) * 100, 1),
            "label": "High" if risk_score > 0.6 else "Low"
        }
    }

# --- ENDPOINT 2: SPRINT IMPACT (Productivity) ---
@app.post("/analyze/sprint_load")
def analyze_sprint(action: SprintAction):
    """Calculates Impact on Velocity when adding items."""
    
    if 'productivity' not in MODELS:
        raise HTTPException(status_code=503, detail="Productivity model not loaded")

    # Productivity Logic
    # We create a feature vector representing the "Sprint State"
    # [CurrentLoad, NewPoints, Velocity, Ratio...]
    ratio = (action.current_sprint_load + action.ticket.story_points) / (action.team_velocity + 1e-5)
    
    # Create simple input vector (Pad with zeros to match MLP size)
    input_data = [
        action.current_sprint_load, 
        action.ticket.story_points, 
        action.team_velocity,
        ratio
    ] + [0] * 9 # Padding to reach 13 inputs
    
    tensor_in = torch.tensor([input_data], dtype=torch.float32)

    with torch.no_grad():
        impact = MODELS['productivity'](tensor_in).item()

    # If adding load, impact is usually negative (slowdown)
    # If removing load, impact is positive (speedup)
    final_impact = impact if action.action == "add" else abs(impact)

    return {
        "productivity_impact": round(final_impact * 100, 1), # Percentage
        "verdict": "Overload" if ratio > 1.1 else "Safe"
    }