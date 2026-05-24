import { defineRouting } from 'next-intl/routing';

/**
 * i18n routing configuration.
 * See ADR-0007 (docs/adr/0007-internationalization.md) for the full strategy.
 *
 * Locales at launch: en (default), tl (Tagalog)
 * Future: ceb, hil, id, th, vi
 */
export const routing = defineRouting({
  locales: ['en', 'tl'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
