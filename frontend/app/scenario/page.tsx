"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/Header";
import { postJSON } from "../../lib/api";
import ScenarioVisualizer from "../../components/ScenarioVisualizer";

type Decision = {
  action: "NO_ACTION" | "MONITOR" | "AVOIDANCE_MANEUVER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time_window_s: number;
};

type Explainability = {
  threshold_m: number;
  distance_factor: number;
  speed_factor: number;
  tca_factor: number;
  notes: string[];
};

type PredictionResponse = {
  satellite_id: string;
  debris_id: string;
  collision_risk: number;
  final_risk?: number;
  rule_based_risk?: number;
  ml_probability?: number | null;
  ml_classification?: "Low" | "Medium" | "High" | null;
  time_to_closest_s: number;
  confidence: number;
  min_distance_m: number;
  relative_speed_mps: number;
  decision: Decision;
  explain: Explainability;
};

type ScenarioRiskRequest = {
  closest_approach_km: number;
  relative_velocity_kms: number;
  time_to_closest_min: number;
  altitude_difference_km: number;
};

type ScenarioRiskResponse = {
  report: PredictionResponse;
  inputs: ScenarioRiskRequest;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function pct(x: number) {
  return `${(clamp01(x) * 100).toFixed(2)}%`;
}
function km(xm: number) {
  return `${(xm / 1000).toFixed(2)} km`;
}
function kms(xmps: number) {
  return `${(xmps / 1000).toFixed(2)} km/s`;
}
function mins(xs: number) {
  return `${(xs / 60).toFixed(1)} min`;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function generateManeuver(report: PredictionResponse, inputs: ScenarioRiskRequest) {
  if (report.decision.severity !== "HIGH" && report.decision.severity !== "CRITICAL") return null;

  const isHeadOn = inputs.relative_velocity_kms > 10;
  
  let maneuverType = "";
  let direction = "";
  let deltaV = 0.0;
  let angle = 0;
  let tca_s = report.time_to_closest_s;
  let safe_sep = 0;

  if (isHeadOn) {
    maneuverType = "Normal-plane Offset";
    direction = "Anti-Normal";
    angle = 90;
    deltaV = 12.5; 
    safe_sep = report.min_distance_m + 8500;
  } else if (inputs.altitude_difference_km < 1.0) {
    maneuverType = "Radial Raise";
    direction = "Radial Out";
    angle = 90;
    deltaV = 8.2;
    safe_sep = report.min_distance_m + 5000;
  } else {
    maneuverType = "Prograde Burn";
    direction = "Prograde";
    angle = 0;
    deltaV = 15.0;
    safe_sep = report.min_distance_m + 12000;
  }
  
  const residualRisk = (report.final_risk ?? report.collision_risk) * 0.005; // Drop by roughly 99.5%

  return {
    type: maneuverType,
    direction: direction,
    angle: angle,
    deltaV: deltaV,
    executionWindow: Math.max(30, (tca_s * 0.6)), // Execute way before TCA
    predictedSafeSeparation: safe_sep,
    residualRisk,
  };
}

export default function ScenarioPage() {
  const [closestKm, setClosestKm] = useState(50.0);
  const [relVelKms, setRelVelKms] = useState(8.0);
  const [tcaMin, setTcaMin] = useState(60.0);
  const [altDiffKm, setAltDiffKm] = useState(5.0);

  const debClosest = useDebouncedValue(closestKm, 180);
  const debRelVel = useDebouncedValue(relVelKms, 180);
  const debTca = useDebouncedValue(tcaMin, 180);
  const debAltDiff = useDebouncedValue(altDiffKm, 180);

  const debounced = useMemo(() => ({
    closest_approach_km: debClosest,
    relative_velocity_kms: debRelVel,
    time_to_closest_min: debTca,
    altitude_difference_km: debAltDiff
  }), [debClosest, debRelVel, debTca, debAltDiff]);

  const [report, setReport] = useState<PredictionResponse | null>(null);
  const [status, setStatus] = useState<string>("Move sliders to calculate risk…");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const run = async () => {
      const body: ScenarioRiskRequest = {
        closest_approach_km: debounced.closest_approach_km,
        relative_velocity_kms: debounced.relative_velocity_kms,
        time_to_closest_min: debounced.time_to_closest_min,
        altitude_difference_km: debounced.altitude_difference_km,
      };

      try {
        setStatus("Calculating…");
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const data = await postJSON<ScenarioRiskResponse>("/scenario/predict", body, abortRef.current.signal);
        setReport(data.report);
        setStatus("Updated");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setStatus(`Error: ${e?.message ?? "failed to calculate"}`);
        setReport(null);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced.closest_approach_km, debounced.relative_velocity_kms, debounced.time_to_closest_min, debounced.altitude_difference_km]);

  // Hardware Sync Effect (Debounced)
  useEffect(() => {
    if (!report) return;

    // Wait for the scenario result to fully settle before spamming the hardware.
    // This prevents sending intermediate recalculation noise (e.g. while sliders drag)
    const timer = setTimeout(() => {
      fetch("http://localhost:4000/hardware/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          final_risk: report.final_risk ?? report.collision_risk,
          severity: report.decision.severity,
          recommended_action: report.decision.action,
        }),
      }).catch(() => {
        // Silently ignore if bridge is not running
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [report]);

  const decisionBadge = useMemo(() => {
    if (!report) return { label: "—", cls: "text-white/60", bgCls: "bg-white/10" };
    const sev = report.decision.severity;
    const isCritical = sev === "CRITICAL";
    const isHigh = sev === "HIGH";
    const isMed = sev === "MEDIUM";

    const cls = isCritical
      ? "text-red-400"
      : isHigh
      ? "text-orange-400"
      : isMed
      ? "text-yellow-400"
      : "text-emerald-400";
      
    const bgCls = isCritical
      ? "bg-red-500"
      : isHigh
      ? "bg-orange-500"
      : isMed
      ? "bg-yellow-500"
      : "bg-emerald-500";
      
    const label = `${sev} • ${pct(report.final_risk ?? report.collision_risk)}`;
    return { label, cls, bgCls };
  }, [report]);

  const maneuver = useMemo(() => {
    if (!report) return null;
    return generateManeuver(report, debounced);
  }, [report, debounced]);

  const inputsRender = (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">Scenario Controls</div>

      <div className="mt-5 space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/85">Closest approach (km)</span>
            <span className="text-white/70">{closestKm.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={500.0}
            step={0.1}
            value={closestKm}
            onChange={(e) => setClosestKm(parseFloat(e.target.value))}
            className="mt-2 w-full accent-[rgb(124,247,255)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/85">Relative velocity (km/s)</span>
            <span className="text-white/70">{relVelKms.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.1}
            value={relVelKms}
            onChange={(e) => setRelVelKms(parseFloat(e.target.value))}
            className="mt-2 w-full accent-[rgb(124,247,255)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/85">Time to closest (min)</span>
            <span className="text-white/70">{tcaMin.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={720.0}
            step={1.0}
            value={tcaMin}
            onChange={(e) => setTcaMin(parseFloat(e.target.value))}
            className="mt-2 w-full accent-[rgb(124,247,255)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/85">Altitude difference (km)</span>
            <span className="text-white/70">{altDiffKm.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={50.0}
            step={0.1}
            value={altDiffKm}
            onChange={(e) => setAltDiffKm(parseFloat(e.target.value))}
            className="mt-2 w-full accent-[rgb(124,247,255)]"
          />
        </div>
      </div>
    </div>
  );

  const riskResultRender = (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-8 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white/40 text-[10px] tracking-[0.24em] uppercase font-semibold">Current Assessment</div>
          <div className="mt-2 text-sm text-white/50">{status}</div>
        </div>
        <div className={`text-2xl font-semibold tracking-tight ${decisionBadge.cls}`}>{decisionBadge.label}</div>
      </div>

      <div className="mt-8 space-y-3 text-sm text-white/85">
        <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${decisionBadge.bgCls} transition-all duration-500 ease-out`}
            style={{ width: `${report ? clamp01(report.final_risk ?? report.collision_risk) * 100 : 0}%` }}
          />
        </div>
        {report?.rule_based_risk !== undefined && (
          <div className="flex items-center justify-between text-white/60">
            <span className="pl-1">↳ Rule-based Risk</span>
            <span>{pct(report.rule_based_risk)}</span>
          </div>
        )}
        {report?.ml_probability !== undefined && report.ml_probability !== null && (
          <div className="flex items-center justify-between text-white/60">
            <span className="pl-1">↳ ML Prediction</span>
            <span>{pct(report.ml_probability)} ({report.ml_classification})</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 text-sm">
        {/* Recommended Action Full Width */}
        <div className="rounded-2xl border border-white/5 bg-white/5 px-6 py-5 flex items-center justify-between">
          <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">Recommended Response</div>
          <div className="text-lg md:text-xl font-bold tracking-tight">{report ? report.decision.action.replaceAll("_", " ") : "—"}</div>
        </div>

        {/* 3 Metrics spread underneath */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-4 flex flex-col justify-between">
            <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-2">Min Distance</div>
            <div className="text-xl font-semibold text-white/90">{report ? km(report.min_distance_m) : "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-4 flex flex-col justify-between">
            <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-2">Time To Closest</div>
            <div className="text-xl font-semibold text-white/90">{report ? mins(report.time_to_closest_s) : "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-4 flex flex-col justify-between">
            <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-2">Confidence</div>
            <div className="text-xl font-semibold text-white/90">{report ? pct(report.confidence) : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const explainRender = report?.explain && (
    <div className="mt-6 rounded-3xl border border-white/5 bg-[#0b0e14] p-8 shadow-sm">
      <div className="text-white/40 text-[10px] tracking-[0.24em] uppercase font-semibold">Risk Drivers</div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Distance factor</span>
          <span className="text-xl font-semibold text-white/90">{pct(report.explain.distance_factor)}</span>
        </div>
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Speed factor</span>
          <span className="text-xl font-semibold text-white/90">{pct(report.explain.speed_factor)}</span>
        </div>
        <div className="flex flex-col gap-2 border-b border-white/5 pb-3">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Timing factor</span>
          <span className="text-xl font-semibold text-white/90">{pct(report.explain.tca_factor)}</span>
        </div>
      </div>
      {report.explain.notes?.length > 0 && (
        <ul className="mt-6 list-disc pl-5 text-[13px] text-white/50 space-y-2">
          {report.explain.notes.map((n, i) => (
            <li key={i} className="leading-relaxed">{n}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-space-950 pb-20">
      <Header />

      <div className="mx-auto max-w-7xl px-6 pt-16">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-4xl font-semibold tracking-tight text-white mb-2"
        >
          Mission Decision-Support
        </motion.h1>
        <p className="text-white/60 max-w-3xl mb-8">
          Hypothetical scenario modeling with instantaneous risk assessment, collision previews, and maneuver generation.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
          
          {/* LEFT COLUMN: Inputs & Results */}
          <div className="space-y-6">
            {inputsRender}
            {riskResultRender}
            {explainRender}
          </div>

          {/* RIGHT COLUMN: Visualizations */}
          <div className="space-y-6">
            {/* Collision Preview */}
            <div className="rounded-3xl border border-white/10 bg-black/20 p-8 h-[440px] flex flex-col shadow-lg">
              <div className="text-white/40 text-[10px] tracking-[0.24em] uppercase font-semibold mb-6 shrink-0">
                Collision Preview
              </div>
              <div className="flex-1 w-full rounded-2xl overflow-hidden relative shadow-inner ring-1 ring-white/5">
                {report ? (
                  <ScenarioVisualizer mode="collision" report={report} inputs={debounced} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">Waiting for scenario data...</div>
                )}
              </div>
            </div>

            {/* Avoidance Maneuver (Only High/Critical) */}
            {maneuver && report && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-8 rounded-3xl border border-orange-500/20 bg-orange-950/10 p-8 overflow-hidden shadow-lg"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  <div className="text-orange-400/60 text-[10px] tracking-[0.24em] uppercase font-semibold">
                    Avoidance Maneuver Preview
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                  {/* Maneuver details panel */}
                  <div className="bg-black/30 rounded-2xl p-6 border border-white/5 shadow-inner">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-4">Recommended Action</div>
                    <div className="text-xl font-semibold text-white mb-1">{maneuver.type}</div>
                    <div className="text-sm text-white/50 mb-6">{maneuver.direction} ({maneuver.angle}°)</div>

                    <div className="space-y-5">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Estimated Delta-v</div>
                        <div className="text-lg font-semibold text-white/90">{maneuver.deltaV.toFixed(2)} m/s</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Execution Window</div>
                        <div className="text-lg font-semibold text-white/90">In {Math.round(maneuver.executionWindow)} s</div>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Predicted Safe Separation</div>
                        <div className="text-lg font-semibold text-emerald-400">{km(maneuver.predictedSafeSeparation)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Predicted Residual Risk</div>
                        <div className="text-lg font-semibold text-emerald-400">{pct(maneuver.residualRisk)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Visualizer */}
                  <div className="h-[360px] rounded-2xl overflow-hidden relative shadow-inner ring-1 ring-white/5">
                    <ScenarioVisualizer mode="avoidance" report={report} inputs={debounced} maneuver={maneuver} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}