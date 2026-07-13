'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, CheckCircle, XCircle, MessageSquare, RefreshCw } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { Pagination } from '@/components/shared/Pagination';
import { cn, timeAgo, getAvatarFallback } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-500/10 text-amber-400',
  APPROVED: 'bg-green-500/10 text-green-400',
  REJECTED: 'bg-red-500/10  text-red-400',
};

function questionLabel(key: string, index: number) {
  return /^q\d+$/i.test(key) ? `Question ${index + 1}` : key;
}

export default function AdminClaimsPage() {
  const [claims, setClaims]   = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('PENDING');
  const [page, setPage]       = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const fetchClaims = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/claims', {
        page, limit: 20,
        ...(status && { status }),
      }, { signal });
      if (signal?.aborted) return false;
      setClaims(data.claims ?? []);
      const nextTotal = data.total ?? 0;
      setTotal(nextTotal);
      const availablePages = Math.max(Math.ceil(nextTotal / 20), 1);
      if (page > availablePages) setPage(availablePages);
      return true;
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return false;
      setClaims([]);
      setTotal(0);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load claims.');
      return false;
    } finally {
      if (!signal?.aborted && showLoading) setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchClaims(controller.signal);
    return () => controller.abort();
  }, [fetchClaims, retryKey]);

  const handleReview = async (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessing(claimId);
    setError('');
    try {
      await api.patch(`/admin/claims/${claimId}`, { status: newStatus });
      await fetchClaims(undefined, false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not update this claim.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Claims Management</h1>
        <p className="text-gray-400 text-sm">{total} {status ? status.toLowerCase() : 'total'} claims</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'Pending', value: 'PENDING' },
          { label: 'Approved', value: 'APPROVED' },
          { label: 'Rejected', value: 'REJECTED' },
          { label: 'All', value: '' },
        ].map(s => (
          <button key={s.value} type="button" aria-pressed={status === s.value} onClick={() => { setStatus(s.value); setPage(1); }}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              status === s.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white')}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-28 skeleton" />
          ))
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="font-semibold text-red-300">Claims are unavailable</p>
            <p className="mt-1 text-sm text-gray-400">{error}</p>
            <button type="button" onClick={() => setRetryKey(key => key + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageSquare size={40} className="mx-auto mb-3 text-gray-700" />
            <p>No {status ? status.toLowerCase() : ''} claims found</p>
          </div>
        ) : claims.map(claim => (
          <div key={claim.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', STATUS_STYLES[claim.status] ?? 'bg-gray-800 text-gray-400')}>
                    {claim.status}
                  </span>
                  <span className={cn('px-2 py-1 rounded-lg text-xs font-semibold',
                    claim.item?.type === 'LOST' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400')}>
                    {claim.item?.type}
                  </span>
                  <span className="text-xs text-gray-600">{timeAgo(claim.createdAt)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Item */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Item</p>
                    <Link href={`/items/${claim.item?.id}`} target="_blank"
                      className="text-primary-400 hover:underline text-sm flex items-center gap-1 font-medium">
                      {claim.item?.title}
                      <ExternalLink size={11} />
                    </Link>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Owner: {claim.item?.user?.name}
                    </p>
                  </div>

                  {/* Claimant */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Claimant</p>
                    <div className="flex items-center gap-2">
                      {claim.claimant?.avatarUrl ? (
                        <Image src={claim.claimant.avatarUrl} alt={claim.claimant.name}
                          width={24} height={24} className="rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {getAvatarFallback(claim.claimant?.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{claim.claimant?.name}</p>
                        <p className="text-xs text-gray-600 truncate">{claim.claimant?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Message</p>
                    <p className="text-gray-400 text-sm line-clamp-2">{claim.message || '—'}</p>
                  </div>
                </div>

                {/* Verification answers if present (verificationAnswers is a JSON object: key→answer) */}
                {claim.verificationAnswers && Object.keys(claim.verificationAnswers).length > 0 && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-xl">
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Verification answers:</p>
                    <div className="space-y-2">
                      {Object.entries(claim.verificationAnswers as Record<string, string>).map(([key, answer], i) => (
                        <div key={key} className="rounded-lg bg-gray-900/70 px-3 py-2">
                          <p className="text-xs font-medium text-gray-400">{questionLabel(key, i)}</p>
                          <p className="mt-0.5 text-sm text-gray-200">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {claim.status === 'PENDING' && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleReview(claim.id, 'APPROVED')}
                    disabled={processing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-600/30 transition-colors disabled:opacity-50">
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    onClick={() => handleReview(claim.id, 'REJECTED')}
                    disabled={processing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-600/30 transition-colors disabled:opacity-50">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!error && <Pagination page={page} pages={Math.ceil(total / 20)} onPageChange={setPage} className="mt-6" />}
    </div>
  );
}
