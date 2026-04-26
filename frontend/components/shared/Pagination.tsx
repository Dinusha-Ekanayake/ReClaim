import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pages, onPageChange, className }: PaginationProps) {
  if (pages <= 1) return null;

  const getPages = () => {
    const arr: (number | '...')[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) arr.push(i);
      if (page < pages - 2) arr.push('...');
      arr.push(pages);
    }
    return arr;
  };

  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              page === p
                ? 'bg-primary-600 text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
