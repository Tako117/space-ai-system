//frontend/app/scenario/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { postJSON } from "../../lib/api";

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

export default function ScenarioPage() {
  // Sliders (match screenshot ranges)
  const [closestKm, setClosestKm] = useState(50.0); // 0.1..500
  const [relVelKms, setRelVelKms] = useState(8.0); // 1..15
  const [tcaMin, setTcaMin] = useState(60.0); // 1..720
  const [altDiffKm, setAltDiffKm] = useState(5.0); // 0.1..50

  const debounced = useDebouncedValue({ closestKm, relVelKms, tcaMin, altDiffKm }, 180);

  const [report, setReport] = useState<PredictionResponse | null>(null);
  const [status, setStatus] = useState<string>("Move sliders to calculate risk…");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const run = async () => {
      const body: ScenarioRiskRequest = {
        closest_approach_km: debounced.closestKm,
        relative_velocity_kms: debounced.relVelKms,
        time_to_closest_min: debounced.tcaMin,
        altitude_difference_km: debounced.altDiffKm,
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
  }, [debounced.closestKm, debounced.relVelKms, debounced.tcaMin, debounced.altDiffKm]);

  const decisionBadge = useMemo(() => {
    if (!report) return { label: "—", cls: "text-white/60" };
    const sev = report.decision.severity;
    const cls =
      sev === "CRITICAL"
        ? "text-red-300"
        : sev === "HIGH"
        ? "text-orange-300"
        : sev === "MEDIUM"
        ? "text-yellow-300"
        : "text-emerald-300";
    const label = `${sev} • ${pct(report.collision_risk)}`;
    return { label, cls };
  }, [report]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <span className="tracking-tight font-semibold">Scenario Control</span>
          </div>
          <nav className="flex gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Landing</Link>
            <Link className="hover:text-white" href="/problem">Problem</Link>
            <Link className="hover:text-white" href="/orbit">Orbit</Link>
            <Link className="hover:text-white" href="/ai">AI Engine</Link>
            <Link className="text-white" href="/scenario">Scenario</Link>
            <Link className="hover:text-white" href="/animation">Animation</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl md:text-5xl font-semibold tracking-tight"
        >
          Hypothetical collision risk (slider-driven)
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="mt-3 max-w-3xl text-white/80 leading-relaxed"
        >
          This page does NOT depend on orbit telemetry. It calculates risk from the scenario sliders directly:
          closest approach, relative velocity, time-to-closest, and altitude difference.
        </motion.p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* Left: Results */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">Live result</div>
                <div className="mt-2 text-sm text-white/60">{status}</div>
              </div>
              <div className={`text-sm font-semibold ${decisionBadge.cls}`}>{decisionBadge.label}</div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-xs tracking-[0.24em] uppercase text-white/55">Inputs</div>
                <div className="mt-3 space-y-2 text-sm text-white/85">
                  <div className="flex items-center justify-between">
                    <span>Closest approach</span>
                    <span className="font-semibold">{closestKm.toFixed(2)} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Relative velocity</span>
                    <span className="font-semibold">{relVelKms.toFixed(2)} km/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time to closest</span>
                    <span className="font-semibold">{tcaMin.toFixed(1)} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Altitude difference</span>
                    <span className="font-semibold">{altDiffKm.toFixed(2)} km</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-xs tracking-[0.24em] uppercase text-white/55">Risk</div>

                <div className="mt-3 space-y-3 text-sm text-white/85">
                  <div className="flex items-center justify-between">
                    <span>Collision risk</span>
                    <span className="font-semibold">{report ? pct(report.collision_risk) : "—"}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-danger-500"
                      style={{ width: `${report ? clamp01(report.collision_risk) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Min distance</span>
                    <span className="font-semibold">{report ? km(report.min_distance_m) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Relative speed</span>
                    <span className="font-semibold">{report ? kms(report.relative_speed_mps) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>TCA</span>
                    <span className="font-semibold">{report ? mins(report.time_to_closest_s) : "—"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Confidence</span>
                    <span className="font-semibold">{report ? pct(report.confidence) : "—"}</span>
                  </div>

                  <div className="mt-2 text-sm">
                    Decision:{" "}
                    <span className="font-semibold text-white">
                      {report ? report.decision.action.replaceAll("_", " ") : "—"}
                    </span>{" "}
                    <span className="text-white/60">({report ? report.decision.severity : "—"})</span>
                  </div>
                </div>
              </div>
            </div>

            {report?.explain && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-xs tracking-[0.24em] uppercase text-white/55">Explainability</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Distance</div>
                    <div className="mt-1 font-semibold">{pct(report.explain.distance_factor)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Speed</div>
                    <div className="mt-1 font-semibold">{pct(report.explain.speed_factor)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Timing</div>
                    <div className="mt-1 font-semibold">{pct(report.explain.tca_factor)}</div>
                  </div>
                </div>

                {report.explain.notes?.length > 0 && (
                  <ul className="mt-3 list-disc pl-5 text-sm text-white/70 space-y-1">
                    {report.explain.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">Controls</div>

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

              <div className="pt-3 border-t border-white/10 text-xs text-white/65 leading-relaxed">
                Note: This is a hypothetical calculator (not SGP4). It is designed to be responsive and produce
                a wide risk range.
              </div>

              <Link
                href="/orbit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
              >
                Back to Orbit View →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}