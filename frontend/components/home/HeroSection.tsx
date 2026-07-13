'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Sparkles, ShieldCheck, Zap, LockKeyhole, MapPin, Clock, CheckCircle, PackageSearch, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGES } from '@/lib/images';
import ReclaimLogoCloud from './ReclaimLogoCloud';
import { useLanguage } from '@/components/providers/LanguageProvider';
import api from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { Item } from '@/types';

type CommunityStats = {
  users?: { total?: number };
  items?: { returned?: number };
};

const STATS_STRIP = [
  { icon: <ShieldCheck size={13} />, text: 'Verified claims' },
  { icon: <Zap size={13} />, text: 'AI matching' },
  { icon: <LockKeyhole size={13} />, text: 'Private by design' },
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

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get('/items', { limit: 3, sort: 'createdAt', order: 'desc' }, { signal: controller.signal }),
      api.get('/stats', undefined, { signal: controller.signal }),
    ])
      .then(([itemsData, statsData]) => {
        setRecentItems(itemsData.items ?? []);
        setCommunityStats(statsData);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setCommunityStats(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setActivityLoading(false);
      });
    return () => controller.abort();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const search = query.trim();
    const params = new URLSearchParams({ type, ...(search && { search }) });
    router.push(`/items?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40
                        dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/30
                        min-h-[520px] flex items-center transition-colors duration-500">

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 dark:bg-blue-500/10 rounded-full
                        -translate-y-1/3 translate-x-1/3 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 dark:bg-emerald-500/10 rounded-full
                        translate-y-1/3 -translate-x-1/4 blur-3xl animate-float" />
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-16 sm:pt-20 lg:pb-20 lg:pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: Text & Search ─────────────────────────────── */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-500/20
                         text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold shadow-sm mb-7"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <Sparkles size={12} className="text-blue-500" />
              {t('hero.badge')}
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-gray-900 dark:text-white leading-[1.08] tracking-tight mb-5"
            >
              {t('hero.h1a')} <span className="gradient-text">{t('hero.h1b')}</span>
              <br />
              {t('hero.h1c')}{' '}
              <span className="relative inline-block">
                <span className="gradient-text">{t('hero.h1d')}</span>
                <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 100 6" preserveAspectRatio="none">
                  <path d="M0 5 Q50 0 100 5" stroke="url(#ul)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="ul" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-lg"
            >
              {t('hero.sub')}
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-black/40 p-2
                         flex flex-col sm:flex-row gap-2 max-w-lg border border-gray-100 dark:border-gray-800 mb-6"
            >
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-shrink-0" role="group" aria-label="Report type">
                {(['LOST', 'FOUND'] as const).map(reportType => (
                  <button key={reportType} type="button" onClick={() => setType(reportType)} aria-pressed={type === reportType}
                    className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                      type === reportType
                        ? reportType === 'LOST'
                          ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                          : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
                    {reportType === 'LOST' ? `🔍 ${t('hero.lost', 'Lost')}` : `📦 ${t('hero.found', 'Found')}`}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  aria-label="Search lost and found items" maxLength={100} autoComplete="off"
                  placeholder={t('hero.placeholder')}
                  className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none bg-transparent py-1" />
              </div>
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 flex-shrink-0">
                <Search size={14} />
                {t('hero.search')}
              </button>
            </motion.form>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="flex flex-wrap items-center gap-4 mb-8"
            >
              <Link href="/items/new?type=LOST"
                className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-xs">+</span>
                {t('hero.reportLost')}
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </Link>
              <span className="text-gray-200 dark:text-gray-700 select-none">|</span>
              <Link href="/items/new?type=FOUND"
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs">+</span>
                {t('hero.postFound')}
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </Link>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="flex flex-wrap items-center gap-5"
            >
              {STATS_STRIP.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span className="text-primary-500">{icon}</span>
                  {text}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Photo + Animated Visual ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="hidden lg:flex flex-col items-center justify-center relative"
          >
            {/* Decorative rings */}
            <div className="absolute w-[440px] h-[440px] rounded-full border border-dashed border-blue-200/60 dark:border-blue-500/20 animate-spin"
              style={{ animationDuration: '40s' }} />
            <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-emerald-200/40 dark:border-emerald-500/20 animate-spin"
              style={{ animationDuration: '28s', animationDirection: 'reverse' }} />

            {/* Hero photo with glass card feed overlaid */}
            <div className="relative z-10 w-72">
              {/* Background photo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
                className="absolute -top-6 -right-12 w-56 h-72 rounded-3xl overflow-hidden shadow-2xl
                           ring-4 ring-white dark:ring-gray-900 rotate-3"
              >
                <Image src={IMAGES.heroPrimary} alt="People reconnecting with belongings"
                  fill className="object-cover" priority sizes="224px" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent" />
              </motion.div>

              {/* Item cards feed */}
              <div className="relative space-y-3 mt-8">
                {activityLoading ? [...Array(3)].map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-md dark:border-gray-800 dark:bg-gray-900/90">
                    <div className="skeleton size-12 rounded-xl" />
                    <div className="flex-1 space-y-2"><div className="skeleton h-3 w-2/3" /><div className="skeleton h-2.5 w-full" /></div>
                  </div>
                )) : recentItems.length > 0 ? recentItems.map((item, i) => (
                  <Link key={item.id} href={`/items/${item.id}`} aria-label={`${item.type === 'LOST' ? 'Lost' : 'Found'} item: ${item.title}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -30, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.35 + i * 0.12 }}
                      whileHover={{ scale: 1.025, x: 4 }}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"
                    >
                      <div className="relative flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                        {item.images?.[0]?.url ? (
                          <Image src={item.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                        ) : <PackageSearch size={21} aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <span className={cn(
                            'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                            item.type === 'LOST'
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                          )}>
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <MapPin size={10} className="flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.locationArea || item.locationLabel}</span>
                          <span className="ml-auto flex flex-shrink-0 items-center gap-1">
                            <Clock size={9} aria-hidden="true" /> {timeAgo(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                )) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/90 p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
                    <PackageSearch size={24} className="mx-auto mb-2 text-primary-500" aria-hidden="true" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('hero.noActivity', 'No active reports yet')}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('hero.startCommunity', 'Be the first to help your community.')}</p>
                  </div>
                )}
              </div>

              {/* Match notification badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275], delay: 1.2 }}
                className="absolute -bottom-10 -right-12 z-20"
              >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-emerald-100 dark:border-emerald-500/20 p-3 w-52">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-base">
                      <CheckCircle size={17} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {communityStats?.items?.returned
                          ? `${communityStats.items.returned.toLocaleString()} ${t('hero.returned', 'items returned')}`
                          : t('hero.safeReturns', 'Safer community returns')}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                        {t('hero.realStats', 'Live activity from approved ReClaim reports')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                    <CheckCircle size={11} className="text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Smart confidence scoring</span>
                  </div>
                </div>
              </motion.div>

              {/* Active users badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.9 }}
                className="absolute -top-10 -left-12 z-20"
              >
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-blue-100 dark:border-blue-500/20 px-3 py-2 flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                    <Users size={15} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {communityStats?.users?.total
                      ? `${communityStats.users.total.toLocaleString()} ${t('hero.members', 'community members')}`
                      : t('hero.communityPowered', 'Community powered')}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Floating item icons */}
            {[
              { emoji: '💍', pos: 'top-4 right-0', delay: '0s' },
              { emoji: '👜', pos: 'bottom-4 left-0', delay: '1s' },
              { emoji: '🎧', pos: 'top-1/2 -left-6', delay: '0.5s' },
            ].map(({ emoji, pos, delay }) => (
              <div key={emoji}
                className={`absolute ${pos} w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800
                            flex items-center justify-center text-2xl animate-float z-10`}
                style={{ animationDelay: delay }}>
                {emoji}
              </div>
            ))}
          </motion.div>
        </div>

        <ReclaimLogoCloud />
      </div>
    </section>
  );
}
