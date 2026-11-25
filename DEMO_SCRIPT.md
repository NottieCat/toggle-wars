# ToggleDock — 2-Minute Demo Script

**Event:** Toggle Wars Hackathon — **Track 3: Build on Open Source Flagsmith**  
**Target Runtime:** 2:00 (~310 spoken words at a crisp, energetic demo pace)  
**Repo:** `https://github.com/NottieCat/toggle-wars`

---

## Pre-Recording Setup Checklist

Run these two commands before hitting record so both servers are warm and all 5 flags match the clean seeded baseline:

```bash
npm run setup
npm run dev
```

*(If you did a practice run and mutated flags in Flagsmith, run `npm run bootstrap` to restore the exact seeded 5-flag drift baseline in ~1 second.)*

Prepare three windows/tabs for zero-friction cuts:
1. **Browser Tab 1:** `http://localhost:5173` — **Meridian Cloud** workbench (ensure ToggleDock drawer is closed, `0 overrides`, `Anonymous`, accent `emerald`, top bar showing `Connected to Self-Hosted Flagsmith (localhost:8000)` + `v2.295.2`).
2. **Browser Tab 2:** `http://localhost:8000` — Self-hosted **Flagsmith Dashboard**, already signed in as `dev@toggledock.local` / `FlagPass123!` and open to **SaaS Playground → Development → Features** so `promo_banner = ON` is clearly visible.
3. **Editor / Terminal Split:** Terminal showing the crisp `npm run setup` completion banner (for the opener) and `apps/demo/src/App.tsx` + `apps/demo/vite.config.ts` side-by-side (for the closing 20 seconds).

---

## `0:00 – 0:20` — The Problem & 2-Command Setup

### Visual Cues
- **0:00 – 0:10:** Start on a clean terminal showing `npm run setup` completing its 6 steps (`Docker`, `Flagsmith OSS v2.295.2 + Postgres 15`, `bootstrap.mjs`, `toggledock` build) followed by `npm run dev`.
- **0:10 – 0:20:** Cut to **Browser Tab 1 (`http://localhost:5173`)**. Briefly hover over the top header status pill: **`Connected to Self-Hosted Flagsmith (localhost:8000)` `v2.295.2`**, and gesture to the floating **`ToggleDock · ⌘⇧F`** button in the bottom-right corner.

### Spoken Narration
> Self-hosting open-source Flagsmith locally is awesome — until you're stuck clicking through onboarding, bouncing between browser tabs to test every flag and segment, or getting woken up at 2 AM by silent Dev-versus-Prod flag drift.
>
> Meet **ToggleDock** — a drop-in React devtools overlay and two-command local stack for self-hosted Flagsmith. Run `npm run setup` and `npm run dev`, and you've got Flagsmith v2.295.2, PostgreSQL 15, five seeded flags, and our Meridian Cloud workbench running live on localhost.

---

## `0:20 – 0:45` — Instant Local Overrides & Variant Previewer

### Visual Cues
- **0:20:** Press **`⌘⇧F`** — ToggleDock slides open cleanly on the **Flags** tab (`5 / 5 FLAGS · ALL SERVER`).
- **0:24:** Flip **`promo_banner`** OFF — watch the top v4.18 release announcement strip disappear immediately and the amber **`OVERRIDDEN`** pill appear on the row (`LIVE: OFF`, `SERVER: ON`).
- **0:28:** Flip **`ai_copilot_widget`** OFF — scroll slightly or gesture as the **Meridian Diagnostic Copilot** panel unmounts cleanly. Highlight that server state in Flagsmith hasn't been touched.
- **0:33:** Under **`pricing_experiment`** (`MV`), click the **`usage_based · 33%`** pill — watch the **Edge Rate Ledger** swap instantaneously from the comparison matrix into the interactive metered compute estimator.
- **0:38:** Under **`onboarding_flow`** (`MV`), click **`sample_data · 33%`** — watch **Edge Workspace Bootstrap** flip from the 3-step checklist into live Synthetic Trace latency percentiles.
- **0:42:** Click **`Reset All`** in the ToggleDock header — every override clears instantly and Meridian Cloud snaps right back to live server state.

### Spoken Narration
> Hit Command-Shift-F to pop open ToggleDock right inside your app. Flip `promo_banner` and `ai_copilot_widget` off locally — the UI reacts instantly, each row flags **OVERRIDDEN**, and your shared Flagsmith server stays completely untouched.
>
> Testing multivariate experiments is one click: switch `pricing_experiment` to `usage_based` for the live metered calculator, flip `onboarding_flow` to `sample_data` for synthetic traces — and hit **Reset All** whenever you want to snap straight back to server state.

---

## `0:45 – 1:05` — Live Identity & Trait Spoofing (Segments)

### Visual Cues
- **0:45:** Click the **`Identity`** tab in ToggleDock. Point briefly at `ACTIVE IDENTITY: ANONYMOUS` and the three persona pills (`Anonymous`, `Free User · free_user_01`, `Beta Tester · beta_user_01`).
- **0:50:** Click **`Beta Tester · beta_user_01`** (which sends `flagsmith.identify('beta_user_01', { plan: 'pro', beta_tester: true })` to `http://localhost:8000/api/v1/`).
- **0:53 – 1:05:** Pause for the visual payoff! Self-hosted Flagsmith evaluates the real **`beta_testers`** segment (`beta_tester == true`) and returns `theme_accent = "amber"`. Watch the entire Meridian Cloud UI *and* ToggleDock itself shift live from **Signal Emerald** to **Amber**, while the right-rail **`FLAGSMITH READOUT`** updates to `beta_user_01`, `beta_tester=true`, and `ACTIVE ACCENT TOKEN: amber`.

### Spoken Narration
> Want to verify Flagsmith segments without faking user sessions? Switch to the **Identity** tab and click the **Beta Tester** preset with `beta_tester=true`.
>
> ToggleDock calls the real `flagsmith.identify()` API against our local container — Flagsmith evaluates the `beta_testers` segment live and flips `theme_accent` across the entire app and overlay from Signal Emerald straight to Amber.

---

## `1:05 – 1:40` — Environment Drift Diff & Live Server Sync

### Visual Cues
- **1:05:** Click the **`Drift`** tab. Highlight the top metric strip: **`DRIFTED: 5 flags`** | **`IN SYNC: 0 flags`**, and scroll briefly past the side-by-side **`DEVELOPMENT`** vs **`PRODUCTION`** rows showing exact badges (`ENABLED`, `VALUE`, `MV SPLIT`).
- **1:13:** Click **`Copy JSON Snapshot`** (watch button flash **`Copied`**). Mention the 2-step confirmation guard on **`Sync Dev → Prod`** (`Confirm Push to Prod?`) so nobody promotes to Production by accident.
- **1:20:** Click back to the **`Flags`** tab. Toggle **`promo_banner`** OFF locally, then click **`Sync to Dev`** on that row.
- **1:25:** Watch the inline **`Synced to Dev`** confirmation appear and the `OVERRIDDEN` pill clear because the server now matches your local toggle.
- **1:29 – 1:40:** Switch to **Browser Tab 2 (`http://localhost:8000`)** showing the real open-source Flagsmith Dashboard (`SaaS Playground → Development`). Hit **`⌘R` (hard refresh)** — point directly to **`promo_banner`** now persisted as **OFF** in PostgreSQL!

### Spoken Narration
> Now for the 2 AM lifesaver: the **Drift** tab queries both Development and Production through our zero-CORS Vite admin proxy and surfaces all five drifted flags side-by-side — enabled states, values, and multivariate splits. Grab an audit trail with **Copy JSON Snapshot**, or promote Dev to Prod behind a two-step confirmation guard.
>
> Better yet, when a local toggle is ready to ship to Dev, flip `promo_banner` off and hit **Sync to Dev**. Let's jump over to our real self-hosted Flagsmith console on localhost 8000, hit refresh — and there it is, `promo_banner` persisted live in Postgres.

---

## `1:40 – 2:00` — Reusable Open-Source Package & Close

### Visual Cues
- **1:40 – 1:52:** Cut to the **Editor Split** showing:
  - `apps/demo/src/App.tsx` (lines 217–229): the 5-line `<ToggleDock />` React drop-in.
  - `apps/demo/vite.config.ts` (lines 5–10): the 1-line `flagsmithAdminProxyPlugin()` from `toggledock/vite` (note that `FLAGSMITH_ADMIN_TOKEN` stays strictly server-side).
- **1:52 – 2:00:** Show a crisp closing card or terminal banner:
  - **`github.com/NottieCat/toggle-wars`**
  - **`npm run setup && npm run dev`**
  - **MIT Licensed · Toggle Wars Track 3**

### Spoken Narration
> ToggleDock isn't just a demo — it's an MIT-licensed React and Vite package you can drop into any Flagsmith app in five lines of JSX, plus one line in `vite.config.ts` to keep your admin token strictly server-side with zero CORS headaches.
>
> Clone `NottieCat/toggle-wars`, run `npm run setup` and `npm run dev`, and give your self-hosted Flagsmith stack the local devtools it deserves.

---

## Post-Take Reset (for Retakes)

If you want to record a second take right away after clicking **Sync to Dev**:

```bash
npm run bootstrap
```

This idempotently resets `promo_banner` back to `ON` in Development (and keeps all 5 seeded flags drifted) in under two seconds, then refresh `http://localhost:5173`.
