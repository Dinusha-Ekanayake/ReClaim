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

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNew: (n: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get('/notifications', { limit: 30 });
      set({ notifications: data.notifications, unreadCount: data.unreadCount, isLoading: false, error: null });
    } catch {
      set({ isLoading: false, error: 'Could not load notifications.' });
    }
  },

  markRead: async (id) => {
    const current = useNotificationStore.getState().notifications.find(n => n.id === id);
    if (!current || current.isRead) return;
    try {
      await api.patch(`/notifications/${id}/read`);
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
        error: null,
      }));
    } catch {
      set({ error: 'Could not update the notification.' });
    }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
        error: null,
      }));
    } catch {
      set({ error: 'Could not mark notifications as read.' });
    }
  },

  addNew: (n) => {
    set(s => ({ notifications: [n, ...s.notifications.filter(item => item.id !== n.id)], unreadCount: s.unreadCount + 1 }));
  },
}));
