"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SpaceScene from "../../components/SpaceScene";

export default function ProblemPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow" />
            <span className="tracking-tight font-semibold">
              Space Debris Risk Detection
            </span>
          </div>
          <nav className="flex gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/">Landing</Link>
            <Link className="text-white" href="/problem">Problem</Link>
            <Link className="hover:text-white" href="/orbit">Orbit</Link>
            <Link className="hover:text-white" href="/ai">AI Engine</Link>
            <Link className="hover:text-white" href="/scenario">Scenario</Link>
            <Link className="hover:text-white" href="/animation">Animation</Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 h-[520px]">
          <SpaceScene mode="problem" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-10">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-4xl md:text-6xl font-semibold tracking-tight"
          >
            The debris problem is accelerating.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="mt-4 max-w-2xl text-white/80 leading-relaxed"
          >
            Every launch, fragmentation event, and collision multiplies the number of tracked objects.
            In low Earth orbit, relative velocities are so extreme that even small fragments can disable
            satellites instantly — risking chain reactions known as the Kessler Syndrome.
          </motion.p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/animation"
              className="inline-flex items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
            >
              Watch cinematic incident →
            </Link>
            <Link
              href="/orbit"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition"
            >
              Open live telemetry
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Exponential growth",
              body:
                "More satellites, more launches, more fragmentation. The risk surface expands faster than manual monitoring can keep up.",
            },
            {
              title: "Kessler Syndrome",
              body:
                "Collisions generate debris that causes more collisions — a cascade that can make key orbits unusable for decades.",
            },
            {
              title: "High-energy impacts",
              body:
                "Orbital objects can close at ~7–14 km/s. A small bolt carries the destructive energy of a high-speed projectile.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            >
              <div className="text-neon-400 text-xs tracking-[0.24em] uppercase">
                Risk Vector {i + 1}
              </div>
              <h3 className="mt-2 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-white/75 leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mt-10 rounded-2xl border border-white/10 bg-space-900/40 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">AI is the scaling solution.</h3>
              <p className="text-white/75 mt-1">
                We compute collision probability in real time and push warnings directly into the orbital visualization.
              </p>
            </div>
            <Link
              href="/ai"
              className="inline-flex items-center justify-center rounded-xl bg-neon-500/10 border border-neon-500/30 px-5 py-3 text-sm font-semibold text-neon-400 shadow-glow hover:bg-neon-500/15 transition"
            >
              Go to AI Engine →
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
