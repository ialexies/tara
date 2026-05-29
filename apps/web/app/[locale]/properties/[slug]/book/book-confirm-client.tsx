'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken, sendEmailVerification } from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { api } from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Property = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  paymentMode: string;
  freeCancelDays: number;
  partialRefundPercent: number;
  contactPhone: string | null;
};

function nightCount(checkIn: string, checkOut: string) {
  return Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

export function BookConfirmClient({
  property,
  locale,
  roomId,
  checkIn,
  checkOut,
  roomName,
  rateMinor,
}: {
  property: Property;
  locale: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  rateMinor: number;
}): React.ReactElement {
  const router = useRouter();
  const nights = nightCount(checkIn, checkOut);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{
    discountMinor: number;
    finalAmountMinor: number;
    code: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const [emailUnverified, setEmailUnverified] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Track whether the profile already had a phone so we know to save after booking
  const profileHasPhone = useRef(false);

  const baseTotal = rateMinor * nights;
  const total = promoResult ? promoResult.finalAmountMinor : baseTotal;

  // Pre-fill from saved profile, fall back to Firebase; check email verification
  useEffect(() => {
    const user = isFirebaseConfigured ? firebaseAuth.currentUser : null;
    if (!user) return;
    if (user.email) setGuestEmail(user.email);
    if (!user.emailVerified) setEmailUnverified(true);

    api.profile
      .get()
      .then((res) => {
        const p = res as {
          profile?: {
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
          };
        };
        const profile = p.profile;
        const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
        if (fullName) setGuestName(fullName);
        else if (user.displayName) setGuestName(user.displayName);
        if (profile?.phone) {
          setGuestPhone(profile.phone);
          profileHasPhone.current = true;
        } else if (user.phoneNumber) {
          setGuestPhone(user.phoneNumber);
          profileHasPhone.current = true;
        }
      })
      .catch(() => {
        if (user.displayName) setGuestName(user.displayName);
        if (user.phoneNumber) setGuestPhone(user.phoneNumber);
      });
  }, []);

  async function handleSendVerification() {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    setSendingVerification(true);
    try {
      await sendEmailVerification(user);
      setVerificationSent(true);
    } catch {
      // silently ignore (already sent recently, etc.)
      setVerificationSent(true);
    } finally {
      setSendingVerification(false);
    }
  }

  async function handleCheckVerified() {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    await user.reload();
    if (firebaseAuth.currentUser?.emailVerified) setEmailUnverified(false);
  }

  async function handleApplyPromo() {
    if (!promoCode) return;
    setCheckingPromo(true);
    setPromoError(null);
    try {
      const r = await fetch(
        `${API_URL}/promo-codes/validate?code=${encodeURIComponent(promoCode)}&propertyId=${property.id}&amount=${baseTotal}`,
      );
      if (!r.ok) {
        const b = (await r.json()) as { message?: string };
        throw new Error(b.message ?? 'Invalid code');
      }
      const data = (await r.json()) as {
        discountMinor: number;
        finalAmountMinor: number;
        code: string;
      };
      setPromoResult(data);
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setCheckingPromo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setBookError(null);
    try {
      const authHeaders: Record<string, string> = {};
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        const token = await getIdToken(currentUser);
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          propertyId: property.id,
          roomId,
          checkIn,
          checkOut,
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          specialRequests: specialRequests || undefined,
          promoCode: promoResult?.code || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Booking failed');
      }
      const booking = (await res.json()) as { id: string; checkoutUrl?: string };

      // Save phone to profile if user is logged in and didn't already have one
      if (guestPhone && !profileHasPhone.current && firebaseAuth.currentUser) {
        api.profile.update({ phone: guestPhone }).catch(() => {});
      }

      if (booking.checkoutUrl) {
        window.location.href = booking.checkoutUrl;
      } else {
        router.push(`/${locale}/bookings/${booking.id}`);
      }
    } catch (e: unknown) {
      setBookError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // Philippine mobile: 09XXXXXXXXX → +639XXXXXXXXX
    if (digits.startsWith('09') && digits.length === 11) return `+63${digits.slice(1)}`;
    // Already international format 639XXXXXXXXX
    if (digits.startsWith('639') && digits.length === 12) return `+${digits}`;
    // +63 already present
    if (raw.startsWith('+63') && digits.length === 12) return `+${digits}`;
    // Return as-is if we can't normalise
    return raw.trim();
  }

  const cancelPolicy =
    property.freeCancelDays > 0
      ? `Free cancellation up to ${property.freeCancelDays} day${property.freeCancelDays !== 1 ? 's' : ''} before check-in.${property.partialRefundPercent > 0 ? ` After that, ${property.partialRefundPercent}% refund.` : ' No refund after that.'}`
      : 'Non-refundable — no cancellation refund.';

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-32 pt-6 sm:px-6">
      {/* Booking summary card */}
      <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Your booking
        </p>
        <p className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-50">{property.name}</p>
        <p className="text-sm text-zinc-500">
          {property.city}, {property.region}
        </p>
        <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Room</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{roomName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Check-in</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatDate(checkIn)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Check-out</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatDate(checkOut)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">
              ₱{(rateMinor / 100).toLocaleString('en-PH')} × {nights} night
              {nights !== 1 ? 's' : ''}
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              ₱{(baseTotal / 100).toLocaleString('en-PH')}
            </span>
          </div>
          {promoResult && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span>Promo ({promoResult.code})</span>
              <span>− ₱{(promoResult.discountMinor / 100).toLocaleString('en-PH')}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">Total</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              ₱{(total / 100).toLocaleString('en-PH')}
            </span>
          </div>
        </div>
      </div>

      {/* Email verification banner */}
      {emailUnverified && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Verify your email to complete your booking
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            We sent a link to <strong>{guestEmail}</strong>. Check your inbox (and spam folder).
          </p>
          {!verificationSent ? (
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={sendingVerification}
              className="mt-3 flex h-9 items-center rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {sendingVerification ? 'Sending…' : 'Send verification email'}
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-amber-700 dark:text-amber-400">
                ✓ Email sent — check your inbox
              </span>
              <button
                type="button"
                onClick={handleCheckVerified}
                className="text-xs font-semibold text-amber-800 underline dark:text-amber-300"
              >
                I&apos;ve verified →
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guest details */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your details</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full name *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              minLength={2}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email address *"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="tel"
              placeholder={
                property.paymentMode === 'manual'
                  ? 'Phone / WhatsApp * (e.g. 09171234567)'
                  : 'Phone / WhatsApp (e.g. 09171234567)'
              }
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              onBlur={(e) => {
                if (e.target.value) setGuestPhone(formatPhone(e.target.value));
              }}
              required={property.paymentMode === 'manual'}
              className={inputClass}
            />
            <textarea
              placeholder="Special requests (optional)"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={2}
              maxLength={500}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Promo code */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Promo code <span className="text-xs font-normal text-zinc-400">(optional)</span>
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setPromoResult(null);
                setPromoError(null);
              }}
              placeholder="Enter code"
              className={`${inputClass} flex-1 uppercase`}
              maxLength={30}
              disabled={!!promoResult}
            />
            <button
              type="button"
              disabled={!promoCode || checkingPromo || !!promoResult}
              onClick={handleApplyPromo}
              className="flex h-11 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              {checkingPromo ? '…' : promoResult ? '✓' : 'Apply'}
            </button>
          </div>
          {promoResult && (
            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Saving ₱{(promoResult.discountMinor / 100).toLocaleString('en-PH')} with{' '}
              {promoResult.code}
            </p>
          )}
          {promoError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promoError}</p>
          )}
        </div>

        {/* Cancellation policy */}
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-semibold">Cancellation policy</p>
          <p className="mt-0.5">{cancelPolicy}</p>
        </div>

        {bookError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {bookError}
          </div>
        )}

        {/* Sticky confirm button */}
        <div className="pb-safe fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto max-w-lg">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? (
                property.paymentMode === 'stripe' ? (
                  'Redirecting to payment…'
                ) : (
                  'Confirming…'
                )
              ) : property.paymentMode === 'stripe' ? (
                <>Pay with card · ₱{(total / 100).toLocaleString('en-PH')}</>
              ) : (
                <>Confirm booking · ₱{(total / 100).toLocaleString('en-PH')}</>
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
