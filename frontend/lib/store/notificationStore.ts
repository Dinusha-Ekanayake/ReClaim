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
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNew: (n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/notifications', { limit: 30 });
      set({ notifications: data.notifications, unreadCount: data.unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.patch('/notifications/read-all');
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  addNew: (n) => {
    const notification: Notification = {
      ...n, id: crypto.randomUUID(), isRead: false, createdAt: new Date().toISOString(),
    };
    set(s => ({ notifications: [notification, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },
}));
