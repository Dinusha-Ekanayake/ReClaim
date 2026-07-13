import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false, nocache: true },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
