import { useMemo, useSyncExternalStore } from 'react';
import { createOverrideStore, normalizeFlagKey } from './overrides';
import type {
  FlagState,
  FlagValue,
  FlagsmithLike,
  FlagsMap,
  MergedFlag,
  OverrideStore,
  ToggleDockBridge,
} from './types';

interface SavedProperty {
  key: keyof FlagsmithLike;
  hadOwn: boolean;
  descriptor: PropertyDescriptor | undefined;
}

const activeBridges = new WeakMap<FlagsmithLike, ToggleDockBridge>();
const orderedBridges: ToggleDockBridge[] = [];
const registryListeners = new Set<() => void>();
let globalRevision = 0;

function emitRegistryChange(): void {
  globalRevision += 1;
  for (const listener of Array.from(registryListeners)) {
    listener();
  }
}

function subscribeRegistry(listener: () => void): () => void {
  registryListeners.add(listener);
  return () => {
    registryListeners.delete(listener);
  };
}

export function getActiveToggleDockBridge(
  flagsmith?: FlagsmithLike | null,
): ToggleDockBridge | null {
  if (flagsmith) {
    return activeBridges.get(flagsmith) ?? null;
  }
  return orderedBridges.length > 0 ? orderedBridges[orderedBridges.length - 1] : null;
}

function cloneFlagsMap(raw: FlagsMap | null | undefined): FlagsMap {
  const result: FlagsMap = {};
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  for (const [key, flag] of Object.entries(raw)) {
    if (!flag || typeof flag !== 'object') continue;
    const normalized = normalizeFlagKey(key);
    if (!normalized) continue;
    result[normalized] = {
      ...(typeof flag.id === 'number' ? { id: flag.id } : {}),
      enabled: Boolean(flag.enabled),
      value: flag.value !== undefined ? flag.value : null,
    };
  }
  return result;
}

function saveProperty(target: FlagsmithLike, key: keyof FlagsmithLike): SavedProperty {
  return {
    key,
    hadOwn: Object.prototype.hasOwnProperty.call(target, key),
    descriptor: Object.getOwnPropertyDescriptor(target, key),
  };
}

function restoreProperty(target: FlagsmithLike, saved: SavedProperty): void {
  if (saved.hadOwn && saved.descriptor) {
    Object.defineProperty(target, saved.key, saved.descriptor);
  } else {
    delete (target as unknown as Record<string, unknown>)[saved.key as string];
  }
}

export function attachToggleDockBridge(
  flagsmith: FlagsmithLike,
  store: OverrideStore = createOverrideStore(),
): ToggleDockBridge {
  const previous = activeBridges.get(flagsmith);
  if (previous) {
    previous.detach();
  }

  let attached = true;
  let revision = 0;
  let isBridgeTriggering = false;
  const listeners = new Set<() => void>();
  const savedProperties: SavedProperty[] = [];

  const captureAndPatch = <K extends keyof FlagsmithLike>(
    key: K,
    replacement: FlagsmithLike[K],
  ): FlagsmithLike[K] => {
    const original = flagsmith[key];
    savedProperties.push(saveProperty(flagsmith, key));
    (flagsmith as unknown as Record<string, unknown>)[key as string] = replacement;
    return original;
  };

  const origHasFeature = flagsmith.hasFeature;
  const origGetValue = flagsmith.getValue;
  const origGetAllFlags = flagsmith.getAllFlags;
  const origGetFlags = flagsmith.getFlags;
  const origIdentify = flagsmith.identify;
  const origLogout = flagsmith.logout;
  const origSetTrait = flagsmith.setTrait;
  const origSetTraits = flagsmith.setTraits;
  const origSetContext = flagsmith.setContext;
  const origUpdateContext = flagsmith.updateContext;
  const origInit = flagsmith.init;
  const origSetState = flagsmith.setState;
  const origTrigger = flagsmith._trigger;

  const readServerFlagsDirect = (): FlagsMap => {
    const raw =
      typeof origGetAllFlags === 'function'
        ? origGetAllFlags.call(flagsmith)
        : flagsmith.flags;
    return cloneFlagsMap(raw);
  };

  let cachedServerFlags: FlagsMap = readServerFlagsDirect();

  const syncServerFlags = (): void => {
    cachedServerFlags = readServerFlagsDirect();
  };

  const bumpAndNotify = (): void => {
    revision += 1;
    for (const listener of Array.from(listeners)) {
      listener();
    }
    emitRegistryChange();
  };

  const triggerSdk = (): void => {
    const currentTrigger = flagsmith._trigger;
    if (typeof currentTrigger !== 'function') {
      return;
    }
    isBridgeTriggering = true;
    try {
      currentTrigger.call(flagsmith);
    } finally {
      isBridgeTriggering = false;
    }
  };

  // Patch read accessors so active local overrides take precedence in memory.
  captureAndPatch('hasFeature', function wrappedHasFeature(
    key: string,
    optionsOrSkipAnalytics?: any,
  ): boolean {
    const override = store.getOverride(key);
    if (override && typeof override.enabled === 'boolean') {
      return override.enabled;
    }
    return origHasFeature.call(flagsmith, key, optionsOrSkipAnalytics);
  });

  captureAndPatch('getValue', function wrappedGetValue(
    key: string,
    options?: any,
    skipAnalytics?: boolean,
  ): any {
    const override = store.getOverride(key);
    if (override && override.value !== undefined) {
      const value: FlagValue = override.value;
      const opts = options && typeof options === 'object' ? options : undefined;

      if (value === null && opts && typeof opts.fallback !== 'undefined') {
        return opts.fallback;
      }
      if (opts?.json) {
        if (value === null) {
          return null;
        }
        try {
          return JSON.parse(String(value));
        } catch {
          return opts.fallback;
        }
      }
      return value;
    }
    return origGetValue.call(flagsmith, key, options, skipAnalytics);
  });

  const buildEffectiveFlags = (): FlagsMap => {
    const server = readServerFlagsDirect();
    cachedServerFlags = server;
    const effective: FlagsMap = {};
    for (const [key, state] of Object.entries(server)) {
      effective[key] = { ...state };
    }

    const overrides = store.getOverrides();
    for (const [key, override] of Object.entries(overrides)) {
      const base = effective[key];
      effective[key] = {
        ...(base?.id !== undefined ? { id: base.id } : {}),
        enabled:
          override.enabled !== undefined ? override.enabled : (base?.enabled ?? false),
        value: override.value !== undefined ? override.value : (base?.value ?? null),
      };
    }

    return effective;
  };

  captureAndPatch('getAllFlags', function wrappedGetAllFlags(): FlagsMap {
    return buildEffectiveFlags();
  });

  // Wrap async server refresh / identity / context methods so live refreshes update baseline & subscribers.
  const wrapAsyncMethod = <K extends keyof FlagsmithLike>(
    key: K,
    origFn: FlagsmithLike[K],
  ): void => {
    if (typeof origFn !== 'function') {
      return;
    }
    captureAndPatch(key, (function wrappedAsync(this: unknown, ...args: any[]) {
      const result = (origFn as (...a: any[]) => unknown).apply(flagsmith, args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return (result as Promise<unknown>).then(
          (val) => {
            if (attached) {
              syncServerFlags();
              bumpAndNotify();
            }
            return val;
          },
          (err) => {
            if (attached) {
              syncServerFlags();
              bumpAndNotify();
            }
            throw err;
          },
        );
      }
      if (attached) {
        syncServerFlags();
        bumpAndNotify();
      }
      return result;
    }) as FlagsmithLike[K]);
  };

  wrapAsyncMethod('getFlags', origGetFlags);
  wrapAsyncMethod('identify', origIdentify);
  wrapAsyncMethod('logout', origLogout);
  wrapAsyncMethod('setTrait', origSetTrait);
  wrapAsyncMethod('setTraits', origSetTraits);
  wrapAsyncMethod('setContext', origSetContext);
  wrapAsyncMethod('updateContext', origUpdateContext);
  wrapAsyncMethod('init', origInit);

  if (typeof origSetState === 'function') {
    captureAndPatch('setState', function wrappedSetState(state: any): void {
      origSetState.call(flagsmith, state);
      if (attached) {
        syncServerFlags();
        bumpAndNotify();
      }
    });
  }

  // Only wrap `_trigger` if FlagsmithProvider (or host) has already installed it,
  // so we never block FlagsmithProvider's `if (!flagsmith._trigger)` check.
  if (typeof origTrigger === 'function') {
    captureAndPatch('_trigger', function wrappedTrigger(): void {
      if (!isBridgeTriggering && attached) {
        syncServerFlags();
        bumpAndNotify();
      }
      origTrigger.call(flagsmith);
    });
  }

  const unsubscribeStore = store.subscribe(() => {
    if (!attached) {
      return;
    }
    bumpAndNotify();
    triggerSdk();
  });

  const bridge: ToggleDockBridge = {
    flagsmith,
    store,

    isAttached(): boolean {
      return attached;
    },

    detach(): void {
      if (!attached) {
        return;
      }
      attached = false;
      unsubscribeStore();

      // Restore properties in reverse order to cleanly revert descriptors.
      for (let i = savedProperties.length - 1; i >= 0; i -= 1) {
        restoreProperty(flagsmith, savedProperties[i]);
      }
      savedProperties.length = 0;

      if (activeBridges.get(flagsmith) === bridge) {
        activeBridges.delete(flagsmith);
      }
      const idx = orderedBridges.indexOf(bridge);
      if (idx !== -1) {
        orderedBridges.splice(idx, 1);
      }

      listeners.clear();
      emitRegistryChange();
    },

    getServerFlags(): FlagsMap {
      syncServerFlags();
      return cloneFlagsMap(cachedServerFlags);
    },

    getEffectiveFlags(): FlagsMap {
      return buildEffectiveFlags();
    },

    getMergedFlags(): Record<string, MergedFlag> {
      const server = readServerFlagsDirect();
      cachedServerFlags = server;
      const overrides = store.getOverrides();
      const allKeys = new Set<string>([
        ...Object.keys(server),
        ...Object.keys(overrides),
      ]);

      const merged: Record<string, MergedFlag> = {};
      for (const key of allKeys) {
        const serverFlag: FlagState | undefined = server[key];
        const override = overrides[key];
        const serverEnabled = serverFlag?.enabled ?? false;
        const serverValue: FlagValue = serverFlag?.value ?? null;
        const isOverridden = Boolean(
          override && (override.enabled !== undefined || override.value !== undefined),
        );

        merged[key] = {
          key,
          ...(serverFlag?.id !== undefined ? { id: serverFlag.id } : {}),
          enabled:
            override?.enabled !== undefined ? override.enabled : serverEnabled,
          value: override?.value !== undefined ? override.value : serverValue,
          serverEnabled,
          serverValue,
          isOverridden,
          ...(override ? { override } : {}),
        };
      }
      return merged;
    },

    getRevision(): number {
      return revision;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async refreshFromServer(): Promise<void> {
      await flagsmith.getFlags();
    },

    notify(): void {
      if (!attached) {
        return;
      }
      syncServerFlags();
      bumpAndNotify();
      triggerSdk();
    },
  };

  activeBridges.set(flagsmith, bridge);
  orderedBridges.push(bridge);
  emitRegistryChange();

  // If persisted overrides already existed on attach, ensure SDK React listeners see them.
  if (store.hasOverrides()) {
    triggerSdk();
  }

  return bridge;
}

/**
 * React hook returning a monotonic revision counter that increments on every
 * ToggleDock override change or Flagsmith server refresh.
 * Uses `useSyncExternalStore` so components never fall victim to `flagsmith/react`'s
 * `events.once` listener drop bug across sequential flag toggles.
 */
export function useToggleDockRevision(flagsmith?: FlagsmithLike | null): number {
  return useSyncExternalStore(
    subscribeRegistry,
    () => {
      const bridge = getActiveToggleDockBridge(flagsmith);
      return bridge ? bridge.getRevision() + globalRevision : globalRevision;
    },
    () => 0,
  );
}

/**
 * Reliable React hook for reading effective Flagsmith flag states (with live
 * ToggleDock local overrides applied) that always re-renders on every toggle or
 * server refresh.
 */
export function useToggleDockFlags<K extends string>(
  keys: readonly K[],
  flagsmith?: FlagsmithLike | null,
): Record<K, { enabled: boolean; value: FlagValue }> {
  const revision = useToggleDockRevision(flagsmith);
  const keySignature = keys.join('\0');

  return useMemo(() => {
    const resolved =
      flagsmith ?? getActiveToggleDockBridge()?.flagsmith ?? null;
    const output = {} as Record<K, { enabled: boolean; value: FlagValue }>;

    for (const key of keys) {
      if (!resolved) {
        output[key] = { enabled: false, value: null };
        continue;
      }
      const enabled = Boolean(resolved.hasFeature(key, { skipAnalytics: true }));
      const rawValue = resolved.getValue(key, { skipAnalytics: true });
      const value: FlagValue = rawValue === undefined ? null : (rawValue as FlagValue);
      output[key] = { enabled, value };
    }

    return output;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, keySignature, flagsmith]);
}
