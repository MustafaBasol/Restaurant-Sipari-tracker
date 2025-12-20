import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './index.tsx',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#007aff',
          hover: '#006ee6',
        },
        'light-bg': '#f5f5f7',
        'card-bg': '#ffffff',
        'text-primary': '#1d1d1f',
        'text-secondary': '#6e6e73',
        'border-color': '#d2d2d7',
        'status-new': '#007aff',
        'status-prep': '#ff9500',
        'status-ready': '#34c759',
        'status-served': '#8e8e93',
        'status-free': '#34c759',
        'status-occupied': '#ff9500',
        'status-closed': '#8e8e93',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        subtle: '0 4px 12px rgba(0, 0, 0, 0.08)',
        medium: '0 8px 24px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
