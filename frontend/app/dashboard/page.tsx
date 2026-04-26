'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Package, CheckCircle, Clock, MessageSquare, Bell, ArrowRight, Star } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';
import ItemCard from '@/components/items/ItemCard';
import { getAvatarFallback, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, returned: 0, claims: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users/' + user?.id + '/items', { limit: 4 }),
    ]).then(([itemsData]) => {
      setItems(itemsData.items);
      const total = itemsData.total;
      const active = itemsData.items.filter((i: any) => i.status === 'ACTIVE').length;
      const returned = itemsData.items.filter((i: any) => i.status === 'RETURNED').length;
      setStats({ total, active, returned, claims: 0 });
    }).finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name} width={56} height={56}
                className="rounded-full border-2 border-white/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 text-white font-bold text-xl flex items-center justify-center">
                {getAvatarFallback(user?.name || 'U')}
              </div>
            )}
            <div>
              <p className="text-blue-200 text-sm">Welcome back,</p>
              <h2 className="text-2xl font-display font-bold">{user?.name}</h2>
              <p className="text-blue-200 text-xs mt-0.5">Member since {formatDate(user as any, 'MMM yyyy')}</p>
            </div>
          </div>
          <Link href="/items/new"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors">
            <Plus size={16} /> Post Item
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Package size={20} />, label: 'Total Items', value: stats.total, color: 'bg-blue-50 text-primary-600' },
          { icon: <Clock size={20} />, label: 'Active', value: stats.active, color: 'bg-amber-50 text-amber-600' },
          { icon: <CheckCircle size={20} />, label: 'Returned', value: stats.returned, color: 'bg-green-50 text-secondary-600' },
          { icon: <Star size={20} />, label: 'Claims', value: stats.claims, color: 'bg-purple-50 text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/items/new?type=LOST', icon: '🔍', label: 'Report Lost Item', desc: 'I lost something', color: 'hover:border-red-300 hover:bg-red-50' },
          { href: '/items/new?type=FOUND', icon: '📦', label: 'Post Found Item', desc: 'I found something', color: 'hover:border-green-300 hover:bg-green-50' },
          { href: '/chat', icon: '💬', label: 'My Messages', desc: 'View conversations', color: 'hover:border-blue-300 hover:bg-blue-50' },
        ].map(action => (
          <Link key={action.href} href={action.href}
            className={`card p-5 flex items-center gap-4 border border-transparent transition-all group ${action.color}`}>
            <span className="text-3xl">{action.icon}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm group-hover:text-gray-700">{action.label}</p>
              <p className="text-xs text-gray-400">{action.desc}</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* My Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-gray-900 text-lg">My Recent Items</h3>
          <Link href="/dashboard/items" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-36" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 mb-4">You haven't posted any items yet</p>
            <Link href="/items/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Post Your First Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(item => <ItemCard key={item.id} item={item} showStatus />)}
          </div>
        )}
      </div>
    </div>
  );
}
