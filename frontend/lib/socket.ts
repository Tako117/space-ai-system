// frontend/lib/socket.ts

export type PublishedObject = {
  id: string;
  kind: "satellite" | "debris";
  name?: string;
  position_m: { x: number; y: number; z: number };
  velocity_mps: { x: number; y: number; z: number };
};

export type PublishedState = {
  timestamp: number;
  objects: PublishedObject[];
};

export type RiskReport = {
  satellite_id: string;
  debris_id: string;
  satellite_name?: string;
  debris_name?: string;
  collision_risk: number;
  confidence: number;
  min_distance_m: number;
  time_to_closest_s: number;
  relative_speed_mps: number;
  decision: {
    action: "NO_ACTION" | "MONITOR" | "AVOIDANCE_MANEUVER";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    time_window_s: number;
  };
  explain: any;
};

export type TelemetryEnvelope =
  | { type: "telemetry_state"; state: PublishedState }
  | { type: "telemetry_report"; report: RiskReport }
  | { type: "error"; message: string }
  | { type: "ok"; message: string };

let ws: WebSocket | null = null;

function wsUrl() {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname
      : "localhost";
  return `ws://${host}:8000/ws`;
}

export function connectSocket(
  onMessage: (data: TelemetryEnvelope) => void
) {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    ws = new WebSocket(wsUrl());

    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: "subscribe", channel: "telemetry" }));
    };

    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {}
    };

    ws.onerror = () => {};
  }

  return ws;
}

export function disconnectSocket() {
  // DO NOT auto-close socket on page unmount
  // keep single persistent connection
}