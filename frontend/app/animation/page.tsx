// frontend/app/animation/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../../components/Header";
import CinematicAnimationScene from "../../components/CinematicAnimationScene";

export default function AnimationPage() {
  const [restartKey, setRestartKey] = useState(0);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Storytelling sequence (plays once)
        </h1>

        <p className="mt-3 max-w-3xl text-white/80 leading-relaxed">
          A simple 3D cinematic: debris intersects a satellite and the satellite becomes non-operational.
          Use OrbitControls to inspect, and press restart if you want to rewatch.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setRestartKey((k) => k + 1)}
            className="inline-flex items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
          >
            Restart animation
          </button>

          <Link
            href="/ai"
            className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Go to AI Engine →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/20 h-[70vh] min-h-[520px] shadow-inner ring-1 ring-white/5">
          {/* key forces full remount = true restart */}
          <div key={restartKey} className="absolute inset-0">
            <CinematicAnimationScene />
          </div>

          <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/70">
            Tip: drag to rotate • scroll to zoom • right-click to pan
          </div>
        </div>
      </section>
    </main>
  );
}