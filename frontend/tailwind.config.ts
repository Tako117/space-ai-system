import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#05070F",
          900: "#070B16",
          800: "#0B1022",
          700: "#101A33",
          200: "#A9B5D1",
        },
        neon: {
          500: "#7CF7FF",
          400: "#A7FFFB",
          600: "#36D7FF",
        },
        danger: {
          500: "#FF3B6B",
          600: "#E61F52",
        },
        ok: {
          500: "#39FF88",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(124, 247, 255, 0.25)",
        glowStrong: "0 0 40px rgba(124, 247, 255, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
