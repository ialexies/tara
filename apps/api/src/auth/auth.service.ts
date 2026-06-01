import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { users, properties, bookings, type User } from '@tara/db/schema';
import { and, eq, isNull, inArray, count, sum, sql } from 'drizzle-orm';
import { getFirebaseAdmin } from './firebase-admin.js';
import { EmailService } from '../email/email.service.js';

type SyncProfileInput = {
  idToken: string;
  fullName?: string;
  role?: 'guest' | 'owner';
};

const SESSION_COOKIE_TTL_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly email: EmailService) {}

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
      this.logger.log({ event: 'auth.session.created', ttlMs: SESSION_COOKIE_TTL_MS });
      return { sessionCookie, maxAge: SESSION_COOKIE_TTL_MS / 1000 };
    } catch (err) {
      this.logger.warn({
        event: 'auth.session.create_failed',
        reason: err instanceof Error ? err.message : String(err),
      });
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
    } catch (err) {
      this.logger.warn({
        event: 'auth.verify_token.failed',
        reason: err instanceof Error ? err.message : String(err),
      });
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const { uid, email, email_verified } = decoded;
    if (!email) {
      this.logger.warn({ event: 'auth.verify_token.missing_email', firebaseUid: uid });
      throw new UnauthorizedException('Firebase token missing email');
    }

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
          // Only update role when the caller explicitly provides one (e.g. during registration).
          // Normal logins pass no role and should not silently downgrade an owner to guest.
          ...(input.role ? { role: input.role } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, byUid.id))
        .returning();
      user = updated!;
      this.logger.log({ event: 'auth.profile.updated', userId: user.id, firebaseUid: uid });
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
            ...(input.role ? { role: input.role } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.id, byEmail.id))
          .returning();
        user = claimed!;
        this.logger.log({ event: 'auth.profile.claimed', userId: user.id, firebaseUid: uid });
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
        this.logger.log({
          event: 'auth.profile.created',
          userId: user.id,
          firebaseUid: uid,
          role: user.role,
        });
      }
    }

    await admin.auth().setCustomUserClaims(uid, {
      role: user.role,
      tenantId: user.id,
    });
    this.logger.log({
      event: 'auth.claims.set',
      userId: user.id,
      firebaseUid: uid,
      role: user.role,
    });

    return user;
  }

  async getProfileByUid(uid: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
    return user ?? null;
  }

  async getOrCreateReferralCode(uid: string): Promise<{ code: string }> {
    // Fast path: code already exists
    const [user] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.firebaseUid, uid))
      .limit(1);
    if (user?.referralCode) return { code: user.referralCode };

    // Use UPDATE … WHERE referral_code IS NULL so only the first concurrent
    // writer wins — subsequent calls return the already-set code. This avoids
    // the read-then-write race where two requests both see null and the second
    // overwrites the first with a different code.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    await db
      .update(users)
      .set({ referralCode: code })
      .where(and(eq(users.firebaseUid, uid), isNull(users.referralCode)));

    // Re-read to get whichever code won (ours or a concurrent request's)
    const [updated] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.firebaseUid, uid))
      .limit(1);
    return { code: updated!.referralCode! };
  }

  async updateProfile(
    uid: string,
    patch: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      phone?: string;
      dateOfBirth?: string;
      nationality?: string;
    },
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        ...(patch.firstName !== undefined ? { firstName: patch.firstName || null } : {}),
        ...(patch.lastName !== undefined ? { lastName: patch.lastName || null } : {}),
        ...(patch.fullName !== undefined ? { fullName: patch.fullName || null } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
        ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth || null } : {}),
        ...(patch.nationality !== undefined ? { nationality: patch.nationality || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.firebaseUid, uid))
      .returning();
    if (!updated) throw new Error('User not found');
    this.logger.log({ event: 'auth.profile.self_updated', firebaseUid: uid });
    return updated;
  }

  async listUsers(limit = 100, offset = 0): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt).limit(limit).offset(offset);
  }

  async setUserRole(userId: string, role: 'guest' | 'owner' | 'admin'): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new Error('User not found');
    return updated;
  }

  async getPlatformStats() {
    const [[propCount], [ownerCount], [userCount], [bookingStats]] = await Promise.all([
      db.select({ c: count() }).from(properties).where(eq(properties.status, 'active')),
      db
        .select({ c: count() })
        .from(users)
        .where(and(eq(users.role, 'owner'), isNull(users.deletedAt))),
      db.select({ c: count() }).from(users).where(isNull(users.deletedAt)),
      db
        .select({ bookingCount: count(), revenue: sum(bookings.totalMinor) })
        .from(bookings)
        .where(
          and(
            inArray(bookings.status, ['confirmed', 'checked_in', 'checked_out']),
            sql`date_trunc('month', ${bookings.checkIn}::date) = date_trunc('month', now())`,
          ),
        ),
    ]);
    return {
      activeProperties: propCount?.c ?? 0,
      totalOwners: ownerCount?.c ?? 0,
      totalUsers: userCount?.c ?? 0,
      bookingsThisMonth: bookingStats?.bookingCount ?? 0,
      revenueThisMonthMinor: bookingStats?.revenue ? parseInt(String(bookingStats.revenue), 10) : 0,
    };
  }

  async listOwners() {
    const rows = await db.execute(sql`
      SELECT
        u.id, u.email, u.full_name, u.first_name, u.last_name, u.phone, u.created_at,
        COUNT(DISTINCT p.id)::int                                                     AS property_count,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END)::int             AS active_property_count,
        COUNT(DISTINCT b.id)::int                                                     AS booking_count,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed','checked_in','checked_out')
          THEN b.total_minor ELSE 0 END), 0)::int                                    AS total_revenue_minor
      FROM users u
      LEFT JOIN properties p ON p.owner_id = u.id AND p.deleted_at IS NULL
      LEFT JOIN bookings b ON b.property_id = p.id
      WHERE u.role = 'owner' AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return Array.from(rows) as unknown as {
      id: string;
      email: string;
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      created_at: string;
      property_count: number;
      active_property_count: number;
      booking_count: number;
      total_revenue_minor: number;
    }[];
  }

  async broadcastToOwners(subject: string, message: string) {
    const ownerEmails = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, 'owner'), isNull(users.deletedAt)));

    await Promise.allSettled(
      ownerEmails.map(({ email }) => this.email.sendBroadcast(email, subject, message)),
    );
    this.logger.log({ event: 'admin.broadcast.sent', count: ownerEmails.length, subject });
    return { sent: ownerEmails.length };
  }
}
