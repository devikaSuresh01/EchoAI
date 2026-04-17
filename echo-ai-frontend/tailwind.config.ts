export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: '#F8FAFC',
        card: '#FFFFFF',
        panel: '#EEF2FF',
        border: '#E5E7EB',
        primary: '#111827',
        secondary: '#6B7280',
        accent: '#2563EB',
        danger: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
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
