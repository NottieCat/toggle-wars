import * as React from 'react';

export const BootScreen: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-canvas px-6 text-ink-primary"
    >
      {/* Full-bleed monochrome overhead wash softly breathing on --bg-canvas */}
      <div aria-hidden="true" className="ambient-hero-wash boot-wash-breathe z-0" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Precision orbital meridian reticle (echoing EdgeMeshCanvas geometry) */}
        <div
          aria-hidden="true"
          className="relative flex h-[72px] w-[72px] items-center justify-center"
        >
          {/* Static concentric hairline rings, meridian arc, and cardinal ticks */}
          <svg
            viewBox="0 0 72 72"
            fill="none"
            className="h-full w-full"
          >
            <circle
              cx="36"
              cy="36"
              r="32"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-subtle opacity-80"
            />
            <circle
              cx="36"
              cy="36"
              r="21"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-subtle opacity-55"
            />
            <ellipse
              cx="36"
              cy="36"
              rx="10"
              ry="21"
              stroke="currentColor"
              strokeWidth="0.75"
              className="text-rule-subtle opacity-45"
            />
            <line
              x1="36"
              y1="0"
              x2="36"
              y2="7"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-strong opacity-70"
            />
            <line
              x1="36"
              y1="65"
              x2="36"
              y2="72"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-strong opacity-70"
            />
            <line
              x1="0"
              y1="36"
              x2="7"
              y2="36"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-strong opacity-70"
            />
            <line
              x1="65"
              y1="36"
              x2="72"
              y2="36"
              stroke="currentColor"
              strokeWidth="1"
              className="text-rule-strong opacity-70"
            />
            <circle
              cx="36"
              cy="36"
              r="1.75"
              fill="currentColor"
              className="text-accent opacity-85"
            />
          </svg>

          {/* GPU-composited outer orbiting hairline arc */}
          <svg
            viewBox="0 0 72 72"
            fill="none"
            className="boot-reticle-orbit absolute inset-0 h-full w-full"
          >
            <circle
              cx="36"
              cy="36"
              r="32"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeDasharray="44 160"
              className="text-accent"
            />
          </svg>

          {/* GPU-composited inner counter-orbiting hairline sweep */}
          <svg
            viewBox="0 0 72 72"
            fill="none"
            className="boot-reticle-orbit-inner absolute inset-0 h-full w-full"
          >
            <circle
              cx="36"
              cy="36"
              r="21"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="20 115"
              className="text-ink-secondary opacity-50"
            />
          </svg>
        </div>

        {/* Breathing display wordmark */}
        <span className="boot-wordmark-breathe font-display text-metric tracking-[-0.03em]">
          <span className="font-extralight text-ink-secondary">Meridian</span>{' '}
          <span className="font-extrabold text-ink-primary">Cloud</span>
        </span>

        {/* Edge-faded breathing filament + whisper-quiet mono caption */}
        <div className="flex flex-col items-center gap-2">
          <span aria-hidden="true" className="boot-filament block" />
          <p className="font-mono text-micro uppercase tracking-[0.14em] text-ink-muted tabular-nums">
            INITIALIZING EDGE RUNTIME
          </p>
        </div>
      </div>
    </div>
  );
};
