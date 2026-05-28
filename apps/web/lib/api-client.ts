import { getIdToken, onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebase-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): Promise<string> {
  if (!isFirebaseConfigured) {
    return Promise.reject(
      new Error('Firebase is not configured — check NEXT_PUBLIC_FIREBASE_* env vars'),
    );
  }
  // firebaseAuth.currentUser is null until Firebase restores the session.
  // onAuthStateChanged fires once immediately with the resolved user.
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      unsub();
      if (!user) {
        reject(new Error('Not authenticated'));
        return;
      }
      getIdToken(user).then(resolve).catch(reject);
    });
  });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  properties: {
    list: () => apiFetch<{ data: unknown[] }>('/properties/mine'),
    create: (body: unknown) =>
      apiFetch<unknown>('/properties', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: unknown) =>
      apiFetch<unknown>(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    getUploadUrl: (id: string, contentType: string, contentLength: number) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(`/properties/${id}/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ contentType, contentLength }),
      }),
    saveCoverImage: (id: string, url: string) =>
      apiFetch<unknown>(`/properties/${id}/cover-image`, {
        method: 'PATCH',
        body: JSON.stringify({ url }),
      }),
    publish: (id: string) => apiFetch<unknown>(`/properties/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiFetch<unknown>(`/properties/${id}/unpublish`, { method: 'POST' }),
    adminListAll: () => apiFetch<{ data: unknown[] }>('/properties/admin/all'),
    adminSetStatus: (id: string, status: string) =>
      apiFetch<unknown>(`/properties/admin/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    listImages: (id: string) => apiFetch<{ data: unknown[] }>(`/properties/${id}/images`),
    getImageUploadUrl: (id: string, contentType: string, contentLength: number) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(`/properties/${id}/images/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ contentType, contentLength }),
      }),
    addImage: (id: string, url: string) =>
      apiFetch<unknown>(`/properties/${id}/images`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    deleteImage: (id: string, imageId: string) =>
      apiFetch<unknown>(`/properties/${id}/images/${imageId}`, { method: 'DELETE' }),
  },
  rooms: {
    list: (propertyId: string) => apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/rooms`),
    create: (propertyId: string, body: unknown) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (propertyId: string, roomId: string, body: unknown) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (propertyId: string, roomId: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms/${roomId}`, { method: 'DELETE' }),
    getUploadUrl: (
      propertyId: string,
      roomId: string,
      contentType: string,
      contentLength: number,
    ) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(
        `/properties/${propertyId}/rooms/${roomId}/upload-url`,
        { method: 'POST', body: JSON.stringify({ contentType, contentLength }) },
      ),
    saveCoverImage: (propertyId: string, roomId: string, url: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms/${roomId}/cover-image`, {
        method: 'PATCH',
        body: JSON.stringify({ url }),
      }),
    listImages: (propertyId: string, roomId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/rooms/${roomId}/images`),
    getImageUploadUrl: (
      propertyId: string,
      roomId: string,
      contentType: string,
      contentLength: number,
    ) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(
        `/properties/${propertyId}/rooms/${roomId}/images/upload-url`,
        { method: 'POST', body: JSON.stringify({ contentType, contentLength }) },
      ),
    addImage: (propertyId: string, roomId: string, url: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms/${roomId}/images`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    deleteImage: (propertyId: string, roomId: string, imageId: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/rooms/${roomId}/images/${imageId}`, {
        method: 'DELETE',
      }),
  },
  bookings: {
    availability: (propertyId: string, checkIn: string, checkOut: string) =>
      apiFetch<{ data: unknown[] }>(
        `/properties/${propertyId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      ),
    mine: () => apiFetch<{ data: unknown[] }>('/bookings/mine'),
    create: (body: unknown) =>
      apiFetch<unknown>('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    listByProperty: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/bookings`),
    confirm: (id: string) => apiFetch<unknown>(`/bookings/${id}/confirm`, { method: 'POST' }),
    cancel: (id: string) => apiFetch<unknown>(`/bookings/${id}/cancel`, { method: 'POST' }),
    checkIn: (id: string) => apiFetch<unknown>(`/bookings/${id}/check-in`, { method: 'POST' }),
    checkOut: (id: string) => apiFetch<unknown>(`/bookings/${id}/check-out`, { method: 'POST' }),
    cancelByGuest: (id: string, guestEmail: string) =>
      apiFetch<unknown>(`/bookings/${id}/cancel-guest`, {
        method: 'POST',
        body: JSON.stringify({ guestEmail }),
      }),
    requestDateChange: (
      id: string,
      body: {
        requestedCheckIn: string;
        requestedCheckOut: string;
        guestEmail: string;
        guestMessage?: string;
      },
    ) =>
      apiFetch<unknown>(`/bookings/${id}/modification-requests`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listModificationRequests: (id: string) =>
      apiFetch<{ data: unknown[] }>(`/bookings/${id}/modification-requests`),
    resolveModificationRequest: (id: string, requestId: string, action: 'approved' | 'rejected') =>
      apiFetch<unknown>(`/bookings/${id}/modification-requests/${requestId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    ownerBlocks: (propertyId: string, from: string, to: string) =>
      apiFetch<{ data: string[] }>(`/properties/${propertyId}/owner-blocks?from=${from}&to=${to}`),
    setOwnerBlock: (propertyId: string, date: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/owner-blocks`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
    deleteOwnerBlock: (propertyId: string, date: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/owner-blocks/${date}`, { method: 'DELETE' }),
  },
  admin: {
    listUsers: () => apiFetch<{ data: unknown[] }>('/auth/admin/users'),
    setUserRole: (id: string, role: string) =>
      apiFetch<unknown>(`/auth/admin/users/${id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
  },
  priceRules: {
    list: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/price-rules`),
    create: (propertyId: string, body: unknown) =>
      apiFetch<unknown>(`/properties/${propertyId}/price-rules`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (propertyId: string, ruleId: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/price-rules/${ruleId}`, { method: 'DELETE' }),
  },
};
