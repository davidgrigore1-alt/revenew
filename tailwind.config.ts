import type { Config } from "tailwindcss";

const semanticColor = (token: string) => `rgb(var(--${token}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: semanticColor("background"),
        "background-soft": semanticColor("background-soft"),
        foreground: semanticColor("foreground"),
        surface: {
          DEFAULT: semanticColor("surface"),
          subtle: semanticColor("surface-subtle"),
          muted: semanticColor("surface-muted"),
          elevated: semanticColor("surface-elevated")
        },
        "border-strong": semanticColor("border-strong"),
        "text-secondary": semanticColor("text-secondary"),
        "text-muted": semanticColor("text-muted"),
        "text-faint": semanticColor("text-faint"),
        brand: {
          50: semanticColor("brand-50"),
          100: semanticColor("brand-100"),
          300: semanticColor("brand-300"),
          400: semanticColor("brand-400"),
          500: semanticColor("brand-500"),
          600: semanticColor("brand-600"),
          700: semanticColor("brand-700"),
          800: semanticColor("brand-800"),
          900: semanticColor("brand-900"),
          950: semanticColor("brand-950")
        },
        status: {
          success: semanticColor("success-text"),
          info: semanticColor("info-text"),
          warning: semanticColor("warning-text"),
          danger: semanticColor("danger-text")
        },
        ink: {
          950: "#08090b",
          900: "#101114",
          850: "#16181d",
          800: "#1f2229"
        },
        gold: {
          700: semanticColor("gold-700"),
          500: semanticColor("gold-500"),
          400: semanticColor("brand-400"),
          300: semanticColor("gold-300"),
          100: semanticColor("gold-100")
        },
        mint: {
          500: semanticColor("brand-500"),
          400: semanticColor("brand-400"),
          300: semanticColor("brand-300"),
          200: semanticColor("brand-100"),
          100: semanticColor("brand-50")
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        metadata: ["0.75rem", { lineHeight: "1rem" }],
        body: ["0.875rem", { lineHeight: "1.375rem" }],
        "card-title": ["1rem", { lineHeight: "1.5rem" }],
        "section-title": ["1.25rem", { lineHeight: "1.75rem" }],
        "page-title": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }]
      },
      borderRadius: {
        control: "var(--radius-control)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        overlay: "var(--radius-overlay)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        modal: "var(--shadow-modal)",
        premium: "0 24px 80px rgba(0, 0, 0, 0.42)",
        glow: "0 0 42px rgb(var(--brand-500) / 0.16)"
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        normal: "var(--motion-normal)",
        slow: "var(--motion-slow)"
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasized: "var(--ease-emphasized)"
      }
    }
  },
  plugins: []
};

export default config;
