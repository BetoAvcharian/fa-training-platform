import type { Config } from 'tailwindcss'

/**
 * Tokens de la Fase 9. Regla dura, repetida acá para que no se pierda:
 * verde/ámbar/rojo/gris SOLO para estados, nunca decoración. navy/gold
 * son identidad de marca, no estados.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1E3F',
        gold: '#C6A55C',
        cream: '#F7F4EE',
        status: {
          positive: '#2E7D32',
          attention: '#B45309',
          critical: '#C62828',
          neutral: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'], // serif con carácter para récords/hitos — Fase 9
        sans: ['system-ui', 'sans-serif'],
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
