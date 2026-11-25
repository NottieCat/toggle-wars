import * as React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import type { AdminHealthStatus } from 'toggledock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  adminProxyUrl: string;
  flagsmithDashboardUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  adminProxyUrl,
  flagsmithDashboardUrl = 'http://localhost:8000',
}) => {
  const [health, setHealth] = React.useState<AdminHealthStatus | null>(null);
  const [checking, setChecking] = React.useState<boolean>(true);

  React.useEffect(() => {
    let active = true;
    const base = adminProxyUrl.replace(/\/+$/, '');
    const healthEndpoint = `${base}/__health`;

    const pollHealth = async () => {
      try {
        const res = await fetch(healthEndpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = (await res.json()) as AdminHealthStatus;
        if (active) {
          setHealth(data);
          setChecking(false);
        }
      } catch {
        if (active) {
          setHealth({
            ok: false,
            version: null,
            status: 'unreachable',
          });
          setChecking(false);
        }
      }
    };

    void pollHealth();
    const intervalId = window.setInterval(() => {
      void pollHealth();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [adminProxyUrl]);

  const isHealthy = Boolean(health?.ok);
  const versionLabel = health?.version
    ? health.version.startsWith('v')
      ? health.version
      : `v${health.version}`
    : 'v2.295.2';

  const statusCopy = checking
    ? 'Checking Self-Hosted Flagsmith (localhost:8000)'
    : isHealthy
      ? 'Connected to Self-Hosted Flagsmith (localhost:8000)'
      : 'Self-Hosted Flagsmith Unreachable (localhost:8000)';

  return (
    <header className="bg-canvas">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-accent-border bg-accent-tint text-accent"
              aria-hidden="true"
            >
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-[-0.02em]">
              <span className="font-extralight text-ink-secondary">Meridian</span>{' '}
              <span className="font-extrabold text-ink-primary">Cloud</span>
            </span>
          </div>

          <Separator orientation="vertical" className="hidden h-4 sm:block" />

          <div className="flex flex-wrap items-center gap-2 font-mono text-label uppercase text-ink-muted tabular-nums">
            <span className="text-ink-secondary">iad-edge-04</span>
            <span aria-hidden="true">·</span>
            <span>v4.18.2-rc3</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                checking
                  ? 'bg-ink-muted'
                  : isHealthy
                    ? 'bg-accent'
                    : 'bg-danger',
              )}
              aria-hidden="true"
            />
            <span className="font-mono text-micro uppercase text-ink-secondary tabular-nums">
              {statusCopy}
            </span>
            {isHealthy && <Badge variant="accent">{versionLabel}</Badge>}
            {!checking && !isHealthy && <Badge variant="danger">OFFLINE</Badge>}
          </div>

          <Button variant="ghost" size="sm" asChild>
            <a
              href={flagsmithDashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-micro uppercase"
            >
              <span>Flagsmith Console</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  );
};
