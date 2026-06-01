import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { ReferralsService } from './referrals.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Controller()
export class ReferralsController {
  constructor(private readonly svc: ReferralsService) {}

  @Post('referrals/track')
  @HttpCode(200)
  @UseGuards(FirebaseGuard)
  async track(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const { code } = z.object({ code: z.string().min(1) }).parse(body);
    return this.svc.track(code, user.uid, user.email);
  }

  @Get('referrals/mine')
  @SkipThrottle({ global: true, auth: true, guest_action: true })
  @UseGuards(FirebaseGuard)
  async mine(@CurrentUser() user: AuthedUser) {
    return this.svc.getStats(user.uid);
  }
}
