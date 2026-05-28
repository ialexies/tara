export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { CancelBookingButton } from './cancel-button';
import { ReviewForm } from './review-form';
import { DateChangeForm } from './date-change-form';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

type BookingDetail = {
  booking: {
    id: string;
    referenceCode: string;
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalMinor: number;
    currency: string;
    status: string;
    paymentMode: string;
    specialRequests: string | null;
  };
  propertyName: string;
  propertySlug: string;
  propertyCity: string;
  propertyRegion: string;
  roomName: string;
  roomType: string;
  manualPaymentMethods: { gcash?: string; maya?: string; bank?: string } | null;
};

async function fetchBooking(id: string): Promise<BookingDetail | null> {
  try {
    const res = await fetch(`${API_URL}/bookings/${id}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as BookingDetail;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ stripe?: string }>;
}): Promise<React.ReactElement> {
  const { locale, id } = await params;
  const { stripe: stripeParam } = await searchParams;
  setRequestLocale(locale);

  const data = await fetchBooking(id);
  if (!data) notFound();

  const {
    booking,
    propertyName,
    propertySlug,
    propertyCity,
    propertyRegion,
    roomName,
    manualPaymentMethods,
  } = data;
  const isPending = booking.status === 'manual_pending';
  const isConfirmed = booking.status === 'confirmed';
  const isStripePending = booking.status === 'stripe_pending';
  const isCheckedOut = booking.status === 'checked_out';
  const canGuestCancel = isPending || isConfirmed;
  const canDateChange = isConfirmed;
  const canReview = isConfirmed || isCheckedOut;
  const stripeJustPaid = stripeParam === 'success';
  const totalPesos = booking.totalMinor / 100;

  const paymentMethods = manualPaymentMethods ?? {};
  const hasPaymentInfo = paymentMethods.gcash || paymentMethods.maya || paymentMethods.bank;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Status banner */}
        {(() => {
          if (isConfirmed) {
            return (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 dark:bg-emerald-950">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    Booking confirmed!
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Ref: <strong>{booking.referenceCode}</strong>
                  </p>
                </div>
              </div>
            );
          }
          if (isStripePending && stripeJustPaid) {
            return (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-4 dark:bg-blue-950">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Payment received — confirming booking…
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You'll get a confirmation email shortly. Ref:{' '}
                    <strong>{booking.referenceCode}</strong>
                  </p>
                </div>
              </div>
            );
          }
          if (isStripePending) {
            return (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-4 dark:bg-amber-950">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Awaiting payment
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Complete your card payment to confirm this booking. Ref:{' '}
                    <strong>{booking.referenceCode}</strong>
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-4 dark:bg-amber-950">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Booking received — awaiting payment
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Ref: <strong>{booking.referenceCode}</strong>
                </p>
              </div>
            </div>
          );
        })()}

        {/* Booking summary */}
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Booking summary
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Property">
              <Link
                href={`/${locale}/properties/${propertySlug}`}
                className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
              >
                {propertyName}
              </Link>
            </Row>
            <Row label="Location">
              {propertyCity}, {propertyRegion}
            </Row>
            <Row label="Room">{roomName}</Row>
            <Row label="Check-in">{formatDate(booking.checkIn)}</Row>
            <Row label="Check-out">{formatDate(booking.checkOut)}</Row>
            <Row label="Nights">{booking.nights}</Row>
            <Row label="Guest">{booking.guestName}</Row>
            <Row label="Email">{booking.guestEmail}</Row>
            {booking.specialRequests && <Row label="Requests">{booking.specialRequests}</Row>}
            <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <Row label="Total">
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  ₱{totalPesos.toLocaleString('en-PH')}
                </span>
              </Row>
            </div>
          </dl>
        </div>

        {/* Payment instructions */}
        {isPending && hasPaymentInfo && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <h2 className="mb-2 text-base font-semibold text-amber-900 dark:text-amber-100">
              How to pay
            </h2>
            <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
              Send <strong>₱{totalPesos.toLocaleString('en-PH')}</strong> to any of the following
              and include your reference code <strong>{booking.referenceCode}</strong>:
            </p>
            <dl className="space-y-2 text-sm">
              {paymentMethods.gcash && <Row label="GCash">{paymentMethods.gcash}</Row>}
              {paymentMethods.maya && <Row label="Maya">{paymentMethods.maya}</Row>}
              {paymentMethods.bank && <Row label="Bank">{paymentMethods.bank}</Row>}
            </dl>
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              The property will confirm your booking once payment is received. You'll get an update
              at {booking.guestEmail}.
            </p>
          </div>
        )}

        {isPending && !hasPaymentInfo && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            The property will contact you at <strong>{booking.guestEmail}</strong> with payment
            instructions shortly.
          </div>
        )}

        <Link
          href={`/${locale}`}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Browse more properties
        </Link>

        {canDateChange && (
          <div className="mt-4">
            <DateChangeForm
              bookingId={booking.id}
              guestEmail={booking.guestEmail}
              currentCheckIn={booking.checkIn}
              currentCheckOut={booking.checkOut}
            />
          </div>
        )}

        {canGuestCancel && (
          <div className="mt-4">
            <CancelBookingButton bookingId={booking.id} guestEmail={booking.guestEmail} />
          </div>
        )}

        {canReview && (
          <div className="mt-4">
            <ReviewForm bookingId={booking.id} />
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-700 dark:text-zinc-300">{children}</dd>
    </div>
  );
}
