'use client';
import Link from 'next/link';
import Image from 'next/image';
import { cn, getMatchScoreColor, getMatchScoreLabel, timeAgo } from '@/lib/utils';

interface MatchCardProps { match: any; itemType: 'LOST' | 'FOUND'; }

export default function MatchCard({ match, itemType }: MatchCardProps) {
  const counterItem = itemType === 'LOST' ? match.foundItem : match.lostItem;
  if (!counterItem) return null;

  const img = counterItem.images?.[0]?.url;
  const scoreColor = getMatchScoreColor(match.score);

  return (
    <Link href={`/items/${counterItem.id}`}
      className="card flex gap-3 p-3 hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {img ? (
          <Image src={img} alt={counterItem.title} fill className="object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center text-2xl">
            {itemType === 'LOST' ? '📦' : '🔍'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
            {counterItem.title}
          </p>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0', scoreColor)}>
            {match.score}%
          </span>
        </div>
        <p className="text-xs text-gray-500">{getMatchScoreLabel(match.score)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{counterItem.locationLabel}</p>
      </div>
    </Link>
  );
}
