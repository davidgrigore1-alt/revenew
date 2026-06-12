import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090b",
          900: "#101114",
          850: "#16181d",
          800: "#1f2229"
        },
        gold: {
          500: "#d6a84f",
          400: "#edc776"
        },
        mint: {
          500: "#2fd19b",
          400: "#62e5bb"
        }
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0, 0, 0, 0.42)",
        glow: "0 0 36px rgba(47, 209, 155, 0.16)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
