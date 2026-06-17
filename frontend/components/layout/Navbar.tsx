'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, Menu, X, Plus, Search, MessageSquare,
  LogOut, User, Settings, Shield, ChevronDown,
} from 'lucide-react';
import { useAuthStore, useIsAdmin, useIsLoggedIn } from '@/lib/store/authStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { cn, getAvatarFallback, timeAgo } from '@/lib/utils';
import { LogoIcon } from '@/components/shared/Logo';
import LanguageSelector from '@/components/shared/LanguageSelector';
import ThemeToggle from '@/components/shared/ThemeToggle';

const NAV_LINKS = [
  { href: '/items?type=LOST',  label: 'Lost Items',   dot: 'bg-red-500' },
  { href: '/items?type=FOUND', label: 'Found Items',  dot: 'bg-emerald-500' },
  { href: '/how-it-works',     label: 'How It Works', dot: null },
];

export default function Navbar() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);
  const isLoggedIn = useIsLoggedIn();
  const isAdmin    = useIsAdmin();
  const { notifications, unreadCount, fetch: fetchNotifs, markRead, markAllRead } = useNotificationStore();

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (isLoggedIn) fetchNotifs();
  }, [isLoggedIn, fetchNotifs]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Click-outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg shadow-sm shadow-gray-200/80 dark:shadow-black/40 border-b border-gray-100/80 dark:border-gray-800/80'
          : 'bg-white dark:bg-gray-950 border-b border-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* ── Logo ─────────────────────────────────────────── */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
              <LogoIcon size="md" className="group-hover:scale-105 transition-transform duration-200" />
              <span className="font-display font-extrabold text-2xl text-gray-900 dark:text-white tracking-tight">
                Re<span className="text-primary-600 dark:text-primary-400">Claim</span>
              </span>
            </Link>

            {/* ── Desktop nav links ─────────────────────────────── */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => {
                const isActive = pathname === link.href || (link.href.includes('?') && pathname.includes(link.href.split('?')[0]));
                return (
                  <Link key={link.href} href={link.href}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}>
                    {link.dot && <span className={`w-2 h-2 rounded-full ${link.dot}`} />}
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* ── Right actions ─────────────────────────────────── */}
            <div className="flex items-center gap-1">

              {/* Search */}
              <Link href="/search"
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800
                           rounded-xl transition-all duration-200">
                <Search size={20} />
              </Link>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Language */}
              <LanguageSelector />

              {isLoggedIn ? (
                <>
                  {/* Post Item */}
                  <Link href="/items/new"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl
                               bg-primary-600 text-white text-sm font-semibold
                               hover:bg-primary-700 active:scale-95
                               transition-all duration-200 shadow-sm hover:shadow-md ml-1">
                    <Plus size={15} strokeWidth={2.5} />
                    Post Item
                  </Link>

                  {/* Chat */}
                  <Link href="/chat"
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800
                               rounded-lg transition-all duration-200 relative">
                    <MessageSquare size={19} />
                  </Link>

                  {/* Notifications */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800
                                 rounded-lg transition-all duration-200 relative">
                      <Bell size={19} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4
                                         bg-red-500 text-white text-[10px] font-bold
                                         rounded-full flex items-center justify-center
                                         animate-pulse-ring">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl
                                      shadow-xl shadow-gray-200/70 dark:shadow-black/50 border border-gray-100 dark:border-gray-800
                                      z-50 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                          {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Bell size={28} className="text-gray-200 dark:text-gray-700 mb-2" />
                              <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
                            </div>
                          ) : notifications.slice(0, 10).map(n => (
                            <button key={n.id}
                              onClick={() => { markRead(n.id); if (n.link) router.push(n.link); setNotifOpen(false); }}
                              className={cn(
                                'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                                !n.isRead && 'bg-blue-50/60 dark:bg-primary-500/10 border-l-2 border-primary-400'
                              )}>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{n.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                            </button>
                          ))}
                        </div>
                        <Link href="/dashboard/notifications"
                          className="block text-center text-xs text-primary-600 dark:text-primary-400 font-medium
                                     py-3 border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          View all notifications →
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Profile dropdown */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                      className="flex items-center gap-1.5 pl-1.5 pr-2 py-1
                                 rounded-xl hover:bg-gray-100 transition-all duration-200">
                      {user?.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.name}
                          width={32} height={32}
                          className="rounded-full object-cover ring-2 ring-white" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700
                                        text-white text-xs font-bold flex items-center justify-center
                                        ring-2 ring-white shadow-sm">
                          {getAvatarFallback(user?.name ?? 'U')}
                        </div>
                      )}
                      <ChevronDown size={14} className={cn(
                        'text-gray-400 transition-transform duration-200',
                        profileOpen && 'rotate-180'
                      )} />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-2xl
                                      shadow-xl shadow-gray-200/70 dark:shadow-black/50 border border-gray-100 dark:border-gray-800
                                      z-50 overflow-hidden animate-fade-in">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <div className="py-1.5">
                          {[
                            { href: '/dashboard',           icon: <User size={15} />,     label: 'My Dashboard' },
                            { href: '/dashboard/settings',  icon: <Settings size={15} />, label: 'Settings' },
                          ].map(item => (
                            <Link key={item.href} href={item.href}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm
                                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <span className="text-gray-400">{item.icon}</span>
                              {item.label}
                            </Link>
                          ))}
                          {isAdmin && (
                            <Link href="/admin"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm
                                         text-primary-600 dark:text-primary-400 font-medium hover:bg-blue-50 dark:hover:bg-primary-500/10 transition-colors">
                              <Shield size={15} /> Admin Panel
                            </Link>
                          )}
                          <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                       text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-1">
                  <Link href="/auth/login"
                    className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300
                               hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800
                               transition-all duration-200">
                    Sign In
                  </Link>
                  <Link href="/auth/register"
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold
                               hover:bg-primary-700 active:scale-95
                               transition-all duration-200 shadow-sm hover:shadow-md">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu ─────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 animate-slide-in-down">
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  {link.dot && <span className={`w-2 h-2 rounded-full ${link.dot}`} />}
                  {link.label}
                </Link>
              ))}

              {isLoggedIn ? (
                <>
                  <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                  <Link href="/items/new"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold
                               text-primary-600 dark:text-primary-400 hover:bg-blue-50 dark:hover:bg-primary-500/10 rounded-xl transition-colors">
                    <Plus size={16} strokeWidth={2.5} /> Post an Item
                  </Link>
                  <Link href="/chat"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <MessageSquare size={16} /> Messages
                  </Link>
                  <Link href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <User size={16} /> My Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                  <Link href="/auth/login"
                    className="block px-3 py-2.5 text-sm font-medium
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    Sign In
                  </Link>
                  <Link href="/auth/register"
                    className="block px-3 py-2.5 text-sm font-semibold
                               text-primary-600 dark:text-primary-400 hover:bg-blue-50 dark:hover:bg-primary-500/10 rounded-xl transition-colors">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer so content doesn't hide under fixed nav */}
      <div className="h-20" />
    </>
  );
}
