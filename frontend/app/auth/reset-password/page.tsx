'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import AuthShell from '@/app/auth/AuthShell';
import { useLanguage } from '@/components/providers/LanguageProvider';
import api, { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const clearSession = useAuthStore(state => state.clearSession);
  const requestId = useRef(0);
  const [token, setToken] = useState(() => searchParams.get('token') || '');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const fragmentToken = fragment.get('token');
    if (fragmentToken) setToken(fragmentToken);
    url.searchParams.delete('token');
    fragment.delete('token');
    url.hash = fragment.size ? `#${fragment.toString()}` : '';
    const cleanPath = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', cleanPath);
  }, []);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const passwordBytes = new TextEncoder().encode(password).length;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(password) || passwordBytes > 72) {
      setError(t('reset.ruleError'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset.mismatch'));
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      if (currentRequest !== requestId.current) return;
      clearSession();
      setComplete(true);
      router.replace('/auth/login?reset=success');
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError(requestError instanceof ApiError ? requestError.message : t('reset.error'));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  if (complete) {
    return (
      <div role="status" className="py-4 text-center">
        <CheckCircle2 size={38} className="mx-auto mb-4 text-emerald-600" aria-hidden="true" />
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('reset.successTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t('reset.successBody')}</p>
        <Link href="/auth/login?reset=success" className="btn-primary mt-6 inline-flex min-h-12 items-center justify-center px-6">{t('reset.signIn')}</Link>
      </div>
    );
  }

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <div role="alert" className="py-4 text-center">
        <KeyRound size={36} className="mx-auto mb-4 text-red-500" aria-hidden="true" />
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('reset.invalidTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t('reset.invalidBody')}</p>
        <Link href="/auth/forgot-password" className="btn-primary mt-6 inline-flex min-h-12 items-center justify-center px-6">{t('reset.requestAnother')}</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white">{t('reset.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t('reset.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('reset.newPassword')}</label>
          <div className="relative">
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              aria-describedby="reset-password-hint"
              className="input-field min-h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              aria-pressed={showPassword}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <p id="reset-password-hint" className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{t('reset.ruleError')}</p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('reset.confirmPassword')}</label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="input-field min-h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(value => !value)}
              aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              aria-pressed={showConfirmPassword}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="space-y-2">
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <Link href="/auth/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
              {t('reset.requestAnother')}
            </Link>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {loading ? t('reset.submitting') : t('reset.submit')}
        </button>
      </form>
    </>
  );
}

function ResetFallback() {
  const { t } = useLanguage();
  return (
    <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <LoaderCircle className="animate-spin text-primary-600" size={24} aria-hidden="true" />
      {t('loading.label')}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
