import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../../../packages/db/migrations');

let container: StartedPostgreSqlContainer;

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('tara_test')
    .withUsername('tara')
    .withPassword('tara')
    .start();

  const url = container.getConnectionUri();
  process.env['DATABASE_URL'] = url;
  process.env['DATABASE_SSL'] = 'false';
  process.env['JWT_SECRET'] = 'integration-test-secret-min-32-chars!!';

  const sql = postgres(url, { ssl: false });
  await sql`CREATE EXTENSION IF NOT EXISTS citext`;

  const m0 = readFileSync(join(MIGRATIONS_DIR, '0000_initial_schema.sql'), 'utf8');
  const m1 = readFileSync(join(MIGRATIONS_DIR, '0001_add_user_role_column.sql'), 'utf8');

  for (const stmt of [
    ...m0.split('--> statement-breakpoint'),
    ...m1.split('--> statement-breakpoint'),
  ]) {
    const trimmed = stmt.trim();
    if (trimmed) await sql.unsafe(trimmed);
  }

  await sql.end();
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
