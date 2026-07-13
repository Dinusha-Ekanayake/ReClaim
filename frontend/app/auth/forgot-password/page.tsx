'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import { LogoIcon } from '@/components/shared/Logo';
import api, { ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
      setDevResetUrl(data.devResetUrl || '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not request a password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px] dark:bg-gray-950/70" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-2xl shadow-blue-200/30 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90 dark:shadow-black/30 sm:p-9">
        <Link href="/auth/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary-600 dark:text-gray-400">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <div className="mb-7 flex items-center gap-3">
          <LogoIcon size="md" />
          <div>
            <h1 className="text-2xl font-display font-extrabold text-gray-900 dark:text-white">Reset your password</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">We will send a secure, single-use link.</p>
          </div>
        </div>

        {message ? (
          <div className="space-y-5">
            <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 size={22} className="mb-2" />
              <p className="text-sm leading-6">{message}</p>
            </div>
            {devResetUrl && <Link href={devResetUrl} className="btn-primary flex w-full items-center justify-center">Open development reset link</Link>}
            <button type="button" onClick={() => { setMessage(''); setDevResetUrl(''); }} className="btn-outline w-full">Try another email</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Email address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input id="reset-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} autoComplete="email" className="input-field pl-10" placeholder="you@example.com" />
              </div>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
            <button disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 py-3">
              <Send size={16} /> {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
