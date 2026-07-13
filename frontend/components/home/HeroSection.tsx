'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import ReclaimLogoCloud from './ReclaimLogoCloud';
import { useLanguage } from '@/components/providers/LanguageProvider';
import api from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import type { Item } from '@/types';

type CommunityStats = {
  users?: { total?: number };
  items?: { returned?: number };
};

const TRUST_SIGNALS = [
  { icon: ShieldCheck, text: 'Verified claims' },
  { icon: Zap, text: 'Smart matching' },
  { icon: LockKeyhole, text: 'Private by design' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HeroSection() {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');

  const loadActivity = useCallback(async (signal?: AbortSignal) => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const [itemsData, statsData] = await Promise.all([
        api.get('/items', { limit: 3, sort: 'createdAt', order: 'desc' }, { signal }),
        api.get('/stats', undefined, { signal }),
      ]);
      setRecentItems(itemsData.items ?? []);
      setCommunityStats(statsData);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setRecentItems([]);
        setCommunityStats(null);
        setActivityError('Live community activity is temporarily unavailable.');
      }
    } finally {
      if (!signal?.aborted) setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadActivity(controller.signal);
    return () => controller.abort();
  }, [loadActivity]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const search = query.trim();
    const params = new URLSearchParams({ type, ...(search && { search }) });
    router.push(`/items?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-100/80 bg-gradient-to-br from-slate-50/90 via-white/92 to-primary-50/65 py-14 transition-colors duration-300 dark:border-slate-800/70 dark:from-slate-950/92 dark:via-slate-950/94 dark:to-primary-950/25 sm:py-16 lg:py-20">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.025] dark:opacity-[0.045]" style={{ backgroundImage: 'radial-gradient(circle, #1E63A7 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,.96fr)] lg:gap-14">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="min-w-0"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } } }}
              className="mb-6 inline-flex min-h-9 items-center gap-2 rounded-full border border-primary-100 bg-white/90 px-3.5 text-xs font-bold text-primary-700 shadow-sm dark:border-primary-500/20 dark:bg-slate-900/90 dark:text-primary-300"
            >
              <span className="size-2 rounded-full bg-secondary-500" aria-hidden="true" />
              <Sparkles size={13} aria-hidden="true" />
              {t('hero.badge')}
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="max-w-[13ch] font-display text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-slate-950 dark:text-white"
            >
              {t('hero.h1a')} <span className="text-primary-600 dark:text-primary-400">{t('hero.h1b')}</span><br />
              {t('hero.h1c')} <span className="text-secondary-600 dark:text-secondary-500">{t('hero.h1d')}</span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
              className="mt-5 max-w-[58ch] text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
            >
              {t('hero.sub')}
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
              className="mt-8 max-w-2xl rounded-3xl border border-slate-200/90 bg-white p-2 shadow-[0_18px_50px_-28px_rgba(16,35,63,.38)] dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Report type">
                  {(['LOST', 'FOUND'] as const).map((reportType) => {
                    const selected = type === reportType;
                    const Icon = reportType === 'LOST' ? Search : PackageCheck;
                    return (
                      <button
                        key={reportType}
                        type="button"
                        onClick={() => setType(reportType)}
                        aria-pressed={selected}
                        className={cn(
                          'flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors',
                          selected
                            ? reportType === 'LOST'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'bg-secondary-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                        )}
                      >
                        <Icon size={16} aria-hidden="true" />
                        {reportType === 'LOST' ? t('hero.lost', 'Lost') : t('hero.found', 'Found')}
                      </button>
                    );
                  })}
                </div>

                <label className="flex min-w-0 items-center gap-2 rounded-2xl px-3 focus-within:ring-2 focus-within:ring-primary-500">
                  <Search size={17} className="flex-shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Search lost and found items</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    maxLength={100}
                    autoComplete="off"
                    placeholder={t('hero.placeholder')}
                    className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </label>

                <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5">
                  <Search size={16} aria-hidden="true" />
                  {t('hero.search')}
                </button>
              </div>
            </motion.form>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3"
            >
              <Link href="/items/new?type=LOST" className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
                <Search size={17} aria-hidden="true" /> {t('hero.reportLost')}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/items/new?type=FOUND" className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold text-secondary-600 dark:text-secondary-500">
                <PackageCheck size={17} aria-hidden="true" /> {t('hero.postFound')}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>

            <motion.ul
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, ease: EASE } } }}
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              {TRUST_SIGNALS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5">
                  <Icon size={14} className="text-primary-500" aria-hidden="true" /> {text}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
            aria-label="Live community activity"
            className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/88 shadow-[0_24px_70px_-38px_rgba(16,35,63,.4)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/86"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', activityError ? 'bg-amber-500' : 'bg-secondary-500')} aria-hidden="true" />
                  <h2 className="text-sm font-bold text-slate-950 dark:text-white">Community activity</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Real approved reports from ReClaim</p>
              </div>
              {activityError && (
                <button type="button" onClick={() => loadActivity()} className="flex size-11 items-center justify-center rounded-xl text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10" aria-label="Retry community activity">
                  <RefreshCw size={17} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {activityLoading ? (
                <>
                  <div className="space-y-2 p-5"><div className="skeleton h-7 w-20" /><div className="skeleton h-3 w-28" /></div>
                  <div className="space-y-2 p-5"><div className="skeleton h-7 w-20" /><div className="skeleton h-3 w-28" /></div>
                </>
              ) : (
                <>
                  <div className="p-5">
                    <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-950 dark:text-white">
                      <Users size={20} className="text-primary-600" aria-hidden="true" />
                      {communityStats?.users?.total?.toLocaleString() ?? '—'}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">registered members</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 font-display text-2xl font-bold text-slate-950 dark:text-white">
                      <CheckCircle2 size={20} className="text-secondary-500" aria-hidden="true" />
                      {communityStats?.items?.returned?.toLocaleString() ?? '—'}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">items marked returned</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 sm:p-4">
              {activityLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => <div key={index} className="skeleton h-16 w-full rounded-2xl" />)}
                </div>
              ) : activityError ? (
                <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  {activityError}
                </div>
              ) : recentItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                  <PackageSearch size={26} className="mx-auto text-primary-500" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No approved reports yet</p>
                  <Link href="/items/new" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-primary-700 dark:text-primary-300">Start the community board <ArrowRight size={15} className="ml-1" /></Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentItems.map((item) => (
                    <li key={item.id}>
                      <Link href={`/items/${item.id}`} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/70">
                        <span className="relative flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                          {item.images?.[0]?.url ? <Image src={item.images[0].url} alt="" fill sizes="48px" className="object-cover" /> : <PackageSearch size={20} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">{item.title}</span>
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', item.type === 'LOST' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300')}>{item.type === 'LOST' ? 'Lost' : 'Found'}</span>
                          </span>
                          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin size={12} className="flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.locationArea || item.locationLabel}</span>
                            <span className="ml-auto flex flex-shrink-0 items-center gap-1"><Clock3 size={11} aria-hidden="true" />{timeAgo(item.createdAt)}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </div>

        <div className="mt-10 lg:mt-14">
          <ReclaimLogoCloud />
        </div>
      </div>
    </section>
  );
}
