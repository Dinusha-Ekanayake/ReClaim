'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore(s => s.register);
  const isLoading = useAuthStore(s => s.isLoading);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pwRules = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(form.password) },
    { label: 'Number', ok: /\d/.test(form.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwRules.some(r => !r.ok)) {
      setError('Password does not meet requirements.');
      return;
    }
    try {
      await register(form.name, form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-secondary-500 via-secondary-600 to-primary-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full" />
        </div>
        <div className="relative text-white text-center max-w-sm">
          <Image src="/logo.png" alt="ReClaim" width={72} height={72} className="mx-auto mb-6 rounded-2xl" />
          <h1 className="text-4xl font-display font-bold mb-4">Join ReClaim</h1>
          <p className="text-green-100 text-lg leading-relaxed mb-8">
            Create a free account and start helping your community. Every item returned makes a difference.
          </p>
          <div className="space-y-3 text-left">
            {[
              '✓ Post lost or found items instantly',
              '✓ Get AI-powered match notifications',
              '✓ Chat securely with finders/seekers',
              '✓ Verified claim system for safety',
            ].map(f => (
              <p key={f} className="text-sm text-green-100">{f}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/logo.png" alt="ReClaim" width={40} height={40} className="rounded-xl" />
              <span className="font-display font-bold text-2xl text-gray-900">
                Re<span className="text-primary-600">Claim</span>
              </span>
            </Link>
          </div>

          <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-500 mb-8">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm mb-6">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="John Doe" required minLength={2} maxLength={50} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                placeholder="you@email.com" required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Create a strong password" required className="input-field pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {pwRules.map(rule => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                      {rule.ok
                        ? <CheckCircle size={12} className="text-secondary-500" />
                        : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                      <span className={rule.ok ? 'text-secondary-600' : 'text-gray-400'}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-secondary py-3 text-base disabled:opacity-60">
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary-600 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
