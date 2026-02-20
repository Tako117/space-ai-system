// frontend/app/orbit/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
    const cls =
      sev === "CRITICAL"
        ? "text-red-300"
        : sev === "HIGH"
        ? "text-orange-300"
        : sev === "MEDIUM"
        ? "text-yellow-300"
        : "text-emerald-300";
    return { label: `${sev} • ${pct(report.collision_risk)} risk`, cls };
  }, [report]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <span className="tracking-tight font-semibold">Orbital Visualization</span>
          </div>
          <nav className="flex gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Landing</Link>
            <Link className="hover:text-white" href="/problem">Problem</Link>
            <Link className="text-white" href="/orbit">Orbit</Link>
            <Link className="hover:text-white" href="/ai">AI Engine</Link>
            <Link className="hover:text-white" href="/scenario">Scenario</Link>
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
          Live orbit + collision telemetry
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="mt-3 max-w-3xl text-white/80 leading-relaxed"
        >
          Technical view. Streams multi-object state to the backend and renders velocity vectors,
          orbit paths, and closest-approach highlighting. Camera is fully movable.
        </motion.p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 h-[560px]">
            <SpaceScene
              mode="orbit"
              showDebris={showDebris}
              showPaths={showPaths}
              onReport={(r) => setReport(r)}
            />

            {/* HTML overlay telemetry */}
            <div className="absolute left-4 right-4 bottom-4 pointer-events-none">
              <div className="rounded-2xl border border-white/10 bg-black/35 backdrop-blur-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs tracking-[0.24em] uppercase text-white/60">
                    Closest Approach
                  </div>
                  <div className={`text-xs font-semibold ${badge.cls}`}>{badge.label}</div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Risk</div>
                    <div className="mt-1 font-semibold">
                      {report ? pct(report.collision_risk) : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Confidence</div>
                    <div className="mt-1 font-semibold">
                      {report ? pct(report.confidence) : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Min distance</div>
                    <div className="mt-1 font-semibold">
                      {report ? `${report.min_distance_m.toFixed(1)} m` : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">TCA</div>
                    <div className="mt-1 font-semibold">
                      {report ? `${report.time_to_closest_s.toFixed(2)} s` : "—"}
                    </div>
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
