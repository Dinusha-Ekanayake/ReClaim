'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  PackageOpen,
  RefreshCw,
  Send,
  WifiOff,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { ChatBubble, type ChatMessageView } from '@/components/chat/ChatBubble';
import { ChatSidebar, type ChatSummaryView } from '@/components/chat/ChatSidebar';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useSocket } from '@/components/providers/SocketProvider';
import api, { ApiError } from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { cn, getAvatarFallback } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface ChatItemView {
  id: string;
  title: string;
  type: 'LOST' | 'FOUND';
  status: string;
  category: string;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
}

interface ChatDetailView extends Omit<ChatSummaryView, 'item'> {
  item?: ChatItemView | null;
}

interface PaginationMeta {
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor: string | null;
  total?: number;
  page?: number;
  pages?: number;
}

interface ChatResponse {
  chat: ChatDetailView;
  messages: ChatMessageView[];
  pagination: PaginationMeta;
}

type SendAcknowledgement =
  | { ok: true; message: ChatMessageView }
  | { ok: false; error: { code: string; message: string } };

type ScrollPlan = 'bottom' | { previousHeight: number; previousTop: number } | null;

export default function ChatPage() {
  const params = useParams<{ id?: string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useIsLoggedIn();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const { socket, isConnected, isRecovering, status, error: socketError, reconnect } = useSocket();

  const [chat, setChat] = useState<ChatDetailView | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [chats, setChats] = useState<ChatSummaryView[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const activeChatIdRef = useRef(id);
  const chatsRef = useRef(chats);
  const isNearBottomRef = useRef(true);
  const scrollPlanRef = useRef<ScrollPlan>(null);
  const conversationRequestRef = useRef(0);
  const chatsRequestRef = useRef(0);
  const seenLiveMessageIds = useRef(new Set<string>());
  const pendingDrafts = useRef(new Map<string, { chatId: string; content: string }>());
  const conversationDrafts = useRef(new Map<string, string>());
  const sendInFlightRef = useRef(false);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    activeChatIdRef.current = id;
    setText(id ? conversationDrafts.current.get(id) || '' : '');
  }, [id]);

  useEffect(() => {
    const input = messageInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [text]);

  useEffect(() => {
    if (isInitialized && !isLoggedIn) router.replace('/auth/login');
  }, [isInitialized, isLoggedIn, router]);

  const loadChats = useCallback(async (silent = false) => {
    if (!isLoggedIn) return;
    const requestId = ++chatsRequestRef.current;
    if (!silent) setLoadingChats(true);
    try {
      const data = await api.get<ChatSummaryView[]>('/chats');
      if (requestId !== chatsRequestRef.current) return;
      const activeId = activeChatIdRef.current;
      setChats(data.map((conversation) => (
        conversation.id === activeId
          ? { ...conversation, _count: { messages: 0 } }
          : conversation
      )));
    } catch (loadError) {
      if (!silent) {
        toast({
          title: 'Could not load conversations',
          description: loadError instanceof Error ? loadError.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      if (requestId === chatsRequestRef.current) setLoadingChats(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const loadConversation = useCallback(async () => {
    if (!isLoggedIn || !id) return;
    const requestId = ++conversationRequestRef.current;
    setLoadingConversation(true);
    setConversationError(null);
    setNewMessageCount(0);
    isNearBottomRef.current = true;

    try {
      const data = await api.get<ChatResponse>(`/chats/${id}`, { limit: 30 });
      if (requestId !== conversationRequestRef.current) return;
      data.messages.forEach((message) => {
        seenLiveMessageIds.current.add(message.id);
        const pending = pendingDrafts.current.get(message.id);
        if (!pending) return;
        pendingDrafts.current.delete(message.id);
        const savedDraft = conversationDrafts.current.get(pending.chatId);
        if (savedDraft?.trim() === pending.content) conversationDrafts.current.delete(pending.chatId);
        if (pending.chatId === id) {
          setText((current) => (current.trim() === pending.content ? '' : current));
        }
      });
      setChat(data.chat);
      setMessages((current) => {
        const sameConversation = current.filter((message) => message.chatId === id);
        const merged = new Map(sameConversation.map((message) => [message.id, message]));
        data.messages.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((left, right) => (
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
        ));
      });
      setPagination(data.pagination);
      setChats((current) => current.map((conversation) => (
        conversation.id === id
          ? { ...conversation, item: data.chat.item, _count: { messages: 0 } }
          : conversation
      )));
      scrollPlanRef.current = 'bottom';
    } catch (loadError) {
      if (requestId !== conversationRequestRef.current) return;
      const message = loadError instanceof Error ? loadError.message : 'Could not load this conversation.';
      setConversationError(message);
      if (loadError instanceof ApiError && loadError.status === 404) {
        toast({ title: 'Conversation unavailable', description: message, variant: 'destructive' });
        router.replace('/chat');
      }
    } finally {
      if (requestId === conversationRequestRef.current) setLoadingConversation(false);
    }
  }, [id, isLoggedIn, router]);

  useEffect(() => {
    if (!id) {
      conversationRequestRef.current += 1;
      setChat(null);
      setMessages([]);
      setPagination(null);
      setConversationError(null);
      setLoadingConversation(false);
      return;
    }
    void loadConversation();
  }, [id, loadConversation]);

  const updateChatSummary = useCallback((message: ChatMessageView, markRead = false) => {
    setChats((current) => {
      const index = current.findIndex((conversation) => conversation.id === message.chatId);
      if (index < 0) return current;

      const existing = current[index];
      const alreadyLatest = existing.messages?.[0]?.id === message.id;
      const sentByMe = message.senderId === user?.id;
      const currentUnread = existing._count?.messages || 0;
      const unread = sentByMe
        ? currentUnread
        : markRead
          ? 0
          : currentUnread + (alreadyLatest ? 0 : 1);
      const updated: ChatSummaryView = {
        ...existing,
        updatedAt: message.createdAt,
        messages: [message],
        _count: { messages: unread },
      };

      return [updated, ...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, [user?.id]);

  const rememberLiveMessage = (messageId: string) => {
    const seen = seenLiveMessageIds.current;
    seen.add(messageId);
    if (seen.size > 500) {
      const oldest = seen.values().next().value;
      if (oldest) seen.delete(oldest);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const processMessage = (incoming: ChatMessageView) => {
      if (!incoming?.id || !incoming.chatId || seenLiveMessageIds.current.has(incoming.id)) return;
      rememberLiveMessage(incoming.id);

      const active = incoming.chatId === activeChatIdRef.current;
      const visibleAtBottom = active
        && isNearBottomRef.current
        && typeof document !== 'undefined'
        && document.visibilityState === 'visible';
      updateChatSummary(incoming, visibleAtBottom);

      if (!chatsRef.current.some((conversation) => conversation.id === incoming.chatId)) {
        void loadChats(true);
      }

      if (active) {
        setMessages((current) => {
          const index = current.findIndex((message) => message.id === incoming.id);
          if (index < 0) return [...current, incoming];
          const next = [...current];
          next[index] = incoming;
          return next;
        });

        if (incoming.senderId === user?.id || visibleAtBottom) {
          scrollPlanRef.current = 'bottom';
          if (incoming.senderId !== user?.id) socket.emit('chat:read', { chatId: incoming.chatId });
        } else {
          setNewMessageCount((count) => count + 1);
        }
      }

      const pending = pendingDrafts.current.get(incoming.id);
      if (pending) {
        pendingDrafts.current.delete(incoming.id);
        const savedDraft = conversationDrafts.current.get(pending.chatId);
        if (savedDraft?.trim() === pending.content) conversationDrafts.current.delete(pending.chatId);
        if (activeChatIdRef.current === pending.chatId) {
          setText((current) => (current.trim() === pending.content ? '' : current));
        }
      }
    };

    const handleChatUpdated = (payload: { chatId?: string; message?: ChatMessageView }) => {
      if (payload?.message) processMessage(payload.message);
    };
    const handleTyping = (data: { chatId?: string; userId?: string; name?: string }) => {
      if (data.chatId !== activeChatIdRef.current || data.userId === user?.id) return;
      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
    };
    const handleRead = (data: { chatId?: string; userId?: string }) => {
      if (!data.chatId || !data.userId) return;
      if (data.userId === user?.id) {
        setChats((current) => current.map((conversation) => (
          conversation.id === data.chatId
            ? { ...conversation, _count: { messages: 0 } }
            : conversation
        )));
      } else if (data.chatId === activeChatIdRef.current) {
        setMessages((current) => current.map((message) => (
          message.senderId === user?.id ? { ...message, isRead: true } : message
        )));
      }
    };
    const handleLegacyError = (data: { message?: string }) => {
      toast({
        title: 'Live chat error',
        description: data?.message || 'Please try again.',
        variant: 'destructive',
      });
    };

    socket.on('chat:message', processMessage);
    socket.on('chat:updated', handleChatUpdated);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:error', handleLegacyError);

    return () => {
      socket.off('chat:message', processMessage);
      socket.off('chat:updated', handleChatUpdated);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:error', handleLegacyError);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [socket, user?.id, loadChats, updateChatSummary]);

  useEffect(() => {
    if (!socket || !id || !isConnected) return;
    socket.emit('chat:join', id);
    socket.emit('chat:read', { chatId: id });
    setChats((current) => current.map((conversation) => (
      conversation.id === id ? { ...conversation, _count: { messages: 0 } } : conversation
    )));

    return () => {
      if (socket.connected) socket.emit('chat:leave', id);
    };
  }, [socket, id, isConnected]);

  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    const plan = scrollPlanRef.current;
    if (!viewport || !plan) return;

    if (plan === 'bottom') {
      viewport.scrollTop = viewport.scrollHeight;
      isNearBottomRef.current = true;
    } else {
      viewport.scrollTop = viewport.scrollHeight - plan.previousHeight + plan.previousTop;
    }
    scrollPlanRef.current = null;
  }, [messages]);

  const loadOlderMessages = async () => {
    if (!id || !pagination?.hasNext || !pagination.nextCursor || loadingOlder) return;
    const viewport = messagesViewportRef.current;
    setLoadingOlder(true);
    try {
      const data = await api.get<ChatResponse>(`/chats/${id}`, {
        cursor: pagination.nextCursor,
        limit: pagination.limit || 30,
      });
      if (activeChatIdRef.current !== id) return;
      if (viewport) {
        scrollPlanRef.current = {
          previousHeight: viewport.scrollHeight,
          previousTop: viewport.scrollTop,
        };
      }
      setMessages((current) => {
        const existing = new Set(current.map((message) => message.id));
        return [...data.messages.filter((message) => !existing.has(message.id)), ...current];
      });
      setPagination(data.pagination);
    } catch (loadError) {
      toast({
        title: 'Could not load earlier messages',
        description: loadError instanceof Error ? loadError.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const markDeliveryFailed = useCallback((messageId: string, deliveryError: string) => {
    sendInFlightRef.current = false;
    setMessages((current) => current.map((message) => (
      message.id === messageId && message.deliveryStatus === 'sending'
        ? { ...message, deliveryStatus: 'failed', deliveryError }
        : message
    )));
    setChats((current) => current.map((conversation) => (
      conversation.messages?.[0]?.id === messageId
        && conversation.messages[0].deliveryStatus === 'sending'
        ? {
            ...conversation,
            messages: [{ ...conversation.messages[0], deliveryStatus: 'failed', deliveryError }],
          }
        : conversation
    )));
  }, []);

  const confirmDelivery = useCallback((persisted: ChatMessageView) => {
    sendInFlightRef.current = false;
    rememberLiveMessage(persisted.id);
    if (activeChatIdRef.current === persisted.chatId) {
      setMessages((current) => {
        const index = current.findIndex((message) => message.id === persisted.id);
        if (index < 0) return [...current, persisted];
        const next = [...current];
        next[index] = persisted;
        return next;
      });
    }
    updateChatSummary(persisted, activeChatIdRef.current === persisted.chatId);
    const pending = pendingDrafts.current.get(persisted.id);
    if (pending) {
      pendingDrafts.current.delete(persisted.id);
      const savedDraft = conversationDrafts.current.get(pending.chatId);
      if (savedDraft?.trim() === pending.content) conversationDrafts.current.delete(pending.chatId);
      if (activeChatIdRef.current === pending.chatId) {
        setText((current) => (current.trim() === pending.content ? '' : current));
      }
    }
  }, [updateChatSummary]);

  const deliverMessage = useCallback((messageId: string, chatId: string, content: string) => {
    if (!socket || !isConnected) {
      markDeliveryFailed(messageId, 'Waiting for connection');
      return;
    }

    socket.timeout(12_000).emit(
      'chat:send',
      { chatId, content, clientId: messageId },
      (timeoutError: Error | null, acknowledgement?: SendAcknowledgement) => {
        if (timeoutError || !acknowledgement || !acknowledgement.ok) {
          const message = timeoutError
            ? 'Delivery timed out'
            : acknowledgement && !acknowledgement.ok
              ? acknowledgement.error.message
              : 'Delivery was not confirmed';
          markDeliveryFailed(messageId, message);
          return;
        }
        confirmDelivery(acknowledgement.message);
      },
    );
  }, [socket, isConnected, markDeliveryFailed, confirmDelivery]);

  const retryMessage = useCallback((message: ChatMessageView) => {
    if (!isConnected || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    pendingDrafts.current.set(message.id, { chatId: message.chatId, content: message.content });
    setMessages((current) => current.map((item) => (
      item.id === message.id
        ? { ...item, deliveryStatus: 'sending', deliveryError: undefined }
        : item
    )));
    setChats((current) => current.map((conversation) => (
      conversation.messages?.[0]?.id === message.id
        ? {
            ...conversation,
            messages: [{ ...conversation.messages[0], deliveryStatus: 'sending', deliveryError: undefined }],
          }
        : conversation
    )));
    deliverMessage(message.id, message.chatId, message.content);
  }, [deliverMessage, isConnected]);

  const handleSend = () => {
    const content = text.trim();
    if (!content || !id || !user || !isConnected || !chat || sendInFlightRef.current) return;

    const retryable = messages.find((message) => (
      message.deliveryStatus === 'failed'
      && message.chatId === id
      && message.content === content
    ));
    if (retryable) {
      retryMessage(retryable);
      return;
    }

    sendInFlightRef.current = true;
    const clientId = crypto.randomUUID();
    const optimisticMessage: ChatMessageView = {
      id: clientId,
      chatId: id,
      senderId: user.id,
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
      deliveryStatus: 'sending',
    };

    pendingDrafts.current.set(clientId, { chatId: id, content });
    scrollPlanRef.current = 'bottom';
    setMessages((current) => [...current, optimisticMessage]);
    updateChatSummary(optimisticMessage, true);
    deliverMessage(clientId, id, content);
  };

  const handleTyping = () => {
    if (!socket || !isConnected || !id) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 800) return;
    lastTypingSent.current = now;
    socket.emit('chat:typing', { chatId: id });
  };

  const handleMessagesScroll = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const nearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && newMessageCount > 0) {
      setNewMessageCount(0);
      if (id && socket && isConnected) socket.emit('chat:read', { chatId: id });
      setChats((current) => current.map((conversation) => (
        conversation.id === id ? { ...conversation, _count: { messages: 0 } } : conversation
      )));
    }
  };

  const jumpToLatest = () => {
    const viewport = messagesViewportRef.current;
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    isNearBottomRef.current = true;
    setNewMessageCount(0);
    if (id && socket && isConnected) socket.emit('chat:read', { chatId: id });
    setChats((current) => current.map((conversation) => (
      conversation.id === id ? { ...conversation, _count: { messages: 0 } } : conversation
    )));
  };

  const resizeComposer = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
  };

  const otherUser = useMemo(() => (
    chat?.participants.find((participant) => participant.userId !== user?.id)?.user
  ), [chat, user?.id]);
  const hasSendingMessage = messages.some((message) => message.deliveryStatus === 'sending');
  const connectionLabel = isConnected
    ? 'Live'
    : isRecovering
      ? 'Restoring live connection…'
      : status === 'connecting'
        ? 'Connecting…'
        : 'Offline';

  if (!isInitialized || !isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-500 dark:bg-gray-950">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-0 outline-none sm:px-6 sm:py-6 lg:px-8">
        <div className="flex h-[calc(100dvh-80px)] gap-0 sm:h-[calc(100dvh-128px)] sm:gap-6">
          <aside className={cn(
            'card w-full flex-shrink-0 overflow-hidden rounded-none sm:rounded-2xl lg:w-80',
            id && 'hidden lg:block',
          )}>
            <ChatSidebar
              chats={chats}
              activeChatId={id}
              currentUserId={user?.id}
              loading={loadingChats}
              isCapped={chats.length >= 100}
              onSelect={(chatId) => router.push(`/chat/${chatId}`)}
            />
          </aside>

          {!id ? (
            <section className="card hidden flex-1 items-center justify-center overflow-hidden rounded-2xl lg:flex">
              <div className="max-w-sm px-8 text-center">
                <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100 dark:bg-primary-500/10 dark:text-primary-400 dark:ring-primary-500/20">
                  <MessageCircle className="size-8" />
                </div>
                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Your recovery conversations</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Choose a conversation to coordinate a safe return or ask the poster for more details.</p>
              </div>
            </section>
          ) : (
            <section className="card flex min-w-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-2xl">
              <header className="flex min-h-[69px] items-center gap-3 border-b border-gray-100 px-3 py-3 sm:px-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => router.push('/chat')}
                  className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 active:scale-95 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-5" />
                </button>

                {otherUser?.avatarUrl ? (
                  <Image src={otherUser.avatarUrl} alt={otherUser.name} width={40} height={40} className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                    {getAvatarFallback(otherUser?.name || 'U')}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{otherUser?.name || 'Conversation'}</p>
                  <p className={cn(
                    'flex items-center gap-1.5 text-xs',
                    isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500',
                  )}>
                    <span className={cn('size-1.5 rounded-full', isConnected ? 'bg-emerald-500' : isRecovering || status === 'connecting' ? 'animate-pulse bg-amber-500' : 'bg-gray-400')} />
                    {isTyping ? `${otherUser?.name || 'They'} is typing…` : connectionLabel}
                  </p>
                </div>

                {chat?.item && (
                  <Link
                    href={`/items/${chat.item.id}`}
                    className="hidden max-w-[45%] items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 pr-2 text-left transition-all hover:border-primary-200 hover:bg-primary-50 active:scale-[0.99] sm:flex dark:border-gray-700 dark:bg-gray-800/70 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10"
                  >
                    {chat.item.images[0]?.url ? (
                      <Image src={chat.item.images[0].url} alt="" width={36} height={36} className="size-9 rounded-lg object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-gray-400 dark:bg-gray-900">
                        <PackageOpen className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">{chat.item.type === 'LOST' ? 'Lost item' : 'Found item'}</span>
                      <span className="block truncate text-xs font-semibold text-gray-700 dark:text-gray-200">{chat.item.title}</span>
                    </span>
                    <ChevronRight className="size-4 flex-shrink-0 text-gray-400" />
                  </Link>
                )}
              </header>

              {chat?.item && (
                <Link
                  href={`/items/${chat.item.id}`}
                  className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-xs text-gray-600 transition-colors hover:bg-primary-50 sm:hidden dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-primary-500/10"
                >
                  <PackageOpen className="size-4 text-primary-600 dark:text-primary-400" />
                  <span className="min-w-0 flex-1 truncate">About <strong>{chat.item.title}</strong></span>
                  <ChevronRight className="size-4" />
                </Link>
              )}

              {!isConnected && (
                <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100" role="status">
                  {isRecovering || status === 'connecting' ? <LoaderCircle className="size-4 animate-spin" /> : <WifiOff className="size-4" />}
                  <span className="min-w-0 flex-1">{socketError || connectionLabel}. You can keep writing while delivery is paused.</span>
                  {!isRecovering && status !== 'connecting' && (
                    <button type="button" onClick={reconnect} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50">
                      <RefreshCw className="size-3.5" /> Reconnect
                    </button>
                  )}
                </div>
              )}

              <div className="relative min-h-0 flex-1 bg-gray-50/50 dark:bg-gray-950/50">
                <div
                  ref={messagesViewportRef}
                  onScroll={handleMessagesScroll}
                  className="h-full overflow-y-auto px-3 py-4 [scrollbar-gutter:stable] sm:px-5"
                  aria-live="polite"
                >
                  {loadingConversation ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                      <LoaderCircle className="size-4 animate-spin" /> Loading conversation…
                    </div>
                  ) : conversationError ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <WifiOff className="mb-3 size-8 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Could not open this conversation</p>
                      <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">{conversationError}</p>
                      <button type="button" onClick={() => void loadConversation()} className="btn-secondary mt-4 inline-flex items-center gap-2 px-3 py-2 text-xs">
                        <RefreshCw className="size-3.5" /> Try again
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        <MessageCircle className="size-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Start the conversation</p>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-400 dark:text-gray-500">Be clear, respectful, and avoid sharing sensitive information until ownership is verified.</p>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-3xl space-y-3">
                      {pagination?.hasNext && (
                        <div className="flex justify-center pb-2">
                          <button
                            type="button"
                            onClick={() => void loadOlderMessages()}
                            disabled={loadingOlder}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:border-primary-200 hover:text-primary-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          >
                            {loadingOlder && <LoaderCircle className="size-3.5 animate-spin" />}
                            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                          </button>
                        </div>
                      )}

                      {messages.map((message, index) => {
                        const isMe = message.senderId === user?.id || message.sender?.id === user?.id;
                        const previous = messages[index - 1];
                        const showAvatar = !previous || previous.senderId !== message.senderId;
                        return (
                          <ChatBubble
                            key={message.id}
                            message={message}
                            isMe={isMe}
                            showAvatar={showAvatar}
                            canRetry={isConnected}
                            onRetry={retryMessage}
                          />
                        );
                      })}
                      {isTyping && <TypingIndicator name={otherUser?.name} />}
                    </div>
                  )}
                </div>

                {newMessageCount > 0 && (
                  <button
                    type="button"
                    onClick={jumpToLatest}
                    className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-gray-900"
                  >
                    <ArrowDown className="size-3.5" /> {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
                  </button>
                )}
              </div>

              <footer className="border-t border-gray-100 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-primary-500 dark:focus-within:bg-gray-900">
                    <textarea
                      ref={messageInputRef}
                      value={text}
                      rows={1}
                      maxLength={2000}
                      aria-label="Message"
                      aria-describedby="chat-connection-status"
                      placeholder={isConnected ? 'Write a message…' : 'Write now — send when reconnected'}
                      onChange={(event) => {
                        setText(event.target.value);
                        if (id) conversationDrafts.current.set(id, event.target.value);
                        resizeComposer(event.target);
                        handleTyping();
                      }}
                      onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                      className="block max-h-32 w-full resize-none bg-transparent text-sm leading-5 text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span id="chat-connection-status" className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                        {hasSendingMessage ? 'Waiting for delivery confirmation…' : isConnected ? 'Enter to send · Shift + Enter for a new line' : 'Sending is paused while offline'}
                      </span>
                      {text.length > 1800 && <span className="text-[10px] text-amber-600 dark:text-amber-400">{text.length}/2000</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim() || !isConnected || hasSendingMessage || !chat}
                    aria-label="Send message"
                    className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                  >
                    {hasSendingMessage ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </div>
              </footer>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
