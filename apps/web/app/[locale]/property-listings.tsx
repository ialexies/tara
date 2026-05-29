'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { isFirebaseConfigured } from '@/lib/firebase-client';
import { DateRangeCalendar } from '@/components/date-range-calendar';

const PropertiesMap = dynamic(
  () => import('@/components/properties-map').then((m) => m.PropertiesMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
    ),
  },
);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TYPE_STYLES: Record<string, string> = {
  hostel: 'bg-emerald-600 text-white',
  guesthouse: 'bg-sky-600 text-white',
  hotel: 'bg-indigo-600 text-white',
  resort: 'bg-amber-500 text-white',
  apartment: 'bg-violet-600 text-white',
  inn: 'bg-zinc-600 text-white',
};

function PropertyTypeBadge({ type }: { type: string }): React.ReactElement {
  const style = TYPE_STYLES[type.toLowerCase()] ?? 'bg-zinc-600 text-white';
  return (
    <span
      className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize leading-tight ${style}`}
    >
      {type}
    </span>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
const AMENITY_OPTIONS = [
  { key: 'wifi', label: 'WiFi' },
  { key: 'parking', label: 'Parking' },
  { key: 'pool', label: 'Pool' },
  { key: 'aircon', label: 'AC' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'gym', label: 'Gym' },
] as const;

const PAGE_SIZE = 12;

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

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? '');
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') ?? '');
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') ?? '');
  const [amenities, setAmenities] = useState<Set<string>>(() => {
    const raw = searchParams.get('amenities') ?? '';
    return raw ? new Set(raw.split(',')) : new Set();
  });
  const [view, setView] = useState<'grid' | 'map'>(() =>
    searchParams.get('view') === 'map' ? 'map' : 'grid',
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') ?? '1') || 1);

  const [serverProps, setServerProps] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(0);

  const fetchProperties = useCallback(
    async (params: {
      checkIn?: string;
      checkOut?: string;
      amenities?: Set<string>;
      maxPrice?: string;
      typeFilter?: string;
      cityFilter?: string;
    }) => {
      const id = ++fetchRef.current;
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (params.checkIn) qs.set('checkIn', params.checkIn);
        if (params.checkOut) qs.set('checkOut', params.checkOut);
        if (params.amenities && params.amenities.size > 0)
          qs.set('amenities', [...params.amenities].join(','));
        if (params.maxPrice) qs.set('maxPrice', String(parseInt(params.maxPrice) * 100));
        if (params.typeFilter) qs.set('propertyType', params.typeFilter);
        if (params.cityFilter) qs.set('city', params.cityFilter);
        const res = await fetch(`${API_URL}/properties?${qs.toString()}`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { data: Property[] };
        if (fetchRef.current === id) setServerProps(json.data);
      } catch {
        if (fetchRef.current === id) setServerProps(null);
      } finally {
        if (fetchRef.current === id) setLoading(false);
      }
    },
    [],
  );

  // Fetch whenever server-side filters change
  const hasServerFilters =
    !!(checkIn && checkOut && checkOut > checkIn) ||
    amenities.size > 0 ||
    !!maxPrice ||
    !!typeFilter ||
    !!cityFilter;

  useEffect(() => {
    if (hasServerFilters) {
      void fetchProperties({ checkIn, checkOut, amenities, maxPrice, typeFilter, cityFilter });
    } else {
      setServerProps(null);
    }
  }, [
    checkIn,
    checkOut,
    amenities,
    maxPrice,
    typeFilter,
    cityFilter,
    hasServerFilters,
    fetchProperties,
  ]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (typeFilter) params.set('type', typeFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (amenities.size > 0) params.set('amenities', [...amenities].join(','));
    if (view === 'map') params.set('view', 'map');
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    search,
    typeFilter,
    cityFilter,
    maxPrice,
    checkIn,
    checkOut,
    amenities,
    view,
    page,
    pathname,
    router,
  ]);

  const baseProps = serverProps ?? initialProperties;

  // Text search is still client-side (fast, no round-trip needed)
  const filtered = useMemo(() => {
    if (!search) return baseProps;
    const q = search.toLowerCase();
    return baseProps.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q),
    );
  }, [baseProps, search]);

  const cities = useMemo(() => {
    const s = new Set(initialProperties.map((p) => p.city));
    return Array.from(s).sort();
  }, [initialProperties]);

  const hasFilters =
    search || typeFilter || cityFilter || maxPrice || checkIn || amenities.size > 0;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, cityFilter, maxPrice, amenities]);

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('tara_wishlist');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync with DB if user is logged in
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    api.wishlist
      .list()
      .then((res) => {
        const ids = res.data as string[];
        setWishlist(new Set(ids));
      })
      .catch(() => {});
  }, []);

  function toggleWishlist(id: string) {
    setWishlist((prev) => {
      const next = new Set(prev);
      const adding = !prev.has(id);
      if (adding) next.add(id);
      else next.delete(id);
      // Sync to DB (fire-and-forget)
      if (isFirebaseConfigured) {
        if (adding) api.wishlist.add(id).catch(() => {});
        else api.wishlist.remove(id).catch(() => {});
      }
      // Also keep localStorage as fallback
      try {
        localStorage.setItem('tara_wishlist', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearAll() {
    setSearch('');
    setTypeFilter('');
    setCityFilter('');
    setMaxPrice('');
    setCheckIn('');
    setCheckOut('');
    setAmenities(new Set());
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <DateBar
        checkIn={checkIn}
        checkOut={checkOut}
        loading={loading}
        availableCount={
          !loading && serverProps !== null && checkIn && checkOut ? serverProps.length : null
        }
        onRangeChange={(ci, co) => {
          setCheckIn(ci);
          setCheckOut(co);
        }}
        onClear={() => {
          setCheckIn('');
          setCheckOut('');
        }}
      />

      {/* Search + type + city + price row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, region…"
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
        />
        <div className="flex flex-wrap gap-2">
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
              onClick={clearAll}
              className="h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
          {hasFilters && (
            <SaveAlertButton
              cityFilter={cityFilter}
              typeFilter={typeFilter}
              amenities={amenities}
            />
          )}
        </div>
      </div>

      {/* Amenity chips */}
      <div className="flex flex-wrap gap-2">
        {AMENITY_OPTIONS.map(({ key, label }) => {
          const active = amenities.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleAmenity(key)}
              className={`flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              {label}
            </button>
          );
        })}
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
              onClick={clearAll}
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

          {view === 'map' && (
            <PropertiesMap properties={filtered} locale={locale} hoveredId={hoveredId} />
          )}

          {view === 'grid' && (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((p) => (
                  <li
                    key={p.id}
                    className="relative"
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
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
                            className="object-cover transition-opacity duration-300"
                            sizes="(max-width:640px) 100vw, 50vw"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjMiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNmNGY0ZjUiLz48L3N2Zz4="
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-3xl">🏨</span>
                          </div>
                        )}
                        <PropertyTypeBadge type={p.propertyType} />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                        <p className="text-sm text-zinc-500">
                          {p.city}, {p.region}
                        </p>
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

function fmtDateShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function DateBar({
  checkIn,
  checkOut,
  loading,
  availableCount,
  onRangeChange,
  onClear,
}: {
  checkIn: string;
  checkOut: string;
  loading: boolean;
  availableCount: number | null;
  onRangeChange: (ci: string, co: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const nights =
    checkIn && checkOut
      ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;

  const label =
    checkIn && checkOut
      ? `${fmtDateShort(checkIn)} → ${fmtDateShort(checkOut)} · ${nights} night${nights !== 1 ? 's' : ''}`
      : checkIn
        ? `${fmtDateShort(checkIn)} → Add check-out`
        : 'When are you going?';

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <svg
            className="h-4 w-4 shrink-0 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span
            className={`text-sm ${checkIn ? 'font-medium text-zinc-900 dark:text-zinc-50' : 'text-zinc-400'}`}
          >
            {label}
          </span>
          {loading && <span className="ml-auto text-xs text-zinc-400">Loading…</span>}
          {availableCount !== null && (
            <span className="ml-auto text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {availableCount} available
            </span>
          )}
        </button>
        {checkIn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setOpen(false);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <DateRangeCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            onRangeChange={(ci, co) => {
              onRangeChange(ci, co);
              if (ci && co) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function SaveAlertButton({
  cityFilter,
  typeFilter,
  amenities,
}: {
  cityFilter: string;
  typeFilter: string;
  amenities: Set<string>;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.searchAlerts.save({
        guestEmail: email,
        city: cityFilter || undefined,
        propertyType: typeFilter || undefined,
        amenities: amenities.size > 0 ? Array.from(amenities) : undefined,
      });
      setSaved(true);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Alert saved</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400"
      >
        Save alert
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl dark:bg-zinc-900"
          >
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Save search alert
            </h3>
            <p className="mb-4 text-sm text-zinc-500">
              Get emailed when new matching properties go live.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="mb-3 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {saving ? '…' : 'Save alert'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm text-zinc-500 dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
