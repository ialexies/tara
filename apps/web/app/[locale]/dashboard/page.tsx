'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ImageUploader } from '@/components/image-uploader';

type Property = {
  id: string;
  name: string;
  city: string;
  region: string;
  status: string;
  propertyType: string;
  addressLine?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  paymentMode: string;
  manualPaymentMethods?: { gcash?: string; maya?: string; bank?: string } | null;
  createdAt: string;
};

const PROPERTY_TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;
const PAYMENT_MODES = ['manual', 'stripe'] as const;

export default function DashboardPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.properties
      .list()
      .then((res) => setProperties(res.data as Property[]))
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
          className="flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Add property
        </Link>
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

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
  const [propertyType, setPropertyType] = useState(property.propertyType);
  const [city, setCity] = useState(property.city);
  const [region, setRegion] = useState(property.region);
  const [addressLine, setAddressLine] = useState(property.addressLine ?? '');
  const [paymentMode, setPaymentMode] = useState(property.paymentMode);
  const [description, setDescription] = useState(property.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(property.coverImageUrl ?? null);
  const [gcash, setGcash] = useState(property.manualPaymentMethods?.gcash ?? '');
  const [maya, setMaya] = useState(property.manualPaymentMethods?.maya ?? '');
  const [bank, setBank] = useState(property.manualPaymentMethods?.bank ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.properties.update(property.id, {
        name,
        propertyType,
        city,
        region,
        addressLine: addressLine || undefined,
        description: description || undefined,
        paymentMode,
        manualPaymentMethods:
          paymentMode === 'manual'
            ? { gcash: gcash || undefined, maya: maya || undefined, bank: bank || undefined }
            : undefined,
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
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
