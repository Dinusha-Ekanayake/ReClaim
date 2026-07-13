import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import CommunityBackdrop from '@/components/layout/CommunityBackdrop';
import ConnectionStatus from '@/components/shared/ConnectionStatus';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  ),
  title: { default: 'ReClaim — Find what matters. Return what\'s lost.', template: '%s | ReClaim' },
  description: 'Smart Lost & Found platform connecting people with their lost items through intelligent matching.',
  keywords: ['lost', 'found', 'items', 'matching', 'Sri Lanka'],
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'ReClaim',
    description: 'Find what matters. Return what\'s lost.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CommunityBackdrop />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SocketProvider>
                {children}
                <ConnectionStatus />
                <Toaster />
              </SocketProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
