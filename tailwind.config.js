/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./config/**/*.{js,ts,jsx,tsx}",
    "./constants/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0252CD',
          light: '#E6F0FF',
          dark: '#003A96',
        },
        secondary: {
          DEFAULT: '#FFA500',
        },
        neutral: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#A0AEC0',
          600: '#718096',
          700: '#4A5568',
          800: '#2D3748',
          900: '#1A202C',
        },
      },
      screens: {
        'xs': '375px',
        'landscape': { 'raw': '(orientation: landscape) and (max-height: 500px)' },
        'tablet-landscape': { 'raw': '(orientation: landscape) and (min-width: 768px) and (max-width: 1024px)' },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        imageFade: {
          '0%': { opacity: '0.6' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'image-fade': 'imageFade 0.4s ease-in-out',
      },
    }
  },
  plugins: [],
}
