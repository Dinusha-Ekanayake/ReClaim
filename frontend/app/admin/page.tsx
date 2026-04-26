'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Package, Flag, CheckCircle, TrendingUp,
  AlertTriangle, ArrowRight, Clock, BarChart2
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-5 h-32 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.users?.total ?? 0,
      sub: `+${stats?.users?.newThisWeek ?? 0} this week`,
      icon: <Users size={20} />,
      color: 'text-blue-400 bg-blue-500/10',
      href: '/admin/users',
    },
    {
      label: 'Total Items',
      value: stats?.items?.total ?? 0,
      sub: `${stats?.items?.active ?? 0} active`,
      icon: <Package size={20} />,
      color: 'text-green-400 bg-green-500/10',
      href: '/admin/items',
    },
    {
      label: 'Pending Reports',
      value: stats?.reports?.pending ?? 0,
      sub: `${stats?.reports?.total ?? 0} total`,
      icon: <Flag size={20} />,
      color: stats?.reports?.pending > 0 ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-gray-800',
      href: '/admin/reports',
      alert: stats?.reports?.pending > 0,
    },
    {
      label: 'Success Rate',
      value: `${stats?.successRate ?? 0}%`,
      sub: `${stats?.items?.returned ?? 0} items returned`,
      icon: <CheckCircle size={20} />,
      color: 'text-emerald-400 bg-emerald-500/10',
      href: '/admin/items',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">Monitor and manage the ReClaim platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map(card => (
          <Link key={card.label} href={card.href}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.color)}>
                {card.icon}
              </div>
              {card.alert && (
                <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                  <AlertTriangle size={12} /> Alert
                </span>
              )}
            </div>
            <div className="text-3xl font-display font-bold text-white mb-1">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="text-xs text-gray-600 mt-1">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
            <BarChart2 size={18} className="text-primary-400" /> Item Breakdown
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Lost Items', value: stats?.items?.lost ?? 0, color: 'bg-red-500', pct: stats?.items?.total ? Math.round((stats.items.lost / stats.items.total) * 100) : 0 },
              { label: 'Found Items', value: stats?.items?.found ?? 0, color: 'bg-green-500', pct: stats?.items?.total ? Math.round((stats.items.found / stats.items.total) * 100) : 0 },
              { label: 'Returned', value: stats?.items?.returned ?? 0, color: 'bg-blue-500', pct: stats?.items?.total ? Math.round((stats.items.returned / stats.items.total) * 100) : 0 },
              { label: 'Active', value: stats?.items?.active ?? 0, color: 'bg-amber-500', pct: stats?.items?.total ? Math.round((stats.items.active / stats.items.total) * 100) : 0 },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-400">{row.label}</span>
                  <span className="text-sm font-semibold text-white">{row.value}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className={cn('h-2 rounded-full transition-all', row.color)}
                    style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" /> Quick Actions
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Review pending reports', href: '/admin/reports?status=PENDING', badge: stats?.reports?.pending, color: 'text-red-400' },
              { label: 'Review pending claims', href: '/admin/claims?status=PENDING', badge: stats?.claims?.pending, color: 'text-amber-400' },
              { label: 'Manage users', href: '/admin/users', color: 'text-blue-400' },
              { label: 'Review all items', href: '/admin/items', color: 'text-green-400' },
            ].map(action => (
              <Link key={action.href} href={action.href}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors group">
                <span className={cn('text-sm font-medium', action.color)}>{action.label}</span>
                <div className="flex items-center gap-2">
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                      {action.badge}
                    </span>
                  )}
                  <ArrowRight size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary-400" />
              <span className="text-sm font-semibold text-primary-300">This Week</span>
            </div>
            <p className="text-xs text-gray-400">
              <span className="text-white font-bold">{stats?.users?.newThisWeek ?? 0}</span> new users &nbsp;·&nbsp;
              <span className="text-white font-bold">{stats?.items?.newThisWeek ?? 0}</span> new items posted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
