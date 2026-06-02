import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// CSP is set per-request in middleware.ts (nonce-based).
// Only static security headers live here.
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
];

const r2PublicHostname = process.env.R2_PUBLIC_URL
  ? (() => {
      try {
        return new URL(process.env.R2_PUBLIC_URL!).hostname;
      } catch {
        return null;
      }
    })()
  : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tara/schemas'],
  output: 'standalone',
  images: {
    remotePatterns: [
      // Cloudflare R2 public development URLs — covers all *.r2.dev buckets
      { protocol: 'https' as const, hostname: '*.r2.dev' },
      // R2 custom domain (when R2_PUBLIC_URL is set to a non-r2.dev hostname)
      ...(r2PublicHostname && !r2PublicHostname.endsWith('.r2.dev')
        ? [{ protocol: 'https' as const, hostname: r2PublicHostname }]
        : []),
      // Unsplash — used for test/seed property images
      { protocol: 'https' as const, hostname: 'images.unsplash.com' },
      // Allow any https image in development for convenience
      ...(process.env.NODE_ENV === 'development'
        ? [{ protocol: 'https' as const, hostname: '**' }]
        : []),
    ],
  },
  // Allow Playwright running inside a Docker container to reach the dev server
  // via host.docker.internal. Only affects `next dev`, not production.
  allowedDevOrigins: ['host.docker.internal'],
  async rewrites() {
    return [
      // The FCM SW must be served at /firebase-messaging-sw.js but Next.js App Router
      // can't route directory names containing dots — rewrite to a normal API route.
      { source: '/firebase-messaging-sw.js', destination: '/api/fcm-sw' },
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: !process.env.CI,
  telemetry: false,
  // Only upload source maps when SENTRY_AUTH_TOKEN is present (CI/CD only).
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  autoInstrumentServerFunctions: true,
});
