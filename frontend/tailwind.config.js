/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0a68f5",
        "primary-dark": "#095bd1",
        "primary-light": "#eff6ff",
        "background-light": "#f5f7f8",
        "background-dark": "#101722",
        "background-base": "#f5f7f8",
        "surface-card": "#FFFFFF",
        "border-subtle": "#E2E8F0",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
      boxShadow: {
        "soft": "0 2px 8px -2px rgba(64, 64, 64, 0.05), 0 0 4px -2px rgba(64, 64, 64, 0.02)",
        "hover": "0 10px 25px -5px rgba(64, 64, 64, 0.06), 0 8px 10px -6px rgba(64, 64, 64, 0.01)",
      }
    },
  },
  plugins: [],
}
