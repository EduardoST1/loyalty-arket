import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dulza: {
          chocolate: "#54433A",
          "chocolate-dark": "#3D2E28",
          cream: "#F5E6D3",
          "cream-light": "#FAF7F2",
          coffee: "#6B4E3D",
          cookie: "#D4A574",
          jade: "#1B5E52",
          "jade-light": "#2A8070",
          "jade-dark": "#134A40",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
        display: ["system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card: "0 24px 64px -12px rgba(84, 67, 58, 0.18)",
        phone: "0 40px 80px -20px rgba(27, 94, 82, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
