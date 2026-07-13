'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, Grid, List, Search } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import { Pagination } from '@/components/shared/Pagination';
import api, { ApiError } from '@/lib/api';
import { CATEGORIES, COLORS, cn } from '@/lib/utils';
import { useDebounce } from '@/hooks';

const SORTS = [
  { value: 'createdAt', label: 'Newest First' },
  { value: 'dateLostFound', label: 'Date Lost/Found' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function ItemsPageContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryString = searchParams.toString();

  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filters = useMemo(() => {
    const params = new URLSearchParams(queryString);
    const requestedType = params.get('type') || '';
    const requestedSort = params.get('sort') || 'createdAt';
    const requestedPage = Number(params.get('page'));
    const requestedCategory = (params.get('category') || '').trim();
    const requestedColor = (params.get('color') || '').trim();

    return {
      type: requestedType === 'LOST' || requestedType === 'FOUND' ? requestedType : '',
      category: CATEGORIES.some(category => category.value === requestedCategory) ? requestedCategory : '',
      search: (params.get('search') || '').trim().slice(0, 100),
      color: COLORS.includes(requestedColor) ? requestedColor : '',
      brand: (params.get('brand') || '').trim().slice(0, 80),
      sort: SORTS.some(option => option.value === requestedSort) ? requestedSort : 'createdAt',
      page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    };
  }, [queryString]);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchDirty, setSearchDirty] = useState(false);
  const syncingSearchFromUrl = useRef(false);
  const debouncedSearch = useDebounce(searchInput, 350);

  const updateUrl = useCallback((updates: Partial<typeof filters>) => {
    const next = new URLSearchParams(queryString);
    const merged = { ...filters, ...updates };

    (['type', 'category', 'search', 'color', 'brand'] as const).forEach(key => {
      const value = String(merged[key] || '').trim();
      if (value) next.set(key, value);
      else next.delete(key);
    });

    if (merged.sort && merged.sort !== 'createdAt') next.set('sort', merged.sort);
    else next.delete('sort');

    if (merged.page > 1) next.set('page', String(merged.page));
    else next.delete('page');

    const query = next.toString();
    if (query !== queryString) router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [filters, pathname, queryString, router]);

  useEffect(() => {
    updateUrl({});
  }, [updateUrl]);

  useEffect(() => {
    syncingSearchFromUrl.current = true;
    setSearchInput(filters.search);
    setSearchDirty(false);
  }, [filters.search]);

  useEffect(() => {
    if (syncingSearchFromUrl.current) {
      syncingSearchFromUrl.current = false;
      return;
    }
    if (!searchDirty) return;
    if (debouncedSearch === filters.search) {
      setSearchDirty(false);
      return;
    }
    updateUrl({ search: debouncedSearch, page: 1 });
    setSearchDirty(false);
  }, [debouncedSearch, filters.search, searchDirty, updateUrl]);

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/items', {
        ...filters,
        search: filters.search.length >= 3 ? filters.search : undefined,
        limit: 12,
        order: 'desc',
      }, { signal });
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
      const lastAvailablePage = Math.max(Number(data.pagination?.pages) || 1, 1);
      if (filters.page > lastAvailablePage) updateUrl({ page: lastAvailablePage });
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setItems([]);
      setPagination(null);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load items. Please try again.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, updateUrl]);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(controller.signal);
    return () => controller.abort();
  }, [fetchItems, retryKey]);

  const updateFilter = (key: keyof typeof filters, value: string | number) => updateUrl({ [key]: value, page: 1 });
  const clearFilters = () => {
    setSearchInput('');
    setSearchDirty(false);
    updateUrl({ type: '', category: '', search: '', color: '', brand: '', sort: 'createdAt', page: 1 });
  };

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
              {error
                ? 'Community items could not be loaded'
                : pagination
                  ? `${pagination.total} item${pagination.total === 1 ? '' : 's'} in the community`
                  : 'Loading the latest reports…'}
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
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setSearchDirty(true); }}
              aria-label="Search items"
              placeholder="Search items..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {[{ value: '', label: 'All' }, { value: 'LOST', label: '🔍 Lost' }, { value: 'FOUND', label: '📦 Found' }].map(opt => (
              <button key={opt.value} type="button" aria-pressed={filters.type === opt.value} onClick={() => updateFilter('type', opt.value)}
                className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  filters.type === opt.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
                {opt.label}
              </button>
            ))}
          </div>

          <select aria-label="Sort items" value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="input-field w-auto">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <button type="button" aria-expanded={filtersOpen} aria-controls="item-filters" onClick={() => setFiltersOpen(!filtersOpen)}
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

          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1" role="group" aria-label="Item view">
            <button type="button" aria-label="Grid view" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
              <Grid size={16} />
            </button>
            <button type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <motion.div
            id="item-filters"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button type="button" onClick={clearFilters} className="text-sm text-red-500 hover:underline flex items-center gap-1">
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
        ) : error ? (
          <div role="alert" className="card mx-auto max-w-xl p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Items are temporarily unavailable</h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button type="button" onClick={() => setRetryKey(key => key + 1)} className="btn-primary">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70">
            <Search size={36} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No items found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search terms</p>
            <button type="button" onClick={clearFilters} className="btn-primary">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className={cn('grid gap-6', viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
              {items.map(item => (
                <div key={item.id} className="animate-slide-in-up">
                  <ItemCard item={item} variant={viewMode} />
                </div>
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <Pagination page={filters.page} pages={pagination.pages}
                onPageChange={nextPage => updateUrl({ page: nextPage })} className="mt-10" />
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
