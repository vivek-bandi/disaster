/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63', // Cyan/Teal accents
        },
        secondary: {
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' // Blue accent
        },
        danger: { 50: '#fff1f2', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
        warning: { 50: '#fffbeb', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        success: { 50: '#f0fdf4', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        surface: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 850: '#111827', 900: '#0B1220', // Navy / Slate tones
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        'cyan-glow': '0 4px 14px 0 rgba(6, 182, 212, 0.3)',
      },
      keyframes: {
        floatLeft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        }
      },
      animation: {
        'float': 'floatLeft 8s ease-in-out infinite',
      }
    }
  },
  plugins: []
};
