'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import AuthShell from '@/app/auth/AuthShell';
import { authHref, nextDestination, sameOriginVerificationPath, validateNextPath } from '@/app/auth/auth-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ApiError } from '@/lib/api';
import { writeSessionStorage } from '@/lib/browserStorage';
import { useAuthStore } from '@/lib/store/authStore';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const register = useAuthStore(state => state.register);
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const isLoading = useAuthStore(state => state.isLoading);
  const requestId = useRef(0);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const rawNext = searchParams.get('next');
  const destination = nextDestination(rawNext);
  const passwordBytes = new TextEncoder().encode(form.password).length;
  const passwordRules = [
    { key: 'length', label: t('register.ruleLength'), valid: form.password.length >= 8 },
    { key: 'upper', label: t('register.ruleUpper'), valid: /[A-Z]/.test(form.password) },
    { key: 'lower', label: t('register.ruleLower'), valid: /[a-z]/.test(form.password) },
    { key: 'number', label: t('register.ruleNumber'), valid: /\d/.test(form.password) },
    { key: 'bytes', label: t('register.ruleBytes'), valid: passwordBytes <= 72 },
  ];

  useEffect(() => {
    if (isInitialized && user) router.replace(destination);
  }, [destination, isInitialized, router, user]);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const update = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    if (name.length < 2) {
      setError(t('register.nameError'));
      return;
    }
    if (passwordRules.some(rule => !rule.valid)) {
      setError(t('register.passwordError'));
      return;
    }

    const currentRequest = ++requestId.current;
    try {
      const result = await register(name, form.email.trim(), form.password);
      if (currentRequest !== requestId.current) return;
      writeSessionStorage('pendingVerificationEmail', form.email.trim());
      const developmentPath = sameOriginVerificationPath(result.devVerificationUrl);
      if (developmentPath) {
        router.replace(developmentPath);
        return;
      }
      const params = new URLSearchParams({ registered: 'true' });
      const validatedNext = validateNextPath(rawNext);
      if (validatedNext) params.set('next', validatedNext);
      router.replace(`/auth/verify-email?${params.toString()}`);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError(requestError instanceof ApiError ? requestError.message : t('register.error'));
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
        <h1 className="text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white">{t('register.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t('register.subtitle')}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('register.hasAccount')}{' '}
          <Link href={authHref('/auth/login', rawNext)} className="font-semibold text-primary-700 hover:underline dark:text-primary-400">
            {t('register.signIn')}
          </Link>
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('register.name')}</label>
          <input
            id="register-name"
            name="name"
            type="text"
            value={form.name}
            onChange={event => update('name', event.target.value)}
            placeholder={t('register.namePlaceholder')}
            required
            minLength={2}
            maxLength={50}
            autoComplete="name"
            className="input-field min-h-12"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
          <input
            id="register-email"
            name="email"
            type="email"
            value={form.email}
            onChange={event => update('email', event.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            className="input-field min-h-12"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
          <div className="relative">
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={event => update('password', event.target.value)}
              placeholder={t('register.passwordPlaceholder')}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              aria-describedby="password-requirements"
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
          <ul id="password-requirements" className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {passwordRules.map(rule => (
              <li key={rule.key} className={`flex items-center gap-1.5 text-xs ${rule.valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${rule.valid ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                  {rule.valid && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                </span>
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {isLoading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className="mt-5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
        {t('auth.legalRegister')}{' '}
        <Link href="/terms" className="font-medium text-primary-700 hover:underline dark:text-primary-400">{t('auth.terms')}</Link>{' '}
        {t('auth.and')}{' '}
        <Link href="/privacy" className="font-medium text-primary-700 hover:underline dark:text-primary-400">{t('auth.privacy')}</Link>.
      </p>
    </>
  );
}

function RegisterFallback() {
  const { t } = useLanguage();
  return (
    <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
      <LoaderCircle className="animate-spin text-primary-600" size={24} aria-hidden="true" />
      {t('loading.label')}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
