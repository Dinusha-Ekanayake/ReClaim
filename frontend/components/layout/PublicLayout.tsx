import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Suspense } from 'react';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-[100dvh] min-w-0 flex-col overflow-x-clip bg-white/66 backdrop-blur-[2px] transition-colors duration-500 dark:bg-gray-950/72">
      <Suspense fallback={<div className="h-20 border-b border-gray-100 bg-white/90 dark:border-gray-800 dark:bg-gray-950/90" />}>
        <Navbar />
      </Suspense>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
