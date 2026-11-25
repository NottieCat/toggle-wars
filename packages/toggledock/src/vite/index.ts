import { loadEnv, type Connect, type Plugin } from 'vite';
import type { FlagsmithAdminProxyOptions } from '../core/types';

export type { FlagsmithAdminProxyOptions };

const DEFAULT_PROXY_PATH = '/api/flagsmith-admin';
const DEFAULT_FLAGSMITH_API_URL = 'http://localhost:8000/api/v1/';
const DEFAULT_AUTH_SCHEME = 'Token';

interface NodeProcessLike {
  env?: Record<string, string | undefined>;
  cwd?: () => string;
}

interface ProxyRequestLike {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: (...args: any[]) => void): unknown;
}

interface ProxyResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(chunk?: Uint8Array | string): unknown;
}

interface ResolvedProxyConfig {
  proxyPath: string;
  apiUrl: string;
  adminToken: string;
  authScheme: string;
}

function getNodeProcess(): NodeProcessLike | undefined {
  return (globalThis as unknown as { process?: NodeProcessLike }).process;
}

function getEnvVar(name: string): string | undefined {
  return getNodeProcess()?.env?.[name];
}

function getCwd(): string {
  return getNodeProcess()?.cwd?.() ?? '.';
}

function normalizeProxyPath(raw: string): string {
  const trimmed = raw.trim() || DEFAULT_PROXY_PATH;
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/, '') : withLeading;
}

function ensureTrailingSlash(url: string): string {
  const trimmed = url.trim() || DEFAULT_FLAGSMITH_API_URL;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function sendJson(
  res: ProxyResponseLike,
  statusCode: number,
  payload: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.byteLength;
  }
  const combined = new Uint8Array(new ArrayBuffer(totalLength));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function readRequestBody(req: ProxyRequestLike): Promise<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder();
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk: Uint8Array | string) => {
      chunks.push(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
    });
    req.on('end', () => resolve(concatUint8Arrays(chunks)));
    req.on('error', (err: Error) => reject(err));
  });
}

function isSafeRelativeSubpath(subpath: string): boolean {
  const lower = subpath.toLowerCase();
  return (
    !subpath.startsWith('//') &&
    !lower.startsWith('http://') &&
    !lower.startsWith('https://')
  );
}

async function handleProxyRequest(
  req: ProxyRequestLike,
  res: ProxyResponseLike,
  next: Connect.NextFunction,
  config: ResolvedProxyConfig,
): Promise<void> {
  const rawUrl = req.url ?? '';

  const matchesPrefix =
    rawUrl === config.proxyPath ||
    rawUrl.startsWith(`${config.proxyPath}/`) ||
    rawUrl.startsWith(`${config.proxyPath}?`);

  if (!matchesPrefix) {
    next();
    return;
  }

  const remainder = rawUrl.slice(config.proxyPath.length);
  const subpath = remainder.startsWith('/') ? remainder.slice(1) : remainder;

  // Health route: GET <proxyPath>/__health (never leaks FLAGSMITH_ADMIN_TOKEN)
  if (subpath === '__health' || subpath.startsWith('__health?')) {
    try {
      const origin = new URL(config.apiUrl).origin;
      const healthUrl = `${origin}/health`;
      const healthRes = await fetch(healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      const text = await healthRes.text();
      let parsed: Record<string, unknown> | null = null;
      if (text) {
        try {
          const rawJson: unknown = JSON.parse(text);
          if (rawJson && typeof rawJson === 'object' && !Array.isArray(rawJson)) {
            parsed = rawJson as Record<string, unknown>;
          }
        } catch {
          parsed = null;
        }
      }

      const headerVersion = healthRes.headers.get('x-flagsmith-version');
      const bodyVersion =
        parsed && typeof parsed.version === 'string' ? parsed.version : null;

      sendJson(res, healthRes.ok ? 200 : 503, {
        ok: healthRes.ok,
        version: bodyVersion ?? headerVersion ?? null,
        status: healthRes.ok ? 'healthy' : `unhealthy_${healthRes.status}`,
        checks: parsed ?? undefined,
        apiUrl: config.apiUrl,
        tokenConfigured: Boolean(config.adminToken),
      });
    } catch (err) {
      sendJson(res, 503, {
        ok: false,
        version: null,
        status: 'unreachable',
        apiUrl: config.apiUrl,
        tokenConfigured: Boolean(config.adminToken),
        error:
          err instanceof Error
            ? err.message
            : 'Unable to reach Flagsmith health endpoint',
      });
    }
    return;
  }

  if (!config.adminToken) {
    sendJson(res, 500, {
      error:
        'FLAGSMITH_ADMIN_TOKEN is not configured on the Vite dev server. Run `npm run bootstrap` or set FLAGSMITH_ADMIN_TOKEN in .env.local.',
      apiUrl: config.apiUrl,
    });
    return;
  }

  if (!isSafeRelativeSubpath(subpath)) {
    sendJson(res, 400, { error: 'Invalid proxy target path.' });
    return;
  }

  const method = (req.method ?? 'GET').toUpperCase();
  const targetUrl = `${config.apiUrl}${subpath}`;

  try {
    const headers: Record<string, string> = {
      Authorization: `${config.authScheme} ${config.adminToken}`,
      Accept: 'application/json',
    };

    const incomingContentType = req.headers['content-type'];
    if (typeof incomingContentType === 'string' && incomingContentType) {
      headers['Content-Type'] = incomingContentType;
    }

    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      const bytes = await readRequestBody(req);
      if (bytes.byteLength > 0) {
        body = bytes;
      }
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseBytes = new Uint8Array(await upstream.arrayBuffer());
    res.statusCode = upstream.status;

    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'no-store');
    res.end(responseBytes);
  } catch (err) {
    sendJson(res, 503, {
      error: 'Unable to reach self-hosted Flagsmith Admin API.',
      apiUrl: config.apiUrl,
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

function createProxyMiddleware(
  getConfig: () => ResolvedProxyConfig,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    void handleProxyRequest(
      req as unknown as ProxyRequestLike,
      res as unknown as ProxyResponseLike,
      next,
      getConfig(),
    );
  };
}

/**
 * Vite dev-server middleware plugin that proxies ToggleDock Admin API requests
 * to a self-hosted Flagsmith instance while keeping `FLAGSMITH_ADMIN_TOKEN`
 * strictly server-side.
 */
export function flagsmithAdminProxyPlugin(
  options: FlagsmithAdminProxyOptions = {},
): Plugin {
  let resolvedConfig: ResolvedProxyConfig = {
    proxyPath: normalizeProxyPath(options.proxyPath ?? DEFAULT_PROXY_PATH),
    apiUrl: ensureTrailingSlash(
      options.apiUrl ?? getEnvVar('FLAGSMITH_API_URL') ?? DEFAULT_FLAGSMITH_API_URL,
    ),
    adminToken: options.adminToken ?? getEnvVar('FLAGSMITH_ADMIN_TOKEN') ?? '',
    authScheme:
      options.authScheme ??
      getEnvVar('FLAGSMITH_ADMIN_AUTH_SCHEME') ??
      DEFAULT_AUTH_SCHEME,
  };

  return {
    name: 'toggledock:flagsmith-admin-proxy',

    configResolved(config) {
      const envDir = config.envDir || config.root || getCwd();
      const loaded = loadEnv(config.mode, envDir, '');

      resolvedConfig = {
        proxyPath: normalizeProxyPath(options.proxyPath ?? DEFAULT_PROXY_PATH),
        apiUrl: ensureTrailingSlash(
          options.apiUrl ??
            loaded.FLAGSMITH_API_URL ??
            getEnvVar('FLAGSMITH_API_URL') ??
            DEFAULT_FLAGSMITH_API_URL,
        ),
        adminToken:
          options.adminToken ??
          loaded.FLAGSMITH_ADMIN_TOKEN ??
          getEnvVar('FLAGSMITH_ADMIN_TOKEN') ??
          '',
        authScheme:
          options.authScheme ??
          loaded.FLAGSMITH_ADMIN_AUTH_SCHEME ??
          getEnvVar('FLAGSMITH_ADMIN_AUTH_SCHEME') ??
          DEFAULT_AUTH_SCHEME,
      };
    },

    configureServer(server) {
      server.middlewares.use(createProxyMiddleware(() => resolvedConfig));
    },

    configurePreviewServer(server) {
      server.middlewares.use(createProxyMiddleware(() => resolvedConfig));
    },
  };
}

export default flagsmithAdminProxyPlugin;
