import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-display font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
