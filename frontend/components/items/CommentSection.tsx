'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Send, CornerDownRight, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { timeAgo, getAvatarFallback } from '@/lib/utils';

interface CommentSectionProps { itemId: string; }

export default function CommentSection({ itemId }: CommentSectionProps) {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useIsLoggedIn();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/comments/${itemId}`).then(setComments).catch(() => {});
  }, [itemId]);

  const submit = async (parentId?: string) => {
    const content = parentId ? replyText : text;
    if (!content.trim()) return;
    setLoading(true);
    try {
      const comment = await api.post(`/comments/${itemId}`, { content, parentId });
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), comment] } : c
        ));
        setReplyTo(null);
        setReplyText('');
      } else {
        setComments(prev => [comment, ...prev]);
        setText('');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string, parentId?: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, replies: c.replies.filter((r: any) => r.id !== commentId) } : c
        ));
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch {}
  };

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-gray-900 mb-5">
        Comments ({comments.length})
      </h3>

      {/* Input */}
      {isLoggedIn ? (
        <div className="flex gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {getAvatarFallback(user?.name || 'U')}
          </div>
          <div className="flex-1 flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Leave a comment..."
              className="input-field flex-1 text-sm" />
            <button onClick={() => submit()} disabled={!text.trim() || loading}
              className="btn-primary px-3 py-2 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-4 rounded-xl text-center">
          <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">Sign in</Link> to comment
        </p>
      )}

      {/* Comments list */}
      <div className="space-y-5">
        {comments.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">No comments yet. Be the first!</p>
        )}
        {comments.map(comment => (
          <div key={comment.id}>
            <CommentItem comment={comment} currentUserId={user?.id}
              onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              onDelete={() => deleteComment(comment.id)} />

            {/* Reply input */}
            {replyTo === comment.id && (
              <div className="flex gap-2 mt-2 ml-10">
                <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit(comment.id)}
                  placeholder="Write a reply..."
                  className="input-field flex-1 text-sm" autoFocus />
                <button onClick={() => submit(comment.id)} disabled={!replyText.trim()}
                  className="btn-primary px-3 py-2 disabled:opacity-40 text-sm">
                  Reply
                </button>
              </div>
            )}

            {/* Replies */}
            {comment.replies?.map((reply: any) => (
              <div key={reply.id} className="ml-10 mt-2">
                <CommentItem comment={reply} currentUserId={user?.id} isReply
                  onDelete={() => deleteComment(reply.id, comment.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUserId, onReply, onDelete, isReply = false }: {
  comment: any; currentUserId?: string; onReply?: () => void; onDelete: () => void; isReply?: boolean;
}) {
  const canDelete = currentUserId === comment.user?.id;
  return (
    <div className="flex gap-3 group">
      {isReply && <CornerDownRight size={14} className="text-gray-300 mt-3 flex-shrink-0" />}
      {comment.user?.avatarUrl ? (
        <Image src={comment.user.avatarUrl} alt={comment.user.name} width={32} height={32}
          className="rounded-full flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {getAvatarFallback(comment.user?.name || 'U')}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">{comment.user?.name}</span>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && (
            <button onClick={onReply} className="text-xs text-gray-400 hover:text-primary-600 transition-colors">
              Reply
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
