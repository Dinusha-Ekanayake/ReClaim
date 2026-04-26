'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Flag, Shield,
  LogOut, ChevronRight, BarChart2, Bell
} from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/items', label: 'Items', icon: Package },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/claims', label: 'Claims', icon: ChevronRight },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const isAdmin = useIsAdmin();
  const isInitialized = useAuthStore(s => s.isInitialized);
  const logout = useAuthStore(s => s.logout);

  useEffect(() => {
    if (isInitialized && !isAdmin) router.push('/');
  }, [isInitialized, isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-gray-800">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/logo.png" alt="ReClaim" width={32} height={32} className="rounded-lg" />
            <div>
              <span className="font-display font-bold text-white text-sm">ReClaim</span>
              <span className="block text-xs text-gray-500">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}>
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <Shield size={14} /> View Site
          </Link>
          <button onClick={async () => { await logout(); router.push('/'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
