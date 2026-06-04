/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blush: '#F6F1EB',
          mist: '#E6D5C3',
          rose: '#E8D9B8',
          wine: '#22386A',
          plum: '#17284D',
          gold: '#C8A96A',
        },
      },
      fontFamily: {
        display: ['Elsie', 'Cormorant Garamond', 'Georgia', 'serif'],
        elegant: ['Forum', 'Cormorant Garamond', 'Georgia', 'serif'],
        ui: ['DM Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 60px rgba(34, 56, 106, 0.08)',
        card: '0 16px 38px rgba(34, 56, 106, 0.07)',
      },
    },
  },
  plugins: [],
};
