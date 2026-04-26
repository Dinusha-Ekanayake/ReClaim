'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, Bell, MessageSquare, Settings, LogOut, Plus, ChevronRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useAuthStore, useIsLoggedIn } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/items', label: 'My Items', icon: Package },
  { href: '/dashboard/claims', label: 'Claims', icon: ChevronRight },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useIsLoggedIn();
  const logout = useAuthStore(s => s.logout);
  const isInitialized = useAuthStore(s => s.isInitialized);

  useEffect(() => {
    if (isInitialized && !isLoggedIn) router.push('/auth/login');
  }, [isInitialized, isLoggedIn]);

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="card p-2 space-y-1 sticky top-24">
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link key={href} href={href}
                    className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                      active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50')}>
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
              <Link href="/chat"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                <MessageSquare size={18} /> Messages
              </Link>
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link href="/items/new"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-secondary-600 hover:bg-green-50 transition-all">
                  <Plus size={18} /> Post Item
                </Link>
                <button onClick={async () => { await logout(); router.push('/'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
