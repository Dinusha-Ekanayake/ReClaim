'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonCard } from '@/components/shared/LoadingSpinner';
import { useDebounce } from '@/hooks';
import api from '@/lib/api';
import { CATEGORIES, COLORS, cn } from '@/lib/utils';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [color, setColor] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, limit: 12, order: 'desc' };
    if (debouncedQuery) params.search = debouncedQuery;
    if (type) params.type = type;
    if (category) params.category = category;
    if (color) params.color = color;

    api.get('/items', params)
      .then(data => { setItems(data.items); setPagination(data.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery, type, category, color, page]);

  const clearAll = () => {
    setQuery(''); setType(''); setCategory(''); setColor(''); setPage(1);
  };

  const hasFilters = !!(query || type || category || color);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-display font-bold text-gray-900 text-center mb-6">Search Items</h1>
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by item name, description, brand, location…"
              className="input-field pl-12 pr-10 py-4 text-base shadow-sm"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          {/* Type */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[{ v: '', l: 'All' }, { v: 'LOST', l: '🔍 Lost' }, { v: 'FOUND', l: '📦 Found' }].map(opt => (
              <button key={opt.v} onClick={() => { setType(opt.v); setPage(1); }}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  type === opt.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* Category */}
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>

          {/* Color */}
          <select value={color} onChange={e => { setColor(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm">
            <option value="">Any Color</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X size={14} /> Clear all
            </button>
          )}

          {pagination && (
            <span className="text-sm text-gray-400 ml-auto">
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No results found"
            description={hasFilters ? 'Try adjusting your search or filters.' : 'Start typing to search for items.'}
            {...(hasFilters ? { actionLabel: 'Clear Filters', onAction: clearAll } : {})}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                onPageChange={setPage}
                className="mt-10"
              />
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
