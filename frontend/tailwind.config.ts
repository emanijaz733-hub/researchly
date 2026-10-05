import type { Config } from "tailwindcss";

/**
 * Researchly theme: aged research paper, ink, and red pen.
 *
 * The old token names (paper, surface, hairline, ink, muted, cobalt, wash...)
 * are kept on purpose and only their values changed, so any page that still
 * uses them picks up the new look without edits. "cobalt" is now red ink.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        desk: "#2E2118",
        paper: "#EFE3C6",
        surface: "#F4EAD2",
        hairline: "#CDB991",
        rule: "#6B5640",
        ink: "#2B2117",
        muted: "#5E4E3A",
        cobalt: "#9A2B1C",
        "cobalt-deep": "#6E1D12",
        redink: "#9A2B1C",
        "redink-deep": "#6E1D12",
        wash: "#E7D6AE",
        memo: "#F3E6B8",
        ok: "#3B6D2A",
        danger: "#9A2B1C",
      },
      fontFamily: {
        display: ["'EB Garamond'", "Georgia", "serif"],
        sans: ["'EB Garamond'", "Georgia", "serif"],
        mono: ["'Special Elite'", "ui-monospace", "monospace"],
        hand: ["Caveat", "cursive"],
      },
      boxShadow: {
        field: "none",
        card: "inset 0 0 30px rgba(95,55,18,0.18)",
        overlay: "0 24px 60px rgba(0,0,0,0.45)",
        sheet: "inset 0 0 80px rgba(95,55,18,0.38), inset 0 0 20px rgba(70,38,10,0.5), 0 30px 60px rgba(0,0,0,0.55)",
      },
      maxWidth: { measure: "40rem" },
    },
  },
  plugins: [],
};
export default config;
