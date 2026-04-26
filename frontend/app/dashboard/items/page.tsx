'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';
import ItemCard from '@/components/items/ItemCard';
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

  const f = FILTERS[activeFilter];

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.get(`/users/${user.id}/items`, {
      page, limit: 12,
      ...(f.type && { type: f.type }),
      ...(f.status && { status: f.status }),
      ...(!f.status && !f.type && { status: undefined }),
    }).then(data => {
      setItems(data.items);
      setTotal(data.total);
    }).finally(() => setLoading(false));
  }, [user?.id, activeFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">My Items</h1>
          <p className="text-gray-500 text-sm">{total} items total</p>
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
              activeFilter === i ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300')}>
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
      ) : items.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
          <p className="text-gray-500 mb-6 text-sm">
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
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
              <button disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
