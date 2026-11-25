#!/usr/bin/env node

/**
 * Zero-dependency readiness poller for the local Flagsmith Docker stack.
 *
 * Polls the Flagsmith health endpoint (/health) and /api/v1/ until both
 * respond cleanly or the timeout expires.
 *
 * Environment overrides:
 *   FLAGSMITH_BASE_URL       (default: http://localhost:8000)
 *   FLAGSMITH_WAIT_TIMEOUT_S (default: 180)
 *   FLAGSMITH_POLL_MS        (default: 2000)
 */

const BASE_URL = (process.env.FLAGSMITH_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
const TIMEOUT_SECONDS = Number(process.env.FLAGSMITH_WAIT_TIMEOUT_S ?? 180);
const POLL_INTERVAL_MS = Number(process.env.FLAGSMITH_POLL_MS ?? 2000);
const REQUEST_TIMEOUT_MS = 10000;

const HEALTH_URL = `${BASE_URL}/health`;
const API_URL = `${BASE_URL}/api/v1/`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(url, accept = 'application/json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: accept },
    });
    const text = await response.text();
    const version = response.headers.get('flagsmith-version');
    return { ok: true, status: response.status, text, version };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, text: '', version: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

function isHealthReady(result) {
  if (!result.ok || result.status !== 200) {
    return false;
  }
  try {
    const payload = JSON.parse(result.text);
    const values = Object.values(payload);
    return values.length > 0 && values.every((v) => v === 'working');
  } catch {
    return true;
  }
}

function isApiReady(result) {
  return result.ok && result.status >= 200 && result.status < 500;
}

async function main() {
  const startedAt = Date.now();
  const deadline = startedAt + TIMEOUT_SECONDS * 1000;
  let attempt = 0;

  console.log(
    `[wait-for-flagsmith] Waiting for Flagsmith at ${BASE_URL} (timeout: ${TIMEOUT_SECONDS}s)...`,
  );

  while (Date.now() < deadline) {
    attempt += 1;
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);

    const health = await probe(HEALTH_URL, 'application/json');
    if (!isHealthReady(health)) {
      const detail = health.ok ? `HTTP ${health.status}` : health.error;
      console.log(
        `[wait-for-flagsmith] [${elapsedSec}s] attempt ${attempt}: ${HEALTH_URL} not ready (${detail})`,
      );
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const api = await probe(API_URL, 'application/json, text/html, */*');
    if (!isApiReady(api)) {
      const detail = api.ok ? `HTTP ${api.status}` : api.error;
      console.log(
        `[wait-for-flagsmith] [${elapsedSec}s] attempt ${attempt}: ${API_URL} not ready (${detail})`,
      );
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const versionTag = health.version ? ` v${health.version}` : '';
    console.log(
      `[wait-for-flagsmith] Flagsmith${versionTag} ready in ${elapsedSec}s! (${HEALTH_URL} -> HTTP ${health.status}, ${API_URL} -> HTTP ${api.status})`,
    );
    return;
  }

  console.error(
    `[wait-for-flagsmith] Timed out after ${TIMEOUT_SECONDS}s waiting for Flagsmith at ${BASE_URL}.`,
  );
  console.error(
    `[wait-for-flagsmith] Check container status with: docker compose -f docker/docker-compose.yml ps`,
  );
  process.exit(1);
}

main();
