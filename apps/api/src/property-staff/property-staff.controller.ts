import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { PropertyStaffService } from './property-staff.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { z } from 'zod';

const InviteSchema = z.object({
  staffEmail: z.string().email(),
  role: z.enum(['cohost', 'manager']).default('cohost'),
});

@Controller('properties/:propertyId/staff')
@UseGuards(FirebaseGuard, RolesGuard)
@Roles('owner', 'admin')
export class PropertyStaffController {
  constructor(private readonly svc: PropertyStaffService) {}

  @Get()
  async list(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    return { data: await this.svc.listForProperty(propertyId, user) };
  }

  @Post()
  @HttpCode(201)
  async invite(
    @Param('propertyId') propertyId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    const { staffEmail, role } = InviteSchema.parse(body);
    return this.svc.invite(propertyId, staffEmail, role, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.svc.remove(propertyId, id, user);
  }
}
