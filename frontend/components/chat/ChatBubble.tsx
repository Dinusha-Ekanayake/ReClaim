import Image from 'next/image';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

interface ChatBubbleProps {
  message: {
    id: string;
    content: string;
    createdAt: string;
    isRead?: boolean;
    sender?: { id: string; name: string; avatarUrl?: string };
    senderId?: string;
  };
  isMe: boolean;
  showAvatar?: boolean;
}

export function ChatBubble({ message, isMe, showAvatar = true }: ChatBubbleProps) {
  const senderName = message.sender?.name || 'User';
  const senderAvatar = message.sender?.avatarUrl;

  return (
    <div className={cn('flex gap-2 items-end group', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {showAvatar && !isMe && (
        <div className="flex-shrink-0 mb-1">
          {senderAvatar ? (
            <Image src={senderAvatar} alt={senderName} width={28} height={28}
              className="rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
              {getAvatarFallback(senderName)}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={cn('max-w-xs lg:max-w-sm xl:max-w-md flex flex-col', isMe ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
          isMe
            ? 'bg-primary-600 text-white rounded-br-sm bubble-me'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm bubble-other'
        )}>
          {message.content}
        </div>
        <span className={cn(
          'text-[10px] mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400'
        )}>
          {timeAgo(message.createdAt)}
          {isMe && message.isRead && ' · Read'}
        </span>
      </div>
    </div>
  );
}
