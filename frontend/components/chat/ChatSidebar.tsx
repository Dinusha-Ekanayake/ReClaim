'use client';

import Image from 'next/image';
import { MessageCircle, Package } from 'lucide-react';
import type { ChatMessageView } from './ChatBubble';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

export interface ChatSummaryView {
  id: string;
  itemId?: string | null;
  item?: { id: string; title: string } | null;
  updatedAt: string;
  participants: Array<{
    userId: string;
    user: { id: string; name: string; avatarUrl?: string | null };
  }>;
  messages?: ChatMessageView[];
  _count?: { messages: number };
}

interface ChatSidebarProps {
  chats: ChatSummaryView[];
  activeChatId?: string;
  currentUserId?: string;
  loading?: boolean;
  isCapped?: boolean;
  onSelect: (chatId: string) => void;
}

export function ChatSidebar({ chats, activeChatId, currentUserId, loading = false, isCapped = false, onSelect }: ChatSidebarProps) {
  const getOther = (chat: ChatSummaryView) =>
    chat.participants?.find((participant) => participant.userId !== currentUserId)?.user;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h1 className="font-display text-lg font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Keep recovery conversations in one place</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="space-y-2" aria-label="Loading conversations">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-3">
                <div className="size-11 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-2.5 w-4/5 rounded bg-gray-100 dark:bg-gray-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <MessageCircle className="size-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No conversations yet</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">Open an item and message its poster to get started.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => {
              const other = getOther(chat);
              const lastMessage = chat.messages?.[0];
              const unread = chat._count?.messages || 0;
              const isActive = chat.id === activeChatId;
              const sentByMe = lastMessage?.senderId === currentUserId;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group w-full rounded-xl px-3 py-3 text-left transition-all duration-200 hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-gray-800/70',
                    isActive && 'bg-primary-50 shadow-sm ring-1 ring-primary-100 hover:bg-primary-50 dark:bg-primary-500/10 dark:ring-primary-500/20 dark:hover:bg-primary-500/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {other?.avatarUrl ? (
                        <Image
                          src={other.avatarUrl}
                          alt={other.name || ''}
                          width={44}
                          height={44}
                          className="size-11 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
                        />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                          {getAvatarFallback(other?.name || 'U')}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('truncate text-sm text-gray-800 dark:text-gray-200', unread > 0 ? 'font-bold' : 'font-semibold')}>
                          {other?.name || 'User'}
                        </p>
                        {lastMessage && (
                          <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                            {timeAgo(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={cn('mt-0.5 truncate text-xs', unread > 0 ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500')}>
                        {lastMessage ? `${sentByMe ? 'You: ' : ''}${lastMessage.content}` : 'No messages yet'}
                      </p>
                      {chat.item?.title && (
                        <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-gray-400 dark:text-gray-500">
                          <Package className="size-3 flex-shrink-0" /> {chat.item.title}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {isCapped && (
              <p role="note" className="px-3 py-3 text-center text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">Showing the 100 most recently active conversations.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
