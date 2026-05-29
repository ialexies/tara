import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BookConfirmClient } from './book-confirm-client';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

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
  rooms: Room[];
};

async function fetchProperty(slug: string): Promise<Property | null> {
  try {
    const res = await fetch(`${API_URL}/properties/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Property;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await fetchProperty(slug);
  if (!property) return { title: 'Booking · Tara' };
  return { title: `Book · ${property.name} · Tara` };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const roomId = typeof sp.roomId === 'string' ? sp.roomId : null;
  const checkIn = typeof sp.checkIn === 'string' ? sp.checkIn : null;
  const checkOut = typeof sp.checkOut === 'string' ? sp.checkOut : null;
  const roomName = typeof sp.roomName === 'string' ? sp.roomName : null;
  const rate = typeof sp.rate === 'string' ? parseInt(sp.rate, 10) : null;

  if (!roomId || !checkIn || !checkOut || !rate) {
    notFound();
  }

  const property = await fetchProperty(slug);
  if (!property) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3">
          <Link
            href={`/${locale}/properties/${slug}`}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← {property.name}
          </Link>
        </div>
      </header>

      <BookConfirmClient
        property={property}
        locale={locale}
        roomId={roomId}
        checkIn={checkIn}
        checkOut={checkOut}
        roomName={roomName ?? roomId}
        rateMinor={rate}
      />
    </div>
  );
}
