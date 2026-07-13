'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Sparkles, ShieldCheck, Zap, LockKeyhole, MapPin, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGES } from '@/lib/images';
import ReclaimLogoCloud from './ReclaimLogoCloud';

// Mock item cards shown in the right-side visual
const PREVIEW_ITEMS = [
  {
    emoji: '🎒', title: 'Black Backpack', sub: 'Lost · Colombo Fort', tag: 'LOST',
    time: '2 hrs ago', color: 'from-red-50 to-red-100/60 dark:from-red-500/10 dark:to-red-500/5',
    tagColor: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  },
  {
    emoji: '🔑', title: 'Key Bundle', sub: 'Found · Kandy City', tag: 'FOUND',
    time: '5 hrs ago', color: 'from-emerald-50 to-emerald-100/60 dark:from-emerald-500/10 dark:to-emerald-500/5',
    tagColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  {
    emoji: '📱', title: 'Samsung Galaxy', sub: 'Found · Galle Road', tag: 'FOUND',
    time: '1 day ago', color: 'from-blue-50 to-blue-100/60 dark:from-blue-500/10 dark:to-blue-500/5',
    tagColor: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  },
];

const MATCH_NOTIFICATION = {
  emoji: '🎉', title: 'Match found!',
  sub: 'Your lost wallet matches a found item 2km away',
};

const STATS_STRIP = [
  { icon: <ShieldCheck size={13} />, text: 'Verified claims' },
  { icon: <Zap size={13} />, text: 'AI matching' },
  { icon: <LockKeyhole size={13} />, text: 'Private by design' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');

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
              Smart AI-Powered Matching
            </motion.div>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-gray-900 dark:text-white leading-[1.08] tracking-tight mb-5"
            >
              Find what <span className="gradient-text">matters.</span>
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
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-lg"
            >
              ReClaim connects finders and owners through intelligent matching, real-time chat, and secure verification — bringing Sri Lanka&apos;s communities together.
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-black/40 p-2
                         flex flex-col sm:flex-row gap-2 max-w-lg border border-gray-100 dark:border-gray-800 mb-6"
            >
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-shrink-0" role="group" aria-label="Report type">
                {(['LOST', 'FOUND'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
                    className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                      type === t
                        ? t === 'LOST'
                          ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                          : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
                    {t === 'LOST' ? '🔍 Lost' : '📦 Found'}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  aria-label="Search lost and found items" maxLength={100} autoComplete="off"
                  placeholder="Search by name, category, location…"
                  className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none bg-transparent py-1" />
              </div>
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 flex-shrink-0">
                <Search size={14} />
                Search
              </button>
            </motion.form>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
              className="flex flex-wrap items-center gap-4 mb-8"
            >
              <Link href="/items/new?type=LOST"
                className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-xs">+</span>
                Report lost item
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </Link>
              <span className="text-gray-200 dark:text-gray-700 select-none">|</span>
              <Link href="/items/new?type=FOUND"
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 group transition-colors">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs">+</span>
                Post found item
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
                {PREVIEW_ITEMS.map((item, i) => (
                  <motion.div key={item.title}
                    initial={{ opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.18 }}
                    whileHover={{ scale: 1.04, x: 4 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md p-4
                               flex items-center gap-3 backdrop-blur-sm"
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br', item.color)}>
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
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
                  </motion.div>
                ))}
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
                      {MATCH_NOTIFICATION.emoji}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{MATCH_NOTIFICATION.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{MATCH_NOTIFICATION.sub}</p>
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
                  <div className="flex -space-x-1.5">
                    {['bg-blue-400', 'bg-purple-400', 'bg-amber-400'].map((c, i) => (
                      <div key={i} className={cn('w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[8px] font-bold', c)}>
                        {['D', 'K', 'A'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Community powered</span>
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
