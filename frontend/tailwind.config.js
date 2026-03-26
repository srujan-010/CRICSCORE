/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkblue: '#0B1121', // Darker navy for background
        cardBg: '#131B2D', // Card background color
        lime: '#E2FF54', // The specific lime-yellow from the screenshots
        neon: '#39FF14',
      },
      backgroundImage: {
        'stadium': "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
      },
      fontFamily: {
        'display': ['"Bebas Neue"', '"Anton"', 'Impact', 'sans-serif'], // For the big bold text
      }
    },
  },
  plugins: [],
}
