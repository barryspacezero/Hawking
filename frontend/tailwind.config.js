/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#06b6d4', // Cyan terminal accent
          hover: '#0891b2',
          light: '#22d3ee',
          dark: '#18181b',
        },
        sidebar: '#18181b', // zinc-900
        mainBg: '#18181b', // zinc-900
        cardBg: '#27272a', // zinc-800
        cardHover: '#3f3f46', // zinc-700
        borderDark: '#3f3f46', // zinc-700
        textMuted: '#a1a1aa', // zinc-400
        accent: '#10b981', // emerald-500
        accentHover: '#059669',
        accentLight: '#34d399',
        accentBlue: '#0ea5e9', // sky-500
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
