import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        moutai: {
          50: '#fdf2f2',
          100: '#fce7e7',
          200: '#f9d2d2',
          300: '#f4adad',
          400: '#ec7d7d',
          500: '#e04f4f',
          600: '#cd3333',
          700: '#ac2626',
          800: '#8e2222',
          900: '#762323',
        }
      }
    },
  },
  plugins: [],
}

export default config
