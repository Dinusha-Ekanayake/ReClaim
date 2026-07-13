import { create } from 'zustand';
import api, { ApiError, restoreAccessToken, setAccessToken } from '@/lib/api';
import { removeLocalStorage, writeLocalStorage } from '@/lib/browserStorage';
import { useNotificationStore } from '@/lib/store/notificationStore';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
  showPhone?: boolean;
  bio?: string;
  location?: string;
  isVerified?: boolean;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{
    message: string;
    emailSent: boolean;
    devVerificationUrl?: string;
  }>;
  verifyEmail: (token: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    let restored = false;
    try {
      restored = await restoreAccessToken();
    } catch {
      // A transient network, rate-limit, or backend outage must not destroy a
      // valid browser session. A later online event/reload can restore it.
      set({ isInitialized: true });
      return;
    }
    if (!restored) {
      useNotificationStore.getState().reset();
      set({ isInitialized: true });
      return;
    }
    try {
      const user = await api.get('/auth/me');
      useNotificationStore.getState().reset();
      set({ user, isInitialized: true });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        removeLocalStorage('hasSession');
        setAccessToken(null);
        useNotificationStore.getState().reset();
        set({ user: null, isInitialized: true });
        return;
      }
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      writeLocalStorage('hasSession', 'true');
      useNotificationStore.getState().reset();
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/register', { name, email, password });
      set({ isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true });
    try {
      const data = await api.post<{ message: string }>('/auth/verify-email', { token });
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    let backendError: unknown = null;
    try { await api.post('/auth/logout'); } catch (error) { backendError = error; }
    try {
      const response = await fetch('/session/logout', {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error('Local session could not be cleared');
    } catch (localError) {
      throw backendError || localError;
    }
    removeLocalStorage('hasSession');
    setAccessToken(null);
    useNotificationStore.getState().reset();
    set({ user: null });
  },

  updateUser: (data) => {
    set(state => ({ user: state.user ? { ...state.user, ...data } : null }));
  },

  clearSession: () => {
    removeLocalStorage('hasSession');
    setAccessToken(null);
    useNotificationStore.getState().reset();
    set({ user: null });
  },
}));

// Helper hooks
export const useUser = () => useAuthStore(s => s.user);
export const useIsAdmin = () => {
  const role = useAuthStore(s => s.user?.role);
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
};
export const useIsLoggedIn = () => !!useAuthStore(s => s.user);
