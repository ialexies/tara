import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

type BookingCtx = {
  guestName: string;
  guestPhone: string;
  referenceCode: string;
  propertyName: string;
  propertyCity: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
  currency: string;
  bookingUrl: string;
};

function pesos(minor: number, currency: string) {
  const symbol = currency === 'PHP' ? '₱' : currency;
  return `${symbol}${(minor / 100).toLocaleString('en-PH')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Normalize Philippine numbers to E.164 (+63XXXXXXXXXX)
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.length === 10) return `+63${digits}`;
  if (digits.startsWith('+')) return raw.replace(/\s/g, '');
  return null;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly from: string;

  constructor() {
    const sid = process.env['TWILIO_ACCOUNT_SID'];
    const token = process.env['TWILIO_AUTH_TOKEN'];
    this.from = process.env['TWILIO_WHATSAPP_FROM'] ?? 'whatsapp:+14155238886'; // Twilio sandbox default
    this.client = sid && token ? twilio(sid, token) : null;
    if (!this.client) {
      this.logger.warn({
        event: 'whatsapp.disabled',
        reason: 'TWILIO_ACCOUNT_SID/AUTH_TOKEN not set',
      });
    }
  }

  async sendBookingReceived(ctx: BookingCtx): Promise<void> {
    await this.send(
      ctx.guestPhone,
      `🌺 *Booking received!*\n\nHi ${ctx.guestName.split(' ')[0]}, your booking at *${ctx.propertyName}* (${ctx.propertyCity}) is under review.\n\n📅 ${formatDate(ctx.checkIn)} → ${formatDate(ctx.checkOut)} (${ctx.nights} night${ctx.nights !== 1 ? 's' : ''})\n🛏 ${ctx.roomName}\n💰 ${pesos(ctx.totalMinor, ctx.currency)}\n📋 Ref: ${ctx.referenceCode}\n\nView: ${ctx.bookingUrl}`,
    );
  }

  async sendBookingConfirmed(ctx: BookingCtx): Promise<void> {
    await this.send(
      ctx.guestPhone,
      `✅ *Booking confirmed!*\n\nYou're all set, ${ctx.guestName.split(' ')[0]}!\n\n🏠 *${ctx.propertyName}*, ${ctx.propertyCity}\n🛏 ${ctx.roomName}\n📅 Check-in: ${formatDate(ctx.checkIn)}\n📅 Check-out: ${formatDate(ctx.checkOut)}\n💰 Total: ${pesos(ctx.totalMinor, ctx.currency)}\n📋 Ref: ${ctx.referenceCode}\n\nView booking: ${ctx.bookingUrl}`,
    );
  }

  async sendBookingCancelled(ctx: BookingCtx): Promise<void> {
    await this.send(
      ctx.guestPhone,
      `❌ *Booking cancelled*\n\nYour booking at *${ctx.propertyName}* (Ref: ${ctx.referenceCode}) has been cancelled.\n\nIf you have questions, please contact the property directly.`,
    );
  }

  async sendBookingReminder(ctx: BookingCtx): Promise<void> {
    await this.send(
      ctx.guestPhone,
      `⏰ *Reminder: your stay is tomorrow!*\n\nHi ${ctx.guestName.split(' ')[0]}, you check in tomorrow at *${ctx.propertyName}*, ${ctx.propertyCity}.\n\n📅 Check-in: ${formatDate(ctx.checkIn)}\n🛏 ${ctx.roomName}\n📋 Ref: ${ctx.referenceCode}\n\nHave a great stay! 🌴`,
    );
  }

  private async send(to: string, body: string): Promise<void> {
    if (!this.client) return;

    const normalized = normalizePhone(to);
    if (!normalized) {
      this.logger.warn({ event: 'whatsapp.invalid_number', raw: to });
      return;
    }

    try {
      await this.client.messages.create({
        from: this.from,
        to: `whatsapp:${normalized}`,
        body,
      });
      this.logger.log({ event: 'whatsapp.sent', to: normalized });
    } catch (err) {
      this.logger.error({ event: 'whatsapp.send_failed', to: normalized, error: String(err) });
    }
  }
}
