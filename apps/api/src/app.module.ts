import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PropertiesModule } from './properties/properties.module.js';

@Module({
  imports: [HealthModule, PropertiesModule],
})
export class AppModule {}
