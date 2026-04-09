import "./global.css";
import type { Metadata } from "next";
import I18nProvider from "../components/I18nProvider";
import SoundtrackToggle from "../components/SoundtrackToggle";

export const metadata: Metadata = {
  title: "AI-Powered Space Debris Risk Detection",
  description:
    "Cinematic 3D + real-time AI collision-risk prediction engine for satellite ↔ debris safety.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

import { cookies } from "next/headers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = cookies();
  const lng = cookieStore.get("i18nextLng")?.value || "en";

  return (
    <html lang={lng}>
      <body className="min-h-screen antialiased font-sans">
        <I18nProvider locale={lng}>
          {children}
          <SoundtrackToggle />
        </I18nProvider>
      </body>
    </html>
  );
}
