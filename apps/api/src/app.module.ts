import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/user-throttler.guard.js';
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
import { MessagesModule } from './messages/messages.module.js';
import { WhatsAppModule } from './whatsapp/whatsapp.module.js';
import { WishlistModule } from './wishlist/wishlist.module.js';
import { PromoCodesModule } from './promo-codes/promo-codes.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { GuestBlacklistModule } from './guest-blacklist/guest-blacklist.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { SearchAlertsModule } from './search-alerts/search-alerts.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { PropertyStaffModule } from './property-staff/property-staff.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    LoggerModule.forRoot(buildLoggerConfig()),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        // In production 120 req/min; in dev 2000 — Next.js SSR fires many parallel
        // server-side fetches from one container IP, which would otherwise trigger the limiter.
        limit: process.env['NODE_ENV'] === 'production' ? 120 : 2000,
      },
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
    MessagesModule,
    WhatsAppModule,
    WishlistModule,
    PromoCodesModule,
    GuestBlacklistModule,
    WaitlistModule,
    SearchAlertsModule,
    WebhooksModule,
    PropertyStaffModule,
    ScheduleModule.forRoot(),
    SchedulerModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
