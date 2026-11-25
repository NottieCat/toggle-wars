import type {
  DriftEnvSnapshot,
  DriftItem,
  DriftMultivariateAllocation,
  DriftReason,
  DriftReport,
  DriftSnapshotPayload,
  EnvFeatureState,
  FlagMetadata,
  FlagValue,
  MultivariateOption,
} from './types';

const ALLOCATION_EPSILON = 1e-6;

function normalizeScalarValue(value: FlagValue | undefined): FlagValue {
  return value === undefined ? null : value;
}

function getOptionDisplayValue(option: MultivariateOption): string {
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

function buildMultivariateSnapshot(
  feature: FlagMetadata,
  state: EnvFeatureState | undefined,
): DriftMultivariateAllocation[] {
  const byOptionId = new Map<number, number>();
  if (state?.multivariate_feature_state_values) {
    for (const entry of state.multivariate_feature_state_values) {
      byOptionId.set(entry.multivariate_feature_option, entry.percentage_allocation);
    }
  }

  const knownOptionIds = new Set<number>();
  const allocations: DriftMultivariateAllocation[] = [];

  const sortedOptions = [...feature.multivariate_options].sort((a, b) => a.id - b.id);
  for (const option of sortedOptions) {
    knownOptionIds.add(option.id);
    allocations.push({
      optionId: option.id,
      value: getOptionDisplayValue(option),
      percentage: byOptionId.get(option.id) ?? 0,
    });
  }

  // Include any state-level MV option references absent from metadata defensively.
  for (const [optionId, percentage] of Array.from(byOptionId.entries()).sort(
    ([a], [b]) => a - b,
  )) {
    if (knownOptionIds.has(optionId)) continue;
    allocations.push({
      optionId,
      value: `option_${optionId}`,
      percentage,
    });
  }

  return allocations;
}

function buildEnvSnapshot(
  feature: FlagMetadata,
  state: EnvFeatureState | undefined,
): DriftEnvSnapshot {
  if (!state) {
    return {
      featureStateId: null,
      environmentId: null,
      enabled: null,
      value: null,
      multivariate: buildMultivariateSnapshot(feature, undefined),
    };
  }

  return {
    featureStateId: state.id,
    environmentId: state.environment,
    enabled: Boolean(state.enabled),
    value: normalizeScalarValue(state.feature_state_value),
    multivariate: buildMultivariateSnapshot(feature, state),
  };
}

function hasMultivariateDrift(
  devAllocations: DriftMultivariateAllocation[],
  prodAllocations: DriftMultivariateAllocation[],
): boolean {
  if (devAllocations.length !== prodAllocations.length) {
    return true;
  }
  const prodById = new Map<number, number>();
  for (const entry of prodAllocations) {
    prodById.set(entry.optionId, entry.percentage);
  }
  for (const devEntry of devAllocations) {
    const prodPct = prodById.get(devEntry.optionId);
    if (prodPct === undefined) {
      return true;
    }
    if (Math.abs(devEntry.percentage - prodPct) > ALLOCATION_EPSILON) {
      return true;
    }
  }
  return false;
}

function indexEnvDefaultStates(
  states: ReadonlyArray<EnvFeatureState>,
): Map<number, EnvFeatureState> {
  const map = new Map<number, EnvFeatureState>();
  for (const state of states) {
    if (state.feature_segment != null || state.identity != null) {
      continue;
    }
    map.set(state.feature, state);
  }
  return map;
}

export function computeEnvironmentDrift(
  features: ReadonlyArray<FlagMetadata>,
  devStates: ReadonlyArray<EnvFeatureState>,
  prodStates: ReadonlyArray<EnvFeatureState>,
): DriftReport {
  const devByFeature = indexEnvDefaultStates(devStates);
  const prodByFeature = indexEnvDefaultStates(prodStates);

  const sortedFeatures = [...features].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const items: DriftItem[] = sortedFeatures.map((feature) => {
    const devState = devByFeature.get(feature.id);
    const prodState = prodByFeature.get(feature.id);

    const dev = buildEnvSnapshot(feature, devState);
    const prod = buildEnvSnapshot(feature, prodState);
    const reasons: DriftReason[] = [];

    if (!devState && prodState) {
      reasons.push('missing_in_dev');
    } else if (devState && !prodState) {
      reasons.push('missing_in_prod');
    } else if (devState && prodState) {
      if (dev.enabled !== prod.enabled) {
        reasons.push('enabled');
      }
      if (dev.value !== prod.value) {
        reasons.push('value');
      }
      if (hasMultivariateDrift(dev.multivariate, prod.multivariate)) {
        reasons.push('multivariate');
      }
    }

    return {
      featureId: feature.id,
      featureName: feature.name,
      featureType: feature.type,
      description: feature.description,
      status: reasons.length > 0 ? 'drifted' : 'synced',
      reasons,
      dev,
      prod,
    };
  });

  const driftedCount = items.filter((item) => item.status === 'drifted').length;
  const syncedCount = items.length - driftedCount;
  const generatedAt = new Date().toISOString();

  const snapshotPayload: DriftSnapshotPayload = {
    generatedAt,
    driftedCount,
    syncedCount,
    totalCount: items.length,
    items,
  };

  return {
    ...snapshotPayload,
    toJsonSnapshot(pretty = true): string {
      return JSON.stringify(snapshotPayload, null, pretty ? 2 : undefined);
    },
  };
}
