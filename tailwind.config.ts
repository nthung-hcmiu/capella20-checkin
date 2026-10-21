import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1a1613",
          soft: "#3b352e",
          muted: "#6b6255",
        },
        ivory: {
          DEFAULT: "#f7f3ec",
          deep: "#efe8db",
        },
        gold: {
          DEFAULT: "#b08d42",
          soft: "#c9a85f",
          deep: "#8a6d2f",
        },
        wine: "#6b2b36",
        sage: "#5c6b4f",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        sans: ["Be Vietnam Pro", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,22,19,0.04), 0 8px 24px rgba(26,22,19,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
