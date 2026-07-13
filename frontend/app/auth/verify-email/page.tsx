'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, LoaderCircle, MailCheck } from 'lucide-react';
import AuthShell from '@/app/auth/AuthShell';
import { nextDestination, sameOriginVerificationPath } from '@/app/auth/auth-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import api, { ApiError } from '@/lib/api';
import { readSessionStorage, removeSessionStorage, writeSessionStorage } from '@/lib/browserStorage';
import { useAuthStore } from '@/lib/store/authStore';

type VerificationState = 'pending' | 'verifying' | 'verified' | 'invalid' | 'retryable';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const verifyEmail = useAuthStore(state => state.verifyEmail);
  const startedToken = useRef<string | null>(null);
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [destination] = useState(() => nextDestination(searchParams.get('next')));
  const [state, setState] = useState<VerificationState>('pending');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

  useEffect(() => {
    setEmail(readSessionStorage('pendingVerificationEmail') || '');
  }, []);

  useEffect(() => {
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      if (token) setState('invalid');
      return;
    }
    if (startedToken.current === token) return;
    startedToken.current = token;
    setState('verifying');
    void verifyEmail(token)
      .then(() => {
        removeSessionStorage('pendingVerificationEmail');
        setState('verified');
        const params = new URLSearchParams({ verified: 'true' });
        if (destination !== '/dashboard') params.set('next', destination);
        window.setTimeout(() => router.replace(`/auth/login?${params.toString()}`), 900);
      })
      .catch((error) => {
        setMessage(error instanceof ApiError ? error.message : t('verify.error', 'We could not verify this email.'));
        setState(error instanceof ApiError && error.status === 400 ? 'invalid' : 'retryable');
      });
  }, [attempt, destination, router, t, token, verifyEmail]);

  const retryVerification = () => {
    if (!/^[0-9a-f]{64}$/i.test(token)) return;
    startedToken.current = null;
    setMessage('');
    setAttempt((current) => current + 1);
  };

  const resend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setResending(true);
    try {
      const result = await api.post<{ message: string; devVerificationUrl?: string }>('/auth/resend-verification', { email: email.trim() });
      writeSessionStorage('pendingVerificationEmail', email.trim());
      const developmentPath = sameOriginVerificationPath(result.devVerificationUrl);
      if (developmentPath) {
        router.replace(developmentPath);
        return;
      }
      setState('pending');
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t('verify.error', 'We could not send a new verification link.'));
    } finally {
      setResending(false);
    }
  };

  if (state === 'verifying' || state === 'verified') {
    const verified = state === 'verified';
    return (
      <div role="status" aria-live="polite" className="flex min-h-72 flex-col items-center justify-center text-center">
        <span className={`flex size-14 items-center justify-center rounded-2xl ${verified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'}`}>
          {verified ? <CheckCircle2 size={28} aria-hidden="true" /> : <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />}
        </span>
        <h1 className="mt-5 text-2xl font-display font-bold text-gray-950 dark:text-white">
          {verified ? t('verify.successTitle', 'Email verified') : t('verify.checking', 'Verifying your email')}
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
          {verified ? t('verify.successBody', 'Your account is ready. Taking you to sign in…') : t('verify.wait', 'Please keep this page open for a moment.')}
        </p>
      </div>
    );
  }

  return (
    <>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"><MailCheck size={24} aria-hidden="true" /></span>
      <h1 className="mt-5 text-3xl font-display font-bold tracking-tight text-gray-950 dark:text-white">
        {state === 'invalid'
          ? t('verify.invalidTitle', 'Link expired or invalid')
          : state === 'retryable'
            ? t('verify.retryTitle', 'Verification was interrupted')
            : t('verify.title', 'Check your email')}
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {state === 'invalid'
          ? t('verify.invalidBody', 'Request a new single-use link to verify your account.')
          : state === 'retryable'
            ? t('verify.retryBody', 'Your link is still available in this page. Check your connection and try the same link again.')
            : t('verify.pendingBody', 'Open the verification link we sent. It expires after 24 hours.')}
      </p>

      {message && (
        <div role={state === 'invalid' || state === 'retryable' ? 'alert' : 'status'} className="mt-5 flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{message}</span>
        </div>
      )}

      {state === 'retryable' && (
        <button type="button" onClick={retryVerification} className="btn-primary mt-5 flex min-h-12 w-full items-center justify-center">
          {t('verify.retry', 'Try verification again')}
        </button>
      )}

      <form onSubmit={resend} className="mt-6 space-y-4">
        <div>
          <label htmlFor="verification-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.email')}</label>
          <input id="verification-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="input-field min-h-12" placeholder={t('auth.emailPlaceholder')} />
        </div>
        <button type="submit" disabled={resending} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:opacity-60">
          {resending && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {resending ? t('verify.resending', 'Sending…') : t('verify.resend', 'Send a new verification link')}
        </button>
      </form>
      <Link href="/auth/login" className="btn-outline mt-3 flex min-h-12 w-full items-center justify-center">{t('verify.signIn', 'Back to sign in')}</Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return <AuthShell><Suspense fallback={<div className="flex min-h-72 items-center justify-center"><LoaderCircle className="animate-spin text-primary-600" aria-label="Loading" /></div>}><VerifyEmailForm /></Suspense></AuthShell>;
}
