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
          owner: '#ff0000',
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
        'battle-shake': 'battle-shake 0.4s ease',
        'slam-left': 'slam-left 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'slam-right': 'slam-right 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'damage-pop': 'damage-pop 0.8s ease-out forwards',
        'heal-pop': 'heal-pop 0.8s ease-out forwards',
        'spell-burst': 'spell-burst 0.6s ease-out',
        'fade-out': 'fade-out 0.5s ease-out forwards',
        'target-pulse': 'target-pulse 1s ease-in-out infinite',
        'impact-flash': 'impact-flash 0.3s ease-out',
        'elimination-skull': 'elimination-skull 1s ease-out forwards',
        'owner-glow': 'owner-glow 3s ease-in-out infinite',
        'owner-border-shift': 'owner-border-shift 3s linear infinite',
        'silence-pulse': 'silence-pulse 1.5s ease-in-out infinite',
        'freeze-shimmer': 'freeze-shimmer 2s ease-in-out infinite',
        'poison-drip': 'poison-drip 2s ease-in-out infinite',
        'immune-shimmer': 'immune-shimmer 2s ease-in-out infinite',
        'vs-pulse': 'vs-pulse 0.8s ease-in-out infinite',
        'stun-ring-pulse': 'stun-ring-pulse 1.5s ease-in-out infinite',
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
        'battle-shake': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-4px, -2px)' },
          '20%': { transform: 'translate(4px, 2px)' },
          '30%': { transform: 'translate(-2px, 4px)' },
          '40%': { transform: 'translate(2px, -4px)' },
          '50%': { transform: 'translate(-4px, 0)' },
          '60%': { transform: 'translate(4px, 2px)' },
          '70%': { transform: 'translate(-2px, -2px)' },
          '80%': { transform: 'translate(2px, 4px)' },
          '90%': { transform: 'translate(-4px, -2px)' },
        },
        'slam-left': {
          '0%': { transform: 'translateX(-100px) scale(0.3) rotate(-20deg)', opacity: '0' },
          '70%': { transform: 'translateX(5px) scale(1.05) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'translateX(0) scale(1) rotate(0)', opacity: '1' },
        },
        'slam-right': {
          '0%': { transform: 'translateX(100px) scale(0.3) rotate(20deg)', opacity: '0' },
          '70%': { transform: 'translateX(-5px) scale(1.05) rotate(-2deg)', opacity: '1' },
          '100%': { transform: 'translateX(0) scale(1) rotate(0)', opacity: '1' },
        },
        'damage-pop': {
          '0%': { transform: 'scale(0.5) translateY(0)', opacity: '0' },
          '30%': { transform: 'scale(1.4) translateY(-10px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(-40px)', opacity: '0' },
        },
        'heal-pop': {
          '0%': { transform: 'scale(0.5) translateY(0)', opacity: '0' },
          '30%': { transform: 'scale(1.4) translateY(-10px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(-40px)', opacity: '0' },
        },
        'spell-burst': {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '60%': { transform: 'scale(1.3) rotate(10deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.9)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'target-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.5)' },
          '50%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
        },
        'impact-flash': {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '0', transform: 'scale(1.5)' },
        },
        'elimination-skull': {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.5) rotate(0)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        // Owner rarity animations
        'owner-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255, 0, 0, 0.4), 0 0 30px rgba(255, 119, 0, 0.2), 0 0 45px rgba(138, 43, 226, 0.1)' },
          '33%': { boxShadow: '0 0 15px rgba(0, 255, 0, 0.4), 0 0 30px rgba(0, 119, 255, 0.2), 0 0 45px rgba(255, 0, 136, 0.1)' },
          '66%': { boxShadow: '0 0 15px rgba(0, 119, 255, 0.4), 0 0 30px rgba(138, 0, 255, 0.2), 0 0 45px rgba(255, 0, 0, 0.1)' },
        },
        'owner-border-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // Status effect animations
        'silence-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.5', filter: 'brightness(0.6)' },
        },
        'freeze-shimmer': {
          '0%, 100%': { filter: 'hue-rotate(0deg) brightness(1)' },
          '50%': { filter: 'hue-rotate(20deg) brightness(1.3)' },
        },
        'poison-drip': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(0.7) saturate(1.5)' },
        },
        'immune-shimmer': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(34, 211, 238, 0.2)', borderColor: 'rgba(34, 211, 238, 0.4)' },
          '50%': { boxShadow: '0 0 22px rgba(34, 211, 238, 0.4)', borderColor: 'rgba(34, 211, 238, 0.7)' },
        },
        'vs-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.85' },
        },
        'stun-ring-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(234, 179, 8, 0.35)', borderColor: 'rgba(234, 179, 8, 0.6)' },
        },
      }
    },
  },
  plugins: [],
};
