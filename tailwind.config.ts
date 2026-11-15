import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080A0F",
        surface: "#10141D",
        elevated: "#151A24",
        line: "#252B38",
        navy: "#16254B",
        blue: "#2455FF",
        "lime-muted": "#A5BD4F",
        lime: "#D7FF3F",
        text: "#E7E8E3",
        muted: "#969CAA",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
        sans: ["var(--font-body)", "Arial", "sans-serif"],
      },
      animation: {
        marquee: "marquee 24s linear infinite",
      },
      keyframes: {
        marquee: { to: { transform: "translateX(-50%)" } },
      },
    },
  },
  plugins: [],
};
export default config;
