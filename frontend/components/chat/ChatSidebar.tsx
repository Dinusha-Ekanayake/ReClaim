'use client';
import Image from 'next/image';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

interface ChatSidebarProps {
  chats: any[];
  activeChatId?: string;
  currentUserId?: string;
  onSelect: (chatId: string) => void;
}

export function ChatSidebar({ chats, activeChatId, currentUserId, onSelect }: ChatSidebarProps) {
  const getOther = (chat: any) =>
    chat.participants?.find((p: any) => p.userId !== currentUserId)?.user;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="font-display font-bold text-gray-900">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
            <p className="text-xs text-gray-300 mt-1">Message a poster to start chatting</p>
          </div>
        ) : (
          chats.map(chat => {
            const other = getOther(chat);
            const lastMsg = chat.messages?.[0];
            const unread = chat._count?.messages || 0;
            const isActive = chat.id === activeChatId;

            return (
              <button key={chat.id} onClick={() => onSelect(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50',
                  isActive && 'bg-blue-50 hover:bg-blue-50'
                )}>
                <div className="relative flex-shrink-0">
                  {other?.avatarUrl ? (
                    <Image src={other.avatarUrl} alt={other.name || ''} width={40} height={40}
                      className="rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                      {getAvatarFallback(other?.name || 'U')}
                    </div>
                  )}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className={cn('text-sm truncate', unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>
                      {other?.name || 'User'}
                    </p>
                    {lastMsg && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeAgo(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                    {lastMsg?.content || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
