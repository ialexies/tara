import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ZodExceptionFilter } from './common/zod-exception.filter.js';

@Module({
  imports: [HealthModule, PropertiesModule, AuthModule],
  providers: [{ provide: APP_FILTER, useClass: ZodExceptionFilter }],
})
export class AppModule {}
