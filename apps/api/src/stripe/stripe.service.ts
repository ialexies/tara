import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { db, bookings, properties, rooms } from '@tara/db';
import { eq, and } from 'drizzle-orm';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;
  private webhookSecret = '';

  constructor(private readonly emailService: EmailService) {}

  onModuleInit() {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (key) {
      this.client = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
    }
    this.webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
  }

  isConfigured() {
    return this.client !== null;
  }

  async createCheckoutSession(params: {
    bookingId: string;
    referenceCode: string;
    propertyName: string;
    propertySlug: string;
    roomName: string;
    nights: number;
    totalMinor: number;
  }): Promise<{ url: string; sessionId: string }> {
    if (!this.client) throw new ServiceUnavailableException('Stripe is not configured');

    const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3000';
    const successUrl = `${webUrl}/en/bookings/${params.bookingId}?stripe=success`;
    const cancelUrl = `${webUrl}/en/properties/${params.propertySlug}`;

    const session = await this.client.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'php',
            product_data: {
              name: `${params.propertyName} — ${params.roomName}`,
              description: `${params.nights} night${params.nights !== 1 ? 's' : ''} · Ref: ${params.referenceCode}`,
            },
            unit_amount: params.totalMinor,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: params.bookingId,
        referenceCode: params.referenceCode,
      },
    });

    if (!session.url) throw new ServiceUnavailableException('Stripe did not return a checkout URL');

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhookEvent(rawBody: Buffer | string, signature: string) {
    if (!this.client) throw new ServiceUnavailableException('Stripe is not configured');
    if (!this.webhookSecret) {
      this.logger.warn({ event: 'stripe.webhook.no_secret' });
      throw new ServiceUnavailableException('Webhook secret not configured');
    }

    const event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.onSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  }

  private async onSessionCompleted(session: Stripe.Checkout.Session) {
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return;

    const [updated] = await db
      .update(bookings)
      .set({ status: 'confirmed', stripeSessionId: session.id, updatedAt: new Date() })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'stripe_pending')))
      .returning();

    if (!updated) {
      this.logger.warn({
        event: 'stripe.session.already_processed',
        sessionId: session.id,
        bookingId,
      });
      return;
    }

    this.logger.log({
      event: 'booking.confirmed',
      bookingId,
      via: 'stripe',
      sessionId: session.id,
    });

    await this.sendConfirmationEmail(updated).catch((err: unknown) => {
      this.logger.error({ event: 'email.confirmation_failed', bookingId, error: String(err) });
    });
  }

  private async onSessionExpired(session: Stripe.Checkout.Session) {
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return;

    await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'stripe_pending')));

    this.logger.log({
      event: 'booking.cancelled',
      bookingId,
      via: 'stripe_expired',
      sessionId: session.id,
    });
  }

  private async sendConfirmationEmail(booking: {
    id: string;
    guestName: string;
    guestEmail: string;
    referenceCode: string;
    propertyId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalMinor: number;
    currency: string;
  }) {
    const [prop] = await db
      .select({ name: properties.name, city: properties.city })
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);
    const [rm] = await db
      .select({ name: rooms.name })
      .from(rooms)
      .where(eq(rooms.id, booking.roomId))
      .limit(1);

    await this.emailService.sendBookingConfirmed({
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      referenceCode: booking.referenceCode,
      propertyName: prop?.name ?? '',
      propertyCity: prop?.city ?? '',
      roomName: rm?.name ?? '',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      totalMinor: booking.totalMinor,
      currency: booking.currency,
      bookingUrl: `${process.env['WEB_URL'] ?? 'http://localhost:3000'}/en/bookings/${booking.id}`,
    });
  }
}
