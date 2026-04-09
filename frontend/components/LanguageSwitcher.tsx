"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[100px] h-[34px]" />; // Placeholder to prevent layout shift
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    router.refresh(); // Tell Server Components to re-fetch with new cookie
  };

  const currentLang = i18n.resolvedLanguage || 'en';

  return (
    <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1 backdrop-blur-md">
      {(['en', 'ru', 'kk'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => changeLanguage(lang)}
          className={`px-2.5 py-1 text-xs font-semibold uppercase rounded-md transition-all duration-300 ${
            currentLang === lang
              ? "bg-neon-500/20 text-neon-400 border border-neon-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
              : "text-white/40 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
