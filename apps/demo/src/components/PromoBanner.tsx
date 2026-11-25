import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EASE_TECHNICAL, PRESENCE_TRANSITION } from '@/lib/motion';

export interface PromoBannerProps {
  enabled: boolean;
  isOverridden?: boolean;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  enabled,
  isOverridden = false,
}) => {
  const [dismissed, setDismissed] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);

  // Restore banner visibility whenever Flagsmith/ToggleDock re-enables the flag.
  React.useEffect(() => {
    if (enabled) {
      setDismissed(false);
    } else {
      setNotesOpen(false);
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.aside
          key="promo-banner-strip"
          aria-label="Meridian v4.18 runtime release announcement"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={PRESENCE_TRANSITION}
          className="overflow-hidden border-b border-rule-subtle bg-surface"
        >
          <div className="mx-auto max-w-[1200px] px-6 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-l-2 border-accent py-2 pl-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="solid">promo_banner = ON</Badge>
                  {isOverridden && <Badge variant="accent">OVERRIDDEN</Badge>}
                </div>
                <p className="font-sans text-sm text-ink-primary">
                  Meridian v4.18 Zero-Cold-Start Edge Runtime — 40% lower compute egress
                  on annual commits through Q4.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={notesOpen}
                  onClick={() => setNotesOpen((prev) => !prev)}
                >
                  <span>Inspect Release Notes</span>
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: notesOpen ? 180 : 0 }}
                    transition={{ duration: 0.22, ease: EASE_TECHNICAL }}
                    className="inline-flex items-center"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dismiss announcement strip"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {notesOpen && (
                <motion.div
                  key="promo-release-notes"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={PRESENCE_TRANSITION}
                  className="overflow-hidden"
                >
                  <Separator />
                  <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="font-mono text-micro uppercase text-ink-muted">
                        ISOLATE SNAPSHOT BOOT
                      </p>
                      <p className="font-mono text-sm text-ink-primary tabular-nums">
                        0.8 ms cold start · V8 pre-warmed heap
                      </p>
                      <p className="text-xs text-ink-secondary">
                        Eliminates TLS + runtime bootstrap stalls across all 18 Anycast
                        POPs.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-mono text-micro uppercase text-ink-muted">
                        EGRESS COMMIT PRICING
                      </p>
                      <p className="font-mono text-sm text-ink-primary tabular-nums">
                        $0.027 / GB committed · down from $0.045 / GB
                      </p>
                      <p className="text-xs text-ink-secondary">
                        Applied automatically to annual Production Fleet and Dedicated
                        Mesh commits.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-mono text-micro uppercase text-ink-muted">
                        DEPLOY ARTIFACT
                      </p>
                      <p className="font-mono text-sm text-ink-primary tabular-nums">
                        v4.18.2-rc3 · sha 8f3c91a · iad-edge-04
                      </p>
                      <p className="text-xs text-ink-secondary">
                        Controlled via Flagsmith boolean gate{' '}
                        <code className="text-accent">promo_banner</code>.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
