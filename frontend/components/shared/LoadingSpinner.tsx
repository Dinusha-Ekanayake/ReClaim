import { cn } from '@/lib/utils';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export function LoadingSpinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' };
  return (
    <div className={cn('rounded-full border-gray-200 border-t-primary-600 animate-spin', sizes[size], className)} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-gray-100">
          <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
