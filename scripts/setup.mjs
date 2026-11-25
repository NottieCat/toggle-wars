#!/usr/bin/env node

/**
 * Zero-dependency one-command setup orchestrator for ToggleDock.
 *
 * Verifies Docker is running, installs workspace dependencies if needed,
 * boots the self-hosted Flagsmith OSS stack, waits for readiness, seeds
 * local Flagsmith state + apps/demo/.env.local, and builds packages/toggledock.
 *
 * Flags:
 *   --install   Force running `npm install --no-audit --no-fund` even if node_modules exists.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const FORCE_INSTALL = process.argv.includes('--install');

const FLAGSMITH_URL = (process.env.FLAGSMITH_BASE_URL ?? 'http://localhost:8000').replace(
  /\/+$/,
  '',
);
const ADMIN_EMAIL = process.env.FLAGSMITH_ADMIN_EMAIL ?? 'dev@toggledock.local';
const ADMIN_PASSWORD = process.env.FLAGSMITH_ADMIN_PASSWORD ?? 'FlagPass123!';

const TOTAL_STEPS = 6;

function logStep(step, message) {
  console.log(`\n[setup ${step}/${TOTAL_STEPS}] ${message}`);
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`[setup] Failed to start "${label}": ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[setup] "${label}" exited with status ${result.status ?? 1}.`);
    process.exit(result.status ?? 1);
  }
}

function checkDockerRunning() {
  logStep(1, 'Checking Docker daemon...');
  const result = spawnSync('docker', ['info'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
    env: process.env,
  });

  if (result.error || result.status !== 0) {
    console.error(
      'Docker Desktop is not running. Launch Docker Desktop and re-run `npm run setup`.',
    );
    process.exit(1);
  }
  console.log('[setup] Docker daemon is running.');
}

function ensureDependenciesInstalled() {
  const nodeModulesDir = path.join(REPO_ROOT, 'node_modules');
  const tsupBin = path.join(nodeModulesDir, '.bin', process.platform === 'win32' ? 'tsup.cmd' : 'tsup');
  const needsInstall = FORCE_INSTALL || !existsSync(nodeModulesDir) || !existsSync(tsupBin);

  if (!needsInstall) {
    logStep(2, 'Workspace dependencies already installed (pass --install to reinstall).');
    return;
  }

  logStep(2, 'Installing workspace dependencies...');
  runCommand(NPM_CMD, ['install', '--no-audit', '--no-fund'], 'npm install');
}

function startFlagsmithStack() {
  logStep(3, 'Starting self-hosted Flagsmith + Postgres stack...');
  runCommand(
    'docker',
    ['compose', '-f', 'docker/docker-compose.yml', 'up', '-d'],
    'docker compose up -d',
  );
}

function waitForFlagsmith() {
  logStep(4, 'Waiting for Flagsmith health & API readiness...');
  runCommand(process.execPath, ['scripts/wait-for-flagsmith.mjs'], 'wait-for-flagsmith');
}

function bootstrapFlagsmith() {
  logStep(5, 'Seeding Flagsmith flags, segments, overrides, and apps/demo/.env.local...');
  runCommand(process.execPath, ['scripts/bootstrap.mjs'], 'bootstrap');
}

function buildToggleDockPackage() {
  logStep(6, 'Building packages/toggledock library...');
  runCommand(NPM_CMD, ['run', 'build', '-w', 'toggledock'], 'npm run build -w toggledock');
}

function printBanner() {
  console.log(`
========================================================================
  ToggleDock local environment is ready!
------------------------------------------------------------------------
  Next step:             npm run dev
  Demo App:              http://localhost:5173  (after \`npm run dev\`)
  Self-Hosted Flagsmith: ${FLAGSMITH_URL}
  Admin Login:           ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
  Stop Stack:            npm run down
========================================================================
`);
}

function main() {
  checkDockerRunning();
  ensureDependenciesInstalled();
  startFlagsmithStack();
  waitForFlagsmith();
  bootstrapFlagsmith();
  buildToggleDockPackage();
  printBanner();
}

main();
