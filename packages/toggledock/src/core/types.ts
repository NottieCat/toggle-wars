export type FlagValue = string | number | boolean | null;

export type TraitValue = string | number | boolean | null;

export type FlagType = 'STANDARD' | 'MULTIVARIATE';

export interface FlagState {
  id?: number;
  enabled: boolean;
  value: FlagValue;
}

export type FlagsMap = Record<string, FlagState>;

export interface FlagOverride {
  enabled?: boolean;
  value?: FlagValue;
  updatedAt: number;
}

export interface FlagOverridePatch {
  enabled?: boolean;
  value?: FlagValue;
}

export type OverrideMap = Record<string, FlagOverride>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface OverrideStoreOptions {
  storageKey?: string;
  storage?: StorageLike | null;
}

export interface OverrideStore {
  readonly storageKey: string;
  getOverrides(): OverrideMap;
  getOverride(key: string): FlagOverride | undefined;
  setOverride(key: string, patch: FlagOverridePatch): void;
  clearOverride(key: string): void;
  clearAllOverrides(): void;
  hasOverrides(): boolean;
  getOverrideCount(): number;
  subscribe(listener: () => void): () => void;
  getVersion(): number;
}

export interface MultivariateOption {
  id: number;
  uuid?: string;
  type: string;
  string_value: string | null;
  integer_value: number | null;
  boolean_value: boolean | null;
  default_percentage_allocation: number;
  key?: string;
}

export interface MultivariateFeatureStateValue {
  id: number;
  multivariate_feature_option: number;
  percentage_allocation: number;
}

export interface FlagMetadata {
  id: number;
  name: string;
  type: FlagType;
  description: string | null;
  default_enabled: boolean;
  initial_value: FlagValue;
  multivariate_options: MultivariateOption[];
  num_segment_overrides?: number;
}

export interface EnvFeatureState {
  id: number;
  feature: number;
  environment: number;
  enabled: boolean;
  feature_state_value: FlagValue;
  multivariate_feature_state_values: MultivariateFeatureStateValue[];
  feature_segment?: number | null;
  identity?: number | null;
}

export interface UpdateEnvFeatureStatePayload {
  feature: number;
  environment: number;
  enabled: boolean;
  feature_state_value: FlagValue;
  /**
   * Flagsmith v2.295.2 requires every entry to carry its existing numeric `id`.
   * Omit this field when updating only `enabled` or scalar `feature_state_value`
   * so existing multivariate percentage allocations are preserved.
   */
  multivariate_feature_state_values?: MultivariateFeatureStateValue[];
}

export interface MultivariateAllocationTarget {
  multivariate_feature_option: number;
  percentage_allocation: number;
}

export interface SyncFeatureInput {
  envKey: string;
  featureId: number;
  enabled: boolean;
  value: FlagValue;
  featureStateId?: number;
  environmentId?: number;
  multivariateAllocations?: ReadonlyArray<MultivariateAllocationTarget>;
}

export interface IdentityPreset {
  id?: string;
  label: string;
  description?: string;
  /** `null` clears identity (`flagsmith.logout()`). */
  userId: string | null;
  traits?: Record<string, TraitValue>;
}

export interface ValuePresetOption {
  value: string;
  label?: string;
  percentage?: number;
}

export type ValuePresetsMap = Record<string, ReadonlyArray<string | ValuePresetOption>>;

export type DriftStatus = 'synced' | 'drifted';

export type DriftReason =
  | 'enabled'
  | 'value'
  | 'multivariate'
  | 'missing_in_dev'
  | 'missing_in_prod';

export interface DriftMultivariateAllocation {
  optionId: number;
  value: string;
  percentage: number;
}

export interface DriftEnvSnapshot {
  featureStateId: number | null;
  environmentId: number | null;
  enabled: boolean | null;
  value: FlagValue;
  multivariate: DriftMultivariateAllocation[];
}

export interface DriftItem {
  featureId: number;
  featureName: string;
  featureType: FlagType;
  description: string | null;
  status: DriftStatus;
  reasons: DriftReason[];
  dev: DriftEnvSnapshot;
  prod: DriftEnvSnapshot;
}

export interface DriftSnapshotPayload {
  generatedAt: string;
  driftedCount: number;
  syncedCount: number;
  totalCount: number;
  items: DriftItem[];
}

export interface DriftReport extends DriftSnapshotPayload {
  toJsonSnapshot(pretty?: boolean): string;
}

export interface AdminHealthStatus {
  ok: boolean;
  version: string | null;
  status: string;
  checks?: Record<string, unknown>;
  apiUrl?: string;
  tokenConfigured?: boolean;
  error?: string;
}

export interface AdminClientOptions {
  proxyUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface AdminClient {
  readonly proxyUrl: string;
  getHealth(): Promise<AdminHealthStatus>;
  listProjectFeatures(projectId: number | string, envId?: number | string): Promise<FlagMetadata[]>;
  listEnvironmentFeatureStates(envKey: string): Promise<EnvFeatureState[]>;
  updateEnvironmentFeatureState(
    envKey: string,
    featureStateId: number,
    payload: UpdateEnvFeatureStatePayload,
  ): Promise<EnvFeatureState>;
  syncFeatureToEnvironment(input: SyncFeatureInput): Promise<EnvFeatureState>;
}

export interface FlagsmithContextSnapshot {
  identity?: {
    identifier?: string | null;
    traits?: Record<string, { value?: TraitValue; transient?: boolean } | TraitValue> | null;
  } | null;
  environment?: {
    apiKey?: string;
  } | null;
}

export interface FlagsmithStateSnapshot {
  api?: string;
  flags?: FlagsMap | null;
  identity?: string | null;
  evaluationContext?: FlagsmithContextSnapshot;
}

/**
 * Structural interface compatible with `flagsmith@10.0.0` (`IFlagsmith`) and lightweight test doubles.
 */
export interface FlagsmithLike {
  hasFeature(key: string, optionsOrSkipAnalytics?: any): boolean;
  getValue(key: string, options?: any, skipAnalytics?: boolean): any;
  getAllFlags(): FlagsMap | null | undefined;
  getFlags(): Promise<void>;
  identify(userId: string, traits?: Record<string, any>, transient?: boolean): Promise<void>;
  logout(): Promise<void>;
  setTrait?(key: string, value: any): Promise<void> | void;
  setTraits?(traits: Record<string, any>): Promise<void> | void;
  getTrait?(key: string): any;
  getAllTraits?(): Record<string, any>;
  getState?(): FlagsmithStateSnapshot;
  setState?(state: any): void;
  getContext?(): FlagsmithContextSnapshot;
  setContext?(context: any): Promise<void>;
  updateContext?(context: any): Promise<void>;
  init?(config: any): Promise<void>;
  identity?: string | null;
  initialised?: boolean;
  flags?: FlagsMap | null;
  _trigger?: (() => void) | null;
  _triggerLoadingState?: (() => void) | null;
  onChange?: ((...args: any[]) => void) | null;
}

export interface MergedFlag {
  key: string;
  id?: number;
  enabled: boolean;
  value: FlagValue;
  serverEnabled: boolean;
  serverValue: FlagValue;
  isOverridden: boolean;
  override?: FlagOverride;
}

export interface ToggleDockBridge {
  readonly flagsmith: FlagsmithLike;
  readonly store: OverrideStore;
  isAttached(): boolean;
  detach(): void;
  getServerFlags(): FlagsMap;
  getMergedFlags(): Record<string, MergedFlag>;
  getEffectiveFlags(): FlagsMap;
  getRevision(): number;
  subscribe(listener: () => void): () => void;
  refreshFromServer(): Promise<void>;
  notify(): void;
}

export type ToggleDockTab = 'flags' | 'identity' | 'drift';

export type ToggleDockAccent = 'emerald' | 'amber' | 'indigo';

export interface ToggleDockProps {
  /** Active Flagsmith SDK instance. */
  flagsmith: FlagsmithLike;
  /** Optional externally managed override store. */
  overrideStore?: OverrideStore;
  /** localStorage key for persisted overrides (default: `'toggledock:overrides:v1'`). */
  storageKey?: string;
  /** Admin proxy URL handled by `flagsmithAdminProxyPlugin` (default: `'/api/flagsmith-admin'`). */
  adminProxyUrl?: string;
  /** Flagsmith project ID for feature metadata and multivariate options. */
  projectId?: number | string;
  /** Flagsmith Development environment API key (for Sync to Dev & Drift). */
  devEnvKey?: string;
  /** Optional Flagsmith Development environment numeric ID. */
  devEnvId?: number | string;
  /** Flagsmith Production environment API key (for Drift & Sync Dev -> Prod). */
  prodEnvKey?: string;
  /** Optional Flagsmith Production environment numeric ID. */
  prodEnvId?: number | string;
  /** Human-readable label for the currently active environment (e.g., `'Development'`). */
  environmentLabel?: string;
  /** Custom identity persona presets merged alongside defaults. */
  identityPresets?: IdentityPreset[];
  /** Custom value presets per flag key for 1-click variant switching. */
  valuePresets?: ValuePresetsMap;
  /** Whether the drawer starts open (default: `false`). */
  defaultOpen?: boolean;
  /** Initial active tab (default: `'flags'`). */
  defaultTab?: ToggleDockTab;
  /** Enable `Cmd/Ctrl + Shift + F` toggle shortcut (default: `true`). */
  enableShortcut?: boolean;
  /** Flag key whose effective value drives `data-td-accent` (default: `'theme_accent'`). */
  accentFlagKey?: string;
  /** Fallback accent when `accentFlagKey` is unavailable (default: `'emerald'`). */
  defaultAccent?: ToggleDockAccent;
  /** Callback fired whenever local overrides or server flags change. */
  onFlagsChange?: (flags: FlagsMap, overrides: OverrideMap) => void;
  /** Optional extra CSS class appended to `.td-root`. */
  className?: string;
}

export interface FlagsmithAdminProxyOptions {
  /** Dev server URL prefix intercepted by the proxy (default: `'/api/flagsmith-admin'`). */
  proxyPath?: string;
  /** Self-hosted Flagsmith API URL (default: `FLAGSMITH_API_URL` or `'http://localhost:8000/api/v1/'`). */
  apiUrl?: string;
  /** Flagsmith Admin API token (default: `FLAGSMITH_ADMIN_TOKEN`). */
  adminToken?: string;
  /** Authorization header scheme (default: `FLAGSMITH_ADMIN_AUTH_SCHEME` or `'Token'`). */
  authScheme?: string;
}
