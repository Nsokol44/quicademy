/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        violet: {
          950: '#0f0a1e',
          900: '#1a1035',
          800: '#2d1f5e',
          700: '#3d2b7a',
          600: '#5b3fa8',
          500: '#7c5cbf',
          400: '#9d7dd4',
          300: '#c4aee8',
          200: '#e1d4f5',
          100: '#f3eefb',
          50:  '#faf7ff',
        },
        solar: {
          DEFAULT: '#f5c842',
          50:  '#fffbeb',
          100: '#fef3c0',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f5c842',
          500: '#e6b325',
          600: '#ca8f0f',
          700: '#a16d09',
          800: '#7d5207',
        },
        warm: {
          50:  '#fdfaf6',
          100: '#f9f3ec',
          200: '#f0e5d5',
          300: '#e3cdb2',
        },
        ink:    '#0f0a1e',
        muted:  '#6b5f8a',
        border: '#e1d4f5',
        surface: '#fdfaf6',
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '10px',
        lg:  '16px',
        xl:  '24px',
        '2xl': '32px',
      },
      boxShadow: {
        'card':    '0 2px 8px rgba(15,10,30,0.07), 0 1px 2px rgba(15,10,30,0.04)',
        'card-lg': '0 12px 40px rgba(15,10,30,0.10), 0 2px 8px rgba(15,10,30,0.05)',
        'violet':  '0 4px 20px rgba(91,63,168,0.3)',
        'solar':   '0 4px 20px rgba(245,200,66,0.4)',
        'glow':    '0 0 0 4px rgba(91,63,168,0.15)',
      },
    },
  },
  plugins: [],
}
