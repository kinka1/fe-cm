/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f766e',
          dark: '#115e59',
          soft: '#ccfbf1',
        },
        accent: {
          DEFAULT: '#f59e0b',
          ink: '#17212b',
        },
        ink: '#17212b',
        muted: '#64748b',
        surface: '#eef7f4',
        card: '#fffaf0',
        subtle: '#e8f5f2',
        line: '#cbded9',
        /**
         * Ramp sidebar. Nilai `muted` dan `text` sudah dicek kontrasnya terhadap
         * `sidebar.DEFAULT` (>= 7:1), jadi label grup dan menu non-aktif tetap
         * terbaca — sebelumnya memakai white/40 yang hanya ~3:1.
         */
        sidebar: {
          DEFAULT: '#0e2f38',
          deep: '#0a2229',
          hover: '#17414d',
          line: '#2b5967',
          muted: '#a7c4cc',
          text: '#e6f1f4',
        },
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.08)',
        card: '0 12px 28px rgba(18, 50, 58, 0.08)',
      },
      borderRadius: {
        card: '0.625rem',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
