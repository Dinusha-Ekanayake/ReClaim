const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this folder so the build never mis-detects it
  // (avoids the "inferred workspace root" warning when sibling lockfiles exist)
  turbopack: { root: __dirname },
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*` }]
      : [];
  },
};

module.exports = nextConfig;
