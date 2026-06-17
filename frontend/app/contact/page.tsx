'use client';
import { useState } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import { Mail, MessageSquare, MapPin, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate send (replace with real API call if needed)
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary-600 mb-3">Get in touch</p>
          <h1 className="text-4xl font-display font-extrabold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-500 max-w-md mx-auto">
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
              <div key={item.title} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.title}</p>
                  {item.href ? (
                    <a href={item.href} className="text-gray-900 font-medium hover:text-primary-600 transition-colors text-sm">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-gray-900 font-medium text-sm">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="p-5 bg-primary-50 rounded-2xl border border-primary-100">
              <p className="text-sm font-semibold text-primary-800 mb-1">Response time</p>
              <p className="text-sm text-primary-700">We typically respond within 24–48 hours on business days.</p>
            </div>
          </div>

          {/* Form column */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16
                              bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-2">Message sent!</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Thanks for reaching out. We&apos;ll get back to you within 24–48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                    <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                      placeholder="Your name" required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      placeholder="you@example.com" required className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                  <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)}
                    placeholder="What's this about?" required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
                  <textarea value={form.message} onChange={e => update('message', e.target.value)}
                    placeholder="Tell us more…" required rows={5}
                    className="input-field resize-none" />
                </div>
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
