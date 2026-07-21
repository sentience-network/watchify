import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        stage: "var(--stage)",
        panel: "var(--panel)",
        mist: "var(--mist)",
        teal: "var(--teal)",
        "teal-soft": "var(--teal-soft)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
        line: "var(--line)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(45, 212, 191, 0.18)",
        bar: "0 -8px 32px rgba(0, 0, 0, 0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulsebar: {
          "0%, 100%": { opacity: "0.88" },
          "50%": { opacity: "1" },
        },
        "party-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0.45)" },
          "70%": { boxShadow: "0 0 0 14px rgba(45, 212, 191, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
        },
        "react-fly": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.7)" },
          "30%": { opacity: "1", transform: "translateY(-4px) scale(1.1)" },
          "100%": { opacity: "0", transform: "translateY(-28px) scale(0.9)" },
        },
        "live-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "slide-in": "slide-in 0.45s ease-out both",
        pulsebar: "pulsebar 2.2s ease-in-out infinite",
        "party-pulse": "party-pulse 1.8s ease-out infinite",
        "react-fly": "react-fly 0.9s ease-out both",
        "live-glow": "live-glow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
