import type { Config } from "tailwindcss";

// Paleta y tipografía del Manual de Marca IBANOCHE (v1.0).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#12549A", // Azul corporativo — confianza, profesionalismo
          navy: "#0C3B70", // Variante oscura del azul para barra superior
          turquoise: "#32B8BE", // Turquesa — salud, tecnología, cercanía
          coral: "#E74758", // Coral — acento (uso ~3%)
          gray: "#F4F7FA", // Gris claro — fondos
          text: "#596A82", // Gris texto — textos secundarios
          ice: "#EAF2FA", // Tinte claro de azul
          mint: "#E7F7F8", // Tinte claro de turquesa
          blush: "#FDEDEF", // Tinte claro de coral
        },
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
        sans: ["var(--font-open-sans)", "Open Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(18, 84, 154, 0.18)",
        lift: "0 22px 45px -18px rgba(18, 84, 154, 0.32)",
        glow: "0 12px 28px -10px rgba(50, 184, 190, 0.55)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
