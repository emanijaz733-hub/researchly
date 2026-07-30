import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFBFA",
        surface: "#FFFFFF",
        hairline: "#E7E6E1",
        ink: "#191917",
        muted: "#6F6E67",
        cobalt: "#2F4FD8",
        "cobalt-deep": "#2440B8",
        wash: "#EEF1FC",
        ok: "#2F7A4D",
        danger: "#C2402F",
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        field: "0 1px 2px rgba(25,25,23,0.04), 0 8px 24px rgba(25,25,23,0.05)",
        card: "0 1px 2px rgba(25,25,23,0.04)",
        overlay: "0 24px 64px rgba(25,25,23,0.18)",
      },
      maxWidth: { measure: "42rem" },
    },
  },
  plugins: [],
};
export default config;
