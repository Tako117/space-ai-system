"use client";

import SpaceScene from "../components/SpaceScene";
import UIOverlay from "../components/UIOverlay";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <SpaceScene mode="landing" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <UIOverlay />
      </div>
    </main>
  );
}
