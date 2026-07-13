'use client';

import Logo from '@/components/shared/Logo';
import LanguageSelector from '@/components/shared/LanguageSelector';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="relative min-h-[100dvh] overflow-hidden bg-gray-50/80 px-4 py-4 outline-none dark:bg-gray-950 sm:grid sm:place-items-center sm:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-30"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 15% 10%, rgba(37,99,235,0.14), transparent 34%)',
            'radial-gradient(circle at 88% 85%, rgba(16,185,129,0.12), transparent 32%)',
          ].join(','),
        }}
      />

      <div className="relative mx-auto w-full max-w-md">
        <header className="mb-3 flex min-h-16 items-center justify-between gap-3 px-1">
          <Logo size="sm" />
          <LanguageSelector />
        </header>
        <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30 sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
