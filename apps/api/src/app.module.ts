import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health/health.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ZodExceptionFilter } from './common/zod-exception.filter.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 120 }, // 120 req/min default
      { name: 'auth', ttl: 60_000, limit: 10 }, // 10 req/min on auth endpoints
    ]),
    HealthModule,
    PropertiesModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
