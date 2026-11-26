import type { FlagValue, ToggleDockAccent } from 'toggledock';

export const TOGGLEDOCK_OVERRIDES_STORAGE_KEY = 'toggledock:overrides:v1';
export const LAST_ACCENT_STORAGE_KEY = 'meridian:last-accent:v1';
export const FLAGSMITH_LEGACY_STORAGE_KEY = 'BULLET_TRAIN_DB';
export const FLAGSMITH_STORAGE_KEY_PREFIX = 'FLAGSMITH_DB_';

const VALID_ACCENTS: ReadonlySet<ToggleDockAccent> = new Set([
  'emerald',
  'amber',
  'indigo',
]);

export function parseValidAccent(raw: unknown): ToggleDockAccent | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const normalized = raw.trim().toLowerCase() as ToggleDockAccent;
  return VALID_ACCENTS.has(normalized) ? normalized : null;
}

export function resolveAccent(raw: FlagValue | undefined): ToggleDockAccent {
  return parseValidAccent(raw) ?? 'emerald';
}

export function readLocalAccentOverride(): ToggleDockAccent | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(TOGGLEDOCK_OVERRIDES_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    let entry: unknown = record.theme_accent;
    if (entry === undefined) {
      for (const [key, value] of Object.entries(record)) {
        if (key.trim().toLowerCase().replace(/ /g, '_') === 'theme_accent') {
          entry = value;
          break;
        }
      }
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return null;
    }
    return parseValidAccent((entry as { value?: unknown }).value);
  } catch {
    return null;
  }
}

export function readLastKnownAccent(): ToggleDockAccent | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LAST_ACCENT_STORAGE_KEY);
    return parseValidAccent(raw);
  } catch {
    return null;
  }
}

export function readCachedFlagsmithAccent(): ToggleDockAccent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const parseCachePayload = (raw: string | null): ToggleDockAccent | null => {
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      const flags = (parsed as { flags?: unknown }).flags;
      if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
        return null;
      }
      const themeFlag = (flags as Record<string, unknown>).theme_accent;
      if (!themeFlag || typeof themeFlag !== 'object' || Array.isArray(themeFlag)) {
        return null;
      }
      return parseValidAccent((themeFlag as { value?: unknown }).value);
    } catch {
      return null;
    }
  };

  try {
    const legacyAccent = parseCachePayload(
      window.localStorage.getItem(FLAGSMITH_LEGACY_STORAGE_KEY),
    );
    if (legacyAccent) {
      return legacyAccent;
    }
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(FLAGSMITH_STORAGE_KEY_PREFIX)) {
        const cachedAccent = parseCachePayload(window.localStorage.getItem(key));
        if (cachedAccent) {
          return cachedAccent;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeLastKnownAccent(accent: ToggleDockAccent): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LAST_ACCENT_STORAGE_KEY, accent);
  } catch {
    // Ignore storage quota or private-mode security errors.
  }
}
