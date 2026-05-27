'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type Property = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  propertyType: string;
  coverImageUrl?: string | null;
  priceFrom: number | null;
};

const TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;

export function PropertyListings({
  properties,
  locale,
}: {
  properties: Property[];
  locale: string;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

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
      if (max && p.priceFrom != null && p.priceFrom > max) return false;
      return true;
    });
  }, [properties, search, typeFilter, maxPrice]);

  const hasFilters = search || typeFilter || maxPrice;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
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
                setMaxPrice('');
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
                setMaxPrice('');
              }}
              className="text-sm text-zinc-700 underline dark:text-zinc-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {hasFilters && (
            <p className="text-sm text-zinc-500">
              {filtered.length} propert{filtered.length === 1 ? 'y' : 'ies'}
            </p>
          )}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.id}>
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
        </>
      )}
    </div>
  );
}
