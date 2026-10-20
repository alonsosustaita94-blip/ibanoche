import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Identidad IBANOCHE: azul #12549A, turquesa #32B8BE, coral #E74758,
// blanco, gris claro #F4F7FA y gris de texto #596A82.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem" },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        brand: {
          blue: "#12549A",
          navy: "#0C3B70",
          turquoise: "#32B8BE",
          coral: "#E74758",
          gray: "#F4F7FA",
          text: "#596A82",
          ink: "#13294B",
          ice: "#EAF2FA",
          mint: "#E7F7F8",
          blush: "#FDEDEF",
          green: "#1E9E6A",
          greenSoft: "#E6F6EF",
          amber: "#C98A12",
          amberSoft: "#FDF5E3",
        },
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
        sans: ["var(--font-open-sans)", "Open Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        xl: "16px",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(18, 84, 154, 0.18)",
        lift: "0 22px 45px -18px rgba(18, 84, 154, 0.32)",
        glow: "0 12px 28px -10px rgba(50, 184, 190, 0.55)",
        card: "0 1px 2px rgba(19, 41, 75, 0.04), 0 4px 16px -6px rgba(18, 84, 154, 0.10)",
        pop: "0 12px 32px -12px rgba(18, 84, 154, 0.28)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(18px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
