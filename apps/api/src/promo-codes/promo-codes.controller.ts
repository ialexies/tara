import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromoCodesService, CreatePromoCodeSchema } from './promo-codes.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly svc: PromoCodesService) {}

  /** Owner — list my promo codes. */
  @Get()
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async list(@CurrentUser() user: AuthedUser) {
    return { data: await this.svc.listForOwner(user) };
  }

  /** Owner — create a promo code. */
  @Post()
  @HttpCode(201)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async create(@Body() body: unknown, @CurrentUser() user: AuthedUser) {
    const input = CreatePromoCodeSchema.parse(body);
    return this.svc.create(input, user);
  }

  /** Owner — deactivate a promo code. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async deactivate(@Param('id') id: string, @CurrentUser() user: AuthedUser) {
    await this.svc.deactivate(id, user);
  }

  /** Public — validate a promo code before booking. */
  @Get('validate')
  async validate(
    @Query('code') code: string,
    @Query('propertyId') propertyId: string,
    @Query('amount') amount: string,
  ) {
    const {
      code: c,
      propertyId: pid,
      amount: amt,
    } = z
      .object({
        code: z.string().min(1),
        propertyId: z.string().uuid(),
        amount: z.coerce.number().int().min(1),
      })
      .parse({ code, propertyId, amount });
    return this.svc.validate(c, pid, amt);
  }
}
