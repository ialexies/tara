import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [HealthModule, PropertiesModule, AuthModule],
})
export class AppModule {}
