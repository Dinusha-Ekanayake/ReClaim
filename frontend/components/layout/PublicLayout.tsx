import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Suspense } from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-white/70 dark:bg-gray-950/75 backdrop-blur-[2px] transition-colors duration-500">
      <Suspense fallback={<div className="h-20 border-b border-gray-100 bg-white/90 dark:border-gray-800 dark:bg-gray-950/90" />}>
        <Navbar />
      </Suspense>
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
