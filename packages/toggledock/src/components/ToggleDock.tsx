import * as React from 'react';
import { createAdminClient, DEFAULT_ADMIN_PROXY_URL } from '../core/adminClient';
import { attachToggleDockBridge, useToggleDockRevision } from '../core/bridge';
import { computeEnvironmentDrift } from '../core/drift';
import { createOverrideStore, normalizeFlagKey } from '../core/overrides';
import type {
  AdminHealthStatus,
  DriftReport,
  EnvFeatureState,
  FlagMetadata,
  MergedFlag,
  ToggleDockAccent,
  ToggleDockBridge,
  ToggleDockProps,
  ToggleDockTab,
} from '../core/types';
import { injectStyles } from '../styles/injectStyles';
import { DriftTab } from './DriftTab';
import { FlagsTab } from './FlagsTab';
import { IdentityTab, readLiveIdentity } from './IdentityTab';
import { TdButton } from './primitives';

const VALID_ACCENTS: ReadonlySet<ToggleDockAccent> = new Set([
  'emerald',
  'amber',
  'indigo',
]);

function resolveAccent(
  value: unknown,
  fallback: ToggleDockAccent,
): ToggleDockAccent {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase() as ToggleDockAccent;
    if (VALID_ACCENTS.has(normalized)) {
      return normalized;
    }
  }
  return fallback;
}

export const ToggleDock: React.FC<ToggleDockProps> = ({
  flagsmith,
  overrideStore,
  storageKey,
  adminProxyUrl = DEFAULT_ADMIN_PROXY_URL,
  projectId,
  devEnvKey,
  devEnvId,
  prodEnvKey,
  environmentLabel = 'Development',
  identityPresets,
  valuePresets,
  defaultOpen = false,
  defaultTab = 'flags',
  enableShortcut = true,
  accentFlagKey = 'theme_accent',
  defaultAccent = 'emerald',
  onFlagsChange,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(defaultOpen);
  const [activeTab, setActiveTab] = React.useState<ToggleDockTab>(defaultTab);
  const [bridge, setBridge] = React.useState<ToggleDockBridge | null>(null);

  const [health, setHealth] = React.useState<AdminHealthStatus | null>(null);
  const [featuresMetadata, setFeaturesMetadata] = React.useState<FlagMetadata[]>([]);
  const [devStates, setDevStates] = React.useState<EnvFeatureState[]>([]);
  const [metadataLoading, setMetadataLoading] = React.useState<boolean>(false);
  const [metadataError, setMetadataError] = React.useState<string | null>(null);

  const [driftReport, setDriftReport] = React.useState<DriftReport | null>(null);
  const [driftLoading, setDriftLoading] = React.useState<boolean>(false);
  const [driftError, setDriftError] = React.useState<string | null>(null);

  const store = React.useMemo(
    () => overrideStore ?? createOverrideStore({ storageKey }),
    [overrideStore, storageKey],
  );

  const adminClient = React.useMemo(
    () => createAdminClient({ proxyUrl: adminProxyUrl }),
    [adminProxyUrl],
  );

  const onFlagsChangeRef = React.useRef(onFlagsChange);
  onFlagsChangeRef.current = onFlagsChange;

  // Inject self-contained scoped stylesheet once (SSR-safe).
  React.useEffect(() => {
    injectStyles();
  }, []);

  // Attach and detach the Flagsmith override bridge cleanly across mounts.
  React.useEffect(() => {
    const attachedBridge = attachToggleDockBridge(flagsmith, store);
    setBridge(attachedBridge);

    const unsubscribe = attachedBridge.subscribe(() => {
      onFlagsChangeRef.current?.(
        attachedBridge.getEffectiveFlags(),
        store.getOverrides(),
      );
    });

    onFlagsChangeRef.current?.(
      attachedBridge.getEffectiveFlags(),
      store.getOverrides(),
    );

    return () => {
      unsubscribe();
      attachedBridge.detach();
      setBridge((current) => (current === attachedBridge ? null : current));
    };
  }, [flagsmith, store]);

  const revision = useToggleDockRevision(flagsmith);

  // Global keyboard shortcut: Cmd/Ctrl + Shift + F toggles, Escape closes.
  React.useEffect(() => {
    if (!enableShortcut || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcut, isOpen]);

  const fetchHealthAndMetadata = React.useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError(null);

    try {
      const healthStatus = await adminClient.getHealth();
      setHealth(healthStatus);

      if (projectId !== undefined && projectId !== '') {
        const [features, states] = await Promise.all([
          adminClient.listProjectFeatures(projectId, devEnvId),
          devEnvKey
            ? adminClient.listEnvironmentFeatureStates(devEnvKey)
            : Promise.resolve<EnvFeatureState[]>([]),
        ]);
        setFeaturesMetadata(features);
        setDevStates(states);
      }
    } catch (err) {
      setMetadataError(
        err instanceof Error ? err.message : 'Unable to load Flagsmith metadata',
      );
    } finally {
      setMetadataLoading(false);
    }
  }, [adminClient, projectId, devEnvId, devEnvKey]);

  const refreshDrift = React.useCallback(async () => {
    if (projectId === undefined || projectId === '' || !devEnvKey || !prodEnvKey) {
      return;
    }
    setDriftLoading(true);
    setDriftError(null);
    try {
      const [features, devFeatureStates, prodFeatureStates] = await Promise.all([
        adminClient.listProjectFeatures(projectId, devEnvId),
        adminClient.listEnvironmentFeatureStates(devEnvKey),
        adminClient.listEnvironmentFeatureStates(prodEnvKey),
      ]);
      setFeaturesMetadata(features);
      setDevStates(devFeatureStates);
      setDriftReport(
        computeEnvironmentDrift(features, devFeatureStates, prodFeatureStates),
      );
    } catch (err) {
      setDriftError(
        err instanceof Error ? err.message : 'Failed to fetch environment drift',
      );
    } finally {
      setDriftLoading(false);
    }
  }, [adminClient, projectId, devEnvId, devEnvKey, prodEnvKey]);

  React.useEffect(() => {
    void fetchHealthAndMetadata();
  }, [fetchHealthAndMetadata]);

  // Refresh health/metadata when drawer opens if previously offline or empty.
  React.useEffect(() => {
    if (isOpen && (!health?.ok || (projectId && featuresMetadata.length === 0))) {
      void fetchHealthAndMetadata();
    }
  }, [isOpen, health?.ok, projectId, featuresMetadata.length, fetchHealthAndMetadata]);

  const mergedFlags: Record<string, MergedFlag> = React.useMemo(() => {
    if (bridge && bridge.isAttached()) {
      return bridge.getMergedFlags();
    }
    const rawFlags = flagsmith.getAllFlags?.() ?? flagsmith.flags ?? {};
    const fallback: Record<string, MergedFlag> = {};
    for (const [key, state] of Object.entries(rawFlags)) {
      if (!state) continue;
      const normalized = normalizeFlagKey(key);
      if (!normalized) continue;
      const val = state.value !== undefined ? state.value : null;
      fallback[normalized] = {
        key: normalized,
        ...(typeof state.id === 'number' ? { id: state.id } : {}),
        enabled: Boolean(state.enabled),
        value: val,
        serverEnabled: Boolean(state.enabled),
        serverValue: val,
        isOverridden: false,
      };
    }
    return fallback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, flagsmith, revision]);

  const overrideCount = React.useMemo(
    () => store.getOverrideCount(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const activeAccent = React.useMemo<ToggleDockAccent>(() => {
    const normalizedAccentKey = normalizeFlagKey(accentFlagKey);
    const mergedEntry = mergedFlags[normalizedAccentKey];
    if (mergedEntry) {
      return resolveAccent(mergedEntry.value, defaultAccent);
    }
    try {
      const directVal = flagsmith.getValue(accentFlagKey, { skipAnalytics: true });
      return resolveAccent(directVal, defaultAccent);
    } catch {
      return defaultAccent;
    }
  }, [accentFlagKey, mergedFlags, defaultAccent, flagsmith]);

  const liveIdentity = React.useMemo(
    () => readLiveIdentity(flagsmith),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flagsmith, revision],
  );

  const flagCount = React.useMemo(() => {
    const keys = new Set<string>(Object.keys(mergedFlags));
    for (const meta of featuresMetadata) {
      keys.add(normalizeFlagKey(meta.name));
    }
    return keys.size;
  }, [mergedFlags, featuresMetadata]);

  const isSdkConnected = Boolean(flagsmith.initialised || Object.keys(mergedFlags).length > 0);
  const dotClass =
    health?.ok || (health === null && isSdkConnected)
      ? 'td-dot td-dot--online'
      : health === null
        ? 'td-dot td-dot--checking'
        : isSdkConnected
          ? 'td-dot td-dot--online'
          : 'td-dot td-dot--offline';

  const connectionLabel = health?.ok
    ? `FLAGSMITH ${health.version ? `v${health.version}` : 'LIVE'} · ${environmentLabel}`
    : isSdkConnected
      ? `SDK LIVE · ${environmentLabel}`
      : 'CONNECTING · FLAGSMITH';

  const handleRefreshFlags = React.useCallback(async () => {
    await Promise.all([flagsmith.getFlags(), fetchHealthAndMetadata()]);
  }, [flagsmith, fetchHealthAndMetadata]);

  const handleAfterDevSync = React.useCallback(async () => {
    await fetchHealthAndMetadata();
    if (driftReport) {
      await refreshDrift();
    }
  }, [fetchHealthAndMetadata, driftReport, refreshDrift]);

  const rootClassName = className ? `td-root ${className}` : 'td-root';

  return (
    <div className={rootClassName} data-td-accent={activeAccent}>
      <div className="td-anchor">
        {isOpen && (
          <section
            className="td-drawer"
            role="dialog"
            aria-label="ToggleDock Flagsmith Devtools"
          >
            <header className="td-header">
              <div className="td-header-top">
                <div className="td-brand-group">
                  <h2 className="td-brand-title">
                    <span className="td-weight-light">Toggle</span>
                    <span className="td-weight-heavy">Dock</span>
                  </h2>
                  <span className="td-conn-line">
                    <span className={dotClass} aria-hidden="true" />
                    <span>{connectionLabel}</span>
                  </span>
                </div>

                <div className="td-header-actions">
                  {overrideCount > 0 && (
                    <TdButton
                      variant="danger"
                      size="sm"
                      onClick={() => store.clearAllOverrides()}
                    >
                      Reset All
                    </TdButton>
                  )}
                  <TdButton
                    variant="ghost"
                    size="icon"
                    aria-label="Close ToggleDock"
                    onClick={() => setIsOpen(false)}
                  >
                    ×
                  </TdButton>
                </div>
              </div>

              <div className="td-tabs" role="tablist" aria-label="ToggleDock sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'flags'}
                  className="td-tab"
                  onClick={() => setActiveTab('flags')}
                >
                  <span>Flags</span>
                  <span
                    className={
                      overrideCount > 0
                        ? 'td-tab-count td-tab-count--warn'
                        : 'td-tab-count'
                    }
                  >
                    {flagCount}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'identity'}
                  className="td-tab"
                  onClick={() => setActiveTab('identity')}
                >
                  <span>Identity</span>
                  {liveIdentity && <span className="td-tab-count">1</span>}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'drift'}
                  className="td-tab"
                  onClick={() => setActiveTab('drift')}
                >
                  <span>Drift</span>
                  {driftReport && (
                    <span
                      className={
                        driftReport.driftedCount > 0
                          ? 'td-tab-count td-tab-count--danger'
                          : 'td-tab-count'
                      }
                    >
                      {driftReport.driftedCount}
                    </span>
                  )}
                </button>
              </div>
            </header>

            <div className="td-body" role="tabpanel">
              {activeTab === 'flags' && (
                <FlagsTab
                  flagsmith={flagsmith}
                  store={store}
                  adminClient={adminClient}
                  mergedFlags={mergedFlags}
                  featuresMetadata={featuresMetadata}
                  devStates={devStates}
                  devEnvKey={devEnvKey}
                  valuePresets={valuePresets}
                  accentFlagKey={accentFlagKey}
                  metadataLoading={metadataLoading}
                  metadataError={metadataError}
                  onRefresh={handleRefreshFlags}
                  onAfterDevSync={handleAfterDevSync}
                />
              )}
              {activeTab === 'identity' && (
                <IdentityTab
                  flagsmith={flagsmith}
                  identityPresets={identityPresets}
                  revision={revision}
                />
              )}
              {activeTab === 'drift' && (
                <DriftTab
                  adminClient={adminClient}
                  projectId={projectId}
                  devEnvKey={devEnvKey}
                  prodEnvKey={prodEnvKey}
                  report={driftReport}
                  loading={driftLoading}
                  error={driftError}
                  onRefresh={refreshDrift}
                />
              )}
            </div>

            <footer className="td-footer">
              <span>
                ACCENT <span className="td-footer-accent">{activeAccent}</span> ·{' '}
                {liveIdentity ?? 'anonymous'}
              </span>
              <span>
                {overrideCount === 0
                  ? '0 overrides'
                  : `${overrideCount} override${overrideCount === 1 ? '' : 's'}`}
              </span>
            </footer>
          </section>
        )}

        <button
          type="button"
          className="td-trigger"
          aria-expanded={isOpen}
          aria-label="Toggle ToggleDock overlay"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className={dotClass} aria-hidden="true" />
          <span className="td-trigger-brand">
            <span className="td-weight-light">Toggle</span>
            <span className="td-weight-heavy">Dock</span>
          </span>
          {overrideCount > 0 && (
            <span
              className="td-trigger-count"
              title={`${overrideCount} active local override${overrideCount === 1 ? '' : 's'}`}
            >
              {overrideCount}
            </span>
          )}
          {enableShortcut && <span className="td-kbd">⌘⇧F</span>}
        </button>
      </div>
    </div>
  );
};
