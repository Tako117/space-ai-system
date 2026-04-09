"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../lib/i18n";

export default function I18nProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  // Sync the instance language with the server-passed locale before rendering
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

  useEffect(() => {
    // When language changes via UI, also save it to cookie
    const handleLangChange = (lng: string) => {
      document.cookie = `i18nextLng=${lng}; path=/; max-age=31536000`;
      localStorage.setItem("i18nextLng", lng); // keeping localStorage for backward compatibility
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
