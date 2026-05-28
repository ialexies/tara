import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { FirebaseGuard, type AuthedUser } from './firebase.guard.js';
import { RolesGuard } from './roles.guard.js';
import { CurrentUser } from './current-user.decorator.js';

const SessionSchema = z.object({ idToken: z.string().min(1) });
const SyncSchema = z.object({
  idToken: z.string().min(1),
  fullName: z.string().optional(),
  role: z.enum(['guest', 'owner']).optional(),
});

@Throttle({ auth: {} })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Exchange a Firebase ID token for a long-lived session cookie value.
   * Web caller is responsible for setting the returned value as an httpOnly cookie.
   */
  @Post('session')
  @HttpCode(200)
  async createSession(@Body() body: unknown) {
    const { idToken } = SessionSchema.parse(body);
    return this.auth.createSession(idToken);
  }

  /**
   * Verify the ID token, upsert profile in DB, set custom claims on the Firebase user.
   * Called after first sign-in (or to update profile data).
   */
  @Post('sync')
  @HttpCode(200)
  async sync(@Body() body: unknown) {
    const input = SyncSchema.parse(body);
    const user = await this.auth.syncProfile(input);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  @Get('me')
  @UseGuards(FirebaseGuard)
  async me(@CurrentUser() user: AuthedUser) {
    const profile = await this.auth.getProfileByUid(user.uid);
    return {
      uid: user.uid,
      email: user.email,
      role: user.role,
      profile,
    };
  }

  @Get('admin/users')
  @UseGuards(FirebaseGuard, RolesGuard)
  async adminListUsers(@CurrentUser() user: AuthedUser) {
    if (user.role !== 'admin') throw new Error('Forbidden');
    const list = await this.auth.listUsers();
    return { data: list };
  }

  @Post('admin/users/:id/role')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  async adminSetRole(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    if (user.role !== 'admin') throw new Error('Forbidden');
    const { role } = z.object({ role: z.enum(['guest', 'owner', 'admin']) }).parse(body);
    const updated = await this.auth.setUserRole(id, role);
    return { id: updated.id, email: updated.email, role: updated.role };
  }
}
