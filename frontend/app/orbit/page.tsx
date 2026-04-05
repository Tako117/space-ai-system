// frontend/app/orbit/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Header from "../../components/Header";
import SpaceScene from "../../components/SpaceScene";
import { useMemo, useState } from "react";
import type { RiskReport } from "../../lib/socket";

function pct(x: number) {
  return `${(Math.max(0, Math.min(1, x)) * 100).toFixed(1)}%`;
}

export default function OrbitPage() {
  const [showDebris, setShowDebris] = useState(true);
  const [showPaths, setShowPaths] = useState(true);

  const [report, setReport] = useState<RiskReport | null>(null);

  const badge = useMemo(() => {
    if (!report) return { label: "Waiting for telemetry…", cls: "text-white/60" };
    const sev = report.decision?.severity ?? "LOW";
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

    return { label: `${sev} • ${pct(report.final_risk ?? report.collision_risk)}`, cls };
  }, [report]);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl md:text-5xl font-semibold tracking-tight text-white"
        >
          Live orbit + collision telemetry
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="mt-4 max-w-3xl text-white/60 leading-relaxed font-light text-lg"
        >
          Technical view. Streams multi-object state to the backend and renders velocity vectors,
          orbit paths, and closest-approach highlighting. Camera is fully movable.
        </motion.p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/20 h-[520px] shadow-inner ring-1 ring-white/5">
              <SpaceScene
                mode="orbit"
                showDebris={showDebris}
                showPaths={showPaths}
                onReport={(r) => setReport(r)}
              />
            </div>

            {/* Assessment Panel Docked Below */}
            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-[10px] tracking-[0.24em] uppercase text-white/50 font-semibold">
                  Current Assessment
                </div>
                <div className={`text-lg font-semibold tracking-tight ${badge.cls}`}>{badge.label}</div>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">Final Risk</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report ? pct(report.final_risk ?? report.collision_risk) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">ML Model</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report?.ml_probability !== undefined && report.ml_probability !== null ? pct(report.ml_probability) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">Rule Engine</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report?.rule_based_risk !== undefined ? pct(report.rule_based_risk) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">Confidence</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report ? pct(report.confidence) : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">Min Distance</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report ? `${report.min_distance_m.toFixed(1)} m` : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col justify-between">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-white/40">TCA</div>
                  <div className="mt-2 text-lg font-semibold text-white/90">
                    {report ? `${report.time_to_closest_s.toFixed(2)} s` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">
              Layers & Tools
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/85">Show debris</span>
                <input
                  type="checkbox"
                  checked={showDebris}
                  onChange={(e) => setShowDebris(e.target.checked)}
                  className="h-5 w-5 accent-[rgb(124,247,255)]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/85">Show orbit paths</span>
                <input
                  type="checkbox"
                  checked={showPaths}
                  onChange={(e) => setShowPaths(e.target.checked)}
                  className="h-5 w-5 accent-[rgb(124,247,255)]"
                />
              </label>

              <div className="pt-2 border-t border-white/10">
                <div className="text-white/80 text-sm leading-relaxed">
                  What you&apos;re seeing
                  <ul className="mt-2 list-disc pl-5 text-white/70 space-y-1">
                    <li>Orbit paths (circular LEO approximation)</li>
                    <li>Velocity vectors (THREE.ArrowHelper)</li>
                    <li>Closest-approach marker (midpoint highlight)</li>
                    <li>Telemetry streamed to backend (multi-object)</li>
                  </ul>
                </div>
              </div>

              <Link
                href="/scenario"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
              >
                Open Scenario Controls →
              </Link>

              <Link
                href="/ai"
                className="inline-flex w-full items-center justify-center rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition"
              >
                Open AI Explainability →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
