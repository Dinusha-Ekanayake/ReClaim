// Browser requests stay on the frontend origin and are proxied by Next.js.
// This keeps HttpOnly refresh cookies first-party across browsers while the
// backend URL remains a server-side rewrite target.
import { hasLocalStorageAccess, readLocalStorage, removeLocalStorage, writeLocalStorage } from '@/lib/browserStorage';

const API_URL = '/api';
let accessToken: string | null = null;
const REFRESH_LOCK_KEY = 'reclaim_refresh_lock';

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getSessionAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function acquireRefreshLock(): Promise<() => void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + 12_000;

  while (Date.now() < deadline) {
    let current: { id?: string; expiresAt?: number } | null = null;
    try {
      current = JSON.parse(readLocalStorage(REFRESH_LOCK_KEY) || 'null');
    } catch {
      removeLocalStorage(REFRESH_LOCK_KEY);
    }

    if (!current?.id || !current.expiresAt || current.expiresAt <= Date.now()) {
      if (!writeLocalStorage(REFRESH_LOCK_KEY, JSON.stringify({ id, expiresAt: Date.now() + 10_000 }))) {
        // In restricted browser contexts, the in-module refresh promise still
        // coalesces requests in this tab even though cross-tab locking is unavailable.
        return () => undefined;
      }
      // A short settle makes localStorage's read/write sequence act as a
      // cross-tab election: if two tabs raced, only the last writer proceeds.
      await wait(40 + Math.floor(Math.random() * 40));
      try {
        const elected = JSON.parse(readLocalStorage(REFRESH_LOCK_KEY) || 'null');
        if (elected?.id === id) {
          return () => {
            try {
              const held = JSON.parse(readLocalStorage(REFRESH_LOCK_KEY) || 'null');
              if (held?.id === id) removeLocalStorage(REFRESH_LOCK_KEY);
            } catch {
              removeLocalStorage(REFRESH_LOCK_KEY);
            }
          };
        }
      } catch {
        removeLocalStorage(REFRESH_LOCK_KEY);
      }
    }
    await wait(100);
  }

  throw new ApiError('Session refresh is busy. Please try again.', 503);
}

async function refreshAccessToken(): Promise<string | null> {
  const release = await acquireRefreshLock();
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 401 || res.status === 403) {
      removeLocalStorage('hasSession');
      setAccessToken(null);
      return null;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || 'Session refresh is temporarily unavailable.', res.status, data);
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    writeLocalStorage('hasSession', 'true');
    return data.accessToken;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not reach the session service. Please try again.', 0);
  } finally {
    release();
  }
}

let refreshPromise: Promise<string | null> | null = null;

function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

/**
 * Force a session refresh while coalescing concurrent HTTP and Socket.IO
 * recovery attempts into one request.
 */
export function refreshSession(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return refreshOnce();
}

export async function restoreAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const sessionMarker = readLocalStorage('hasSession');
  if (sessionMarker !== 'true' && hasLocalStorageAccess()) return false;
  if (accessToken) return true;
  return !!(await refreshSession());
}

function hasEstablishedBrowserSession() {
  return accessToken !== null || readLocalStorage('hasSession') === 'true' || !hasLocalStorageAccess();
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, params, timeoutMs = 30_000, ...fetchOptions } = options;

  // Build URL with params
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    ...(!(fetchOptions.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getSessionAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = fetchOptions.signal
    ? AbortSignal.any([fetchOptions.signal, timeoutSignal])
    : timeoutSignal;
  const response = await fetch(url, { ...fetchOptions, headers, credentials: 'include', signal });

  // Token expired — refresh only an established session. A 401 from login or
  // another public auth endpoint must preserve its real server error.
  if (response.status === 401 && !skipAuth) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED' && typeof window !== 'undefined' && hasEstablishedBrowserSession()) {
      const newToken = await refreshSession();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryTimeoutSignal = AbortSignal.timeout(timeoutMs);
        const retrySignal = fetchOptions.signal
          ? AbortSignal.any([fetchOptions.signal, retryTimeoutSignal])
          : retryTimeoutSignal;
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: 'include',
          signal: retrySignal,
        });
        if (!retryResponse.ok) {
          const errData = await retryResponse.json().catch(() => ({}));
          throw new ApiError(errData.error || 'Request failed', retryResponse.status, errData);
        }
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      }
    }
    const invalidSessionCodes = new Set(['TOKEN_EXPIRED', 'AUTH_REQUIRED', 'INVALID_TOKEN', 'USER_NOT_FOUND']);
    if (
      invalidSessionCodes.has(data.code)
      && typeof window !== 'undefined'
      && hasEstablishedBrowserSession()
    ) {
      removeLocalStorage('hasSession');
      setAccessToken(null);
      if (!window.location.pathname.startsWith('/auth/')) {
        window.location.assign('/auth/login?expired=true');
      }
    }
    throw new ApiError(data.error || 'Authentication required', 401, data);
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(errData.error || 'Request failed', response.status, errData);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

// ─── API Methods ──────────────────────────────────────────────────────────────
export const api = {
  get: <T = any>(endpoint: string, params?: RequestOptions['params'], options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'GET', params }),

  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),

  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'DELETE', ...(body !== undefined && { body: JSON.stringify(body) }) }),

  upload: <T = any>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData, timeoutMs: 60_000 }),
};

export { ApiError };
export default api;
