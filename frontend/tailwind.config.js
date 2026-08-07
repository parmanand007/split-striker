/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // CSS-variable backed — all 6 themes swap these automatically
        brand: {
          50:  'rgb(var(--brand-50)  / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        positive: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        negative: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover':'0 8px 24px 0 rgb(0 0 0 / 0.22), 0 2px 6px -1px rgb(0 0 0 / 0.12)',
        'modal':     '0 25px 60px -12px rgb(0 0 0 / 0.5)',
      },
      borderRadius: {
        'xl': '0.75rem', '2xl': '1rem', '3xl': '1.5rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':'slideDown 0.28s cubic-bezier(0.16,1,0.3,1)',
        'pop-in':    'popIn 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer':   'shimmer 1.8s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity:'0' }, to: { opacity:'1' } },
        slideUp:   { from: { opacity:'0', transform:'translateY(14px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        slideDown: { from: { opacity:'0', transform:'translateY(-14px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        popIn:     { from: { opacity:'0', transform:'scale(0.88)' }, to: { opacity:'1', transform:'scale(1)' } },
        bounceIn:  { '0%':{ opacity:'0', transform:'scale(0.7)' }, '60%':{ transform:'scale(1.06)' }, '100%':{ opacity:'1', transform:'scale(1)' } },
        shimmer:   { from:{ backgroundPosition:'-200% 0' }, to:{ backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
}
