# backend/ai/ml_model.py

"""ML collision risk model loader + inference helpers.

Design goals:
  - Zero breaking changes: model is optional; inference gracefully falls back.
  - No external services/APIs.
  - Fast inference (single sklearn model).
  - Stable feature contract shared with train_model.py.
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np


EARTH_RADIUS_KM = 6371.0


def _clamp01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))


def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    if b == 0.0:
        return default
    return a / b


def build_features(
    *,
    closest_approach_km: float,
    relative_velocity_kms: float,
    time_to_closest_min: float,
    altitude_difference_km: float,
) -> Dict[str, float]:
    """Feature engineering used both in training and inference."""
    d = float(max(0.0, closest_approach_km))
    v = float(max(0.0, relative_velocity_kms))
    t = float(max(0.0, time_to_closest_min))
    alt = float(max(0.0, altitude_difference_km))

    inv_distance = _safe_div(1.0, d + 1e-3)  # km^-1
    d_over_v = _safe_div(d, v + 1e-3)       # (km)/(km/s)=s
    # urgency: 1 at t=0, ->0 by 60 min
    urgency = _clamp01(1.0 - (t / 60.0))
    # altitude penalty: 1 at 0 km diff, ->0 by 50 km diff
    alt_penalty = _clamp01(1.0 - (alt / 50.0))

    return {
        "closest_approach_km": d,
        "relative_velocity_kms": v,
        "time_to_closest_min": t,
        "altitude_difference_km": alt,
        "inv_distance": inv_distance,
        "distance_over_velocity": d_over_v,
        "urgency": urgency,
        "alt_penalty": alt_penalty,
    }


FEATURE_NAMES: List[str] = [
    "closest_approach_km",
    "relative_velocity_kms",
    "time_to_closest_min",
    "altitude_difference_km",
    "inv_distance",
    "distance_over_velocity",
    "urgency",
    "alt_penalty",
]


def features_to_row(feats: Dict[str, float]) -> np.ndarray:
    return np.asarray([[float(feats[k]) for k in FEATURE_NAMES]], dtype=np.float32)


def classify_probability(p: float) -> str:
    """Map probability to Low/Medium/High (as required)."""
    p = _clamp01(float(p))
    if p >= 0.30:
        return "High"
    if p >= 0.10:
        return "Medium"
    return "Low"


@dataclass(frozen=True)
class MLPrediction:
    probability: float
    classification: str


class CollisionRiskML:
    """Thread-safe singleton-ish wrapper."""

    def __init__(self, model_path: str):
        self.model_path = model_path
        self._model = None
        self._feature_names: Optional[List[str]] = None

    def load(self) -> bool:
        """Load model from disk. Returns True if loaded, else False."""
        if not os.path.exists(self.model_path):
            return False

        payload = joblib.load(self.model_path)
        # payload is expected to be {"model": <sklearn>, "feature_names": [...], ...}
        self._model = payload.get("model") if isinstance(payload, dict) else payload
        self._feature_names = payload.get("feature_names") if isinstance(payload, dict) else None
        return self._model is not None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def predict(self, *, closest_approach_km: float, relative_velocity_kms: float, time_to_closest_min: float, altitude_difference_km: float) -> Optional[MLPrediction]:
        if self._model is None:
            return None

        feats = build_features(
            closest_approach_km=closest_approach_km,
            relative_velocity_kms=relative_velocity_kms,
            time_to_closest_min=time_to_closest_min,
            altitude_difference_km=altitude_difference_km,
        )
        X = features_to_row(feats)

        # Support either regressors (predict -> continuous) or probabilistic classifiers.
        if hasattr(self._model, "predict_proba"):
            proba = float(self._model.predict_proba(X)[0, 1])
        else:
            proba = float(self._model.predict(X)[0])
        proba = _clamp01(proba)

        return MLPrediction(probability=proba, classification=classify_probability(proba))


_lock = threading.Lock()
_singleton: Optional[CollisionRiskML] = None


def get_model(model_path: Optional[str] = None) -> CollisionRiskML:
    """Return a process-wide model instance (lazy init)."""
    global _singleton

    if _singleton is not None:
        return _singleton

    with _lock:
        if _singleton is not None:
            return _singleton

        here = os.path.dirname(os.path.abspath(__file__))
        default_path = os.path.join(os.path.dirname(here), "models", "collision_risk_model.joblib")
        _singleton = CollisionRiskML(model_path=model_path or default_path)
        return _singleton


def load_on_startup(model_path: Optional[str] = None) -> bool:
    """Convenience for FastAPI startup."""
    m = get_model(model_path)
    try:
        return m.load()
    except Exception:
        # Never crash the service due to ML.
        return False


def altitude_km_from_position_m(pos_m_xyz: Tuple[float, float, float]) -> float:
    x, y, z = pos_m_xyz
    r_km = float(np.linalg.norm(np.asarray([x, y, z], dtype=np.float64))) / 1000.0
    return r_km - EARTH_RADIUS_KM
