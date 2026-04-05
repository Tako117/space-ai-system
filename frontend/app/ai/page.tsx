// frontend/app/ai/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/Header";
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
  const [objectNames, setObjectNames] = useState<Record<string, string>>({});
  const [selectedSat, setSelectedSat] = useState<string>("");
  const [selectedDeb, setSelectedDeb] = useState<string>("");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [status, setStatus] = useState<string>("Waiting for WebSocket telemetry…");
  const wsRef = useRef<WebSocket | null>(null);

  // Keep a mutable reference to the latest selected IDs to use inside the closure
  const selectedSatRef = useRef(selectedSat);
  const selectedDebRef = useRef(selectedDeb);
  useEffect(() => {
    selectedSatRef.current = selectedSat;
    selectedDebRef.current = selectedDeb;
  }, [selectedSat, selectedDeb]);

  useEffect(() => {
    const handleMessage = (msg: TelemetryEnvelope) => {
      if (msg.type === "telemetry_state") {
        const names: Record<string, string> = {};
        msg.state.objects.forEach((o) => {
          if (o.name) names[o.id] = o.name;
        });
        setObjectNames((prev) => ({ ...prev, ...names }));

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
        const tgtSat = selectedSatRef.current;
        const tgtDeb = selectedDebRef.current;
        
        // Strict pair identity match.
        // Accept if it's explicitly our pair, or if we haven't selected anything yet.
        const isOurSat = !tgtSat || msg.report.satellite_id === tgtSat;
        const isOurDeb = !tgtDeb || msg.report.debris_id === tgtDeb;
        
        if (isOurSat && isOurDeb) {
          setReport(msg.report);
          setStatus("Live report updated");
        }
      }

      if (msg.type === "error") setStatus(msg.message);
    };

    const ws = connectSocket(handleMessage);

    wsRef.current = ws;

    return () => {
      try {
        ws.close();
      } catch {}
      disconnectSocket(handleMessage);
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When dropdown selection changes, tell backend to stream the selected pair.
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (!selectedSat || !selectedDeb) return;

    const payload = JSON.stringify({
      type: "select_pair",
      channel: "telemetry",
      satellite_id: selectedSat,
      debris_id: selectedDeb,
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => ws.send(payload);
      ws.addEventListener("open", onOpen, { once: true });
    }
  }, [selectedSat, selectedDeb]);

  const visible = useMemo(() => report, [report]);

  const decisionBadge = useMemo(() => {
    if (!visible) return { cls: "text-white/60", bgCls: "bg-white/10" };
    const sev = visible.decision.severity;
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
      
    return { cls, bgCls };
  }, [visible]);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
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
                        {objectNames[id] ? `${objectNames[id]} (${id})` : id}
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
                        {objectNames[id] ? `${objectNames[id]} (${id})` : id}
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

          <div className="rounded-3xl border border-white/5 bg-black/20 p-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-white/40 text-[10px] tracking-[0.24em] uppercase font-semibold">Current Assessment</div>
              <div className="text-sm font-medium text-white/50">{status}</div>
            </div>

            {!visible ? (
              <div className="mt-8 text-sm text-white/30">Waiting for WebSocket telemetry…</div>
            ) : (
              <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-8">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-inner">
                  <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
                    <div className="text-[10px] tracking-[0.24em] uppercase text-white/30 font-semibold">Active Pair</div>
                    <div className="text-lg text-white/80 leading-relaxed">
                      Sat: <span className="font-semibold text-white/95">{visible.satellite_name ? `${visible.satellite_name} (${visible.satellite_id})` : visible.satellite_id}</span>
                      <br />
                      Deb: <span className="font-semibold text-white/95">{visible.debris_name ? `${visible.debris_name} (${visible.debris_id})` : visible.debris_id}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-white/40">Final Risk</span>
                    <span className={`text-3xl font-semibold tracking-tight ${decisionBadge.cls}`}>
                      {pct(visible.final_risk ?? visible.collision_risk)}
                    </span>
                  </div>
                  
                  <div className="mt-4 h-2 w-full rounded-full bg-black/40 overflow-hidden ring-1 ring-white/5 inset-shadow">
                    <div
                      className={`h-full ${decisionBadge.bgCls} transition-all duration-500 ease-out`}
                      style={{ width: `${clamp01(visible.final_risk ?? visible.collision_risk) * 100}%` }}
                    />
                  </div>

                  <div className="mt-6 space-y-4 text-[13px] text-white/60">
                    {visible.rule_based_risk !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="pl-1">↳ Rule-based</span>
                        <span className="font-medium text-white/80">{pct(visible.rule_based_risk)}</span>
                      </div>
                    )}
                    {visible.ml_probability !== undefined && visible.ml_probability !== null && (
                      <div className="flex items-center justify-between">
                        <span className="pl-1">↳ ML Prediction</span>
                        <span className="font-medium text-white/80">{pct(visible.ml_probability)} ({visible.ml_classification})</span>
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                      <span>Min distance</span>
                      <span className="text-white/85">{visible.min_distance_m.toFixed(1)} m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Time to closest</span>
                      <span className="text-white/85">{visible.time_to_closest_s.toFixed(2)} s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Relative speed</span>
                      <span className="text-white/85">{visible.relative_speed_mps.toFixed(1)} m/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Confidence</span>
                      <span className="text-white/85">{pct(visible.confidence)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#0b0e14] p-6 shadow-sm">
                  <div className="text-white/40 text-[10px] tracking-[0.24em] uppercase font-semibold">Risk Drivers</div>

                  <div className="mt-4 text-[13px] text-white/50 leading-relaxed">
                    Risk is dominated by three measurable factors:
                    <ul className="mt-2 list-disc pl-5 space-y-1.5">
                      <li>distance vs threshold</li>
                      <li>relative speed at approach</li>
                      <li>how soon the approach happens</li>
                    </ul>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 text-sm">
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/30">Distance</div>
                      <div className="mt-1 text-lg font-semibold text-white/90">{pct(visible.explain.distance_factor)}</div>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/30">Speed</div>
                      <div className="mt-1 text-lg font-semibold text-white/90">{pct(visible.explain.speed_factor)}</div>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/30">Timing</div>
                      <div className="mt-1 text-lg font-semibold text-white/90">{pct(visible.explain.tca_factor)}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/30 mb-2">Recommended Response</div>
                    <div className={`text-lg font-semibold tracking-tight ${decisionBadge.cls}`}>
                      {visible.decision.action.replaceAll("_", " ")}
                    </div>
                    <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{visible.decision.severity}</div>
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