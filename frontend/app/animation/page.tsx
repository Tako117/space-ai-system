"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import CinematicAnimationScene from "../../components/CinematicAnimationScene";

export default function AnimationPage() {
  const [runId, setRunId] = useState(1);
  const [ended, setEnded] = useState(false);

  const sceneKey = useMemo(() => `cinematic-${runId}`, [runId]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <span className="tracking-tight font-semibold">Cinematic Collision Sequence</span>
          </div>
          <nav className="flex gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Landing</Link>
            <Link className="hover:text-white" href="/problem">Problem</Link>
            <Link className="hover:text-white" href="/orbit">Orbit</Link>
            <Link className="hover:text-white" href="/ai">AI Engine</Link>
            <Link className="hover:text-white" href="/scenario">Scenario</Link>
            <Link className="text-white" href="/animation">Animation</Link>
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
          Storytelling sequence (plays once)
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="mt-3 max-w-3xl text-white/80 leading-relaxed"
        >
          Rocket launches from Earth → orbital insertion → debris release → visible collision → satellite failure.
          You can rewatch by pressing Restart.
        </motion.p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 h-[680px]">
          <CinematicAnimationScene
            key={sceneKey}
            playOnce={true}
            onEnded={() => setEnded(true)}
          />

          {/* bottom overlay */}
          <div className="pointer-events-none absolute left-4 bottom-4 right-4">
            <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs tracking-[0.24em] uppercase text-white/60">Sequence</div>
                  <div className="mt-2 text-sm text-white/80">
                    Launch → Ascent → Orbital insertion → Debris release → Closing trajectory → Impact → Failure state
                  </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={() => {
                      setEnded(false);
                      setRunId((x) => x + 1);
                    }}
                    className="rounded-xl bg-neon-500/10 border border-neon-500/30 px-4 py-2 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
                  >
                    Restart
                  </button>
                </div>
              </div>

              {ended && (
                <div className="mt-3 text-xs text-white/65">
                  Finished. Press <span className="text-white/85 font-semibold">Restart</span> to replay.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
