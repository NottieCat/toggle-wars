import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5',
    'font-mono text-micro uppercase tabular-nums transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        neutral: 'border-rule-subtle bg-surface text-ink-secondary',
        accent: 'border-accent-border bg-accent-tint text-accent',
        solid: 'border-transparent bg-accent font-semibold text-accent-ink',
        outline: 'border-rule-strong bg-transparent text-ink-secondary',
        danger: 'border-danger/30 bg-danger-tint text-danger',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = 'Badge';
