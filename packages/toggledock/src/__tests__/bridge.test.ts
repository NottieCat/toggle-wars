import { createFlagsmithInstance } from 'flagsmith';
import { describe, expect, it, vi } from 'vitest';
import {
  attachToggleDockBridge,
  getActiveToggleDockBridge,
} from '../core/bridge';
import { createOverrideStore } from '../core/overrides';
import type { FlagsmithLike, FlagsMap } from '../core/types';

function createMockFlagsmith(initialFlags: FlagsMap = {}): FlagsmithLike & {
  _setServerFlags(next: FlagsMap): void;
} {
  let serverFlags: FlagsMap = { ...initialFlags };
  const instance: FlagsmithLike & { _setServerFlags(next: FlagsMap): void } = {
    flags: serverFlags,
    identity: null,
    initialised: true,
    _trigger: null,

    _setServerFlags(next: FlagsMap) {
      serverFlags = { ...next };
      instance.flags = serverFlags;
    },

    hasFeature(key: string): boolean {
      const flag = serverFlags[key.toLowerCase().replace(/ /g, '_')];
      return Boolean(flag?.enabled);
    },

    getValue(key: string, options?: { fallback?: any; json?: boolean }): any {
      const flag = serverFlags[key.toLowerCase().replace(/ /g, '_')];
      const val = flag ? flag.value : null;
      if (val === null && options && typeof options.fallback !== 'undefined') {
        return options.fallback;
      }
      if (options?.json) {
        if (val === null) return null;
        try {
          return JSON.parse(String(val));
        } catch {
          return options.fallback;
        }
      }
      return val;
    },

    getAllFlags(): FlagsMap {
      return serverFlags;
    },

    async getFlags(): Promise<void> {
      instance._trigger?.();
    },

    async identify(userId: string): Promise<void> {
      instance.identity = userId;
      await instance.getFlags();
    },

    async logout(): Promise<void> {
      instance.identity = null;
      await instance.getFlags();
    },

    async setTraits(): Promise<void> {
      await instance.getFlags();
    },

    async setTrait(): Promise<void> {
      await instance.getFlags();
    },

    setState(state: { flags?: FlagsMap }): void {
      if (state.flags) {
        serverFlags = { ...state.flags };
        instance.flags = serverFlags;
      }
    },
  };

  return instance;
}

describe('attachToggleDockBridge', () => {
  it('applies local override precedence on hasFeature, getValue, and getAllFlags without mutating server flags', () => {
    const fs = createMockFlagsmith({
      promo_banner: { id: 1, enabled: true, value: null },
      theme_accent: { id: 2, enabled: true, value: 'emerald' },
      json_config: { id: 3, enabled: true, value: '{"mode":"prod"}' },
    });
    const store = createOverrideStore({ storage: null });
    const bridge = attachToggleDockBridge(fs, store);

    expect(bridge.isAttached()).toBe(true);
    expect(getActiveToggleDockBridge(fs)).toBe(bridge);

    // Baseline reads match server flags.
    expect(fs.hasFeature('promo_banner')).toBe(true);
    expect(fs.getValue('theme_accent')).toBe('emerald');

    // Local overrides take immediate precedence.
    store.setOverride('promo_banner', { enabled: false });
    store.setOverride('theme_accent', { value: 'amber' });
    store.setOverride('json_config', { value: '{"mode":"local"}' });

    expect(fs.hasFeature('promo_banner')).toBe(false);
    expect(fs.getValue('theme_accent')).toBe('amber');
    expect(fs.getValue('json_config', { json: true })).toEqual({ mode: 'local' });

    const allFlags = fs.getAllFlags();
    expect(allFlags?.promo_banner.enabled).toBe(false);
    expect(allFlags?.theme_accent.value).toBe('amber');

    // True live server flags remain untouched.
    const serverFlags = bridge.getServerFlags();
    expect(serverFlags.promo_banner.enabled).toBe(true);
    expect(serverFlags.theme_accent.value).toBe('emerald');

    // Merged view reports both effective and server baseline clearly.
    const merged = bridge.getMergedFlags();
    expect(merged.theme_accent).toMatchObject({
      enabled: true,
      value: 'amber',
      serverEnabled: true,
      serverValue: 'emerald',
      isOverridden: true,
    });

    bridge.detach();
  });

  it('preserves local overrides across server refreshes and updates baseline & subscribers', async () => {
    const fs = createMockFlagsmith({
      promo_banner: { id: 1, enabled: true, value: null },
      theme_accent: { id: 2, enabled: true, value: 'emerald' },
    });
    const store = createOverrideStore({ storage: null });
    const bridge = attachToggleDockBridge(fs, store);
    const subscriber = vi.fn();
    bridge.subscribe(subscriber);

    store.setOverride('promo_banner', { enabled: false });
    expect(fs.hasFeature('promo_banner')).toBe(false);

    // Simulate Flagsmith server update (e.g., beta_testers segment changing theme_accent -> amber)
    fs._setServerFlags({
      promo_banner: { id: 1, enabled: true, value: null },
      theme_accent: { id: 2, enabled: true, value: 'amber' },
    });
    await fs.identify('beta_user_01');

    // Server baseline reflects new server value, while local override on promo_banner stays intact.
    expect(bridge.getServerFlags().theme_accent.value).toBe('amber');
    expect(fs.getValue('theme_accent')).toBe('amber');
    expect(fs.hasFeature('promo_banner')).toBe(false);
    expect(subscriber).toHaveBeenCalled();

    // Clearing override reveals the live server value again.
    store.clearOverride('promo_banner');
    expect(fs.hasFeature('promo_banner')).toBe(true);

    bridge.detach();
  });

  it('fires flagsmith._trigger() on override mutations whether _trigger is installed before or after attach', () => {
    // Case 1: _trigger installed BEFORE attach (FlagsmithProvider mounted first)
    const triggerBefore = vi.fn();
    const fs1 = createMockFlagsmith({
      promo_banner: { id: 1, enabled: true, value: null },
    });
    fs1._trigger = triggerBefore;

    const store1 = createOverrideStore({ storage: null });
    const bridge1 = attachToggleDockBridge(fs1, store1);

    store1.setOverride('promo_banner', { enabled: false });
    store1.clearOverride('promo_banner');
    expect(triggerBefore).toHaveBeenCalledTimes(2);
    bridge1.detach();

    // Case 2: _trigger installed AFTER attach (never blocked by bridge!)
    const fs2 = createMockFlagsmith({
      promo_banner: { id: 1, enabled: true, value: null },
    });
    const store2 = createOverrideStore({ storage: null });
    const bridge2 = attachToggleDockBridge(fs2, store2);
    expect(fs2._trigger).toBeNull();

    const triggerAfter = vi.fn();
    fs2._trigger = triggerAfter;
    store2.setOverride('promo_banner', { enabled: false });
    expect(triggerAfter).toHaveBeenCalledTimes(1);
    bridge2.detach();
  });

  it('cleanly restores original methods on detach() including on a real flagsmith@10.0.0 instance', () => {
    const realFlagsmith = createFlagsmithInstance();
    realFlagsmith.setState({
      api: 'http://localhost:8000/api/v1/',
      flags: {
        promo_banner: { id: 1, enabled: true, value: null },
        theme_accent: { id: 2, enabled: true, value: 'emerald' },
      },
    });

    const origHasFeature = realFlagsmith.hasFeature;
    const origGetValue = realFlagsmith.getValue;
    const hadOwnGetAllFlags = Object.prototype.hasOwnProperty.call(
      realFlagsmith,
      'getAllFlags',
    );

    const store = createOverrideStore({ storage: null });
    const bridge = attachToggleDockBridge(realFlagsmith, store);

    store.setOverride('promo_banner', { enabled: false });
    store.setOverride('theme_accent', { value: 'indigo' });

    expect(realFlagsmith.hasFeature('promo_banner', { skipAnalytics: true })).toBe(false);
    expect(realFlagsmith.getValue('theme_accent', { skipAnalytics: true })).toBe('indigo');
    expect(realFlagsmith.getAllFlags().theme_accent.value).toBe('indigo');

    bridge.detach();
    expect(bridge.isAttached()).toBe(false);
    expect(getActiveToggleDockBridge(realFlagsmith)).toBeNull();

    // Originals restored cleanly, local overrides no longer intercepted.
    expect(realFlagsmith.hasFeature).toBe(origHasFeature);
    expect(realFlagsmith.getValue).toBe(origGetValue);
    expect(
      Object.prototype.hasOwnProperty.call(realFlagsmith, 'getAllFlags'),
    ).toBe(hadOwnGetAllFlags);
    expect(realFlagsmith.hasFeature('promo_banner', { skipAnalytics: true })).toBe(true);
    expect(realFlagsmith.getValue('theme_accent', { skipAnalytics: true })).toBe('emerald');
  });
});
