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
          common: '#8a9bb0',
          rare: '#3b82f6',
          epic: '#8b5cf6',
          legendary: '#f59e0b',
          secret: '#dc2626',
          cosmic: '#ff00ff',
        },
        dark: {
          900: '#0b0e14',
          800: '#111827',
          700: '#1a2236',
          600: '#243049',
        },
        steel: {
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
        },
        accent: {
          blue: '#00b4ff',
          glow: '#38bdf8',
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
        'cosmic-glow': 'cosmic-glow 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'turn-glow': 'turn-glow 1s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 180, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 180, 255, 0.6)' },
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
        'cosmic-glow': {
          '0%, 100%': { boxShadow: '0 0 15px #ff00ff, 0 0 30px #00b4ff' },
          '50%': { boxShadow: '0 0 30px #00b4ff, 0 0 60px #ff00ff' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'turn-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0,180,255,0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(0,180,255,0.8)' },
        },
      }
    },
  },
  plugins: [],
};
