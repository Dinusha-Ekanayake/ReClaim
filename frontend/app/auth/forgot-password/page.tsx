'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, Mail } from 'lucide-react';
import AuthShell from '@/app/auth/AuthShell';
import { sameOriginResetPath } from '@/app/auth/auth-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import api, { ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const requestId = useRef(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [developmentResetPath, setDevelopmentResetPath] = useState<string | null>(null);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    setDevelopmentResetPath(null);
    try {
      const data = await api.post('/auth/forgot-password', { email: email.trim() });
      if (currentRequest !== requestId.current) return;
      setDevelopmentResetPath(sameOriginResetPath(data.devResetUrl));
      setComplete(true);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError(requestError instanceof ApiError ? requestError.message : t('forgot.error'));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  const restart = () => {
    requestId.current += 1;
    setComplete(false);
    setDevelopmentResetPath(null);
    setError('');
  };

  return (
    <AuthShell>
      <Link href="/auth/login" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:text-primary-400">
        <ArrowLeft size={16} aria-hidden="true" /> {t('forgot.back')}
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white">{t('forgot.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t('forgot.subtitle')}</p>
      </div>

      {complete ? (
        <div className="space-y-4">
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={23} className="mb-2" aria-hidden="true" />
            <p className="text-sm leading-6">{t('forgot.success')}</p>
          </div>
          {developmentResetPath && (
            <Link href={developmentResetPath} className="btn-primary flex min-h-12 w-full items-center justify-center text-center">
              {t('forgot.devLink')}
            </Link>
          )}
          <button type="button" onClick={restart} className="btn-outline min-h-12 w-full">
            {t('forgot.another')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                id="reset-email"
                name="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                className="input-field min-h-12 pl-10"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
            {loading ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
