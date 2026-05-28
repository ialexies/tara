import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { AuthedUser } from '../auth/firebase.guard.js';

/**
 * Rate-limit by Firebase UID when the request has an authenticated user,
 * falling back to IP for unauthenticated requests.
 *
 * This prevents a noisy guest on shared WiFi from throttling other users.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: FastifyRequest & { user?: AuthedUser },
  ): Promise<string> {
    const uid = req.user?.uid;
    if (uid) return `uid:${uid}`;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? req.ip ?? 'anon';
    return req.ip ?? 'anon';
  }
}
