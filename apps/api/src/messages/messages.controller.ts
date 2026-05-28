import { Body, Controller, Get, Param, Post, UseGuards, HttpCode } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  senderName: z.string().max(120).optional(),
});

@Controller('bookings/:bookingId/messages')
@UseGuards(FirebaseGuard)
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get()
  async list(@Param('bookingId') bookingId: string, @CurrentUser() user: AuthedUser) {
    const data = await this.svc.listForBooking(bookingId, user);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async send(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { body: text, senderName } = SendMessageSchema.parse(body);
    return this.svc.send(bookingId, user, text, senderName ?? user.email ?? '');
  }
}
