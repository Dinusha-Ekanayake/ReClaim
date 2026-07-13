'use client';

import { ChevronDown, Languages } from 'lucide-react';
import { LOCALES, type Locale } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

const LANGUAGE_TAGS: Record<Locale, string> = { en: 'en', si: 'si', ta: 'ta' };

export default function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={cn('relative inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800', className)}>
      <span className="sr-only">{t('language.choose')}</span>
      <Languages size={16} className="pointer-events-none absolute left-3 text-gray-400" aria-hidden="true" />
      <select
        value={locale}
        onChange={event => setLocale(event.target.value as Locale)}
        aria-label={t('language.choose')}
        className="min-h-11 min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-xl bg-transparent py-2 pl-9 pr-9 outline-none"
      >
        {LOCALES.map(language => (
          <option key={language.code} value={language.code} lang={LANGUAGE_TAGS[language.code]}>
            {language.native}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 text-gray-400" aria-hidden="true" />
    </label>
  );
}
