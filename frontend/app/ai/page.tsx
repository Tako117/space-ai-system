// frontend/app/ai/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { connectSocket, disconnectSocket, RiskReport, TelemetryEnvelope } from "../../lib/socket";

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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = connectSocket((msg: TelemetryEnvelope) => {
      if (msg.type === "telemetry_state") {
        const sats = msg.state.objects
          .filter((o) => o.kind === "satellite")
          .map((o) => o.id);

        const debs = msg.state.objects
          .filter((o) => o.kind === "debris")
          .map((o) => o.id);

        setSatIds(sats);
        setDebIds(debs);

        setSelectedSat((prev) => prev || sats[0] || "");
        setSelectedDeb((prev) => prev || debs[0] || "");

        setStatus("Streaming state…");
      }

      if (msg.type === "telemetry_report") {
        setReport(msg.report);
        setStatus("Live report updated");
      }

      if (msg.type === "error") setStatus(msg.message);
    });

    wsRef.current = ws;

    return () => {
      try {
        ws.close();
      } catch {}
      disconnectSocket();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When dropdown selection changes, tell backend to stream the selected pair.
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (!selectedSat || !selectedDeb) return;
    if (ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "select_pair",
        channel: "telemetry",
        satellite_id: selectedSat,
        debris_id: selectedDeb,
      })
    );
  }, [selectedSat, selectedDeb]);

  const visible = useMemo(() => report, [report]);

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
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Explainable collision risk — computed automatically
        </h1>

        <p className="mt-3 max-w-3xl text-white/80 leading-relaxed">
          This page is a readable AI dashboard (not a JSON playground). It shows the selected satellite/debris
          pair, live computed values, dominant factors, and confidence rationale — updated continuously from
          WebSocket telemetry.
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
                        {id}
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
                        {id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="text-xs text-white/65 leading-relaxed">
                Streaming mode: orbit/scenario pages can publish synthetic states, but your backend also
                broadcasts real TLE propagation every ~2s.
              </div>

              <Link
                href="/orbit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
              >
                Open Orbit Telemetry →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
                    Satellite:{" "}
                    <span className="font-semibold">
                      {visible.satellite_name ? `${visible.satellite_name} (${visible.satellite_id})` : visible.satellite_id}
                    </span>
                    <br />
                    Debris:{" "}
                    <span className="font-semibold">
                      {visible.debris_name ? `${visible.debris_name} (${visible.debris_id})` : visible.debris_id}
                    </span>
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

                  <div className="mt-3 text-sm text-white/80 leading-relaxed">
                    Risk is dominated by three measurable factors:
                    <ul className="mt-2 list-disc pl-5 text-white/75 space-y-1">
                      <li>distance vs threshold</li>
                      <li>relative speed at approach</li>
                      <li>how soon the approach happens (time window)</li>
                    </ul>
                  </div>

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
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}