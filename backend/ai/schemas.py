#backend/ai/schemas.py
from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class DebrisInput(BaseModel):
    position: Vector3
    velocity: Vector3


class SatelliteInput(BaseModel):
    position: Vector3
    velocity: Vector3


class PredictionRequest(BaseModel):
    debris: DebrisInput
    satellite: SatelliteInput


class Explainability(BaseModel):
    threshold_m: float
    distance_factor: float
    speed_factor: float
    tca_factor: float
    notes: List[str] = Field(default_factory=list)


class Decision(BaseModel):
    action: Literal["NO_ACTION", "MONITOR", "AVOIDANCE_MANEUVER"]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    time_window_s: float


class PredictionResponse(BaseModel):
    satellite_id: str
    debris_id: str

    # ✅ NEW: human-readable names (from TLE)
    satellite_name: Optional[str] = None
    debris_name: Optional[str] = None

    collision_risk: float

    # ✅ Backwards-compatible extension: keep collision_risk as the rule-based value,
    # but also expose it explicitly for frontend/API consumers.
    rule_based_risk: Optional[float] = None

    # ✅ ML outputs (optional; present when model is available)
    ml_probability: Optional[float] = None
    ml_classification: Optional[Literal["Low", "Medium", "High"]] = None
    time_to_closest_s: float
    confidence: float
    min_distance_m: float
    relative_speed_mps: float
    decision: Decision
    explain: Explainability


# --- WebSocket protocol (multi-object streaming) ---

class PublishedObject(BaseModel):
    id: str
    kind: Literal["satellite", "debris"]

    # ✅ NEW: optional display name
    name: Optional[str] = None

    position_m: Vector3
    velocity_mps: Vector3


class PublishedState(BaseModel):
    timestamp: int
    objects: List[PublishedObject]


class WSSubscribe(BaseModel):
    type: Literal["subscribe"]
    channel: Literal["telemetry"]


class WSPublishState(BaseModel):
    type: Literal["publish_state"]
    channel: Literal["telemetry"]
    state: PublishedState


class WSClientMessage(BaseModel):
    type: Literal["subscribe", "publish_state", "select_pair"]
    channel: Optional[Literal["telemetry"]] = "telemetry"
    state: Optional[PublishedState] = None
    # Optional per-connection selection for AI Engine (backward compatible)
    satellite_id: Optional[str] = None
    debris_id: Optional[str] = None


class TelemetryEnvelope(BaseModel):
    type: Literal["telemetry_state", "telemetry_report", "error", "ok"]
    channel: Optional[Literal["telemetry"]] = "telemetry"
    state: Optional[PublishedState] = None
    report: Optional[PredictionResponse] = None
    message: Optional[str] = None
