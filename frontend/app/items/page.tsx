'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, X, Grid, List, Search } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import api from '@/lib/api';
import { CATEGORIES, COLORS, cn } from '@/lib/utils';

const SORTS = [
  { value: 'createdAt', label: 'Newest First' },
  { value: 'dateLostFound', label: 'Date Lost/Found' },
];

export default function ItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    color: '',
    brand: '',
    sort: 'createdAt',
    page: 1,
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/items', {
        ...filters,
        limit: 12,
        order: 'desc',
      });
      setItems(data.items);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateFilter = (key: string, value: any) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ type: '', category: '', search: '', color: '', brand: '', sort: 'createdAt', page: 1 });
  };

  const activeFilterCount = [filters.type, filters.category, filters.color, filters.brand]
    .filter(Boolean).length;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            {filters.type === 'LOST' ? '🔍 Lost Items' :
              filters.type === 'FOUND' ? '📦 Found Items' : 'All Items'}
          </h1>
          {pagination && (
            <p className="text-gray-500 text-sm">{pagination.total} items found</p>
          )}
        </div>

        {/* Search + toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              placeholder="Search items..."
              className="input-field pl-10"
            />
          </div>

          {/* Type toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[{ value: '', label: 'All' }, { value: 'LOST', label: '🔍 Lost' }, { value: 'FOUND', label: '📦 Found' }].map(opt => (
              <button key={opt.value} onClick={() => updateFilter('type', opt.value)}
                className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  filters.type === opt.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)}
            className="input-field w-auto">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Filter button */}
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all',
              filtersOpen || activeFilterCount > 0 ? 'border-primary-500 bg-blue-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500')}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500')}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button onClick={clearFilters} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                <X size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Category</label>
                <select value={filters.category} onChange={e => updateFilter('category', e.target.value)}
                  className="input-field">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Color</label>
                <select value={filters.color} onChange={e => updateFilter('color', e.target.value)}
                  className="input-field">
                  <option value="">Any Color</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Brand</label>
                <input type="text" value={filters.brand} onChange={e => updateFilter('brand', e.target.value)}
                  placeholder="e.g. Apple, Samsung" className="input-field" />
              </div>
            </div>
          </div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className={cn('grid gap-6',
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-44" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
            <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className={cn('grid gap-6',
              viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
              {items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button disabled={filters.page === 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                        className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                          filters.page === p ? 'bg-primary-600 text-white' : 'border border-gray-200 hover:bg-gray-50')}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button disabled={filters.page === pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
