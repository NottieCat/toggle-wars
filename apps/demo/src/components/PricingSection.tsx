import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  AnimatedNumber,
  EASE_TECHNICAL,
  LedgerRow,
  PRESENCE_TRANSITION,
  Reveal,
  SPRING_CALM,
  TactileRowEdge,
} from '@/lib/motion';
import { cn } from '@/lib/utils';

export type PricingVariant = 'control' | 'annual_first' | 'usage_based';

export interface PricingSectionProps {
  variant: string;
  isOverridden?: boolean;
}

const PRICING_VARIANTS: ReadonlyArray<{ id: PricingVariant; label: string }> = [
  { id: 'control', label: 'control' },
  { id: 'annual_first', label: 'annual_first' },
  { id: 'usage_based', label: 'usage_based' },
];

interface TierSpec {
  id: 'hobby' | 'fleet' | 'mesh';
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavingsPct: number;
  requests: string;
  footprint: string;
  sla: string;
  security: string;
  cta: string;
  highlighted?: boolean;
}

const PLAN_SPECS: ReadonlyArray<TierSpec> = [
  {
    id: 'hobby',
    name: 'Hobby Edge',
    tagline: 'Single-operator sandbox & local Flagsmith testing',
    monthlyPrice: 0,
    annualPrice: 0,
    annualSavingsPct: 0,
    requests: '100k req/day',
    footprint: '3 regions (iad, fra, sjc)',
    sla: 'Best-effort',
    security: 'Shared Anycast TLS',
    cta: 'Deploy Hobby',
  },
  {
    id: 'fleet',
    name: 'Production Fleet',
    tagline: 'Global low-latency workloads with automated canary gates',
    monthlyPrice: 79,
    annualPrice: 64,
    annualSavingsPct: 19,
    requests: '10M req/mo included',
    footprint: '18 POPs global Anycast',
    sla: '99.99% SLA',
    security: 'Regional failover + KMS secrets',
    cta: 'Provision Fleet',
    highlighted: true,
  },
  {
    id: 'mesh',
    name: 'Dedicated Mesh',
    tagline: 'Isolated edge compute plane with deterministic routing',
    monthlyPrice: 420,
    annualPrice: 340,
    annualSavingsPct: 19,
    requests: '100M req/mo included',
    footprint: '18 POPs + private peering',
    sla: '99.995% SLA',
    security: 'Dedicated Anycast IP · SOC2 Type II',
    cta: 'Request Mesh',
  },
];

const INVOCATION_PRESETS = [10, 45, 250, 1000] as const;
const EGRESS_PRESETS = [200, 850, 4000, 10000] as const;
const RATE_PER_MILLION_INVOCATIONS = 0.18;
const RATE_PER_GB_EGRESS = 0.045;

function normalizePricingVariant(raw: string): PricingVariant {
  if (raw === 'annual_first' || raw === 'usage_based' || raw === 'control') {
    return raw;
  }
  return 'control';
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  variant,
  isOverridden = false,
}) => {
  const activeVariant = normalizePricingVariant(variant);
  const [annualBilling, setAnnualBilling] = React.useState<boolean>(
    activeVariant === 'annual_first',
  );
  const [selectedPlanMessage, setSelectedPlanMessage] = React.useState<string | null>(
    null,
  );

  // Interactive usage_based controls
  const [millionsInvocations, setMillionsInvocations] = React.useState<number>(45);
  const [egressGb, setEgressGb] = React.useState<number>(850);

  // Synchronize default billing cycle whenever Flagsmith switches pricing_experiment.
  React.useEffect(() => {
    if (activeVariant === 'annual_first') {
      setAnnualBilling(true);
    } else if (activeVariant === 'control') {
      setAnnualBilling(false);
    }
    setSelectedPlanMessage(null);
  }, [activeVariant]);

  const invocationsCost = millionsInvocations * RATE_PER_MILLION_INVOCATIONS;
  const egressCost = egressGb * RATE_PER_GB_EGRESS;
  const totalMeteredCost = invocationsCost + egressCost;
  const deltaVsFleet = totalMeteredCost - 79;

  const handleSelectPlan = (tier: TierSpec) => {
    const rate = annualBilling ? tier.annualPrice : tier.monthlyPrice;
    const cadence = annualBilling ? 'billed annually' : 'billed monthly';
    setSelectedPlanMessage(
      `Provisioning quote locked: ${tier.name} ($${rate}/mo ${cadence}) · Ready for cluster iad-edge-04.`,
    );
  };

  const viewKey = activeVariant === 'usage_based' ? 'usage_based' : 'tiered';

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-16">
      <Reveal className="space-y-8">
        {/* Header + billing control */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-label uppercase text-ink-muted">
                  COMPUTE COMMITMENT
                </span>
                <Badge variant="accent">pricing_experiment = {activeVariant}</Badge>
                {isOverridden && <Badge variant="solid">OVERRIDDEN</Badge>}
              </div>

              <h2
                id="pricing-heading"
                className="font-display text-display tracking-[-0.035em]"
              >
                <span className="font-extralight text-ink-secondary">Edge</span>{' '}
                <span className="font-extrabold text-ink-primary">Rate Ledger</span>
              </h2>
            </div>

            {/* Live Flagsmith pricing variant indicator rail */}
            <div
              role="list"
              aria-label="Active Flagsmith pricing_experiment variant"
              className="inline-flex flex-wrap items-center gap-2 border border-rule-subtle bg-surface p-2"
            >
              {PRICING_VARIANTS.map((item) => {
                const isCurrent = item.id === activeVariant;
                return (
                  <div
                    key={item.id}
                    role="listitem"
                    aria-current={isCurrent ? 'true' : undefined}
                    className="relative inline-flex h-8 items-center px-4 font-mono text-micro uppercase tabular-nums"
                  >
                    {isCurrent && (
                      <motion.span
                        layoutId="pricing-variant-indicator"
                        transition={SPRING_CALM}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-sm border border-accent-border bg-accent-tint"
                      />
                    )}
                    <span
                      className={cn(
                        'relative z-10 transition-colors duration-150',
                        isCurrent ? 'font-semibold text-accent' : 'text-ink-muted',
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {activeVariant !== 'usage_based' ? (
              <motion.div
                key="billing-toggle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE_TECHNICAL }}
                className="flex flex-wrap items-center gap-4"
              >
                <span
                  className={cn(
                    'font-mono text-label uppercase transition-colors duration-150',
                    !annualBilling ? 'text-ink-primary' : 'text-ink-muted',
                  )}
                >
                  Monthly
                </span>
                <Switch
                  id="pricing-billing-cycle"
                  checked={annualBilling}
                  onCheckedChange={setAnnualBilling}
                  aria-label="Toggle annual billing commitment"
                />
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono text-label uppercase transition-colors duration-150',
                      annualBilling ? 'text-ink-primary' : 'text-ink-muted',
                    )}
                  >
                    Annual
                  </span>
                  <Badge variant={annualBilling ? 'solid' : 'accent'}>SAVE 19%</Badge>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="metered-caption"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE_TECHNICAL }}
                className="max-w-md font-mono text-micro uppercase text-ink-secondary tabular-nums"
              >
                METERED COMPUTE · ZERO PLATFORM MINIMUM · LIVE MONTHLY ESTIMATOR
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Annual-first accent strip */}
        <AnimatePresence initial={false}>
          {activeVariant === 'annual_first' && (
            <motion.div
              key="annual-first-callout"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={PRESENCE_TRANSITION}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule-subtle border-l-2 border-l-accent bg-surface px-6 py-4">
                <div className="space-y-2">
                  <span className="font-mono text-micro uppercase text-accent">
                    ANNUAL COMMIT VARIANT ACTIVE
                  </span>
                  <p className="font-sans text-sm text-ink-primary">
                    Production Fleet drops to{' '}
                    <span className="font-mono font-semibold text-accent tabular-nums">
                      $64/mo
                    </span>{' '}
                    (-$180/yr) and Dedicated Mesh drops to{' '}
                    <span className="font-mono font-semibold text-accent tabular-nums">
                      $340/mo
                    </span>{' '}
                    (-$960/yr) on 12-month edge capacity commits.
                  </p>
                </div>
                <Badge variant="solid">19% ANNUAL SAVINGS</Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE_TECHNICAL }}
          >
            {/* Control & Annual First: Crisp hairline specification ledger matrix */}
            {activeVariant !== 'usage_based' ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border-y border-rule-subtle">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-rule-subtle align-top">
                        <th className="w-48 py-6 pl-4 pr-6 font-mono text-label uppercase text-ink-muted">
                          SPECIFICATION
                        </th>
                        {PLAN_SPECS.map((tier) => {
                          const activePrice = annualBilling
                            ? tier.annualPrice
                            : tier.monthlyPrice;
                          const isFeaturedColumn =
                            Boolean(tier.highlighted) && activeVariant === 'annual_first';

                          return (
                            <th
                              key={tier.id}
                              className={cn(
                                'border-l border-rule-subtle px-6 py-6 align-top font-normal transition-colors duration-200',
                                isFeaturedColumn &&
                                  'border-t-2 border-t-accent bg-surface',
                              )}
                            >
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-display text-lg font-extrabold text-ink-primary">
                                    {tier.name}
                                  </span>
                                  {tier.highlighted && (
                                    <Badge
                                      variant={
                                        activeVariant === 'annual_first'
                                          ? 'solid'
                                          : 'accent'
                                      }
                                    >
                                      {activeVariant === 'annual_first'
                                        ? 'ANNUAL PICK'
                                        : 'STANDARD'}
                                    </Badge>
                                  )}
                                </div>

                                <p className="font-sans text-xs text-ink-secondary">
                                  {tier.tagline}
                                </p>

                                <div className="flex items-baseline gap-2 pt-2 font-mono tabular-nums">
                                  <AnimatedNumber
                                    value={activePrice}
                                    prefix="$"
                                    className="text-metric font-extrabold leading-none text-ink-primary"
                                  />
                                  <span className="text-label font-extralight text-ink-secondary">
                                    /mo
                                  </span>
                                  {annualBilling && tier.annualSavingsPct > 0 && (
                                    <span className="text-micro text-ink-muted line-through">
                                      ${tier.monthlyPrice}
                                    </span>
                                  )}
                                </div>

                                {annualBilling && tier.annualSavingsPct > 0 ? (
                                  <p className="font-mono text-micro uppercase text-accent tabular-nums">
                                    Save {tier.annualSavingsPct}% · billed annually
                                  </p>
                                ) : (
                                  <p className="font-mono text-micro uppercase text-ink-muted">
                                    {tier.monthlyPrice === 0
                                      ? 'No credit card required'
                                      : 'Month-to-month capacity'}
                                  </p>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-rule-subtle font-mono text-xs tabular-nums">
                      <tr className="group transition-colors duration-150 hover:bg-surface">
                        <td className="relative py-4 pl-4 pr-6 text-micro uppercase text-ink-muted">
                          <TactileRowEdge />
                          REQUEST QUOTA
                        </td>
                        {PLAN_SPECS.map((tier) => (
                          <td
                            key={tier.id}
                            className={cn(
                              'border-l border-rule-subtle px-6 py-4 text-ink-primary transition-colors duration-150',
                              tier.highlighted &&
                                activeVariant === 'annual_first' &&
                                'bg-surface',
                            )}
                          >
                            {tier.requests}
                          </td>
                        ))}
                      </tr>

                      <tr className="group transition-colors duration-150 hover:bg-surface">
                        <td className="relative py-4 pl-4 pr-6 text-micro uppercase text-ink-muted">
                          <TactileRowEdge />
                          EDGE FOOTPRINT
                        </td>
                        {PLAN_SPECS.map((tier) => (
                          <td
                            key={tier.id}
                            className={cn(
                              'border-l border-rule-subtle px-6 py-4 text-ink-secondary transition-colors duration-150',
                              tier.highlighted &&
                                activeVariant === 'annual_first' &&
                                'bg-surface',
                            )}
                          >
                            {tier.footprint}
                          </td>
                        ))}
                      </tr>

                      <tr className="group transition-colors duration-150 hover:bg-surface">
                        <td className="relative py-4 pl-4 pr-6 text-micro uppercase text-ink-muted">
                          <TactileRowEdge />
                          AVAILABILITY SLA
                        </td>
                        {PLAN_SPECS.map((tier) => (
                          <td
                            key={tier.id}
                            className={cn(
                              'border-l border-rule-subtle px-6 py-4 text-ink-primary transition-colors duration-150',
                              tier.highlighted &&
                                activeVariant === 'annual_first' &&
                                'bg-surface',
                            )}
                          >
                            {tier.sla}
                          </td>
                        ))}
                      </tr>

                      <tr className="group transition-colors duration-150 hover:bg-surface">
                        <td className="relative py-4 pl-4 pr-6 text-micro uppercase text-ink-muted">
                          <TactileRowEdge />
                          NETWORK &amp; COMPLIANCE
                        </td>
                        {PLAN_SPECS.map((tier) => (
                          <td
                            key={tier.id}
                            className={cn(
                              'border-l border-rule-subtle px-6 py-4 text-ink-secondary transition-colors duration-150',
                              tier.highlighted &&
                                activeVariant === 'annual_first' &&
                                'bg-surface',
                            )}
                          >
                            {tier.security}
                          </td>
                        ))}
                      </tr>

                      <tr className="group transition-colors duration-150 hover:bg-surface">
                        <td className="relative py-6 pl-4 pr-6 text-micro uppercase text-ink-muted">
                          <TactileRowEdge />
                          ALLOCATION
                        </td>
                        {PLAN_SPECS.map((tier) => (
                          <td
                            key={tier.id}
                            className={cn(
                              'border-l border-rule-subtle px-6 py-6 transition-colors duration-150',
                              tier.highlighted &&
                                activeVariant === 'annual_first' &&
                                'bg-surface',
                            )}
                          >
                            <Button
                              variant={
                                tier.highlighted
                                  ? 'primary'
                                  : tier.id === 'mesh'
                                    ? 'outline'
                                    : 'secondary'
                              }
                              size="sm"
                              onClick={() => handleSelectPlan(tier)}
                            >
                              {tier.cta}
                            </Button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <AnimatePresence initial={false}>
                  {selectedPlanMessage && (
                    <motion.div
                      key={selectedPlanMessage}
                      role="status"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.24, ease: EASE_TECHNICAL }}
                      className="flex items-center gap-2 border border-accent-border bg-accent-tint px-4 py-2 font-mono text-xs text-accent tabular-nums"
                    >
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{selectedPlanMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Variant 3: usage_based — Interactive metered compute rate ledger */
              <div className="grid grid-cols-1 border-y border-rule-subtle lg:grid-cols-12">
                {/* Left: Unit rate table + workload estimators */}
                <div className="space-y-8 py-8 lg:col-span-7 lg:pr-8">
                  <div className="divide-y divide-rule-subtle border-y border-rule-subtle font-mono text-xs tabular-nums">
                    <LedgerRow
                      hoverTone="surface"
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <span className="text-ink-secondary">
                        Edge Runtime Invocations
                      </span>
                      <span className="font-semibold text-ink-primary">
                        $0.18 / 1M invocations
                      </span>
                    </LedgerRow>
                    <LedgerRow
                      hoverTone="surface"
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <span className="text-ink-secondary">Global Anycast Egress</span>
                      <span className="font-semibold text-ink-primary">
                        $0.045 / GB egress
                      </span>
                    </LedgerRow>
                    <LedgerRow
                      hoverTone="surface"
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <span className="text-ink-secondary">
                        Zero-Cold-Start Isolate Idle
                      </span>
                      <span className="text-accent">$0.00 / idle hour</span>
                    </LedgerRow>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <label
                        htmlFor="metered-invocations"
                        className="block font-mono text-label uppercase text-ink-muted"
                      >
                        MONTHLY INVOCATIONS (MILLIONS)
                      </label>
                      <Input
                        id="metered-invocations"
                        type="number"
                        min={0}
                        max={50000}
                        step={5}
                        value={millionsInvocations}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setMillionsInvocations(
                            Number.isFinite(next) && next >= 0 ? next : 0,
                          );
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {INVOCATION_PRESETS.map((preset) => (
                          <Button
                            key={preset}
                            variant={
                              millionsInvocations === preset ? 'outline' : 'secondary'
                            }
                            size="sm"
                            onClick={() => setMillionsInvocations(preset)}
                          >
                            {preset >= 1000 ? `${preset / 1000}B` : `${preset}M`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label
                        htmlFor="metered-egress"
                        className="block font-mono text-label uppercase text-ink-muted"
                      >
                        MONTHLY EGRESS TRANSFER (GB)
                      </label>
                      <Input
                        id="metered-egress"
                        type="number"
                        min={0}
                        max={100000}
                        step={50}
                        value={egressGb}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setEgressGb(Number.isFinite(next) && next >= 0 ? next : 0);
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {EGRESS_PRESETS.map((preset) => (
                          <Button
                            key={preset}
                            variant={egressGb === preset ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={() => setEgressGb(preset)}
                          >
                            {preset >= 1000 ? `${preset / 1000} TB` : `${preset} GB`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Live metered bill readout */}
                <div className="flex flex-col justify-between gap-6 border-t border-rule-subtle bg-surface p-6 md:p-8 lg:col-span-5 lg:border-l lg:border-t-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-label uppercase text-ink-muted">
                        LIVE METERED ESTIMATE
                      </span>
                      <Badge variant="accent">USAGE_BASED</Badge>
                    </div>

                    <div className="divide-y divide-rule-subtle font-mono text-xs tabular-nums">
                      <LedgerRow
                        hoverTone="elevated"
                        className="flex items-center justify-between gap-2 px-2 py-2"
                      >
                        <span className="text-ink-secondary">
                          {millionsInvocations.toLocaleString()}M × $0.18
                        </span>
                        <AnimatedNumber
                          value={invocationsCost}
                          prefix="$"
                          decimals={2}
                          className="text-ink-primary"
                        />
                      </LedgerRow>
                      <LedgerRow
                        hoverTone="elevated"
                        className="flex items-center justify-between gap-2 px-2 py-2"
                      >
                        <span className="text-ink-secondary">
                          {egressGb.toLocaleString()} GB × $0.045
                        </span>
                        <AnimatedNumber
                          value={egressCost}
                          prefix="$"
                          decimals={2}
                          className="text-ink-primary"
                        />
                      </LedgerRow>
                      <LedgerRow
                        hoverTone="elevated"
                        className="flex items-center justify-between gap-2 px-2 py-2"
                      >
                        <span className="text-ink-secondary">Base platform fee</span>
                        <span className="text-ink-muted">$0.00</span>
                      </LedgerRow>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-2">
                      <p className="font-mono text-label uppercase text-ink-muted">
                        ESTIMATED MONTHLY TOTAL
                      </p>
                      <p className="font-mono text-metric leading-none tabular-nums">
                        <AnimatedNumber
                          value={totalMeteredCost}
                          prefix="$"
                          decimals={2}
                          className="font-extrabold text-accent"
                        />{' '}
                        <span className="text-base font-extralight text-ink-secondary">
                          /mo
                        </span>
                      </p>
                      <p className="font-mono text-micro text-ink-secondary tabular-nums">
                        {deltaVsFleet <= 0 ? (
                          <>
                            <AnimatedNumber
                              value={Math.abs(deltaVsFleet)}
                              prefix="$"
                              decimals={2}
                            />
                            /mo below fixed Production Fleet ($79/mo)
                          </>
                        ) : (
                          <>
                            <AnimatedNumber
                              value={deltaVsFleet}
                              prefix="+$"
                              decimals={2}
                            />
                            /mo above fixed Production Fleet — annual commit recommended
                          </>
                        )}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() =>
                        setSelectedPlanMessage(
                          `Metered quota enabled ($${totalMeteredCost.toFixed(2)}/mo est. at ${millionsInvocations}M req + ${egressGb} GB egress).`,
                        )
                      }
                    >
                      Enable Metered Billing
                    </Button>

                    <AnimatePresence initial={false}>
                      {selectedPlanMessage && (
                        <motion.p
                          key={selectedPlanMessage}
                          role="status"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.22, ease: EASE_TECHNICAL }}
                          className="font-mono text-micro text-accent tabular-nums"
                        >
                          {selectedPlanMessage}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Reveal>
    </section>
  );
};
