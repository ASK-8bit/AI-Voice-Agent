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
        forest: {
          50: "#F1F6F3",
          100: "#DEEBE2",
          500: "#2D523E",
          600: "#244332",
          700: "#1E3A2B",
          800: "#162C21",
          900: "#0F1E16",
        },
        sage: {
          50: "#F4F7F2",
          100: "#E8EFE5",
          200: "#D3E0CD",
          300: "#B8CDB0",
          400: "#9EBA93",
          500: "#87A96B",
          600: "#6F8E54",
        },
        terracotta: {
          50: "#FAF3EF",
          100: "#F4E3D9",
          200: "#E7C5B1",
          500: "#C87D55",
          600: "#B3673F",
          700: "#8F4E2C",
        },
        cream: {
          50: "#FCFAF7",
          100: "#FAF7F2",
          200: "#F5EFEB",
          300: "#ECE2D8",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Playfair Display", "serif"],
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ripple": "ripple 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.95)", opacity: "0.8" },
          "50%": { transform: "scale(1.15)", opacity: "0.4" },
          "100%": { transform: "scale(0.95)", opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
