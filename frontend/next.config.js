const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

function configuredUrl(name, developmentFallback, requiredPath) {
  const configured = process.env[name];
  if (isProduction && !configured) {
    throw new Error(`Production requires ${name}.`);
  }

  const raw = (configured || developmentFallback).replace(/\/+$/, '');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }

  const expectedPath = requiredPath || '/';
  if (url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) {
    throw new Error(`${name} must be an origin${requiredPath ? ` ending in ${requiredPath}` : ''} without credentials, query, or fragment.`);
  }
  if (isProduction && url.protocol !== 'https:') {
    throw new Error(`Production requires an HTTPS ${name}.`);
  }
  if (isProduction && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname)) {
    throw new Error(`Production ${name} cannot use a loopback host.`);
  }
  return requiredPath ? `${url.origin}${requiredPath}` : url.origin;
}

const backendApiUrl = configuredUrl('NEXT_PUBLIC_API_URL', 'http://localhost:5000/api', '/api');
const apiOrigin = new URL(backendApiUrl).origin;
const socketOrigin = configuredUrl('NEXT_PUBLIC_SOCKET_URL', 'http://localhost:5000');
configuredUrl('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
const websocketOrigin = socketOrigin.replace(/^http/, 'ws');
const connectSources = ["'self'", apiOrigin, socketOrigin, websocketOrigin].filter(Boolean).join(' ');
const scriptSources = ["'self'", "'unsafe-inline'", ...(!isProduction ? ["'unsafe-eval'"] : [])].join(' ');
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `connect-src ${connectSources}`,
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Pin the workspace root to this folder so the build never mis-detects it
  // (avoids the "inferred workspace root" warning when sibling lockfiles exist)
  turbopack: { root: __dirname },
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // React/Next development runs in a restricted local process in some IDEs.
    // Let the browser fetch Cloudinary directly there; production keeps the
    // optimized Next image pipeline.
    unoptimized: !isProduction,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendApiUrl}/:path*` }];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ...(isProduction
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
          : []),
      ],
    }];
  },
};

module.exports = nextConfig;
