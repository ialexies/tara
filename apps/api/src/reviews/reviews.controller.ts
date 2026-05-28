import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { ReviewsService } from './reviews.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { getFirebaseAdmin } from '../auth/firebase-admin.js';
import { z } from 'zod';

const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

@Controller()
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  /** Public — list published reviews for a property. */
  @Get('properties/:propertyId/reviews')
  async list(@Param('propertyId') propertyId: string) {
    const data = await this.svc.listByProperty(propertyId);
    return { data };
  }

  /** Public — rating stats for a property. */
  @Get('properties/:propertyId/reviews/stats')
  async stats(@Param('propertyId') propertyId: string) {
    return this.svc.stats(propertyId);
  }

  /** Guest — submit a review (auth optional). */
  @Post('reviews')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  @Throttle({ guest_action: { limit: 5, ttl: 60_000 } })
  async create(@Body() body: unknown, @Req() req: FastifyRequest) {
    const input = CreateReviewSchema.parse(body);
    const guestUid = await this.extractOptionalUid(req);
    return this.svc.create(input, guestUid);
  }

  /** Admin — list all reviews. */
  @Get('admin/reviews')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('admin')
  async adminListAll(@CurrentUser() _user: AuthedUser) {
    const data = await this.svc.listAll();
    return { data };
  }

  /** Admin — delete a review. */
  @Delete('admin/reviews/:id')
  @HttpCode(204)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('admin')
  async adminDelete(@Param('id') id: string, @CurrentUser() _user: AuthedUser) {
    await this.svc.delete(id);
  }

  private async extractOptionalUid(req: FastifyRequest): Promise<string | undefined> {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return undefined;
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(auth.slice(7));
      return decoded.uid;
    } catch {
      return undefined;
    }
  }
}
