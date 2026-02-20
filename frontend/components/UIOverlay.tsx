// frontend/components/UIOverlay.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function UIOverlay() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/65" />

      <div className="absolute left-0 right-0 top-0">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <div className="text-sm font-semibold tracking-tight text-white/90">
              AI Space Safety Stack
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm text-white/70 pointer-events-auto">
            <Link className="hover:text-white transition" href="/problem">Problem</Link>
            <Link className="hover:text-white transition" href="/orbit">Orbit</Link>
            <Link className="hover:text-white transition" href="/ai">AI Engine</Link>
            <Link className="hover:text-white transition" href="/scenario">Scenario</Link>
            <Link className="hover:text-white transition" href="/animation">Animation</Link>
          </nav>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-6xl px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="max-w-2xl pointer-events-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-neon-500 shadow-glow" />
              <span className="text-xs tracking-[0.24em] uppercase text-white/70">
                Real-time risk prediction
              </span>
            </div>

            <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
              AI-Powered Space Debris Risk Detection
            </h1>

            <p className="mt-4 text-white/80 leading-relaxed text-base md:text-lg">
              A cinematic 3D orbital system backed by a real collision-risk engine.
              Live vector telemetry drives on-screen alerts and satellite failure behavior.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/ai"
                className="inline-flex items-center justify-center rounded-xl bg-neon-500/15 border border-neon-500/30 px-6 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/20 transition"
              >
                Explore the System →
              </Link>
              <Link
                href="/animation"
                className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition"
              >
                Watch Cinematic Sequence
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { k: "Risk", v: "0–1 score" },
                { k: "TTC", v: "time-to-closest" },
                { k: "Conf.", v: "prediction confidence" },
              ].map((m) => (
                <div
                  key={m.k}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm"
                >
                  <div className="text-xs text-white/55 tracking-[0.18em] uppercase">{m.k}</div>
                  <div className="mt-1 text-sm font-semibold text-white/85">{m.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pb-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-white/50">
          <div>WebSocket telemetry • FastAPI • R3F • Physically believable motion</div>
          <div className="hidden md:block">Scroll / navigate for deep dive</div>
        </div>
      </div>
    </div>
  );
}
