import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1F23',
        depot: '#2F5D50',      // deep green — operations/depot identity
        ledger: '#8A5A2B',     // warm brown — accounting/ledger identity
        fuel: '#B8542B',       // burnt orange — fuel identity
        surface: '#F7F5F1',
        // New colors for updated design
        phelix: {
          dark: '#0a4d3c',     // dark teal/green
          medium: '#1a6b5a',   // medium teal/green
          light: '#2d8a7a',    // light teal/green
          accent: '#3dd5be'    // accent teal
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif']
      },
      backgroundImage: {
        'phelix-gradient': 'linear-gradient(135deg, #0a4d3c 0%, #1a6b5a 50%, #2d8a7a 100%)',
      }
    }
  },
  plugins: []
} satisfies Config
