import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BookingPanel } from './booking-panel';
import { EnquiryForm } from './enquiry-form';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

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

type Amenities = {
  wifi?: boolean;
  parking?: boolean;
  pool?: boolean;
  aircon?: boolean;
  restaurant?: boolean;
  bar?: boolean;
  laundry?: boolean;
  gym?: boolean;
};

type Property = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  addressLine: string | null;
  description: string | null;
  coverImageUrl: string | null;
  propertyType: string;
  paymentMode: string;
  latitude: number | null;
  longitude: number | null;
  manualPaymentMethods: { gcash?: string; maya?: string; bank?: string } | null;
  amenities: Amenities | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  houseRules: string | null;
  contactPhone: string | null;
  freeCancelDays: number;
  partialRefundPercent: number;
  rooms: Room[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await fetchProperty(slug);
  if (!property) return { title: 'Property not found · Tara' };

  const cheapest = property.rooms.reduce<Room | null>(
    (min, r) => (!min || r.baseNightlyRateMinor < min.baseNightlyRateMinor ? r : min),
    null,
  );
  const priceStr = cheapest
    ? ` · From ₱${(cheapest.baseNightlyRateMinor / 100).toLocaleString('en-PH')}/night`
    : '';

  const title = `${property.name} · ${property.city} Hostel${priceStr} · Tara`;
  const description =
    property.description?.slice(0, 160) ??
    `Book ${property.name} in ${property.city}, ${property.region}. ${property.propertyType} accommodation in the Philippines.`;
  const url = `${WEB_URL}/en/properties/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'Tara',
      ...(property.coverImageUrl && {
        images: [{ url: property.coverImageUrl, width: 1200, height: 630, alt: property.name }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(property.coverImageUrl && { images: [property.coverImageUrl] }),
    },
    alternates: { canonical: url },
  };
}

async function fetchProperty(slug: string): Promise<Property | null> {
  try {
    const res = await fetch(`${API_URL}/properties/slug/${slug}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as Property;
  } catch {
    return null;
  }
}

type Review = {
  id: string;
  guestName: string;
  rating: number;
  body: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
};

async function fetchPropertyImages(propertyId: string): Promise<{ id: string; url: string }[]> {
  try {
    const res = await fetch(`${API_URL}/properties/${propertyId}/images`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: { id: string; url: string }[] };
    return json.data;
  } catch {
    return [];
  }
}

async function fetchReviews(propertyId: string): Promise<Review[]> {
  try {
    const res = await fetch(`${API_URL}/properties/${propertyId}/reviews`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: Review[] };
    return json.data;
  } catch {
    return [];
  }
}

async function fetchReviewStats(
  propertyId: string,
): Promise<{ avg: number | null; count: number }> {
  try {
    const res = await fetch(`${API_URL}/properties/${propertyId}/reviews/stats`, {
      cache: 'no-store',
    });
    if (!res.ok) return { avg: null, count: 0 };
    return (await res.json()) as { avg: number | null; count: number };
  } catch {
    return { avg: null, count: 0 };
  }
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<React.ReactElement> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const property = await fetchProperty(slug);
  if (!property) notFound();

  const [propertyReviews, galleryImages, reviewStats] = await Promise.all([
    fetchReviews(property.id),
    fetchPropertyImages(property.id),
    fetchReviewStats(property.id),
  ]);

  const cheapestRoom = property.rooms.reduce<Room | null>(
    (min, r) => (!min || r.baseNightlyRateMinor < min.baseNightlyRateMinor ? r : min),
    null,
  );

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/${locale}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← All properties
        </Link>

        {/* Hero + gallery */}
        <div className="mb-6 space-y-2">
          <div className="relative h-48 overflow-hidden rounded-2xl bg-zinc-100 sm:h-64 dark:bg-zinc-800">
            {property.coverImageUrl ? (
              <Image
                src={property.coverImageUrl}
                alt={property.name}
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 768px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-5xl">🏨</span>
              </div>
            )}
          </div>
          {galleryImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((img) => (
                <div
                  key={img.id}
                  className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                >
                  <div className="absolute inset-0 animate-pulse bg-zinc-200 dark:bg-zinc-700" />
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                    loading="lazy"
                    onLoad={(e) => {
                      const el = e.currentTarget.previousSibling as HTMLElement;
                      if (el) el.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                {property.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-zinc-500">
                  {property.city}, {property.region}
                  {property.addressLine && ` · ${property.addressLine}`}
                </p>
                {reviewStats.count > 0 && (
                  <a
                    href="#reviews"
                    className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
                  >
                    <span>★ {reviewStats.avg!.toFixed(1)}</span>
                    <span className="font-normal text-zinc-500">
                      ({reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''})
                    </span>
                  </a>
                )}
              </div>
            </div>
            {cheapestRoom && (
              <div className="shrink-0 text-right">
                <p className="text-sm text-zinc-500">From</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ₱{(cheapestRoom.baseNightlyRateMinor / 100).toLocaleString('en-PH')}
                </p>
                <p className="text-sm text-zinc-500">/night</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{property.propertyType}</Chip>
            <Chip>{property.paymentMode === 'manual' ? 'GCash / bank' : 'Card payments'}</Chip>
          </div>
          {property.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {property.description}
            </p>
          )}
          {property.amenities && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ['wifi', 'WiFi'],
                  ['parking', 'Parking'],
                  ['pool', 'Pool'],
                  ['aircon', 'Air-con'],
                  ['restaurant', 'Restaurant'],
                  ['bar', 'Bar'],
                  ['laundry', 'Laundry'],
                  ['gym', 'Gym'],
                ] as [keyof Amenities, string][]
              )
                .filter(([key]) => property.amenities?.[key])
                .map(([key, label]) => (
                  <Chip key={key}>{label}</Chip>
                ))}
            </div>
          )}
        </div>

        {/* Check-in / house rules */}
        {(property.checkInTime || property.checkOutTime || property.houseRules) && (
          <div className="mb-8 space-y-3">
            {(property.checkInTime || property.checkOutTime) && (
              <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                {property.checkInTime && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Check-in
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {property.checkInTime}
                    </p>
                  </div>
                )}
                {property.checkOutTime && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Check-out
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {property.checkOutTime}
                    </p>
                  </div>
                )}
              </div>
            )}
            {property.houseRules && (
              <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  House rules
                </p>
                <p className="whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
                  {property.houseRules}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Cancellation policy
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {property.freeCancelDays > 0
                  ? `Free cancellation up to ${property.freeCancelDays} day${property.freeCancelDays !== 1 ? 's' : ''} before check-in.`
                  : 'No free cancellation.'}{' '}
                {property.partialRefundPercent > 0
                  ? `${property.partialRefundPercent}% refund after that.`
                  : 'Non-refundable after the free period.'}
              </p>
            </div>
          </div>
        )}

        {property.latitude && property.longitude && (
          <PropertyMap lat={property.latitude} lng={property.longitude} name={property.name} />
        )}

        {/* Room previews */}
        {property.rooms.some((r) => r.coverImageUrl) && (
          <section className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Rooms</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {property.rooms
                .filter((r) => r.coverImageUrl)
                .map((r) => (
                  <div key={r.id} className="shrink-0 space-y-1">
                    <div className="relative h-32 w-44 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={r.coverImageUrl!}
                        alt={r.name}
                        fill
                        className="object-cover"
                        sizes="176px"
                      />
                    </div>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{r.name}</p>
                    <p className="text-xs text-zinc-400">
                      ₱{(r.baseNightlyRateMinor / 100).toLocaleString('en-PH')}/night
                    </p>
                  </div>
                ))}
            </div>
          </section>
        )}

        <BookingPanel property={property} locale={locale} />

        {propertyReviews.length > 0 && (
          <section id="reviews" className="mt-8">
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Reviews ({propertyReviews.length})
            </h2>
            <ul className="space-y-4">
              {propertyReviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{r.guestName}</p>
                    <span className="text-amber-500">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.body && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {r.body}
                    </p>
                  )}
                  {r.ownerReply && (
                    <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
                      <p className="mb-1 text-xs font-medium text-zinc-500">Owner response</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{r.ownerReply}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <EnquiryForm slug={property.slug} />
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines
      </footer>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </span>
  );
}

function PropertyMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}): React.ReactElement {
  // Zoom 16 = street level; bbox pads ~0.003° (~300 m) around the pin
  const pad = 0.003;
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
  const marker = `${lat},${lng}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">Location</h2>
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <iframe
          title={`Map showing location of ${name}`}
          src={src}
          width="100%"
          height="260"
          className="block"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow backdrop-blur-sm hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  );
}
