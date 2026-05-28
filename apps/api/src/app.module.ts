import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ZodExceptionFilter } from './common/zod-exception.filter.js';
import { buildLoggerConfig } from './common/logger.config.js';
import { EmailModule } from './email/email.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { AuditModule } from './audit/audit.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { PriceRulesModule } from './price-rules/price-rules.module.js';

@Module({
  imports: [
    LoggerModule.forRoot(buildLoggerConfig()),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 120 }, // 120 req/min default
      { name: 'auth', ttl: 60_000, limit: 10 }, // 10 req/min on auth endpoints
      { name: 'guest_action', ttl: 60_000, limit: 5 }, // 5 req/min for unauthenticated mutations
    ]),
    AuditModule,
    EmailModule,
    UploadsModule,
    StripeModule,
    HealthModule,
    PropertiesModule,
    RoomsModule,
    BookingsModule,
    ReviewsModule,
    PriceRulesModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
