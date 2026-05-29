import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import { FirebaseGuard, type AuthedUser } from './firebase.guard.js';
import { RolesGuard, Roles } from './roles.guard.js';
import { CurrentUser } from './current-user.decorator.js';

const SessionSchema = z.object({ idToken: z.string().min(1) });
const SyncSchema = z.object({
  idToken: z.string().min(1),
  fullName: z.string().optional(),
  role: z.enum(['guest', 'owner']).optional(),
});
const UpdateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  nationality: z.string().max(100).optional(),
});

@Throttle({ auth: {} })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly auditSvc: AuditService,
  ) {}

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

  @Patch('me')
  @HttpCode(200)
  @UseGuards(FirebaseGuard)
  async updateMe(@CurrentUser() user: AuthedUser, @Body() body: unknown) {
    const patch = UpdateProfileSchema.parse(body);
    const updated = await this.auth.updateProfile(user.uid, patch);
    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      dateOfBirth: updated.dateOfBirth,
      nationality: updated.nationality,
    };
  }

  @Get('me/referral')
  @UseGuards(FirebaseGuard)
  async getReferralCode(@CurrentUser() user: AuthedUser) {
    return this.auth.getOrCreateReferralCode(user.uid);
  }

  @Get('admin/users')
  @Roles('admin')
  @UseGuards(FirebaseGuard, RolesGuard)
  async adminListUsers() {
    const list = await this.auth.listUsers();
    return { data: list };
  }

  @Post('admin/users/:id/role')
  @HttpCode(200)
  @Roles('admin')
  @UseGuards(FirebaseGuard, RolesGuard)
  async adminSetRole(@Param('id') id: string, @Body() body: unknown) {
    const { role } = z.object({ role: z.enum(['guest', 'owner', 'admin']) }).parse(body);
    const updated = await this.auth.setUserRole(id, role);
    return { id: updated.id, email: updated.email, role: updated.role };
  }

  @Get('admin/audit')
  @Roles('admin')
  @UseGuards(FirebaseGuard, RolesGuard)
  async adminAuditLog(@Query('limit') limit?: string) {
    const data = await this.auditSvc.listRecent(limit ? parseInt(limit, 10) : 100);
    return { data };
  }
}
