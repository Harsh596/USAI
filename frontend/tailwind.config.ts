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
        canvas: "#070B14",
        surface: {
          50: "#1C2640",
          100: "#182238",
          200: "#131C30",
          300: "#0F1626",
          400: "#0B101C",
          500: "#070B14",
        },
        brand: {
          blue: "#38BDF8",
          indigo: "#6366F1",
          purple: "#A855F7",
          amber: "#F59E0B",
          emerald: "#10B981",
        }
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.25)",
        "glow-amber": "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        "glow-emerald": "0 0 25px -5px rgba(16, 185, 129, 0.25)",
      }
    },
  },
  plugins: [],
};
export default config;
