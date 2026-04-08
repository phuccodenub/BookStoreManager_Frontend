import { runtimeEnv } from '@/lib/config';
import type { ApiEnvelope, ApiErrorPayload } from '@/lib/types';

interface AuthBridge {
  getAccessToken: () => string | null;
  updateAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

const authBridge: AuthBridge = {
  getAccessToken: () => null,
  updateAccessToken: () => undefined,
  clearSession: () => undefined,
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

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

  try {
    return JSON.parse(text) as ApiEnvelope<unknown> | { error?: ApiErrorPayload; message?: string };
  } catch {
    return null;
  }
}

async function performRequest(input: string, init?: RequestInit) {
  try {
    return await fetch(input, {
      credentials: init?.credentials ?? 'include',
      ...init,
    });
  } catch {
      throw new ApiError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra dịch vụ và thử lại.', 0, {
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra dịch vụ và thử lại.',
      });
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function requestAccessTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await performRequest(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const payload = await parseJsonSafely(response);
      if (response.status === 401 || response.status === 403) {
        authBridge.clearSession();
        return null;
      }

      if (!response.ok) {
        const errorPayload = payload && 'error' in payload ? payload.error : undefined;
        const message = errorPayload?.message ?? (payload && 'message' in payload ? payload.message : 'Request failed');
        throw new ApiError(message ?? 'Request failed', response.status, errorPayload);
      }

      if (!payload || !('data' in payload)) {
        authBridge.clearSession();
        return null;
      }

      const data = payload.data as { accessToken: string };
      authBridge.updateAccessToken(data.accessToken);
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
  formData?: FormData;
  retryOnAuthError?: boolean;
  accessTokenOverride?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const token = options.accessTokenOverride ?? (options.auth ? authBridge.getAccessToken() : null);
  const headers = new Headers(options.headers ?? {});

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await performRequest(buildUrl(path, options.query), {
    ...options,
    headers,
    body: options.formData ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });

  if ((response.status === 401 || response.status === 403) && options.auth && options.retryOnAuthError !== false) {
    const refreshedToken = await requestAccessTokenRefresh();
    if (refreshedToken) {
      return apiRequest<T>(path, { ...options, accessTokenOverride: refreshedToken, retryOnAuthError: false });
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
  const token = options.accessTokenOverride ?? (options.auth ? authBridge.getAccessToken() : null);
  const headers = new Headers(options.headers ?? {});
  if (options.auth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await performRequest(buildUrl(path, options.query), {
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 403) && options.auth && options.retryOnAuthError !== false) {
    const refreshedToken = await requestAccessTokenRefresh();
    if (refreshedToken) {
      return apiBlob(path, { ...options, accessTokenOverride: refreshedToken, retryOnAuthError: false });
    }
  }

  if (!response.ok) {
    throw new ApiError('Unable to download file', response.status);
  }

  return response.blob();
}

