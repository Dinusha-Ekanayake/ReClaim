'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Package,
  PackageOpen,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface CommunityStats {
  users: {
    total: number;
    newThisWeek: number;
  };
  items: {
    total: number;
    lost: number;
    found: number;
    returned: number;
    active: number;
    newThisWeek: number;
  };
  successRate: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function validateStats(value: unknown): CommunityStats {
  if (!isRecord(value) || !isRecord(value.users) || !isRecord(value.items)) {
    throw new Error('The statistics response was incomplete.');
  }

  const counts = [
    value.users.total,
    value.users.newThisWeek,
    value.items.total,
    value.items.lost,
    value.items.found,
    value.items.returned,
    value.items.active,
    value.items.newThisWeek,
  ];

  if (!counts.every(isCount) || !isCount(value.successRate) || value.successRate > 100) {
    throw new Error('The statistics response contained invalid values.');
  }

  return value as unknown as CommunityStats;
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="skeleton size-10 rounded-xl" />
      <div className="skeleton mt-5 h-8 w-20 rounded-lg" />
      <div className="skeleton mt-2 h-4 w-28 rounded" />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = 'primary',
}: {
  icon: typeof Package;
  label: string;
  value: number;
  suffix?: string;
  tone?: 'primary' | 'found';
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-xl',
          tone === 'found'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-3xl font-extrabold tabular-nums text-slate-950 dark:text-white">
        {value.toLocaleString()}{suffix}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </article>
  );
}

function BreakdownRow({
  icon: Icon,
  label,
  value,
  total,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  total: number;
  tone: 'lost' | 'found' | 'primary';
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const toneClasses = {
    lost: 'bg-red-500 text-red-600 dark:text-red-400',
    found: 'bg-emerald-600 text-emerald-700 dark:text-emerald-300',
    primary: 'bg-primary-600 text-primary-700 dark:text-primary-300',
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className={cn('inline-flex min-w-0 items-center gap-2 font-semibold', toneClasses.split(' ').slice(1).join(' '))}>
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
          {value.toLocaleString()} <span className="font-sans font-medium text-slate-400">({percentage}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div className={cn('h-full rounded-full', toneClasses.split(' ')[0])} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function ImpactPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError('');

    api.get<unknown>('/stats', undefined, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setStats(validateStats(data));
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setStats(null);
        setError(
          requestError instanceof Error && requestError.message.startsWith('The statistics response')
            ? requestError.message
            : 'Live community statistics are unavailable right now.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [requestKey]);

  const retry = () => setRequestKey((key) => key + 1);
  const hasActivity = Boolean(stats && (stats.items.total > 0 || stats.users.total > 0));

  return (
    <PublicLayout>
      <header className="border-b border-slate-200/80 bg-white/70 px-4 py-10 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/60 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary-50 px-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
            <BarChart3 size={14} aria-hidden="true" />
            Community impact
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_24rem] lg:items-end lg:gap-10">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Progress you can verify.
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              These totals come directly from ReClaim&apos;s public community statistics and update as reports move through the return process.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {loading && (
          <div aria-label="Loading community statistics" role="status" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <span className="sr-only">Loading community statistics</span>
            {Array.from({ length: 4 }, (_, index) => <StatSkeleton key={index} />)}
          </div>
        )}

        {!loading && error && (
          <section role="alert" className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/20 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">We could not load the live totals</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{error} No placeholder numbers are being shown.</p>
              </div>
            </div>
            <button type="button" onClick={retry} className="btn-outline mt-5 inline-flex w-full items-center justify-center gap-2 sm:mt-0 sm:w-auto sm:shrink-0">
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
          </section>
        )}

        {!loading && stats && (
          <>
            <section aria-label="Community totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard icon={Package} label="Approved public reports" value={stats.items.total} />
              <MetricCard icon={CheckCircle2} label="Items marked returned" value={stats.items.returned} tone="found" />
              <MetricCard icon={Users} label="Registered members" value={stats.users.total} />
              <MetricCard icon={BarChart3} label="Return rate" value={stats.successRate} suffix="%" tone="found" />
            </section>

            {!hasActivity && (
              <section role="status" className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <PackageOpen size={20} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">No community activity yet</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">The counters will update when the first member or approved report is recorded.</p>
                </div>
              </section>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-labelledby="breakdown-title">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 id="breakdown-title" className="font-display text-xl font-bold text-slate-950 dark:text-white">Report breakdown</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Each percentage uses all approved public reports as its base.</p>
                  </div>
                  <BarChart3 size={21} className="shrink-0 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                </div>
                <div className="space-y-5">
                  <BreakdownRow icon={Search} label="Lost reports" value={stats.items.lost} total={stats.items.total} tone="lost" />
                  <BreakdownRow icon={Package} label="Found reports" value={stats.items.found} total={stats.items.total} tone="found" />
                  <BreakdownRow icon={CheckCircle2} label="Returned reports" value={stats.items.returned} total={stats.items.total} tone="found" />
                  <BreakdownRow icon={Clock3} label="Currently active" value={stats.items.active} total={stats.items.total} tone="primary" />
                </div>
              </section>

              <aside className="rounded-3xl bg-primary-700 p-5 text-white shadow-sm sm:p-6" aria-labelledby="week-title">
                <Clock3 size={22} className="text-primary-100" aria-hidden="true" />
                <h2 id="week-title" className="mt-4 font-display text-xl font-bold">Last seven days</h2>
                <dl className="mt-5 divide-y divide-white/15">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-primary-100">New accounts</dt>
                    <dd className="font-mono text-lg font-bold tabular-nums">{stats.users.newThisWeek.toLocaleString()}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-primary-100">New approved reports</dt>
                    <dd className="font-mono text-lg font-bold tabular-nums">{stats.items.newThisWeek.toLocaleString()}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-primary-100">Active reports now</dt>
                    <dd className="font-mono text-lg font-bold tabular-nums">{stats.items.active.toLocaleString()}</dd>
                  </div>
                </dl>
              </aside>
            </div>

            <section className="mt-4 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="impact-cta-title">
              <div className="max-w-xl">
                <h2 id="impact-cta-title" className="font-display text-xl font-bold text-slate-950 dark:text-white">Help the next report reach the right person</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Add an accurate report or check the live community board for a possible match.</p>
              </div>
              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
                <Link href="/items/new" className="btn-primary inline-flex items-center justify-center gap-2">Post a report <ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href="/items" className="btn-outline inline-flex items-center justify-center">Browse reports</Link>
              </div>
            </section>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
