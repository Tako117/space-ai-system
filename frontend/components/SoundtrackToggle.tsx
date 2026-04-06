"use client";

import { useEffect, useRef, useState } from "react";

export default function SoundtrackToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const TARGET_VOLUME = 0.15; // 15% volume for subtle background presence
  const FADE_STEPS = 20;
  const FADE_INTERVAL_MS = 50;

  // Initialize audio and restore preference
  useEffect(() => {
    // We only mount the audio element once on the client
    const audio = new Audio("/The_Lonely_Terminal.mp3");
    audio.loop = true;
    audio.volume = 0; // start at 0 for fade
    audioRef.current = audio;

    const savedPref = localStorage.getItem("space_ai_soundtrack_enabled");
    if (savedPref === "true") {
      setIsPlaying(true);
      // Play and fade in
      audio.play().catch(() => {
        // Autoplay policy might block this if user hasn't interacted yet
        console.warn("Autoplay prevented until user interaction");
        setIsPlaying(false);
        localStorage.setItem("space_ai_soundtrack_enabled", "false");
      });
    }

    return () => {
      audio.pause();
      audio.src = "";
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  // Handle fading and play state when isPlaying changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    if (isPlaying) {
      audio.play().catch(console.error);
      const step = TARGET_VOLUME / FADE_STEPS;
      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume + step < TARGET_VOLUME) {
          audio.volume += step;
        } else {
          audio.volume = TARGET_VOLUME;
          clearInterval(fadeIntervalRef.current!);
        }
      }, FADE_INTERVAL_MS);
    } else {
      const step = audio.volume / FADE_STEPS;
      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume - step > 0) {
          audio.volume -= step;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeIntervalRef.current!);
        }
      }, FADE_INTERVAL_MS);
    }
  }, [isPlaying]);

  const togglePlayback = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    localStorage.setItem("space_ai_soundtrack_enabled", String(newState));
  };

  return (
    <button
      onClick={togglePlayback}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border px-4 py-2 text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-500 shadow-xl ${
        isPlaying
          ? "border-neon-500/40 bg-black/40 text-neon-400 backdrop-blur-md"
          : "border-white/10 bg-black/30 text-white/50 backdrop-blur-md hover:bg-black/50 hover:text-white/80"
      }`}
    >
      <div className="flex gap-1 items-end h-3">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`w-[2px] rounded-full bg-current transition-all duration-300 ${
              isPlaying ? "animate-pulse" : "h-[2px]"
            }`}
            style={{
              height: isPlaying ? `${Math.random() * 8 + 4}px` : "2px",
              animationDelay: `${bar * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span>{isPlaying ? "Sound On" : "Sound Off"}</span>
    </button>
  );
}
