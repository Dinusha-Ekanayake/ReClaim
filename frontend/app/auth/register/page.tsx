'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { ApiError } from '@/lib/api';
import { LogoIcon } from '@/components/shared/Logo';

const BENEFITS = [
  '✓  Post lost or found items instantly',
  '✓  AI-powered match notifications',
  '✓  Secure real-time chat',
  '✓  Verified ownership claim system',
  '✓  100% free — forever',
];

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore(s => s.register);
  const isLoading = useAuthStore(s => s.isLoading);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pwRules = [
    { label: '8+ characters',   ok: form.password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(form.password) },
    { label: 'Number',           ok: /\d/.test(form.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwRules.some(r => !r.ok)) { setError('Password does not meet requirements.'); return; }
    try {
      await register(form.name, form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-emerald-500 via-emerald-600 to-primary-700
                      flex-col items-center justify-center p-14 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 text-white text-center max-w-md w-full">
          {/* Large logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30
                            flex items-center justify-center shadow-2xl">
              <LogoIcon size="lg" className="w-16 h-16 rounded-2xl bg-transparent shadow-none" />
            </div>
          </div>

          <h1 className="text-5xl font-display font-extrabold mb-3 tracking-tight">
            Join <span className="text-emerald-200">ReClaim</span>
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed mb-10">
            Create a free account and start helping your community. Every item returned makes a difference.
          </p>

          <div className="space-y-3 text-left">
            {BENEFITS.map(b => (
              <p key={b} className="text-sm text-emerald-100 font-medium">{b}</p>
            ))}
          </div>

          <div className="mt-10 p-5 bg-white/10 border border-white/20 rounded-2xl text-sm text-emerald-100">
            &ldquo;ReClaim helped me get my wallet back within hours. The AI matching is incredible!&rdquo;
            <div className="mt-2 text-xs text-emerald-300 font-semibold">— Kasun P., Colombo</div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
            <LogoIcon size="lg" />
            <span className="font-display font-extrabold text-3xl text-gray-900">
              Re<span className="text-primary-600">Claim</span>
            </span>
          </div>

          <h2 className="text-3xl font-display font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold">Sign in</Link>
          </p>

          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 text-red-700 rounded-xl text-sm mb-6 border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="Your name" required minLength={2} maxLength={50} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Create a strong password" required className="input-field pr-11" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {pwRules.map(rule => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                      {rule.ok
                        ? <CheckCircle size={12} className="text-emerald-500" />
                        : <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />}
                      <span className={rule.ok ? 'text-emerald-600 font-medium' : 'text-gray-400'}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-secondary py-3 text-base font-semibold">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account — Free'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-primary-600 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
