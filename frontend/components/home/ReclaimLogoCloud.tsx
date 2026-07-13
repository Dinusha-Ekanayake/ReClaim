import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  HandHeart,
  MapPinned,
  MessagesSquare,
  ScanSearch,
  type LucideIcon,
} from 'lucide-react';

type Capability = {
  name: string;
  detail: string;
  icon: LucideIcon;
  iconClass: string;
  surfaceClass: string;
};

const CAPABILITIES: Capability[] = [
  {
    name: 'Smart Match',
    detail: 'Similarity scoring',
    icon: ScanSearch,
    iconClass: 'text-blue-600 dark:text-blue-300',
    surfaceClass: 'bg-blue-50 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20',
  },
  {
    name: 'Location Aware',
    detail: 'Nearby discoveries',
    icon: MapPinned,
    iconClass: 'text-emerald-600 dark:text-emerald-300',
    surfaceClass: 'bg-emerald-50 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20',
  },
  {
    name: 'Verified Claims',
    detail: 'Owner-only checks',
    icon: BadgeCheck,
    iconClass: 'text-violet-600 dark:text-violet-300',
    surfaceClass: 'bg-violet-50 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-500/20',
  },
  {
    name: 'Private Chat',
    detail: 'Safe coordination',
    icon: MessagesSquare,
    iconClass: 'text-cyan-600 dark:text-cyan-300',
    surfaceClass: 'bg-cyan-50 ring-cyan-100 dark:bg-cyan-500/10 dark:ring-cyan-500/20',
  },
  {
    name: 'Live Updates',
    detail: 'Real-time alerts',
    icon: BellRing,
    iconClass: 'text-amber-600 dark:text-amber-300',
    surfaceClass: 'bg-amber-50 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20',
  },
  {
    name: 'Community Return',
    detail: 'People helping people',
    icon: HandHeart,
    iconClass: 'text-rose-600 dark:text-rose-300',
    surfaceClass: 'bg-rose-50 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20',
  },
];

export default function ReclaimLogoCloud() {
  return (
    <div className="relative mt-16 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20 lg:mt-20">
      <div
        aria-hidden="true"
        className="absolute inset-x-16 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/70 to-transparent"
      />

      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
            <ScanSearch size={20} strokeWidth={2.4} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">One connected recovery workflow</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">From first report to a safe return</p>
          </div>
        </div>

        <Link
          href="/how-it-works"
          className="group inline-flex min-h-10 items-center gap-1.5 self-start rounded-full px-3 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-300 dark:hover:bg-primary-500/10 sm:self-auto"
        >
          How ReClaim works
          <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <ul className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-white/10 md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {CAPABILITIES.map(({ name, detail, icon: Icon, iconClass, surfaceClass }) => (
          <li
            key={name}
            className="group flex min-h-28 items-center gap-3 px-4 py-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03] lg:flex-col lg:justify-center lg:text-center"
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 ${surfaceClass}`}>
              <Icon size={19} className={iconClass} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{name}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-slate-400 dark:text-slate-500">{detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
