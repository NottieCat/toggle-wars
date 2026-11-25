import * as React from 'react';
import { ArrowDownRight, SlidersHorizontal } from 'lucide-react';
import type { ToggleDockAccent, TraitValue } from 'toggledock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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
    value: '14.2',
    unit: 'ms',
    delta: '-1.8 ms vs baseline',
    accentDelta: true,
  },
  {
    label: 'THROUGHPUT',
    value: '42,810',
    unit: 'req/s',
    delta: '99.984% 2xx',
    accentDelta: false,
  },
  {
    label: 'ACTIVE REGIONS',
    value: '18',
    unit: '/ 18 POPs',
    delta: 'iad · fra · nrt · sjc',
    accentDelta: false,
  },
  {
    label: 'DEPLOY QUEUE',
    value: '0',
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">LIVE TELEMETRY</Badge>
              <span className="font-mono text-label uppercase text-ink-muted tabular-nums">
                CLUSTER IAD-EDGE-04 · RELEASE V4.18.2-RC3
              </span>
            </div>

            <h1
              id="hero-heading"
              className="font-display text-display tracking-[-0.04em] sm:text-hero"
            >
              <span className="font-extralight text-ink-secondary">Deterministic</span>{' '}
              <span className="font-extrabold text-ink-primary">Release Control</span>
            </h1>

            <p className="max-w-2xl font-sans text-body text-ink-secondary">
              <span className="font-extralight text-ink-primary">
                Distributed edge compute & deployment telemetry workbench.
              </span>{' '}
              Every runtime surface on this console reacts live to self-hosted Flagsmith
              flags, identity segment overrides, and local ToggleDock overrides without a
              page reload.
            </p>
          </div>

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

          <Separator />

          {/* Open unboxed live telemetry strip directly on --bg-canvas */}
          <div
            aria-label="Live cluster telemetry"
            className="grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {TELEMETRY_READOUTS.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <p className="font-mono text-label uppercase text-ink-muted">
                  {metric.label}
                </p>
                <p className="font-mono text-metric leading-none tabular-nums">
                  <span className="font-extrabold text-ink-primary">{metric.value}</span>{' '}
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
              </div>
            ))}
          </div>
        </div>

        {/* Right rail: compact live Flagsmith connection & identity telemetry strip */}
        <aside
          aria-label="Live Flagsmith state readout"
          className="border border-rule-subtle bg-surface p-6 lg:col-span-4"
        >
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
                className="h-2 w-2 rounded-full bg-accent"
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
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 py-2"
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
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};
