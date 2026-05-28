import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { StripeModule } from '../stripe/stripe.module.js';
import { PriceRulesModule } from '../price-rules/price-rules.module.js';

@Module({
  imports: [StripeModule, PriceRulesModule],
  controllers: [BookingsController],
  providers: [BookingsService, RolesGuard],
})
export class BookingsModule {}
