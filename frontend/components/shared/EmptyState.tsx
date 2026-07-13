'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/65 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/65', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" aria-hidden="true">
        {icon ?? <Inbox size={23} />}
      </div>
      <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">{description}</p>}
      {actionLabel && actionHref && <Link href={actionHref} className="btn-primary">{actionLabel}</Link>}
      {actionLabel && onAction && <button type="button" onClick={onAction} className="btn-primary">{actionLabel}</button>}
    </div>
  );
}
