import { create } from 'zustand';
import api from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNew: (n: Notification) => void;
  reset: () => void;
}

let requestGeneration = 0;
let fetchRequest = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  hasNext: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,

  fetch: async () => {
    const generation = requestGeneration;
    const request = ++fetchRequest;
    set({ isLoading: true, isLoadingMore: false, error: null });
    try {
      const data = await api.get<NotificationResponse>('/notifications', { page: 1, limit: 30 });
      if (generation !== requestGeneration || request !== fetchRequest) return;
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        total: data.total,
        page: data.page,
        hasNext: data.hasNext,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      });
    } catch {
      if (generation !== requestGeneration || request !== fetchRequest) return;
      set({ notifications: [], unreadCount: 0, total: 0, page: 1, hasNext: false, isLoading: false, isLoadingMore: false, error: 'Could not load notifications.' });
    }
  },

  loadMore: async () => {
    const current = useNotificationStore.getState();
    if (!current.hasNext || current.isLoading || current.isLoadingMore) return;
    const generation = requestGeneration;
    const request = ++fetchRequest;
    const nextPage = current.page + 1;
    set({ isLoadingMore: true, error: null });
    try {
      const data = await api.get<NotificationResponse>('/notifications', { page: nextPage, limit: 30 });
      if (generation !== requestGeneration || request !== fetchRequest) return;
      set((state) => {
        const known = new Set(state.notifications.map((notification) => notification.id));
        const appended = data.notifications.filter((notification) => !known.has(notification.id));
        return {
          notifications: [...state.notifications, ...appended],
          unreadCount: data.unreadCount,
          total: data.total,
          page: data.page,
          hasNext: data.hasNext,
          isLoadingMore: false,
          error: null,
        };
      });
    } catch {
      if (generation !== requestGeneration || request !== fetchRequest) return;
      set({ isLoadingMore: false, error: 'Could not load more notifications.' });
    }
  },

  markRead: async (id) => {
    const generation = requestGeneration;
    const current = useNotificationStore.getState().notifications.find(n => n.id === id);
    if (!current || current.isRead) return;
    try {
      await api.patch(`/notifications/${id}/read`);
      if (generation !== requestGeneration) return;
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
        error: null,
      }));
    } catch {
      if (generation !== requestGeneration) return;
      set({ error: 'Could not update the notification.' });
    }
  },

  markAllRead: async () => {
    const generation = requestGeneration;
    try {
      await api.patch('/notifications/read-all');
      if (generation !== requestGeneration) return;
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
        error: null,
      }));
    } catch {
      if (generation !== requestGeneration) return;
      set({ error: 'Could not mark notifications as read.' });
    }
  },

  addNew: (n) => {
    set(s => {
      const existing = s.notifications.find(item => item.id === n.id);
      const unreadDelta = Number(!n.isRead) - Number(existing ? !existing.isRead : false);
      const notifications = [n, ...s.notifications.filter(item => item.id !== n.id)];
      const total = existing ? s.total : s.total + 1;
      return {
        notifications,
        unreadCount: Math.max(0, s.unreadCount + unreadDelta),
        total,
        hasNext: notifications.length < total,
      };
    });
  },

  reset: () => {
    requestGeneration += 1;
    fetchRequest += 1;
    set({ notifications: [], unreadCount: 0, total: 0, page: 1, hasNext: false, isLoading: false, isLoadingMore: false, error: null });
  },
}));
