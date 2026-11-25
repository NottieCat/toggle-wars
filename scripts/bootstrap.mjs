#!/usr/bin/env node

/**
 * Zero-dependency, strictly idempotent Flagsmith bootstrap seeder for ToggleDock.
 *
 * Seeds a self-hosted Flagsmith v2.x instance with:
 *   - Local admin account (dev@toggledock.local)
 *   - Organisation: "ToggleDock Demo"
 *   - Project: "SaaS Playground"
 *   - Environments: "Development" & "Production"
 *   - 5 feature flags with intentional Development vs Production drift
 *   - Segment: "beta_testers" (trait beta_tester == "true")
 *   - Development segment override: beta_testers -> theme_accent = "amber"
 *   - Local env file: apps/demo/.env.local (gitignored)
 *
 * Environment overrides:
 *   FLAGSMITH_BASE_URL        (default: http://localhost:8000)
 *   FLAGSMITH_ADMIN_EMAIL     (default: dev@toggledock.local)
 *   FLAGSMITH_ADMIN_PASSWORD  (default: FlagPass123!)
 *   FLAGSMITH_ENV_OUT         (default: <repo>/apps/demo/.env.local)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASE_URL = (process.env.FLAGSMITH_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
const API_BASE = `${BASE_URL}/api/v1`;
const API_BASE_TRAILING = `${API_BASE}/`;
const REQUEST_TIMEOUT_MS = 15000;

const ADMIN_EMAIL = process.env.FLAGSMITH_ADMIN_EMAIL ?? 'dev@toggledock.local';
// Note: Django's UserAttributeSimilarityValidator rejects passwords containing
// "ToggleDock" when email is dev@toggledock.local, so default uses FlagPass123!.
const ADMIN_PASSWORD = process.env.FLAGSMITH_ADMIN_PASSWORD ?? 'FlagPass123!';
const ADMIN_FIRST_NAME = process.env.FLAGSMITH_ADMIN_FIRST_NAME ?? 'Local';
const ADMIN_LAST_NAME = process.env.FLAGSMITH_ADMIN_LAST_NAME ?? 'Admin';

const ENV_OUT_PATH =
  process.env.FLAGSMITH_ENV_OUT ?? path.join(REPO_ROOT, 'apps', 'demo', '.env.local');

const ORG_NAME = 'ToggleDock Demo';
const PROJECT_NAME = 'SaaS Playground';
const DEV_ENV_NAME = 'Development';
const PROD_ENV_NAME = 'Production';
const SEGMENT_NAME = 'beta_testers';

const FLAG_SPECS = [
  {
    name: 'promo_banner',
    type: 'STANDARD',
    description: 'Displays the seasonal promotional banner at the top of the workspace.',
    default_enabled: false,
    initial_value: null,
    mvOptions: [],
    states: {
      [DEV_ENV_NAME]: { enabled: true, value: null },
      [PROD_ENV_NAME]: { enabled: false, value: null },
    },
  },
  {
    name: 'ai_copilot_widget',
    type: 'STANDARD',
    description: 'Enables the embedded AI copilot assistant drawer in the app.',
    default_enabled: false,
    initial_value: null,
    mvOptions: [],
    states: {
      [DEV_ENV_NAME]: { enabled: true, value: null },
      [PROD_ENV_NAME]: { enabled: false, value: null },
    },
  },
  {
    name: 'pricing_experiment',
    type: 'MULTIVARIATE',
    description: 'Multivariate pricing page layout experiment.',
    default_enabled: false,
    initial_value: 'control',
    mvOptions: [
      { value: 'control', defaultPct: 34 },
      { value: 'annual_first', defaultPct: 33 },
      { value: 'usage_based', defaultPct: 33 },
    ],
    states: {
      [DEV_ENV_NAME]: {
        enabled: true,
        value: 'control',
        mvAllocations: { control: 34, annual_first: 33, usage_based: 33 },
      },
      [PROD_ENV_NAME]: {
        enabled: false,
        value: 'control',
        mvAllocations: { control: 0, annual_first: 0, usage_based: 0 },
      },
    },
  },
  {
    name: 'onboarding_flow',
    type: 'MULTIVARIATE',
    description: 'Multivariate new-user onboarding experience experiment.',
    default_enabled: true,
    initial_value: 'wizard',
    mvOptions: [
      { value: 'wizard', defaultPct: 34 },
      { value: 'direct_dashboard', defaultPct: 33 },
      { value: 'sample_data', defaultPct: 33 },
    ],
    states: {
      [DEV_ENV_NAME]: {
        enabled: true,
        value: 'wizard',
        mvAllocations: { wizard: 34, direct_dashboard: 33, sample_data: 33 },
      },
      [PROD_ENV_NAME]: {
        enabled: true,
        value: 'direct_dashboard',
        mvAllocations: { wizard: 0, direct_dashboard: 0, sample_data: 0 },
      },
    },
  },
  {
    name: 'theme_accent',
    type: 'STANDARD',
    description: 'Controls the primary UI accent color token.',
    default_enabled: true,
    initial_value: 'indigo',
    mvOptions: [],
    states: {
      [DEV_ENV_NAME]: { enabled: true, value: 'emerald' },
      [PROD_ENV_NAME]: { enabled: true, value: 'indigo' },
    },
  },
];

const SEGMENT_OVERRIDE_SPEC = {
  environmentName: DEV_ENV_NAME,
  featureName: 'theme_accent',
  segmentName: SEGMENT_NAME,
  enabled: true,
  value: 'amber',
  priority: 0,
};

function log(message) {
  console.log(`[bootstrap] ${message}`);
}

async function apiRequest(method, pathOrUrl, { token, envKey, body } = {}) {
  const url = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
    ? pathOrUrl
    : `${API_BASE}${pathOrUrl}`;

  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }
  if (envKey) {
    headers['X-Environment-Key'] = envKey;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { ok: response.ok, status: response.status, json, text, url };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Network error on ${method} ${url}: ${detail}`);
  } finally {
    clearTimeout(timer);
  }
}

function assertOk(res, context) {
  if (!res.ok) {
    const snippet = (res.text || '').slice(0, 500);
    throw new Error(`${context} failed (HTTP ${res.status}): ${snippet}`);
  }
  return res.json;
}

async function fetchAllPages(pathOrUrl, { token }) {
  const items = [];
  let nextUrl = pathOrUrl;

  while (nextUrl) {
    const res = await apiRequest('GET', nextUrl, { token });
    const data = assertOk(res, `GET ${nextUrl}`);
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.results)) {
      items.push(...data.results);
      nextUrl = data.next ?? null;
    } else {
      throw new Error(`Unexpected list response shape for GET ${nextUrl}`);
    }
  }

  return items;
}

function buildFeatureStateValue(value) {
  return {
    type: 'unicode',
    string_value: value === null || value === undefined ? null : String(value),
    integer_value: null,
    boolean_value: null,
  };
}

function isEmailAlreadyExistsError(res) {
  if (res.status !== 400 || !res.json) {
    return false;
  }
  const emailErrors = Array.isArray(res.json.email) ? res.json.email : [];
  return emailErrors.some((msg) => String(msg).toLowerCase().includes('already exists'));
}

async function authenticateAdmin() {
  // Attempt registration first so subsequent runs never trigger a failed login
  // attempt against django-axes (ENABLE_AXES=true, AXES_FAILURE_LIMIT=10).
  const regRes = await apiRequest('POST', '/auth/users/', {
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
    },
  });

  if (regRes.ok) {
    log(`Registered local admin ${ADMIN_EMAIL} (user id=${regRes.json?.id}).`);
    if (regRes.json?.key) {
      return regRes.json.key;
    }
    const loginRes = await apiRequest('POST', '/auth/login/', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const loginData = assertOk(loginRes, 'POST /auth/login/');
    if (!loginData?.key) {
      throw new Error('Login succeeded but returned no auth token key.');
    }
    return loginData.key;
  }

  if (isEmailAlreadyExistsError(regRes)) {
    const loginRes = await apiRequest('POST', '/auth/login/', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const loginData = assertOk(loginRes, 'POST /auth/login/ (existing admin)');
    if (!loginData?.key) {
      throw new Error('Login succeeded but returned no auth token key.');
    }
    log(`Logged in as existing admin ${ADMIN_EMAIL}.`);
    return loginData.key;
  }

  assertOk(regRes, 'POST /auth/users/');
  return null;
}

async function ensureOrganisation(token) {
  const orgs = await fetchAllPages('/organisations/', { token });
  const existing = orgs.find((o) => o.name === ORG_NAME);
  if (existing) {
    log(`Reusing organisation "${ORG_NAME}" (id=${existing.id}).`);
    return existing;
  }
  const created = assertOk(
    await apiRequest('POST', '/organisations/', {
      token,
      body: { name: ORG_NAME },
    }),
    `POST /organisations/ (${ORG_NAME})`,
  );
  log(`Created organisation "${ORG_NAME}" (id=${created.id}).`);
  return created;
}

async function ensureProject(token, orgId) {
  const projects = await fetchAllPages('/projects/', { token });
  const existing = projects.find((p) => p.name === PROJECT_NAME && p.organisation === orgId);
  if (existing) {
    log(`Reusing project "${PROJECT_NAME}" (id=${existing.id}).`);
    return existing;
  }
  const created = assertOk(
    await apiRequest('POST', '/projects/', {
      token,
      body: { name: PROJECT_NAME, organisation: orgId },
    }),
    `POST /projects/ (${PROJECT_NAME})`,
  );
  log(`Created project "${PROJECT_NAME}" (id=${created.id}).`);
  return created;
}

async function ensureEnvironments(token, projectId) {
  const existingEnvs = await fetchAllPages(`/environments/?project=${projectId}`, { token });
  const byName = new Map(existingEnvs.map((env) => [env.name, env]));

  for (const envName of [DEV_ENV_NAME, PROD_ENV_NAME]) {
    if (byName.has(envName)) {
      const env = byName.get(envName);
      log(`Reusing environment "${envName}" (id=${env.id}).`);
    } else {
      const created = assertOk(
        await apiRequest('POST', '/environments/', {
          token,
          body: { name: envName, project: projectId },
        }),
        `POST /environments/ (${envName})`,
      );
      byName.set(envName, created);
      log(`Created environment "${envName}" (id=${created.id}).`);
    }
  }

  return {
    devEnv: byName.get(DEV_ENV_NAME),
    prodEnv: byName.get(PROD_ENV_NAME),
  };
}

async function ensureFeatureAndOptions(token, projectId, existingFeaturesByName, spec) {
  let feature = existingFeaturesByName.get(spec.name);
  if (feature) {
    log(`Reusing feature "${spec.name}" (id=${feature.id}, type=${feature.type}).`);
  } else {
    feature = assertOk(
      await apiRequest('POST', `/projects/${projectId}/features/`, {
        token,
        body: {
          name: spec.name,
          type: spec.type,
          default_enabled: spec.default_enabled,
          initial_value: spec.initial_value,
          description: spec.description,
        },
      }),
      `POST /projects/${projectId}/features/ (${spec.name})`,
    );
    existingFeaturesByName.set(spec.name, feature);
    log(`Created feature "${spec.name}" (id=${feature.id}, type=${feature.type}).`);
  }

  const mvOptionByValue = new Map();
  if (spec.type === 'MULTIVARIATE') {
    const existingOpts = await fetchAllPages(
      `/projects/${projectId}/features/${feature.id}/mv-options/`,
      { token },
    );
    for (const opt of existingOpts) {
      mvOptionByValue.set(opt.string_value, opt);
    }

    for (const desired of spec.mvOptions) {
      const existing = mvOptionByValue.get(desired.value);
      if (!existing) {
        const created = assertOk(
          await apiRequest('POST', `/projects/${projectId}/features/${feature.id}/mv-options/`, {
            token,
            body: {
              feature: feature.id,
              type: 'unicode',
              string_value: desired.value,
              default_percentage_allocation: desired.defaultPct,
            },
          }),
          `POST mv-option ${spec.name}:${desired.value}`,
        );
        mvOptionByValue.set(desired.value, created);
        log(
          `  Created MV option "${desired.value}" (${desired.defaultPct}%) on "${spec.name}" (id=${created.id}).`,
        );
      } else if (existing.default_percentage_allocation !== desired.defaultPct) {
        const updated = assertOk(
          await apiRequest(
            'PATCH',
            `/projects/${projectId}/features/${feature.id}/mv-options/${existing.id}/`,
            {
              token,
              body: { default_percentage_allocation: desired.defaultPct },
            },
          ),
          `PATCH mv-option ${spec.name}:${desired.value}`,
        );
        mvOptionByValue.set(desired.value, updated);
        log(
          `  Updated MV option "${desired.value}" default allocation to ${desired.defaultPct}% on "${spec.name}".`,
        );
      }
    }
  }

  return { feature, mvOptionByValue };
}

function isFeatureStateInSync(fs, desiredState, mvOptionByValue) {
  if (fs.enabled !== desiredState.enabled) {
    return false;
  }
  const currentVal = fs.feature_state_value?.string_value ?? null;
  const desiredVal = desiredState.value ?? null;
  if (currentVal !== desiredVal) {
    return false;
  }
  if (desiredState.mvAllocations) {
    const existingByOptId = new Map(
      (fs.multivariate_feature_state_values ?? []).map((m) => [
        m.multivariate_feature_option,
        m.percentage_allocation,
      ]),
    );
    for (const [val, pct] of Object.entries(desiredState.mvAllocations)) {
      const opt = mvOptionByValue.get(val);
      if (!opt || existingByOptId.get(opt.id) !== pct) {
        return false;
      }
    }
  }
  return true;
}

async function syncEnvironmentFeatureState(token, env, feature, desiredState, mvOptionByValue) {
  const states = await fetchAllPages(
    `/features/featurestates/?environment=${env.id}&feature=${feature.id}`,
    { token },
  );
  const envDefaultState = states.find(
    (fs) => fs.feature_segment === null && fs.identity === null,
  );
  if (!envDefaultState) {
    throw new Error(
      `No default environment featurestate found for feature "${feature.name}" in "${env.name}".`,
    );
  }

  if (isFeatureStateInSync(envDefaultState, desiredState, mvOptionByValue)) {
    log(`  [${env.name}] "${feature.name}" already in sync.`);
    return envDefaultState;
  }

  let mvPayload = [];
  if (desiredState.mvAllocations) {
    const existingByOptId = new Map(
      (envDefaultState.multivariate_feature_state_values ?? []).map((m) => [
        m.multivariate_feature_option,
        m,
      ]),
    );
    mvPayload = Object.entries(desiredState.mvAllocations).map(([val, pct]) => {
      const opt = mvOptionByValue.get(val);
      if (!opt) {
        throw new Error(`Missing MV option "${val}" for feature "${feature.name}".`);
      }
      const existingMv = existingByOptId.get(opt.id);
      return existingMv
        ? {
            id: existingMv.id,
            multivariate_feature_option: opt.id,
            percentage_allocation: pct,
          }
        : {
            multivariate_feature_option: opt.id,
            percentage_allocation: pct,
          };
    });
  }

  const updated = assertOk(
    await apiRequest('PUT', `/features/featurestates/${envDefaultState.id}/`, {
      token,
      body: {
        feature: feature.id,
        environment: env.id,
        enabled: desiredState.enabled,
        feature_state_value: buildFeatureStateValue(desiredState.value),
        multivariate_feature_state_values: mvPayload,
      },
    }),
    `PUT /features/featurestates/${envDefaultState.id}/ (${env.name}:${feature.name})`,
  );

  log(
    `  [${env.name}] Updated "${feature.name}" -> enabled=${desiredState.enabled}, value=${JSON.stringify(desiredState.value)}`,
  );
  return updated;
}

async function ensureBetaTestersSegment(token, projectId) {
  const segments = await fetchAllPages(`/projects/${projectId}/segments/`, { token });
  const existing = segments.find((s) => s.name === SEGMENT_NAME);
  if (existing) {
    log(`Reusing segment "${SEGMENT_NAME}" (id=${existing.id}).`);
    return existing;
  }

  const created = assertOk(
    await apiRequest('POST', `/projects/${projectId}/segments/`, {
      token,
      body: {
        name: SEGMENT_NAME,
        description: 'Users opted into beta features via trait beta_tester == "true".',
        rules: [
          {
            type: 'ALL',
            rules: [
              {
                type: 'ANY',
                conditions: [
                  {
                    operator: 'EQUAL',
                    property: 'beta_tester',
                    value: 'true',
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
    `POST /projects/${projectId}/segments/ (${SEGMENT_NAME})`,
  );
  log(`Created segment "${SEGMENT_NAME}" (id=${created.id}).`);
  return created;
}

async function ensureSegmentOverride(token, env, feature, segment, spec) {
  const featureSegments = await fetchAllPages(
    `/features/feature-segments/?environment=${env.id}&feature=${feature.id}`,
    { token },
  );
  const existingFeatSeg = featureSegments.find((fs) => fs.segment === segment.id);

  if (!existingFeatSeg) {
    const created = assertOk(
      await apiRequest(
        'POST',
        `/environments/${env.api_key}/features/${feature.id}/create-segment-override/`,
        {
          token,
          body: {
            enabled: spec.enabled,
            feature_state_value: buildFeatureStateValue(spec.value),
            feature_segment: {
              segment: segment.id,
              priority: spec.priority,
            },
            multivariate_feature_state_values: [],
          },
        },
      ),
      `POST create-segment-override (${env.name}:${feature.name}:${segment.name})`,
    );
    log(
      `Created segment override [${env.name}] "${segment.name}" -> "${feature.name}" = ${JSON.stringify(spec.value)} (enabled=${spec.enabled}, fs_id=${created.id}).`,
    );
    return created;
  }

  const states = await fetchAllPages(
    `/features/featurestates/?environment=${env.id}&feature=${feature.id}`,
    { token },
  );
  const overrideState = states.find((fs) => fs.feature_segment === existingFeatSeg.id);
  if (!overrideState) {
    throw new Error(
      `Found feature_segment id=${existingFeatSeg.id} for "${segment.name}" on "${feature.name}" but no matching featurestate.`,
    );
  }

  const currentVal = overrideState.feature_state_value?.string_value ?? null;
  if (overrideState.enabled === spec.enabled && currentVal === spec.value) {
    log(
      `Reusing segment override [${env.name}] "${segment.name}" -> "${feature.name}" = ${JSON.stringify(spec.value)} (already in sync, fs_id=${overrideState.id}).`,
    );
    return overrideState;
  }

  const updated = assertOk(
    await apiRequest('PUT', `/features/featurestates/${overrideState.id}/`, {
      token,
      body: {
        feature: feature.id,
        environment: env.id,
        feature_segment: existingFeatSeg.id,
        enabled: spec.enabled,
        feature_state_value: buildFeatureStateValue(spec.value),
        multivariate_feature_state_values: [],
      },
    }),
    `PUT /features/featurestates/${overrideState.id}/ (segment override)`,
  );
  log(
    `Updated segment override [${env.name}] "${segment.name}" -> "${feature.name}" = ${JSON.stringify(spec.value)} (enabled=${spec.enabled}).`,
  );
  return updated;
}

function writeEnvLocal({ project, devEnv, prodEnv, token }) {
  fs.mkdirSync(path.dirname(ENV_OUT_PATH), { recursive: true });
  const lines = [
    '# Auto-generated by scripts/bootstrap.mjs — gitignored local Flagsmith configuration',
    `VITE_FLAGSMITH_API_URL=${API_BASE_TRAILING}`,
    `VITE_FLAGSMITH_DEV_KEY=${devEnv.api_key}`,
    `VITE_FLAGSMITH_PROD_KEY=${prodEnv.api_key}`,
    `VITE_FLAGSMITH_PROJECT_ID=${project.id}`,
    `VITE_FLAGSMITH_DEV_ENV_KEY=${devEnv.api_key}`,
    `VITE_FLAGSMITH_DEV_ENV_ID=${devEnv.id}`,
    `VITE_FLAGSMITH_PROD_ENV_KEY=${prodEnv.api_key}`,
    `VITE_FLAGSMITH_PROD_ENV_ID=${prodEnv.id}`,
    'VITE_FLAGSMITH_ADMIN_PROXY_URL=/api/flagsmith-admin',
    `FLAGSMITH_API_URL=${API_BASE_TRAILING}`,
    `FLAGSMITH_ADMIN_TOKEN=${token}`,
    'FLAGSMITH_ADMIN_AUTH_SCHEME=Token',
    '',
  ];
  fs.writeFileSync(ENV_OUT_PATH, lines.join('\n'), 'utf8');
  log(`Wrote ${path.relative(REPO_ROOT, ENV_OUT_PATH)} (12 env vars populated).`);
}

async function main() {
  log(`Bootstrapping Flagsmith at ${BASE_URL}...`);

  const token = await authenticateAdmin();
  const org = await ensureOrganisation(token);
  const project = await ensureProject(token, org.id);
  const { devEnv, prodEnv } = await ensureEnvironments(token, project.id);

  const existingFeatures = await fetchAllPages(`/projects/${project.id}/features/`, { token });
  const existingFeaturesByName = new Map(existingFeatures.map((f) => [f.name, f]));
  const seededFeatures = new Map();

  for (const spec of FLAG_SPECS) {
    const { feature, mvOptionByValue } = await ensureFeatureAndOptions(
      token,
      project.id,
      existingFeaturesByName,
      spec,
    );
    seededFeatures.set(spec.name, feature);

    await syncEnvironmentFeatureState(
      token,
      devEnv,
      feature,
      spec.states[DEV_ENV_NAME],
      mvOptionByValue,
    );
    await syncEnvironmentFeatureState(
      token,
      prodEnv,
      feature,
      spec.states[PROD_ENV_NAME],
      mvOptionByValue,
    );
  }

  const betaSegment = await ensureBetaTestersSegment(token, project.id);
  const overrideEnv = SEGMENT_OVERRIDE_SPEC.environmentName === DEV_ENV_NAME ? devEnv : prodEnv;
  const overrideFeature = seededFeatures.get(SEGMENT_OVERRIDE_SPEC.featureName);
  await ensureSegmentOverride(token, overrideEnv, overrideFeature, betaSegment, SEGMENT_OVERRIDE_SPEC);

  writeEnvLocal({ project, devEnv, prodEnv, token });

  log('Bootstrap complete!');
}

main().catch((error) => {
  console.error(`[bootstrap] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
