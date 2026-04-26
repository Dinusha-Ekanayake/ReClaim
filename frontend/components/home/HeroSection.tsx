'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ type, ...(query && { search: query }) });
    router.push(`/items?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 min-h-[600px] flex items-center">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full -translate-y-1/2 translate-x-1/4 opacity-60 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-100 rounded-full translate-y-1/4 -translate-x-1/4 opacity-60 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
            <Sparkles size={14} /> Smart AI-Powered Matching
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-gray-900 leading-tight mb-6">
            Find what{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-500">matters.</span>
            <br />
            Return what&apos;s{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-primary-600">lost.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            ReClaim connects people who&apos;ve lost something with those who&apos;ve found it — through intelligent matching, real-time chat, and verified claims.
          </p>
          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex bg-gray-100 rounded-xl p-1 flex-shrink-0">
              {(['LOST', 'FOUND'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${type === t ? t === 'LOST' ? 'bg-red-500 text-white shadow-sm' : 'bg-green-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {t === 'LOST' ? '🔍 Lost' : '📦 Found'}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by item name, category, location..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent" />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2 flex-shrink-0">
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
