import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded',
    'font-sans tracking-[-0.01em] transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'control-specular control-specular-primary bg-accent text-accent-ink font-extrabold hover:bg-accent-hover',
        secondary:
          'control-specular bg-elevated text-ink-primary font-medium border border-rule-subtle hover:border-accent-border',
        outline:
          'control-specular bg-transparent text-accent font-medium border border-accent-border hover:border-accent hover:bg-accent-tint',
        ghost:
          'bg-transparent text-ink-secondary font-medium hover:bg-surface hover:text-ink-primary',
        danger:
          'bg-danger-tint text-danger font-medium border border-danger/30 hover:bg-danger/20',
        link: 'h-auto bg-transparent p-0 font-medium text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
