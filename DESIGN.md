# ToggleDock & Meridian Cloud — Binding Design System (`DESIGN.md`)

> **Binding Rule:** Every UI file authored in `packages/toggledock` (Phase 3) and `apps/demo` (Phase 4) MUST conform strictly to this document. No hardcoded hex colors, no banned fonts, no generic SaaS card grids, no hand-rolled duplicate primitives, and no placeholder copy.

---

## 1. Aesthetic Direction

- **Direction:** **`technical`** — precision engineering workbench and live telemetry instrument.
- **Mental Model:** Oscilloscope console meets flight-recorder ledger (Linear / Raycast / hardware analyzer restraint). Never "modern and clean", never marketing-template fluff, never playful gradients.
- **Primary Structural Law:** **Hierarchy comes from typography and negative space — NOT from borders, boxes, and drop shadows.**
  - Let major sections breathe directly on `--bg-canvas` (`#0A0C0E`) separated by generous `64px`–`96px` vertical rhythm and occasional full-bleed `1px` hairline rules (`--rule-subtle`).
  - Elevate a surface (`--bg-surface` / `--bg-elevated`) ONLY for active interactive panels, drawers, data tables, or focused telemetry strips — never wrap every block in a rounded rectangle.

---

## 2. Repo Audit Summary

Audited workspace files as of Checkpoint 2.5 (foundation & primitives only; zero page/feature UI written):

| File | Verified Role |
| --- | --- |
| `package.json` | Root workspace `toggledock-monorepo` (`packages/*`, `apps/*`, Node `>=20`, Flagsmith Docker + bootstrap scripts). |
| `packages/toggledock/package.json` | Library `"toggledock"` (`0.1.0`, ESM + CJS exports `"."` and `"./vite"`, `tsup`, `vitest`, peerDeps `react`, `react-dom`, `flagsmith`). |
| `apps/demo/package.json` | Demo app `"demo"` (Vite 6, React 18, Tailwind CSS `^3.4.17`, `flagsmith`, `toggledock: "*"`, Radix primitives, `cva`, `clsx`, `tailwind-merge`, `lucide-react`). |
| `apps/demo/tailwind.config.ts` | Maps CSS variables (`canvas`, `surface`, `elevated`, `ink.*`, `rule.*`, `accent.*`, `danger.*`), strict `8px` spacing aliases (`r1`–`r12`), `3×` type scale tokens (`micro`, `label`, `body`, `metric`, `display`, `hero`), and Google font stacks. |
| `apps/demo/src/styles/globals.css` | Declares `:root` Matte Instrument Carbon ramp, Signal Emerald default accent, `[data-accent="emerald"\|"amber"\|"indigo"]` flat-solid overrides, typography tokens, `8px` spacing variables, and dark `color-scheme`. |
| `apps/demo/index.html` | Loads `Bricolage Grotesque` (`200;800`), `Plus Jakarta Sans` (`200;400;500;800`), and `JetBrains Mono` (`200;400;600;800`) via Google Fonts; sets `<html lang="en" data-accent="emerald">`. |
| `apps/demo/src/lib/utils.ts` | Exports `cn(...inputs: ClassValue[]): string` (`clsx` + `tailwind-merge`). |
| `apps/demo/src/components/ui/*` | 6 audited technical primitives: `button.tsx`, `badge.tsx`, `switch.tsx`, `tabs.tsx`, `input.tsx`, `separator.tsx`. |

---

## 3. Typography

### 3.1 Approved Font Families

| Role | Family | CSS Variable / Tailwind Class | Loaded Weights | Usage |
| --- | --- | --- | --- | --- |
| **Display** | `Bricolage Grotesque` | `--font-display` / `font-display` | `200`, `800` | Hero headlines, section titles, big metric display pairs (contrast `200` light prefix with `800` heavy focal noun). |
| **Body** | `Plus Jakarta Sans` | `--font-sans` / `font-sans` | `200`, `400`, `500`, `800` | Prose, descriptions, controls, pricing copy, drawer instructions. |
| **Monospace** | `JetBrains Mono` | `--font-mono` / `font-mono` | `200`, `400`, `600`, `800` | Flag keys, environment keys, latency/throughput telemetry, timestamps, code snippets, uppercase micro-eyebrows. **Always `tabular-nums`.** |

### 3.2 Explicit Font Ban List

The following typefaces are **strictly forbidden** in CSS, Tailwind config, inline styles, and `packages/toggledock` stylesheets:

- `Inter`
- `Roboto`
- `Open Sans`
- `Arial`
- `system-ui`
- `-apple-system`
- `BlinkMacSystemFont`
- `Segoe UI`

> For `packages/toggledock` (distributed library): inherit `--td-font-sans` / `--td-font-mono` defaulting to `"Plus Jakarta Sans", sans-serif` and `"JetBrains Mono", monospace` — never fall back to banned system font names.

### 3.3 Weight Extremes & `3×` Type Scale Jumps

Avoid timid `1.5×` size steps (like `14px → 20px`) or uniform `500`/`600` weight soup. Create unmistakable contrast using **weight extremes (`200` vs `800`)** and **`3×` scale ratios**:

| Token (`tailwind.config.ts`) | Size / Line-Height | Tracking | Weight Pairing | Role |
| --- | --- | --- | --- | --- |
| `text-micro` | `11px / 16px` | `+0.08em` | `400` or `600` (`font-mono uppercase`) | Telemetry eyebrows, table column headers, badge text |
| `text-label` | `12px / 16px` | `+0.06em` | `400` or `600` (`font-mono uppercase`) | Base small anchor (`1×` for `metric`) |
| `text-body` | `16px / 24px` | `-0.005em` | `200` (lead) / `400` (copy) / `500` (emphasis) | Base body anchor (`1×` for `display`) |
| `text-metric` | `36px / 40px` | `-0.03em` | `200` (unit) + `800` (value) | **`3×` jump from `12px` `label`** — KPI telemetry numbers, prices |
| `text-display` | `48px / 56px` | `-0.035em` | `200` + `800` (`font-display`) | **`3×` jump from `16px` `body`** — major section headlines |
| `text-hero` | `72px / 72px` | `-0.04em` | `200` + `800` (`font-display`) | **`6×` jump from `12px` `label`** — primary workbench headline |

Example display pairing:
`<h1 className="font-display text-hero tracking-[-0.04em]"><span className="font-extralight text-ink-secondary">Deterministic</span> <span className="font-extrabold text-ink-primary">Release Control</span></h1>`

---

## 4. Color System (CSS Custom Properties Only)

### 4.1 Palette Discipline: ONE Dominant + ONE Accent

- **Dominant Color Family:** **Matte Instrument Carbon** (deep neutral graphite surfaces + calibrated neutral ink steps).
- **Accent Color:** **ONE active flat solid accent** at any moment (default **Signal Emerald**), switched deterministically by the Flagsmith `theme_accent` flag via `<html data-accent="emerald" | "amber" | "indigo">`.
- **Semantic Fault Reserve:** `--status-danger` (`#E5484D`) is reserved strictly for errors, destructive actions, and live drift warnings — never for decoration.

### 4.2 CSS Custom Properties (`apps/demo/src/styles/globals.css`)

| Token | Value | Tailwind Utility | Role |
| --- | --- | --- | --- |
| `--bg-canvas` | `#0A0C0E` | `bg-canvas` | Primary page canvas |
| `--bg-surface` | `#111418` | `bg-surface` | Recessed inputs, drawer shell, subtle strip |
| `--bg-elevated` | `#171B21` | `bg-elevated` | Active row hover, secondary controls, floating pill |
| `--ink-primary` | `#F1F3F5` | `text-ink-primary` | Primary headlines, active values, strong numbers |
| `--ink-secondary` | `#8A939E` | `text-ink-secondary` | Body prose, metadata, descriptions |
| `--ink-muted` | `#565F6B` | `text-ink-muted` | Disabled copy, placeholders, subtle labels |
| `--rule-subtle` | `#20252D` | `border-rule-subtle` | 1px structural hairlines & table dividers |
| `--rule-strong` | `#2E3540` | `border-rule-strong` | Interactive control borders & hover dividers |
| `--status-danger` | `#E5484D` | `text-danger` | Error states, failed requests, delete actions |
| `--status-danger-tint` | `rgba(229, 72, 77, 0.12)` | `bg-danger-tint` | Error banner / destructive button surface |

### 4.3 Flagsmith `theme_accent` Swap Table (Single Accent + Architectural Lighting Tokens)

| `theme_accent` Value | `[data-accent]` | `--accent` | `--accent-hover` | `--accent-ink` | `--accent-tint` | `--accent-border` |
| --- | --- | --- | --- | --- | --- | --- |
| `"emerald"` (Dev default) | `emerald` | `#10B981` | `#059669` | `#041A12` | `rgba(16, 185, 129, 0.12)` | `rgba(16, 185, 129, 0.36)` |
| `"amber"` (`beta_testers` override) | `amber` | `#F59E0B` | `#D97706` | `#1C1102` | `rgba(245, 158, 11, 0.12)` | `rgba(245, 158, 11, 0.36)` |
| `"indigo"` (Prod default) | `indigo` | `#5B7CFA` | `#4366F5` | `#070E29` | `rgba(91, 124, 250, 0.14)` | `rgba(91, 124, 250, 0.38)` |

Calibrated single-accent architectural lighting tokens (`apps/demo/src/styles/globals.css`; all radial washes/sheens strictly `<= 8%` alpha):

| `[data-accent]` | `--accent-ambient` (`<= 8%`) | `--accent-spotlight` (`<= 8%`) | `--accent-sheen` (`<= 8%`) | `--accent-beam` | `--accent-beam-soft` |
| --- | --- | --- | --- | --- | --- |
| `emerald` | `rgba(16, 185, 129, 0.065)` | `rgba(16, 185, 129, 0.05)` | `rgba(16, 185, 129, 0.055)` | `rgba(16, 185, 129, 0.35)` | `rgba(16, 185, 129, 0.16)` |
| `amber` | `rgba(245, 158, 11, 0.065)` | `rgba(245, 158, 11, 0.05)` | `rgba(245, 158, 11, 0.055)` | `rgba(245, 158, 11, 0.35)` | `rgba(245, 158, 11, 0.16)` |
| `indigo` | `rgba(91, 124, 250, 0.07)` | `rgba(91, 124, 250, 0.055)` | `rgba(91, 124, 250, 0.06)` | `rgba(91, 124, 250, 0.38)` | `rgba(91, 124, 250, 0.17)` |

### 4.4 Architectural Lighting Scope & Hard Color Bans

- **Permitted Narrow Exception — Monochrome Single-Accent Architectural Lighting on `#0A0C0E`:**
  - Ultra-low-opacity radial light washes (`<= 8%` opacity: `--accent-ambient`, `--accent-spotlight`, `--accent-sheen`) derived purely from the single active `--accent` token and dissolving cleanly to `transparent` into `--bg-canvas` (`#0A0C0E`) with zero hard edges.
  - Crisp `1px` specular hairline gradient beams (`transparent → var(--accent-beam) → transparent` and `--accent-beam-soft`) along instrument panel top edges and tactile hover control edges.
  - All architectural lighting gradients and custom properties MUST live strictly in `apps/demo/src/styles/globals.css`.
- **ZERO purple or indigo gradients on white**, ZERO multi-color neon rainbows, ZERO blurred glow blobs / glowing neon orbs, and ZERO decorative marketing `bg-gradient-to-*` backdrops.
- **ZERO light-mode white cards with purple/indigo accents.**
- **ZERO `0.1`-opacity drop-shadow soup** (`shadow-sm`, `shadow-md`, `shadow-lg`, `box-shadow`, `drop-shadow`, `shadowBlur`).
- **ZERO 3-cards-in-a-row** layouts and **ZERO banned fonts** (Section 3.2).
- **ZERO raw `#hex`, `rgb()`, `rgba()`, or `hsl()` literals inside component `.tsx` / `.ts` files.** Always reference semantic Tailwind classes (`bg-canvas`, `text-accent`, `border-rule-subtle`), CSS classes in `globals.css`, or CSS variables (`var(--td-accent)`).
- **NEVER `cursor: none`.** Any pointer spotlight or telemetry reticle MUST keep the native OS cursor 100% visible, remain `pointer-events: none`, stay below `<ToggleDock />` (`z-index: 9999`), and gate strictly behind `(hover: hover) and (pointer: fine)` and `(prefers-reduced-motion: no-preference)`.

---

## 5. Spacing Rhythm (`8px` Grid)

All padding, margins, gaps, and section offsets MUST adhere to the `8px` grid:

| Rhythm Step | Pixels | CSS Variable | Tailwind Utilities | Typical Use |
| --- | --- | --- | --- | --- |
| `1×` | `8px` | `--space-1` | `gap-2`, `p-2`, `space-y-2`, `p-r1` | Tight label-to-value pair, inline icon gap |
| `2×` | `16px` | `--space-2` | `gap-4`, `p-4`, `py-4`, `p-r2` | Control group spacing, table cell padding |
| `3×` | `24px` | `--space-3` | `gap-6`, `p-6`, `mt-6`, `p-r3` | Panel internal padding, tab content offset |
| `4×` | `32px` | `--space-4` | `gap-8`, `p-8`, `py-8`, `p-r4` | Major split column gutters, subsection spacing |
| `6×` | `48px` | `--space-6` | `py-12`, `gap-12`, `mt-12`, `py-r6` | Sub-band separation |
| `8×` | `64px` | `--space-8` | `py-16`, `mt-16`, `py-r8` | Primary section breaks |
| `12×` | `96px` | `--space-12` | `py-24`, `pt-24`, `py-r12` | Hero vertical breathing room |

> Micro-offsets (`2px`–`4px`) are permitted ONLY inside atomic input/badge/switch internals (already encapsulated in `components/ui/*`). Layout containers never use odd values like `p-3`, `gap-5`, or `mt-7`.

---

## 6. Audited Component Reuse Map

### 6.1 Demo App Primitives (`apps/demo/src/components/ui/*`)

Phase 4 workers MUST import and compose these audited primitives instead of writing raw `<button>`, `<input>`, `<hr>`, or custom toggles:

| Primitive | Import Path | Exported Symbols | Props & Variants |
| --- | --- | --- | --- |
| **Class Merge** | `@/lib/utils` | `cn` | `cn(...inputs: ClassValue[]): string` |
| **Button** | `@/components/ui/button` | `Button`, `buttonVariants`, `ButtonProps` | `variant`: `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' \| 'link'` (default `'primary'`). `size`: `'sm' \| 'md' \| 'lg' \| 'icon'` (default `'md'`). `asChild?: boolean`. Defaults `type="button"`. |
| **Badge** | `@/components/ui/badge` | `Badge`, `badgeVariants`, `BadgeProps` | `variant`: `'neutral' \| 'accent' \| 'solid' \| 'outline' \| 'danger'` (default `'neutral'`). Always `font-mono text-micro uppercase tabular-nums`. |
| **Switch** | `@/components/ui/switch` | `Switch`, `SwitchProps` | Full Radix `Switch.Root` props (`checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `id`, `aria-label`). Hardware pill `40×24px`, zero drop shadow. |
| **Tabs** | `@/components/ui/tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Full Radix `Tabs` props (`value`, `defaultValue`, `onValueChange`). Hairline bottom rule + `2px` `--accent` active bar; no pill boxes. |
| **Input** | `@/components/ui/input` | `Input`, `InputProps` | Standard `HTMLInputElement` props (`value`, `onChange`, `placeholder`, `type`, `disabled`). Flat `h-10` mono input on `--bg-surface`. |
| **Separator** | `@/components/ui/separator` | `Separator`, `SeparatorProps` | `orientation?: 'horizontal' \| 'vertical'`, `decorative?: boolean`, `emphasis?: 'subtle' \| 'strong'`. Crisp `1px` hairline rule. |

### 6.2 Planned Self-Contained Primitives for `packages/toggledock`

Because `toggledock` is a standalone, zero-Tailwind-dependency library that mounts inside any host React app, Phase 3 MUST implement a tiny self-contained `.td-*` design layer (injected via a single scoped stylesheet using `--td-*` CSS custom properties mirroring Section 4):

| Planned Primitive | Location (`packages/toggledock/src/components/primitives.tsx`) | Purpose & CSS Prefix |
| --- | --- | --- |
| `TdButton` | `packages/toggledock/src/components/primitives.tsx` | Compact `28px` / `32px` instrument button (`variant: 'accent' \| 'surface' \| 'ghost' \| 'danger'`). Class `.td-btn`. |
| `TdPill` | `packages/toggledock/src/components/primitives.tsx` | Mono uppercase status/source badge (`tone: 'neutral' \| 'accent' \| 'warn' \| 'danger'`, e.g., `LIVE`, `OVERRIDDEN`, `DRIFT`, `BETA`). Class `.td-pill`. |
| `TdSwitch` | `packages/toggledock/src/components/primitives.tsx` | Accessible `<button role="switch" aria-checked={...}>` matching the `36×20px` flat hardware track & thumb. Class `.td-switch`. |
| `TdRule` | `packages/toggledock/src/components/primitives.tsx` | Full-width `1px` `--td-rule-subtle` divider for ledger rows and section seams. Class `.td-rule`. |

**Style Isolation Contract for `packages/toggledock`:**
- Root element carries class `.td-root` and `data-td-accent="emerald" | "amber" | "indigo"`.
- Every CSS rule is prefixed with `.td-` and sets `box-sizing: border-box` inside `.td-root`.
- Zero reliance on host Tailwind classes; zero global resets that leak out into the host app.
- Zero `0.1`-opacity blurred shadows — drawer edge separation uses a crisp `1px solid var(--td-rule-strong)` left border and `z-index: 9999`.

---

## 7. Real Content Rule — Meridian Cloud Domain

All UI copy in `apps/demo` MUST depict **Meridian Cloud** — a real-feeling distributed edge compute & deployment telemetry platform. **ZERO** `Lorem ipsum`, `"Feature one / Feature two"`, `"Card 1 / Card 2"`, or generic filler copy.

### 7.1 Concrete Seeded Domain Data

- **Brand / Workspace:** `Meridian Cloud` · Cluster `iad-edge-04` · Release `v4.18.2-rc3`
- **Live Telemetry Strip (real tabular figures):**
  - `P99 EDGE LATENCY`: `14.2 ms` (`-1.8 ms vs baseline`)
  - `THROUGHPUT`: `42,810 req/s` (`99.984% 2xx`)
  - `ACTIVE REGIONS`: `18 / 18 POPs` (`iad`, `fra`, `nrt`, `sjc`)
  - `DEPLOY QUEUE`: `0 blocked` · last deploy `3m 12s ago` (`sha 8f3c91a`)
- **Flagsmith Flag → Meridian Cloud UI Bindings (matching `scripts/bootstrap.mjs`):**
  1. `promo_banner` (Boolean — Dev: `true`, Prod: `false`): Top hairline announcement strip: `"Meridian v4.18 Zero-Cold-Start Edge Runtime — 40% lower compute egress on annual commits through Q4."` with inline CTA `"Inspect Release Notes"`.
  2. `theme_accent` (String — Dev: `"emerald"`, Prod: `"indigo"`, `beta_testers` Dev segment override: `"amber"`): Updates `document.documentElement.dataset.accent` live, swapping every `--accent` token across buttons, active tabs, switches, telemetry indicators, and highlights.
  3. `pricing_experiment` (Multivariate — `"control"` | `"annual_first"` | `"usage_based"`):
     - Concrete tiers: **Hobby Edge** (`$0/mo`, `100k req/day`, `3 regions`), **Production Fleet** (`$79/mo` or `$64/mo billed annually`, `10M req/mo`, `18 POPs`, `99.99% SLA`), **Dedicated Mesh** (`$420/mo` or `$340/mo billed annually`, `100M req/mo`, `dedicated Anycast IP`, `SOC2 Type II`).
     - In `usage_based`: switches to interactive metered rate table (`$0.18 / 1M edge invocations`, `$0.045 / GB egress`, interactive monthly request estimator slider/input showing live calculated bill in `tabular-nums`).
     - **Layout rule:** Render as a structured **hairline specification ledger / matrix** (comparison columns separated by `1px` vertical/horizontal rules, NOT three detached rounded cards in a row).
  4. `onboarding_flow` (Multivariate — `"wizard"` | `"direct_dashboard"` | `"sample_data"`):
     - `wizard`: 3-step numbered deployment checklist (`01 Connect GitHub repo meridian-api`, `02 Bind edge secrets to iad-edge-04`, `03 Verify canary traffic at 5%`).
     - `direct_dashboard`: Compact live cluster log & deployment action strip ready for immediate traffic inspection.
     - `sample_data`: Pre-populated synthetic load-test trace (`meridian-checkout-canary`, `12,400 synthetic req/min`, live latency percentiles `p50 6.1ms / p95 11.4ms / p99 14.2ms`) with one-click reset.
  5. `ai_copilot_widget` (Boolean — Dev: `true`, Prod: `false`): Collapsible right-side or bottom-anchored **Meridian Diagnostic Copilot** instrument drawer pre-loaded with concrete edge diagnostics (`"Why did fra-edge-02 p99 spike at 14:22 UTC?"`, `"Diff flag states between Development and Production"`, `"Generate canary rollback manifest"`).

---

## 8. Layout & Composition Rules

- **Asymmetric Left-Anchored Hero:** Align hero headline, telemetry readout, and primary action to a crisp left grid (`max-w-[1200px] mx-auto px-6 md:px-8`), paired on the right with a compact live Flagsmith connection/identity readout strip — **never** a centered marketing hero with stacked centered buttons.
- **Open Canvas, Hairline Divisions:** Sections flow vertically down `--bg-canvas` separated by `Separator` (`1px --rule-subtle`) and `py-16` (`64px`) spacing. Use `--bg-surface` sparingly for dense interactive zones (telemetry logs, metered calculator, diagnostic panel).
- **ToggleDock Drawer Coexistence:** Reserve clear bottom-right breathing space (`pb-24`) so the floating ToggleDock trigger pill (`⌘⇧F`) never collides with primary page controls.

---

## 9. Forbidden Patterns (Hard Rejections)

Every PR / phase verification check MUST reject any component containing:

1. **NO three rounded cards in a row** (`grid-cols-3` of identical rounded bordered boxes with icon + title + paragraph). Use hairline-divided ledger rows, asymmetric 2-column splits (`7/5` or `8/4`), or specification comparison matrices instead.
2. **NO centered-everything heroes** (`text-center mx-auto` headline + subtitle + dual pill CTAs).
3. **NO `0.1`-opacity drop shadows on everything** (`shadow-sm`, `shadow-md`, `shadow-lg`, `box-shadow`, `drop-shadow`, `shadowBlur`, `rgba(0,0,0,0.1)`). Separation comes from surface contrast and `1px` hairline rules.
4. **NO gratuitous borders and boxes wrapping every element.** Text, KPI metrics, and headings sit cleanly in space.
5. **NO purple/indigo gradients on white, multi-color neon rainbows, glowing neon orbs, or blurred glow blobs.** Only narrow **monochrome single-accent architectural lighting on `#0A0C0E`** (`<= 8%` radial light washes and `1px` specular hairline beams derived purely from the single active `--accent` token inside `apps/demo/src/styles/globals.css`) is permitted.
6. **NO banned fonts** (`Inter`, `Roboto`, `Open Sans`, `Arial`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`).
7. **NO timid `1.5×` type hierarchy** or mid-weight-only typography — use `200` vs `800` weight extremes and `3×` jumps (`12px → 36px`, `16px → 48px`).
8. **NO placeholder text** (`Lorem ipsum`, `Feature 1`, `Coming soon`, `Acme Corp`).
9. **NO raw `#hex`, `rgb()`, `rgba()`, or `hsl()` literals inside `.tsx` or `.ts` files.** All color and lighting tokens/gradients MUST live strictly inside `apps/demo/src/styles/globals.css` (or `.td-*` stylesheets in `packages/toggledock`).
10. **NO `cursor: none`.** The native OS cursor MUST remain 100% visible at all times.
