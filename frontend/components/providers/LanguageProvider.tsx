'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { type Locale, translations } from '@/lib/i18n';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (k, fb) => fb ?? k,
  formatNumber: value => String(value),
  formatDate: value => new Date(value).toLocaleDateString(),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
      return;
    }
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('si')) setLocaleState('si');
    else if (browserLanguage.startsWith('ta')) setLocaleState('ta');
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem('locale', next);
    document.cookie = `reclaim_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
  }, [locale]);

  const intlLocale = locale === 'si' ? 'si-LK' : locale === 'ta' ? 'ta-LK' : 'en-LK';
  const formatNumber = useCallback((value: number) => new Intl.NumberFormat(intlLocale).format(value), [intlLocale]);
  const formatDate = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => (
    new Intl.DateTimeFormat(intlLocale, options ?? { dateStyle: 'medium' }).format(new Date(value))
  ), [intlLocale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, formatNumber, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
