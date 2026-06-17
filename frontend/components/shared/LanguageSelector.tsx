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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl
                   text-gray-600 hover:text-gray-900 hover:bg-gray-100
                   transition-all duration-200 text-sm font-medium">
        <Globe size={16} className="text-gray-400" />
        <span className="hidden sm:block">{current.flag} {current.native}</span>
        <span className="sm:hidden">{current.flag}</span>
        <ChevronDown size={13} className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100
                        z-50 overflow-hidden animate-fade-in">
          {LOCALES.map(l => (
            <button key={l.code}
              onClick={() => { setLocale(l.code as Locale); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors',
                locale === l.code
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
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
