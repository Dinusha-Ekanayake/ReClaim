'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api, { ApiError } from '@/lib/api';
import ItemCard from '@/components/items/ItemCard';
import { Pagination } from '@/components/shared/Pagination';
import { cn } from '@/lib/utils';

const FILTERS = [
  { label: 'All', type: '', status: '' },
  { label: '🔍 Lost', type: 'LOST', status: '' },
  { label: '📦 Found', type: 'FOUND', status: '' },
  { label: '✓ Returned', type: '', status: 'RETURNED' },
  { label: 'Active', type: '', status: 'ACTIVE' },
];

export default function MyItemsPage() {
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const f = FILTERS[activeFilter];

  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/users/me/items', {
      page, limit: 12,
      ...(f.type && { type: f.type }),
      ...(f.status && { status: f.status }),
      ...(!f.status && !f.type && { status: undefined }),
    }, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setItems(data.items ?? []);
      const nextTotal = data.total ?? 0;
      setTotal(nextTotal);
      const availablePages = Math.max(Math.ceil(nextTotal / 12), 1);
      if (page > availablePages) setPage(availablePages);
    }).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setItems([]);
      setTotal(0);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load your items. Please try again.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [user?.id, activeFilter, page, retryKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">My Items</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{total} items total</p>
        </div>
        <Link href="/items/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Post Item
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter, i) => (
          <button key={i} onClick={() => { setActiveFilter(i); setPage(1); }}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeFilter === i
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600')}>
            {filter.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-40" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="card p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your items could not be loaded</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button type="button" onClick={() => setRetryKey(key => key + 1)} className="btn-primary mt-5 inline-flex items-center gap-2">
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No items yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            {activeFilter === 0 ? "You haven't posted any items yet." : `No ${f.type || f.status} items found.`}
          </p>
          {activeFilter === 0 && (
            <Link href="/items/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Post Your First Item
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map(item => <ItemCard key={item.id} item={item} showStatus />)}
          </div>
          <Pagination page={page} pages={Math.ceil(total / 12)} onPageChange={setPage} className="mt-4" />
        </>
      )}
    </div>
  );
}
