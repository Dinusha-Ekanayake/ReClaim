'use client';

import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200/80 bg-white/90 p-8 text-center shadow-xl shadow-gray-200/40 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-black/30 sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
            <SearchX size={30} aria-hidden="true" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-400">404</p>
          <h1 className="mt-2 text-3xl font-display font-bold text-gray-900 dark:text-white">{t('notFound.title')}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">{t('notFound.body')}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 px-5">
              <Home size={17} aria-hidden="true" /> {t('notFound.home')}
            </Link>
            <Link href="/items" className="btn-outline inline-flex min-h-12 items-center justify-center px-5">{t('notFound.browse')}</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
