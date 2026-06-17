'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PublicLayout from '@/components/layout/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-100/40 dark:bg-blue-500/10 rounded-full blur-3xl animate-float-slow pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-100/30 dark:bg-emerald-500/10 rounded-full blur-3xl animate-float pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md relative z-10">
          <div className="text-8xl font-display font-bold text-gray-100 dark:text-gray-800 mb-2 select-none">404</div>
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
            className="text-4xl mb-4">🔍</motion.div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">Page Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Looks like this page got lost too. Let's help you find what you're looking for.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn-primary">Go Home</Link>
            <Link href="/items" className="btn-outline">Browse Items</Link>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}
