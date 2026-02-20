// frontend/lib/api.ts

// -----------------------------
// Types (from your message)
// -----------------------------
export type Vector3 = { x: number; y: number; z: number };

export type ObjectState = {
  id: string;
  position: Vector3;
  velocity: Vector3;
};

export type SatelliteState = ObjectState & {
  name: string;
};

export type DebrisState = ObjectState & {
  type: string;
};

export type DominantFactor = {
  name: string;
  value: number;
  weight: number;
};

export type Explanation = {
  summary: string;
  confidence_reason: string;
  dominant_factors: DominantFactor[];
};

export type RiskReport = {
  satellite_id: string;
  debris_id: string;
  risk_score: number;
  min_distance_m: number;
  relative_speed_mps: number;
  time_to_closest_approach_s: number;
  confidence: number;
  decision: "no_action" | "monitor" | "avoidance_maneuver";
  explanation: Explanation;
};

export type TelemetryResponse = {
  risk: RiskReport | null;
  candidates: RiskReport[];
  objects: {
    satellites: SatelliteState[];
    debris: DebrisState[];
  };
};

// -----------------------------
// Backend base URL
// -----------------------------
export function backendBase(): string {
  // Render: set NEXT_PUBLIC_BACKEND_URL=https://space-ai-system.onrender.com
  const env = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (env && env.trim().length > 0) return env.replace(/\/+$/, "");

  // Local dev fallback:
  return "http://localhost:8000";
}

function joinUrl(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// -----------------------------
// Generic request helpers
// -----------------------------
export async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = joinUrl(backendBase(), path);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    // IMPORTANT: no credentials unless you’re using cookies/auth
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText}: ${txt}`);
  }

  return (await res.json()) as T;
}

export async function postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const url = joinUrl(backendBase(), path);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} -> ${res.status} ${res.statusText}: ${txt}`);
  }

  return (await res.json()) as T;
}

// -----------------------------
// Convenience endpoint wrappers
// (use these in your pages/components)
// -----------------------------

// Health (optional, useful for debug)
export type HealthResponse = {
  ok: boolean;
  [k: string]: any;
};

export function fetchHealth(signal?: AbortSignal) {
  return getJSON<HealthResponse>("/health", signal);
}

// Telemetry snapshot endpoint (if you have it)
// If your backend endpoint differs, change "/telemetry" to your actual path.
export function fetchTelemetry(signal?: AbortSignal) {
  return getJSON<TelemetryResponse>("/telemetry", signal);
}

// Scenario prediction endpoint (if used by Scenario page)
// Change this path if your backend uses "/scenario/predict" or "/scenario" etc.
export type ScenarioRiskRequest = {
  closest_approach_km: number;
  relative_velocity_kms: number;
  time_to_closest_min: number;
  altitude_difference_km: number;
};

// If your backend returns a different shape, update this type accordingly.
export type ScenarioRiskResponse = {
  report: RiskReport;
  inputs: ScenarioRiskRequest;
};

export function predictScenario(body: ScenarioRiskRequest, signal?: AbortSignal) {
  return postJSON<ScenarioRiskResponse>("/scenario/predict", body, signal);
}
