# backend/ai/scenario_engine.py
import math
from pydantic import BaseModel, Field


class ScenarioRequest(BaseModel):
    # All in km / km/s / minutes
    closest_approach_km: float = Field(..., ge=0.0)
    relative_velocity_kms: float = Field(..., ge=0.0)
    time_to_closest_min: float = Field(..., ge=0.0)
    altitude_difference_km: float = Field(..., ge=0.0)


class ScenarioResponse(BaseModel):
    collision_risk: float  # 0..1
    confidence: float      # 0..1
    min_distance_m: float
    time_to_closest_s: float
    relative_speed_mps: float
    decision: dict
    explain: dict


def _clamp01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))


def evaluate_scenario(req: ScenarioRequest) -> ScenarioResponse:
    # Convert to SI
    min_distance_m = float(req.closest_approach_km * 1000.0)
    rel_speed_mps = float(req.relative_velocity_kms * 1000.0)
    tca_s = float(req.time_to_closest_min * 60.0)
    alt_diff_m = float(req.altitude_difference_km * 1000.0)

    # --- Tunable explainable scoring (hypothetical) ---
    # We want risk to be able to exceed 30% and reach CRITICAL when very close and fast soon.
    # Thresholds here are NOT "real physics", just a scenario tool.

    # Distance threshold for "danger zone"
    THRESH_M = 2000.0  # 2 km for scenario tool (more forgiving than real collision radius)
    # Speed scale
    SPEED_SCALE = 12000.0  # 12 km/s typical relative upper bound
    # Time window scale
    TIME_SCALE = 30 * 60.0  # 30 minutes

    distance_factor = _clamp01(1.0 - (min_distance_m / THRESH_M))
    speed_factor = _clamp01(rel_speed_mps / SPEED_SCALE)
    timing_factor = _clamp01(1.0 - (tca_s / TIME_SCALE))

    # altitude mismatch: if large, a collision is less plausible, so reduce risk
    # (this is a simple heuristic requested by your UI)
    alt_penalty = _clamp01(1.0 - (alt_diff_m / 50_000.0))  # 50 km -> near zero

    # Weighted risk (distance dominates)
    raw = 0.62 * distance_factor + 0.22 * speed_factor + 0.16 * timing_factor
    raw = raw * (0.55 + 0.45 * alt_penalty)

    # non-linear boost: close+fast combos jump up
    boost = 0.0
    if min_distance_m < 500.0:
        boost += 0.18
    if min_distance_m < 200.0:
        boost += 0.22
    if rel_speed_mps > 8000.0:
        boost += 0.10
    if tca_s < 5 * 60.0:
        boost += 0.10

    collision_risk = _clamp01(raw + boost)

    # Confidence: higher when timing is soon and alt diff is small
    confidence = _clamp01(0.55 * timing_factor + 0.30 * alt_penalty + 0.15 * speed_factor)

    # Decision bands (IMPORTANT: 30% is NOT low)
    if collision_risk >= 0.80:
        action, severity = "AVOIDANCE_MANEUVER", "CRITICAL"
    elif collision_risk >= 0.55:
        action, severity = "AVOIDANCE_MANEUVER", "HIGH"
    elif collision_risk >= 0.30:
        action, severity = "MONITOR", "MEDIUM"
    else:
        action, severity = "NO_ACTION", "LOW"

    time_window_s = float(max(30.0, min(6 * 3600.0, 0.8 * tca_s + 120.0)))

    notes = []
    if min_distance_m > THRESH_M:
        notes.append("Closest approach is outside the scenario threshold; risk decays quickly.")
    if alt_diff_m > 20_000:
        notes.append("Large altitude difference makes an encounter less plausible (risk reduced).")
    if tca_s > TIME_SCALE:
        notes.append("Approach is far in time; uncertainty dominates the scenario.")

    return ScenarioResponse(
        collision_risk=collision_risk,
        confidence=confidence,
        min_distance_m=min_distance_m,
        time_to_closest_s=tca_s,
        relative_speed_mps=rel_speed_mps,
        decision={
            "action": action,
            "severity": severity,
            "time_window_s": time_window_s,
        },
        explain={
            "threshold_m": THRESH_M,
            "distance_factor": distance_factor,
            "speed_factor": speed_factor,
            "tca_factor": timing_factor,
            "altitude_factor": alt_penalty,
            "notes": notes,
        },
    )
