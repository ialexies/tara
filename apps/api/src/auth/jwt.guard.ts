import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '@tara/auth';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: unknown }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Missing bearer token');

    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET not set');

    try {
      const payload = await verifyAccessToken(token, secret);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}
