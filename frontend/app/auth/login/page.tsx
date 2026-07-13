'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, Package } from 'lucide-react';
import AuthShell from '@/app/auth/AuthShell';
import { authHref, nextDestination } from '@/app/auth/auth-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ApiError } from '@/lib/api';
import { writeSessionStorage } from '@/lib/browserStorage';
import { useAuthStore } from '@/lib/store/authStore';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const login = useAuthStore(state => state.login);
  const clearSession = useAuthStore(state => state.clearSession);
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const isLoading = useAuthStore(state => state.isLoading);
  const requestId = useRef(0);
  const expiredHandled = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const rawNext = searchParams.get('next');
  const destination = nextDestination(rawNext);
  const expired = searchParams.get('expired') === 'true';
  const passwordReset = searchParams.get('reset') === 'success';
  const emailVerified = searchParams.get('verified') === 'true';

  useEffect(() => {
    if (!expired || expiredHandled.current) return;
    expiredHandled.current = true;
    clearSession();
    router.replace(authHref('/auth/login', rawNext));
  }, [clearSession, expired, rawNext, router]);

  useEffect(() => {
    if (isInitialized && user && !expired) router.replace(destination);
  }, [destination, expired, isInitialized, router, user]);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentRequest = ++requestId.current;
    setError('');
    try {
      await login(email.trim(), password);
      if (currentRequest === requestId.current) router.replace(destination);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      if (requestError instanceof ApiError && requestError.data?.code === 'EMAIL_NOT_VERIFIED') {
        writeSessionStorage('pendingVerificationEmail', email.trim());
        const params = new URLSearchParams();
        const next = searchParams.get('next');
        if (next) params.set('next', next);
        router.replace(`/auth/verify-email${params.size ? `?${params.toString()}` : ''}`);
        return;
      }
      setError(requestError instanceof ApiError ? requestError.message : t('login.error'));
    }
  };

  if (!isInitialized || user) {
    return (
      <div role="status" className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-sm text-gray-500 dark:text-gray-400">
        <LoaderCircle className="animate-spin text-primary-600" size={24} aria-hidden="true" />
        <span>{t('auth.redirecting')}</span>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white">{t('login.title')}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('login.subtitle')}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('login.noAccount')}{' '}
          <Link href={authHref('/auth/register', rawNext)} className="font-semibold text-primary-700 hover:underline dark:text-primary-400">
            {t('login.signUp')}
          </Link>
        </p>
      </div>

      {(expired || passwordReset || emailVerified) && (
        <div role="status" className={`mb-5 flex items-start gap-2.5 rounded-xl border p-3 text-sm ${expired
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
          {expired ? <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <span>{expired
            ? t('login.expired')
            : emailVerified
              ? t('login.verified', 'Email verified. Sign in to continue.')
              : t('login.resetSuccess')}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            maxLength={254}
            autoComplete="username"
            inputMode="email"
            className="input-field min-h-12"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
            <Link href="/auth/forgot-password" className="min-h-11 py-3 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
              {t('login.forgot')}
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
              maxLength={128}
              autoComplete="current-password"
              className="input-field min-h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              aria-pressed={showPassword}
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {isLoading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <Link href="/items" className="btn-outline flex min-h-12 w-full items-center justify-center gap-2">
        <Package size={17} aria-hidden="true" /> {t('login.browse')}
      </Link>

      <p className="mt-5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
        {t('auth.legalSignIn')}{' '}
        <Link href="/terms" className="font-medium text-primary-700 hover:underline dark:text-primary-400">{t('auth.terms')}</Link>{' '}
        {t('auth.and')}{' '}
        <Link href="/privacy" className="font-medium text-primary-700 hover:underline dark:text-primary-400">{t('auth.privacy')}</Link>.
      </p>
    </>
  );
}

function LoginFallback() {
  const { t } = useLanguage();
  return (
    <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <LoaderCircle className="animate-spin text-primary-600" size={24} aria-hidden="true" />
      {t('loading.label')}
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
