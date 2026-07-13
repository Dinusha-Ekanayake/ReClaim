'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { LogoIcon } from '@/components/shared/Logo';
import api, { ApiError } from '@/lib/api';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(password) || new TextEncoder().encode(password).length > 72) {
      setError('Use 8–72 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setComplete(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  };

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <div className="text-center">
        <KeyRound size={32} className="mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid reset link</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Request a new link to continue.</p>
        <Link href="/auth/forgot-password" className="btn-primary mt-6 inline-flex">Request another link</Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="text-center">
        <CheckCircle2 size={36} className="mx-auto mb-4 text-emerald-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password updated</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">All previous sessions have been signed out.</p>
        <Link href="/auth/login" className="btn-primary mt-6 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="mb-7 flex items-center gap-3">
        <LogoIcon size="md" />
        <div><h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Choose a new password</h1><p className="text-sm text-gray-500 dark:text-gray-400">This link can only be used once.</p></div>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">New password</label>
        <div className="relative">
          <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="input-field pr-11" />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm password</label>
        <input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="input-field" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      <button disabled={loading} className="btn-primary w-full py-3">{loading ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px] dark:bg-gray-950/70" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-2xl shadow-blue-200/30 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90 dark:shadow-black/30 sm:p-9">
        <Suspense fallback={<div className="skeleton h-72 rounded-2xl" />}><ResetPasswordForm /></Suspense>
      </div>
    </main>
  );
}
