'use client';

type Booking = {
  referenceCode: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
  currency: string;
};

export function ReceiptButton({
  booking,
  propertyName,
  roomName,
}: {
  booking: Booking;
  propertyName: string;
  roomName: string;
}): React.ReactElement {
  function printReceipt() {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const total = (booking.totalMinor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    w.document.write(`<!DOCTYPE html>
<html><head><title>Receipt – ${esc(booking.referenceCode)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .ref { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; }
  td:last-child { text-align: right; }
  .total td { font-weight: 700; font-size: 16px; border-bottom: none; }
  .footer { margin-top: 32px; font-size: 12px; color: #999; }
</style></head>
<body>
<h1>${esc(propertyName)}</h1>
<p class="ref">Ref: ${esc(booking.referenceCode)}</p>
<table>
  <tr><td>Guest</td><td>${esc(booking.guestName)}</td></tr>
  <tr><td>Room</td><td>${esc(roomName)}</td></tr>
  <tr><td>Check-in</td><td>${esc(booking.checkIn)}</td></tr>
  <tr><td>Check-out</td><td>${esc(booking.checkOut)}</td></tr>
  <tr><td>Nights</td><td>${booking.nights}</td></tr>
  <tr class="total"><td>Total</td><td>₱${total}</td></tr>
</table>
<p class="footer">Tara Stays &bull; tara-stays.com &bull; Thank you for your stay!</p>
</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <button
      onClick={printReceipt}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      ↓ Download receipt
    </button>
  );
}
