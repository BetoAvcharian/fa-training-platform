import type { Config } from 'tailwindcss'

/**
 * Rediseño UI/UX (sin tocar lógica ni datos) — paleta deportiva
 * moderna en vez de navy/gold/cream. "navy" y "gold" se dejan como
 * nombres de token (así no hay que tocar los cientos de usos de
 * bg-navy/text-gold en toda la app) pero ahora apuntan a otros
 * colores: navy = azul deportivo primario, gold = naranja de
 * competencias/acento. verde/rojo siguen siendo solo para estados.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#2563EB',
        gold: '#F97316',
        cream: '#F8FAFC',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        outline: 'rgb(var(--color-outline) / <alpha-value>)',
        status: {
          positive: '#16A34A',
          attention: '#F97316',
          critical: '#DC2626',
          neutral: '#64748B',
        },
      },
      fontFamily: {
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // grilla de 4px, sin excepciones (Fase 9) — Tailwind ya trabaja
        // en base 4 por defecto, esto lo deja explícito como decisión
        // documentada, no accidental.
      },
    },
  },
  plugins: [],
}

export default config
