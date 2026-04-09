//frontend/app/problem/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Header from "../../components/Header";
import SpaceScene from "../../components/SpaceScene";
import { useTranslation } from "react-i18next";

export default function ProblemPage() {
  const { t } = useTranslation();

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
            {t("problem.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-white/60 leading-relaxed text-lg lg:text-xl font-light"
          >
            {t("problem.p1")}
          </motion.p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/animation"
              className="inline-flex items-center justify-center rounded-xl bg-neon-500/15 border border-neon-500/30 px-6 py-4 text-[15px] font-semibold text-neon-400 shadow-glow hover:bg-neon-500/25 transition-all duration-300"
            >
              {t("problem.watchBtn")}
            </Link>
            <Link
              href="/orbit"
              className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-6 py-4 text-[15px] font-medium text-white/80 hover:bg-white/15 transition-all duration-300"
            >
              {t("problem.telemetryBtn")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: t("problem.v1Title"),
              body: t("problem.v1Body"),
            },
            {
              title: t("problem.v2Title"),
              body: t("problem.v2Body"),
            },
            {
              title: t("problem.v3Title"),
              body: t("problem.v3Body"),
            },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="rounded-3xl border border-white/5 bg-black/20 backdrop-blur-md p-8 shadow-2xl"
            >
              <div className="text-neon-400 text-[10px] tracking-[0.24em] uppercase font-semibold">
                {t("problem.riskVector")} {i + 1}
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
              <h3 className="text-2xl font-semibold text-white">{t("problem.aiTitle")}</h3>
              <p className="text-white/60 mt-2 text-lg font-light">
                {t("problem.aiBody")}
              </p>
            </div>
            <Link
              href="/ai"
              className="inline-flex items-center justify-center shrink-0 rounded-xl bg-neon-500/15 border border-neon-500/30 px-8 py-4 text-[15px] font-semibold text-neon-400 shadow-glow hover:bg-neon-500/25 transition-all duration-300"
            >
              {t("problem.goAiBtn")}
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
