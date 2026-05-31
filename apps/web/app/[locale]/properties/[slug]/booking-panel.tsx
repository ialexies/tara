'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
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

  function handleBookRoom(room: AvailabilityResult) {
    router.push(
      `/${locale}/properties/${property.slug}/book?` +
        new URLSearchParams({
          roomId: room.roomId,
          checkIn,
          checkOut,
          roomName: room.roomName,
          rate: String(room.baseNightlyRateMinor),
        }).toString(),
    );
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

      {/* Not ready to book */}
      <p className="text-center text-sm text-zinc-500">
        Not ready to book?{' '}
        <a
          href="#enquiry"
          className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Ask the property a question
        </a>
      </p>

      {/* Availability results */}
      {availability !== null && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Available rooms
          </h2>
          {availability.length === 0 && (
            <p className="text-sm text-zinc-500">No rooms listed for this property.</p>
          )}
          {availability.map((room) => {
            const unavailable = room.availableUnits === 0 || !room.meetsMinNights;

            return (
              <div
                key={room.roomId}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
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
                        Min. {room.minNights} nights required
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {room.availableUnits} of {room.totalUnits} available
                        {room.minNights ? ` · Min. ${room.minNights} nights` : ''}
                      </p>
                    )}
                    {room.availableUnits > 0 && room.meetsMinNights && room.availableUnits <= 2 && (
                      <p className="mt-1 text-xs font-semibold text-orange-500">
                        🔥 Only {room.availableUnits} left!
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
                        ₱{((room.baseNightlyRateMinor * nights) / 100).toLocaleString('en-PH')}
                      </p>
                    )}
                  </div>
                </div>

                {!unavailable && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleBookRoom(room)}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800"
                    >
                      Book this room →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
