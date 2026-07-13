'use client';
import { useEffect, useState } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import Link from 'next/link';
import {
  Package, CheckCircle, Search, Users, TrendingUp,
  Clock, Award, Heart, ArrowRight, BarChart2,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ target, suffix = '', duration = 1800 }:
  { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!started || target === 0) return;
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, started]);

  return <>{count.toLocaleString()}{suffix}</>;
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ label, value, max, color, icon }:
  { label: string; value: number; max: number; color: string; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {icon} {label}
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className={cn('h-3 rounded-full transition-all duration-1000 ease-out', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{pct}% of total</p>
    </div>
  );
}

export default function ImpactPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats').then(setStats)
      .catch(() => setError('Live community statistics are temporarily unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  const total    = stats?.items?.total    ?? 0;
  const lost     = stats?.items?.lost     ?? 0;
  const found    = stats?.items?.found    ?? 0;
  const returned = stats?.items?.returned ?? 0;
  const active   = stats?.items?.active   ?? 0;
  const users    = stats?.users?.total    ?? 0;
  const rate     = stats?.successRate     ?? 0;
  const newUsers = stats?.users?.newThisWeek ?? 0;
  const newItems = stats?.items?.newThisWeek ?? 0;

  return (
    <PublicLayout>
      {error && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">{error}</div>}
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-blue-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-sm font-semibold mb-6 border border-white/20">
            <BarChart2 size={14} /> Community Impact
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-extrabold mb-5 tracking-tight">
            Real Stories.<br />Real Impact.
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto leading-relaxed">
            Live totals from the ReClaim community, updated as members report and return items.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Hero stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: <Package size={24} className="text-primary-600" />, label: 'Total Items', value: total, suffix: '', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
            { icon: <CheckCircle size={24} className="text-emerald-600" />, label: 'Items Returned', value: returned, suffix: '', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
            { icon: <Users size={24} className="text-amber-600" />, label: 'Community Members', value: users, suffix: '', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
            { icon: <Award size={24} className="text-purple-600" />, label: 'Success Rate', value: rate, suffix: '%', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-100 dark:border-purple-500/20' },
          ].map(s => (
            <div key={s.label}
              className={cn('card p-6 text-center border', s.border, loading && 'animate-pulse')}>
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4', s.bg)}>
                {s.icon}
              </div>
              <div className="text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-1">
                {loading ? '—' : <AnimatedNumber target={s.value} suffix={s.suffix} />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* ── Item Breakdown ──────────────────────────────────── */}
          <div className="card p-8">
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BarChart2 size={20} className="text-primary-600" /> Item Breakdown
            </h2>
            {loading ? (
              <div className="space-y-6">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-8 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-6">
                <ProgressBar label="Lost Items" value={lost} max={total} color="bg-red-400" icon={<Search size={14} className="text-red-400" />} />
                <ProgressBar label="Found Items" value={found} max={total} color="bg-emerald-400" icon={<Package size={14} className="text-emerald-400" />} />
                <ProgressBar label="Returned" value={returned} max={total} color="bg-blue-500" icon={<CheckCircle size={14} className="text-blue-500" />} />
                <ProgressBar label="Still Active" value={active} max={total} color="bg-amber-400" icon={<Clock size={14} className="text-amber-400" />} />
              </div>
            )}
          </div>

          {/* ── Donut-style visual ──────────────────────────────── */}
          <div className="card p-8 flex flex-col items-center justify-center">
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6 self-start flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" /> Return Rate
            </h2>

            {/* Big circle stat */}
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="3.8" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.8"
                  strokeDasharray={`${loading ? 0 : rate} ${100 - (loading ? 0 : rate)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-display font-extrabold text-gray-900 dark:text-white">
                  {loading ? '—' : `${rate}%`}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Success rate</span>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              <strong className="text-gray-900 dark:text-white">{returned.toLocaleString()} items</strong> have been successfully returned to their owners through ReClaim.
            </p>
          </div>
        </div>

        {/* ── This week ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-500/10 dark:to-emerald-500/10 rounded-2xl border border-primary-100 dark:border-primary-500/20 p-8 mb-16">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock size={20} className="text-primary-600" /> Activity This Week
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'New users joined', value: newUsers, icon: <Users size={20} className="text-blue-600" />, bg: 'bg-blue-100 dark:bg-blue-500/20' },
              { label: 'New items posted', value: newItems, icon: <Package size={20} className="text-emerald-600" />, bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
              { label: 'Items still active', value: active, icon: <Search size={20} className="text-amber-600" />, bg: 'bg-amber-100 dark:bg-amber-500/20' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                    {loading ? '—' : s.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 mb-6">
            <Heart size={28} className="text-red-500 fill-red-500" />
          </div>
          <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">Be part of the story</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
            Every item you report adds to the impact. Help someone find what they've lost today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/items/new?type=LOST" className="btn-primary inline-flex items-center gap-2">
              🔍 Report Lost Item <ArrowRight size={16} />
            </Link>
            <Link href="/items" className="btn-outline inline-flex items-center gap-2">
              Browse All Items <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
