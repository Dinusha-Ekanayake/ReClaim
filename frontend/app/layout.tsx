import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';

export const metadata: Metadata = {
  title: { default: 'ReClaim — Find what matters. Return what\'s lost.', template: '%s | ReClaim' },
  description: 'Smart Lost & Found platform connecting people with their lost items through intelligent matching.',
  keywords: ['lost', 'found', 'items', 'matching', 'Sri Lanka'],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'ReClaim',
    description: 'Find what matters. Return what\'s lost.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
