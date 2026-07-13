import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import CommunityBackdrop from '@/components/layout/CommunityBackdrop';
import ConnectionStatus from '@/components/shared/ConnectionStatus';
import { MotionProvider } from '@/components/providers/MotionProvider';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  ),
  title: { default: 'ReClaim — Find what matters. Return what\'s lost.', template: '%s | ReClaim' },
  applicationName: 'ReClaim',
  description: 'Smart Lost & Found platform connecting people with their lost items through intelligent matching.',
  keywords: ['lost', 'found', 'items', 'matching', 'Sri Lanka'],
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/manifest.webmanifest',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'ReClaim',
    description: 'Find what matters. Return what\'s lost.',
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6FAFE' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl bg-primary-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <CommunityBackdrop />
        <ThemeProvider>
          <LanguageProvider>
            <MotionProvider>
              <AuthProvider>
                <SocketProvider>
                  <div className="min-h-[100dvh]">
                    {children}
                  </div>
                  <ConnectionStatus />
                  <Toaster />
                </SocketProvider>
              </AuthProvider>
            </MotionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
