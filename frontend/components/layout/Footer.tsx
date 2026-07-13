'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BarChart3, Mail, Heart, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" aria-label="ReClaim home" className="mb-4 inline-flex overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-black/20">
              <Image src="/logo.png" alt="ReClaim" width={150} height={150} className="h-16 w-36 object-contain" />
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              {t('footer.tagline')} {t('hero.sub')}
            </p>
            <div className="flex items-center gap-3">
              <Link href="/impact" aria-label="Community impact" className="p-2 hover:text-white transition-colors"><BarChart3 size={18} /></Link>
              <Link href="/contact" aria-label="Contact ReClaim" className="p-2 hover:text-white transition-colors"><MessageCircle size={18} /></Link>
              <a href="mailto:hello@reclaim.app" aria-label="Email ReClaim" className="p-2 hover:text-white transition-colors"><Mail size={18} /></a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              {[
                [t('nav.lost'), '/items?type=LOST'],
                [t('nav.found'), '/items?type=FOUND'],
                [t('nav.postItem'), '/items/new'],
                ['Impact Dashboard', '/impact'],
                ['Browse All', '/items'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              {[
                [t('nav.signIn'), '/auth/login'],
                [t('nav.signUp'), '/auth/register'],
                [t('nav.dashboard'), '/dashboard'],
                ['My Items', '/dashboard/items'],
                [t('nav.settings'), '/dashboard/settings'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal & Support</h4>
            <ul className="space-y-2 text-sm">
              {[
                ['Privacy Policy', '/privacy'],
                ['Terms of Service', '/terms'],
                ['Contact Us', '/contact'],
                ['FAQ', '/faq'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            © {new Date().getFullYear()} ReClaim. All rights reserved.
          </p>
          <p className="text-xs flex items-center gap-1">
            Built with <Heart size={12} className="text-red-400 fill-red-400" /> for the community
          </p>
        </div>
      </div>
    </footer>
  );
}
