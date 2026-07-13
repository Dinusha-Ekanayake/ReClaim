'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Package, ArrowLeft, RefreshCw, PackageOpen } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import { EmptyState } from '@/components/shared/EmptyState';
import api, { ApiError } from '@/lib/api';
import { formatDate, getAvatarFallback } from '@/lib/utils';
import type { Item, User } from '@/types';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setProfile(null);
    setItems([]);

    Promise.all([
      api.get(`/users/${id}`, undefined, { signal: controller.signal }),
      api.get(`/users/${id}/items`, { limit: 8, status: 'ACTIVE' }, { signal: controller.signal }),
    ]).then(([user, itemsData]) => {
      if (controller.signal.aborted) return;
      setProfile(user);
      setItems(itemsData.items ?? []);
    }).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setProfile(null);
      setItems([]);
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load this profile. Please try again.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [id, retryKey]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="skeleton h-40 rounded-2xl mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !profile) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-4 py-20">
          <div role="alert" className="card p-8 text-center">
            <h1 className="text-xl font-display font-bold text-gray-900 dark:text-white">Profile unavailable</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error || 'This profile could not be found.'}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => setRetryKey(key => key + 1)} className="btn-primary inline-flex items-center justify-center gap-2">
                <RefreshCw size={15} aria-hidden="true" /> Try again
              </button>
              <Link href="/items" className="btn-secondary inline-flex items-center justify-center">Browse items</Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Link href="/items" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Back to reports
        </Link>

        {/* Profile card with cover banner */}
        <div className="card mb-8 overflow-hidden">
          {/* Cover */}
          <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 sm:h-32">
            <div aria-hidden="true" className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
          </div>
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} width={96} height={96}
                  className="rounded-2xl object-cover ring-4 ring-white dark:ring-gray-900 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 text-3xl font-bold flex items-center justify-center flex-shrink-0 ring-4 ring-white dark:ring-gray-900 shadow-lg">
                  {getAvatarFallback(profile.name)}
                </div>
              )}
              <div className="flex-1 pt-2 sm:pb-1">
                <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">{profile.name}</h1>
                {profile.bio && <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm leading-relaxed">{profile.bio}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {profile.location && (
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.location}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> Joined {formatDate(profile.createdAt, 'MMM yyyy')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package size={14} /> {profile._count?.items ?? 0} items posted
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-5">Active Items</h2>
        {items.length === 0 ? (
          <EmptyState icon={<PackageOpen size={23} />} title="No active items" description="This member has no active public reports." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
