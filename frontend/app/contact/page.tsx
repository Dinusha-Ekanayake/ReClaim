'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import api, { ApiError } from '@/lib/api';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
}

interface ContactResponse {
  message: string;
  reference?: string;
  createdAt?: string;
}

const EMPTY_FORM: ContactForm = { name: '', email: '', subject: '', message: '', website: '' };

function getSubmitError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many messages were sent from this connection. Please wait and try again.';
    if (error.status >= 500) return 'The support inbox is temporarily unavailable. Your message was not submitted; please try again.';

    const firstDetail = Array.isArray(error.data?.details) ? error.data.details[0] : null;
    if (firstDetail && typeof firstDetail.message === 'string') return firstDetail.message;
    return error.message || 'Please review the form and try again.';
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You appear to be offline. Reconnect and submit the form again.';
  }
  return 'Your message could not be submitted. Please try again.';
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  const update = <Key extends keyof ContactForm>(key: Key, value: ContactForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const payload: ContactForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      website: form.website,
    };

    if (payload.name.length < 2 || payload.subject.length < 3 || payload.message.length < 10) {
      setError('Remove extra spaces and complete every field using the minimum lengths shown.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post<ContactResponse>('/contact', payload);
      setReference(data.reference || '');
      setSent(true);
      setForm(EMPTY_FORM);
    } catch (submitError: unknown) {
      setError(getSubmitError(submitError));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setReference('');
    setError('');
    setForm(EMPTY_FORM);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <header className="max-w-3xl">
          <div className="inline-flex min-h-8 items-center gap-2 rounded-full bg-primary-50 px-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
            <Inbox size={14} aria-hidden="true" />
            Contact support
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl">Tell us what you need help with.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            Submit a clear description and the ReClaim administration team can review it in the support inbox.
          </p>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="space-y-3" aria-label="Before contacting support">
            <Link href="/faq" className="group flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/30">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                <CircleHelp size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">Check quick answers <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">Review matching, privacy, claims, maps, and account deletion.</span>
              </span>
            </Link>

            <div className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Keep sensitive details private</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Never send passwords, one-time codes, payment details, or an exact home address.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-primary-700 p-5 text-white">
              <h2 className="text-sm font-bold">For item-specific concerns</h2>
              <p className="mt-2 text-xs leading-relaxed text-primary-100">Use “Report a concern” on the item page for moderation. Use this form for support questions, feedback, and technical problems.</p>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7" aria-labelledby="contact-form-title">
            {sent ? (
              <div role="status" aria-live="polite" className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 size={28} aria-hidden="true" />
                </span>
                <h2 id="contact-form-title" className="mt-5 font-display text-2xl font-bold text-slate-950 dark:text-white">Message submitted</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">Your message is now available in the ReClaim support inbox for review.</p>
                {reference && (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    Reference: {reference}
                  </p>
                )}
                <button type="button" onClick={resetForm} className="btn-outline mt-6 inline-flex items-center gap-2">
                  <RotateCcw size={16} aria-hidden="true" />
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
                <div>
                  <h2 id="contact-form-title" className="font-display text-xl font-bold text-slate-950 dark:text-white">Support message</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">All fields are required. Character limits are shown below.</p>
                </div>

                <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={200} disabled={loading} value={form.website} onChange={(event) => update('website', event.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Name</label>
                    <input id="contact-name" name="name" type="text" value={form.name} onChange={(event) => update('name', event.target.value)} required minLength={2} maxLength={80} autoComplete="name" disabled={loading} className="input-field" />
                    <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">{form.name.length}/80</p>
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                    <input id="contact-email" name="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required maxLength={254} autoComplete="email" inputMode="email" disabled={loading} className="input-field" />
                    <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">{form.email.length}/254</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Subject</label>
                  <input id="contact-subject" name="subject" type="text" value={form.subject} onChange={(event) => update('subject', event.target.value)} required minLength={3} maxLength={120} autoComplete="off" disabled={loading} className="input-field" />
                  <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">{form.subject.length}/120</p>
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Message</label>
                  <textarea id="contact-message" name="message" value={form.message} onChange={(event) => update('message', event.target.value)} required minLength={10} maxLength={3000} rows={6} disabled={loading} aria-describedby="contact-message-help" className="input-field resize-y" />
                  <div id="contact-message-help" className="mt-1 flex items-start justify-between gap-3 text-[11px] text-slate-400">
                    <span>Include the report title or error details when relevant.</span>
                    <span className="shrink-0 tabular-nums">{form.message.length}/3000</span>
                  </div>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                  {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                  {loading ? 'Submitting…' : 'Submit message'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
