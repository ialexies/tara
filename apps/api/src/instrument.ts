import * as Sentry from '@sentry/node';

// Must be imported before any other modules.
// No-ops when SENTRY_DSN is not set.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}
