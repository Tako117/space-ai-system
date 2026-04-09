// frontend/components/UIOverlay.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Header from "./Header";
import { useTranslation } from "react-i18next";

export default function UIOverlay() {
  const { t } = useTranslation();

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/65" />

      <Header overlay />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-6xl px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="max-w-2xl pointer-events-auto"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-2 backdrop-blur-md shadow-inner md:px-5">
              <span className="h-2 w-2 rounded-full bg-neon-500 shadow-glow animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-white/60">
                {t("landing.badge")}
              </span>
            </div>

            <h1 className="mt-8 text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.05] text-white">
              {t("landing.title")}
            </h1>

            <p className="mt-6 text-white/50 leading-relaxed text-lg md:text-xl font-light">
              {t("landing.description")}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/ai"
                className="inline-flex items-center justify-center rounded-xl bg-neon-500/15 border border-neon-500/30 px-8 py-4 text-[15px] font-semibold text-neon-400 shadow-glow hover:bg-neon-500/25 transition-all duration-300"
              >
                {t("landing.exploreButton")}
              </Link>
              <Link
                href="/animation"
                className="inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-8 py-4 text-[15px] font-medium text-white/80 hover:bg-white/15 hover:text-white transition-all duration-300"
              >
                {t("landing.watchButton")}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { k: t("landing.metrics.risk"), v: t("landing.metrics.riskValue") },
                { k: t("landing.metrics.ttc"), v: t("landing.metrics.ttcValue") },
                { k: t("landing.metrics.conf"), v: t("landing.metrics.confValue") },
              ].map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md shadow-inner"
                >
                  <div className="text-[10px] text-white/40 tracking-[0.24em] uppercase font-semibold">{m.k}</div>
                  <div className="mt-2 text-[15px] font-medium text-white/90">{m.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pb-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-white/50">
          <div>{t("landing.footer")}</div>
          <div className="hidden md:block">{t("landing.footerNav")}</div>
        </div>
      </div>
    </div>
  );
}
