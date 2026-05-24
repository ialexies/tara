import { customType } from 'drizzle-orm/pg-core';

/**
 * citext — case-insensitive text.
 * Postgres extension `citext` must be enabled (it is, via infra/postgres/init.sql).
 * Useful for emails and other identifiers where casing varies.
 */
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});
