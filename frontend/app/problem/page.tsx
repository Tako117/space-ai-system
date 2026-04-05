//frontend/app/problem/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Header from "../../components/Header";
import SpaceScene from "../../components/SpaceScene";

export default function ProblemPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="relative">
        <div className="absolute inset-0 h-[520px]">
          <SpaceScene mode="problem" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-10">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-semibold tracking-tighter leading-tight max-w-4xl text-white"
          >
            The debris problem is accelerating.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-white/60 leading-relaxed text-lg lg:text-xl font-light"
          >
            Every launch, fragmentation event, and collision multiplies the number of tracked objects.
            In low Earth orbit, relative velocities are so extreme that even small fragments can disable
            satellites instantly — risking chain reactions known as the Kessler Syndrome.
          </motion.p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/animation"
              className="inline-flex items-center justify-center rounded-xl bg-neon-500/15 border border-neon-500/30 px-6 py-4 text-[15px] font-semibold text-neon-400 shadow-glow hover:bg-neon-500/25 transition-all duration-300"
            >
              Watch cinematic incident →
            </Link>
            <Link
              href="/orbit"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-6 py-4 text-[15px] font-medium text-white/80 hover:bg-white/15 transition-all duration-300"
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
              className="rounded-3xl border border-white/5 bg-black/20 backdrop-blur-md p-8 shadow-2xl"
            >
              <div className="text-neon-400 text-[10px] tracking-[0.24em] uppercase font-semibold">
                Risk Vector {i + 1}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white/95">{c.title}</h3>
              <p className="mt-3 text-white/60 leading-relaxed font-light">{c.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mt-12 rounded-3xl border border-neon-500/20 bg-neon-500/5 p-8 md:p-10 shadow-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-white">AI is the scaling solution.</h3>
              <p className="text-white/60 mt-2 text-lg font-light">
                We compute collision probability in real time and push warnings directly into the orbital visualization.
              </p>
            </div>
            <Link
              href="/ai"
              className="inline-flex items-center justify-center shrink-0 rounded-xl bg-neon-500/15 border border-neon-500/30 px-8 py-4 text-[15px] font-semibold text-neon-400 shadow-glow hover:bg-neon-500/25 transition-all duration-300"
            >
              Go to AI Engine →
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
