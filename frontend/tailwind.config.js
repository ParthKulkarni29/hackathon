/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 215 27.9% 16.9%))",
        input: "hsl(var(--input, 215 27.9% 16.9%))",
        ring: "hsl(var(--ring, 187 100% 50%))",
        background: "hsl(var(--background, 222 47% 6%))",
        foreground: "hsl(var(--foreground, 210 40% 98%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 187 100% 50%))",
          foreground: "hsl(var(--primary-foreground, 222 47% 6%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 217 32% 17%))",
          foreground: "hsl(var(--secondary-foreground, 210 40% 98%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 84.2% 60.2%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 217 32% 14%))",
          foreground: "hsl(var(--muted-foreground, 215 20.2% 65.1%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 217 32% 17%))",
          foreground: "hsl(var(--accent-foreground, 210 40% 98%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 222 47% 9%))",
          foreground: "hsl(var(--popover-foreground, 210 40% 98%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 222 47% 9%))",
          foreground: "hsl(var(--card-foreground, 210 40% 98%))",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.75rem)",
        md: "calc(var(--radius, 0.75rem) - 2px)",
        sm: "calc(var(--radius, 0.75rem) - 4px)",
      },
    },
  },
  plugins: [],
}
