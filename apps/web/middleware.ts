import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes (we may add /api later for server actions)
  // - Static files (_next/static, _next/image, favicon, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
