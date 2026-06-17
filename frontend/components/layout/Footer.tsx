'use client';
import Link from 'next/link';
import { Github, Twitter, Mail, Heart } from 'lucide-react';
import { LogoIcon } from '@/components/shared/Logo';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <LogoIcon size="sm" />
              <span className="font-display font-bold text-lg text-white">
                Re<span className="text-primary-400">Claim</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              Find what matters. Return what's lost. A smart platform connecting people with their belongings.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="p-2 hover:text-white transition-colors"><Github size={18} /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="p-2 hover:text-white transition-colors"><Twitter size={18} /></a>
              <a href="mailto:hello@reclaim.app"
                className="p-2 hover:text-white transition-colors"><Mail size={18} /></a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              {[
                ['Lost Items', '/items?type=LOST'],
                ['Found Items', '/items?type=FOUND'],
                ['Post an Item', '/items/new'],
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
                ['Sign In', '/auth/login'],
                ['Sign Up', '/auth/register'],
                ['My Dashboard', '/dashboard'],
                ['My Items', '/dashboard/items'],
                ['Settings', '/dashboard/settings'],
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
                ['Report an Issue', '/report'],
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
