/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#E8E8E8',
        surface: '#F7F7F7',
        card: '#FFFFFF',
        txt: '#111111',
        'txt-secondary': '#777777',
        border: '#DADADA',
        active: '#111111',
        emergency: '#E85D3F',
        'emergency-light': '#FEF2EF',
        success: '#2D8A56',
        'success-light': '#EBF5F0',
        warning: '#D4920A',
        'warning-light': '#FDF6E3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        btn: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
