'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Package } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { ApiError } from '@/lib/api';
import { LogoIcon } from '@/components/shared/Logo';
import { IMAGES } from '@/lib/images';

const FEATURES = [
  { icon: '🔍', text: 'AI-powered item matching' },
  { icon: '💬', text: 'Real-time chat with finders' },
  { icon: '🛡️', text: 'Verified ownership claims' },
  { icon: '🗺️', text: 'Location-based search' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const isLoading = useAuthStore(s => s.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-primary-600 via-primary-700 to-blue-900
                      flex-col items-center justify-center p-14 relative overflow-hidden">
        {/* Background photo */}
        <Image src={IMAGES.heroPrimary} alt="" fill priority
          className="object-cover opacity-20 mix-blend-luminosity" sizes="52vw" />
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700/80 via-primary-800/85 to-blue-900/90" />
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-[-15%] left-[-10%] w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-white text-center max-w-md w-full">
          {/* Large logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30
                            flex items-center justify-center shadow-2xl">
              <LogoIcon size="lg" className="w-16 h-16 rounded-2xl bg-transparent shadow-none" />
            </div>
          </div>

          <h1 className="text-5xl font-display font-extrabold mb-3 tracking-tight">
            Re<span className="text-blue-200">Claim</span>
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10">
            Find what matters. Return what's lost. Connect your community through intelligent matching.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-12 text-left">
            {FEATURES.map(f => (
              <div key={f.text} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm text-blue-100 font-medium leading-tight">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/20">
            {[['Community-led', 'Local connections', '◎'], ['Safer returns', 'Private checks', '✓'], ['Always open', 'Browse for free', '∞']].map(([v, l, icon]) => (
              <div key={String(v)} className="text-center">
                <div className="flex justify-center mb-1.5 text-blue-300 text-base font-bold">{icon}</div>
                <div className="text-sm font-display font-bold">{String(v)}</div>
                <div className="text-[11px] text-blue-300 font-medium mt-1">{String(l)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950 transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
            <LogoIcon size="lg" />
            <span className="font-display font-extrabold text-3xl text-gray-900 dark:text-white">
              Re<span className="text-primary-600 dark:text-primary-400">Claim</span>
            </span>
          </div>

          <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 font-semibold">
              Sign up free
            </Link>
          </p>

          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl text-sm mb-6
                            border border-red-100 dark:border-red-500/20">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="input-field" autoComplete="email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <a href="mailto:support@reclaim.app?subject=Password%20reset"
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password" required className="input-field pr-11"
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-primary py-3 text-base font-semibold">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-950 px-3 text-xs text-gray-400 dark:text-gray-500 font-medium">or continue with</span>
            </div>
          </div>

          <Link href="/items"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800
                       text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900
                       transition-all duration-200">
            <Package size={16} className="text-gray-400" />
            Browse items without signing in
          </Link>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-primary-600 hover:underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
