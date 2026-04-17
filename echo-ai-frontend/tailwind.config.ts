export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        brand: '#F4F7FB',
        card: '#FFFFFF',
        panel: '#EDF6F6',
        border: '#D9E5EA',
        primary: '#0F172A',
        secondary: '#526071',
        accent: '#0F766E',
        danger: '#C2410C',
        warning: '#B45309',
        success: '#0F9D76',
      },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%) scaleX(0.5)' },
          '100%': { transform: 'translateX(200%) scaleX(0.5)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
