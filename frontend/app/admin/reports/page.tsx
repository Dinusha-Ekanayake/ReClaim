'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { Pagination } from '@/components/shared/Pagination';
import { cn, timeAgo } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400',
  REVIEWED: 'bg-blue-500/10 text-blue-400',
  RESOLVED: 'bg-green-500/10 text-green-400',
  DISMISSED: 'bg-gray-500/10 text-gray-400',
};

const REASON_LABELS: Record<string, string> = {
  FAKE: '🚫 Fake',
  INAPPROPRIATE: '⚠️ Inappropriate',
  SPAM: '📢 Spam',
  WRONG_CATEGORY: '📂 Wrong Category',
  OTHER: '❓ Other',
};

const RESOLUTION_NOTE = 'Report reviewed and marked resolved. No automated item or account action was taken.';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const fetchReports = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/reports', {
        page, limit: 20,
        ...(statusFilter && { status: statusFilter }),
      }, { signal });
      if (signal?.aborted) return false;
      setReports(data.reports ?? []);
      const nextTotal = data.total ?? 0;
      setTotal(nextTotal);
      const availablePages = Math.max(Math.ceil(nextTotal / 20), 1);
      if (page > availablePages) setPage(availablePages);
      return true;
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return false;
      setReports([]);
      setTotal(0);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load reports.');
      return false;
    } finally {
      if (!signal?.aborted && showLoading) setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchReports(controller.signal);
    return () => controller.abort();
  }, [fetchReports, retryKey]);

  const handleResolve = async (id: string, status: string, adminNote?: string) => {
    setProcessing(id);
    setError('');
    try {
      await api.patch(`/admin/reports/${id}`, { status, adminNote });
      await fetchReports(undefined, false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not update this report.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Reports</h1>
        <p className="text-gray-400 text-sm">{total} reports</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED', ''].map(s => (
          <button key={s} type="button" aria-pressed={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-24 skeleton" />
          ))
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="font-semibold text-red-300">Reports are unavailable</p>
            <p className="mt-1 text-sm text-gray-400">{error}</p>
            <button type="button" onClick={() => setRetryKey(key => key + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CheckCircle size={40} className="mx-auto mb-3 text-gray-700" />
            <p>No reports found</p>
          </div>
        ) : reports.map(report => (
          <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', STATUS_COLORS[report.status] || 'bg-gray-800 text-gray-400')}>
                    {report.status}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">
                    {REASON_LABELS[report.reason] || report.reason}
                  </span>
                  <span className="text-xs text-gray-600">{timeAgo(report.createdAt)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Item</p>
                    <Link href={`/items/${report.item?.id}`} target="_blank"
                      className="text-primary-400 hover:underline flex items-center gap-1 font-medium">
                      {report.item?.title}
                      <ExternalLink size={12} />
                    </Link>
                    <p className="text-xs text-gray-600 mt-0.5">{report.item?.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Reporter</p>
                    <p className="text-white font-medium">{report.reporter?.name}</p>
                    <p className="text-xs text-gray-600">{report.reporter?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Item Owner</p>
                    <p className="text-white font-medium">{report.itemOwner?.name}</p>
                    <p className="text-xs text-gray-600">{report.itemOwner?.email}</p>
                  </div>
                </div>

                {report.description && (
                  <p className="mt-3 text-sm text-gray-400 bg-gray-800 px-3 py-2 rounded-xl">
                    "{report.description}"
                  </p>
                )}
              </div>

              {/* Actions */}
              {report.status === 'PENDING' && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleResolve(report.id, 'RESOLVED', RESOLUTION_NOTE)}
                    disabled={processing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-600/30 transition-colors disabled:opacity-50">
                    <CheckCircle size={13} /> Mark resolved
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, 'DISMISSED')}
                    disabled={processing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-400 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50">
                    <XCircle size={13} /> Dismiss
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
