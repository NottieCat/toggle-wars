import * as React from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { EASE_TECHNICAL } from '@/lib/motion';

const SPOTLIGHT_RADIUS = 360;
const RETICLE_RADIUS = 9; // 18px resting diameter
const RETICLE_INTERACTIVE_SCALE = 32 / 18; // expands to 32px via GPU transform
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const INTERACTIVE_SELECTOR =
  'button, a, input, [role="tab"], [role="switch"], [data-interactive="true"], [data-ledger-row="true"]';

function isPointerEnvironmentEligible(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  const hasFineHoverPointer = window.matchMedia(FINE_POINTER_QUERY).matches;
  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  return hasFineHoverPointer && !prefersReducedMotion;
}

const AmbientCursorLayers: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const visibleRef = React.useRef(false);
  const interactiveRef = React.useRef(false);

  const rawX = useMotionValue(-SPOTLIGHT_RADIUS * 2);
  const rawY = useMotionValue(-SPOTLIGHT_RADIUS * 2);

  // Calm GPU-composited pointer spotlight spring
  const spotX = useSpring(rawX, { stiffness: 240, damping: 32, mass: 0.8 });
  const spotY = useSpring(rawY, { stiffness: 240, damping: 32, mass: 0.8 });

  // Critically-damped telemetry reticle follower spring
  const reticleX = useSpring(rawX, { stiffness: 420, damping: 36, mass: 0.6 });
  const reticleY = useSpring(rawY, { stiffness: 420, damping: 36, mass: 0.6 });
  const targetScale = useMotionValue(1);
  const reticleScale = useSpring(targetScale, {
    stiffness: 420,
    damping: 36,
    mass: 0.6,
  });

  const spotOffsetX = useTransform(spotX, (value) => value - SPOTLIGHT_RADIUS);
  const spotOffsetY = useTransform(spotY, (value) => value - SPOTLIGHT_RADIUS);
  const spotlightTransform = useMotionTemplate`translate3d(${spotOffsetX}px, ${spotOffsetY}px, 0)`;

  const reticleOffsetX = useTransform(reticleX, (value) => value - RETICLE_RADIUS);
  const reticleOffsetY = useTransform(reticleY, (value) => value - RETICLE_RADIUS);
  const reticleTransform = useMotionTemplate`translate3d(${reticleOffsetX}px, ${reticleOffsetY}px, 0) scale(${reticleScale})`;

  React.useEffect(() => {
    const hide = () => {
      if (visibleRef.current) {
        visibleRef.current = false;
        setVisible(false);
      }
      if (interactiveRef.current) {
        interactiveRef.current = false;
        targetScale.set(1);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType &&
        event.pointerType !== 'mouse' &&
        event.pointerType !== 'pen'
      ) {
        hide();
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      // Suppress cleanly over <ToggleDock /> so the drawer stays unobstructed
      if (target?.closest('.td-root')) {
        hide();
        return;
      }

      const { clientX, clientY } = event;
      if (!visibleRef.current) {
        rawX.jump(clientX);
        rawY.jump(clientY);
        spotX.jump(clientX);
        spotY.jump(clientY);
        reticleX.jump(clientX);
        reticleY.jump(clientY);
        visibleRef.current = true;
        setVisible(true);
      } else {
        rawX.set(clientX);
        rawY.set(clientY);
      }

      const overInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      if (overInteractive !== interactiveRef.current) {
        interactiveRef.current = overInteractive;
        targetScale.set(overInteractive ? RETICLE_INTERACTIVE_SCALE : 1);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', hide, { passive: true });
    window.addEventListener('blur', hide, { passive: true });
    window.addEventListener('pointercancel', hide, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', hide);
      window.removeEventListener('blur', hide);
      window.removeEventListener('pointercancel', hide);
    };
  }, [rawX, rawY, spotX, spotY, reticleX, reticleY, targetScale]);

  return (
    <>
      {/* Canvas pointer spotlight (z-[1], strictly below page content and ToggleDock) */}
      <motion.div
        aria-hidden="true"
        className="ambient-spotlight pointer-events-none fixed left-0 top-0 z-[1] h-[720px] w-[720px]"
        style={{ transform: spotlightTransform }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.24, ease: EASE_TECHNICAL }}
      />

      {/* Precision telemetry reticle ring (z-40, strictly below ToggleDock z-index 9999) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-40 h-[18px] w-[18px] rounded-full border border-accent-border will-change-transform"
        style={{ transform: reticleTransform }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.18, ease: EASE_TECHNICAL }}
      />
    </>
  );
};

export const AmbientCursor: React.FC = () => {
  const [eligible, setEligible] = React.useState<boolean>(() =>
    isPointerEnvironmentEligible(),
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const syncEligibility = () => {
      setEligible(finePointerQuery.matches && !reducedMotionQuery.matches);
    };

    syncEligibility();
    finePointerQuery.addEventListener('change', syncEligibility);
    reducedMotionQuery.addEventListener('change', syncEligibility);

    return () => {
      finePointerQuery.removeEventListener('change', syncEligibility);
      reducedMotionQuery.removeEventListener('change', syncEligibility);
    };
  }, []);

  if (!eligible) {
    return null;
  }

  return <AmbientCursorLayers />;
};
