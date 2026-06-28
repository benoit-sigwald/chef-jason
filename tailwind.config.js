/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#f3ece0',
        paper2: '#e7dcc8',
        card: '#fffdf8',
        ink: '#1b1610',
        ink2: '#5e5648',
        gold: '#b88a3c',
        gold2: '#8f6726',
        copper: '#a15a33',
        nardo: { light: '#e4e5e7', DEFAULT: '#d6d8da', dark: '#c9cbce' },
      },
      boxShadow: {
        soft: '0 10px 30px -16px rgba(40,30,12,0.30)',
        lift: '0 28px 64px -34px rgba(40,30,12,0.45)',
      },
    },
  },
  plugins: [],
};
