'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken } from 'firebase/auth';
import Image from 'next/image';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { api } from '@/lib/api-client';
import { DateRangeCalendar } from '@/components/date-range-calendar';

type Room = {
  id: string;
  name: string;
  roomType: 'dorm' | 'private';
  capacity: number;
  gender: string | null;
  bathroomType: string | null;
  hasAircon: boolean;
  hasLocker: boolean;
  hasWindow: boolean;
  hasOutletPerBed: boolean;
  description: string | null;
  baseNightlyRateMinor: number;
  coverImageUrl?: string | null;
};

function AmenityBadges({ room }: { room: Room | null }): React.ReactElement | null {
  if (!room) return null;
  const badges: string[] = [];
  if (room.bathroomType) badges.push(`${room.bathroomType} bathroom`);
  if (room.hasAircon) badges.push('Aircon');
  if (room.hasWindow) badges.push('Window');
  if (room.hasLocker) badges.push('Locker');
  if (room.hasOutletPerBed) badges.push('Outlet/bed');
  if (badges.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

type Property = {
  id: string;
  slug: string;
  name: string;
  paymentMode: string;
  rooms: Room[];
};

type AvailabilityResult = {
  roomId: string;
  roomName: string;
  roomType: string;
  capacity: number;
  gender: string | null;
  baseNightlyRateMinor: number;
  availableUnits: number;
  totalUnits: number;
  minNights: number | null;
  meetsMinNights: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function nightCount(checkIn: string, checkOut: string) {
  return Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export function BookingPanel({
  property,
  locale,
}: {
  property: Property;
  locale: string;
}): React.ReactElement {
  const router = useRouter();

  const [checkIn, setCheckIn] = useState(todayStr());
  const [checkOut, setCheckOut] = useState(tomorrowStr());
  const [availability, setAvailability] = useState<AvailabilityResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [bookingRoom, setBookingRoom] = useState<AvailabilityResult | null>(null);
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

  // Pre-fill guest details from the saved profile (DB) then fall back to Firebase
  useEffect(() => {
    const user = isFirebaseConfigured ? firebaseAuth.currentUser : null;
    if (!user) return;
    if (user.email) setGuestEmail(user.email);

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
        if (profile?.phone) setGuestPhone(profile.phone);
        else if (user.phoneNumber) setGuestPhone(user.phoneNumber);
      })
      .catch(() => {
        if (user.displayName) setGuestName(user.displayName);
        if (user.phoneNumber) setGuestPhone(user.phoneNumber);
      });
  }, []);

  // Show email-unverified warning for logged-in users
  const emailUnverified =
    isFirebaseConfigured &&
    firebaseAuth.currentUser != null &&
    !firebaseAuth.currentUser.emailVerified;

  const nights = nightCount(checkIn, checkOut);

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setCheckError(null);
    setAvailability(null);
    setBookingRoom(null);
    try {
      const res = await fetch(
        `${API_URL}/properties/${property.id}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Could not check availability');
      }
      const json = (await res.json()) as { data: AvailabilityResult[] };
      setAvailability(json.data);
    } catch (e: unknown) {
      setCheckError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setChecking(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingRoom) return;
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
          roomId: bookingRoom.roomId,
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

  return (
    <section className="space-y-6">
      {/* Date picker */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Check availability
        </h2>
        <form onSubmit={handleCheckAvailability} className="space-y-4">
          <DateRangeCalendar
            propertyId={property.id}
            checkIn={checkIn}
            checkOut={checkOut}
            onRangeChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
              setAvailability(null);
            }}
          />
          <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800">
            <span className="text-zinc-500">
              {checkIn} → {checkOut}
            </span>
            {nights > 0 && (
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {nights} night{nights !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {checkError && <p className="text-sm text-red-600 dark:text-red-400">{checkError}</p>}
          <button
            type="submit"
            disabled={checking || nights < 1}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {checking ? 'Checking…' : 'Check availability'}
          </button>
        </form>
      </div>

      {/* Email verification warning */}
      {emailUnverified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Please verify your email before booking. Check your inbox for a verification link.
        </div>
      )}

      {/* Availability results */}
      {availability !== null && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Rooms</h2>
          {availability.length === 0 && (
            <p className="text-sm text-zinc-500">No rooms listed for this property.</p>
          )}
          {availability.map((room) => {
            const isSelected = bookingRoom?.roomId === room.roomId;
            const unavailable = room.availableUnits === 0 || !room.meetsMinNights;
            const baseTotal = room.baseNightlyRateMinor * nights;
            const total = promoResult && isSelected ? promoResult.finalAmountMinor : baseTotal;

            return (
              <div
                key={room.roomId}
                className={`overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-50'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {(() => {
                  const coverImg = property.rooms.find((r) => r.id === room.roomId)?.coverImageUrl;
                  return coverImg ? (
                    <div className="relative h-36 w-full">
                      <Image
                        src={coverImg}
                        alt={room.roomName}
                        fill
                        className="object-cover"
                        sizes="(max-width:768px) 100vw, 672px"
                      />
                    </div>
                  ) : null;
                })()}
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{room.roomName}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {room.roomType === 'dorm' ? `${room.capacity}-bed dorm` : 'Private room'}
                      {room.gender ? ` · ${room.gender}-only` : ''}
                    </p>
                    {room.availableUnits === 0 ? (
                      <p className="mt-1 text-xs font-medium text-red-500">Sold out</p>
                    ) : !room.meetsMinNights ? (
                      <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Min. {room.minNights} nights required for these dates
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {room.availableUnits} of {room.totalUnits} available
                        {room.minNights ? ` · Min. ${room.minNights} nights` : ''}
                      </p>
                    )}
                    <AmenityBadges
                      room={property.rooms.find((r) => r.id === room.roomId) ?? null}
                    />
                    {(() => {
                      const desc = property.rooms.find((r) => r.id === room.roomId)?.description;
                      return desc ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {desc}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-zinc-900 dark:text-zinc-50">
                      ₱{(room.baseNightlyRateMinor / 100).toLocaleString('en-PH')}
                      <span className="text-xs font-normal text-zinc-500">/night</span>
                    </p>
                    {nights > 0 && (
                      <p className="text-xs text-zinc-500">
                        × {nights} night{nights !== 1 ? 's' : ''}
                      </p>
                    )}
                    {nights > 0 && (
                      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        ₱{(total / 100).toLocaleString('en-PH')}
                      </p>
                    )}
                  </div>
                </div>

                {!unavailable && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setBookingRoom(isSelected ? null : room)}
                      className={`mt-3 flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      }`}
                    >
                      {isSelected ? 'Cancel' : 'Book this room'}
                    </button>
                  </div>
                )}

                {/* Inline booking form */}
                {isSelected && (
                  <form
                    onSubmit={handleBook}
                    className="mx-4 mb-4 mt-0 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
                  >
                    {/* Price summary */}
                    <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
                      <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>
                          ₱{(room.baseNightlyRateMinor / 100).toLocaleString('en-PH')} × {nights}{' '}
                          night{nights !== 1 ? 's' : ''}
                        </span>
                        <span>₱{(total / 100).toLocaleString('en-PH')}</span>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                        <span>Total</span>
                        <span>₱{(total / 100).toLocaleString('en-PH')}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Your details
                    </p>
                    {bookError && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                        {bookError}
                      </p>
                    )}
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
                          ? 'Phone / WhatsApp *'
                          : 'Phone / WhatsApp (optional)'
                      }
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
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
                    {/* Promo code */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoResult(null);
                          setPromoError(null);
                        }}
                        placeholder="Promo code (optional)"
                        className={`${inputClass} flex-1 uppercase`}
                        maxLength={30}
                      />
                      <button
                        type="button"
                        disabled={!promoCode || checkingPromo}
                        onClick={async () => {
                          setCheckingPromo(true);
                          setPromoError(null);
                          try {
                            const r = await fetch(
                              `${API_URL}/promo-codes/validate?code=${encodeURIComponent(promoCode)}&propertyId=${property.id}&amount=${room.baseNightlyRateMinor * nights}`,
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
                        }}
                        className="flex h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        {checkingPromo ? '…' : 'Apply'}
                      </button>
                    </div>
                    {promoResult && (
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ Code applied — saving ₱
                        {(promoResult.discountMinor / 100).toLocaleString('en-PH')}
                      </p>
                    )}
                    {promoError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{promoError}</p>
                    )}

                    {/* Cancellation policy */}
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      <p className="font-semibold">Cancellation policy</p>
                      <p className="mt-0.5">
                        Cancel free up to 48 hours before check-in for a full refund. Cancellations
                        within 48 hours are non-refundable. Contact the property for special
                        circumstances.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {submitting
                        ? property.paymentMode === 'stripe'
                          ? 'Redirecting…'
                          : 'Confirming…'
                        : property.paymentMode === 'stripe'
                          ? `Pay with card · ₱${(total / 100).toLocaleString('en-PH')}`
                          : `Confirm booking · ₱${(total / 100).toLocaleString('en-PH')}`}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';
