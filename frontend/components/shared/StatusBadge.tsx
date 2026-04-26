import { cn, getStatusColor, getStatusLabel } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'LOST' | 'FOUND';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge-status', getStatusColor(status), className)}>
      {getStatusLabel(status)}
    </span>
  );
}

export function TypeBadge({ type }: { type: 'LOST' | 'FOUND' }) {
  return type === 'LOST'
    ? <span className="badge-lost">🔍 LOST</span>
    : <span className="badge-found">📦 FOUND</span>;
}
