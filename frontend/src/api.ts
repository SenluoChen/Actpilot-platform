export type ApiConfig = {
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | undefined | null>): string {
  const normalized = normalizeBaseUrl(baseUrl);
  // Support dev-proxy / same-origin calls by allowing an empty baseUrl.
  // When baseUrl is empty, return a relative URL like `/annex/compose?...`.
  const url = normalized
    ? new URL(normalized + path)
    : new URL(path, 'http://local.dev');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return normalized ? url.toString() : `${url.pathname}${url.search}`;
}

export class ApiError extends Error {
  status: number;
  bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

async function request(config: ApiConfig, input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (config.apiKey) headers.set('x-api-key', config.apiKey);
  if (config.bearerToken) headers.set('Authorization', `Bearer ${config.bearerToken}`);
  return fetch(input, { ...init, headers });
}

export async function postJson<T>(config: ApiConfig, path: string, body: unknown): Promise<T> {
  const url = buildUrl(config.baseUrl, path);
  const res = await request(config, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status, text);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function getJson<T>(config: ApiConfig, path: string, query?: Record<string, string | number | undefined | null>): Promise<T> {
  const url = buildUrl(config.baseUrl, path, query);
  const res = await request(config, url, { method: 'GET' });

  const text = await res.text();
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status, text);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
