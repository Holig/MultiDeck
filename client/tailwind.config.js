/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        twitter: {
          blue: '#1d9bf0',
          blueHover: '#1a8cd8',
          dark: '#15202b',
          darker: '#10171e',
          surface: '#1e2732',
          surfaceLight: '#273340',
          border: '#38444d',
          textMuted: '#8b98a5',
          textPrimary: '#f7f9f9',
          retweet: '#00ba7c',
          like: '#f91880',
        },
      },
      spacing: {
        'column-sm': '320px',
        'column-md': '380px',
        'column-lg': '460px',
      },
    },
  },
  plugins: [],
};
