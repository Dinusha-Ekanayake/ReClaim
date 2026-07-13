'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, CornerDownRight, MessageCircle, RefreshCw, Send, Trash2, X } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { cn, getAvatarFallback, timeAgo } from '@/lib/utils';
import type { Comment } from '@/types';

const COMMENT_LIMIT = 500;

interface CommentSectionProps {
  itemId: string;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function CommentSection({ itemId }: CommentSectionProps) {
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useIsLoggedIn();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const loadComments = useCallback(async (signal?: AbortSignal) => {
    setInitialLoading(true);
    setError('');
    try {
      const data = await api.get<Comment[]>(`/comments/${itemId}`, undefined, { signal });
      setComments(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setComments([]);
      setError(errorMessage(error, 'Comments could not be loaded.'));
    } finally {
      if (!signal?.aborted) setInitialLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadComments(controller.signal);
    return () => controller.abort();
  }, [loadComments]);

  const commentCount = useMemo(
    () => comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0),
    [comments],
  );

  const submit = async (parentId?: string) => {
    const content = (parentId ? replyText : text).trim();
    if (!content || content.length > COMMENT_LIMIT || submittingFor) return;

    const target = parentId ?? 'root';
    setSubmittingFor(target);
    setError('');
    try {
      const comment = await api.post<Comment>(`/comments/${itemId}`, { content, parentId });
      if (parentId) {
        setComments((current) => current.map((entry) => (
          entry.id === parentId
            ? { ...entry, replies: [...(entry.replies ?? []), comment] }
            : entry
        )));
        setReplyTo(null);
        setReplyText('');
      } else {
        setComments((current) => [{ ...comment, replies: [] }, ...current]);
        setText('');
      }
    } catch (error) {
      setError(errorMessage(error, 'Comment could not be posted. Your draft was kept.'));
    } finally {
      setSubmittingFor(null);
    }
  };

  const deleteComment = async (commentId: string, parentId?: string) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    setDeletingId(commentId);
    setError('');
    try {
      await api.delete(`/comments/${commentId}`);
      if (parentId) {
        setComments((current) => current.map((entry) => (
          entry.id === parentId
            ? { ...entry, replies: (entry.replies ?? []).filter((reply) => reply.id !== commentId) }
            : entry
        )));
      } else {
        // A parent with replies is represented by a tombstone on the API. Reload
        // so the local thread mirrors that server-side behavior exactly.
        const deleted = comments.find((entry) => entry.id === commentId);
        if (deleted?.replies?.length) {
          await loadComments();
        } else {
          setComments((current) => current.filter((entry) => entry.id !== commentId));
        }
      }
    } catch (error) {
      setError(errorMessage(error, 'Comment could not be deleted.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="card p-4 sm:p-6" aria-labelledby="comments-heading">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 id="comments-heading" className="flex items-center gap-2 font-display text-lg font-semibold text-slate-950 dark:text-white">
            <MessageCircle size={18} className="text-primary-600" aria-hidden="true" />
            Community discussion
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {commentCount === 0 ? 'Ask a useful public question about this item.' : `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
          </p>
        </div>
        {!initialLoading && error && (
          <button type="button" onClick={() => void loadComments()} className="flex size-11 items-center justify-center rounded-xl text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10" aria-label="Retry loading comments">
            <RefreshCw size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      {isLoggedIn ? (
        <div className="mb-6 flex items-start gap-3">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} />
          <div className="min-w-0 flex-1">
            <label htmlFor={`comment-${itemId}`} className="sr-only">Add a public comment</label>
            <div className="relative">
              <textarea
                id={`comment-${itemId}`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Add a helpful public comment…"
                maxLength={COMMENT_LIMIT}
                rows={2}
                className="input-field min-h-20 resize-y pr-14"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!text.trim() || submittingFor !== null}
                aria-label="Post comment"
                className="absolute bottom-2 right-2 flex size-11 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>Enter to post · Shift+Enter for a new line</span>
              <span>{text.length}/{COMMENT_LIMIT}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <Link href={`/auth/login?next=${encodeURIComponent(`/items/${itemId}`)}`} className="font-bold text-primary-700 hover:underline dark:text-primary-300">Sign in</Link> to join this discussion.
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="flex size-8 shrink-0 items-center justify-center rounded-lg" aria-label="Dismiss error"><X size={15} aria-hidden="true" /></button>
        </div>
      )}

      {initialLoading ? (
        <div className="space-y-3" aria-label="Loading comments">
          {[0, 1].map((index) => <div key={index} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-7 text-center dark:border-slate-700">
          <MessageCircle size={24} className="mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No comments yet</p>
        </div>
      ) : (
        <ol className="space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={user?.id}
                canReply={isLoggedIn && !comment.isHidden}
                deleting={deletingId === comment.id}
                onReply={() => {
                  setReplyTo((current) => current === comment.id ? null : comment.id);
                  setReplyText('');
                }}
                onDelete={() => void deleteComment(comment.id)}
              />

              {replyTo === comment.id && (
                <div className="ml-5 mt-3 flex gap-2 border-l-2 border-primary-100 pl-4 dark:border-primary-500/20 sm:ml-10">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`reply-${comment.id}`} className="sr-only">Reply to {comment.user?.name ?? 'comment'}</label>
                    <textarea
                      id={`reply-${comment.id}`}
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          void submit(comment.id);
                        }
                      }}
                      placeholder="Write a reply…"
                      maxLength={COMMENT_LIMIT}
                      rows={2}
                      className="input-field resize-y"
                      autoFocus
                    />
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => { setReplyTo(null); setReplyText(''); }} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                      <button type="button" onClick={() => void submit(comment.id)} disabled={!replyText.trim() || submittingFor !== null} className="btn-primary inline-flex items-center gap-2 px-4 disabled:opacity-40">
                        <Send size={15} aria-hidden="true" /> {submittingFor === comment.id ? 'Posting…' : 'Post reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!!comment.replies?.length && (
                <ol className="ml-5 mt-3 space-y-3 border-l-2 border-slate-100 pl-4 dark:border-slate-800 sm:ml-10">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentItem
                        comment={reply}
                        currentUserId={user?.id}
                        isReply
                        deleting={deletingId === reply.id}
                        onDelete={() => void deleteComment(reply.id, comment.id)}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Avatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
  return avatarUrl ? (
    <Image src={avatarUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300" aria-hidden="true">
      {getAvatarFallback(name || 'U')}
    </span>
  );
}

function CommentItem({
  comment,
  currentUserId,
  canReply = false,
  deleting = false,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment & { isHidden?: boolean };
  currentUserId?: string;
  canReply?: boolean;
  deleting?: boolean;
  onReply?: () => void;
  onDelete: () => void;
  isReply?: boolean;
}) {
  const canDelete = currentUserId === comment.user?.id && !comment.isHidden;
  const author = comment.isHidden ? 'Deleted comment' : (comment.user?.name || 'Community member');

  return (
    <article className={cn('group flex min-w-0 gap-3', deleting && 'opacity-60')} aria-busy={deleting}>
      {isReply && <CornerDownRight size={14} className="mt-3 shrink-0 text-slate-300" aria-hidden="true" />}
      <Avatar name={author} avatarUrl={comment.isHidden ? undefined : comment.user?.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-slate-950 dark:text-white">{author}</span>
          <time dateTime={comment.createdAt} className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</time>
        </div>
        <p className={cn('mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300', comment.isHidden && 'italic text-slate-400')}>
          {comment.content}
        </p>
        {(canReply || canDelete) && (
          <div className="mt-1 flex min-h-9 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {canReply && <button type="button" onClick={onReply} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-500/10 dark:hover:text-primary-300">Reply</button>}
            {canDelete && <button type="button" onClick={onDelete} disabled={deleting} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 size={13} aria-hidden="true" />{deleting ? 'Deleting…' : 'Delete'}</button>}
          </div>
        )}
      </div>
    </article>
  );
}
