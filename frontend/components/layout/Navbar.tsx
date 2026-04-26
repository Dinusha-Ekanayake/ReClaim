'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, X, Plus, Search, MessageSquare, LogOut, User, Settings, Shield } from 'lucide-react';
import { useAuthStore, useIsAdmin, useIsLoggedIn } from '@/lib/store/authStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { cn, getAvatarFallback, timeAgo } from '@/lib/utils';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const isLoggedIn = useIsLoggedIn();
  const isAdmin = useIsAdmin();
  const { notifications, unreadCount, fetch: fetchNotifs, markRead, markAllRead } = useNotificationStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchNotifs();
  }, [isLoggedIn]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/items?type=LOST', label: 'Lost Items' },
    { href: '/items?type=FOUND', label: 'Found Items' },
    { href: '/how-it-works', label: 'How It Works' },
  ];

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.png" alt="ReClaim" width={36} height={36} className="rounded-lg" />
            <span className="font-display font-bold text-xl text-gray-900">
              Re<span className="text-primary-600">Claim</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'
                )}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/search" className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <Search size={20} />
            </Link>

            {isLoggedIn ? (
              <>
                {/* Post Item CTA */}
                <Link href="/items/new"
                  className="hidden sm:flex items-center gap-1.5 btn-primary text-sm py-2 px-4">
                  <Plus size={16} />
                  <span>Post Item</span>
                </Link>

                {/* Chat */}
                <Link href="/chat" className="p-2 text-gray-500 hover:text-gray-900 relative">
                  <MessageSquare size={20} />
                </Link>

                {/* Notifications */}
                <div className="relative">
                  <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="p-2 text-gray-500 hover:text-gray-900 relative">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
                          ) : notifications.slice(0, 10).map(n => (
                            <button key={n.id} onClick={() => {
                              markRead(n.id);
                              if (n.link) router.push(n.link);
                              setNotifOpen(false);
                            }}
                              className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                                !n.isRead && 'bg-blue-50/50')}>
                              <p className="text-sm font-medium text-gray-900">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                            </button>
                          ))}
                        </div>
                        <Link href="/dashboard/notifications"
                          className="block text-center text-xs text-primary-600 py-3 border-t hover:bg-gray-50">
                          View all notifications
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile */}
                <div className="relative">
                  <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    {user?.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.name} width={32} height={32}
                        className="rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                        {getAvatarFallback(user?.name || 'U')}
                      </div>
                    )}
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-fade-in">
                        <div className="px-4 py-3 border-b">
                          <p className="font-semibold text-sm text-gray-900">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <User size={16} /> My Dashboard
                          </Link>
                          <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Settings size={16} /> Settings
                          </Link>
                          {isAdmin && (
                            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-blue-50 font-medium">
                              <Shield size={16} /> Admin Panel
                            </Link>
                          )}
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <LogOut size={16} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-outline text-sm py-2 px-4 hidden sm:block">Sign In</Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link href="/items/new" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-blue-50 rounded-lg">
                <Plus size={16} /> Post an Item
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
