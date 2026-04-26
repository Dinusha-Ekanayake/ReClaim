'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-500/10 text-amber-400',
  APPROVED: 'bg-green-500/10 text-green-400',
  REJECTED: 'bg-red-500/10  text-red-400',
};

export default function AdminClaimsPage() {
  const [claims, setClaims]   = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('PENDING');
  const [page, setPage]       = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Admin uses a flat list — we'll fetch recent items then their claims
    // For real production you'd add a dedicated /admin/claims route
    api.get('/admin/items', { limit: 50 })
      .then(async (data: any) => {
        const all: any[] = [];
        for (const item of data.items.slice(0, 20)) {
          try {
            const c = await api.get(`/claims/item/${item.id}`);
            all.push(...c.map((cl: any) => ({ ...cl, item })));
          } catch {}
        }
        const filtered = status ? all.filter(c => c.status === status) : all;
        setClaims(filtered.slice((page - 1) * 20, page * 20));
        setTotal(filtered.length);
      }).finally(() => setLoading(false));
  }, [status, page]);

  const handleReview = async (claimId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessing(claimId);
    try {
      await api.patch(`/claims/${claimId}`, { status: newStatus });
      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Claims Management</h1>
        <p className="text-gray-400 text-sm">{total} claims</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
              status === s ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-28 skeleton" />
          ))
        ) : claims.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No claims found</div>
        ) : claims.map(claim => (
          <div key={claim.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', STATUS_STYLES[claim.status])}>
                    {claim.status}
                  </span>
                  <span className="text-xs text-gray-600">{timeAgo(claim.createdAt)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Item</p>
                    <Link href={`/items/${claim.item?.id}`} target="_blank"
                      className="text-primary-400 hover:underline text-sm flex items-center gap-1 font-medium">
                      {claim.item?.title} <ExternalLink size={12} />
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Claimant</p>
                    <p className="text-white text-sm font-medium">{claim.claimant?.name}</p>
                    <p className="text-xs text-gray-600">{claim.claimant?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Message</p>
                    <p className="text-gray-400 text-sm truncate">{claim.message || '—'}</p>
                  </div>
                </div>
              </div>

              {claim.status === 'PENDING' && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleReview(claim.id, 'APPROVED')} disabled={processing === claim.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-600/30 transition-colors disabled:opacity-50">
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button onClick={() => handleReview(claim.id, 'REJECTED')} disabled={processing === claim.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-600/30 transition-colors disabled:opacity-50">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
