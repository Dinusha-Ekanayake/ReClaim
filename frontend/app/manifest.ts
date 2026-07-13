import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReClaim — Community Lost & Found',
    short_name: 'ReClaim',
    description: 'Report, match, verify, and safely return lost items across Sri Lankan communities.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6FAFE',
    theme_color: '#1E63A7',
    orientation: 'portrait-primary',
    categories: ['utilities', 'social'],
    icons: [
      {
        src: '/favicon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
