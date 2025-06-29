import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Theme Colors System
        brand: {
          blue: "hsl(var(--brand-blue))",
          purple: "hsl(var(--brand-purple))",
          green: "hsl(var(--brand-green))",
          pink: "hsl(var(--brand-pink))",
          orange: "hsl(var(--brand-orange))",
        },
        feature: {
          primary: "hsl(var(--feature-primary))",
          secondary: "hsl(var(--feature-secondary))",
          tertiary: "hsl(var(--feature-tertiary))",
        },
        level: {
          0: "hsl(var(--level-0))",
          1: "hsl(var(--level-1))",
          2: "hsl(var(--level-2))",
          3: "hsl(var(--level-3))",
        },
        status: {
          success: "hsl(var(--status-success))",
          warning: "hsl(var(--status-warning))",
          error: "hsl(var(--status-error))",
          info: "hsl(var(--status-info))",
          loading: "hsl(var(--status-loading))",
        },
        nav: {
          text: "hsl(var(--nav-text))",
          "text-hover": "hsl(var(--nav-text-hover))",
          background: "hsl(var(--nav-background))",
        },
        glass: {
          background: "hsl(var(--glass-background))",
          border: "hsl(var(--glass-border))",
          hover: "hsl(var(--glass-hover))",
        },
        ui: {
          primary: "hsl(var(--ui-text-primary))",
          secondary: "hsl(var(--ui-text-secondary))",
          muted: "hsl(var(--ui-text-muted))",
          disabled: "hsl(var(--ui-text-disabled))",
        },
        orb: {
          blue: "hsl(var(--orb-blue))",
          purple: "hsl(var(--orb-purple))",
          pink: "hsl(var(--orb-pink))",
        },
        interactive: {
          hover: "hsl(var(--interactive-hover))",
          active: "hsl(var(--interactive-active))",
          disabled: "hsl(var(--interactive-disabled))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
