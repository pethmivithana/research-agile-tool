import os
import joblib
import numpy as np
import warnings

# Suppress Warnings & Windows Errors
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
warnings.filterwarnings("ignore")

try:
    from pytorch_tabnet.tab_model import TabNetClassifier
except ImportError:
    print("❌ PyTorch/TabNet not installed!")
    exit()

def test_model():
    print("\n🔍 DEBUGGING QUALITY MODEL...")
    
    # 1. Load Artifacts
    try:
        model = TabNetClassifier()
        model.load_model(os.path.join("models", "tabnet_quality_model.zip"))
        le_prio = joblib.load(os.path.join("models", "le_prio_quality.pkl"))
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Load Failed: {e}")
        return

    # 2. Define Scenario: "Add Face Recognition"
    # Try increasing workload to 150 to see if risk jumps up
    scenarios = [
        {"load": 7.0, "desc": "Current Input (Ticket Count)"},
        {"load": 150.0, "desc": "Training Scale (Event Count)"}
    ]

    print(f"\n{'Scenario':<30} | {'Workload':<10} | {'Probability':<15} | {'Label'}")
    print("-" * 75)

    for sc in scenarios:
        # Construct Feature Vector: 
        # [StoryPoints, Links, Comments, Workload, Complexity(SP*(Links+1)), PrioCode]
        
        # Priority "Critical" -> Index 1 (based on your artifact)
        p_code = 1.0 
        
        sp = 5.0
        links = 5.0
        comments = 8.0
        workload = sc["load"]
        comp = sp * (links + 1) # 30.0

        vec = np.array([[sp, links, comments, workload, comp, p_code]])

        # Predict
        probs = model.predict_proba(vec)[0]
        risk_prob = probs[1] # Probability of Class 1 (Defect)
        label = "High" if risk_prob > 0.5 else "Low"
        
        print(f"{sc['desc']:<30} | {workload:<10} | {risk_prob:.4f}          | {label}")

if __name__ == "__main__":
    test_model()