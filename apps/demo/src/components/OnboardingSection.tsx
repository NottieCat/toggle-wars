import * as React from 'react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type OnboardingVariant = 'wizard' | 'direct_dashboard' | 'sample_data';

export interface OnboardingSectionProps {
  variant: string;
  isOverridden?: boolean;
}

interface WizardStep {
  num: string;
  id: string;
  title: string;
  target: string;
  detail: string;
}

const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  {
    num: '01',
    id: 'github',
    title: 'Connect GitHub repo meridian-api',
    target: 'branch main · webhook hmac-sha256',
    detail:
      'Attaches zero-downtime edge deploy hooks and validates V8 isolate bundle size (< 1.4 MB).',
  },
  {
    num: '02',
    id: 'secrets',
    title: 'Bind edge secrets to iad-edge-04',
    target: 'FLAGSMITH_ENV_KEY · UPSTREAM_TLS_CERT · EDGE_SIGNING_KEY',
    detail:
      'Replicates encrypted KMS envelopes across primary ingress POPs with 15-second rotation lease.',
  },
  {
    num: '03',
    id: 'canary',
    title: 'Verify canary traffic at 5%',
    target: 'sha 8f3c91a · auto-abort if p99 > 25 ms',
    detail:
      'Streams 5% of production checkout requests into v4.18.2-rc3 and compares tail latency deltas.',
  },
];

interface ClusterLogEntry {
  id: string;
  timestamp: string;
  pop: 'iad-edge-04' | 'fra-edge-02' | 'nrt-edge-01' | 'sjc-edge-07';
  method: string;
  route: string;
  status: number;
  p99Ms: string;
  sha: string;
}

const INITIAL_CLUSTER_LOGS: ReadonlyArray<ClusterLogEntry> = [
  {
    id: 'log-01',
    timestamp: '14:26:41.104 UTC',
    pop: 'iad-edge-04',
    method: 'POST',
    route: '/v4/checkout/authorize',
    status: 200,
    p99Ms: '13.8 ms',
    sha: '8f3c91a',
  },
  {
    id: 'log-02',
    timestamp: '14:26:39.882 UTC',
    pop: 'fra-edge-02',
    method: 'GET',
    route: '/v4/flags/evaluate',
    status: 200,
    p99Ms: '15.4 ms',
    sha: '8f3c91a',
  },
  {
    id: 'log-03',
    timestamp: '14:26:37.519 UTC',
    pop: 'nrt-edge-01',
    method: 'POST',
    route: '/v4/telemetry/ingest',
    status: 204,
    p99Ms: '11.9 ms',
    sha: '8f3c91a',
  },
  {
    id: 'log-04',
    timestamp: '14:26:34.205 UTC',
    pop: 'sjc-edge-07',
    method: 'GET',
    route: '/v4/sessions/verify',
    status: 200,
    p99Ms: '12.6 ms',
    sha: '8f3c91a',
  },
  {
    id: 'log-05',
    timestamp: '14:26:30.947 UTC',
    pop: 'iad-edge-04',
    method: 'POST',
    route: '/v4/edge-kv/replicate',
    status: 200,
    p99Ms: '14.2 ms',
    sha: '8f3c91a',
  },
];

interface SyntheticTraceState {
  burstRun: number;
  reqPerMin: number;
  p50: string;
  p95: string;
  p99: string;
  errorRate: string;
  popBreakdown: Array<{
    pop: string;
    requests: string;
    p50: string;
    p95: string;
    p99: string;
    status: string;
  }>;
}

const BASE_SYNTHETIC_TRACE: SyntheticTraceState = {
  burstRun: 1,
  reqPerMin: 12400,
  p50: '6.1',
  p95: '11.4',
  p99: '14.2',
  errorRate: '0.016%',
  popBreakdown: [
    {
      pop: 'iad-edge-04',
      requests: '4,210 / min',
      p50: '5.8 ms',
      p95: '10.6 ms',
      p99: '13.4 ms',
      status: 'NOMINAL',
    },
    {
      pop: 'fra-edge-02',
      requests: '3,480 / min',
      p50: '6.4 ms',
      p95: '12.1 ms',
      p99: '15.1 ms',
      status: 'NOMINAL',
    },
    {
      pop: 'nrt-edge-01',
      requests: '2,610 / min',
      p50: '6.2 ms',
      p95: '11.3 ms',
      p99: '14.0 ms',
      status: 'NOMINAL',
    },
    {
      pop: 'sjc-edge-07',
      requests: '2,100 / min',
      p50: '5.9 ms',
      p95: '11.2 ms',
      p99: '13.9 ms',
      status: 'NOMINAL',
    },
  ],
};

function normalizeOnboardingVariant(raw: string): OnboardingVariant {
  if (raw === 'direct_dashboard' || raw === 'sample_data' || raw === 'wizard') {
    return raw;
  }
  return 'wizard';
}

export const OnboardingSection: React.FC<OnboardingSectionProps> = ({
  variant,
  isOverridden = false,
}) => {
  const activeVariant = normalizeOnboardingVariant(variant);

  // Wizard state
  const [completedSteps, setCompletedSteps] = React.useState<Record<string, boolean>>({
    github: true,
    secrets: false,
    canary: false,
  });

  // Direct dashboard state
  const [selectedPop, setSelectedPop] = React.useState<string>('all');
  const [clusterLogs, setClusterLogs] = React.useState<ClusterLogEntry[]>([
    ...INITIAL_CLUSTER_LOGS,
  ]);
  const [probeCount, setProbeCount] = React.useState<number>(0);

  // Sample data state
  const [syntheticTrace, setSyntheticTrace] =
    React.useState<SyntheticTraceState>(BASE_SYNTHETIC_TRACE);

  const completedCount = WIZARD_STEPS.filter((s) => completedSteps[s.id]).length;

  const toggleStep = (stepId: string, checked: boolean) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: checked }));
  };

  const resetChecklist = () => {
    setCompletedSteps({ github: false, secrets: false, canary: false });
  };

  const handleTriggerProbe = () => {
    const pops: ClusterLogEntry['pop'][] = [
      'iad-edge-04',
      'fra-edge-02',
      'nrt-edge-01',
      'sjc-edge-07',
    ];
    const nextIdx = probeCount + 1;
    const pop =
      selectedPop === 'all'
        ? pops[probeCount % pops.length]
        : (selectedPop as ClusterLogEntry['pop']);
    const latency = (11.8 + ((nextIdx * 7) % 34) / 10).toFixed(1);
    const now = new Date();
    const utcTime = now.toISOString().slice(11, 23) + ' UTC';

    const entry: ClusterLogEntry = {
      id: `probe-${nextIdx}`,
      timestamp: utcTime,
      pop,
      method: 'POST',
      route: '/v4/canary/probe',
      status: 200,
      p99Ms: `${latency} ms`,
      sha: '8f3c91a',
    };

    setProbeCount(nextIdx);
    setClusterLogs((prev) => [entry, ...prev].slice(0, 8));
  };

  const handleRunSyntheticBurst = () => {
    setSyntheticTrace((prev) => {
      const nextRun = prev.burstRun + 1;
      const bump = (nextRun % 3) * 1850;
      const reqPerMin = 12400 + bump;
      const p50 = (6.1 + (nextRun % 3) * 0.2).toFixed(1);
      const p95 = (11.4 + (nextRun % 3) * 0.4).toFixed(1);
      const p99 = (14.2 + (nextRun % 3) * 0.6).toFixed(1);
      return {
        ...prev,
        burstRun: nextRun,
        reqPerMin,
        p50,
        p95,
        p99,
        errorRate: nextRun % 2 === 0 ? '0.012%' : '0.016%',
      };
    });
  };

  const handleResetSyntheticTrace = () => {
    setSyntheticTrace(BASE_SYNTHETIC_TRACE);
  };

  const visibleLogs =
    selectedPop === 'all'
      ? clusterLogs
      : clusterLogs.filter((entry) => entry.pop === selectedPop);

  return (
    <section aria-labelledby="onboarding-heading" className="py-16">
      <div className="space-y-8">
        {/* Section header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-label uppercase text-ink-muted">
                ACTIVATION PIPELINE
              </span>
              <Badge variant="accent">onboarding_flow = {activeVariant}</Badge>
              {isOverridden && <Badge variant="solid">OVERRIDDEN</Badge>}
            </div>

            <h2
              id="onboarding-heading"
              className="font-display text-display tracking-[-0.035em]"
            >
              <span className="font-extralight text-ink-secondary">Edge</span>{' '}
              <span className="font-extrabold text-ink-primary">Workspace Bootstrap</span>
            </h2>
          </div>

          <p className="max-w-md font-sans text-body text-ink-secondary">
            Multivariate Flagsmith experiment switching new cluster operators between a
            guided 3-step checklist, raw cluster logs, or synthetic load-test traces.
          </p>
        </div>

        {/* Variant 1: wizard */}
        {activeVariant === 'wizard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="font-mono text-label uppercase text-ink-secondary tabular-nums">
                  {completedCount} / {WIZARD_STEPS.length} STEPS VERIFIED
                </span>
                {completedCount === WIZARD_STEPS.length && (
                  <Badge variant="solid">READY FOR TRAFFIC CUTOVER</Badge>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={resetChecklist}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Checklist</span>
              </Button>
            </div>

            <div className="divide-y divide-rule-subtle border-y border-rule-subtle">
              {WIZARD_STEPS.map((step) => {
                const isDone = Boolean(completedSteps[step.id]);
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'grid grid-cols-1 items-center gap-4 py-6 transition-colors md:grid-cols-12',
                      isDone ? 'bg-surface px-4' : 'px-4',
                    )}
                  >
                    <div className="flex items-baseline gap-4 md:col-span-2">
                      <span
                        className={cn(
                          'font-mono text-metric leading-none tabular-nums',
                          isDone
                            ? 'font-extrabold text-accent'
                            : 'font-extralight text-ink-muted',
                        )}
                      >
                        {step.num}
                      </span>
                      {isDone && (
                        <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-7">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-body font-medium text-ink-primary">
                          {step.title}
                        </h3>
                        <Badge variant={isDone ? 'accent' : 'neutral'}>
                          {isDone ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                      </div>
                      <p className="font-mono text-micro text-ink-secondary tabular-nums">
                        {step.target}
                      </p>
                      <p className="font-sans text-sm text-ink-secondary">
                        {step.detail}
                      </p>
                    </div>

                    <div className="flex items-center justify-start gap-4 md:col-span-3 md:justify-end">
                      <label
                        htmlFor={`wizard-step-${step.id}`}
                        className="font-mono text-micro uppercase text-ink-muted"
                      >
                        {isDone ? 'Complete' : 'Mark verified'}
                      </label>
                      <Switch
                        id={`wizard-step-${step.id}`}
                        checked={isDone}
                        onCheckedChange={(checked) => toggleStep(step.id, checked)}
                        aria-label={`Toggle step ${step.num}: ${step.title}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Variant 2: direct_dashboard */}
        {activeVariant === 'direct_dashboard' && (
          <div className="border border-rule-subtle bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
              <div className="space-y-2">
                <span className="font-mono text-label uppercase text-ink-primary">
                  LIVE EDGE INGRESS LOG STREAM
                </span>
                <p className="font-mono text-micro text-ink-secondary tabular-nums">
                  Direct operator view · real-time POP request telemetry · sha 8f3c91a
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="accent">{visibleLogs.length} EVENTS</Badge>
                <Button variant="outline" size="sm" onClick={handleTriggerProbe}>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Trigger Canary Probe</span>
                </Button>
              </div>
            </div>

            <Tabs value={selectedPop} onValueChange={setSelectedPop}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">All POPs</TabsTrigger>
                <TabsTrigger value="iad-edge-04">iad-edge-04</TabsTrigger>
                <TabsTrigger value="fra-edge-02">fra-edge-02</TabsTrigger>
                <TabsTrigger value="nrt-edge-01">nrt-edge-01</TabsTrigger>
                <TabsTrigger value="sjc-edge-07">sjc-edge-07</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedPop}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-rule-subtle text-micro uppercase text-ink-muted">
                        <th className="py-2 pr-4 font-normal">Timestamp</th>
                        <th className="py-2 pr-4 font-normal">Cluster POP</th>
                        <th className="py-2 pr-4 font-normal">Route</th>
                        <th className="py-2 pr-4 font-normal">Status</th>
                        <th className="py-2 pr-4 font-normal">P99</th>
                        <th className="py-2 font-normal">Release</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule-subtle">
                      {visibleLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-elevated"
                        >
                          <td className="whitespace-nowrap py-4 pr-4 text-ink-muted">
                            {log.timestamp}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-ink-primary">
                            {log.pop}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-ink-secondary">
                            <span className="text-accent">{log.method}</span> {log.route}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4">
                            <Badge variant="accent">{log.status}</Badge>
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-ink-primary">
                            {log.p99Ms}
                          </td>
                          <td className="whitespace-nowrap py-4 text-ink-muted">
                            {log.sha}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Variant 3: sample_data */}
        {activeVariant === 'sample_data' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule-subtle py-4">
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="solid">SYNTHETIC TRACE #{syntheticTrace.burstRun}</Badge>
                <span className="font-mono text-sm text-ink-primary tabular-nums">
                  meridian-checkout-canary
                </span>
                <span className="font-mono text-micro uppercase text-ink-secondary tabular-nums">
                  {syntheticTrace.reqPerMin.toLocaleString()} synthetic req/min
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleRunSyntheticBurst}>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Run Synthetic Burst</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetSyntheticTrace}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset Trace</span>
                </Button>
              </div>
            </div>

            {/* Open 3x percentile strip */}
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="space-y-2">
                <p className="font-mono text-label uppercase text-ink-muted">P50 MEDIAN</p>
                <p className="font-mono text-metric leading-none tabular-nums">
                  <span className="font-extrabold text-ink-primary">
                    {syntheticTrace.p50}
                  </span>{' '}
                  <span className="text-base font-extralight text-ink-secondary">ms</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-label uppercase text-ink-muted">P95 TAIL</p>
                <p className="font-mono text-metric leading-none tabular-nums">
                  <span className="font-extrabold text-ink-primary">
                    {syntheticTrace.p95}
                  </span>{' '}
                  <span className="text-base font-extralight text-ink-secondary">ms</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-label uppercase text-ink-muted">
                  P99 SLO BUDGET
                </p>
                <p className="font-mono text-metric leading-none tabular-nums">
                  <span className="font-extrabold text-accent">
                    {syntheticTrace.p99}
                  </span>{' '}
                  <span className="text-base font-extralight text-ink-secondary">ms</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-label uppercase text-ink-muted">5XX RATE</p>
                <p className="font-mono text-metric leading-none tabular-nums">
                  <span className="font-extrabold text-ink-primary">
                    {syntheticTrace.errorRate}
                  </span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-rule-subtle bg-surface">
              <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-rule-subtle text-micro uppercase text-ink-muted">
                    <th className="px-4 py-4 font-normal">Edge POP</th>
                    <th className="px-4 py-4 font-normal">Synthetic Volume</th>
                    <th className="px-4 py-4 font-normal">P50</th>
                    <th className="px-4 py-4 font-normal">P95</th>
                    <th className="px-4 py-4 font-normal">P99</th>
                    <th className="px-4 py-4 font-normal">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-subtle">
                  {syntheticTrace.popBreakdown.map((row) => (
                    <tr key={row.pop} className="hover:bg-elevated">
                      <td className="px-4 py-4 text-ink-primary">{row.pop}</td>
                      <td className="px-4 py-4 text-ink-secondary">{row.requests}</td>
                      <td className="px-4 py-4 text-ink-secondary">{row.p50}</td>
                      <td className="px-4 py-4 text-ink-secondary">{row.p95}</td>
                      <td className="px-4 py-4 text-ink-primary">{row.p99}</td>
                      <td className="px-4 py-4">
                        <Badge variant="accent">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
