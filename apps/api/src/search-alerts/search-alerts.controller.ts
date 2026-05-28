import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { SearchAlertsService } from './search-alerts.service.js';
import { z } from 'zod';

const SaveSchema = z.object({
  guestEmail: z.string().email(),
  city: z.string().optional(),
  propertyType: z.string().optional(),
  maxPriceMinor: z.number().int().positive().optional(),
  amenities: z.array(z.string()).optional(),
});

@Controller('search-alerts')
export class SearchAlertsController {
  constructor(private readonly svc: SearchAlertsService) {}

  @Post()
  @HttpCode(201)
  async save(@Body() body: unknown) {
    const { guestEmail, ...filters } = SaveSchema.parse(body);
    return this.svc.save(guestEmail, filters);
  }

  @Get()
  async list(@Query('email') email: string) {
    if (!email) return { data: [] };
    return { data: await this.svc.listForEmail(email) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Query('email') email: string) {
    await this.svc.remove(id, email ?? '');
  }
}
