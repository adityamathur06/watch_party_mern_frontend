/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#0b0b0b',
        bgLight: '#1a1a1a',
        accent: '#f97316',
        accentHover: '#ea580c',
        textSecondary: '#a1a1a1',
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      animation: {
        popIn: 'popIn 0.25s ease forwards',
      }
    },
  },
  plugins: [],
}