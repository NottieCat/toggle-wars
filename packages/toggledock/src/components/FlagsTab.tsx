import * as React from 'react';
import { normalizeFlagKey } from '../core/overrides';
import type {
  AdminClient,
  EnvFeatureState,
  FlagMetadata,
  FlagValue,
  FlagsmithLike,
  MergedFlag,
  MultivariateOption,
  OverrideStore,
  ValuePresetOption,
  ValuePresetsMap,
} from '../core/types';
import {
  TdButton,
  TdChoicePill,
  TdInput,
  TdPill,
  TdRule,
  TdSwitch,
} from './primitives';

export interface FlagsTabProps {
  flagsmith: FlagsmithLike;
  store: OverrideStore;
  adminClient: AdminClient;
  mergedFlags: Record<string, MergedFlag>;
  featuresMetadata: FlagMetadata[];
  devStates: EnvFeatureState[];
  devEnvKey?: string;
  valuePresets?: ValuePresetsMap;
  accentFlagKey: string;
  metadataLoading: boolean;
  metadataError: string | null;
  onRefresh: () => Promise<void>;
  onAfterDevSync?: () => Promise<void>;
}

interface VariantOptionItem {
  value: string;
  label: string;
  percentage?: number;
}

interface RowSyncFeedback {
  kind: 'ok' | 'error';
  message: string;
}

const DEFAULT_ACCENT_PRESETS: ReadonlyArray<ValuePresetOption> = [
  { value: 'emerald', label: 'emerald' },
  { value: 'amber', label: 'amber' },
  { value: 'indigo', label: 'indigo' },
];

function getMvOptionValue(option: MultivariateOption): string {
  if (option.string_value !== null && option.string_value !== undefined) {
    return option.string_value;
  }
  if (option.integer_value !== null && option.integer_value !== undefined) {
    return String(option.integer_value);
  }
  if (option.boolean_value !== null && option.boolean_value !== undefined) {
    return String(option.boolean_value);
  }
  return `option_${option.id}`;
}

function formatFlagValue(value: FlagValue): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value === '' ? '""' : value;
  }
  return String(value);
}

function resolveFlagTypeBadge(
  flag: MergedFlag,
  metadata: FlagMetadata | undefined,
  variants: VariantOptionItem[],
): 'MV' | 'STRING' | 'NUMBER' | 'BOOL' {
  if (
    metadata?.type === 'MULTIVARIATE' ||
    (metadata?.multivariate_options && metadata.multivariate_options.length > 0)
  ) {
    return 'MV';
  }
  const sample = flag.value ?? flag.serverValue ?? metadata?.initial_value ?? null;
  if (typeof sample === 'number') {
    return 'NUMBER';
  }
  if (typeof sample === 'string' || variants.length > 0) {
    return 'STRING';
  }
  return 'BOOL';
}

function buildVariantOptions(
  flagKey: string,
  metadata: FlagMetadata | undefined,
  devState: EnvFeatureState | undefined,
  valuePresets: ValuePresetsMap | undefined,
  accentFlagKey: string,
): VariantOptionItem[] {
  const options: VariantOptionItem[] = [];
  const seen = new Set<string>();

  if (metadata && metadata.multivariate_options.length > 0) {
    const devPctByOptionId = new Map<number, number>();
    if (devState?.multivariate_feature_state_values) {
      for (const mv of devState.multivariate_feature_state_values) {
        devPctByOptionId.set(mv.multivariate_feature_option, mv.percentage_allocation);
      }
    }

    const sortedMv = [...metadata.multivariate_options].sort((a, b) => a.id - b.id);
    let totalPct = 0;

    for (const opt of sortedMv) {
      const value = getMvOptionValue(opt);
      const pct = devPctByOptionId.has(opt.id)
        ? devPctByOptionId.get(opt.id)!
        : opt.default_percentage_allocation;
      totalPct += pct;
      if (!seen.has(value)) {
        seen.add(value);
        options.push({
          value,
          label: value,
          percentage: Math.round(pct * 10) / 10,
        });
      }
    }

    if (
      typeof metadata.initial_value === 'string' &&
      metadata.initial_value.length > 0 &&
      !seen.has(metadata.initial_value) &&
      totalPct < 100
    ) {
      seen.add(metadata.initial_value);
      options.unshift({
        value: metadata.initial_value,
        label: metadata.initial_value,
        percentage: Math.round(Math.max(0, 100 - totalPct) * 10) / 10,
      });
    }
  }

  const normalizedAccentKey = normalizeFlagKey(accentFlagKey);
  const customPresets =
    valuePresets?.[flagKey] ??
    (valuePresets
      ? Object.entries(valuePresets).find(
          ([k]) => normalizeFlagKey(k) === flagKey,
        )?.[1]
      : undefined);

  const fallbackPresets =
    !customPresets && flagKey === normalizedAccentKey
      ? DEFAULT_ACCENT_PRESETS
      : undefined;

  const presetList = customPresets ?? fallbackPresets;
  if (presetList) {
    for (const entry of presetList) {
      const item: ValuePresetOption =
        typeof entry === 'string' ? { value: entry, label: entry } : entry;
      if (!seen.has(item.value)) {
        seen.add(item.value);
        options.push({
          value: item.value,
          label: item.label ?? item.value,
          ...(item.percentage !== undefined ? { percentage: item.percentage } : {}),
        });
      }
    }
  }

  return options;
}

function parseEditedFlagValue(raw: string, baseline: FlagValue): FlagValue {
  if (raw === '') {
    return typeof baseline === 'string' ? '' : null;
  }
  if (typeof baseline === 'number') {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return raw;
}

export const FlagsTab: React.FC<FlagsTabProps> = ({
  flagsmith,
  store,
  adminClient,
  mergedFlags,
  featuresMetadata,
  devStates,
  devEnvKey,
  valuePresets,
  accentFlagKey,
  metadataLoading,
  metadataError,
  onRefresh,
  onAfterDevSync,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [draftValues, setDraftValues] = React.useState<Record<string, string>>({});
  const [syncingKeys, setSyncingKeys] = React.useState<Record<string, boolean>>({});
  const [rowFeedback, setRowFeedback] = React.useState<Record<string, RowSyncFeedback>>({});
  const [refreshing, setRefreshing] = React.useState(false);

  const metadataByKey = React.useMemo(() => {
    const map = new Map<string, FlagMetadata>();
    for (const meta of featuresMetadata) {
      map.set(normalizeFlagKey(meta.name), meta);
    }
    return map;
  }, [featuresMetadata]);

  const devStateByFeatureId = React.useMemo(() => {
    const map = new Map<number, EnvFeatureState>();
    for (const state of devStates) {
      if (state.feature_segment == null && state.identity == null) {
        map.set(state.feature, state);
      }
    }
    return map;
  }, [devStates]);

  const allFlags = React.useMemo(() => {
    const keys = new Set<string>(Object.keys(mergedFlags));
    for (const meta of featuresMetadata) {
      const normalized = normalizeFlagKey(meta.name);
      if (normalized) {
        keys.add(normalized);
      }
    }

    const list: MergedFlag[] = [];
    for (const key of keys) {
      const existing = mergedFlags[key];
      if (existing) {
        list.push(existing);
        continue;
      }
      const meta = metadataByKey.get(key);
      if (!meta) continue;
      const devState = devStateByFeatureId.get(meta.id);
      const serverEnabled = devState ? devState.enabled : meta.default_enabled;
      const serverValue = devState ? devState.feature_state_value : meta.initial_value;
      list.push({
        key,
        id: meta.id,
        enabled: serverEnabled,
        value: serverValue,
        serverEnabled,
        serverValue,
        isOverridden: false,
      });
    }

    return list.sort((a, b) => a.key.localeCompare(b.key));
  }, [mergedFlags, featuresMetadata, metadataByKey, devStateByFeatureId]);

  const filteredFlags = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return allFlags;
    }
    return allFlags.filter((flag) => {
      const meta = metadataByKey.get(flag.key);
      const valueText = flag.value === null ? '' : String(flag.value).toLowerCase();
      const descText = meta?.description?.toLowerCase() ?? '';
      return (
        flag.key.toLowerCase().includes(q) ||
        valueText.includes(q) ||
        descText.includes(q)
      );
    });
  }, [allFlags, searchQuery, metadataByKey]);

  const overrideCount = store.getOverrideCount();

  const applyEnabledOverride = (flag: MergedFlag, nextEnabled: boolean) => {
    const existing = store.getOverride(flag.key);
    const hasValueDiff =
      existing?.value !== undefined && existing.value !== flag.serverValue;

    if (nextEnabled === flag.serverEnabled) {
      store.clearOverride(flag.key);
      if (hasValueDiff && existing?.value !== undefined) {
        store.setOverride(flag.key, { value: existing.value });
      }
      return;
    }

    store.setOverride(flag.key, { enabled: nextEnabled });
  };

  const applyValueOverride = (flag: MergedFlag, nextValue: FlagValue) => {
    const existing = store.getOverride(flag.key);
    const hasEnabledDiff =
      existing?.enabled !== undefined && existing.enabled !== flag.serverEnabled;

    if (nextValue === flag.serverValue) {
      store.clearOverride(flag.key);
      if (hasEnabledDiff && existing?.enabled !== undefined) {
        store.setOverride(flag.key, { enabled: existing.enabled });
      }
      return;
    }

    store.setOverride(flag.key, { value: nextValue });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncToDev = async (flag: MergedFlag) => {
    const meta = metadataByKey.get(flag.key);
    const featureId = meta?.id ?? flag.id;

    if (!devEnvKey) {
      setRowFeedback((prev) => ({
        ...prev,
        [flag.key]: {
          kind: 'error',
          message: 'Configure devEnvKey to sync to Development.',
        },
      }));
      return;
    }

    if (typeof featureId !== 'number' || !Number.isFinite(featureId)) {
      setRowFeedback((prev) => ({
        ...prev,
        [flag.key]: {
          kind: 'error',
          message: 'Feature ID unavailable. Refresh metadata or check projectId.',
        },
      }));
      return;
    }

    const devState = devStateByFeatureId.get(featureId);

    setSyncingKeys((prev) => ({ ...prev, [flag.key]: true }));
    setRowFeedback((prev) => {
      const next = { ...prev };
      delete next[flag.key];
      return next;
    });

    try {
      await adminClient.syncFeatureToEnvironment({
        envKey: devEnvKey,
        featureId,
        enabled: flag.enabled,
        value: flag.value,
        ...(devState ? { featureStateId: devState.id, environmentId: devState.environment } : {}),
      });

      await flagsmith.getFlags();
      store.clearOverride(flag.key);
      setDraftValues((prev) => {
        const next = { ...prev };
        delete next[flag.key];
        return next;
      });

      if (onAfterDevSync) {
        await onAfterDevSync();
      }

      setRowFeedback((prev) => ({
        ...prev,
        [flag.key]: {
          kind: 'ok',
          message: 'Synced to Dev',
        },
      }));
    } catch (err) {
      setRowFeedback((prev) => ({
        ...prev,
        [flag.key]: {
          kind: 'error',
          message: err instanceof Error ? err.message : 'Sync to Dev failed',
        },
      }));
    } finally {
      setSyncingKeys((prev) => ({ ...prev, [flag.key]: false }));
    }
  };

  return (
    <div>
      <div className="td-toolbar">
        <TdInput
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter flags by key, value, or description..."
          aria-label="Filter flags"
        />
        <div className="td-toolbar-row">
          <span className="td-eyebrow">
            {filteredFlags.length} / {allFlags.length} FLAGS ·{' '}
            {overrideCount > 0 ? `${overrideCount} OVERRIDDEN` : 'ALL SERVER'}
          </span>
          <div className="td-flag-action-group">
            <TdButton
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || metadataLoading}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </TdButton>
            {overrideCount > 0 && (
              <TdButton
                variant="danger"
                size="sm"
                onClick={() => {
                  store.clearAllOverrides();
                  setDraftValues({});
                }}
              >
                Reset All
              </TdButton>
            )}
          </div>
        </div>
      </div>

      {metadataError && (
        <div className="td-banner td-banner--danger" role="alert">
          Admin metadata: {metadataError}
        </div>
      )}

      {filteredFlags.length === 0 ? (
        <div className="td-empty">
          <p className="td-empty-title">
            {allFlags.length === 0 ? 'No flags loaded' : 'No matching flags'}
          </p>
          <p className="td-empty-copy">
            {allFlags.length === 0
              ? 'Waiting for Flagsmith SDK initialization or click Refresh to pull live flags.'
              : `No flag matched "${searchQuery}".`}
          </p>
        </div>
      ) : (
        <div className="td-ledger">
          {filteredFlags.map((flag, index) => {
            const meta = metadataByKey.get(flag.key);
            const featureId = meta?.id ?? flag.id;
            const devState =
              typeof featureId === 'number'
                ? devStateByFeatureId.get(featureId)
                : undefined;
            const variants = buildVariantOptions(
              flag.key,
              meta,
              devState,
              valuePresets,
              accentFlagKey,
            );
            const typeBadge = resolveFlagTypeBadge(flag, meta, variants);
            const hasScalarValue =
              typeBadge !== 'BOOL' ||
              flag.value !== null ||
              flag.serverValue !== null ||
              meta?.initial_value !== null;

            const currentValueStr =
              flag.value === null || flag.value === undefined ? '' : String(flag.value);
            const draftValue =
              draftValues[flag.key] !== undefined ? draftValues[flag.key] : currentValueStr;
            const isDraftDirty = draftValue !== currentValueStr;
            const isSyncing = Boolean(syncingKeys[flag.key]);
            const feedback = rowFeedback[flag.key];
            const canSync = Boolean(devEnvKey) && typeof featureId === 'number';

            const commitDraftValue = () => {
              const parsed = parseEditedFlagValue(
                draftValue,
                flag.serverValue ?? flag.value,
              );
              applyValueOverride(flag, parsed);
              setDraftValues((prev) => {
                const next = { ...prev };
                delete next[flag.key];
                return next;
              });
            };

            return (
              <React.Fragment key={flag.key}>
                {index > 0 && <TdRule />}
                <div
                  className={
                    flag.isOverridden
                      ? 'td-flag-row td-flag-row--overridden'
                      : 'td-flag-row'
                  }
                >
                  <div className="td-flag-head">
                    <div className="td-flag-key-group">
                      <span className="td-flag-key">{flag.key}</span>
                      <TdPill tone="neutral">{typeBadge}</TdPill>
                      {flag.isOverridden && <TdPill tone="warn">OVERRIDDEN</TdPill>}
                    </div>
                    <TdSwitch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => applyEnabledOverride(flag, checked)}
                      aria-label={`Toggle ${flag.key}`}
                    />
                  </div>

                  {meta?.description && (
                    <p className="td-flag-desc">{meta.description}</p>
                  )}

                  <div className="td-flag-meta">
                    <span>
                      LIVE:{' '}
                      <span className="td-flag-meta-strong">
                        {flag.enabled ? 'ON' : 'OFF'}
                        {flag.value !== null ? ` · ${formatFlagValue(flag.value)}` : ''}
                      </span>
                    </span>
                    {flag.isOverridden && (
                      <span>
                        SERVER:{' '}
                        <span className="td-flag-meta-strong">
                          {flag.serverEnabled ? 'ON' : 'OFF'}
                          {flag.serverValue !== null
                            ? ` · ${formatFlagValue(flag.serverValue)}`
                            : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  {variants.length > 0 && (
                    <div className="td-pills-wrap" role="group" aria-label={`${flag.key} variants`}>
                      {variants.map((variant) => {
                        const isSelected = String(flag.value ?? '') === variant.value;
                        return (
                          <TdChoicePill
                            key={variant.value}
                            active={isSelected}
                            onClick={() => {
                              applyValueOverride(flag, variant.value);
                              setDraftValues((prev) => {
                                const next = { ...prev };
                                delete next[flag.key];
                                return next;
                              });
                            }}
                          >
                            <span>{variant.label}</span>
                            {variant.percentage !== undefined && (
                              <span className="td-choice-weight">· {variant.percentage}%</span>
                            )}
                          </TdChoicePill>
                        );
                      })}
                    </div>
                  )}

                  {hasScalarValue && (
                    <div className="td-value-editor">
                      <TdInput
                        value={draftValue}
                        onChange={(e) =>
                          setDraftValues((prev) => ({
                            ...prev,
                            [flag.key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isDraftDirty) {
                            e.preventDefault();
                            commitDraftValue();
                          }
                        }}
                        placeholder="Local value override..."
                        aria-label={`Override value for ${flag.key}`}
                      />
                      <TdButton
                        variant="surface"
                        size="sm"
                        disabled={!isDraftDirty}
                        onClick={commitDraftValue}
                      >
                        Apply
                      </TdButton>
                    </div>
                  )}

                  <div className="td-flag-actions">
                    <div>
                      {feedback && (
                        <span
                          className={
                            feedback.kind === 'ok'
                              ? 'td-inline-status td-inline-status--ok'
                              : 'td-inline-status td-inline-status--error'
                          }
                          role={feedback.kind === 'error' ? 'alert' : 'status'}
                        >
                          {feedback.message}
                        </span>
                      )}
                    </div>
                    <div className="td-flag-action-group">
                      {flag.isOverridden && (
                        <TdButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            store.clearOverride(flag.key);
                            setDraftValues((prev) => {
                              const next = { ...prev };
                              delete next[flag.key];
                              return next;
                            });
                          }}
                        >
                          Reset
                        </TdButton>
                      )}
                      <TdButton
                        variant={flag.isOverridden ? 'accent' : 'surface'}
                        size="sm"
                        disabled={!canSync || isSyncing}
                        title={
                          canSync
                            ? 'Persist effective flag state to Flagsmith Development environment'
                            : 'Requires devEnvKey and feature metadata from Admin API'
                        }
                        onClick={() => handleSyncToDev(flag)}
                      >
                        {isSyncing ? 'Syncing...' : 'Sync to Dev'}
                      </TdButton>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
