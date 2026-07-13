'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error', error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-[70vh] items-center justify-center px-4 py-16 outline-none">
      <div role="alert" className="card w-full max-w-lg p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={26} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
          ReClaim could not finish loading this page. The last action may not have completed, so check the page state before trying again.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary inline-flex items-center justify-center gap-2">
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
          <Link href="/" className="btn-secondary inline-flex items-center justify-center">Go to home</Link>
        </div>
      </div>
    </main>
  );
}
