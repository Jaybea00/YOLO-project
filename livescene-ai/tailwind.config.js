/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C63FF",
          light: "#8B85FF",
          dark: "#4B44CC",
        },
        neon: {
          cyan: "#00F5FF",
          purple: "#BF5AF2",
          green: "#32D74B",
          orange: "#FF9F0A",
          red: "#FF453A",
        },
        dark: {
          900: "#0A0A0F",
          800: "#111118",
          700: "#1A1A27",
          600: "#242433",
          500: "#2E2E42",
          400: "#3D3D55",
          300: "#54546E",
        },
        glass: "rgba(255,255,255,0.05)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Syne", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108,99,255,0.3), transparent)",
        "card-glow":
          "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,245,255,0.05))",
      },
      boxShadow: {
        "glow-brand": "0 0 20px rgba(108,99,255,0.4)",
        "glow-cyan": "0 0 20px rgba(0,245,255,0.3)",
        "glow-green": "0 0 20px rgba(50,215,75,0.3)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
        card: "0 4px 24px rgba(0,0,0,0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        typing: "typing 1.5s steps(30) infinite",
        "scan-line": "scanLine 3s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(108,99,255,0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(108,99,255,0.7)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scanLine: {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      spacing: {
        128: "32rem",
        144: "36rem",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
