'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, Grid, List, Search } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import api from '@/lib/api';
import { CATEGORIES, COLORS, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks';
import { toast } from '@/components/ui/toaster';

const SORTS = [
  { value: 'createdAt', label: 'Newest First' },
  { value: 'dateLostFound', label: 'Date Lost/Found' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function ItemsPageContent() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    color: '',
    brand: '',
    sort: 'createdAt',
    page: 1,
  });
  const debouncedSearch = useDebounce(filters.search, 350);

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await api.get('/items', { ...filters, search: debouncedSearch, limit: 12, order: 'desc' }, { signal });
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast({ title: 'Could not load items', description: error.message, variant: 'destructive' });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters.type, filters.category, filters.color, filters.brand, filters.sort, filters.page, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(controller.signal);
    return () => controller.abort();
  }, [fetchItems]);

  const updateFilter = (key: string, value: any) => setFilters(f => ({ ...f, [key]: value, page: 1 }));
  const clearFilters = () => setFilters({ type: '', category: '', search: '', color: '', brand: '', sort: 'createdAt', page: 1 });

  const activeFilterCount = [filters.type, filters.category, filters.color, filters.brand].filter(Boolean).length;

  const isLost = filters.type === 'LOST';
  const isFound = filters.type === 'FOUND';

  return (
    <>
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className={cn(
        'relative overflow-hidden border-b border-gray-100 dark:border-gray-800',
        isLost ? 'bg-gradient-to-br from-red-50 via-white to-orange-50/40 dark:from-red-950/30 dark:via-gray-950 dark:to-gray-950'
          : isFound ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-gray-950 dark:to-gray-950'
            : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 dark:from-blue-950/30 dark:via-gray-950 dark:to-gray-950'
      )}>
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-2">
              {isLost ? '🔍 Lost Items' : isFound ? '📦 Found Items' : 'Browse All Items'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {pagination ? `${pagination.total} item${pagination.total === 1 ? '' : 's'} in the community` : 'Loading the latest reports…'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search + toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {[{ value: '', label: 'All' }, { value: 'LOST', label: '🔍 Lost' }, { value: 'FOUND', label: '📦 Found' }].map(opt => (
              <button key={opt.value} onClick={() => updateFilter('type', opt.value)}
                className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  filters.type === opt.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
                {opt.label}
              </button>
            ))}
          </div>

          <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="input-field w-auto">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all',
              filtersOpen || activeFilterCount > 0
                ? 'border-primary-500 bg-blue-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600')}>
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button onClick={clearFilters} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                <X size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Category</label>
                <select value={filters.category} onChange={e => updateFilter('category', e.target.value)} className="input-field">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Color</label>
                <select value={filters.color} onChange={e => updateFilter('color', e.target.value)} className="input-field">
                  <option value="">Any Color</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Brand</label>
                <input type="text" value={filters.brand} onChange={e => updateFilter('brand', e.target.value)}
                  placeholder="e.g. Apple, Samsung" className="input-field" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className={cn('grid gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No items found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search terms</p>
            <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
          </motion.div>
        ) : (
          <>
            <motion.div
              key={`${filters.page}-${filters.type}-${filters.category}`}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden" animate="show"
              className={cn('grid gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
              {items.map(item => (
                <motion.div key={item.id}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}>
                  <ItemCard item={item} variant={viewMode} />
                </motion.div>
              ))}
            </motion.div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button disabled={filters.page === 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                        className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                          filters.page === p
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button disabled={filters.page === pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function ItemsPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>}>
        <ItemsPageContent />
      </Suspense>
    </PublicLayout>
  );
}
