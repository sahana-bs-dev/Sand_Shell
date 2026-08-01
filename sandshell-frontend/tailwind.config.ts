import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        "card-hover": "rgb(var(--color-card-hover) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        "accent-blue": "rgb(var(--color-accent-blue) / <alpha-value>)",
        "accent-green": "rgb(var(--color-accent-green) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "grid-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "0.35" },
        },
      },
      animation: {
        blink: "blink 1s step-start infinite",
        "grid-fade": "grid-fade 1.2s ease forwards",
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle, rgba(139,148,158,0.18) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "22px 22px",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(88,166,255,0.35)",
        "glow-green": "0 0 30px -8px rgba(63,185,80,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
