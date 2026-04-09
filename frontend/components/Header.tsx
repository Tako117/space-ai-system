"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { href: "/", label: t("header.landing") },
    { href: "/problem", label: t("header.problem") },
    { href: "/orbit", label: t("header.orbit") },
    { href: "/ai", label: t("header.aiEngine") },
    { href: "/scenario", label: t("header.scenario") },
    { href: "/animation", label: t("header.animation") },
  ];

  return (
    <header
      className={`${
        overlay
          ? "absolute left-0 right-0 top-0 z-50 pointer-events-auto"
          : "sticky top-0 z-40 border-b border-white/5 bg-[#05070f]/80 backdrop-blur-xl"
      }`}
    >
      <div className={`mx-auto max-w-7xl px-6 py-5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-neon-500 shadow-glow animate-pulse" />
          <span className="tracking-wide font-medium text-white/95 text-sm uppercase">
            {pathname === "/" ? t("header.titleLanding") : t("header.titleDefault")}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium mr-4">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 transition-all duration-300 rounded-lg ${
                  isActive
                    ? "text-white bg-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

