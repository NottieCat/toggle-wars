import * as React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = RadixTabs.Root;

export type TabsListProps = React.ComponentPropsWithoutRef<typeof RadixTabs.List>;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-6 border-b border-rule-subtle text-ink-secondary',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  TabsTriggerProps
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex items-center justify-center whitespace-nowrap pb-3 pt-2',
      'font-mono text-label uppercase text-ink-muted transition-colors duration-150',
      'hover:text-ink-primary',
      'data-[state=active]:font-semibold data-[state=active]:text-ink-primary',
      'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-transparent after:transition-colors',
      'data-[state=active]:after:bg-accent',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      'disabled:pointer-events-none disabled:opacity-40',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export type TabsContentProps = React.ComponentPropsWithoutRef<typeof RadixTabs.Content>;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn('mt-6 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
