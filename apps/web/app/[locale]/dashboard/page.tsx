'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ImageUploader } from '@/components/image-uploader';
import { RevenueChart } from '@/components/revenue-chart';

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
  name: string;
  slug: string;
  city: string;
  region: string;
  status: string;
  propertyType: string;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  coverImageUrl?: string | null;
  paymentMode: string;
  manualPaymentMethods?: { gcash?: string; maya?: string; bank?: string } | null;
  amenities?: Amenities | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  houseRules?: string | null;
  checkInMessage?: string | null;
  contactPhone?: string | null;
  freeCancelDays?: number | null;
  partialRefundPercent?: number | null;
  createdAt: string;
};

const PROPERTY_TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;
const PAYMENT_MODES = ['manual', 'stripe'] as const;

type RevenueRow = {
  propertyId: string;
  propertyName: string;
  currency: string;
  totalMinor: number;
  bookingCount: number;
};

export default function DashboardPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);

  function load() {
    setLoading(true);
    Promise.all([
      api.properties.list().then((res) => setProperties(res.data as Property[])),
      api.properties
        .revenue()
        .then((res) => setRevenue(res.data as RevenueRow[]))
        .catch(() => {}),
    ])
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Properties</h1>
        <Link
          href={`/${locale}/dashboard/properties/new`}
          className="flex h-11 shrink-0 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Add
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { href: `/${locale}/dashboard/calendar`, label: 'Calendar' },
          { href: `/${locale}/dashboard/compare`, label: 'Compare' },
          { href: `/${locale}/dashboard/promo-codes`, label: 'Promo codes' },
          { href: `/${locale}/dashboard/reviews`, label: 'Reviews' },
          { href: `/${locale}/dashboard/refer`, label: 'Refer' },
          { href: `/${locale}/dashboard/webhooks`, label: 'Webhooks' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex h-9 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {label}
          </Link>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && revenue.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Revenue (confirmed bookings)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {revenue.map((r) => (
              <div
                key={r.propertyId}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="truncate text-sm font-medium text-zinc-500">{r.propertyName}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ₱{(r.totalMinor / 100).toLocaleString('en-PH')}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {r.bookingCount} confirmed booking{r.bookingCount !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
            {revenue.length > 1 && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-sm font-medium text-zinc-400">Total</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ₱{(revenue.reduce((s, r) => s + r.totalMinor, 0) / 100).toLocaleString('en-PH')}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {revenue.reduce((s, r) => s + r.bookingCount, 0)} total bookings
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && <RevenueChart />}

      {!loading && !error && properties.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No properties yet.</p>
          <Link
            href={`/${locale}/dashboard/properties/new`}
            className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            List your first property
          </Link>
        </div>
      )}

      {!loading && properties.length > 0 && (
        <ul className="space-y-3">
          {properties.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <EditPropertyForm
                  property={p}
                  onSuccess={() => {
                    setEditingId(null);
                    load();
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={`/${locale}/dashboard/properties/${p.id}/rooms`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    {p.city}, {p.region} · {p.propertyType}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={p.status} />
                  <button
                    onClick={() => setEditingId(p.id)}
                    className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function EditPropertyForm({
  property,
  onSuccess,
  onCancel,
}: {
  property: Property;
  onSuccess: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const [name, setName] = useState(property.name);
  const [slug, setSlug] = useState(property.slug);
  const [propertyType, setPropertyType] = useState(property.propertyType);
  const [city, setCity] = useState(property.city);
  const [region, setRegion] = useState(property.region);
  const [addressLine, setAddressLine] = useState(property.addressLine ?? '');
  const [latitude, setLatitude] = useState(property.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(property.longitude?.toString() ?? '');
  const [paymentMode, setPaymentMode] = useState(property.paymentMode);
  const [description, setDescription] = useState(property.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(property.coverImageUrl ?? null);
  const [gcash, setGcash] = useState(property.manualPaymentMethods?.gcash ?? '');
  const [maya, setMaya] = useState(property.manualPaymentMethods?.maya ?? '');
  const [bank, setBank] = useState(property.manualPaymentMethods?.bank ?? '');
  const [amenities, setAmenities] = useState<Amenities>(property.amenities ?? {});
  const [checkInTime, setCheckInTime] = useState(property.checkInTime ?? '');
  const [checkOutTime, setCheckOutTime] = useState(property.checkOutTime ?? '');
  const [houseRules, setHouseRules] = useState(property.houseRules ?? '');
  const [checkInMessage, setCheckInMessage] = useState(property.checkInMessage ?? '');
  const [contactPhone, setContactPhone] = useState(property.contactPhone ?? '');
  const [freeCancelDays, setFreeCancelDays] = useState(property.freeCancelDays ?? 3);
  const [partialRefundPercent, setPartialRefundPercent] = useState(
    property.partialRefundPercent ?? 50,
  );
  const [propImgs, setPropImgs] = useState<{ id: string; url: string }[]>([]);
  const [imgUploading, setImgUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    try {
      const res = await api.properties.listImages(property.id);
      setPropImgs(res.data as { id: string; url: string }[]);
    } catch {
      // non-fatal
    }
  }, [property.id]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.properties.update(property.id, {
        name,
        slug: slug || undefined,
        propertyType,
        city,
        region,
        addressLine: addressLine || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        description: description || undefined,
        paymentMode,
        manualPaymentMethods:
          paymentMode === 'manual'
            ? { gcash: gcash || undefined, maya: maya || undefined, bank: bank || undefined }
            : undefined,
        amenities,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        houseRules: houseRules || undefined,
        checkInMessage: checkInMessage || undefined,
        contactPhone: contactPhone || undefined,
        freeCancelDays,
        partialRefundPercent,
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Edit {property.name}
      </h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploader
          currentUrl={coverImageUrl}
          label="Cover photo"
          onUpload={async (file) => {
            const { uploadUrl, publicUrl } = await api.properties.getUploadUrl(
              property.id,
              file.type,
              file.size,
            );
            await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            });
            await api.properties.saveCoverImage(property.id, publicUrl);
            setCoverImageUrl(publicUrl);
            return publicUrl;
          }}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Additional photos
          </p>
          {propImgs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {propImgs.map((img) => (
                <div
                  key={img.id}
                  className="group relative h-20 w-28 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="112px" />
                  <button
                    type="button"
                    onClick={async () => {
                      await api.properties.deleteImage(property.id, img.id);
                      await loadImages();
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <label
            className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 text-sm text-zinc-500 dark:border-zinc-600 ${imgUploading ? 'opacity-50' : 'hover:border-zinc-400'}`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={imgUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImgUploading(true);
                try {
                  const { uploadUrl, publicUrl } = await api.properties.getImageUploadUrl(
                    property.id,
                    file.type,
                    file.size,
                  );
                  await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                  });
                  await api.properties.addImage(property.id, publicUrl);
                  await loadImages();
                } catch {
                  // user can retry
                } finally {
                  setImgUploading(false);
                  e.target.value = '';
                }
              }}
            />
            {imgUploading ? 'Uploading…' : '+ Add photo'}
          </label>
        </div>

        <Field label="Property name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className={inputClass}
          />
        </Field>

        <Field label="URL slug">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            minLength={2}
            maxLength={120}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-400">
            tara-stays.com/en/properties/<strong>{slug || '…'}</strong> — lowercase letters,
            numbers, hyphens only. Changing this breaks existing links.
          </p>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={inputClass}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment mode" required>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className={inputClass}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" required>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Region" required>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Address (optional)">
          <input
            type="text"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Map coordinates{' '}
            <span className="font-normal text-zinc-400">(optional — enables map view)</span>
          </p>
          <p className="mb-2 text-xs text-zinc-400">
            Find your coordinates at{' '}
            <a
              href="https://www.latlong.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              latlong.net
            </a>{' '}
            or right-click your location on Google Maps.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                type="number"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                step="any"
                placeholder="e.g. 15.3510"
                className={inputClass}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                step="any"
                placeholder="e.g. 119.9762"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Tell guests what makes your place special — location, vibe, amenities, nearby attractions…"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Property amenities
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={amenities[key] ?? false}
                  onChange={(e) => setAmenities((a) => ({ ...a, [key]: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {paymentMode === 'manual' && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Payment instructions shown to guests
            </p>
            <div className="space-y-3">
              <Field label="GCash number">
                <input
                  type="text"
                  value={gcash}
                  onChange={(e) => setGcash(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className={inputClass}
                />
              </Field>
              <Field label="Maya number">
                <input
                  type="text"
                  value={maya}
                  onChange={(e) => setMaya(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className={inputClass}
                />
              </Field>
              <Field label="Bank details">
                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="BDO · 1234 5678 9012"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check-in time" hint="e.g. 14:00">
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Check-out time" hint="e.g. 12:00">
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="House rules (optional)">
          <textarea
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder="No smoking indoors · Quiet hours after 10pm · No outside guests"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field
          label="Check-in message (optional)"
          hint="Sent to guests when their booking is confirmed"
        >
          <textarea
            value={checkInMessage}
            onChange={(e) => setCheckInMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Welcome! Check-in is at the front desk. Our WiFi password is TaraStays2025."
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Free cancel (days before)" hint="0 = no free cancellation">
            <input
              type="number"
              min={0}
              max={60}
              value={freeCancelDays}
              onChange={(e) => setFreeCancelDays(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Partial refund %" hint="0 = non-refundable after free period">
            <input
              type="number"
              min={0}
              max={100}
              value={partialRefundPercent}
              onChange={(e) => setPartialRefundPercent(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Contact phone (WhatsApp / Viber)"
          hint="Shown to confirmed guests and used for booking notifications"
        >
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+63 912 345 6789"
            className={inputClass}
          />
        </Field>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </label>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const colours: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
    archived: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600',
  };
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${colours[status] ?? colours.draft}`}
    >
      {status}
    </span>
  );
}
