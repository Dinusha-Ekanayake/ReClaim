'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, MessageSquare, CheckCircle, Shield, Zap, Users, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import ItemCard from '@/components/items/ItemCard';
import { Reveal } from '@/components/shared/motion';
import { CATEGORIES } from '@/lib/utils';

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setCount(Math.round(eased * target));
      if (elapsed < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return count;
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatCard({ icon, rawValue, numValue, label, bg, delay }:
  { icon: React.ReactNode; rawValue: string; numValue: number; label: string; bg: string; delay: string }) {
  const { ref, inView } = useInView();
  const count = useCountUp(numValue, 1600, inView);
  const displayValue = numValue > 0 ? (rawValue.includes('+') ? `${count.toLocaleString()}+` : `< ${count}`) : rawValue;

  return (
    <div ref={ref}
      className="card p-6 text-center group hover:-translate-y-1.5 transition-all duration-300
                 animate-fade-in-up"
      style={{ animationDelay: delay }}>
      <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-4
                      group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className={`text-3xl font-display font-extrabold text-gray-900 dark:text-white mb-1 ${inView ? 'animate-stat-pop' : ''}`}>
        {displayValue}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</div>
    </div>
  );
}

export function StatsSection() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/stats').then(setData).catch(() => {});
  }, []);

  const stats = [
    {
      icon: <Search className="text-primary-600" size={26} />,
      rawValue: data ? `${(data.items?.total ?? 0).toLocaleString()}+` : '—',
      numValue: data?.items?.total ?? 0,
      label: 'Items Reported',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      delay: '0s',
    },
    {
      icon: <CheckCircle className="text-emerald-500" size={26} />,
      rawValue: data ? `${(data.items?.returned ?? 0).toLocaleString()}+` : '—',
      numValue: data?.items?.returned ?? 0,
      label: 'Items Returned',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      delay: '0.1s',
    },
    {
      icon: <Users className="text-amber-500" size={26} />,
      rawValue: data ? `${(data.users?.total ?? 0).toLocaleString()}+` : '—',
      numValue: data?.users?.total ?? 0,
      label: 'Registered Users',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      delay: '0.2s',
    },
    {
      icon: <Zap className="text-purple-500" size={26} />,
      rawValue: data ? `${data.successRate ?? 0}%` : '—',
      numValue: data?.successRate ?? 0,
      label: 'Success Rate',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      delay: '0.3s',
    },
  ];

  return (
    <section className="py-16 bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  const { ref, inView } = useInView(0.1);

  const steps = [
    {
      step: '01', emoji: '📝',
      icon: <Search size={26} />,
      title: 'Post or Search',
      desc: 'Report your lost item or post something you found. Add photos, describe it clearly, and pin the location on a map.',
      color: 'text-primary-600',
      bg: 'bg-blue-50',
      ring: 'ring-blue-200',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      step: '02', emoji: '🤖',
      icon: <Zap size={26} />,
      title: 'AI Smart Match',
      desc: 'Our algorithm scores lost/found pairs by category, keywords, GPS location, date, and AI semantic embeddings.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-200',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      step: '03', emoji: '💬',
      icon: <MessageSquare size={26} />,
      title: 'Connect & Verify',
      desc: 'Chat securely inside ReClaim. Claimants answer hidden verification questions only the true owner would know.',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-200',
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      step: '04', emoji: '🎉',
      icon: <CheckCircle size={26} />,
      title: 'Reunited!',
      desc: 'Approve the claim, arrange the handover, and mark the item returned. Another happy reunion for the community.',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      ring: 'ring-purple-200',
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900 relative overflow-hidden transition-colors duration-500">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" ref={ref}>
          <div className="section-pill mx-auto mb-4">
            <TrendingUp size={13} /> How it works
          </div>
          <h2 className={`text-4xl sm:text-5xl font-display font-extrabold text-gray-900 dark:text-white mb-4
                          ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            Four steps to a reunion
          </h2>
          <p className={`text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto
                        ${inView ? 'animate-fade-in-up animate-delay-100' : 'opacity-0'}`}>
            Simple. Secure. Smart.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.step}
              className={`relative group ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(100%-1px)] w-6 z-10">
                  <div className="h-0.5 bg-gradient-to-r from-gray-200 to-gray-100 mt-[18px]" />
                  <ArrowRight size={14} className="text-gray-300 absolute -right-1 -top-[7px]" />
                </div>
              )}

              <div className="card p-6 h-full group-hover:-translate-y-2 transition-all duration-300
                              group-hover:shadow-lg dark:bg-gray-800/60">
                {/* Step number */}
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg
                                 bg-gradient-to-br ${step.gradient} text-white text-xs font-bold
                                 mb-5 shadow-sm`}>
                  {i + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${step.bg} dark:bg-white/5 ring-4 ${step.ring}/30 dark:ring-white/5
                                 flex items-center justify-center mb-4 ${step.color}
                                 group-hover:scale-110 transition-transform duration-300`}>
                  {step.icon}
                </div>

                <h3 className="font-display font-bold text-gray-900 dark:text-white text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/how-it-works"
            className="btn-outline inline-flex items-center gap-2 group">
            Learn more
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Categories Grid ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Electronics:             'bg-blue-50   hover:bg-blue-100   text-blue-600   ring-blue-200',
  'Bags & Wallets':        'bg-amber-50  hover:bg-amber-100  text-amber-600  ring-amber-200',
  'Clothing & Accessories':'bg-pink-50   hover:bg-pink-100   text-pink-600   ring-pink-200',
  Jewelry:                 'bg-purple-50 hover:bg-purple-100 text-purple-600 ring-purple-200',
  Keys:                    'bg-yellow-50 hover:bg-yellow-100 text-yellow-600 ring-yellow-200',
  'Documents & Cards':     'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 ring-indigo-200',
  'Books & Stationery':    'bg-orange-50 hover:bg-orange-100 text-orange-600 ring-orange-200',
  'Sports Equipment':      'bg-green-50  hover:bg-green-100  text-green-600  ring-green-200',
  Pets:                    'bg-rose-50   hover:bg-rose-100   text-rose-600   ring-rose-200',
  Vehicles:                'bg-slate-50  hover:bg-slate-100  text-slate-600  ring-slate-200',
  'Musical Instruments':   'bg-violet-50 hover:bg-violet-100 text-violet-600 ring-violet-200',
  'Toys & Games':          'bg-cyan-50   hover:bg-cyan-100   text-cyan-600   ring-cyan-200',
  Other:                   'bg-gray-50   hover:bg-gray-100   text-gray-600   ring-gray-200',
};

export function CategoriesGrid() {
  const { ref, inView } = useInView(0.15);

  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" ref={ref}>
          <div className="section-pill mx-auto mb-4">
            <Search size={13} /> Browse items
          </div>
          <h2 className={`text-4xl sm:text-5xl font-display font-extrabold text-gray-900 dark:text-white mb-3
                          ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            Browse by Category
          </h2>
          <p className={`text-gray-500 dark:text-gray-400 max-w-md mx-auto
                        ${inView ? 'animate-fade-in-up animate-delay-100' : 'opacity-0'}`}>
            Find items faster by exploring specific categories
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CATEGORIES.slice(0, 12).map((cat, i) => {
            const colors = CATEGORY_COLORS[cat.value] ?? CATEGORY_COLORS.Other;
            return (
              <Link
                key={cat.value}
                href={`/items?category=${encodeURIComponent(cat.value)}`}
                className={`group flex flex-col items-center gap-2.5 p-5 rounded-2xl
                            border border-transparent ring-2 ring-transparent
                            transition-all duration-250 hover:-translate-y-1 hover:shadow-md
                            dark:!bg-gray-900 dark:hover:!bg-gray-800 dark:ring-gray-800 dark:hover:ring-gray-700
                            ${colors} ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${0.05 * i}s` }}>
                <span className="text-3xl group-hover:scale-125 transition-transform duration-300 drop-shadow-sm">
                  {cat.icon}
                </span>
                <span className="text-xs font-semibold leading-tight text-center dark:text-gray-200">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Recent Items ─────────────────────────────────────────────────────────────
export function RecentItems() {
  const [lostItems, setLostItems]   = useState<any[]>([]);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/items', { type: 'LOST',  limit: 4, sort: 'createdAt', order: 'desc' }),
      api.get('/items', { type: 'FOUND', limit: 4, sort: 'createdAt', order: 'desc' }),
    ]).then(([l, f]) => {
      setLostItems(l.items);
      setFoundItems(f.items);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <div className="section-pill mx-auto mb-4">
            <Zap size={13} /> Latest activity
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-gray-900 dark:text-white mb-3">
            Recent Reports
          </h2>
          <p className="text-gray-500 dark:text-gray-400">See the latest lost and found items near you</p>
        </Reveal>

        {/* Lost */}
        <ItemGroup
          title="Recently Lost"
          dotColor="bg-red-500"
          href="/items?type=LOST"
          items={lostItems}
          loading={loading}
        />

        {/* Found */}
        <div className="mt-14">
          <ItemGroup
            title="Recently Found"
            dotColor="bg-emerald-500"
            href="/items?type=FOUND"
            items={foundItems}
            loading={loading}
          />
        </div>
      </div>
    </section>
  );
}

function ItemGroup({ title, dotColor, href, items, loading }:
  { title: string; dotColor: string; href: string; items: any[]; loading: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <h3 className="flex items-center gap-2.5 text-xl font-display font-bold text-gray-900 dark:text-white">
          <span className={`w-3 h-3 rounded-full ${dotColor} flex-shrink-0`} />
          {title}
        </h3>
        <Link href={href}
          className="group text-sm text-primary-600 font-semibold hover:text-primary-700
                     flex items-center gap-1 transition-colors">
          View all
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : items.map((item, i) => (
              <div key={item.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.08 * i}s` }}>
                <ItemCard item={item} />
              </div>
            ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
        <div className="flex gap-2 mt-4">
          <div className="skeleton h-3 w-1/2 rounded-full" />
          <div className="skeleton h-3 w-1/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
export function CTASection() {
  const { ref, inView } = useInView(0.2);

  return (
    <section ref={ref}
      className="py-24 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full
                      -translate-y-1/2 translate-x-1/4 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full
                      translate-y-1/2 -translate-x-1/4 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl
                         bg-white/15 backdrop-blur-sm border border-white/20 mb-8
                         ${inView ? 'animate-bounce-in' : 'opacity-0'}`}>
          <Shield size={40} className="text-white" />
        </div>

        <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold
                        text-white mb-6 leading-tight
                        ${inView ? 'animate-fade-in-up animate-delay-100' : 'opacity-0'}`}>
          Lost something<br />
          <span className="text-blue-200">valuable?</span>
        </h2>

        <p className={`text-lg text-blue-100 mb-12 max-w-xl mx-auto leading-relaxed
                       ${inView ? 'animate-fade-in-up animate-delay-200' : 'opacity-0'}`}>
          Post your lost item now and let our smart matching system work for you.
          Takes under 2 minutes. Free forever.
        </p>

        {/* CTA buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 justify-center
                        ${inView ? 'animate-fade-in-up animate-delay-300' : 'opacity-0'}`}>
          <Link href="/items/new?type=LOST"
            className="group relative inline-flex items-center justify-center gap-2.5
                       px-8 py-4 bg-white text-primary-700 font-bold rounded-2xl
                       hover:bg-blue-50 active:scale-95 transition-all duration-200
                       shadow-xl shadow-black/20 overflow-hidden">
            <span className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xl">🔍</span>
            Report Lost Item
          </Link>
          <Link href="/items/new?type=FOUND"
            className="inline-flex items-center justify-center gap-2.5
                       px-8 py-4 bg-white/15 text-white font-bold rounded-2xl
                       border-2 border-white/30 backdrop-blur-sm
                       hover:bg-white/25 active:scale-95 transition-all duration-200">
            <span className="text-xl">📦</span>
            Post Found Item
          </Link>
        </div>

        {/* Reassurance line */}
        <p className={`mt-8 text-xs text-blue-200/70 font-medium
                      ${inView ? 'animate-fade-in-up animate-delay-400' : 'opacity-0'}`}>
          No credit card required · Free for everyone · Moderated community
        </p>
      </div>
    </section>
  );
}
