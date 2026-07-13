import Image from 'next/image';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCheck, Clock3, RotateCcw } from 'lucide-react';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

export interface ChatMessageView {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  sender?: { id: string; name: string; avatarUrl?: string | null };
  senderId: string;
  deliveryStatus?: 'sending' | 'failed';
  deliveryError?: string;
}

interface ChatBubbleProps {
  message: ChatMessageView;
  isMe: boolean;
  showAvatar?: boolean;
  canRetry?: boolean;
  onRetry?: (message: ChatMessageView) => void;
}

export function ChatBubble({ message, isMe, showAvatar = true, canRetry = true, onRetry }: ChatBubbleProps) {
  const senderName = message.sender?.name || 'User';
  const senderAvatar = message.sender?.avatarUrl;
  const failed = message.deliveryStatus === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
    >
      {showAvatar && !isMe && (
        <div className="mb-1 flex-shrink-0">
          {senderAvatar ? (
            <Image
              src={senderAvatar}
              alt={senderName}
              width={28}
              height={28}
              className="size-7 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
              {getAvatarFallback(senderName)}
            </div>
          )}
        </div>
      )}

      <div className={cn('flex max-w-[82%] flex-col sm:max-w-md', isMe ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors',
            isMe
              ? 'rounded-br-md bg-primary-600 text-white'
              : 'rounded-bl-md bg-white text-gray-900 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700',
            message.deliveryStatus === 'sending' && 'opacity-70',
            failed && 'bg-red-50 text-red-900 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900',
          )}
        >
          {message.content}
        </div>

        <div className="mt-1 flex min-h-4 items-center gap-1.5 px-1 text-[11px] text-gray-400 dark:text-gray-500">
          <span>{timeAgo(message.createdAt)}</span>
          {isMe && message.deliveryStatus === 'sending' && (
            <span className="inline-flex items-center gap-1" aria-label="Sending">
              <Clock3 className="size-3" /> Sending
            </span>
          )}
          {isMe && failed && (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" role="status">
              <AlertCircle className="size-3" /> {message.deliveryError || 'Not sent'}
            </span>
          )}
          {isMe && !message.deliveryStatus && message.isRead && (
            <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400" aria-label="Read">
              <CheckCheck className="size-3" /> Read
            </span>
          )}
          {isMe && failed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              disabled={!canRetry}
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-primary-300 dark:hover:bg-primary-500/10"
            >
              <RotateCcw className="size-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
