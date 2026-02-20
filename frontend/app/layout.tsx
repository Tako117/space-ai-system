// frontend/app/layout.tsx
import "./global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-Powered Space Debris Risk Detection",
  description:
    "Cinematic 3D + real-time AI collision-risk prediction engine for satellite ↔ debris safety.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
