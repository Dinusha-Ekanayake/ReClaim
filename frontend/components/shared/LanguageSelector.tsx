'use client';
import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { LOCALES, type Locale } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find(l => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Choose language"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                   text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800
                   transition-all duration-200 text-sm font-medium">
        <Globe size={16} className="text-gray-400" />
        <span className="hidden sm:block">{current.flag} {current.native}</span>
        <span className="sm:hidden">{current.flag}</span>
        <ChevronDown size={13} className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800
                        z-50 overflow-hidden animate-fade-in p-1.5">
          {LOCALES.map(l => (
            <button key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={locale === l.code}
              onClick={() => { setLocale(l.code as Locale); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left rounded-xl transition-colors',
                locale === l.code
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}>
              <span className="text-lg">{l.flag}</span>
              <div>
                <div className="font-medium leading-none">{l.native}</div>
                <div className="text-xs text-gray-400 mt-0.5">{l.label}</div>
              </div>
              {locale === l.code && (
                <span className="ml-auto w-2 h-2 rounded-full bg-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
