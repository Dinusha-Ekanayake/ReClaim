import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl font-display font-bold text-gray-100 mb-2">404</div>
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">Page Not Found</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Looks like this page got lost too. Let's help you find what you're looking for.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn-primary">Go Home</Link>
            <Link href="/items" className="btn-outline">Browse Items</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
