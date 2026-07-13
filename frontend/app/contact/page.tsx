'use client';
import { useState } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import { Mail, MessageSquare, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api, { ApiError } from '@/lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/contact', form);
      setReference(data.reference || '');
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3">Get in touch</p>
          <h1 className="text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-4">Contact Us</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Have a question, feedback, or need help? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Info column */}
          <div className="lg:col-span-2 space-y-6">
            {[
              { icon: <Mail size={22} className="text-primary-600" />, title: 'Email', value: 'hello@reclaim.app', href: 'mailto:hello@reclaim.app' },
              { icon: <MessageSquare size={22} className="text-emerald-600" />, title: 'Support', value: 'support@reclaim.app', href: 'mailto:support@reclaim.app' },
              { icon: <MapPin size={22} className="text-amber-600" />, title: 'Based in', value: 'Sri Lanka 🇱🇰', href: null },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{item.title}</p>
                  {item.href ? (
                    <a href={item.href} className="text-gray-900 dark:text-white font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium text-sm">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="p-5 bg-primary-50 dark:bg-primary-500/10 rounded-2xl border border-primary-100 dark:border-primary-500/20">
              <p className="text-sm font-semibold text-primary-800 dark:text-primary-300 mb-1">Response time</p>
              <p className="text-sm text-primary-700 dark:text-primary-400">Your message is securely added to the ReClaim support inbox for review.</p>
            </div>
          </div>

          {/* Form column */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16
                              bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 animate-bounce-in">
                  <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Message sent!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                  Thanks for reaching out. The support team can now review your message.
                </p>
                {reference && <p className="mt-3 text-xs font-mono text-gray-400">Reference: {reference}</p>}
              </div>
            ) : (
              <form onSubmit={handleSubmit}
                className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 space-y-5">
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off"
                    value={form.website} onChange={e => update('website', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                    <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                      placeholder="Your name" required minLength={2} maxLength={80} autoComplete="name" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      placeholder="you@example.com" required maxLength={254} autoComplete="email" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Subject</label>
                  <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)}
                    placeholder="What's this about?" required minLength={3} maxLength={120} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                  <textarea value={form.message} onChange={e => update('message', e.target.value)}
                    placeholder="Tell us more…" required minLength={10} maxLength={3000} rows={5}
                    className="input-field resize-none" />
                </div>
                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg> Sending…</>
                  ) : (
                    <><Send size={16} /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
