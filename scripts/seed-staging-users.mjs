#!/usr/bin/env node
/**
 * Creates test Firebase Auth users and syncs them to the staging DB.
 *
 * Run on the home server:
 *   node scripts/seed-staging-users.mjs [/path/to/.env]
 *
 * Defaults to /home/ialexies/stacks/tara-staging/.env if no arg given.
 * Pass env vars directly if preferred:
 *   FIREBASE_PROJECT_ID=... node scripts/seed-staging-users.mjs
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);

// Load .env file (handles multiline FIREBASE_PRIVATE_KEY stored as \n literals)
const envFile = process.argv[2] ?? '/home/ialexies/stacks/tara-staging/.env';
try {
  const lines = readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const val = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
  console.log(`Loaded env from ${envFile}`);
} catch {
  console.log('No .env file loaded — using existing environment variables');
}

const TEST_USERS = [
  {
    email: 'guest@test.tara-stays.com',
    password: 'Test1234!',
    displayName: 'Test Guest',
    role: 'guest',
  },
  {
    email: 'owner@test.tara-stays.com',
    password: 'Test1234!',
    displayName: 'Test Owner',
    role: 'owner',
  },
];

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';
const FIREBASE_API_KEY = process.env['NEXT_PUBLIC_FIREBASE_API_KEY'];

function getAdmin() {
  // Path inside the API Docker container; falls back for local runs with node_modules installed
  const adminPath =
    process.env['FIREBASE_ADMIN_PATH'] ?? '/app/apps/api/node_modules/firebase-admin';
  const admin = require(adminPath);
  if (admin.apps?.length > 0) return admin;

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  return admin;
}

async function getOrCreateUser(admin, { email, password, displayName }) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`  ✓ Already exists: ${email} (uid: ${existing.uid})`);
    await admin.auth().updateUser(existing.uid, { password, displayName });
    return existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const user = await admin.auth().createUser({ email, password, displayName });
      console.log(`  + Created: ${email} (uid: ${user.uid})`);
      return user.uid;
    }
    throw err;
  }
}

async function getIdToken(admin, uid) {
  if (!FIREBASE_API_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_FIREBASE_API_KEY — needed to exchange custom token for ID token',
    );
  }
  const customToken = await admin.auth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firebase REST signIn failed: ${body}`);
  }
  const { idToken } = await res.json();
  return idToken;
}

async function syncProfile(idToken, { fullName, role }) {
  const res = await fetch(`${API_URL}/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, fullName, role }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sync failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function main() {
  console.log(`API: ${API_URL}`);
  console.log('');

  const admin = getAdmin();

  for (const u of TEST_USERS) {
    console.log(`Seeding ${u.role}: ${u.email}`);
    try {
      const uid = await getOrCreateUser(admin, u);
      const idToken = await getIdToken(admin, uid);
      const profile = await syncProfile(idToken, { fullName: u.displayName, role: u.role });
      console.log(`  ✓ DB profile synced (id: ${profile.id}, role: ${profile.role})`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    console.log('');
  }

  console.log('Done. Test credentials:');
  for (const u of TEST_USERS) {
    console.log(`  ${u.role.padEnd(6)} ${u.email}  /  ${u.password}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
