/** Attio-inspired palette: white surfaces, hairline borders, one calm indigo accent. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // neutral tokens are theme-aware (see :root / .dark in index.css)
        canvas: 'rgb(var(--canvas) / <alpha-value>)', // page background
        surface: 'rgb(var(--surface) / <alpha-value>)', // subtle raised / muted fill
        hairline: 'rgb(var(--hairline) / <alpha-value>)', // 1px borders everywhere
        hairline2: 'rgb(var(--hairline2) / <alpha-value>)', // even lighter divider
        ink: 'rgb(var(--ink) / <alpha-value>)', // primary text
        muted: 'rgb(var(--muted) / <alpha-value>)', // secondary text
        faint: 'rgb(var(--faint) / <alpha-value>)', // tertiary text
        accent: '#4B63E6', // the single restrained indigo accent
        'accent-soft': '#EEF1FE', // accent tint for chips/hover
        'accent-ink': '#3548C8', // accent text on tint
        good: '#127A4B', // recovered / positive
        'good-soft': '#E7F6EE',
        warn: '#B45309', // retrying / caution
        'warn-soft': '#FDF3E7',
        stop: '#B42318', // stopped / negative
        'stop-soft': '#FDECEA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '12px',
        xl: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)',
        drawer: '-8px 0 40px rgba(16,24,40,0.10)',
        pop: '0 4px 16px rgba(16,24,40,0.08)',
      },
      letterSpacing: {
        tightish: '-0.01em',
        tight2: '-0.02em',
      },
      fontSize: {
        '2xs': '11px',
      },
    },
  },
  plugins: [],
};
