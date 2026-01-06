/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",       // for Vite
    "./src/**/*.{js,jsx,ts,tsx}" // all React components
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },

      colors: {
        atelier: {
          cream: '#FAF8F3',
          beige: '#F5F1E8',
          parchment: '#EBE4D1',
          stone: '#C9BCB0',
          stoneDark: '#8B7F72',

          espresso: '#3E2723',
          espressoLight: '#5D4037',
        },
      },

      boxShadow: {
        soft: '0 4px 20px rgba(62,39,35,0.08)',
        editorial: '0 10px 40px rgba(62,39,35,0.12)',
        couture: '0 25px 60px rgba(62,39,35,0.18)',
      },

      animation: {
        fade: 'fadeIn 0.6s ease-out',
        scale: 'scaleIn 0.4s ease-out',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
