/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#1A1A1A',
        mainBg: '#151515',
        cardBg: '#252525',
        borderDark: '#333333',
        textMuted: '#A1A1AA',
        accentBlue: '#3B82F6',
        accentHover: '#2563EB',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
