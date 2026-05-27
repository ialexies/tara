import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// API origin allowed in connect-src — includes localhost in dev/Docker, prod URL in production.
const apiPublicUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Allow Firebase Auth popup to close itself and postMessage back to the opener.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    // unsafe-inline + unsafe-eval required by Next.js App Router hydration.
    // Firebase Auth domains allow Google sign-in popup and Identity Toolkit calls.
    // Migrate to nonce-based CSP when moving to production.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${apiPublicUrl} ${process.env.NODE_ENV === 'development' ? 'ws://localhost:3000 ws://localhost:4000' : ''} https://staging.tara-stays.com https://tara-stays.com https://*.googleapis.com https://*.firebaseapp.com https://accounts.google.com https://securetoken.googleapis.com https://*.r2.cloudflarestorage.com https://*.r2.dev`,
      'frame-src https://tara-stays.firebaseapp.com https://accounts.google.com https://*.firebaseapp.com',
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tara/schemas'],
  output: 'standalone',
  images: {
    remotePatterns: [
      // R2 public bucket URL — populated once R2 credentials are set
      ...(r2PublicHostname ? [{ protocol: 'https' as const, hostname: r2PublicHostname }] : []),
      // Allow any https image in development for convenience
      ...(process.env.NODE_ENV === 'development'
        ? [{ protocol: 'https' as const, hostname: '**' }]
        : []),
    ],
  },
  // Allow Playwright running inside a Docker container to reach the dev server
  // via host.docker.internal. Only affects `next dev`, not production.
  allowedDevOrigins: ['host.docker.internal'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
