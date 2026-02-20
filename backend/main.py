# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import asyncio
import json
import os
import time
from typing import Optional, Set, Dict, Any, List, Tuple

from ai.schemas import (
    PredictionRequest,
    PredictionResponse,
    PublishedState,
    PublishedObject,
    WSClientMessage,
    TelemetryEnvelope,
    Decision,
    Explainability,
    Vector3,
    DebrisInput,
    SatelliteInput,
)

from ai.risk_engine import evaluate_risk_pair, evaluate_best_pair
from ai.tle_propagation import load_tle_file, propagate_many
from ai.scenario_engine import ScenarioRequest, evaluate_scenario

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Global state
# -------------------------
LATEST_STATE: Optional[PublishedState] = None
LATEST_REPORT: Optional[PredictionResponse] = None
CLIENTS: Set[WebSocket] = set()

TLE_STATUS: Dict[str, Any] = {
    "enabled": True,
    "running": False,
    "last_update_ts": None,
    "last_error": None,
    "satellites_loaded": 0,
    "debris_loaded": 0,
    "sat_path": None,
    "deb_path": None,
}

TLE_CACHE: Dict[str, Any] = {
    "satellites": [],
    "debris": [],
    "last_states": None,
}

_tle_task: Optional[asyncio.Task] = None


# -------------------------
# Config paths
# -------------------------
def _default_data_path(filename: str) -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "data", filename)


SAT_TLE_PATH = os.environ.get("SAT_TLE_PATH", _default_data_path("satellites.tle"))
DEB_TLE_PATH = os.environ.get("DEB_TLE_PATH", _default_data_path("debris.tle"))


# -------------------------
# Helpers
# -------------------------
def _parse_norad_id(line1: str) -> Optional[str]:
    # NORAD catalog number is chars 3..7 in line1 (0-indexed 2..7 exclusive)
    # Example: "1 25544U 98067A ..."
    try:
        if not line1.startswith("1 "):
            return None
        raw = line1[2:7].strip()
        return raw if raw else None
    except Exception:
        return None


def _vec3_from_km(d: Dict[str, float]) -> Vector3:
    # TEME km -> meters
    return Vector3(x=float(d["x"]) * 1000.0, y=float(d["y"]) * 1000.0, z=float(d["z"]) * 1000.0)


def _vec3_from_kms(d: Dict[str, float]) -> Vector3:
    # km/s -> m/s
    return Vector3(x=float(d["x"]) * 1000.0, y=float(d["y"]) * 1000.0, z=float(d["z"]) * 1000.0)


async def broadcast(payload: dict):
    dead: list[WebSocket] = []
    for ws in list(CLIENTS):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)

    for ws in dead:
        try:
            CLIENTS.remove(ws)
        except Exception:
            pass


async def broadcast_state_and_report(state: PublishedState, report: PredictionResponse):
    env_state: TelemetryEnvelope = TelemetryEnvelope(
        type="telemetry_state",
        channel="telemetry",
        state=state,
        report=None,
        message=None,
    )
    await broadcast(env_state.model_dump(exclude_none=True))

    env_report: TelemetryEnvelope = TelemetryEnvelope(
        type="telemetry_report",
        channel="telemetry",
        state=None,
        report=report,
        message=None,
    )
    await broadcast(env_report.model_dump(exclude_none=True))


def _build_published_state_from_propagation(now_states: Dict[str, Any]) -> PublishedState:
    """
    Convert propagate_many() output into PublishedState:
      - use NORAD id when possible
      - include TLE name as PublishedObject.name
      - store position/velocity in meters and m/s
    """
    objects: List[PublishedObject] = []

    sats = now_states.get("satellites", []) or []
    debs = now_states.get("debris", []) or []

    # NOTE: propagate_many currently does not include line1/line2. We only have name + pos/vel.
    # So ids are generated deterministically from index + kind, while name is real from TLE file.
    # If you want NORAD IDs here, we can extend propagate_many to carry line1 and parse it.
    for i, s in enumerate(sats, start=1):
        if "error" in s:
            continue
        name = str(s.get("name", f"SAT-{i}"))
        sid = f"SAT-{i}"
        objects.append(
            PublishedObject(
                id=sid,
                kind="satellite",
                name=name,
                position_m=_vec3_from_km(s["position_km"]),
                velocity_mps=_vec3_from_kms(s["velocity_kms"]),
            )
        )

    for i, d in enumerate(debs, start=1):
        if "error" in d:
            continue
        name = str(d.get("name", f"DEB-{i}"))
        did = f"DEB-{i}"
        objects.append(
            PublishedObject(
                id=did,
                kind="debris",
                name=name,
                position_m=_vec3_from_km(d["position_km"]),
                velocity_mps=_vec3_from_kms(d["velocity_kms"]),
            )
        )

    return PublishedState(timestamp=int(time.time()), objects=objects)


# -------------------------
# Routes
# -------------------------
@app.get("/")
def root():
    return {
        "ok": True,
        "service": "space-ai-backend",
        "docs": "/docs",
        "health": "/health",
        "tle": {
            "satellites_path": SAT_TLE_PATH,
            "debris_path": DEB_TLE_PATH,
        },
        "endpoints": {
            "predict": "/predict",
            "scenario_predict": "/scenario/predict",
            "ws": "/ws",
            "tle_state": "/tle/state",
        },
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "has_state": LATEST_STATE is not None,
        "has_report": LATEST_REPORT is not None,
        "clients": len(CLIENTS),
        "tle_status": TLE_STATUS,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    # This is the raw physics-ish risk engine endpoint.
    # Keeping it for debugging / internal calls.
    return evaluate_risk_pair(
        satellite_id="SAT-1",
        debris_id="DEB-1",
        debris=request.debris,
        satellite=request.satellite,
        satellite_name=None,
        debris_name=None,
    )


@app.get("/tle/state", response_model=PublishedState)
def tle_state():
    if TLE_CACHE.get("last_states") is None:
        return PublishedState(timestamp=int(time.time()), objects=[])
    return _build_published_state_from_propagation(TLE_CACHE["last_states"])


@app.post("/scenario/predict")
def scenario_predict(body: ScenarioRequest):
    """
    ✅ This fixes your 404:
      Frontend calls POST http://localhost:8000/scenario/predict
    We return:
      { report: PredictionResponse, inputs: ScenarioRequest }
    """
    r = evaluate_scenario(body)

    # Adapt ScenarioResponse -> PredictionResponse
    report = PredictionResponse(
        satellite_id="SCENARIO-SAT",
        debris_id="SCENARIO-DEB",
        satellite_name="Hypothetical Satellite",
        debris_name="Hypothetical Debris",
        collision_risk=float(r.collision_risk),
        time_to_closest_s=float(r.time_to_closest_s),
        confidence=float(r.confidence),
        min_distance_m=float(r.min_distance_m),
        relative_speed_mps=float(r.relative_speed_mps),
        decision=Decision(
            action=r.decision["action"],
            severity=r.decision["severity"],
            time_window_s=float(r.decision["time_window_s"]),
        ),
        explain=Explainability(
            threshold_m=float(r.explain["threshold_m"]),
            distance_factor=float(r.explain["distance_factor"]),
            speed_factor=float(r.explain["speed_factor"]),
            tca_factor=float(r.explain["tca_factor"]),
            notes=list(r.explain.get("notes", [])),
        ),
    )

    return {"report": report.model_dump(), "inputs": body.model_dump()}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    global LATEST_STATE, LATEST_REPORT

    await ws.accept()
    CLIENTS.add(ws)

    try:
        # Immediately push latest snapshot on connect (so AI page instantly shows real names)
        if LATEST_STATE is not None:
            await ws.send_text(
                json.dumps(
                    {
                        "type": "telemetry_state",
                        "channel": "telemetry",
                        "state": LATEST_STATE.model_dump(),
                    }
                )
            )
        if LATEST_REPORT is not None:
            await ws.send_text(
                json.dumps(
                    {
                        "type": "telemetry_report",
                        "channel": "telemetry",
                        "report": LATEST_REPORT.model_dump(),
                    }
                )
            )

        while True:
            try:
                text = await asyncio.wait_for(ws.receive_text(), timeout=0.25)
            except asyncio.TimeoutError:
                # keep-alive: stream report if available
                if LATEST_REPORT is not None:
                    await ws.send_text(
                        json.dumps(
                            {
                                "type": "telemetry_report",
                                "channel": "telemetry",
                                "report": LATEST_REPORT.model_dump(),
                            }
                        )
                    )
                continue

            try:
                msg = WSClientMessage.model_validate_json(text)
            except Exception:
                await ws.send_text(json.dumps({"type": "error", "message": "Invalid WS message JSON"}))
                continue

            if msg.type == "subscribe":
                await ws.send_text(json.dumps({"type": "ok", "message": "subscribed"}))
                continue

            # Optional: allow frontend scenes to publish synthetic state
            if msg.type == "publish_state":
                if msg.state is None:
                    await ws.send_text(json.dumps({"type": "error", "message": "publish_state requires state"}))
                    continue

                LATEST_STATE = msg.state

                # Broadcast state
                env_state: TelemetryEnvelope = TelemetryEnvelope(
                    type="telemetry_state",
                    channel="telemetry",
                    state=LATEST_STATE,
                    report=None,
                    message=None,
                )
                await broadcast(env_state.model_dump(exclude_none=True))

                # Compute best pair from that state
                best = evaluate_best_pair(LATEST_STATE)
                LATEST_REPORT = best

                env_report: TelemetryEnvelope = TelemetryEnvelope(
                    type="telemetry_report",
                    channel="telemetry",
                    state=None,
                    report=LATEST_REPORT,
                    message=None,
                )
                await broadcast(env_report.model_dump(exclude_none=True))

    except WebSocketDisconnect:
        pass
    finally:
        try:
            CLIENTS.remove(ws)
        except Exception:
            pass
        try:
            await ws.close()
        except Exception:
            pass


# -------------------------
# TLE background loop
# -------------------------
async def tle_loop():
    """
    ✅ IMPORTANT CHANGE:
    This loop now *publishes* TLE telemetry to websocket clients.

    That means AI Engine will stop showing SAT-1 / DEB-X from fake state
    and will show real TLE names from your .tle files.
    """
    global LATEST_STATE, LATEST_REPORT

    TLE_STATUS["running"] = True
    TLE_STATUS["last_error"] = None
    TLE_STATUS["sat_path"] = SAT_TLE_PATH
    TLE_STATUS["deb_path"] = DEB_TLE_PATH

    try:
        while True:
            try:
                sats = load_tle_file(SAT_TLE_PATH)
                debs = load_tle_file(DEB_TLE_PATH)

                TLE_CACHE["satellites"] = sats
                TLE_CACHE["debris"] = debs

                TLE_STATUS["satellites_loaded"] = len(sats)
                TLE_STATUS["debris_loaded"] = len(debs)

                now_states = propagate_many(sats, debs)
                TLE_CACHE["last_states"] = now_states
                TLE_STATUS["last_update_ts"] = int(time.time())
                TLE_STATUS["last_error"] = None

                # ✅ Build & publish telemetry state from TLE propagation
                state = _build_published_state_from_propagation(now_states)
                LATEST_STATE = state

                # ✅ Evaluate best pair (includes names)
                LATEST_REPORT = evaluate_best_pair(state)

                # ✅ Broadcast to all connected clients
                if len(CLIENTS) > 0:
                    await broadcast_state_and_report(LATEST_STATE, LATEST_REPORT)

            except Exception as e:
                TLE_STATUS["last_error"] = f"{type(e).__name__}: {str(e)}"

            await asyncio.sleep(2.0)

    except asyncio.CancelledError:
        # NORMAL on shutdown: do not re-raise
        return
    finally:
        TLE_STATUS["running"] = False


@app.on_event("startup")
async def _startup():
    global _tle_task

    if not TLE_STATUS.get("enabled", True):
        return

    if _tle_task and not _tle_task.done():
        return

    _tle_task = asyncio.create_task(tle_loop())


@app.on_event("shutdown")
async def _shutdown():
    global _tle_task

    if _tle_task and not _tle_task.done():
        _tle_task.cancel()
        try:
            await _tle_task
        except asyncio.CancelledError:
            # NORMAL: ignore
            pass
        except Exception:
            pass