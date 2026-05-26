import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { getFirebaseAdmin } from './firebase-admin.js';

export type AuthedUser = {
  uid: string;
  email: string;
  role: 'guest' | 'owner' | 'admin' | 'ops';
  tenantId: string;
};

/**
 * Verifies a Firebase ID token from the Authorization: Bearer header.
 * The role/tenantId come from Firebase custom claims set during /auth/sync.
 */
@Injectable()
export class FirebaseGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthedUser }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token);
      request.user = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        role: (decoded['role'] as AuthedUser['role']) ?? 'guest',
        tenantId: (decoded['tenantId'] as string) ?? decoded.uid,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}
