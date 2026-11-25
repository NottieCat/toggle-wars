import { describe, expect, it, vi } from 'vitest';
import {
  createOverrideStore,
  DEFAULT_STORAGE_KEY,
  normalizeFlagKey,
} from '../core/overrides';
import type { StorageLike } from '../core/types';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & {
  dump(): Record<string, string>;
} {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
    removeItem(key: string): void {
      data.delete(key);
    },
    dump(): Record<string, string> {
      return Object.fromEntries(data.entries());
    },
  };
}

describe('normalizeFlagKey', () => {
  it('lowercases, trims, and replaces spaces with underscores', () => {
    expect(normalizeFlagKey('  Promo Banner ')).toBe('promo_banner');
    expect(normalizeFlagKey('theme_accent')).toBe('theme_accent');
  });
});

describe('createOverrideStore', () => {
  it('sets, merges, clears, and clears all overrides with monotonic versioning', () => {
    const storage = createMemoryStorage();
    const store = createOverrideStore({ storage });

    expect(store.storageKey).toBe(DEFAULT_STORAGE_KEY);
    expect(store.getVersion()).toBe(0);
    expect(store.hasOverrides()).toBe(false);
    expect(store.getOverrideCount()).toBe(0);

    store.setOverride('Promo Banner', { enabled: false });
    expect(store.getVersion()).toBe(1);
    expect(store.hasOverrides()).toBe(true);
    expect(store.getOverrideCount()).toBe(1);
    expect(store.getOverride('promo_banner')?.enabled).toBe(false);

    // Partial patch preserves existing fields on the same flag.
    store.setOverride('promo_banner', { value: 'custom_copy' });
    expect(store.getVersion()).toBe(2);
    expect(store.getOverride('promo_banner')).toMatchObject({
      enabled: false,
      value: 'custom_copy',
    });

    store.setOverride('theme_accent', { enabled: true, value: 'amber' });
    expect(store.getOverrideCount()).toBe(2);

    store.clearOverride('promo_banner');
    expect(store.getOverride('promo_banner')).toBeUndefined();
    expect(store.getOverrideCount()).toBe(1);

    // Clearing a non-existent override is a no-op.
    const versionBeforeNoop = store.getVersion();
    store.clearOverride('non_existent');
    expect(store.getVersion()).toBe(versionBeforeNoop);

    store.clearAllOverrides();
    expect(store.hasOverrides()).toBe(false);
    expect(store.getOverrideCount()).toBe(0);
    expect(store.getOverrides()).toEqual({});
    expect(storage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('persists overrides to storage and hydrates cleanly into a new store instance', () => {
    const storage = createMemoryStorage();
    const key = 'custom:overrides:v1';
    const storeA = createOverrideStore({ storageKey: key, storage });

    storeA.setOverride('theme_accent', { enabled: true, value: 'indigo' });
    storeA.setOverride('ai_copilot_widget', { enabled: false });

    const persistedRaw = storage.getItem(key);
    expect(persistedRaw).toBeTruthy();

    const storeB = createOverrideStore({ storageKey: key, storage });
    expect(storeB.getOverrideCount()).toBe(2);
    expect(storeB.getOverride('theme_accent')).toMatchObject({
      enabled: true,
      value: 'indigo',
    });
    expect(storeB.getOverride('ai_copilot_widget')).toMatchObject({
      enabled: false,
    });
  });

  it('handles corrupt JSON in storage gracefully and works SSR-safely without storage', () => {
    const corruptStorage = createMemoryStorage({
      [DEFAULT_STORAGE_KEY]: '{not-valid-json',
    });
    const hydrated = createOverrideStore({ storage: corruptStorage });
    expect(hydrated.getOverrides()).toEqual({});

    // SSR / no-storage mode (storage: null) works purely in memory.
    const ssrStore = createOverrideStore({ storage: null });
    ssrStore.setOverride('promo_banner', { enabled: true });
    expect(ssrStore.getOverride('promo_banner')?.enabled).toBe(true);
    ssrStore.clearAllOverrides();
    expect(ssrStore.hasOverrides()).toBe(false);
  });

  it('notifies subscribers on changes and stops notifying after unsubscribe', () => {
    const storage = createMemoryStorage();
    const store = createOverrideStore({ storage });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.setOverride('promo_banner', { enabled: false });
    store.setOverride('theme_accent', { value: 'amber' });
    store.clearOverride('promo_banner');
    expect(listener).toHaveBeenCalledTimes(3);

    // No-op clear does not fire listener.
    store.clearOverride('unknown_flag');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.clearAllOverrides();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
