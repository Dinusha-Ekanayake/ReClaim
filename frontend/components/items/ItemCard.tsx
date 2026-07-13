'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Calendar, ImageIcon, MapPin, MessageSquare, PackageCheck, Search } from 'lucide-react';
import { cn, getAvatarFallback, getStatusColor, getStatusLabel, timeAgo, truncate } from '@/lib/utils';
import type { Item } from '@/types';

interface ItemCardProps {
  item: Item;
  showStatus?: boolean;
  className?: string;
  variant?: 'grid' | 'list';
}

export default function ItemCard({ item, showStatus = false, className, variant = 'grid' }: Readonly<ItemCardProps>) {
  const primaryImage = item.images?.[0]?.url;
  const isLost = item.type === 'LOST';
  const isList = variant === 'list';

  return (
    <Link
      href={`/items/${item.id}`}
      className={cn(
        'group block min-w-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/30',
        isList && 'sm:flex sm:min-h-48 sm:hover:translate-y-0',
        className,
      )}
    >
      <div className={cn('relative aspect-[4/3] min-h-44 overflow-hidden bg-slate-100 dark:bg-slate-800', isList && 'sm:aspect-auto sm:min-h-full sm:w-56 sm:shrink-0')}>
        {primaryImage ? (
          <Image src={primaryImage} alt={item.title} fill sizes={isList ? '(max-width: 640px) 100vw, 224px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
        ) : (
          <div className={cn('flex h-full min-h-44 flex-col items-center justify-center gap-2', isLost ? 'bg-red-50 text-red-400 dark:bg-red-500/10 dark:text-red-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300')}>
            <ImageIcon size={38} strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xs font-semibold">No photo</span>
          </div>
        )}

        <span className={cn('absolute left-3 top-3 inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold tracking-wide text-white shadow-sm', isLost ? 'bg-red-500' : 'bg-emerald-600')}>
          {isLost ? <Search size={13} aria-hidden="true" /> : <PackageCheck size={13} aria-hidden="true" />}
          {isLost ? 'Lost' : 'Found'}
        </span>

        {showStatus && item.status !== 'ACTIVE' && <span className={cn('absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm', getStatusColor(item.status))}>{getStatusLabel(item.status)}</span>}
      </div>

      <div className={cn('flex min-w-0 flex-col p-4', isList && 'sm:flex-1 sm:p-5')}>
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">{item.category}</p>
            <h3 className="mt-1 line-clamp-2 break-words font-display text-base font-bold leading-snug text-slate-950 transition-colors group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">{item.title}</h3>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-primary-50 group-hover:text-primary-700 dark:bg-slate-800 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-300" aria-hidden="true"><ArrowUpRight size={16} /></span>
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{truncate(item.description, isList ? 150 : 100)}</p>

        <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="shrink-0 text-primary-400" aria-hidden="true" /><span className="truncate">{item.locationArea || item.locationLabel}</span></span>
          <span className="flex items-center gap-1.5"><Calendar size={13} className="shrink-0 text-primary-400" aria-hidden="true" /><span>{timeAgo(item.dateLostFound)}</span></span>
        </div>

        <div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="flex min-w-0 items-center gap-2">
            {item.user?.avatarUrl ? <Image src={item.user.avatarUrl} alt="" width={26} height={26} className="size-6 shrink-0 rounded-full object-cover" /> : <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">{getAvatarFallback(item.user?.name)}</span>}
            <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{item.user?.name || 'Community member'}</span>
          </span>
          {!!item._count?.comments && <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400" aria-label={`${item._count.comments} comments`}><MessageSquare size={13} aria-hidden="true" />{item._count.comments}</span>}
        </div>
      </div>
    </Link>
  );
}
