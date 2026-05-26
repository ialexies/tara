import { cookies } from 'next/headers';
import { getFirebaseAdmin } from './firebase-admin';

const SESSION_COOKIE = 'tara_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type Session = {
  uid: string;
  email: string;
  role: 'guest' | 'owner' | 'admin' | 'ops';
  tenantId?: string;
  emailVerified: boolean;
};

/**
 * Read and verify the session cookie. Returns the decoded user, or null if
 * no cookie / invalid / expired / revoked.
 */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role: (decoded['role'] as Session['role']) ?? 'guest',
      tenantId: decoded['tenantId'] as string | undefined,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(value: string, maxAge: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
