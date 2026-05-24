-- Tara — Postgres init script
-- Runs once on first container start (when postgres-data volume is empty).
--
-- This creates additional databases and extensions we want available in dev.
-- The primary `tara_dev` database is created by the postgres image from
-- POSTGRES_DB env var; this script runs against it.

-- Create a separate database for integration tests so they never collide
-- with development data.
CREATE DATABASE tara_test
  WITH OWNER = tara
       ENCODING = 'UTF8'
       LC_COLLATE = 'C'
       LC_CTYPE = 'C'
       TEMPLATE = template0;

-- Useful extensions in the main dev DB
\connect tara_dev

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "citext";       -- case-insensitive text (emails)
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- composite GIN indexes
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- trigram text search

-- Same extensions in the test DB
\connect tara_test

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
