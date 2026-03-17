import { runtimeEnv } from '@/lib/config';
import type { ApiEnvelope, ApiErrorPayload } from '@/lib/types';

interface AuthBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
}

const authBridge: AuthBridge = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  updateTokens: () => undefined,
  clearSession: () => undefined,
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    this.details = payload?.details;
  }
}

export function configureAuthBridge(partial: Partial<AuthBridge>) {
  Object.assign(authBridge, partial);
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('http') ? path : `${runtimeEnv.VITE_API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as ApiEnvelope<unknown> | { error?: ApiErrorPayload; message?: string };
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refreshToken = authBridge.getRefreshToken();
  if (!refreshToken) {
    authBridge.clearSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok || !payload || !('data' in payload)) {
        authBridge.clearSession();
        return null;
      }

      const data = payload.data as { accessToken: string; refreshToken: string };
      authBridge.updateTokens(data);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
  retryOnAuthError?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const token = options.auth ? authBridge.getAccessToken() : null;
  const headers = new Headers(options.headers ?? {});

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
  });

  if ((response.status === 401 || response.status === 403) && options.auth && options.retryOnAuthError !== false) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiRequest<T>(path, { ...options, retryOnAuthError: false });
    }
  }

  if (response.status === 204) {
    return { data: null as T };
  }

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const errorPayload = payload && 'error' in payload ? payload.error : undefined;
    const message = errorPayload?.message ?? (payload && 'message' in payload ? payload.message : 'Request failed');
    throw new ApiError(message ?? 'Request failed', response.status, errorPayload);
  }

  if (!payload || !('data' in payload)) {
    return { data: null as T };
  }

  return { data: payload.data as T, meta: payload.meta };
}

export async function apiBlob(path: string, options: RequestOptions = {}) {
  const token = options.auth ? authBridge.getAccessToken() : null;
  const headers = new Headers(options.headers ?? {});
  if (options.auth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 403) && options.auth && options.retryOnAuthError !== false) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiBlob(path, { ...options, retryOnAuthError: false });
    }
  }

  if (!response.ok) {
    throw new ApiError('Unable to download file', response.status);
  }

  return response.blob();
}

