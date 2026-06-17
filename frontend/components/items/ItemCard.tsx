'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import { cn, timeAgo, getStatusColor, getStatusLabel, truncate } from '@/lib/utils';

const CATEGORY_EMOJI: Record<string, string> = {
  Electronics: '📱', 'Bags & Wallets': '👜', 'Clothing & Accessories': '👗',
  Jewelry: '💍', Keys: '🔑', 'Documents & Cards': '📄',
  'Books & Stationery': '📚', 'Sports Equipment': '⚽', Pets: '🐾',
  Vehicles: '🚗', 'Musical Instruments': '🎸', 'Toys & Games': '🎮', Other: '📦',
};

interface ItemCardProps {
  item: any;
  showStatus?: boolean;
  className?: string;
}

export default function ItemCard({ item, showStatus = false, className }: ItemCardProps) {
  const primaryImage = item.images?.[0]?.url;
  const isLost = item.type === 'LOST';
  const catEmoji = CATEGORY_EMOJI[item.category] ?? '📦';

  return (
    <Link href={`/items/${item.id}`}
      className={cn(
        'group block bg-white rounded-2xl border border-gray-100 overflow-hidden',
        'shadow-sm hover:shadow-xl hover:-translate-y-1.5',
        'transition-all duration-300',
        className
      )}>

      {/* ── Image area ─────────────────────────────────────────── */}
      <div className="relative h-48 overflow-hidden bg-gray-50">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Placeholder with category colour */
          <div className={cn(
            'h-full flex flex-col items-center justify-center gap-2',
            isLost ? 'bg-red-50' : 'bg-emerald-50'
          )}>
            <span className="text-5xl">{catEmoji}</span>
            <span className="text-xs font-medium text-gray-400">{item.category}</span>
          </div>
        )}

        {/* Bottom gradient fade so badges pop on busy images */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* LOST / FOUND pill */}
        <span className={cn(
          'absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide shadow-sm',
          isLost
            ? 'bg-red-500 text-white shadow-red-200'
            : 'bg-emerald-500 text-white shadow-emerald-200'
        )}>
          {isLost ? '🔍 LOST' : '📦 FOUND'}
        </span>

        {/* Status badge (dashboard / owner view) */}
        {showStatus && item.status !== 'ACTIVE' && (
          <span className={cn(
            'absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm',
            getStatusColor(item.status)
          )}>
            {getStatusLabel(item.status)}
          </span>
        )}

        {/* Hover overlay arrow */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100
                        transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
            <ArrowRight size={14} className="text-gray-700" />
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="p-4">
        {/* Title + category */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display font-semibold text-gray-900 text-sm leading-snug
                         line-clamp-1 group-hover:text-primary-600 transition-colors">
            {item.title}
          </h3>
          <span className="flex-shrink-0 text-[11px] font-medium text-gray-500
                           bg-gray-100 px-2 py-0.5 rounded-full leading-5">
            {item.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mb-3.5 line-clamp-2 leading-relaxed">
          {truncate(item.description, 90)}
        </p>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="flex-shrink-0 text-gray-300" />
            <span className="truncate">{item.locationLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="flex-shrink-0 text-gray-300" />
            <span>{timeAgo(item.dateLostFound)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3.5 pt-3 border-t border-gray-50 flex items-center justify-between">
          {/* User avatar + name */}
          <div className="flex items-center gap-2">
            {item.user?.avatarUrl ? (
              <Image src={item.user.avatarUrl} alt={item.user.name}
                width={22} height={22} className="rounded-full object-cover ring-1 ring-gray-100" />
            ) : (
              <div className="w-[22px] h-[22px] rounded-full bg-primary-100 text-primary-600
                              text-[9px] flex items-center justify-center font-bold ring-1 ring-gray-100">
                {item.user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">
              {item.user?.name}
            </span>
          </div>

          {/* Comments + view */}
          <div className="flex items-center gap-3 text-gray-400">
            {item._count?.comments > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare size={11} />
                {item._count.comments}
              </span>
            )}
            <span className="text-xs text-primary-600 font-semibold
                             group-hover:underline group-hover:text-primary-700 transition-colors">
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
