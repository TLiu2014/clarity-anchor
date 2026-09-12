import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens for the four ThoughtNode states.
        state: {
          pending: "#9ca3af",  // gray-400
          thinking: "#3b82f6", // blue-500
          erp: "#eab308",      // yellow-500
          resolved: "#22c55e", // green-500
        },
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
