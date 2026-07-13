'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Inbox, Mail, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { Pagination } from '@/components/shared/Pagination';
import { timeAgo } from '@/lib/utils';

type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  adminNote?: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<ContactStatus, string> = {
  NEW: 'bg-blue-500/15 text-blue-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300',
  SPAM: 'bg-red-500/15 text-red-300',
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [status, setStatus] = useState<ContactStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/contacts', {
        status: status || undefined,
        search: search.trim() || undefined,
        page,
        limit: 20,
      }, { signal });
      if (signal?.aborted) return false;
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
      const availablePages = Math.max(data.pages ?? 1, 1);
      setPages(availablePages);
      if (page > availablePages) setPage(availablePages);
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      setContacts([]);
      setTotal(0);
      setPages(1);
      setError(err instanceof ApiError ? err.message : 'Could not load the support inbox.');
      return false;
    } finally {
      if (!signal?.aborted && showLoading) setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { void load(controller.signal); }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, retryKey]);

  const updateStatus = async (contact: ContactMessage, nextStatus: ContactStatus) => {
    setUpdating(contact.id);
    setError('');
    try {
      const updated = await api.patch(`/admin/contacts/${contact.id}`, {
        status: nextStatus,
        adminNote: contact.adminNote || null,
      });
      setContacts(current => current.map(entry => entry.id === updated.id ? updated : entry));
      await load(undefined, false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the message.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-400">Support</p>
          <h1 className="text-2xl font-display font-bold text-white">Contact inbox</h1>
          <p className="mt-1 text-sm text-gray-500">{total} real message{total === 1 ? '' : 's'} submitted from the public contact form.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={120}
              aria-label="Search contact messages" placeholder="Search inbox"
              className="h-10 rounded-xl border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white placeholder:text-gray-600" />
          </label>
          <select value={status} onChange={event => { setStatus(event.target.value as ContactStatus | ''); setPage(1); }}
            aria-label="Filter contact status" className="h-10 rounded-xl border border-gray-800 bg-gray-900 px-3 text-sm text-white">
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="SPAM">Spam</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">{[...Array(4)].map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-gray-900" />)}</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="font-semibold text-red-300">The support inbox is unavailable</p>
          <p className="mt-1 text-sm text-gray-400">{error}</p>
          <button type="button" onClick={() => setRetryKey(key => key + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 text-center">
          <Inbox size={30} className="mb-3 text-gray-700" />
          <p className="font-semibold text-gray-300">No messages found</p>
          <p className="mt-1 text-sm text-gray-600">New contact submissions will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {contacts.map(contact => (
            <article key={contact.id} className="rounded-2xl border border-gray-800 bg-gray-900/85 p-5 shadow-sm transition hover:border-gray-700">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[contact.status]}`}>{contact.status.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-600">{timeAgo(contact.createdAt)}</span>
                  </div>
                  <h2 className="truncate text-base font-bold text-white">{contact.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{contact.name}</span>
                    <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`}
                      className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300">
                      <Mail size={12} /> {contact.email}
                    </a>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">{contact.message}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-44 lg:justify-end">
                  <button disabled={updating === contact.id} onClick={() => updateStatus(contact, 'IN_PROGRESS')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">
                    <Clock3 size={13} /> Review
                  </button>
                  <button disabled={updating === contact.id} onClick={() => updateStatus(contact, 'RESOLVED')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
                    <CheckCircle2 size={13} /> Resolve
                  </button>
                  <button disabled={updating === contact.id} onClick={() => updateStatus(contact, 'SPAM')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50">
                    <ShieldAlert size={13} /> Spam
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && <Pagination page={page} pages={pages} onPageChange={setPage} />}
    </div>
  );
}
