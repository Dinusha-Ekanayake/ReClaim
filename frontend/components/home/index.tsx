'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  FileText,
  Gamepad2,
  Gem,
  KeyRound,
  Laptop,
  MessageSquare,
  Music2,
  PackageCheck,
  PawPrint,
  RefreshCw,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Trophy,
  Users,
  WandSparkles,
  Weight,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/components/providers/LanguageProvider';
import ItemCard from '@/components/items/ItemCard';
import { CATEGORIES, cn } from '@/lib/utils';
import type { Item } from '@/types';

interface CommunityStats {
  users: { total: number; newThisWeek: number };
  items: { total: number; returned: number; active: number; newThisWeek: number };
  successRate: number;
}

const CATEGORY_ICONS: Record<string, typeof Laptop> = {
  Electronics: Laptop,
  'Bags & Wallets': BriefcaseBusiness,
  'Clothing & Accessories': Shirt,
  Jewelry: Gem,
  Keys: KeyRound,
  'Documents & Cards': FileText,
  'Books & Stationery': BookOpen,
  'Sports Equipment': Weight,
  Pets: PawPrint,
  Vehicles: Car,
  'Musical Instruments': Music2,
  'Toys & Games': Gamepad2,
  Other: PackageCheck,
};

const PROCESS_STEPS = [
  {
    icon: Search,
    key: 'hiw.step1.title',
    fallback: 'Post or search',
    description: 'Share a clear report with photos, an area, and the date.',
  },
  {
    icon: WandSparkles,
    key: 'hiw.step2.title',
    fallback: 'Smart matching',
    description: 'ReClaim compares approved lost and found reports for useful signals.',
  },
  {
    icon: MessageSquare,
    key: 'hiw.step3.title',
    fallback: 'Connect and verify',
    description: 'Chat privately and use ownership questions before arranging a handover.',
  },
  {
    icon: CheckCircle2,
    key: 'hiw.step4.title',
    fallback: 'Return safely',
    description: 'Confirm the owner, complete the handover, and record the return.',
  },
] as const;

export function StatsSection() {
  const { t, formatNumber } = useLanguage();
  const [data, setData] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get<CommunityStats>('/stats', undefined, { signal }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setData(null);
      setError('Live community totals are temporarily unavailable.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const stats = [
    { icon: Search, value: data?.items.total, suffix: '', label: t('stats.reported') },
    { icon: CheckCircle2, value: data?.items.returned, suffix: '', label: t('stats.returned') },
    { icon: Users, value: data?.users.total, suffix: '', label: t('stats.users') },
    { icon: Trophy, value: data?.successRate, suffix: '%', label: t('stats.successRate') },
  ];

  return (
    <section className="border-b border-slate-100 bg-white/85 py-10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85" aria-label="Live ReClaim totals">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold hover:bg-amber-100 dark:hover:bg-amber-500/10"><RefreshCw size={16} aria-hidden="true" />Retry</button>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-card dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-4">
            {stats.map(({ icon: Icon, value, suffix, label }) => (
              <div key={label} className="min-w-0 bg-white p-4 dark:bg-slate-900 sm:p-5">
                <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><Icon size={16} className="shrink-0 text-primary-600 dark:text-primary-300" aria-hidden="true" /><span className="truncate">{label}</span></dt>
                <dd className="mt-2 font-display text-2xl font-extrabold text-slate-950 dark:text-white sm:text-3xl">{loading || value === undefined ? <span className="skeleton inline-block h-8 w-20 align-middle" /> : `${formatNumber(value)}${suffix}`}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section className="bg-slate-50/75 py-16 dark:bg-slate-900/65 sm:py-20" aria-labelledby="how-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-pill"><Sparkles size={13} aria-hidden="true" />Community recovery flow</p>
            <h2 id="how-heading" className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{t('hiw.title')}</h2>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{t('hiw.subtitle')} Every step keeps public details useful and ownership details private.</p>
          </div>
          <Link href="/how-it-works" className="btn-outline inline-flex w-fit items-center gap-2">{t('common.learnMore')}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>

        <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map(({ icon: Icon, key, fallback, description }, index) => (
            <li key={key} className="relative min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"><Icon size={20} aria-hidden="true" /></span>
                <span className="font-mono text-xs font-bold text-slate-300 dark:text-slate-600">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">{t(key, fallback)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CategoriesGrid() {
  return (
    <section className="bg-white/90 py-16 dark:bg-slate-950/90 sm:py-20" aria-labelledby="categories-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="section-pill"><Search size={13} aria-hidden="true" />Explore reports</p><h2 id="categories-heading" className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Browse by category</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Narrow the live community board without guessing a keyword.</p></div>
          <Link href="/items" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10 sm:self-auto">All reports<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CATEGORIES.slice(0, 12).map((category) => {
            const Icon = CATEGORY_ICONS[category.value] ?? PackageCheck;
            return (
              <Link key={category.value} href={`/items?category=${encodeURIComponent(category.value)}`} className="group flex min-h-28 min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/65 p-4 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm transition-transform group-hover:scale-105 dark:bg-slate-800 dark:text-primary-300"><Icon size={19} aria-hidden="true" /></span>
                <span className="mt-3 break-words text-xs font-bold leading-snug text-slate-800 dark:text-slate-100">{category.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RecentItems() {
  const { t } = useLanguage();
  const [lostItems, setLostItems] = useState<Item[]>([]);
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const [lost, found] = await Promise.all([
        api.get<{ items: Item[] }>('/items', { type: 'LOST', limit: 4, sort: 'createdAt', order: 'desc' }, { signal }),
        api.get<{ items: Item[] }>('/items', { type: 'FOUND', limit: 4, sort: 'createdAt', order: 'desc' }, { signal }),
      ]);
      setLostItems(lost.items ?? []);
      setFoundItems(found.items ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLostItems([]);
      setFoundItems([]);
      setError('Recent community reports are temporarily unavailable.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section className="bg-slate-50/75 py-16 dark:bg-slate-900/65 sm:py-20" aria-labelledby="recent-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="section-pill"><Sparkles size={13} aria-hidden="true" />Live community board</p><h2 id="recent-heading" className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Recent reports</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The latest approved lost and found reports across the community.</p></div>
          {error && <button type="button" onClick={() => void load()} className="btn-outline inline-flex w-fit items-center gap-2"><RefreshCw size={16} aria-hidden="true" />Retry</button>}
        </div>

        {error && <div role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">{error}</div>}

        <div className="mt-9 space-y-12">
          <ItemGroup title="Recently lost" type="LOST" href="/items?type=LOST" items={lostItems} loading={loading} viewAll={t('common.viewAll')} />
          <ItemGroup title="Recently found" type="FOUND" href="/items?type=FOUND" items={foundItems} loading={loading} viewAll={t('common.viewAll')} />
        </div>
      </div>
    </section>
  );
}

function ItemGroup({ title, type, href, items, loading, viewAll }: { title: string; type: 'LOST' | 'FOUND'; href: string; items: Item[]; loading: boolean; viewAll: string }) {
  const isLost = type === 'LOST';
  return (
    <section aria-label={title}>
      <div className="mb-5 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white"><span className={cn('size-2.5 rounded-full', isLost ? 'bg-red-500' : 'bg-emerald-500')} aria-hidden="true" />{title}</h3><Link href={href} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10">{viewAll}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((index) => <SkeletonCard key={index} />)}</div>
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <ItemCard key={item.id} item={item} />)}</div>
      ) : (
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5 text-center dark:border-slate-700 dark:bg-slate-900/70 sm:flex-row sm:text-left">
          <div><p className="text-sm font-bold text-slate-900 dark:text-white">No active {type.toLowerCase()} reports yet</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New approved reports will appear here automatically.</p></div>
          <Link href={`/items/new?type=${type}`} className="btn-outline inline-flex shrink-0 items-center gap-2">Post a report<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  );
}

function SkeletonCard() {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="skeleton aspect-[4/3]" /><div className="space-y-3 p-4"><div className="skeleton h-3 w-20" /><div className="skeleton h-5 w-4/5" /><div className="skeleton h-3 w-full" /><div className="skeleton h-10 w-full" /></div></div>;
}

export function CTASection() {
  const { t } = useLanguage();
  return (
    <section className="bg-white py-16 dark:bg-slate-950 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary-700 px-5 py-9 text-white shadow-card sm:px-9 sm:py-11 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          <div className="relative max-w-2xl"><span className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.12] ring-1 ring-white/20"><ShieldCheck size={24} aria-hidden="true" /></span><h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t('cta.h2')}</h2><p className="mt-3 text-sm leading-relaxed text-primary-100 sm:text-base">{t('cta.sub')}</p><p className="mt-3 text-xs font-semibold text-primary-200">No payment required · Private ownership checks · Community moderation</p></div>
          <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0 lg:flex-col xl:flex-row"><Link href="/items/new?type=LOST" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-primary-800 shadow-sm hover:bg-primary-50"><Search size={17} aria-hidden="true" />{t('cta.lost')}</Link><Link href="/items/new?type=FOUND" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/20"><PackageCheck size={17} aria-hidden="true" />{t('cta.found')}</Link></div>
        </div>
      </div>
    </section>
  );
}
