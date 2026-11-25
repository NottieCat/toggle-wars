import * as React from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Transition,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export const EASE_TECHNICAL: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_CALM = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 34,
  mass: 0.85,
};

export const PRESENCE_TRANSITION: Transition = {
  duration: 0.35,
  ease: EASE_TECHNICAL,
};

export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.15,
} as const;

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  immediate?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  y = 12,
  immediate = false,
}) => {
  const prefersReduced = useReducedMotion();
  const offsetY = prefersReduced ? 0 : y;
  const transition: Transition = {
    duration: prefersReduced ? 0.01 : 0.45,
    delay: prefersReduced ? 0 : delay,
    ease: EASE_TECHNICAL,
  };

  if (immediate) {
    return React.createElement(
      motion.div,
      {
        initial: { opacity: 0, y: offsetY },
        animate: { opacity: 1, y: 0 },
        transition,
        className,
      },
      children,
    );
  }

  return React.createElement(
    motion.div,
    {
      initial: { opacity: 0, y: offsetY },
      whileInView: { opacity: 1, y: 0 },
      viewport: VIEWPORT_ONCE,
      transition,
      className,
    },
    children,
  );
};

export interface AnimatedNumberProps {
  value: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  useGrouping?: boolean;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  from,
  decimals = 0,
  prefix = '',
  suffix = '',
  useGrouping = true,
  className,
}) => {
  const prefersReduced = useReducedMotion();

  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      }),
    [decimals, useGrouping],
  );

  const formatValue = React.useCallback(
    (num: number): string => {
      const safeRaw = Number.isFinite(num) ? num : 0;
      const factor = Math.pow(10, decimals);
      const rounded = Math.round(safeRaw * factor) / factor;
      const normalized = rounded === 0 ? 0 : rounded;
      return `${prefix}${formatter.format(normalized)}${suffix}`;
    },
    [decimals, formatter, prefix, suffix],
  );

  const initialNumericRef = React.useRef<number>(
    prefersReduced ? value : (from ?? value),
  );
  const motionValue = useMotionValue(initialNumericRef.current);
  const springValue = useSpring(motionValue, {
    stiffness: SPRING_CALM.stiffness,
    damping: SPRING_CALM.damping,
    mass: SPRING_CALM.mass,
  });
  const display = useTransform(springValue, (latest) => formatValue(latest));

  React.useEffect(() => {
    if (prefersReduced) {
      motionValue.jump(value);
      springValue.jump(value);
      display.set(formatValue(value));
      return;
    }
    motionValue.set(value);
  }, [value, prefersReduced, motionValue, springValue, display, formatValue]);

  React.useEffect(() => {
    display.set(formatValue(springValue.get()));
  }, [display, springValue, formatValue]);

  return React.createElement(motion.span, {
    className: cn('tabular-nums', className),
    children: display,
  });
};

export interface LedgerRowProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  hoverTone?: 'surface' | 'elevated';
}

export const LedgerRow: React.FC<LedgerRowProps> = ({
  children,
  className,
  active = false,
  hoverTone = 'surface',
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...rest
}) => {
  const prefersReduced = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const cursorX = useMotionValue(0);
  const smoothX = useSpring(cursorX, {
    stiffness: 420,
    damping: 40,
    mass: 0.65,
  });

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!prefersReduced) {
      const rect = event.currentTarget.getBoundingClientRect();
      cursorX.jump(event.clientX - rect.left - 48);
    }
    setHovered(true);
    onPointerEnter?.(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!prefersReduced) {
      const rect = event.currentTarget.getBoundingClientRect();
      cursorX.set(event.clientX - rect.left - 48);
    }
    onPointerMove?.(event);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    setHovered(false);
    onPointerLeave?.(event);
  };

  const isHighlighted = active || hovered;

  const leftEdge = React.createElement(motion.span, {
    'aria-hidden': 'true',
    initial: false,
    animate: {
      scaleY: isHighlighted ? 1 : 0,
      opacity: isHighlighted ? 1 : 0,
    },
    transition: {
      duration: prefersReduced ? 0.01 : 0.2,
      ease: EASE_TECHNICAL,
    },
    className:
      'pointer-events-none absolute inset-y-0 left-0 w-[2px] origin-center bg-accent',
  });

  const topCursor = !prefersReduced
    ? React.createElement(motion.span, {
        'aria-hidden': 'true',
        style: { x: smoothX },
        initial: false,
        animate: { opacity: hovered ? 1 : 0 },
        transition: { duration: 0.18, ease: EASE_TECHNICAL },
        className: 'pointer-events-none absolute left-0 top-0 h-px w-24 bg-accent',
      })
    : null;

  return React.createElement(
    'div',
    {
      ...rest,
      onPointerEnter: handlePointerEnter,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      className: cn(
        'relative overflow-hidden transition-colors duration-150',
        active && 'bg-surface',
        hovered && (hoverTone === 'elevated' ? 'bg-elevated' : 'bg-surface'),
        className,
      ),
    },
    leftEdge,
    topCursor,
    children,
  );
};

export const TactileRow = LedgerRow;

export const TactileRowEdge: React.FC = () =>
  React.createElement('span', {
    'aria-hidden': 'true',
    className:
      'pointer-events-none absolute inset-y-0 left-0 w-[2px] origin-center scale-y-0 bg-accent opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:scale-y-100 group-hover:opacity-100',
  });
