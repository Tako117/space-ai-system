// frontend/app/ai/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { connectSocket, disconnectSocket, RiskReport, TelemetryEnvelope, PublishedState } from "../../lib/socket";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function pct(x: number) {
  return `${(clamp01(x) * 100).toFixed(1)}%`;
}

export default function AIEnginePage() {
  const [satIds, setSatIds] = useState<string[]>([]);
  const [debIds, setDebIds] = useState<string[]>([]);
  const [selectedSat, setSelectedSat] = useState<string>("");
  const [selectedDeb, setSelectedDeb] = useState<string>("");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [status, setStatus] = useState<string>("Waiting for WebSocket telemetry…");

  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const ws = connectSocket((msg: TelemetryEnvelope) => {
      if (msg.type === "telemetry_state") {
        const state: PublishedState = msg.state;

        const sats = state.objects.filter((o) => o.kind === "satellite").map((o) => o.id);
        const debs = state.objects.filter((o) => o.kind === "debris").map((o) => o.id);

        setSatIds(sats);
        setDebIds(debs);

        const map: Record<string, string> = {};
        for (const o of state.objects) {
          if (o.name) map[o.id] = o.name;
        }
        setNameMap(map);

        if (!selectedSat && sats[0]) setSelectedSat(sats[0]);
        if (!selectedDeb && debs[0]) setSelectedDeb(debs[0]);

        setStatus("Streaming state…");
      }

      if (msg.type === "telemetry_report") {
        setReport(msg.report);
        setStatus("Live report updated");
      }

      if (msg.type === "error") {
        setStatus(msg.message);
      }
    });

    return () => {
      // NOTE: don't double-close shared socket; disconnectSocket handles it
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (!report) return null;
    return report;
  }, [report]);

  const satLabel = useMemo(() => {
    if (!visible) return "—";
    return visible.satellite_name || nameMap[visible.satellite_id] || visible.satellite_id;
  }, [visible, nameMap]);

  const debLabel = useMemo(() => {
    if (!visible) return "—";
    return visible.debris_name || nameMap[visible.debris_id] || visible.debris_id;
  }, [visible, nameMap]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <span className="tracking-tight font-semibold">AI Risk & Detection Engine</span>
          </div>
          <nav className="flex gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Landing</Link>
            <Link className="hover:text-white" href="/problem">Problem</Link>
            <Link className="hover:text-white" href="/orbit">Orbit</Link>
            <Link className="text-white" href="/ai">AI Engine</Link>
            <Link className="hover:text-white" href="/scenario">Scenario</Link>
            <Link className="hover:text-white" href="/animation">Animation</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-12">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl md:text-5xl font-semibold tracking-tight"
        >
          Explainable collision risk — computed automatically
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="mt-3 max-w-3xl text-white/80 leading-relaxed"
        >
          This page shows the best/closest satellite–debris pair and the decision output. Names come from the
          TLE files (not placeholders).
        </motion.p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">Selection</div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-white/85 mb-2">Satellite</div>
                <select
                  value={selectedSat}
                  onChange={(e) => setSelectedSat(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85 outline-none focus:border-neon-500/40"
                >
                  {satIds.length === 0 ? (
                    <option value="">Waiting for telemetry…</option>
                  ) : (
                    satIds.map((id) => (
                      <option key={id} value={id}>
                        {nameMap[id] ? `${nameMap[id]} (${id})` : id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="text-sm text-white/85 mb-2">Debris</div>
                <select
                  value={selectedDeb}
                  onChange={(e) => setSelectedDeb(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85 outline-none focus:border-neon-500/40"
                >
                  {debIds.length === 0 ? (
                    <option value="">Waiting for telemetry…</option>
                  ) : (
                    debIds.map((id) => (
                      <option key={id} value={id}>
                        {nameMap[id] ? `${nameMap[id]} (${id})` : id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-xs text-white/65 leading-relaxed">
                Backend is broadcasting real TLE propagation every ~2s. Orbit/Scenario pages can still publish
                synthetic states if you want, but TLE stream is now the default truth.
              </div>

              <Link
                href="/orbit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
              >
                Open Orbit View →
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">Live Report</div>
              <div className="text-xs text-white/60">{status}</div>
            </div>

            {!visible ? (
              <div className="mt-6 text-sm text-white/70">Waiting for WebSocket telemetry…</div>
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs tracking-[0.24em] uppercase text-white/55">Pair</div>

                  <div className="mt-2 text-sm text-white/85">
                    Satellite: <span className="font-semibold">{satLabel}</span>
                    <div className="text-xs text-white/50 mt-1">{visible.satellite_id}</div>
                    <br />
                    Debris: <span className="font-semibold">{debLabel}</span>
                    <div className="text-xs text-white/50 mt-1">{visible.debris_id}</div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-white/80">
                    <div className="flex items-center justify-between">
                      <span>Risk</span>
                      <span className="font-semibold">{pct(visible.collision_risk)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Min distance</span>
                      <span className="font-semibold">{visible.min_distance_m.toFixed(1)} m</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Time to closest</span>
                      <span className="font-semibold">{visible.time_to_closest_s.toFixed(2)} s</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Relative speed</span>
                      <span className="font-semibold">{visible.relative_speed_mps.toFixed(1)} m/s</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{pct(visible.confidence)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs tracking-[0.24em] uppercase text-white/55">Explainability</div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Distance</div>
                      <div className="mt-1 font-semibold">{pct(visible.explain.distance_factor)}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Speed</div>
                      <div className="mt-1 font-semibold">{pct(visible.explain.speed_factor)}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Timing</div>
                      <div className="mt-1 font-semibold">{pct(visible.explain.tca_factor)}</div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm">
                    Decision:{" "}
                    <span className="font-semibold text-white">
                      {visible.decision.action.replaceAll("_", " ")}
                    </span>{" "}
                    <span className="text-white/60">({visible.decision.severity})</span>
                  </div>

                  {visible.explain.notes?.length ? (
                    <ul className="mt-3 list-disc pl-5 text-sm text-white/70 space-y-1">
                      {visible.explain.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}