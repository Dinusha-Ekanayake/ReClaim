const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
let accessToken: string | null = null;

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function getAccessToken(): Promise<string | null> {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      localStorage.removeItem('hasSession');
      setAccessToken(null);
      return null;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    localStorage.setItem('hasSession', 'true');
    return data.accessToken;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function restoreAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined' || localStorage.getItem('hasSession') !== 'true') return false;
  if (accessToken) return true;
  return !!(await refreshOnce());
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, params, ...fetchOptions } = options;

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
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });

  // Token expired — try refresh
  if (response.status === 401 && !skipAuth) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      const newToken = await refreshOnce();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
        if (!retryResponse.ok) {
          const errData = await retryResponse.json().catch(() => ({}));
          throw new ApiError(errData.error || 'Request failed', retryResponse.status, errData);
        }
        return retryResponse.json();
      }
    }
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login?expired=true';
    }
    throw new ApiError('Authentication required', 401);
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

  delete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T = any>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),
};

export { ApiError };
export default api;
