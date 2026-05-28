'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function minCheckOut(checkIn: string) {
  const d = new Date(checkIn);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type Property = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  propertyType: string;
  coverImageUrl?: string | null;
  priceFrom: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

const TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;

export function PropertyListings({
  properties: initialProperties,
  locale,
}: {
  properties: Property[];
  locale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial state from URL params
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '');
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') ?? '');
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') ?? '');
  const [view, setView] = useState<'grid' | 'map'>(() =>
    searchParams.get('view') === 'map' ? 'map' : 'grid',
  );
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') ?? '1') || 1);
  const PAGE_SIZE = 12;

  // Sync filters to URL so links are shareable and back button works
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (typeFilter) params.set('type', typeFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (view === 'map') params.set('view', 'map');
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [search, typeFilter, cityFilter, maxPrice, checkIn, checkOut, view, page, pathname, router]);

  const [dateFilteredProps, setDateFilteredProps] = useState<Property[] | null>(null);
  const [dateLoading, setDateLoading] = useState(false);

  const properties = dateFilteredProps ?? initialProperties;

  const fetchByDates = useCallback(async (ci: string, co: string) => {
    setDateLoading(true);
    try {
      const res = await fetch(`${API_URL}/properties?checkIn=${ci}&checkOut=${co}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data: Property[] };
      setDateFilteredProps(json.data);
    } catch {
      setDateFilteredProps(null);
    } finally {
      setDateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      void fetchByDates(checkIn, checkOut);
    } else {
      setDateFilteredProps(null);
    }
  }, [checkIn, checkOut, fetchByDates]);

  const cities = useMemo(() => {
    const s = new Set(properties.map((p) => p.city));
    return Array.from(s).sort();
  }, [properties]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const max = maxPrice ? parseInt(maxPrice) * 100 : null;
    return properties.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.city.toLowerCase().includes(q) &&
        !p.region.toLowerCase().includes(q)
      )
        return false;
      if (typeFilter && p.propertyType !== typeFilter) return false;
      if (cityFilter && p.city !== cityFilter) return false;
      if (max && p.priceFrom != null && p.priceFrom > max) return false;
      return true;
    });
  }, [properties, search, typeFilter, maxPrice]);

  const hasFilters = search || typeFilter || cityFilter || maxPrice || checkIn;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, cityFilter, maxPrice]);

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('tara_wishlist');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggleWishlist(id: string) {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('tara_wishlist', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      {/* Date availability row */}
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Check-in</span>
          <input
            type="date"
            value={checkIn}
            min={todayStr()}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && e.target.value >= checkOut) setCheckOut('');
            }}
            className="h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Check-out</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn ? minCheckOut(checkIn) : todayStr()}
            disabled={!checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        {dateLoading && <span className="text-xs text-zinc-400">Checking…</span>}
        {checkIn && checkOut && !dateLoading && dateFilteredProps !== null && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {dateFilteredProps.length} available
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, region…"
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
        />
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          {cities.length > 1 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
              ₱
            </span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max/night"
              min="1"
              className="h-11 w-32 rounded-xl border border-zinc-200 bg-white pl-7 pr-3 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setCityFilter('');
                setMaxPrice('');
                setCheckIn('');
                setCheckOut('');
              }}
              className="h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-20 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            {hasFilters
              ? 'No properties match your filters.'
              : 'No properties listed yet — check back soon.'}
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setCityFilter('');
                setMaxPrice('');
                setCheckIn('');
                setCheckOut('');
              }}
              className="text-sm text-zinc-700 underline dark:text-zinc-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}
              {view === 'grid' && totalPages > 1 && ` · page ${page} of ${totalPages}`}
            </p>
            <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
              {(['grid', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === v
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {v === 'grid' ? '⊞ Grid' : '⊙ Map'}
                </button>
              ))}
            </div>
          </div>

          {/* Map view */}
          {view === 'map' && <MapView properties={filtered} locale={locale} />}

          {/* Grid view */}
          {view === 'grid' && (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((p) => (
                  <li key={p.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleWishlist(p.id)}
                      aria-label={wishlist.has(p.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      className="absolute right-6 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm backdrop-blur-sm transition hover:scale-110 dark:bg-zinc-900/80"
                    >
                      {wishlist.has(p.id) ? '❤️' : '🤍'}
                    </button>
                    <Link
                      href={`/${locale}/properties/${p.slug}`}
                      className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="relative mb-3 h-36 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        {p.coverImageUrl ? (
                          <Image
                            src={p.coverImageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="(max-width:640px) 100vw, 50vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-3xl">🏨</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                        <p className="text-sm text-zinc-500">
                          {p.city}, {p.region}
                        </p>
                        <p className="text-xs capitalize text-zinc-400">{p.propertyType}</p>
                      </div>
                      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        {p.priceFrom != null ? (
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            From{' '}
                            <span className="text-base">
                              ₱{(p.priceFrom / 100).toLocaleString('en-PH')}
                            </span>
                            <span className="font-normal text-zinc-500"> /night</span>
                          </p>
                        ) : (
                          <p className="text-sm text-zinc-400">Price on request</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-sm text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium ${
                        n === page
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                          : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-sm text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function MapView({
  properties,
  locale,
}: {
  properties: Property[];
  locale: string;
}): React.ReactElement {
  const mapped = properties.filter((p) => p.latitude && p.longitude);

  if (mapped.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500">No properties with map coordinates yet.</p>
      </div>
    );
  }

  // Compute bounding box
  const lats = mapped.map((p) => p.latitude!);
  const lngs = mapped.map((p) => p.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.3, 0.01);
  const padLng = Math.max((maxLng - minLng) * 0.3, 0.01);
  const bbox = `${minLng - padLng},${minLat - padLat},${maxLng + padLng},${maxLat + padLat}`;

  // Build markers param (OpenStreetMap doesn't support multi-markers natively, use first property centroid)
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${centerLat},${centerLng}`;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <iframe
          title="Properties map"
          src={src}
          width="100%"
          height="400"
          className="block"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="text-xs text-zinc-400">
        Showing {mapped.length} of {properties.length} properties with location data.{' '}
        {properties.length - mapped.length > 0 &&
          `${properties.length - mapped.length} without coordinates are hidden from the map.`}
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {mapped.map((p) => (
          <li key={p.id}>
            <Link
              href={`/${locale}/properties/${p.slug}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-xl">📍</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{p.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {p.city}, {p.region}
                </p>
              </div>
              {p.priceFrom != null && (
                <p className="ml-auto shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  ₱{(p.priceFrom / 100).toLocaleString('en-PH')}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
