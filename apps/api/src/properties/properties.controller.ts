import { Controller, Get } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly svc: PropertiesService) {}

  @Get()
  async list() {
    const items = await this.svc.listAll();
    return {
      data: items,
      meta: {
        count: items.length,
      },
    };
  }
}
