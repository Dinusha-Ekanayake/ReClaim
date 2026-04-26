'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send, ArrowLeft, Circle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useIsLoggedIn();
  const { socket } = useSocket();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn]);

  // Load all chats for sidebar
  useEffect(() => {
    api.get('/chats').then(setChats).catch(() => {});
  }, []);

  // Load specific chat
  useEffect(() => {
    if (!id || id === 'index') return;
    setLoading(true);
    api.get(`/chats/${id}`).then(data => {
      setChat(data.chat);
      setMessages(data.messages);
    }).finally(() => setLoading(false));
  }, [id]);

  // Socket events
  useEffect(() => {
    if (!socket || !id || id === 'index') return;
    socket.emit('chat:join', id);

    socket.on('chat:message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('chat:typing', (data: any) => {
      if (data.userId !== user?.id) {
        setIsTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    return () => {
      socket.emit('chat:leave', id);
      socket.off('chat:message');
      socket.off('chat:typing');
    };
  }, [socket, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !socket) return;
    socket.emit('chat:send', { chatId: id, content: text.trim() });
    setText('');
  };

  const handleTyping = () => {
    socket?.emit('chat:typing', { chatId: id });
  };

  const getOtherParticipant = (chat: any) => {
    return chat.participants?.find((p: any) => p.userId !== user?.id)?.user;
  };

  if (!isLoggedIn) return null;

  const otherUser = chat ? getOtherParticipant(chat) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 h-[calc(100vh-120px)]">
          {/* Sidebar - Chat List */}
          <div className={cn('w-80 flex-shrink-0 card flex flex-col', id !== 'index' && 'hidden lg:flex')}>
            <div className="p-4 border-b">
              <h2 className="font-display font-bold text-gray-900">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm text-gray-500">No conversations yet</p>
                </div>
              ) : (
                chats.map(c => {
                  const other = getOtherParticipant(c);
                  const lastMsg = c.messages?.[0];
                  const unread = c._count?.messages || 0;
                  return (
                    <button key={c.id} onClick={() => router.push(`/chat/${c.id}`)}
                      className={cn('w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50',
                        id === c.id && 'bg-blue-50')}>
                      <div className="relative flex-shrink-0">
                        {other?.avatarUrl ? (
                          <Image src={other.avatarUrl} alt={other.name} width={40} height={40} className="rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                            {getAvatarFallback(other?.name || 'U')}
                          </div>
                        )}
                        {unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                            {unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{other?.name || 'User'}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {lastMsg ? lastMsg.content : 'No messages yet'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">
                        {lastMsg ? timeAgo(lastMsg.createdAt) : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          {!id || id === 'index' ? (
            <div className="hidden lg:flex flex-1 card items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-gray-500 font-medium">Select a conversation</p>
                <p className="text-sm text-gray-400">Start chatting by messaging an item poster</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 card flex flex-col min-w-0">
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <button onClick={() => router.push('/chat')} className="lg:hidden p-1 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft size={20} />
                </button>
                {otherUser?.avatarUrl ? (
                  <Image src={otherUser.avatarUrl} alt={otherUser.name} width={36} height={36} className="rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                    {getAvatarFallback(otherUser?.name || 'U')}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{otherUser?.name}</p>
                  {isTyping && <p className="text-xs text-secondary-500">typing…</p>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-4xl mb-3">👋</div>
                    <p className="text-sm text-gray-500">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;
                    return (
                      <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-auto">
                            {getAvatarFallback(msg.sender?.name || 'U')}
                          </div>
                        )}
                        <div className={cn('max-w-xs lg:max-w-md', isMe ? 'items-end' : 'items-start')}>
                          <div className={cn('px-4 py-2.5 rounded-2xl text-sm',
                            isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
                            {msg.content}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 px-1">{timeAgo(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <input type="text" value={text} onChange={e => { setText(e.target.value); handleTyping(); }}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message…"
                    className="input-field flex-1" />
                  <button onClick={handleSend} disabled={!text.trim()}
                    className="btn-primary px-4 disabled:opacity-40">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
