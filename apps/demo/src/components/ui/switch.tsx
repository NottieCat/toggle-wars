import * as React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>;

export const Switch = React.forwardRef<
  React.ElementRef<typeof RadixSwitch.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <RadixSwitch.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
      'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
      'data-[state=unchecked]:border-rule-strong data-[state=unchecked]:bg-elevated',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      'disabled:cursor-not-allowed disabled:opacity-40',
      className,
    )}
    {...props}
  >
    <RadixSwitch.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full transition-transform duration-150',
        'data-[state=checked]:translate-x-4 data-[state=checked]:bg-accent-ink',
        'data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-ink-secondary',
      )}
    />
  </RadixSwitch.Root>
));
Switch.displayName = 'Switch';
