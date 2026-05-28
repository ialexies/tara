import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { StripeService } from './stripe.service.js';
import { FirebaseGuard } from '../auth/firebase.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthedUser } from '../auth/firebase.guard.js';
import { PropertiesService } from '../properties/properties.service.js';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    await this.stripeService.handleWebhookEvent(rawBody, signature);
    return { received: true };
  }

  /** Owner — start Stripe Connect onboarding for a property. */
  @Post('connect/:propertyId/onboard')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async startOnboarding(
    @Param('propertyId') propertyId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthedUser,
  ) {
    // Verify ownership
    await this.propertiesService.getOwnedById(propertyId, user);

    const { returnUrl, refreshUrl } = z
      .object({ returnUrl: z.string().url(), refreshUrl: z.string().url() })
      .parse(body);

    return this.stripeService.createConnectOnboardingLink({
      propertyId,
      ownerId: user.uid,
      returnUrl,
      refreshUrl,
    });
  }

  /** Owner — called after returning from Stripe onboarding to finalize the account. */
  @Post('connect/:propertyId/finalize')
  @HttpCode(200)
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async finalizeOnboarding(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    await this.propertiesService.getOwnedById(propertyId, user);
    await this.stripeService.finalizeConnectOnboarding(propertyId);
    return { ok: true };
  }

  /** Owner — get Connect status for a property. */
  @Get('connect/:propertyId/status')
  @UseGuards(FirebaseGuard, RolesGuard)
  @Roles('owner', 'admin')
  async connectStatus(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthedUser) {
    const prop = await this.propertiesService.getOwnedById(propertyId, user);
    return {
      connected: !!prop.stripeConnectAccountId,
      enabled: prop.stripeConnectEnabled ?? false,
      accountId: prop.stripeConnectAccountId ?? null,
    };
  }
}
