/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Paleta do ateliê: creme, rosé, nude, vinho e dourado
          at: {
            bg: '#FAF7F3',
            card: '#FFFFFF',
            soft: '#F5EFE9',
            line: '#ECE3DA',
            ink: '#2E2226',
            muted: '#8C7B7F',
            wine: '#7A1E2D',
            wineDark: '#5E1622',
            rose: '#C9767F',
            blush: '#F7E9E6',
            nude: '#E9D6CB',
            gold: '#C8A15A',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['"Playfair Display"', 'Georgia', 'serif'],
        },
        boxShadow: {
          soft: '0 1px 2px rgba(46,34,38,0.04), 0 4px 16px rgba(46,34,38,0.06)',
          lift: '0 8px 30px rgba(46,34,38,0.12)',
        },
        borderRadius: {
          xl2: '1.25rem',
        },
      },
    },
    plugins: [],
  }
