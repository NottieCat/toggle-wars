import type {
  AdminClient,
  AdminClientOptions,
  AdminHealthStatus,
  EnvFeatureState,
  FlagMetadata,
  FlagType,
  FlagValue,
  MultivariateFeatureStateValue,
  MultivariateOption,
  SyncFeatureInput,
  UpdateEnvFeatureStatePayload,
} from './types';

export const DEFAULT_ADMIN_PROXY_URL = '/api/flagsmith-admin';

const MAX_PAGINATION_PAGES = 50;

export class AdminClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'AdminClientError';
    this.status = status;
    this.body = body;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function toProxySubpath(nextUrl: string, baseUrl: string): string {
  const parsed = new URL(nextUrl, 'http://toggledock.local');
  let pathname = parsed.pathname;

  if (pathname.startsWith('/api/v1/')) {
    pathname = pathname.slice('/api/v1/'.length);
  } else if (baseUrl && pathname.startsWith(`${baseUrl}/`)) {
    pathname = pathname.slice(baseUrl.length + 1);
  } else {
    pathname = pathname.replace(/^\/+/, '');
  }

  return `${pathname}${parsed.search}`;
}

function extractErrorMessage(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['error', 'detail', 'message']) {
      if (typeof obj[key] === 'string' && obj[key]) {
        return obj[key] as string;
      }
    }
    try {
      return JSON.stringify(body);
    } catch {
      // fall through
    }
  }
  return `Flagsmith Admin API request failed with HTTP ${status}`;
}

function parseMultivariateOption(raw: Record<string, unknown>): MultivariateOption {
  return {
    id: Number(raw.id),
    ...(typeof raw.uuid === 'string' ? { uuid: raw.uuid } : {}),
    type: typeof raw.type === 'string' ? raw.type : 'unicode',
    string_value: raw.string_value !== undefined ? (raw.string_value as string | null) : null,
    integer_value: raw.integer_value !== undefined ? (raw.integer_value as number | null) : null,
    boolean_value: raw.boolean_value !== undefined ? (raw.boolean_value as boolean | null) : null,
    default_percentage_allocation: Number(raw.default_percentage_allocation ?? 0),
    ...(typeof raw.key === 'string' ? { key: raw.key } : {}),
  };
}

function parseFlagMetadata(raw: Record<string, unknown>): FlagMetadata {
  const typeValue: FlagType =
    raw.type === 'MULTIVARIATE' ? 'MULTIVARIATE' : 'STANDARD';
  const rawOptions = Array.isArray(raw.multivariate_options)
    ? raw.multivariate_options
    : [];

  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    type: typeValue,
    description: typeof raw.description === 'string' ? raw.description : null,
    default_enabled: Boolean(raw.default_enabled),
    initial_value:
      raw.initial_value !== undefined ? (raw.initial_value as FlagValue) : null,
    multivariate_options: rawOptions
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map(parseMultivariateOption),
    ...(typeof raw.num_segment_overrides === 'number'
      ? { num_segment_overrides: raw.num_segment_overrides }
      : {}),
  };
}

function parseEnvFeatureState(raw: Record<string, unknown>): EnvFeatureState {
  const rawMv = Array.isArray(raw.multivariate_feature_state_values)
    ? raw.multivariate_feature_state_values
    : [];

  const multivariate_feature_state_values: MultivariateFeatureStateValue[] = rawMv
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: Number(item.id),
      multivariate_feature_option: Number(item.multivariate_feature_option),
      percentage_allocation: Number(item.percentage_allocation ?? 0),
    }));

  return {
    id: Number(raw.id),
    feature: Number(raw.feature),
    environment: Number(raw.environment),
    enabled: Boolean(raw.enabled),
    feature_state_value:
      raw.feature_state_value !== undefined
        ? (raw.feature_state_value as FlagValue)
        : null,
    multivariate_feature_state_values,
    feature_segment:
      raw.feature_segment === null || raw.feature_segment === undefined
        ? null
        : Number(raw.feature_segment),
    identity:
      raw.identity === null || raw.identity === undefined
        ? null
        : Number(raw.identity),
  };
}

export function createAdminClient(
  options?: AdminClientOptions | string,
): AdminClient {
  const resolved: AdminClientOptions =
    typeof options === 'string' ? { proxyUrl: options } : (options ?? {});
  const proxyUrl = normalizeBaseUrl(resolved.proxyUrl ?? DEFAULT_ADMIN_PROXY_URL);
  const fetchFn = resolved.fetch ?? globalThis.fetch;

  const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const cleanPath = path.replace(/^\/+/, '');
    const url = `${proxyUrl}/${cleanPath}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    };

    const response = await fetchFn(url, {
      ...init,
      headers,
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      throw new AdminClientError(
        extractErrorMessage(response.status, parsed),
        response.status,
        parsed,
      );
    }

    return parsed as T;
  };

  const fetchAllPaginated = async <T>(initialPath: string): Promise<T[]> => {
    const items: T[] = [];
    let currentPath: string | null = initialPath;
    let pages = 0;

    while (currentPath && pages < MAX_PAGINATION_PAGES) {
      pages += 1;
      const data: unknown = await requestJson<unknown>(currentPath, {
        method: 'GET',
      });

      if (Array.isArray(data)) {
        items.push(...(data as T[]));
        break;
      }

      if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
        const page = data as { results: T[]; next?: string | null };
        items.push(...page.results);
        currentPath = page.next ? toProxySubpath(page.next, proxyUrl) : null;
      } else {
        break;
      }
    }

    return items;
  };

  const listEnvironmentFeatureStates = async (
    envKey: string,
  ): Promise<EnvFeatureState[]> => {
    const rawItems = await fetchAllPaginated<Record<string, unknown>>(
      `environments/${encodeURIComponent(envKey)}/featurestates/`,
    );
    return rawItems
      .map(parseEnvFeatureState)
      .filter((state) => state.feature_segment == null && state.identity == null);
  };

  const updateEnvironmentFeatureState = async (
    envKey: string,
    featureStateId: number,
    payload: UpdateEnvFeatureStatePayload,
  ): Promise<EnvFeatureState> => {
    const body: UpdateEnvFeatureStatePayload = {
      feature: payload.feature,
      environment: payload.environment,
      enabled: payload.enabled,
      feature_state_value: payload.feature_state_value,
    };

    // Flagsmith v2.295.2 rejects PUT payloads containing MV entries without existing numeric IDs (HTTP 400).
    // Omit `multivariate_feature_state_values` when updating scalar value or enabled toggle alone.
    if (payload.multivariate_feature_state_values !== undefined) {
      const validIds = payload.multivariate_feature_state_values.every(
        (entry) => typeof entry.id === 'number' && Number.isFinite(entry.id) && entry.id > 0,
      );
      if (!validIds) {
        throw new Error(
          'ToggleDock AdminClient: multivariate_feature_state_values entries must each include their existing numeric `id`. Omit the field when updating only enabled/value.',
        );
      }
      body.multivariate_feature_state_values = payload.multivariate_feature_state_values.map(
        (entry) => ({
          id: entry.id,
          multivariate_feature_option: entry.multivariate_feature_option,
          percentage_allocation: entry.percentage_allocation,
        }),
      );
    }

    const updated = await requestJson<Record<string, unknown>>(
      `environments/${encodeURIComponent(envKey)}/featurestates/${featureStateId}/`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
    );

    return parseEnvFeatureState(updated);
  };

  return {
    proxyUrl,

    async getHealth(): Promise<AdminHealthStatus> {
      try {
        const response = await fetchFn(`${proxyUrl}/__health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const text = await response.text();
        let data: Record<string, unknown> = {};
        if (text) {
          try {
            data = JSON.parse(text) as Record<string, unknown>;
          } catch {
            data = { status: text };
          }
        }
        return {
          ok: Boolean(response.ok && (data.ok ?? true)),
          version: typeof data.version === 'string' ? data.version : null,
          status:
            typeof data.status === 'string'
              ? data.status
              : response.ok
                ? 'ok'
                : `http_${response.status}`,
          ...(data.checks && typeof data.checks === 'object'
            ? { checks: data.checks as Record<string, unknown> }
            : {}),
          ...(typeof data.apiUrl === 'string' ? { apiUrl: data.apiUrl } : {}),
          ...(typeof data.tokenConfigured === 'boolean'
            ? { tokenConfigured: data.tokenConfigured }
            : {}),
          ...(typeof data.error === 'string' ? { error: data.error } : {}),
        };
      } catch (err) {
        return {
          ok: false,
          version: null,
          status: 'unreachable',
          error: err instanceof Error ? err.message : 'Unable to reach admin proxy',
        };
      }
    },

    async listProjectFeatures(
      projectId: number | string,
      envId?: number | string,
    ): Promise<FlagMetadata[]> {
      const query =
        envId !== undefined && envId !== ''
          ? `?environment=${encodeURIComponent(String(envId))}`
          : '';
      const rawItems = await fetchAllPaginated<Record<string, unknown>>(
        `projects/${encodeURIComponent(String(projectId))}/features/${query}`,
      );
      return rawItems.map(parseFlagMetadata);
    },

    listEnvironmentFeatureStates,

    updateEnvironmentFeatureState,

    async syncFeatureToEnvironment(
      input: SyncFeatureInput,
    ): Promise<EnvFeatureState> {
      const needsLookup =
        input.featureStateId === undefined ||
        input.environmentId === undefined ||
        input.multivariateAllocations !== undefined;

      let targetState: EnvFeatureState | undefined;
      if (needsLookup) {
        const states = await listEnvironmentFeatureStates(input.envKey);
        targetState = states.find((state) => state.feature === input.featureId);
        if (!targetState) {
          throw new AdminClientError(
            `Feature ${input.featureId} was not found in environment "${input.envKey}".`,
            404,
          );
        }
      }

      const featureStateId = input.featureStateId ?? targetState!.id;
      const environmentId = input.environmentId ?? targetState!.environment;

      const payload: UpdateEnvFeatureStatePayload = {
        feature: input.featureId,
        environment: environmentId,
        enabled: input.enabled,
        feature_state_value: input.value,
      };

      // Only send multivariate_feature_state_values when explicitly syncing MV percentages
      // AND preserve every existing target environment MV row `id` so Flagsmith never returns 400.
      if (
        input.multivariateAllocations !== undefined &&
        targetState &&
        targetState.multivariate_feature_state_values.length > 0
      ) {
        const targetPercentages = new Map<number, number>();
        for (const allocation of input.multivariateAllocations) {
          targetPercentages.set(
            allocation.multivariate_feature_option,
            allocation.percentage_allocation,
          );
        }

        const existingWithIds = targetState.multivariate_feature_state_values.filter(
          (entry) => typeof entry.id === 'number' && Number.isFinite(entry.id) && entry.id > 0,
        );

        if (existingWithIds.length > 0) {
          payload.multivariate_feature_state_values = existingWithIds.map((entry) => ({
            id: entry.id,
            multivariate_feature_option: entry.multivariate_feature_option,
            percentage_allocation:
              targetPercentages.get(entry.multivariate_feature_option) ??
              entry.percentage_allocation,
          }));
        }
      }

      return updateEnvironmentFeatureState(input.envKey, featureStateId, payload);
    },
  };
}
