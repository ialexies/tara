import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { AuthedUser } from './firebase.guard.js';

export const ROLES_KEY = 'roles';

/** Decorator — mark a route with the roles that may access it. */
export const Roles = (...roles: AuthedUser['role'][]) => Reflect.metadata(ROLES_KEY, roles);

/**
 * Must be applied AFTER FirebaseGuard (which populates request.user).
 * Throws 403 if the authenticated user's role is not in the allowed list.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<AuthedUser['role'][]>(ROLES_KEY, context.getHandler());
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthedUser }>();

    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
