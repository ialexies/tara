'use server';

import { setSessionCookie, clearSessionCookie, SESSION_TTL_SECONDS } from './session';
import { getFirebaseAdmin } from './firebase-admin';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

type SyncResult = { error: string } | { ok: true; role: string };

/**
 * Create the local user profile (DB row) and set Firebase custom claims for role/tenantId.
 * Called by the client after Firebase sign-in but before establishing the session.
 */
export async function syncProfileAction(
  idToken: string,
  profile: { fullName?: string; role?: 'guest' | 'owner' },
): Promise<SyncResult> {
  try {
    const res = await fetch(`${API_URL}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...profile }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { error: body.message ?? 'Profile sync failed' };
    }
    const { role } = (await res.json()) as { role: string };
    return { ok: true, role };
  } catch {
    return { error: 'Could not connect to server' };
  }
}

/**
 * Exchange a (refreshed) Firebase ID token for an httpOnly session cookie.
 * Caller must have already run syncProfileAction and refreshed the ID token client-side.
 */
export async function establishSessionAction(idToken: string): Promise<{ error: string } | null> {
  try {
    const admin = getFirebaseAdmin();
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_TTL_SECONDS * 1000,
    });
    await setSessionCookie(sessionCookie, SESSION_TTL_SECONDS);
    console.log('[establishSession] cookie set, length:', sessionCookie.length);
    return null;
  } catch (err) {
    console.error('[establishSession] failed:', err);
    return { error: 'Failed to create session' };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
}
