import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── ToolStack Brand Palette ──────────────────────────────
        cream: {
          50:  '#FDFCFA',   // lightest surface
          100: '#FAF8F4',   // page background
          200: '#F4F0E8',   // card background
          300: '#EAE4D8',   // subtle borders
          400: '#D8D0C0',   // muted borders
          500: '#C4B99F',   // placeholder text
        },
        sand: {
          100: '#F0EBE1',   // sidebar bg
          200: '#E5DDD0',   // sidebar hover
          300: '#D4C9B6',   // active bg
        },
        ink: {
          900: '#0F0E0C',   // primary text (near black)
          800: '#1C1A16',   // headings
          700: '#2E2B24',   // body text
          600: '#4A4640',   // secondary text
          500: '#6B6660',   // muted text
          400: '#8C8880',   // placeholder
        },
        // Accent: warm gold — used sparingly
        gold: {
          400: '#D4A853',
          500: '#C8973E',
          600: '#A67C2E',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:   ['11px', { lineHeight: '16px' }],
        sm:   ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        md:   ['15px', { lineHeight: '24px' }],
        lg:   ['16px', { lineHeight: '26px' }],
        xl:   ['18px', { lineHeight: '28px' }],
        '2xl':['22px', { lineHeight: '32px' }],
        '3xl':['28px', { lineHeight: '38px' }],
        '4xl':['36px', { lineHeight: '46px' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        'xs':  '0 1px 2px 0 rgb(15 14 12 / 0.04)',
        'sm':  '0 1px 3px 0 rgb(15 14 12 / 0.06), 0 1px 2px -1px rgb(15 14 12 / 0.04)',
        'md':  '0 4px 6px -1px rgb(15 14 12 / 0.06), 0 2px 4px -2px rgb(15 14 12 / 0.04)',
        'lg':  '0 10px 15px -3px rgb(15 14 12 / 0.06), 0 4px 6px -4px rgb(15 14 12 / 0.04)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
export default config
