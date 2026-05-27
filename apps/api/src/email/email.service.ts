import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

type BookingEmailContext = {
  guestName: string;
  guestEmail: string;
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
  paymentInstructions?: string | null;
};

function pesos(minor: number, currency: string) {
  const symbol = currency === 'PHP' ? '₱' : currency;
  return `${symbol}${(minor / 100).toLocaleString('en-PH')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const key = process.env['RESEND_API_KEY'];
    this.from = process.env['EMAIL_FROM'] ?? 'Tara <noreply@tara-stays.com>';
    this.resend = key ? new Resend(key) : null;
    if (!key) this.logger.warn({ event: 'email.disabled', reason: 'RESEND_API_KEY not set' });
  }

  async sendBookingReceived(ctx: BookingEmailContext): Promise<void> {
    await this.send({
      to: ctx.guestEmail,
      subject: `Booking received – ${ctx.referenceCode}`,
      html: bookingReceivedHtml(ctx),
    });
  }

  async sendOwnerNewBooking(ownerEmail: string, ctx: BookingEmailContext): Promise<void> {
    await this.send({
      to: ownerEmail,
      subject: `New booking at ${ctx.propertyName} – ${ctx.referenceCode}`,
      html: ownerNewBookingHtml(ctx),
    });
  }

  async sendBookingConfirmed(ctx: BookingEmailContext): Promise<void> {
    await this.send({
      to: ctx.guestEmail,
      subject: `Booking confirmed – ${ctx.referenceCode}`,
      html: bookingConfirmedHtml(ctx),
    });
  }

  async sendBookingCancelled(ctx: BookingEmailContext): Promise<void> {
    await this.send({
      to: ctx.guestEmail,
      subject: `Booking cancelled – ${ctx.referenceCode}`,
      html: bookingCancelledHtml(ctx),
    });
  }

  private async send(params: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({ from: this.from, ...params });
      this.logger.log({ event: 'email.sent', to: params.to, subject: params.subject });
    } catch (err) {
      this.logger.error({ event: 'email.send_failed', to: params.to, error: String(err) });
    }
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function shell(title: string, body: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:#18181b;padding:24px 32px}
  .header h1{margin:0;font-size:22px;color:#fff;letter-spacing:-0.5px}
  .body{padding:32px}
  .detail-table{width:100%;border-collapse:collapse;margin:20px 0}
  .detail-table td{padding:8px 0;font-size:14px;border-bottom:1px solid #f4f4f5}
  .detail-table td:first-child{color:#71717a;width:40%}
  .detail-table td:last-child{font-weight:600}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600}
  .badge-pending{background:#fef9c3;color:#854d0e}
  .badge-confirmed{background:#dcfce7;color:#166534}
  .badge-cancelled{background:#fee2e2;color:#991b1b}
  .btn{display:inline-block;margin-top:24px;padding:12px 24px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
  .payment-box{margin-top:20px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;font-size:14px}
  .footer{padding:20px 32px;background:#f4f4f5;font-size:12px;color:#a1a1aa;text-align:center}
</style></head><body><div class="wrap">
<div class="header"><h1>🌺 Tara</h1></div>
<div class="body">${body}</div>
<div class="footer">Tara — Philippines Hostel Booking · You received this because you made or manage a booking.</div>
</div></body></html>`;
}

function summaryTable(ctx: BookingEmailContext) {
  return `<table class="detail-table">
  <tr><td>Reference</td><td>${ctx.referenceCode}</td></tr>
  <tr><td>Property</td><td>${ctx.propertyName}, ${ctx.propertyCity}</td></tr>
  <tr><td>Room</td><td>${ctx.roomName}</td></tr>
  <tr><td>Check-in</td><td>${formatDate(ctx.checkIn)}</td></tr>
  <tr><td>Check-out</td><td>${formatDate(ctx.checkOut)}</td></tr>
  <tr><td>Nights</td><td>${ctx.nights}</td></tr>
  <tr><td>Total</td><td>${pesos(ctx.totalMinor, ctx.currency)}</td></tr>
</table>`;
}

function bookingReceivedHtml(ctx: BookingEmailContext) {
  const payment = ctx.paymentInstructions
    ? `<div class="payment-box"><strong>Payment instructions</strong><br><br>${ctx.paymentInstructions.replace(/\n/g, '<br>')}</div>`
    : '';
  return shell(
    'Booking received',
    `
    <span class="badge badge-pending">Pending</span>
    <h2 style="margin:16px 0 4px">We've received your booking, ${ctx.guestName.split(' ')[0]}!</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 4px">Your booking is being reviewed. You'll hear back once it's confirmed.</p>
    ${summaryTable(ctx)}
    ${payment}
    <a href="${ctx.bookingUrl}" class="btn">View booking</a>
  `,
  );
}

function ownerNewBookingHtml(ctx: BookingEmailContext) {
  return shell(
    'New booking received',
    `
    <span class="badge badge-pending">New booking</span>
    <h2 style="margin:16px 0 4px">New booking at ${ctx.propertyName}</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 4px">Guest: <strong>${ctx.guestName}</strong></p>
    ${summaryTable(ctx)}
    <a href="${ctx.bookingUrl}" class="btn">Review booking</a>
  `,
  );
}

function bookingConfirmedHtml(ctx: BookingEmailContext) {
  return shell(
    'Booking confirmed',
    `
    <span class="badge badge-confirmed">Confirmed</span>
    <h2 style="margin:16px 0 4px">You're all set, ${ctx.guestName.split(' ')[0]}!</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 4px">Your booking at ${ctx.propertyName} is confirmed.</p>
    ${summaryTable(ctx)}
    <a href="${ctx.bookingUrl}" class="btn">View booking</a>
  `,
  );
}

function bookingCancelledHtml(ctx: BookingEmailContext) {
  return shell(
    'Booking cancelled',
    `
    <span class="badge badge-cancelled">Cancelled</span>
    <h2 style="margin:16px 0 4px">Your booking has been cancelled</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 4px">Booking ${ctx.referenceCode} at ${ctx.propertyName} has been cancelled.</p>
    ${summaryTable(ctx)}
    <p style="font-size:14px;color:#71717a;margin-top:16px">If you have questions, please contact the property directly.</p>
  `,
  );
}
