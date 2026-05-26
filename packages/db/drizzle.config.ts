import { defineConfig } from 'drizzle-kit';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://tara:tara@localhost:5433/tara_dev';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
  // Verbose output during generate/migrate
  verbose: true,
  // Show before-and-after diff in generate
  strict: true,
});
