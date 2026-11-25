import * as React from 'react';
import type { FlagsmithLike, IdentityPreset, TraitValue } from '../core/types';
import {
  TdButton,
  TdChoicePill,
  TdInput,
  TdPill,
  TdRule,
} from './primitives';

export interface IdentityTabProps {
  flagsmith: FlagsmithLike;
  identityPresets?: IdentityPreset[];
  revision: number;
}

interface TraitDraftRow {
  rowId: string;
  key: string;
  rawValue: string;
}

const DEFAULT_IDENTITY_PRESETS: ReadonlyArray<IdentityPreset> = [
  {
    id: 'anonymous',
    label: 'Anonymous',
    description: 'Clear active user identity and traits',
    userId: null,
  },
  {
    id: 'free-user',
    label: 'Free User',
    description: 'Standard free tier identity',
    userId: 'free_user_01',
    traits: { plan: 'free', beta_tester: false },
  },
  {
    id: 'beta-tester',
    label: 'Beta Tester',
    description: 'Triggers beta_testers segment override',
    userId: 'beta_user_01',
    traits: { plan: 'pro', beta_tester: true },
  },
];

let rowCounter = 0;
function nextRowId(): string {
  rowCounter += 1;
  return `td-trait-${rowCounter}`;
}

export function readLiveIdentity(flagsmith: FlagsmithLike): string | null {
  const direct = flagsmith.identity;
  if (typeof direct === 'string' && direct.length > 0) {
    return direct;
  }
  const fromContext = flagsmith.getContext?.()?.identity?.identifier;
  if (typeof fromContext === 'string' && fromContext.length > 0) {
    return fromContext;
  }
  const fromState = flagsmith.getState?.()?.identity;
  if (typeof fromState === 'string' && fromState.length > 0) {
    return fromState;
  }
  return null;
}

export function readLiveTraits(flagsmith: FlagsmithLike): Record<string, TraitValue> {
  const result: Record<string, TraitValue> = {};

  if (typeof flagsmith.getAllTraits === 'function') {
    const raw = flagsmith.getAllTraits();
    if (raw && typeof raw === 'object') {
      for (const [key, val] of Object.entries(raw)) {
        if (val !== undefined) {
          result[key] = normalizeTraitValue(val);
        }
      }
      return result;
    }
  }

  const ctxTraits = flagsmith.getContext?.()?.identity?.traits;
  if (ctxTraits && typeof ctxTraits === 'object') {
    for (const [key, entry] of Object.entries(ctxTraits)) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        result[key] = normalizeTraitValue(entry.value);
      } else if (entry !== undefined) {
        result[key] = normalizeTraitValue(entry);
      }
    }
  }

  return result;
}

function normalizeTraitValue(raw: unknown): TraitValue {
  if (
    raw === null ||
    typeof raw === 'string' ||
    typeof raw === 'number' ||
    typeof raw === 'boolean'
  ) {
    return raw;
  }
  return String(raw);
}

function parseTraitInput(raw: string): TraitValue {
  const trimmed = raw.trim();
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (trimmed === 'null') {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return trimmed;
}

function traitsToDraftRows(traits: Record<string, TraitValue>): TraitDraftRow[] {
  const entries = Object.entries(traits);
  if (entries.length === 0) {
    return [{ rowId: nextRowId(), key: '', rawValue: '' }];
  }
  return entries.map(([key, val]) => ({
    rowId: nextRowId(),
    key,
    rawValue: val === null ? 'null' : String(val),
  }));
}

export const IdentityTab: React.FC<IdentityTabProps> = ({
  flagsmith,
  identityPresets,
  revision,
}) => {
  const liveIdentity = React.useMemo(
    () => readLiveIdentity(flagsmith),
    [flagsmith, revision],
  );
  const liveTraits = React.useMemo(
    () => readLiveTraits(flagsmith),
    [flagsmith, revision],
  );

  const [userIdInput, setUserIdInput] = React.useState<string>(liveIdentity ?? '');
  const [traitRows, setTraitRows] = React.useState<TraitDraftRow[]>(() =>
    traitsToDraftRows(liveTraits),
  );
  const [busy, setBusy] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const mergedPresets = React.useMemo(() => {
    const combined: IdentityPreset[] = [...DEFAULT_IDENTITY_PRESETS];
    if (identityPresets && identityPresets.length > 0) {
      for (const preset of identityPresets) {
        const existingIdx = combined.findIndex(
          (item) =>
            (preset.id && item.id === preset.id) ||
            item.label.toLowerCase() === preset.label.toLowerCase(),
        );
        if (existingIdx >= 0) {
          combined[existingIdx] = preset;
        } else {
          combined.push(preset);
        }
      }
    }
    return combined;
  }, [identityPresets]);

  const applyPreset = async (preset: IdentityPreset) => {
    setBusy(true);
    setStatusMessage(null);
    try {
      if (preset.userId === null) {
        await flagsmith.logout();
        setUserIdInput('');
        setTraitRows([{ rowId: nextRowId(), key: '', rawValue: '' }]);
        setStatusMessage({ kind: 'ok', text: 'Switched to Anonymous' });
      } else {
        const traits = preset.traits ?? {};
        await flagsmith.identify(preset.userId, traits);
        setUserIdInput(preset.userId);
        setTraitRows(traitsToDraftRows(traits));
        setStatusMessage({
          kind: 'ok',
          text: `Identified as ${preset.userId}`,
        });
      }
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to switch identity',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedId = userIdInput.trim();
    if (!trimmedId) {
      setStatusMessage({
        kind: 'error',
        text: 'Enter a user ID or select Anonymous.',
      });
      return;
    }

    const traitsPayload: Record<string, TraitValue> = {};
    for (const row of traitRows) {
      const k = row.key.trim();
      if (!k) continue;
      traitsPayload[k] = parseTraitInput(row.rawValue);
    }

    setBusy(true);
    setStatusMessage(null);
    try {
      await flagsmith.identify(trimmedId, traitsPayload);
      if (
        Object.keys(traitsPayload).length > 0 &&
        typeof flagsmith.setTraits === 'function'
      ) {
        // Ensure traits are evaluated even on custom Flagsmith doubles where identify ignores traits.
        const currentTraits = readLiveTraits(flagsmith);
        const missingTrait = Object.keys(traitsPayload).some(
          (k) => !(k in currentTraits),
        );
        if (missingTrait) {
          await flagsmith.setTraits(traitsPayload);
        }
      }
      setStatusMessage({
        kind: 'ok',
        text: `Applied ${trimmedId} (${Object.keys(traitsPayload).length} traits)`,
      });
    } catch (err) {
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply identity',
      });
    } finally {
      setBusy(false);
    }
  };

  const liveTraitEntries = Object.entries(liveTraits);

  return (
    <div>
      {/* Current Live Identity Readout */}
      <div className="td-section">
        <div className="td-section-head">
          <span className="td-eyebrow">ACTIVE IDENTITY</span>
          <TdPill tone={liveIdentity ? 'accent' : 'neutral'}>
            {liveIdentity ? 'IDENTIFIED' : 'ANONYMOUS'}
          </TdPill>
        </div>

        <div className="td-identity-readout">
          <span className="td-identity-id">{liveIdentity ?? 'Anonymous'}</span>
          {liveIdentity && (
            <TdButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => applyPreset(DEFAULT_IDENTITY_PRESETS[0])}
            >
              Logout
            </TdButton>
          )}
        </div>

        <div className="td-pills-wrap">
          {liveTraitEntries.length === 0 ? (
            <span className="td-eyebrow">NO ACTIVE TRAITS</span>
          ) : (
            liveTraitEntries.map(([key, val]) => (
              <TdPill key={key} tone="neutral">
                {key}={String(val)}
              </TdPill>
            ))
          )}
        </div>
      </div>

      <TdRule />

      {/* Persona Presets */}
      <div className="td-section">
        <span className="td-eyebrow">PERSONA PRESETS</span>
        <div className="td-pills-wrap" role="group" aria-label="Identity presets">
          {mergedPresets.map((preset) => {
            const isActive =
              (preset.userId === null && liveIdentity === null) ||
              (preset.userId !== null && liveIdentity === preset.userId);
            return (
              <TdChoicePill
                key={preset.id ?? preset.label}
                active={isActive}
                disabled={busy}
                title={preset.description}
                onClick={() => applyPreset(preset)}
              >
                <span>{preset.label}</span>
                {preset.userId && (
                  <span className="td-choice-weight">· {preset.userId}</span>
                )}
              </TdChoicePill>
            );
          })}
        </div>
      </div>

      <TdRule />

      {/* Custom Identity & Dynamic Traits Form */}
      <form className="td-section" onSubmit={handleSubmit}>
        <div className="td-field-group">
          <label className="td-eyebrow" htmlFor="td-identity-user-id">
            USER IDENTIFIER
          </label>
          <TdInput
            id="td-identity-user-id"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="beta_user_01"
            disabled={busy}
          />
        </div>

        <div className="td-field-group">
          <div className="td-section-head">
            <span className="td-eyebrow">TRAITS (KEY / VALUE)</span>
            <TdButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                setTraitRows((prev) => [
                  ...prev,
                  { rowId: nextRowId(), key: '', rawValue: '' },
                ])
              }
            >
              + Add Trait
            </TdButton>
          </div>

          <div className="td-trait-list">
            {traitRows.map((row, idx) => (
              <div key={row.rowId} className="td-trait-row">
                <TdInput
                  value={row.key}
                  onChange={(e) =>
                    setTraitRows((prev) =>
                      prev.map((item) =>
                        item.rowId === row.rowId
                          ? { ...item, key: e.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={idx === 0 ? 'beta_tester' : 'trait_key'}
                  aria-label={`Trait key ${idx + 1}`}
                  disabled={busy}
                />
                <TdInput
                  value={row.rawValue}
                  onChange={(e) =>
                    setTraitRows((prev) =>
                      prev.map((item) =>
                        item.rowId === row.rowId
                          ? { ...item, rawValue: e.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={idx === 0 ? 'true' : 'value'}
                  aria-label={`Trait value ${idx + 1}`}
                  disabled={busy}
                />
                <TdButton
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  aria-label={`Remove trait ${idx + 1}`}
                  onClick={() =>
                    setTraitRows((prev) => {
                      const filtered = prev.filter((item) => item.rowId !== row.rowId);
                      return filtered.length > 0
                        ? filtered
                        : [{ rowId: nextRowId(), key: '', rawValue: '' }];
                    })
                  }
                >
                  ×
                </TdButton>
              </div>
            ))}
          </div>
          <span className="td-eyebrow">
            PARSES TRUE/FALSE (BOOL), NUMBERS, NULL, OR STRINGS
          </span>
        </div>

        <div className="td-action-row">
          <div>
            {statusMessage && (
              <span
                className={
                  statusMessage.kind === 'ok'
                    ? 'td-inline-status td-inline-status--ok'
                    : 'td-inline-status td-inline-status--error'
                }
                role={statusMessage.kind === 'error' ? 'alert' : 'status'}
              >
                {statusMessage.text}
              </span>
            )}
          </div>
          <TdButton type="submit" variant="accent" size="md" disabled={busy}>
            {busy ? 'Applying...' : 'Identify & Apply Traits'}
          </TdButton>
        </div>
      </form>
    </div>
  );
};
