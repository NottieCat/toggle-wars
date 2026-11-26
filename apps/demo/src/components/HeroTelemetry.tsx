import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, SlidersHorizontal } from 'lucide-react';
import type { ToggleDockAccent, TraitValue } from 'toggledock';
import { EdgeMeshCanvas } from '@/components/EdgeMeshCanvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AnimatedNumber, EASE_TECHNICAL, LedgerRow } from '@/lib/motion';

export interface ActiveFlagSnapshot {
  promo_banner: boolean;
  ai_copilot_widget: boolean;
  pricing_experiment: string;
  onboarding_flow: string;
  theme_accent: ToggleDockAccent;
}

export interface HeroTelemetryProps {
  identity: string | null;
  traits: Record<string, TraitValue>;
  flags: ActiveFlagSnapshot;
  overriddenKeys: ReadonlySet<string>;
}

const TELEMETRY_READOUTS = [
  {
    label: 'P99 EDGE LATENCY',
    value: 14.2,
    from: 12.6,
    decimals: 1,
    unit: 'ms',
    delta: '-1.8 ms vs baseline',
    accentDelta: true,
  },
  {
    label: 'THROUGHPUT',
    value: 42810,
    from: 39600,
    decimals: 0,
    unit: 'req/s',
    delta: '99.984% 2xx',
    accentDelta: false,
  },
  {
    label: 'ACTIVE REGIONS',
    value: 18,
    from: 14,
    decimals: 0,
    unit: '/ 18 POPs',
    delta: 'iad · fra · nrt · sjc',
    accentDelta: false,
  },
  {
    label: 'DEPLOY QUEUE',
    value: 0,
    from: 0,
    decimals: 0,
    unit: 'blocked',
    delta: '3m 12s ago · sha 8f3c91a',
    accentDelta: false,
  },
] as const;

export const HeroTelemetry: React.FC<HeroTelemetryProps> = ({
  identity,
  traits,
  flags,
  overriddenKeys,
}) => {
  const prefersReduced = useReducedMotion();
  const railRef = React.useRef<HTMLElement>(null);
  const traitEntries = Object.entries(traits);

  const openToggleDock = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
  };

  const flagRows: Array<{
    key: string;
    valueLabel: string;
    active: boolean;
    overridden: boolean;
  }> = [
    {
      key: 'promo_banner',
      valueLabel: flags.promo_banner ? 'ON' : 'OFF',
      active: flags.promo_banner,
      overridden: overriddenKeys.has('promo_banner'),
    },
    {
      key: 'ai_copilot_widget',
      valueLabel: flags.ai_copilot_widget ? 'ON' : 'OFF',
      active: flags.ai_copilot_widget,
      overridden: overriddenKeys.has('ai_copilot_widget'),
    },
    {
      key: 'pricing_experiment',
      valueLabel: flags.pricing_experiment,
      active: true,
      overridden: overriddenKeys.has('pricing_experiment'),
    },
    {
      key: 'onboarding_flow',
      valueLabel: flags.onboarding_flow,
      active: true,
      overridden: overriddenKeys.has('onboarding_flow'),
    },
    {
      key: 'theme_accent',
      valueLabel: flags.theme_accent,
      active: true,
      overridden: overriddenKeys.has('theme_accent'),
    },
  ];

  return (
    <section aria-labelledby="hero-heading" className="py-12 md:py-16">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left-anchored asymmetric workbench hero */}
        <div className="space-y-8 lg:col-span-8">
          <div className="space-y-4">
            <motion.div
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0.01 : 0.48,
                delay: prefersReduced ? 0 : 0.07,
                ease: EASE_TECHNICAL,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">LIVE TELEMETRY</Badge>
                <span className="font-mono text-label uppercase text-ink-muted tabular-nums">
                  CLUSTER IAD-EDGE-04 · RELEASE V4.18.2-RC3
                </span>
              </div>
            </motion.div>

            <h1
              id="hero-heading"
              className="font-display text-display tracking-[-0.04em] sm:text-hero"
            >
              <span className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block will-change-transform"
                  initial={prefersReduced ? { opacity: 1 } : { y: '105%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{
                    duration: prefersReduced ? 0.01 : 0.68,
                    delay: prefersReduced ? 0 : 0.11,
                    ease: EASE_TECHNICAL,
                  }}
                >
                  <span className="font-extralight text-ink-secondary">Deterministic</span>{' '}
                  <span className="font-extrabold text-ink-primary">Release</span>
                </motion.span>
              </span>{' '}
              <span className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block will-change-transform"
                  initial={prefersReduced ? { opacity: 1 } : { y: '105%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{
                    duration: prefersReduced ? 0.01 : 0.68,
                    delay: prefersReduced ? 0 : 0.18,
                    ease: EASE_TECHNICAL,
                  }}
                >
                  <span className="font-extrabold text-ink-primary">Control</span>
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReduced ? 0.01 : 0.55,
                delay: prefersReduced ? 0 : 0.24,
                ease: EASE_TECHNICAL,
              }}
              className="max-w-2xl font-sans text-body text-ink-secondary"
            >
              <span className="font-extralight text-ink-primary">
                Distributed edge compute &amp; deployment telemetry workbench.
              </span>{' '}
              Every runtime surface on this console reacts live to self-hosted Flagsmith
              flags, identity segment overrides, and local ToggleDock overrides without a
              page reload.
            </motion.p>
          </div>

          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReduced ? 0.01 : 0.55,
              delay: prefersReduced ? 0 : 0.3,
              ease: EASE_TECHNICAL,
            }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="md" onClick={openToggleDock}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>Open ToggleDock (⌘⇧F)</span>
              </Button>

              <Button variant="secondary" size="md" asChild>
                <a href="#pricing">
                  <span>Inspect Rate Ledger</span>
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>

              <span className="font-mono text-micro uppercase text-ink-muted">
                5 live flags · Dev vs Prod drift ready
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: prefersReduced ? 0.01 : 0.6,
              delay: prefersReduced ? 0 : 0.32,
              ease: EASE_TECHNICAL,
            }}
            className="origin-left will-change-transform"
          >
            <Separator />
          </motion.div>

          {/* Open unboxed live telemetry strip directly on --bg-canvas */}
          <div
            aria-label="Live cluster telemetry"
            className="grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {TELEMETRY_READOUTS.map((metric, index) => {
              const itemDelay = 0.34 + index * 0.05;
              return (
                <motion.div
                  key={metric.label}
                  initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReduced ? 0.01 : 0.52,
                    delay: prefersReduced ? 0 : itemDelay,
                    ease: EASE_TECHNICAL,
                  }}
                  className="space-y-2"
                >
                  <p className="font-mono text-label uppercase text-ink-muted">
                    {metric.label}
                  </p>
                  <p className="font-mono text-metric leading-none tabular-nums">
                    <AnimatedNumber
                      value={metric.value}
                      from={metric.from}
                      decimals={metric.decimals}
                      delay={itemDelay}
                      className="font-extrabold text-ink-primary"
                    />{' '}
                    <span className="text-base font-extralight text-ink-secondary">
                      {metric.unit}
                    </span>
                  </p>
                  <p
                    className={
                      metric.accentDelta
                        ? 'font-mono text-micro text-accent tabular-nums'
                        : 'font-mono text-micro text-ink-secondary tabular-nums'
                    }
                  >
                    {metric.delta}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right rail: 3D edge-mesh topology focal element + compact Flagsmith readout */}
        <motion.aside
          ref={railRef}
          aria-label="Live Flagsmith state readout"
          initial={
            prefersReduced
              ? { opacity: 1 }
              : { opacity: 0, y: 16, scale: 0.985 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: prefersReduced ? 0.01 : 0.68,
            delay: prefersReduced ? 0 : 0.16,
            ease: EASE_TECHNICAL,
          }}
          className="group/rail relative border border-rule-subtle bg-surface transition-colors duration-200 will-change-transform hover:border-rule-strong lg:col-span-4"
        >
          <motion.span
            aria-hidden="true"
            initial={prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: prefersReduced ? 0.01 : 0.75,
              delay: prefersReduced ? 0 : 0.28,
              ease: EASE_TECHNICAL,
            }}
            className="specular-beam absolute inset-x-0 -top-px z-10 origin-center opacity-75 transition-opacity duration-200 will-change-transform group-hover/rail:opacity-100"
          />
          <EdgeMeshCanvas
            activeAccent={flags.theme_accent}
            parallaxContainerRef={railRef}
          />

          <div className="p-6">
            <div className="flex items-center justify-between gap-2 pb-4">
              <span className="font-mono text-label uppercase text-ink-primary">
                FLAGSMITH READOUT
              </span>
              <Badge variant={overriddenKeys.size > 0 ? 'solid' : 'accent'}>
                {overriddenKeys.size > 0
                  ? `${overriddenKeys.size} OVERRIDDEN`
                  : 'SERVER SYNCED'}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-micro uppercase text-ink-muted">
                  ACTIVE IDENTITY
                </span>
                <Badge variant={identity ? 'accent' : 'neutral'}>
                  {identity ? 'IDENTIFIED' : 'ANONYMOUS'}
                </Badge>
              </div>
              <p className="font-mono text-sm font-semibold text-ink-primary tabular-nums">
                {identity ?? 'Anonymous'}
              </p>
              {traitEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {traitEntries.map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}={String(value)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-micro text-ink-muted">
                  Switch to Beta Tester in ToggleDock Identity tab to trigger{' '}
                  <code className="text-ink-secondary">beta_testers</code> →{' '}
                  <code className="text-accent">amber</code>.
                </p>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-2 py-4">
              <span className="font-mono text-micro uppercase text-ink-muted">
                ACTIVE ACCENT TOKEN
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-accent transition-colors duration-200"
                  aria-hidden="true"
                />
                <span className="font-mono text-label uppercase text-accent tabular-nums">
                  {flags.theme_accent}
                </span>
              </div>
            </div>

            <Separator />

            <div className="divide-y divide-rule-subtle pt-2">
              {flagRows.map((row) => (
                <LedgerRow
                  key={row.key}
                  hoverTone="elevated"
                  className="flex items-center justify-between gap-2 px-2 py-2"
                >
                  <span className="font-mono text-micro text-ink-secondary">
                    {row.key}
                  </span>
                  <div className="flex items-center gap-2">
                    {row.overridden && <Badge variant="solid">LOCAL</Badge>}
                    <Badge variant={row.active ? 'accent' : 'neutral'}>
                      {row.valueLabel}
                    </Badge>
                  </div>
                </LedgerRow>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
};
