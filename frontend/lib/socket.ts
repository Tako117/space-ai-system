// frontend/lib/socket.ts
export type WSClientHello =
  | { type: "subscribe"; channel: "telemetry" }
  | { type: "publish_state"; channel: "telemetry"; state: PublishedState };

export type PublishedObject = {
  id: string;
  kind: "satellite" | "debris";
  name?: string; // ✅ if backend includes it
  position_m: { x: number; y: number; z: number };
  velocity_mps: { x: number; y: number; z: number };
};

export type PublishedState = {
  timestamp: number;
  objects: PublishedObject[];
};

export type RiskExplain = {
  threshold_m: number;
  distance_factor: number;
  speed_factor: number;
  tca_factor: number;
  notes: string[];
};

export type RiskDecision = {
  action: "NO_ACTION" | "MONITOR" | "AVOIDANCE_MANEUVER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time_window_s: number;
};

export type RiskReport = {
  satellite_id: string;
  debris_id: string;
  satellite_name?: string | null;
  debris_name?: string | null;
  collision_risk: number; // 0..1
  confidence: number; // 0..1
  min_distance_m: number;
  time_to_closest_s: number;
  relative_speed_mps: number;
  decision: RiskDecision;
  explain: RiskExplain;
};

export type TelemetryEnvelope =
  | { type: "telemetry_state"; channel: "telemetry"; state: PublishedState }
  | { type: "telemetry_report"; channel: "telemetry"; report: RiskReport }
  | { type: "error"; message: string }
  | { type: "ok"; message: string };

let sharedWS: WebSocket | null = null;
let sharedWSUsers = 0;

function backendHttpBase(): string {
  // Prefer env var on Render; fallback to localhost for dev.
  const env = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (env && env.trim().length > 0) return env.replace(/\/+$/, "");
  return "http://localhost:8000";
}

function wsUrl(): string {
  // Convert http(s) -> ws(s)
  const http = backendHttpBase();
  if (http.startsWith("https://")) return http.replace("https://", "wss://") + "/ws";
  if (http.startsWith("http://")) return http.replace("http://", "ws://") + "/ws";
  // last resort
  return "ws://localhost:8000/ws";
}

export function connectSocket(onMessage: (data: TelemetryEnvelope) => void) {
  sharedWSUsers += 1;

  if (sharedWS && (sharedWS.readyState === WebSocket.OPEN || sharedWS.readyState === WebSocket.CONNECTING)) {
    sharedWS.addEventListener("message", (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {}
    });
    return sharedWS;
  }

  const ws = new WebSocket(wsUrl());
  sharedWS = ws;

  ws.onopen = () => {
    const hello: WSClientHello = { type: "subscribe", channel: "telemetry" };
    try {
      ws.send(JSON.stringify(hello));
    } catch {}
  };

  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      // ignore malformed payloads
    }
  };

  ws.onerror = () => {
    // silent; pages may remount / refresh
  };

  ws.onclose = () => {
    // allow reconnect on next mount
  };

  return ws;
}

export function disconnectSocket() {
  sharedWSUsers = Math.max(0, sharedWSUsers - 1);

  if (sharedWSUsers === 0 && sharedWS) {
    try {
      sharedWS.close();
    } catch {}
    sharedWS = null;
  }
}

export function publishState(ws: WebSocket, state: PublishedState) {
  const msg: WSClientHello = { type: "publish_state", channel: "telemetry", state };
  try {
    ws.send(JSON.stringify(msg));
  } catch {}
}