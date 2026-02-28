#backend/ai/risk_engine.py
import numpy as np
from .orbital_math import vector, relative_motion, predict_min_distance
from .ml_model import get_model, altitude_km_from_position_m
from .schemas import (
    DebrisInput,
    SatelliteInput,
    PredictionResponse,
    Explainability,
    Decision,
    PublishedState,
)

# Conservative alert radius used for explainable scoring (meters)
COLLISION_THRESHOLD_M = 250.0

# Relative speed "scale" used for explainable scoring (m/s)
SPEED_SCALE_MPS = 7500.0


def _clamp01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))


def _decide_from_risk(risk: float, tca_s: float) -> tuple[str, str]:
    """
    ✅ Updated policy (your confirmed mapping):
      0–5%   => LOW
      5–15%  => MEDIUM
      15–30% => HIGH
      >30%   => CRITICAL
    """
    if risk >= 0.30:
        return "AVOIDANCE_MANEUVER", "CRITICAL"
    if risk >= 0.15:
        return "AVOIDANCE_MANEUVER", "HIGH"
    if risk >= 0.05:
        return "MONITOR", "MEDIUM"
    return "NO_ACTION", "LOW"


def evaluate_risk_pair(
    satellite_id: str,
    debris_id: str,
    debris: DebrisInput,
    satellite: SatelliteInput,
    satellite_name: str | None = None,
    debris_name: str | None = None,
) -> PredictionResponse:
    debris_pos = vector(debris.position)
    debris_vel = vector(debris.velocity)
    sat_pos = vector(satellite.position)
    sat_vel = vector(satellite.velocity)

    rel_pos, rel_vel = relative_motion(debris_pos, debris_vel, sat_pos, sat_vel)
    min_distance_m, tca_s = predict_min_distance(rel_pos, rel_vel)
    rel_speed_mps = float(np.linalg.norm(rel_vel))

    # --- ML feature extraction (no physics rewrites, just reuse computed values) ---
    closest_approach_km = float(min_distance_m) / 1000.0
    relative_velocity_kms = float(rel_speed_mps) / 1000.0
    time_to_closest_min = float(tca_s) / 60.0
    try:
        alt_sat_km = altitude_km_from_position_m((float(sat_pos[0]), float(sat_pos[1]), float(sat_pos[2])))
        alt_deb_km = altitude_km_from_position_m((float(debris_pos[0]), float(debris_pos[1]), float(debris_pos[2])))
        altitude_difference_km = float(abs(alt_sat_km - alt_deb_km))
    except Exception:
        altitude_difference_km = 0.0

    ml_pred = None
    m = get_model()
    if m.is_loaded:
        try:
            ml_pred = m.predict(
                closest_approach_km=closest_approach_km,
                relative_velocity_kms=relative_velocity_kms,
                time_to_closest_min=time_to_closest_min,
                altitude_difference_km=altitude_difference_km,
            )
        except Exception:
            ml_pred = None

    # distance_factor: 1 at 0m, 0 at >= threshold
    distance_factor = _clamp01(1.0 - (min_distance_m / COLLISION_THRESHOLD_M))

    # speed_factor: scales with closing speed (high speed => more severe outcome)
    speed_factor = _clamp01(rel_speed_mps / SPEED_SCALE_MPS)

    # tca_factor: nearer in time => higher urgency (0..1 within ~0..120s)
    tca_factor = _clamp01(1.0 - (tca_s / 120.0))

    # Weighted risk (distance dominates)
    raw = 0.72 * distance_factor + 0.18 * speed_factor + 0.10 * tca_factor
    collision_risk = _clamp01(raw)

    # Confidence: reduces if TCA is far
    conf_raw = 0.55 * speed_factor + 0.45 * _clamp01(1.0 - (tca_s / 220.0))
    confidence = _clamp01(conf_raw)

    notes = []
    if tca_s > 120.0:
        notes.append("TCA is far: small trajectory errors dominate uncertainty.")
    if rel_speed_mps < 500.0:
        notes.append("Low relative speed: risk is sensitive to distance uncertainty.")
    if min_distance_m > COLLISION_THRESHOLD_M:
        notes.append("Closest approach exceeds threshold: risk decays rapidly.")
    if collision_risk >= 0.15:
        notes.append("Risk exceeds operator threshold: avoidance or strong monitoring recommended.")

    action, severity = _decide_from_risk(collision_risk, tca_s)

    # time window: keep readable + stable
    time_window_s = float(max(10.0, min(300.0, 0.55 * tca_s + 20.0)))

    return PredictionResponse(
        satellite_id=satellite_id,
        debris_id=debris_id,
        satellite_name=satellite_name,
        debris_name=debris_name,
        collision_risk=collision_risk,
        rule_based_risk=collision_risk,
        ml_probability=(ml_pred.probability if ml_pred else None),
        ml_classification=(ml_pred.classification if ml_pred else None),
        time_to_closest_s=float(tca_s),
        confidence=confidence,
        min_distance_m=float(min_distance_m),
        relative_speed_mps=float(rel_speed_mps),
        decision=Decision(action=action, severity=severity, time_window_s=time_window_s),
        explain=Explainability(
            threshold_m=float(COLLISION_THRESHOLD_M),
            distance_factor=float(distance_factor),
            speed_factor=float(speed_factor),
            tca_factor=float(tca_factor),
            notes=notes,
        ),
    )


def evaluate_best_pair(state: PublishedState) -> PredictionResponse:
    sats = [o for o in state.objects if o.kind == "satellite"]
    debris = [o for o in state.objects if o.kind == "debris"]

    if not sats or not debris:
        return PredictionResponse(
            satellite_id=sats[0].id if sats else "SAT-?",
            debris_id=debris[0].id if debris else "DEB-?",
            satellite_name=sats[0].name if sats else None,
            debris_name=debris[0].name if debris else None,
            collision_risk=0.0,
            rule_based_risk=0.0,
            ml_probability=None,
            ml_classification=None,
            time_to_closest_s=0.0,
            confidence=0.0,
            min_distance_m=1e9,
            relative_speed_mps=0.0,
            decision=Decision(action="NO_ACTION", severity="LOW", time_window_s=30.0),
            explain=Explainability(
                threshold_m=float(COLLISION_THRESHOLD_M),
                distance_factor=0.0,
                speed_factor=0.0,
                tca_factor=0.0,
                notes=["No objects to evaluate."],
            ),
        )

    best: PredictionResponse | None = None
    best_dist = float("inf")

    # Evaluate all sat x all debris (still fast enough for typical TLE counts)
    for s in sats:
        sat_in = SatelliteInput(position=s.position_m, velocity=s.velocity_mps)

        for d in debris:
            deb_in = DebrisInput(position=d.position_m, velocity=d.velocity_mps)
            r = evaluate_risk_pair(
                s.id,
                d.id,
                deb_in,
                sat_in,
                satellite_name=s.name,
                debris_name=d.name,
            )

            if r.min_distance_m < best_dist:
                best_dist = r.min_distance_m
                best = r

    return best if best is not None else evaluate_risk_pair(
        sats[0].id,
        debris[0].id,
        DebrisInput(position=debris[0].position_m, velocity=debris[0].velocity_mps),
        SatelliteInput(position=sats[0].position_m, velocity=sats[0].velocity_mps),
        satellite_name=sats[0].name,
        debris_name=debris[0].name,
    )
