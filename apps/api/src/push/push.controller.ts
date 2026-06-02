import { Body, Controller, Delete, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { PushService } from './push.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';

const TokenSchema = z.object({ token: z.string().min(1) });

@Controller('push')
@SkipThrottle({ global: true, auth: true, guest_action: true })
@UseGuards(FirebaseGuard)
export class PushController {
  constructor(private readonly svc: PushService) {}

  @Post('token')
  @HttpCode(200)
  async register(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const { token } = TokenSchema.parse(body);
    await this.svc.registerToken(user.uid, token);
    return { ok: true };
  }

  @Delete('token')
  @HttpCode(200)
  async unregister(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const { token } = TokenSchema.parse(body);
    await this.svc.removeToken(user.uid, token);
    return { ok: true };
  }
}
