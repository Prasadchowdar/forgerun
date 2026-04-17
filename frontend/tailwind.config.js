/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          base: '#0A0A0B',
          surface: '#121316',
          elevated: '#1A1B1E',
          primary: '#2563EB',
          'primary-hover': '#3B82F6',
          accent: '#F97316',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        heading: ['Chivo', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
};
