/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        game: ['"Unbounded"', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'cursive'],
        title: ['"Russo One"', 'sans-serif'],
      },
      colors: {
        card: {
          common: '#b0b0b0',
          rare: '#4a90d9',
          epic: '#a855f7',
          legendary: '#f59e0b',
        },
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a2e',
          600: '#24243e',
        }
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'confetti': 'confetti 3s ease-out forwards',
        'particle': 'particle 4s ease-in-out infinite',
        'shine': 'shine 2s ease-in-out infinite',
        'card-enter': 'card-enter 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'confetti': {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateY(600px) rotate(720deg)' },
        },
        'particle': {
          '0%, 100%': { opacity: '0', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-100px)' },
        },
        'shine': {
          '0%': { left: '-100%' },
          '50%, 100%': { left: '100%' },
        },
        'card-enter': {
          '0%': { opacity: '0', transform: 'scale(0.8) rotateY(20deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateY(0)' },
        },
      }
    },
  },
  plugins: [],
};
