'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { cn, timeAgo } from '@/lib/utils';

const TYPE_ICONS: Record<string, string> = {
  MATCH_FOUND: '🎯',
  NEW_MESSAGE: '💬',
  CLAIM_SUBMITTED: '📋',
  CLAIM_APPROVED: '✅',
  CLAIM_REJECTED: '❌',
  ITEM_RETURNED: '🎉',
  COMMENT_ADDED: '💬',
  SYSTEM: '📢',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, fetch, markRead, markAllRead } = useNotificationStore();

  useEffect(() => { fetch(); }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Notifications</h1>
          <p className="text-gray-500 text-sm">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-primary-600 hover:underline font-medium">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-50">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-300 mt-1">We'll notify you when something happens</p>
          </div>
        ) : notifications.map(n => (
          <button key={n.id}
            onClick={() => { markRead(n.id); if (n.link) router.push(n.link); }}
            className={cn('w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50 transition-colors',
              !n.isRead && 'bg-blue-50/40')}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg',
              !n.isRead ? 'bg-primary-100' : 'bg-gray-100')}>
              {TYPE_ICONS[n.type] || '📢'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-sm font-semibold', !n.isRead ? 'text-gray-900' : 'text-gray-700')}>
                  {n.title}
                </p>
                {!n.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
