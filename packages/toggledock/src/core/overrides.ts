import type {
  FlagOverride,
  FlagOverridePatch,
  FlagValue,
  OverrideMap,
  OverrideStore,
  OverrideStoreOptions,
  StorageLike,
} from './types';

export const DEFAULT_STORAGE_KEY = 'toggledock:overrides:v1';

export function normalizeFlagKey(key: string): string {
  return key.trim().toLowerCase().replace(/ /g, '_');
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function isValidFlagValue(value: unknown): value is FlagValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function sanitizeOverrideEntry(raw: unknown): FlagOverride | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const entry: FlagOverride = {
    updatedAt: typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
      ? candidate.updatedAt
      : Date.now(),
  };

  let hasField = false;
  if (typeof candidate.enabled === 'boolean') {
    entry.enabled = candidate.enabled;
    hasField = true;
  }
  if ('value' in candidate && candidate.value !== undefined && isValidFlagValue(candidate.value)) {
    entry.value = candidate.value;
    hasField = true;
  }

  return hasField ? entry : null;
}

function loadFromStorage(storage: StorageLike | null, storageKey: string): OverrideMap {
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const result: OverrideMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const normalized = normalizeFlagKey(key);
      if (!normalized) continue;
      const sanitized = sanitizeOverrideEntry(value);
      if (sanitized) {
        result[normalized] = sanitized;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function persistToStorage(
  storage: StorageLike | null,
  storageKey: string,
  overrides: OverrideMap,
): void {
  if (!storage) {
    return;
  }
  try {
    if (Object.keys(overrides).length === 0) {
      storage.removeItem(storageKey);
    } else {
      storage.setItem(storageKey, JSON.stringify(overrides));
    }
  } catch {
    // Ignore storage quota or private-mode security errors.
  }
}

export function createOverrideStore(
  options?: OverrideStoreOptions | string,
): OverrideStore {
  const resolved: OverrideStoreOptions =
    typeof options === 'string' ? { storageKey: options } : (options ?? {});
  const storageKey = resolved.storageKey ?? DEFAULT_STORAGE_KEY;
  const storage =
    resolved.storage !== undefined ? resolved.storage : getDefaultStorage();

  let overrides: OverrideMap = loadFromStorage(storage, storageKey);
  let version = 0;
  const listeners = new Set<() => void>();

  const emit = () => {
    version += 1;
    persistToStorage(storage, storageKey, overrides);
    for (const listener of Array.from(listeners)) {
      listener();
    }
  };

  return {
    storageKey,

    getOverrides(): OverrideMap {
      return overrides;
    },

    getOverride(key: string): FlagOverride | undefined {
      const normalized = normalizeFlagKey(key);
      return overrides[normalized];
    },

    setOverride(key: string, patch: FlagOverridePatch): void {
      const normalized = normalizeFlagKey(key);
      if (!normalized) {
        return;
      }

      const existing = overrides[normalized];
      const next: FlagOverride = {
        ...(existing ?? {}),
        updatedAt: Date.now(),
      };

      if ('enabled' in patch && typeof patch.enabled === 'boolean') {
        next.enabled = patch.enabled;
      }
      if ('value' in patch && patch.value !== undefined && isValidFlagValue(patch.value)) {
        next.value = patch.value;
      }

      if (next.enabled === undefined && next.value === undefined) {
        return;
      }

      overrides = {
        ...overrides,
        [normalized]: next,
      };
      emit();
    },

    clearOverride(key: string): void {
      const normalized = normalizeFlagKey(key);
      if (!Object.prototype.hasOwnProperty.call(overrides, normalized)) {
        return;
      }
      const next: OverrideMap = { ...overrides };
      delete next[normalized];
      overrides = next;
      emit();
    },

    clearAllOverrides(): void {
      if (Object.keys(overrides).length === 0) {
        return;
      }
      overrides = {};
      emit();
    },

    hasOverrides(): boolean {
      return Object.keys(overrides).length > 0;
    },

    getOverrideCount(): number {
      return Object.keys(overrides).length;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getVersion(): number {
      return version;
    },
  };
}
