# backend/train_model.py

"""Train a supervised ML model for collision risk prediction.

This script manages the ML pipeline. It can run on a generated synthetic dataset,
or it can ingest a real-world CSV dataset via explicit feature mapping.

Usage:
  python train_model.py

Options via env vars:
  REAL_DATA_PATH   (If set, reads CSV instead of generating synthetic)
  TARGET_COL       (Target column name in CSV. Default: 'collision_risk')
  MAP_DISTANCE     (CSV column mapped to closest_approach_km)
  MAP_VELOCITY     (CSV column mapped to relative_velocity_kms)
  MAP_TCA          (CSV column mapped to time_to_closest_min)
  MAP_ALT_DIFF     (CSV column mapped to altitude_difference_km)
  N_SAMPLES        (Only used for synthetic mode. Default: 250000)
  RANDOM_SEED      (default: 42)
  OUT_PATH         (default: backend/models/collision_risk_model.joblib)
"""

from __future__ import annotations

import csv
import json
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai.ml_model import FEATURE_NAMES, build_features, features_to_row


def _clamp01(x: np.ndarray | float) -> np.ndarray | float:
    return np.clip(x, 0.0, 1.0)


def load_real_dataset(csv_path: str, mapping: Dict[str, str], target_col: str) -> Tuple[np.ndarray, np.ndarray, int]:
    print(f"[train] Loading real data from {csv_path}")
    
    df_rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV is empty or missing headers.")
            
        columns = reader.fieldnames
        missing_feats = [col for col in mapping.values() if col not in columns]
        if missing_feats:
            raise ValueError(f"Missing mapped feature columns in CSV: {missing_feats}")
        if target_col not in columns:
            raise ValueError(f"Missing target column in CSV '{target_col}'")
            
        for row in reader:
            df_rows.append(row)
            
    n = len(df_rows)
    if n == 0:
        raise ValueError("CSV contains no data rows.")
        
    X = np.zeros((n, len(FEATURE_NAMES)), dtype=np.float32)
    y_list = []

    required_keys = ["closest_approach_km", "relative_velocity_kms", "time_to_closest_min", "altitude_difference_km"]
    missing_keys = [k for k in required_keys if k not in mapping]
    if missing_keys:
        raise ValueError(f"Feature mapping must include: {missing_keys}")

    col_d = mapping["closest_approach_km"]
    col_v = mapping["relative_velocity_kms"]
    col_t = mapping["time_to_closest_min"]
    col_a = mapping["altitude_difference_km"]

    print("[train] Extracting engineering features...")
    for i, row in enumerate(df_rows):
        feats = build_features(
            closest_approach_km=float(row[col_d]),
            relative_velocity_kms=float(row[col_v]),
            time_to_closest_min=float(row[col_t]),
            altitude_difference_km=float(row[col_a]),
        )
        X[i, :] = features_to_row(feats)[0]
        y_list.append(float(row[target_col]))

    y = _clamp01(np.array(y_list, dtype=np.float32))
    return X, y, n


def generate_synthetic_dataset(n: int, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Generate X, y where y is heuristic collision probability."""
    rng = np.random.default_rng(seed)

    d_km = np.exp(rng.uniform(np.log(0.01), np.log(80.0), size=n)).astype(np.float32)
    v_kms = np.clip(rng.normal(loc=9.0, scale=2.0, size=n), 0.0, 15.0).astype(np.float32)
    t_min = (rng.exponential(scale=35.0, size=n)).astype(np.float32)
    t_min = np.clip(t_min, 0.0, 240.0)
    alt_diff = (rng.exponential(scale=18.0, size=n)).astype(np.float32)
    alt_diff = np.clip(alt_diff, 0.0, 250.0)

    dist_score = np.exp(-d_km / 0.9)
    speed_score = _clamp01((v_kms - 1.0) / 14.0)
    time_score = _clamp01(1.0 - (t_min / 60.0))
    alt_penalty = _clamp01(1.0 - (alt_diff / 50.0))

    base = 0.78 * dist_score + 0.14 * speed_score + 0.08 * time_score
    base = base * (0.50 + 0.50 * alt_penalty)

    boost = np.zeros(n, dtype=np.float32)
    boost += (d_km < 0.5).astype(np.float32) * 0.12
    boost += (d_km < 0.2).astype(np.float32) * 0.18
    boost += (v_kms > 12.0).astype(np.float32) * 0.06
    boost += (t_min < 5.0).astype(np.float32) * 0.06

    y = _clamp01(base + boost)

    X = np.zeros((n, len(FEATURE_NAMES)), dtype=np.float32)
    for i in range(n):
        feats: Dict[str, float] = build_features(
            closest_approach_km=float(d_km[i]),
            relative_velocity_kms=float(v_kms[i]),
            time_to_closest_min=float(t_min[i]),
            altitude_difference_km=float(alt_diff[i]),
        )
        X[i, :] = features_to_row(feats)[0]

    return X, y.astype(np.float32)


def main() -> int:
    seed = int(os.environ.get("RANDOM_SEED", "42"))
    real_data_path = os.environ.get("REAL_DATA_PATH")

    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.environ.get("OUT_PATH", os.path.join(here, "models", "collision_risk_model.joblib"))
    out_dir = os.path.dirname(out_path)
    os.makedirs(out_dir, exist_ok=True)

    metadata_provenance = "synthetic"
    target_col = os.environ.get("TARGET_COL", "collision_risk")
    
    if real_data_path:
        # Load from real CSV data
        mapping = {
            "closest_approach_km": os.environ.get("MAP_DISTANCE", "closest_approach_km"),
            "relative_velocity_kms": os.environ.get("MAP_VELOCITY", "relative_velocity_kms"),
            "time_to_closest_min": os.environ.get("MAP_TCA", "time_to_closest_min"),
            "altitude_difference_km": os.environ.get("MAP_ALT_DIFF", "altitude_difference_km"),
        }
        X, y, n_samples = load_real_dataset(real_data_path, mapping, target_col)
        metadata_provenance = f"real_data ({os.path.basename(real_data_path)})"
    else:
        # Fallback to synthetic logic
        n_samples = int(os.environ.get("N_SAMPLES", "250000"))
        print(f"[train] Generating synthetic dataset: n={n_samples}, seed={seed}")
        X, y = generate_synthetic_dataset(n=n_samples, seed=seed)
        mapping = "synthetic (built-in)"

    # Train/Validation/Test Split (70-15-15)
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=0.15, random_state=seed)
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size=0.15/0.85, random_state=seed)

    # Model comparison
    candidate_models = {
        "GradientBoostingRegressor": GradientBoostingRegressor(
            random_state=seed, n_estimators=400, learning_rate=0.05, max_depth=3, subsample=0.8
        ),
        "RandomForestRegressor": RandomForestRegressor(
            random_state=seed, n_estimators=100, max_depth=10, n_jobs=-1
        )
    }

    best_r2 = -float('inf')
    best_name = None
    best_model = None

    for name, model in candidate_models.items():
        print(f"[train] Fitting candidate model: {name}...")
        model.fit(X_train, y_train)
        
        val_pred = _clamp01(model.predict(X_val))
        val_r2 = float(r2_score(y_val, val_pred))
        
        print(f"  --> {name} Validation R2: {val_r2:.4f}")
        if val_r2 > best_r2:
            best_r2 = val_r2
            best_name = name
            best_model = model

    print(f"\n[train] Selected Best Model: {best_name} (Val R2: {best_r2:.4f})")
    
    # Evaluate best model on hold-out Test set
    test_pred = _clamp01(best_model.predict(X_test))
    test_mae = float(mean_absolute_error(y_test, test_pred))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, test_pred)))
    test_r2 = float(r2_score(y_test, test_pred))
    
    best_metrics = {
        "test_mae": test_mae,
        "test_rmse": test_rmse,
        "test_r2": test_r2,
        "val_r2": best_r2
    }

    meta = {
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "n_samples": n_samples,
        "seed": seed,
        "provenance": metadata_provenance,
        "feature_names": FEATURE_NAMES,
        "feature_mapping_used": mapping,
        "target_col": target_col,
        "metrics": best_metrics,
        "sklearn_model": best_name,
    }

    payload = {
        "model": best_model,
        "feature_names": FEATURE_NAMES,
        "metadata": meta,
    }

    joblib.dump(payload, out_path)
    with open(os.path.join(out_dir, "collision_risk_model.metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[train] Saved model to: {out_path}")
    print(f"[train] Final Test Metrics: MAE={test_mae:.4f} RMSE={test_rmse:.4f} R2={test_r2:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

