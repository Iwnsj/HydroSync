/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#effefa',
          100: '#c7fff1',
          200: '#90ffe3',
          300: '#51f7d3',
          400: '#1de4bf',
          500: '#04c8a7',
          600: '#00a189',
          700: '#058070',
          800: '#0a655a',
          900: '#0d534b',
          950: '#003330',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        lift: '0 10px 25px -8px rgba(15, 23, 42, 0.18), 0 4px 10px -6px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'soft-ping': {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        attention: {
          '0%, 100%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.015)' },
          '60%': { transform: 'scale(0.995)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'soft-ping': 'soft-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        attention: 'attention 0.8s ease-out 2',
      },
    },
  },
  plugins: [],
}
