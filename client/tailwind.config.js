import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: { brand: colors.teal, ink: colors.slate },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -6px rgb(15 23 42 / 0.08)',
        pop: '0 20px 50px -12px rgb(15 23 42 / 0.35)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { rise: 'rise .18s ease-out' },
    },
  },
  plugins: [],
};
