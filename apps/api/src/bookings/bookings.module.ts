import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { StripeModule } from '../stripe/stripe.module.js';
import { PriceRulesModule } from '../price-rules/price-rules.module.js';
import { PromoCodesModule } from '../promo-codes/promo-codes.module.js';
import { GuestBlacklistModule } from '../guest-blacklist/guest-blacklist.module.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';
import { WebhooksModule } from '../webhooks/webhooks.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [
    StripeModule,
    PriceRulesModule,
    PromoCodesModule,
    GuestBlacklistModule,
    WaitlistModule,
    WebhooksModule,
    UploadsModule,
    MessagesModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, RolesGuard],
})
export class BookingsModule {}
