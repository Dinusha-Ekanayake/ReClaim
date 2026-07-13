import { create } from 'zustand';
import api, { restoreAccessToken, setAccessToken } from '@/lib/api';

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
  register: (name: string, email: string, password: string) => Promise<void>;
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
    const restored = await restoreAccessToken();
    if (!restored) {
      set({ isInitialized: true });
      return;
    }
    try {
      const user = await api.get('/auth/me');
      set({ user, isInitialized: true });
    } catch {
      localStorage.removeItem('hasSession');
      setAccessToken(null);
      set({ user: null, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      localStorage.setItem('hasSession', 'true');
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
      setAccessToken(data.accessToken);
      localStorage.setItem('hasSession', 'true');
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('hasSession');
    setAccessToken(null);
    set({ user: null });
  },

  updateUser: (data) => {
    set(state => ({ user: state.user ? { ...state.user, ...data } : null }));
  },

  clearSession: () => {
    localStorage.removeItem('hasSession');
    setAccessToken(null);
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
