import type { Config } from 'tailwindcss'
export default {
  content: [
    './src/client/**/*.{html,ts,tsx}',
    './src/shared/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
} as Config
