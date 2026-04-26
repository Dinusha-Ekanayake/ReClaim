'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Package, ArrowLeft } from 'lucide-react';
import PublicLayout from '@/components/layout/PublicLayout';
import ItemCard from '@/components/items/ItemCard';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { formatDate, getAvatarFallback } from '@/lib/utils';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/users/${id}/items`, { limit: 8, status: 'ACTIVE' }),
    ]).then(([user, itemsData]) => {
      setProfile(user);
      setItems(itemsData.items);
    }).catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (!profile) return null;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile card */}
        <div className="card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.name} width={96} height={96}
                className="rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 text-3xl font-bold flex items-center justify-center flex-shrink-0">
                {getAvatarFallback(profile.name)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">{profile.name}</h1>
              {profile.bio && <p className="text-gray-600 mb-3 text-sm leading-relaxed">{profile.bio}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
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

        {/* Items */}
        <h2 className="text-xl font-display font-bold text-gray-900 mb-5">Active Items</h2>
        {items.length === 0 ? (
          <EmptyState icon="📭" title="No active items" description="This user has no active posts." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
