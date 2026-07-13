'use client';

import { LogoIcon } from '@/components/shared/Logo';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function Loading() {
  const { t } = useLanguage();

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-200/70 bg-white/90 px-10 py-8 shadow-lg shadow-gray-200/40 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-black/30">
        <div className="animate-pulse">
          <LogoIcon size="lg" />
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:300ms]" />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('loading.label')}</span>
      </div>
    </div>
  );
}
