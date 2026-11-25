import * as React from 'react';
import type {
  AdminClient,
  DriftEnvSnapshot,
  DriftItem,
  DriftReason,
  DriftReport,
} from '../core/types';
import { TdButton, TdPill, TdRule } from './primitives';

export interface DriftTabProps {
  adminClient: AdminClient;
  projectId?: number | string;
  devEnvKey?: string;
  prodEnvKey?: string;
  report: DriftReport | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const REASON_LABELS: Record<DriftReason, string> = {
  enabled: 'ENABLED',
  value: 'VALUE',
  multivariate: 'MV SPLIT',
  missing_in_dev: 'MISSING DEV',
  missing_in_prod: 'MISSING PROD',
};

function formatEnvScalar(snapshot: DriftEnvSnapshot): string {
  if (snapshot.enabled === null) {
    return 'MISSING';
  }
  const stateLabel = snapshot.enabled ? 'ON' : 'OFF';
  if (snapshot.value === null || snapshot.value === undefined) {
    return stateLabel;
  }
  const valueText =
    typeof snapshot.value === 'string' && snapshot.value === ''
      ? '""'
      : String(snapshot.value);
  return `${stateLabel} · ${valueText}`;
}

function formatMvSplits(snapshot: DriftEnvSnapshot): string | null {
  if (!snapshot.multivariate || snapshot.multivariate.length === 0) {
    return null;
  }
  return snapshot.multivariate
    .map((m) => `${m.value} ${Math.round(m.percentage * 10) / 10}%`)
    .join(' · ');
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export const DriftTab: React.FC<DriftTabProps> = ({
  adminClient,
  projectId,
  devEnvKey,
  prodEnvKey,
  report,
  loading,
  error,
  onRefresh,
}) => {
  const [confirmFeatureId, setConfirmFeatureId] = React.useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = React.useState(false);
  const [syncingFeatureId, setSyncingFeatureId] = React.useState<number | null>(null);
  const [bulkSyncing, setBulkSyncing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [banner, setBanner] = React.useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const isConfigured = Boolean(projectId !== undefined && projectId !== '' && devEnvKey && prodEnvKey);

  React.useEffect(() => {
    if (isConfigured && !report && !loading && !error) {
      void onRefresh();
    }
  }, [isConfigured, report, loading, error, onRefresh]);

  React.useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!isConfigured) {
    return (
      <div className="td-empty">
        <p className="td-empty-title">Environment drift not configured</p>
        <p className="td-empty-copy">
          Pass projectId, devEnvKey, and prodEnvKey to ToggleDock to compare Development vs
          Production flag states and promote changes.
        </p>
      </div>
    );
  }

  const syncSingleItemToProd = async (item: DriftItem): Promise<void> => {
    if (!prodEnvKey || item.dev.enabled === null) {
      return;
    }

    const shouldSyncMv =
      item.reasons.includes('multivariate') && item.dev.multivariate.length > 0;

    await adminClient.syncFeatureToEnvironment({
      envKey: prodEnvKey,
      featureId: item.featureId,
      enabled: item.dev.enabled,
      value: item.dev.value,
      ...(item.prod.featureStateId !== null
        ? { featureStateId: item.prod.featureStateId }
        : {}),
      ...(item.prod.environmentId !== null
        ? { environmentId: item.prod.environmentId }
        : {}),
      ...(shouldSyncMv
        ? {
            multivariateAllocations: item.dev.multivariate.map((alloc) => ({
              multivariate_feature_option: alloc.optionId,
              percentage_allocation: alloc.percentage,
            })),
          }
        : {}),
    });
  };

  const handleConfirmSingle = async (item: DriftItem) => {
    setSyncingFeatureId(item.featureId);
    setBanner(null);
    try {
      await syncSingleItemToProd(item);
      setConfirmFeatureId(null);
      await onRefresh();
      setBanner({
        kind: 'ok',
        text: `Synced "${item.featureName}" Dev → Prod.`,
      });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : `Failed to sync ${item.featureName}`,
      });
    } finally {
      setSyncingFeatureId(null);
    }
  };

  const syncableDriftedItems = (report?.items ?? []).filter(
    (item) => item.status === 'drifted' && item.dev.enabled !== null,
  );

  const handleConfirmBulk = async () => {
    if (syncableDriftedItems.length === 0) {
      setConfirmBulk(false);
      return;
    }
    setBulkSyncing(true);
    setBanner(null);
    let syncedCount = 0;
    const failures: string[] = [];

    try {
      for (const item of syncableDriftedItems) {
        try {
          await syncSingleItemToProd(item);
          syncedCount += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'failed';
          failures.push(`${item.featureName}: ${msg}`);
        }
      }
      setConfirmBulk(false);
      await onRefresh();
      if (failures.length > 0) {
        setBanner({
          kind: 'error',
          text: `Synced ${syncedCount}/${syncableDriftedItems.length}. Errors: ${failures.join('; ')}`,
        });
      } else {
        setBanner({
          kind: 'ok',
          text: `Promoted ${syncedCount} drifted flag${syncedCount === 1 ? '' : 's'} Dev → Prod.`,
        });
      }
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleCopySnapshot = async () => {
    if (!report) return;
    try {
      await copyTextToClipboard(report.toJsonSnapshot(true));
      setCopied(true);
    } catch {
      setBanner({ kind: 'error', text: 'Clipboard write blocked by browser.' });
    }
  };

  const orderedItems = React.useMemo(() => {
    if (!report) return [];
    return [...report.items].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'drifted' ? -1 : 1;
      }
      return a.featureName.localeCompare(b.featureName);
    });
  }, [report]);

  return (
    <div>
      {/* 3x Metric Strip (12px label -> 36px 800-weight counter) */}
      <div className="td-metric-strip">
        <div className="td-metric-pair">
          <div className="td-metric-cell">
            <span className="td-metric-label">DRIFTED</span>
            <span
              className={
                (report?.driftedCount ?? 0) > 0
                  ? 'td-metric-value td-metric-value--danger'
                  : 'td-metric-value'
              }
            >
              {report ? report.driftedCount : '—'}
              <span className="td-metric-unit">flags</span>
            </span>
          </div>
          <div className="td-metric-cell">
            <span className="td-metric-label">IN SYNC</span>
            <span className="td-metric-value td-metric-value--accent">
              {report ? report.syncedCount : '—'}
              <span className="td-metric-unit">flags</span>
            </span>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="td-toolbar">
        <div className="td-toolbar-row">
          <div className="td-flag-action-group">
            <TdButton
              variant="surface"
              size="sm"
              disabled={loading || bulkSyncing}
              onClick={() => {
                setBanner(null);
                void onRefresh();
              }}
            >
              {loading ? 'Checking...' : 'Refresh'}
            </TdButton>
            <TdButton
              variant="surface"
              size="sm"
              disabled={!report}
              onClick={handleCopySnapshot}
            >
              {copied ? 'Copied' : 'Copy JSON Snapshot'}
            </TdButton>
          </div>
          {syncableDriftedItems.length > 0 && !confirmBulk && (
            <TdButton
              variant="danger"
              size="sm"
              disabled={bulkSyncing || loading}
              onClick={() => {
                setConfirmFeatureId(null);
                setConfirmBulk(true);
              }}
            >
              Sync All Drifted → Prod
            </TdButton>
          )}
        </div>

        {confirmBulk && (
          <div className="td-confirm-bar" role="alertdialog" aria-label="Confirm bulk push to production">
            <span className="td-confirm-text">
              Confirm Push to Prod? ({syncableDriftedItems.length} drifted)
            </span>
            <div className="td-flag-action-group">
              <TdButton
                variant="danger"
                size="sm"
                disabled={bulkSyncing}
                onClick={handleConfirmBulk}
              >
                {bulkSyncing ? 'Pushing...' : 'Confirm'}
              </TdButton>
              <TdButton
                variant="ghost"
                size="sm"
                disabled={bulkSyncing}
                onClick={() => setConfirmBulk(false)}
              >
                Cancel
              </TdButton>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="td-banner td-banner--danger" role="alert">
          {error}
        </div>
      )}

      {banner && (
        <div
          className={
            banner.kind === 'ok'
              ? 'td-banner td-banner--accent'
              : 'td-banner td-banner--danger'
          }
          role={banner.kind === 'error' ? 'alert' : 'status'}
        >
          {banner.text}
        </div>
      )}

      {loading && !report ? (
        <div className="td-empty">
          <p className="td-empty-title">Inspecting environments</p>
          <p className="td-empty-copy">
            Comparing Development and Production feature states via self-hosted Flagsmith Admin API...
          </p>
        </div>
      ) : orderedItems.length === 0 ? (
        <div className="td-empty">
          <p className="td-empty-title">No environment flags found</p>
          <p className="td-empty-copy">
            Click Refresh to query Flagsmith Development and Production environments.
          </p>
        </div>
      ) : (
        <div className="td-ledger">
          {orderedItems.map((item, idx) => {
            const isDrifted = item.status === 'drifted';
            const devMv = formatMvSplits(item.dev);
            const prodMv = formatMvSplits(item.prod);
            const isConfirming = confirmFeatureId === item.featureId;
            const isSyncing = syncingFeatureId === item.featureId;
            const canSyncItem = isDrifted && item.dev.enabled !== null;

            return (
              <React.Fragment key={item.featureId}>
                {idx > 0 && <TdRule />}
                <div
                  className={
                    isDrifted
                      ? 'td-drift-row td-drift-row--drifted'
                      : 'td-drift-row'
                  }
                >
                  <div className="td-flag-head">
                    <div className="td-flag-key-group">
                      <span className="td-flag-key">{item.featureName}</span>
                      <TdPill tone="neutral">
                        {item.featureType === 'MULTIVARIATE' ? 'MV' : 'STD'}
                      </TdPill>
                    </div>
                    <TdPill tone={isDrifted ? 'danger' : 'accent'}>
                      {isDrifted ? 'DRIFT' : 'IN SYNC'}
                    </TdPill>
                  </div>

                  {isDrifted && item.reasons.length > 0 && (
                    <div className="td-pills-wrap">
                      {item.reasons.map((reason) => (
                        <TdPill key={reason} tone="danger">
                          {REASON_LABELS[reason]}
                        </TdPill>
                      ))}
                    </div>
                  )}

                  <div className="td-drift-grid">
                    <div className="td-drift-col">
                      <span className="td-eyebrow">DEVELOPMENT</span>
                      <span className="td-drift-val">{formatEnvScalar(item.dev)}</span>
                      {devMv && <span className="td-drift-sub">{devMv}</span>}
                    </div>
                    <div className="td-drift-col">
                      <span className="td-eyebrow">PRODUCTION</span>
                      <span className="td-drift-val">{formatEnvScalar(item.prod)}</span>
                      {prodMv && <span className="td-drift-sub">{prodMv}</span>}
                    </div>
                  </div>

                  {canSyncItem && (
                    <div>
                      {isConfirming ? (
                        <div className="td-confirm-bar">
                          <span className="td-confirm-text">Confirm Push to Prod?</span>
                          <div className="td-flag-action-group">
                            <TdButton
                              variant="danger"
                              size="sm"
                              disabled={isSyncing}
                              onClick={() => handleConfirmSingle(item)}
                            >
                              {isSyncing ? 'Pushing...' : 'Confirm'}
                            </TdButton>
                            <TdButton
                              variant="ghost"
                              size="sm"
                              disabled={isSyncing}
                              onClick={() => setConfirmFeatureId(null)}
                            >
                              Cancel
                            </TdButton>
                          </div>
                        </div>
                      ) : (
                        <div className="td-flag-actions">
                          <span className="td-eyebrow">
                            {item.reasons.includes('multivariate')
                              ? 'INCLUDES MV ALLOCATIONS'
                              : 'PROMOTE DEV STATE'}
                          </span>
                          <TdButton
                            variant="danger"
                            size="sm"
                            disabled={bulkSyncing || syncingFeatureId !== null}
                            onClick={() => {
                              setConfirmBulk(false);
                              setConfirmFeatureId(item.featureId);
                            }}
                          >
                            Sync Dev → Prod
                          </TdButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
