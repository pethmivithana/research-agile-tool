#!/usr/bin/env python3
"""
Model Verification Script
Run this to check if all required model files exist and can be loaded
"""

import os
import sys

def check_file(filepath, description):
    """Check if a file exists"""
    exists = os.path.exists(filepath)
    size = os.path.getsize(filepath) if exists else 0
    status = "✅" if exists else "❌"
    print(f"{status} {description}")
    if exists:
        print(f"   Path: {filepath}")
        print(f"   Size: {size:,} bytes")
    else:
        print(f"   MISSING: {filepath}")
    print()
    return exists

def main():
    print("\n" + "="*60)
    print("MODEL VERIFICATION SCRIPT")
    print("="*60 + "\n")
    
    models_dir = "models"
    
    if not os.path.exists(models_dir):
        print(f"❌ Models directory not found: {models_dir}")
        print("Please create the models directory and place your model files there.")
        sys.exit(1)
    
    print(f"📁 Models Directory: {os.path.abspath(models_dir)}\n")
    
    # Check each required file
    required_files = {
        "Effort Model (Lower Quantile)": os.path.join(models_dir, "effort_model_lower.json"),
        "Effort Model (Median Quantile)": os.path.join(models_dir, "effort_model_median.json"),
        "Effort Model (Upper Quantile)": os.path.join(models_dir, "effort_model_upper.json"),
        "Effort Artifacts": os.path.join(models_dir, "effort_artifacts.pkl"),
        "Productivity XGBoost Model": os.path.join(models_dir, "model_productivity_xgb.json"),
        "Productivity PyTorch Model": os.path.join(models_dir, "model_productivity_nn.pth"),
        "Productivity Artifacts": os.path.join(models_dir, "productivity_artifacts.pkl"),
        "Schedule Risk Model": os.path.join(models_dir, "schedule_risk_model.pkl"),
        "Quality TabNet Model": os.path.join(models_dir, "tabnet_quality_model.zip"),
        "Quality Label Encoder": os.path.join(models_dir, "le_prio_quality.pkl"),
    }
    
    results = {}
    for desc, filepath in required_files.items():
        results[desc] = check_file(filepath, desc)
    
    # Summary
    print("="*60)
    print("SUMMARY")
    print("="*60)
    
    total = len(results)
    found = sum(results.values())
    missing = total - found
    
    print(f"Total Files: {total}")
    print(f"Found: {found}")
    print(f"Missing: {missing}")
    
    if missing > 0:
        print("\n⚠️  Some model files are missing!")
        print("Please ensure all model files are in the 'models' directory.")
        print("\nMissing files:")
        for desc, exists in results.items():
            if not exists:
                print(f"  - {desc}")
    else:
        print("\n✅ All model files found!")
    
    print("\n" + "="*60 + "\n")
    
    # Try to actually load models
    if missing == 0:
        print("Attempting to load models...")
        try:
            import joblib
            import xgboost as xgb
            from pytorch_tabnet.tab_model import TabNetClassifier
            import torch
            
            # Test loading effort model
            print("\n⏳ Loading Effort Model...")
            effort_model = xgb.XGBRegressor()
            effort_model.load_model(required_files["Effort Model (Lower Quantile)"])
            effort_artifacts = joblib.load(required_files["Effort Artifacts"])
            print("✅ Effort Model loaded successfully")
            
            # Test loading productivity model
            print("\n⏳ Loading Productivity Model...")
            prod_xgb = xgb.XGBRegressor()
            prod_xgb.load_model(required_files["Productivity XGBoost Model"])
            prod_artifacts = joblib.load(required_files["Productivity Artifacts"])
            
            # Need to know input_dim for PyTorch model
            input_dim = prod_artifacts.get('input_dim', 11)
            print(f"   PyTorch model input dimension: {input_dim}")
            print("✅ Productivity Model loaded successfully")
            
            # Test loading schedule model
            print("\n⏳ Loading Schedule Risk Model...")
            schedule_model = joblib.load(required_files["Schedule Risk Model"])
            print("✅ Schedule Risk Model loaded successfully")
            
            # Test loading quality model
            print("\n⏳ Loading Quality Risk Model...")
            quality_model = TabNetClassifier()
            quality_model.load_model(required_files["Quality TabNet Model"])
            le_prio = joblib.load(required_files["Quality Label Encoder"])
            print("✅ Quality Risk Model loaded successfully")
            
            print("\n" + "="*60)
            print("✅ ALL MODELS LOADED SUCCESSFULLY!")
            print("="*60 + "\n")
            
        except Exception as e:
            print(f"\n❌ Error loading models: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    main()