'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, MessageSquare, Eye } from 'lucide-react';
import { cn, timeAgo, getStatusColor, getStatusLabel, truncate } from '@/lib/utils';

interface ItemCardProps {
  item: any;
  showStatus?: boolean;
  className?: string;
}

export default function ItemCard({ item, showStatus = false, className }: ItemCardProps) {
  const primaryImage = item.images?.[0]?.url;
  const isLost = item.type === 'LOST';

  return (
    <Link href={`/items/${item.id}`} className={cn('card block group', className)}>
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-5xl">
            {isLost ? '🔍' : '📦'}
          </div>
        )}
        {/* Type badge */}
        <span className={cn(
          'absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold',
          isLost ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        )}>
          {isLost ? 'LOST' : 'FOUND'}
        </span>
        {/* Status badge */}
        {showStatus && item.status !== 'ACTIVE' && (
          <span className={cn('absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold',
            getStatusColor(item.status))}>
            {getStatusLabel(item.status)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-display font-semibold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-primary-600 transition-colors">
            {item.title}
          </h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0">
            {item.category}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
          {truncate(item.description, 90)}
        </p>

        <div className="flex flex-col gap-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{item.locationLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="flex-shrink-0" />
            <span>{timeAgo(item.dateLostFound)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.user?.avatarUrl ? (
              <Image src={item.user.avatarUrl} alt={item.user.name} width={20} height={20}
                className="rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] flex items-center justify-center font-bold">
                {item.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-xs text-gray-500">{item.user?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            {item._count?.comments > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare size={11} />
                {item._count.comments}
              </span>
            )}
            <span className="text-xs text-primary-600 font-medium group-hover:underline">
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
