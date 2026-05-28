import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { StripeController } from './stripe.controller.js';
import { PropertiesService } from '../properties/properties.service.js';
import { EmailService } from '../email/email.service.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  controllers: [StripeController],
  providers: [StripeService, PropertiesService, EmailService, RolesGuard],
  exports: [StripeService],
})
export class StripeModule {}
