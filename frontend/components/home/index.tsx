'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Search, MessageSquare, CheckCircle, Shield, Zap, Users } from 'lucide-react';
import api from '@/lib/api';
import ItemCard from '@/components/items/ItemCard';
import { CATEGORIES } from '@/lib/utils';

// ─── Stats Section ─────────────────────────────────────────────────────────────
export function StatsSection() {
  const stats = [
    { icon: <Search className="text-primary-600" size={24} />, value: '2,400+', label: 'Items Reported', bg: 'bg-blue-50' },
    { icon: <CheckCircle className="text-secondary-500" size={24} />, value: '860+', label: 'Items Returned', bg: 'bg-green-50' },
    { icon: <Users className="text-accent-500" size={24} />, value: '1,200+', label: 'Registered Users', bg: 'bg-amber-50' },
    { icon: <Zap className="text-purple-500" size={24} />, value: '< 2hrs', label: 'Avg Match Time', bg: 'bg-purple-50' },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(stat => (
            <div key={stat.label} className="card p-6 text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────
export function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: <Search size={28} />,
      title: 'Post or Search',
      desc: 'Report your lost item or post something you found. Add photos, describe it clearly, and mark the location.',
      color: 'text-primary-600 bg-blue-50',
    },
    {
      step: '02',
      icon: <Zap size={28} />,
      title: 'Smart Matching',
      desc: 'Our system automatically matches lost and found items using AI — comparing descriptions, location, date, and images.',
      color: 'text-secondary-500 bg-green-50',
    },
    {
      step: '03',
      icon: <MessageSquare size={28} />,
      title: 'Connect & Verify',
      desc: 'Chat securely inside ReClaim. Claimants answer hidden verification questions to prove ownership.',
      color: 'text-accent-500 bg-amber-50',
    },
    {
      step: '04',
      icon: <CheckCircle size={28} />,
      title: 'Reunited!',
      desc: 'Approve the claim, coordinate the handover, and mark the item as returned. The community grows stronger.',
      color: 'text-purple-500 bg-purple-50',
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">How ReClaim Works</h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Four simple steps to reunite people with their lost belongings
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.step} className="relative card p-6 group hover:-translate-y-1 transition-transform duration-300">
              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 -right-3 z-10">
                  <ArrowRight size={20} className="text-gray-300" />
                </div>
              )}
              <div className="text-xs font-mono font-bold text-gray-300 mb-4">{step.step}</div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${step.color}`}>
                {step.icon}
              </div>
              <h3 className="font-display font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/how-it-works" className="btn-outline inline-flex items-center gap-2">
            Learn More <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Categories Grid ───────────────────────────────────────────────────────────
export function CategoriesGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Browse by Category</h2>
          <p className="text-gray-600">Find items faster by browsing specific categories</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CATEGORIES.slice(0, 12).map(cat => (
            <Link
              key={cat.value}
              href={`/items?category=${encodeURIComponent(cat.value)}`}
              className="card p-4 text-center group hover:-translate-y-1 transition-all duration-300 hover:border-primary-200"
            >
              <div className="text-3xl mb-2">{cat.icon}</div>
              <div className="text-xs font-medium text-gray-700 group-hover:text-primary-600 transition-colors leading-tight">
                {cat.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Recent Items ──────────────────────────────────────────────────────────────
export function RecentItems() {
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/items', { type: 'LOST', limit: 4, sort: 'createdAt', order: 'desc' }),
      api.get('/items', { type: 'FOUND', limit: 4, sort: 'createdAt', order: 'desc' }),
    ]).then(([l, f]) => {
      setLostItems(l.items);
      setFoundItems(f.items);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Recent Reports</h2>
          <p className="text-gray-600">See the latest lost and found items near you</p>
        </div>

        {/* Lost */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold text-gray-900">
              <span className="w-3 h-3 bg-red-500 rounded-full inline-block mr-2" />
              Recently Lost
            </h3>
            <Link href="/items?type=LOST" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {lostItems.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </div>

        {/* Found */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold text-gray-900">
              <span className="w-3 h-3 bg-green-500 rounded-full inline-block mr-2" />
              Recently Found
            </h3>
            <Link href="/items?type=FOUND" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {foundItems.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

// ─── CTA Section ───────────────────────────────────────────────────────────────
export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-700 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Shield size={48} className="text-white/80 mx-auto mb-6" />
        <h2 className="text-4xl sm:text-5xl font-display font-bold text-white mb-6">
          Lost something valuable?
        </h2>
        <p className="text-xl text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">
          Post your lost item now and let our smart matching system work for you. It only takes 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/items/new?type=LOST"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl">
            🔍 Report Lost Item
          </Link>
          <Link href="/items/new?type=FOUND"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500 text-white font-bold rounded-xl border-2 border-white/30 hover:bg-primary-400 transition-all">
            📦 Post Found Item
          </Link>
        </div>
      </div>
    </section>
  );
}
