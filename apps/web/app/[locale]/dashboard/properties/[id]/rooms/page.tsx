'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ImageUploader } from '@/components/image-uploader';

type Room = {
  id: string;
  name: string;
  roomType: 'dorm' | 'private';
  capacity: number;
  gender: string | null;
  bathroomType: string | null;
  hasAircon: boolean;
  hasLocker: boolean;
  description: string | null;
  isActive: boolean;
  baseNightlyRateMinor: number;
  coverImageUrl?: string | null;
};

type Property = {
  id: string;
  name: string;
  status: string;
};

const ROOM_TYPES = ['dorm', 'private'] as const;
const BATHROOM_TYPES = ['shared', 'private', 'ensuite'] as const;
const GENDER_POLICIES = ['mixed', 'female', 'male'] as const;

export default function RoomsPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [propertyId]);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.properties.list().then((res) => {
        const props = res.data as Property[];
        const found = props.find((p) => p.id === propertyId);
        setProperty(found ?? null);
      }),
      api.rooms
        .list(propertyId)
        .then((res) => setRooms(res.data as Room[]))
        .catch((e: Error) => setFetchError(e.message)),
    ])
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = (await (property?.status === 'active'
        ? api.properties.unpublish(propertyId)
        : api.properties.publish(propertyId))) as Property;
      setProperty(updated);
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  const isActive = property?.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Properties
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/dashboard/properties/${propertyId}/blocks`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Blocked dates
          </Link>
          <Link
            href={`/${locale}/dashboard/properties/${propertyId}/pricing`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Pricing
          </Link>
          <Link
            href={`/${locale}/dashboard/properties/${propertyId}/bookings`}
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            Bookings →
          </Link>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {property?.name ?? 'Rooms'}
          </h1>
          {property && (
            <p className="mt-0.5 text-sm text-zinc-500">
              {isActive ? 'Live — visible to guests' : 'Draft — not visible to guests'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {property && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className={`flex h-11 items-center rounded-lg px-5 text-sm font-semibold disabled:opacity-50 ${
                isActive
                  ? 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {publishing ? '…' : isActive ? 'Unpublish' : 'Publish'}
            </button>
          )}
          {publishError && (
            <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
              {publishError}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Rooms</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Add room
        </button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {fetchError}
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && !fetchError && rooms.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No rooms yet. Add your first room.</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add room
          </button>
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <ul className="space-y-3">
          {rooms.map((r) =>
            editingRoom?.id === r.id ? (
              <li key={r.id}>
                <EditRoomForm
                  room={r}
                  propertyId={propertyId}
                  onSuccess={() => {
                    setEditingRoom(null);
                    loadAll();
                  }}
                  onCancel={() => setEditingRoom(null)}
                />
              </li>
            ) : (
              <RoomRow
                key={r.id}
                room={r}
                propertyId={propertyId}
                onEdit={() => setEditingRoom(r)}
                onDeleted={loadAll}
              />
            ),
          )}
        </ul>
      )}

      {showForm && (
        <AddRoomForm
          propertyId={propertyId}
          onSuccess={() => {
            setShowForm(false);
            loadAll();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function RoomRow({
  room,
  propertyId,
  onEdit,
  onDeleted,
}: {
  room: Room;
  propertyId: string;
  onEdit: () => void;
  onDeleted: () => void;
}): React.ReactElement {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.rooms.remove(propertyId, room.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{room.name}</p>
          <p className="mt-0.5 text-sm text-zinc-500">
            {room.roomType === 'dorm'
              ? `${room.capacity}-bed dorm${room.gender ? ` · ${room.gender}-only` : ''}`
              : 'Private room'}
            {' · '}₱{(room.baseNightlyRateMinor / 100).toLocaleString('en-PH')}/night
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              room.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {room.isActive ? 'active' : 'inactive'}
          </span>
          <button
            onClick={onEdit}
            className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-9 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}

function EditRoomForm({
  room,
  propertyId,
  onSuccess,
  onCancel,
}: {
  room: Room;
  propertyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const [name, setName] = useState(room.name);
  const [capacity, setCapacity] = useState(room.capacity);
  const [rateInput, setRateInput] = useState(String(room.baseNightlyRateMinor / 100));
  const [bathroomType, setBathroomType] = useState(room.bathroomType ?? 'shared');
  const [gender, setGender] = useState(room.gender ?? '');
  const [hasAircon, setHasAircon] = useState(room.hasAircon);
  const [hasLocker, setHasLocker] = useState(room.hasLocker);
  const [description, setDescription] = useState(room.description ?? '');
  const [isActive, setIsActive] = useState(room.isActive);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(room.coverImageUrl ?? null);
  const [roomImgs, setRoomImgs] = useState<{ id: string; url: string }[]>([]);
  const [imgUploading, setImgUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    try {
      const res = await api.rooms.listImages(propertyId, room.id);
      setRoomImgs(res.data as { id: string; url: string }[]);
    } catch {
      // non-fatal
    }
  }, [propertyId, room.id]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const ratePesos = parseFloat(rateInput);
    if (!ratePesos || ratePesos <= 0) {
      setError('Enter a valid nightly rate');
      setSubmitting(false);
      return;
    }
    try {
      await api.rooms.update(propertyId, room.id, {
        name,
        capacity: room.roomType === 'dorm' ? capacity : undefined,
        baseNightlyRateMinor: Math.round(ratePesos * 100),
        bathroomType: bathroomType || undefined,
        gender: gender || null,
        description: description || undefined,
        hasAircon,
        hasLocker,
        isActive,
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
        Edit {room.name}
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
            const { uploadUrl, publicUrl } = await api.rooms.getUploadUrl(
              propertyId,
              room.id,
              file.type,
              file.size,
            );
            await fetch(uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            });
            await api.rooms.saveCoverImage(propertyId, room.id, publicUrl);
            setCoverImageUrl(publicUrl);
            return publicUrl;
          }}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Additional photos
          </p>
          {roomImgs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {roomImgs.map((img) => (
                <div
                  key={img.id}
                  className="group relative h-20 w-28 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="112px" />
                  <button
                    type="button"
                    onClick={async () => {
                      await api.rooms.deleteImage(propertyId, room.id, img.id);
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
                  const { uploadUrl, publicUrl } = await api.rooms.getImageUploadUrl(
                    propertyId,
                    room.id,
                    file.type,
                    file.size,
                  );
                  await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                  });
                  await api.rooms.addImage(propertyId, room.id, publicUrl);
                  await loadImages();
                } catch {
                  // show nothing; user can retry
                } finally {
                  setImgUploading(false);
                  e.target.value = '';
                }
              }}
            />
            {imgUploading ? 'Uploading…' : '+ Add photo'}
          </label>
        </div>

        <Field label="Room name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className={inputClass}
          />
        </Field>

        {room.roomType === 'dorm' && (
          <Field label="Number of beds" hint="Changing this adds or removes bed units">
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min={1}
              max={100}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Nightly rate (₱)" required>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
              ₱
            </span>
            <input
              type="number"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              required
              min="1"
              step="1"
              className={`${inputClass} pl-7`}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Bathroom">
            <select
              value={bathroomType}
              onChange={(e) => setBathroomType(e.target.value)}
              className={inputClass}
            >
              {BATHROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          {room.roomType === 'dorm' && (
            <Field label="Gender policy">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="">No restriction</option>
                {GENDER_POLICIES.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)} only
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasAircon}
              onChange={(e) => setHasAircon(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Air-con
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasLocker}
              onChange={(e) => setHasLocker(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Lockers
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Active (visible to guests)
          </label>
        </div>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            className={`${inputClass} resize-none`}
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

function AddRoomForm({
  propertyId,
  onSuccess,
  onCancel,
}: {
  propertyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>('dorm');
  const [capacity, setCapacity] = useState(6);
  const [bathroomType, setBathroomType] = useState<(typeof BATHROOM_TYPES)[number]>('shared');
  const [gender, setGender] = useState<(typeof GENDER_POLICIES)[number] | ''>('mixed');
  const [hasAircon, setHasAircon] = useState(false);
  const [hasLocker, setHasLocker] = useState(false);
  const [description, setDescription] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const ratePesos = parseFloat(rateInput);
    if (!ratePesos || ratePesos <= 0) {
      setError('Enter a valid nightly rate');
      setSubmitting(false);
      return;
    }

    try {
      await api.rooms.create(propertyId, {
        name,
        roomType,
        capacity: roomType === 'private' ? 1 : capacity,
        bathroomType,
        gender: gender || undefined,
        description: description || undefined,
        hasAircon,
        hasLocker,
        position: 0,
        baseNightlyRateMinor: Math.round(ratePesos * 100),
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">New room</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Room name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="e.g. 8-Bed Mixed Dorm"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Room type" required>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as typeof roomType)}
              className={inputClass}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          {roomType === 'dorm' && (
            <Field label="Beds" required>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={2}
                max={50}
                className={inputClass}
              />
            </Field>
          )}
        </div>

        <Field label="Nightly rate (₱)" required>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
              ₱
            </span>
            <input
              type="number"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              required
              min="1"
              step="1"
              placeholder="600"
              className={`${inputClass} pl-7`}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Bathroom">
            <select
              value={bathroomType}
              onChange={(e) => setBathroomType(e.target.value as typeof bathroomType)}
              className={inputClass}
            >
              {BATHROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          {roomType === 'dorm' && (
            <Field label="Gender policy">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                className={inputClass}
              >
                <option value="">No restriction</option>
                {GENDER_POLICIES.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)} only
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasAircon}
              onChange={(e) => setHasAircon(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Air-con
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hasLocker}
              onChange={(e) => setHasLocker(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Lockers
          </label>
        </div>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything guests should know about this room"
            className={`${inputClass} resize-none`}
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
            {submitting ? 'Saving…' : 'Add room'}
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
