import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Set it in .env or your shell.\n' +
      'Dev default: postgres://tara:tara@localhost:5432/tara_dev',
  );
}

/**
 * Postgres client (postgres-js driver).
 *
 * Connection pool — kept small in dev, scale up in prod.
 * Drizzle uses this under the hood.
 */
const queryClient = postgres(DATABASE_URL, {
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 30,
  // SSL only in prod
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

// Re-export schema for convenience: `import { db, users } from '@tara/db';`
export * from './schema/index.js';
