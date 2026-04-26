'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { ApiError } from '@/lib/api';

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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full" />
        </div>
        <div className="relative text-white text-center max-w-sm">
          <Image src="/logo.png" alt="ReClaim" width={72} height={72} className="mx-auto mb-6 rounded-2xl" />
          <h1 className="text-4xl font-display font-bold mb-4">Welcome Back</h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Sign in to manage your lost and found items, chat with others, and help reunite people with their belongings.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['2.4k+', 'Items'], ['860+', 'Returned'], ['1.2k+', 'Users']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-display font-bold">{v}</div>
                <div className="text-sm text-blue-300">{l}</div>
              </div>
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

          <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Sign In</h2>
          <p className="text-gray-500 mb-8">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary-600 hover:underline font-medium">Sign up free</Link>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm mb-6">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required className="input-field" autoComplete="email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password" required className="input-field pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-primary py-3 text-base disabled:opacity-60">
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-primary-600 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
