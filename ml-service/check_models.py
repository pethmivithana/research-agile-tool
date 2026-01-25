"""
Check which model files exist and their structure
"""

import os
import joblib
import json

MODEL_DIR = "./models"

print("\n" + "="*70)
print("🔍 CHECKING MODEL FILES")
print("="*70)

files_to_check = [
    # Effort Model
    ("effort_artifacts.pkl", "Effort Model Package"),
    ("tfidf_vectorizer.pkl", "TF-IDF Vectorizer"),
    ("effort_model_lower.json", "Effort Lower Bound"),
    ("effort_model_median.json", "Effort Median"),
    ("effort_model_upper.json", "Effort Upper Bound"),
    
    # Schedule Model
    ("schedule_risk_model.pkl", "Schedule Risk Model"),
    ("imputer_schedule.pkl", "Schedule Imputer"),
    
    # Productivity Model
    ("model_productivity_xgb.json", "Productivity XGBoost"),
    ("model_productivity_nn.pth", "Productivity Neural Net"),
    ("productivity_scaler.pkl", "Productivity Scaler"),
    ("productivity_artifacts.pkl", "Productivity Package"),
    
    # Quality Model
    ("risk_artifacts.pkl", "Quality Risk Model"),
    ("tabnet_quality_model.zip", "TabNet Quality (Zipped)"),
    
    # Encoders
    ("le_type.pkl", "Type Label Encoder"),
    ("le_prio_quality.pkl", "Priority Label Encoder"),
]

print("\n📁 FILE STATUS:")
for filename, description in files_to_check:
    filepath = os.path.join(MODEL_DIR, filename)
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    
    print(f"{status} {description:30} ({filename})")
    
    # Try to inspect .pkl files
    if exists and filename.endswith('.pkl'):
        try:
            data = joblib.load(filepath)
            if isinstance(data, dict):
                print(f"   📦 Dict with keys: {list(data.keys())}")
            else:
                print(f"   📦 Type: {type(data).__name__}")
        except Exception as e:
            print(f"   ⚠️  Could not inspect: {str(e)}")

print("\n" + "="*70)
print("💡 RECOMMENDATIONS:")
print("="*70)

# Check critical files
critical_missing = []

if not os.path.exists(os.path.join(MODEL_DIR, "effort_artifacts.pkl")):
    critical_missing.append("effort_artifacts.pkl")
    
if not os.path.exists(os.path.join(MODEL_DIR, "schedule_risk_model.pkl")):
    critical_missing.append("schedule_risk_model.pkl")
    
if not os.path.exists(os.path.join(MODEL_DIR, "model_productivity_xgb.json")):
    critical_missing.append("model_productivity_xgb.json")

if critical_missing:
    print("\n❌ CRITICAL FILES MISSING:")
    for f in critical_missing:
        print(f"   • {f}")
    print("\nYou need to export these from your Jupyter notebooks.")
else:
    print("\n✅ All critical model files found!")

# Check if vectorizer is in effort_artifacts
if os.path.exists(os.path.join(MODEL_DIR, "effort_artifacts.pkl")):
    try:
        effort_data = joblib.load(os.path.join(MODEL_DIR, "effort_artifacts.pkl"))
        if isinstance(effort_data, dict):
            if "vectorizer" in effort_data:
                print("\n✅ TF-IDF vectorizer found in effort_artifacts.pkl")
            else:
                print("\n⚠️  TF-IDF vectorizer NOT in effort_artifacts.pkl")
                print("   You need a separate tfidf_vectorizer.pkl file")
    except:
        pass

print("\n" + "="*70)