# backend/train_model.py

"""Train a supervised ML model for collision risk prediction.

This script generates a synthetic-but-physically-plausible dataset of orbital
encounters and labels it with a heuristic collision probability. A scikit-learn
regressor is trained to approximate that probability and saved to backend/models/.

Usage:
  python train_model.py

Options via env vars:
  N_SAMPLES        (default: 250000)
  RANDOM_SEED      (default: 42)
  OUT_PATH         (default: backend/models/collision_risk_model.joblib)
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from ai.ml_model import FEATURE_NAMES, build_features, features_to_row


def _clamp01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def generate_synthetic_dataset(n: int, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Generate X, y where y is heuristic collision probability."""
    rng = np.random.default_rng(seed)

    # Closest approach distance (km): log-uniform heavy on small distances
    d_km = np.exp(rng.uniform(np.log(0.01), np.log(80.0), size=n)).astype(np.float32)

    # Relative velocity (km/s): typical LEO 0..15 km/s, skew toward 7-12
    v_kms = np.clip(rng.normal(loc=9.0, scale=2.0, size=n), 0.0, 15.0).astype(np.float32)

    # Time to closest approach (min): 0..240, skew toward nearer times
    t_min = (rng.exponential(scale=35.0, size=n)).astype(np.float32)
    t_min = np.clip(t_min, 0.0, 240.0)

    # Altitude difference (km): 0..250, skew toward smaller differences
    alt_diff = (rng.exponential(scale=18.0, size=n)).astype(np.float32)
    alt_diff = np.clip(alt_diff, 0.0, 250.0)

    # --- Heuristic label (0..1) ---
    # Distance dominates strongly.
    # Typical collision cross-section is tiny; we model *risk score* as probability-like.
    dist_score = np.exp(-d_km / 0.9)  # ~1 at 0, ~0.33 at 1km, ~0.04 at 3km
    speed_score = _clamp01((v_kms - 1.0) / 14.0)
    time_score = _clamp01(1.0 - (t_min / 60.0))
    alt_penalty = _clamp01(1.0 - (alt_diff / 50.0))

    base = 0.78 * dist_score + 0.14 * speed_score + 0.08 * time_score
    base = base * (0.50 + 0.50 * alt_penalty)

    # Non-linear boosts for extreme close & soon situations
    boost = np.zeros(n, dtype=np.float32)
    boost += (d_km < 0.5).astype(np.float32) * 0.12
    boost += (d_km < 0.2).astype(np.float32) * 0.18
    boost += (v_kms > 12.0).astype(np.float32) * 0.06
    boost += (t_min < 5.0).astype(np.float32) * 0.06

    y = _clamp01(base + boost)

    # Feature matrix with engineered terms (must match ai/ml_model.py)
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
    n = int(os.environ.get("N_SAMPLES", "250000"))
    seed = int(os.environ.get("RANDOM_SEED", "42"))

    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.environ.get("OUT_PATH", os.path.join(here, "models", "collision_risk_model.joblib"))
    out_dir = os.path.dirname(out_path)
    os.makedirs(out_dir, exist_ok=True)

    print(f"[train] generating dataset: n={n}, seed={seed}")
    X, y = generate_synthetic_dataset(n=n, seed=seed)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=seed)

    # GradientBoostingRegressor: strong baseline, fast, no heavy deps
    model = GradientBoostingRegressor(
        random_state=seed,
        n_estimators=400,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.8,
    )

    print("[train] fitting model...")
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    pred = np.clip(pred, 0.0, 1.0)

    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    r2 = float(r2_score(y_test, pred))

    meta = {
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "n_samples": n,
        "seed": seed,
        "feature_names": FEATURE_NAMES,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
        "sklearn": "GradientBoostingRegressor",
    }

    payload = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "metadata": meta,
    }

    joblib.dump(payload, out_path)
    with open(os.path.join(out_dir, "collision_risk_model.metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[train] saved model to: {out_path}")
    print(f"[train] metrics: MAE={mae:.4f} RMSE={rmse:.4f} R2={r2:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
