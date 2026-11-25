export { ToggleDock } from './components/ToggleDock';

export {
  createOverrideStore,
  DEFAULT_STORAGE_KEY,
  normalizeFlagKey,
} from './core/overrides';

export {
  attachToggleDockBridge,
  getActiveToggleDockBridge,
  useToggleDockFlags,
  useToggleDockRevision,
} from './core/bridge';

export {
  createAdminClient,
  DEFAULT_ADMIN_PROXY_URL,
  AdminClientError,
} from './core/adminClient';

export { computeEnvironmentDrift } from './core/drift';

export type {
  AdminClient,
  AdminClientOptions,
  AdminHealthStatus,
  DriftEnvSnapshot,
  DriftItem,
  DriftMultivariateAllocation,
  DriftReason,
  DriftReport,
  DriftSnapshotPayload,
  DriftStatus,
  EnvFeatureState,
  FlagMetadata,
  FlagOverride,
  FlagOverridePatch,
  FlagState,
  FlagType,
  FlagValue,
  FlagsmithAdminProxyOptions,
  FlagsmithContextSnapshot,
  FlagsmithLike,
  FlagsmithStateSnapshot,
  FlagsMap,
  IdentityPreset,
  MergedFlag,
  MultivariateAllocationTarget,
  MultivariateFeatureStateValue,
  MultivariateOption,
  OverrideMap,
  OverrideStore,
  OverrideStoreOptions,
  StorageLike,
  SyncFeatureInput,
  ToggleDockAccent,
  ToggleDockBridge,
  ToggleDockProps,
  ToggleDockTab,
  TraitValue,
  UpdateEnvFeatureStatePayload,
  ValuePresetOption,
  ValuePresetsMap,
} from './core/types';
