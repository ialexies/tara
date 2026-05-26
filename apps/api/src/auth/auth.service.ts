import { Injectable, UnauthorizedException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { users, type User } from '@tara/db/schema';
import { eq } from 'drizzle-orm';
import { getFirebaseAdmin } from './firebase-admin.js';

type SyncProfileInput = {
  idToken: string;
  fullName?: string;
  role?: 'guest' | 'owner';
};

const SESSION_COOKIE_TTL_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

@Injectable()
export class AuthService {
  /**
   * Exchange a Firebase ID token for a long-lived session cookie.
   * The cookie is set httpOnly by the caller; this method just returns the value + maxAge.
   */
  async createSession(idToken: string): Promise<{ sessionCookie: string; maxAge: number }> {
    const admin = getFirebaseAdmin();
    try {
      const sessionCookie = await admin.auth().createSessionCookie(idToken, {
        expiresIn: SESSION_COOKIE_TTL_MS,
      });
      return { sessionCookie, maxAge: SESSION_COOKIE_TTL_MS / 1000 };
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }

  /**
   * Verify a Firebase ID token and upsert a matching user profile row.
   * Called from the web after first sign-in (or whenever profile data needs syncing).
   * Sets role/tenantId as Firebase custom claims so future ID tokens carry them.
   */
  async syncProfile(input: SyncProfileInput): Promise<User> {
    const admin = getFirebaseAdmin();

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(input.idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const { uid, email, email_verified } = decoded;
    if (!email) throw new UnauthorizedException('Firebase token missing email');

    // 1. Lookup by firebase_uid — normal path for repeat sign-ins.
    const [byUid] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);

    let user: User;
    if (byUid) {
      const [updated] = await db
        .update(users)
        .set({
          email,
          emailVerifiedAt: email_verified ? new Date() : byUid.emailVerifiedAt,
          fullName: input.fullName ?? byUid.fullName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byUid.id))
        .returning();
      user = updated!;
    } else {
      // 2. Lookup by email — handles pre-existing rows that don't yet have a firebase_uid.
      const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (byEmail) {
        const [claimed] = await db
          .update(users)
          .set({
            firebaseUid: uid,
            emailVerifiedAt: email_verified ? new Date() : byEmail.emailVerifiedAt,
            fullName: input.fullName ?? byEmail.fullName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, byEmail.id))
          .returning();
        user = claimed!;
      } else {
        // 3. Brand-new user.
        const [created] = await db
          .insert(users)
          .values({
            firebaseUid: uid,
            email,
            emailVerifiedAt: email_verified ? new Date() : null,
            fullName: input.fullName ?? null,
            role: input.role ?? 'guest',
          })
          .returning();
        user = created!;
      }
    }

    await admin.auth().setCustomUserClaims(uid, {
      role: user.role,
      tenantId: user.id,
    });

    return user;
  }

  async getProfileByUid(uid: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
    return user ?? null;
  }
}
