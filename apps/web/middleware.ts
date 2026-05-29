import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

function buildCsp(nonce: string, apiUrl: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Next.js requires strict-dynamic in production for its own chunks.
    "'strict-dynamic'",
    'https://apis.google.com',
    'https://www.gstatic.com',
    'https://static.cloudflareinsights.com',
    // unsafe-eval only in development (Next.js hot-reload / Turbopack).
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    [
      "connect-src 'self'",
      apiUrl,
      isDev ? 'ws://localhost:3000 ws://localhost:4000' : '',
      'https://staging.tara-stays.com',
      'https://tara-stays.com',
      'https://*.googleapis.com',
      'https://*.firebaseapp.com',
      'https://accounts.google.com',
      'https://securetoken.googleapis.com',
      'https://*.r2.cloudflarestorage.com',
      'https://*.r2.dev',
    ]
      .filter(Boolean)
      .join(' '),
    'frame-src https://tara-stays.firebaseapp.com https://accounts.google.com https://*.firebaseapp.com https://www.openstreetmap.org',
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

  const csp = buildCsp(nonce, apiUrl, isDev);

  // Run next-intl locale routing first.
  const intlResponse = intlMiddleware(request);
  const response = intlResponse ?? NextResponse.next();

  response.headers.set('Content-Security-Policy', csp);
  // x-nonce is read by Next.js runtime to stamp its own inline scripts.
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
