import * as React from 'react';
import { Check, Copy, CornerDownLeft, RotateCcw, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export interface CopilotContextSnapshot {
  identity: string | null;
  accent: string;
  pricingVariant: string;
  onboardingVariant: string;
  promoEnabled: boolean;
}

export interface AiCopilotPanelProps {
  enabled: boolean;
  isOverridden?: boolean;
  context: CopilotContextSnapshot;
}

interface DiagnosticEntry {
  id: string;
  prompt: string;
  traceId: string;
  timestamp: string;
  summary: string;
  codeBlock?: string;
}

const PRESET_PROMPTS = [
  'Why did fra-edge-02 p99 spike at 14:22 UTC?',
  'Diff flag states between Development and Production',
  'Generate canary rollback manifest',
] as const;

const ROLLBACK_MANIFEST = `apiVersion: meridian.cloud/v1alpha2
kind: EdgeCanaryRollback
metadata:
  cluster: iad-edge-04
  triggeredBy: diagnostic-copilot
spec:
  failedSha: 8f3c91a
  restoreSha: 7c21d04
  canaryTrafficWeight: 0
  drainTimeoutSeconds: 15
  preserveTelemetryTraces: true`;

function buildDiagnosticResponse(
  prompt: string,
  context: CopilotContextSnapshot,
  seq: number,
): DiagnosticEntry {
  const lower = prompt.toLowerCase();
  const timestamp = new Date().toISOString().slice(11, 19) + ' UTC';

  if (lower.includes('fra-edge-02') || lower.includes('spike') || lower.includes('p99')) {
    return {
      id: `diag-${seq}`,
      prompt,
      traceId: 'trc_fra02_1422z',
      timestamp,
      summary:
        'DE-CIX transit peer AS6695 announced a 94-second BGP route flap at 14:22:08 UTC, pushing fra-edge-02 tail RTT to 37.0 ms (+22.8 ms). Anycast health probes auto-drained 38% of EU ingress to iad-edge-04 and restored global p99 to 14.2 ms by 14:23:42 UTC.',
      codeBlock: [
        'POP           WINDOW         P99_PEAK   P99_NOW   ACTION',
        'fra-edge-02   14:22-14:23Z   37.0 ms    15.4 ms   auto-drained 38%',
        'iad-edge-04   14:22-14:23Z   14.9 ms    14.2 ms   absorbed overflow',
      ].join('\n'),
    };
  }

  if (lower.includes('diff') || lower.includes('drift') || lower.includes('flag')) {
    return {
      id: `diag-${seq}`,
      prompt,
      traceId: 'trc_flagsmith_diff',
      timestamp,
      summary: `Seeded Development vs Production comparison across 5 Flagsmith features (active identity: ${context.identity ?? 'Anonymous'}, live accent: ${context.accent}). Open ToggleDock -> Drift tab for live Admin API sync.`,
      codeBlock: [
        'FLAG                 DEVELOPMENT              PRODUCTION           STATE',
        `promo_banner         enabled=${context.promoEnabled ? 'true ' : 'false'}            enabled=false        DRIFT`,
        'ai_copilot_widget    enabled=true             enabled=false        DRIFT',
        `pricing_experiment   ${context.pricingVariant.padEnd(24)} off / control        DRIFT`,
        `onboarding_flow      ${context.onboardingVariant.padEnd(24)} direct_dashboard     DRIFT`,
        `theme_accent         ${context.accent.padEnd(24)} indigo               DRIFT`,
      ].join('\n'),
    };
  }

  if (lower.includes('rollback') || lower.includes('manifest') || lower.includes('canary')) {
    return {
      id: `diag-${seq}`,
      prompt,
      traceId: 'trc_canary_rollback',
      timestamp,
      summary:
        'Generated deterministic canary rollback manifest for cluster iad-edge-04 shifting 100% traffic from sha 8f3c91a back to verified stable build sha 7c21d04.',
      codeBlock: ROLLBACK_MANIFEST,
    };
  }

  return {
    id: `diag-${seq}`,
    prompt,
    traceId: `trc_iad04_${String(seq).padStart(3, '0')}`,
    timestamp,
    summary: `Cluster iad-edge-04 telemetry nominal at 42,810 req/s (99.984% 2xx, p99 14.2 ms). Active session context: identity=${context.identity ?? 'Anonymous'}, theme_accent=${context.accent}, pricing_experiment=${context.pricingVariant}, onboarding_flow=${context.onboardingVariant}.`,
  };
}

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  enabled,
  isOverridden = false,
  context,
}) => {
  const [query, setQuery] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<DiagnosticEntry[]>(() => [
    buildDiagnosticResponse(PRESET_PROMPTS[0], context, 1),
  ]);

  if (!enabled) {
    return null;
  }

  const runPrompt = (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed) {
      return;
    }
    setEntries((prev) => [
      ...prev,
      buildDiagnosticResponse(trimmed, context, prev.length + 1),
    ]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runPrompt(query);
    setQuery('');
  };

  const handleCopyCode = async (entryId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(entryId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === entryId ? null : current));
      }, 1500);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <section aria-labelledby="copilot-heading" className="py-16">
      <div className="border border-rule-subtle bg-surface">
        {/* Panel header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">ai_copilot_widget = ON</Badge>
              {isOverridden && <Badge variant="solid">OVERRIDDEN</Badge>}
              <span className="font-mono text-micro uppercase text-ink-muted">
                DIAGNOSTIC INSTRUMENT · IAD-EDGE-04
              </span>
            </div>

            <h2
              id="copilot-heading"
              className="font-display text-display tracking-[-0.035em]"
            >
              <span className="font-extralight text-ink-secondary">Meridian</span>{' '}
              <span className="font-extrabold text-ink-primary">Diagnostic Copilot</span>
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setEntries([buildDiagnosticResponse(PRESET_PROMPTS[0], context, 1)])
            }
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Session</span>
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left runbook rail */}
          <div className="space-y-6 border-b border-rule-subtle p-6 lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <p className="font-mono text-label uppercase text-ink-muted">
                PRE-LOADED DIAGNOSTIC RUNBOOKS
              </p>
              <p className="font-sans text-xs text-ink-secondary">
                Select a deterministic telemetry query or inspect live Flagsmith flag
                context directly below.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <Button
                  key={preset}
                  variant="secondary"
                  size="md"
                  className="h-auto justify-start whitespace-normal px-4 py-4 text-left font-mono text-xs text-ink-primary"
                  onClick={() => runPrompt(preset)}
                >
                  <Terminal
                    className="h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>{preset}</span>
                </Button>
              ))}
            </div>

            <Separator />

            <div className="space-y-2 font-mono text-micro text-ink-muted tabular-nums">
              <p className="uppercase text-ink-secondary">ATTACHED FLAGSMITH CONTEXT</p>
              <p>identity: {context.identity ?? 'Anonymous'}</p>
              <p>theme_accent: {context.accent}</p>
              <p>pricing_experiment: {context.pricingVariant}</p>
              <p>onboarding_flow: {context.onboardingVariant}</p>
            </div>
          </div>

          {/* Right transcript & command input */}
          <div className="flex flex-col justify-between gap-6 p-6 lg:col-span-7">
            <div className="max-h-[420px] space-y-6 overflow-y-auto pr-2">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="space-y-4 border-l-2 border-accent pl-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-ink-primary">
                      &gt; {entry.prompt}
                    </p>
                    <span className="font-mono text-micro text-ink-muted tabular-nums">
                      {entry.traceId} · {entry.timestamp}
                    </span>
                  </div>

                  <p className="font-sans text-sm leading-relaxed text-ink-secondary">
                    {entry.summary}
                  </p>

                  {entry.codeBlock && (
                    <div className="border border-rule-subtle bg-canvas">
                      <div className="flex items-center justify-between border-b border-rule-subtle px-4 py-2">
                        <span className="font-mono text-micro uppercase text-ink-muted">
                          TELEMETRY OUTPUT
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCopyCode(entry.id, entry.codeBlock!)}
                        >
                          {copiedId === entry.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-ink-primary tabular-nums">
                        {entry.codeBlock}
                      </pre>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query cluster telemetry, flag drift, or canary manifests..."
                aria-label="Diagnostic copilot query"
              />
              <Button type="submit" variant="primary" size="md">
                <span>Run Query</span>
                <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
