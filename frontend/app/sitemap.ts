import type { MetadataRoute } from 'next';

const PUBLIC_ROUTES = [
  '',
  '/items',
  '/how-it-works',
  '/impact',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const now = new Date();
  return PUBLIC_ROUTES.map((route, index) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: index < 2 ? 'daily' : 'monthly',
    priority: index === 0 ? 1 : index === 1 ? 0.9 : 0.6,
  }));
}
