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
          DEFAULT: "#f6f4f3",
          deep: "#ebe6e3",
        },
        // Do Capella theo logo
        brand: {
          DEFAULT: "#b5303a",
          soft: "#d4545c",
          deep: "#8c2029",
        },
        wine: "#7a1f28",
        sage: "#5c6b4f",
      },
      fontFamily: {
        serif: ["Be Vietnam Pro", "system-ui", "sans-serif"],
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
