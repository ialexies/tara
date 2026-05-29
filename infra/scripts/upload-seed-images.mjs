#!/usr/bin/env node
/**
 * Uploads Zambales seed property images directly to R2 and updates the DB.
 * Bypasses the API auth layer — suitable for local dev seeding only.
 *
 * Usage:
 *   node infra/scripts/upload-seed-images.mjs
 *
 * Requires:
 *   - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL in .env
 *   - tara-postgres Docker container running locally
 *   - pnpm add -g @aws-sdk/client-s3  (or uses project dependency)
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

// ─── Load .env ─────────────────────────────────────────────────────────────────
const envPath = new URL('../../.env', import.meta.url).pathname;
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const key = t.slice(0, idx);
    const val = t.slice(idx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  /* ignore */
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET ?? 'tara-dev';
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ?? `https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev`;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY must be set in .env');
  process.exit(1);
}

// ─── AWS SDK v3 for R2 ─────────────────────────────────────────────────────────
// AWS SDK lives in the api package — resolve from there
const sdkPath = new URL(
  '../../apps/api/node_modules/@aws-sdk/client-s3/dist-cjs/index.js',
  import.meta.url,
).pathname;
const { S3Client, PutObjectCommand } = await import(sdkPath).catch(async () => {
  // Fallback: pnpm hoisted location
  return import('@aws-sdk/client-s3').catch(() => {
    console.error('Missing @aws-sdk/client-s3 — run: pnpm install');
    process.exit(1);
  });
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToR2(buffer, ext = 'jpg') {
  const key = `seed/${randomUUID()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

function psql(sql) {
  return execSync(
    `docker exec tara-postgres psql -U tara -d tara_dev -t -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' },
  ).trim();
}

function psqlRows(sql) {
  const raw = psql(sql);
  return raw
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split('|').map((c) => c.trim()));
}

// ─── Fetch seed data directly from DB ─────────────────────────────────────────

function getSeedProperties() {
  const rows = psqlRows(
    'SELECT id, name, cover_image_url FROM properties WHERE is_mock=true ORDER BY name;',
  );
  return rows.map(([id, name, coverImageUrl]) => ({
    id,
    name: name?.trim(),
    coverImageUrl: coverImageUrl?.trim(),
  }));
}

function getPropertyImages(propertyId) {
  const rows = psqlRows(
    `SELECT id, url FROM property_images WHERE property_id='${propertyId}' ORDER BY position;`,
  );
  return rows.map(([id, url]) => ({ id: id?.trim(), url: url?.trim() }));
}

function getRooms(propertyId) {
  const rows = psqlRows(
    `SELECT id, name, cover_image_url FROM rooms WHERE property_id='${propertyId}' AND deleted_at IS NULL ORDER BY name;`,
  );
  return rows.map(([id, name, coverImageUrl]) => ({
    id,
    name: name?.trim(),
    coverImageUrl: coverImageUrl?.trim(),
  }));
}

function updatePropertyCover(propertyId, url) {
  psql(`UPDATE properties SET cover_image_url='${url}' WHERE id='${propertyId}';`);
}

function updatePropertyImage(imageId, url) {
  psql(`UPDATE property_images SET url='${url}' WHERE id='${imageId}';`);
}

function updateRoomCover(roomId, url) {
  psql(`UPDATE rooms SET cover_image_url='${url}' WHERE id='${roomId}';`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const properties = getSeedProperties();
  console.log(`Processing ${properties.length} seed properties\n`);

  for (const prop of properties) {
    console.log(`\n── ${prop.name} ──`);

    // Cover image
    if (prop.coverImageUrl?.includes('unsplash.com')) {
      process.stdout.write('  Cover… ');
      try {
        const buf = await downloadBuffer(prop.coverImageUrl);
        const r2url = await uploadToR2(buf);
        updatePropertyCover(prop.id, r2url);
        console.log(`✓ ${r2url.split('/').pop()}`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    } else {
      console.log(`  Cover: already R2 or no image`);
    }

    // Gallery images
    const imgs = getPropertyImages(prop.id);
    const unsplashImgs = imgs.filter((i) => i.url?.includes('unsplash.com'));
    if (unsplashImgs.length) console.log(`  Gallery: ${unsplashImgs.length} images`);
    for (const img of unsplashImgs) {
      process.stdout.write(`    img ${img.id?.slice(0, 8)}… `);
      try {
        const buf = await downloadBuffer(img.url);
        const r2url = await uploadToR2(buf);
        updatePropertyImage(img.id, r2url);
        console.log(`✓`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    }

    // Room covers
    const rooms = getRooms(prop.id);
    for (const room of rooms) {
      if (!room.coverImageUrl?.includes('unsplash.com')) continue;
      process.stdout.write(`  Room "${room.name}"… `);
      try {
        const buf = await downloadBuffer(room.coverImageUrl);
        const r2url = await uploadToR2(buf);
        updateRoomCover(room.id, r2url);
        console.log(`✓`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    }
  }

  console.log('\n\n✓ Done — all seed images are now in R2.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
