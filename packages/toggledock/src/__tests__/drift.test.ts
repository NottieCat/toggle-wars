import { describe, expect, it, vi } from 'vitest';
import { createAdminClient } from '../core/adminClient';
import { computeEnvironmentDrift } from '../core/drift';
import type { EnvFeatureState, FlagMetadata } from '../core/types';

const sampleFeatures: FlagMetadata[] = [
  {
    id: 1,
    name: 'promo_banner',
    type: 'STANDARD',
    description: 'Release announcement strip',
    default_enabled: false,
    initial_value: null,
    multivariate_options: [],
  },
  {
    id: 2,
    name: 'theme_accent',
    type: 'STANDARD',
    description: 'Active UI accent token',
    default_enabled: true,
    initial_value: 'emerald',
    multivariate_options: [],
  },
  {
    id: 3,
    name: 'pricing_experiment',
    type: 'MULTIVARIATE',
    description: 'Pricing layout split test',
    default_enabled: true,
    initial_value: 'control',
    multivariate_options: [
      {
        id: 10,
        type: 'unicode',
        string_value: 'control',
        integer_value: null,
        boolean_value: null,
        default_percentage_allocation: 34,
      },
      {
        id: 11,
        type: 'unicode',
        string_value: 'annual_first',
        integer_value: null,
        boolean_value: null,
        default_percentage_allocation: 33,
      },
      {
        id: 12,
        type: 'unicode',
        string_value: 'usage_based',
        integer_value: null,
        boolean_value: null,
        default_percentage_allocation: 33,
      },
    ],
  },
  {
    id: 4,
    name: 'synced_flag',
    type: 'STANDARD',
    description: 'Identical across dev and prod',
    default_enabled: true,
    initial_value: 'stable',
    multivariate_options: [],
  },
];

describe('computeEnvironmentDrift', () => {
  it('detects enabled, value, and multivariate split drift while marking identical flags synced', () => {
    const devStates: EnvFeatureState[] = [
      {
        id: 101,
        feature: 1,
        environment: 1,
        enabled: true,
        feature_state_value: null,
        multivariate_feature_state_values: [],
      },
      {
        id: 102,
        feature: 2,
        environment: 1,
        enabled: true,
        feature_state_value: 'emerald',
        multivariate_feature_state_values: [],
      },
      {
        id: 103,
        feature: 3,
        environment: 1,
        enabled: true,
        feature_state_value: 'control',
        multivariate_feature_state_values: [
          { id: 501, multivariate_feature_option: 10, percentage_allocation: 34 },
          { id: 502, multivariate_feature_option: 11, percentage_allocation: 33 },
          { id: 503, multivariate_feature_option: 12, percentage_allocation: 33 },
        ],
      },
      {
        id: 104,
        feature: 4,
        environment: 1,
        enabled: true,
        feature_state_value: 'stable',
        multivariate_feature_state_values: [],
      },
      // Segment override rows must be ignored for env-default comparison
      {
        id: 999,
        feature: 2,
        environment: 1,
        enabled: true,
        feature_state_value: 'amber',
        feature_segment: 7,
        multivariate_feature_state_values: [],
      },
    ];

    const prodStates: EnvFeatureState[] = [
      {
        id: 201,
        feature: 1,
        environment: 2,
        enabled: false,
        feature_state_value: null,
        multivariate_feature_state_values: [],
      },
      {
        id: 202,
        feature: 2,
        environment: 2,
        enabled: true,
        feature_state_value: 'indigo',
        multivariate_feature_state_values: [],
      },
      {
        id: 203,
        feature: 3,
        environment: 2,
        enabled: false,
        feature_state_value: 'control',
        multivariate_feature_state_values: [
          { id: 601, multivariate_feature_option: 10, percentage_allocation: 0 },
          { id: 602, multivariate_feature_option: 11, percentage_allocation: 0 },
          { id: 603, multivariate_feature_option: 12, percentage_allocation: 0 },
        ],
      },
      {
        id: 204,
        feature: 4,
        environment: 2,
        enabled: true,
        feature_state_value: 'stable',
        multivariate_feature_state_values: [],
      },
    ];

    const report = computeEnvironmentDrift(sampleFeatures, devStates, prodStates);

    expect(report.totalCount).toBe(4);
    expect(report.driftedCount).toBe(3);
    expect(report.syncedCount).toBe(1);
    expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);

    const byName = Object.fromEntries(report.items.map((item) => [item.featureName, item]));

    expect(byName.promo_banner.status).toBe('drifted');
    expect(byName.promo_banner.reasons).toEqual(['enabled']);

    expect(byName.theme_accent.status).toBe('drifted');
    expect(byName.theme_accent.reasons).toEqual(['value']);
    expect(byName.theme_accent.dev.value).toBe('emerald');
    expect(byName.theme_accent.prod.value).toBe('indigo');

    expect(byName.pricing_experiment.status).toBe('drifted');
    expect(byName.pricing_experiment.reasons).toEqual(['enabled', 'multivariate']);
    expect(byName.pricing_experiment.dev.multivariate).toEqual([
      { optionId: 10, value: 'control', percentage: 34 },
      { optionId: 11, value: 'annual_first', percentage: 33 },
      { optionId: 12, value: 'usage_based', percentage: 33 },
    ]);
    expect(byName.pricing_experiment.prod.multivariate).toEqual([
      { optionId: 10, value: 'control', percentage: 0 },
      { optionId: 11, value: 'annual_first', percentage: 0 },
      { optionId: 12, value: 'usage_based', percentage: 0 },
    ]);

    expect(byName.synced_flag.status).toBe('synced');
    expect(byName.synced_flag.reasons).toEqual([]);

    // JSON snapshot output is valid, deterministic JSON with all summary fields.
    const snapshotJson = report.toJsonSnapshot();
    const parsed = JSON.parse(snapshotJson);
    expect(parsed.driftedCount).toBe(3);
    expect(parsed.syncedCount).toBe(1);
    expect(parsed.items).toHaveLength(4);
  });

  it('flags missing environment states when a feature is absent in dev or prod', () => {
    const singleFeature = [sampleFeatures[0]];
    const devStates: EnvFeatureState[] = [
      {
        id: 101,
        feature: 1,
        environment: 1,
        enabled: true,
        feature_state_value: null,
        multivariate_feature_state_values: [],
      },
    ];

    const report = computeEnvironmentDrift(singleFeature, devStates, []);
    expect(report.driftedCount).toBe(1);
    expect(report.items[0].reasons).toEqual(['missing_in_prod']);
    expect(report.items[0].prod.enabled).toBeNull();
  });
});

describe('createAdminClient Flagsmith v2.295.2 contract', () => {
  it('omits multivariate_feature_state_values on scalar sync and preserves existing IDs on MV sync', async () => {
    const capturedBodies: Array<{ url: string; method: string; body?: any }> = [];

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      capturedBodies.push({ url, method, body });

      if (method === 'GET' && url.includes('/featurestates/')) {
        return new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: 203,
                feature: 3,
                environment: 2,
                enabled: false,
                feature_state_value: 'control',
                multivariate_feature_state_values: [
                  { id: 601, multivariate_feature_option: 10, percentage_allocation: 0 },
                  { id: 602, multivariate_feature_option: 11, percentage_allocation: 0 },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'PUT') {
        return new Response(
          JSON.stringify({
            id: 203,
            feature: body.feature,
            environment: body.environment,
            enabled: body.enabled,
            feature_state_value: body.feature_state_value,
            multivariate_feature_state_values:
              body.multivariate_feature_state_values ?? [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ ok: true, version: '2.295.2', status: 'healthy' }), {
        status: 200,
      });
    });

    const client = createAdminClient({
      proxyUrl: '/api/flagsmith-admin',
      fetch: mockFetch as unknown as typeof fetch,
    });

    // 1. Scalar sync omits `multivariate_feature_state_values` so existing MV splits are untouched.
    await client.syncFeatureToEnvironment({
      envKey: 'prod-env-key',
      featureId: 3,
      enabled: true,
      value: 'annual_first',
      featureStateId: 203,
      environmentId: 2,
    });

    const scalarPut = capturedBodies.find((entry) => entry.method === 'PUT');
    expect(scalarPut?.body).toEqual({
      feature: 3,
      environment: 2,
      enabled: true,
      feature_state_value: 'annual_first',
    });
    expect('multivariate_feature_state_values' in (scalarPut?.body ?? {})).toBe(false);

    // 2. MV sync preserves target environment's existing numeric `id` on every MV row.
    capturedBodies.length = 0;
    await client.syncFeatureToEnvironment({
      envKey: 'prod-env-key',
      featureId: 3,
      enabled: true,
      value: 'control',
      multivariateAllocations: [
        { multivariate_feature_option: 10, percentage_allocation: 50 },
        { multivariate_feature_option: 11, percentage_allocation: 50 },
      ],
    });

    const mvPut = capturedBodies.find((entry) => entry.method === 'PUT');
    expect(mvPut?.body.multivariate_feature_state_values).toEqual([
      { id: 601, multivariate_feature_option: 10, percentage_allocation: 50 },
      { id: 602, multivariate_feature_option: 11, percentage_allocation: 50 },
    ]);

    // 3. Direct PUT rejects MV entries missing numeric `id` to prevent HTTP 400.
    await expect(
      client.updateEnvironmentFeatureState('prod-env-key', 203, {
        feature: 3,
        environment: 2,
        enabled: true,
        feature_state_value: 'control',
        multivariate_feature_state_values: [
          { id: 0, multivariate_feature_option: 10, percentage_allocation: 50 },
        ],
      }),
    ).rejects.toThrow(/existing numeric `id`/);
  });

  it('rewrites paginated `next` URLs through the admin proxy and parses health cleanly', async () => {
    const seenUrls: string[] = [];
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);

      if (url.endsWith('/__health')) {
        return new Response(
          JSON.stringify({ ok: true, version: '2.295.2', status: 'healthy', tokenConfigured: true }),
          { status: 200 },
        );
      }

      if (url.includes('page=2')) {
        return new Response(
          JSON.stringify({
            count: 2,
            next: null,
            previous: null,
            results: [
              {
                id: 2,
                name: 'theme_accent',
                type: 'STANDARD',
                description: null,
                default_enabled: true,
                initial_value: 'emerald',
                multivariate_options: [],
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          count: 2,
          next: 'http://localhost:8000/api/v1/projects/1/features/?page=2',
          previous: null,
          results: [
            {
              id: 1,
              name: 'promo_banner',
              type: 'STANDARD',
              description: null,
              default_enabled: true,
              initial_value: null,
              multivariate_options: [],
            },
          ],
        }),
        { status: 200 },
      );
    });

    const client = createAdminClient({
      proxyUrl: '/api/flagsmith-admin',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const health = await client.getHealth();
    expect(health).toMatchObject({ ok: true, version: '2.295.2', status: 'healthy' });

    const features = await client.listProjectFeatures(1);
    expect(features.map((f) => f.name)).toEqual(['promo_banner', 'theme_accent']);
    expect(seenUrls).toEqual([
      '/api/flagsmith-admin/__health',
      '/api/flagsmith-admin/projects/1/features/',
      '/api/flagsmith-admin/projects/1/features/?page=2',
    ]);
  });
});
