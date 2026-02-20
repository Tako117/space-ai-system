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
