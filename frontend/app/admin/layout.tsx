'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Flag, Shield,
  LogOut, MessageSquare, Menu, X, Inbox,
} from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { LogoIcon } from '@/components/shared/Logo';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/items', label: 'Items', icon: Package },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/claims', label: 'Claims', icon: MessageSquare },
  { href: '/admin/contacts', label: 'Contact Inbox', icon: Inbox },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const isAdmin = useIsAdmin();
  const isInitialized = useAuthStore(s => s.isInitialized);
  const logout = useAuthStore(s => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isInitialized && !isAdmin) router.push('/');
  }, [isInitialized, isAdmin]);

  // Close the mobile drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  if (!isAdmin) return null;

  const Sidebar = (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoIcon size="sm" />
          <div>
            <span className="font-display font-bold text-white text-sm">ReClaim</span>
            <span className="block text-xs text-gray-500">Admin Panel</span>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]',
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
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
        <button
          type="button"
          onClick={async () => { await logout(); router.push('/'); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950/90 backdrop-blur-[2px] lg:flex">
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoIcon size="sm" />
          <span className="font-display font-bold text-white text-sm">Admin</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-gray-800">
        {Sidebar}
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 animate-fade-in"
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gray-900 border-r border-gray-800 animate-slide-in-right">
            {Sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
