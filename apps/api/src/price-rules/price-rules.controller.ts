import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { PriceRulesService } from './price-rules.service.js';
import { FirebaseGuard, type AuthedUser } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { z } from 'zod';

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(120),
  roomId: z.string().uuid().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minNights: z.number().int().positive().nullable().optional(),
  rateOverrideMinor: z.number().int().positive().nullable().optional(),
});

@Controller('properties/:propertyId/price-rules')
@UseGuards(FirebaseGuard, RolesGuard)
@Roles('owner', 'admin')
export class PriceRulesController {
  constructor(private readonly svc: PriceRulesService) {}

  @Get()
  async list(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const data = await this.svc.listByProperty(propertyId, user);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const input = CreateRuleSchema.parse(body);
    return this.svc.create(propertyId, input, user);
  }

  @Delete(':ruleId')
  @HttpCode(204)
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.remove(propertyId, ruleId, user);
  }
}
