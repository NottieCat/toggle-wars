import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        rule: {
          subtle: 'var(--rule-subtle)',
          strong: 'var(--rule-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)',
          tint: 'var(--accent-tint)',
          border: 'var(--accent-border)',
        },
        danger: {
          DEFAULT: 'var(--status-danger)',
          tint: 'var(--status-danger-tint)',
        },
      },
      spacing: {
        'r1': 'var(--space-1)',
        'r2': 'var(--space-2)',
        'r3': 'var(--space-3)',
        'r4': 'var(--space-4)',
        'r6': 'var(--space-6)',
        'r8': 'var(--space-8)',
        'r12': 'var(--space-12)',
      },
      fontSize: {
        micro: ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.06em' }],
        body: ['16px', { lineHeight: '24px', letterSpacing: '-0.005em' }],
        metric: ['36px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
        display: ['48px', { lineHeight: '56px', letterSpacing: '-0.035em' }],
        hero: ['72px', { lineHeight: '72px', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
