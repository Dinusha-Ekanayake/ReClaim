'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ShieldCheck, Zap, Users, MapPin, Clock, CheckCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock item cards shown in the right-side visual
const PREVIEW_ITEMS = [
  {
    emoji: '🎒',
    title: 'Black Backpack',
    sub: 'Lost · Colombo Fort',
    tag: 'LOST',
    time: '2 hrs ago',
    color: 'from-red-50 to-red-100/60',
    tagColor: 'bg-red-100 text-red-600',
    delay: '0s',
    y: 'translate-y-0',
  },
  {
    emoji: '🔑',
    title: 'Key Bundle',
    sub: 'Found · Kandy City',
    tag: 'FOUND',
    time: '5 hrs ago',
    color: 'from-emerald-50 to-emerald-100/60',
    tagColor: 'bg-emerald-100 text-emerald-600',
    delay: '0.3s',
    y: 'translate-y-3',
  },
  {
    emoji: '📱',
    title: 'Samsung Galaxy',
    sub: 'Found · Galle Road',
    tag: 'FOUND',
    time: '1 day ago',
    color: 'from-blue-50 to-blue-100/60',
    tagColor: 'bg-blue-100 text-blue-600',
    delay: '0.6s',
    y: 'translate-y-0',
  },
];

const MATCH_NOTIFICATION = {
  emoji: '🎉',
  title: 'Match found!',
  sub: 'Your lost wallet matches a found item 2km away',
};

const STATS_STRIP = [
  { icon: <ShieldCheck size={13} />, text: 'Verified claims' },
  { icon: <Zap size={13} />,         text: 'AI matching' },
  { icon: <Users size={13} />,       text: '1,200+ users' },
];

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ type, ...(query && { search: query }) });
    router.push(`/items?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40 min-h-[620px] flex items-center">

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full
                        -translate-y-1/3 translate-x-1/3 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full
                        translate-y-1/3 -translate-x-1/4 blur-3xl animate-float" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: Text & Search ─────────────────────────────── */}
          <div className="animate-fade-in-up">

            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-blue-100
                            text-blue-700 rounded-full text-xs font-bold shadow-sm mb-7">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <Sparkles size={12} className="text-blue-500" />
              Smart AI-Powered Matching
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-display font-extrabold
                           text-gray-900 leading-[1.08] tracking-tight mb-5">
              Find what{' '}
              <span className="gradient-text">matters.</span>
              <br />
              Return what&apos;s{' '}
              <span className="relative inline-block">
                <span className="gradient-text">lost.</span>
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
            </h1>

            {/* Subheading */}
            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              ReClaim connects finders and owners through intelligent matching, real-time chat, and secure verification — bringing Sri Lanka&apos;s communities together.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 p-2
                         flex flex-col sm:flex-row gap-2 max-w-lg
                         border border-gray-100 mb-6">
              <div className="flex bg-gray-100 rounded-xl p-1 flex-shrink-0">
                {(['LOST', 'FOUND'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                      type === t
                        ? t === 'LOST'
                          ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                          : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'text-gray-500 hover:text-gray-900')}>
                    {t === 'LOST' ? '🔍 Lost' : '📦 Found'}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, category, location…"
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent py-1" />
              </div>
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 flex-shrink-0">
                <Search size={14} />
                Search
              </button>
            </form>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <a href="/items/new?type=LOST"
                className="text-sm font-semibold text-red-600 hover:text-red-700
                           flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs">+</span>
                Report lost item
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </a>
              <span className="text-gray-200 select-none">|</span>
              <a href="/items/new?type=FOUND"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700
                           flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">+</span>
                Post found item
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-5">
              {STATS_STRIP.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <span className="text-primary-500">{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Animated Visual ──────────────────────────── */}
          <div className="hidden lg:flex flex-col items-center justify-center relative animate-fade-in-up animate-delay-300">

            {/* Outer decorative ring */}
            <div className="absolute w-[420px] h-[420px] rounded-full border border-dashed border-blue-200/60 animate-spin"
              style={{ animationDuration: '40s' }} />
            <div className="absolute w-[340px] h-[340px] rounded-full border border-dashed border-emerald-200/40 animate-spin"
              style={{ animationDuration: '28s', animationDirection: 'reverse' }} />

            {/* Center phone-ish frame */}
            <div className="relative z-10 w-64">

              {/* Item cards feed */}
              <div className="space-y-3">
                {PREVIEW_ITEMS.map((item, i) => (
                  <div key={item.title}
                    className={cn(
                      'bg-white rounded-2xl border border-gray-100 shadow-md p-4',
                      'flex items-center gap-3 animate-bounce-in hover:shadow-lg',
                      'transition-shadow duration-300',
                      item.y,
                    )}
                    style={{ animationDelay: `${i * 0.25 + 0.5}s` }}>
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br',
                      item.color,
                    )}>
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', item.tagColor)}>
                          {item.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <MapPin size={10} className="flex-shrink-0" />
                        <span className="truncate">{item.sub}</span>
                        <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                          <Clock size={9} /> {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Match notification badge */}
              <div className="absolute -bottom-10 -right-10 z-20 animate-bounce-in"
                style={{ animationDelay: '1.2s' }}>
                <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-3 w-52">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-base">
                      {MATCH_NOTIFICATION.emoji}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{MATCH_NOTIFICATION.title}</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{MATCH_NOTIFICATION.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                    <CheckCircle size={11} className="text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600">87% confidence match</span>
                  </div>
                </div>
              </div>

              {/* Active users badge */}
              <div className="absolute -top-6 -left-10 z-20 animate-bounce-in" style={{ animationDelay: '0.8s' }}>
                <div className="bg-white rounded-xl shadow-lg border border-blue-100 px-3 py-2 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {['bg-blue-400', 'bg-purple-400', 'bg-amber-400'].map((c, i) => (
                      <div key={i} className={cn('w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-bold', c)}>
                        {['D', 'K', 'A'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">12 online now</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                </div>
              </div>

            </div>

            {/* Floating item icons */}
            {[
              { emoji: '💍', pos: 'top-4 right-2', delay: '0s' },
              { emoji: '👜', pos: 'bottom-8 left-0', delay: '1s' },
              { emoji: '🎧', pos: 'top-1/2 -right-4', delay: '0.5s' },
            ].map(({ emoji, pos, delay }) => (
              <div key={emoji}
                className={`absolute ${pos} w-12 h-12 bg-white rounded-2xl shadow-lg border border-gray-100
                            flex items-center justify-center text-2xl animate-float z-10`}
                style={{ animationDelay: delay }}>
                {emoji}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
