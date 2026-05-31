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
    revenue: () => apiFetch<{ data: unknown[] }>('/properties/revenue'),
    revenueByMonth: () =>
      apiFetch<{ data: { month: string; totalMinor: number; bookingCount: number }[] }>(
        '/properties/revenue/monthly',
      ),
    occupancy: (id: string, months?: number) =>
      apiFetch<{ data: unknown[] }>(
        `/properties/${id}/occupancy${months ? `?months=${months}` : ''}`,
      ),
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
    ownerSummary: () =>
      apiFetch<{
        pendingCount: number;
        todayCheckIns: number;
        unreadMessages: number;
        monthRevenueMinor: number;
      }>('/bookings/owner/summary'),
    ownerMessagesInbox: () => apiFetch<{ data: unknown[] }>('/bookings/owner/messages-inbox'),
    getByRef: (code: string) => apiFetch<unknown>(`/bookings/ref/${encodeURIComponent(code)}`),
    create: (body: unknown) =>
      apiFetch<unknown>('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    listByProperty: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/bookings`),
    confirm: (id: string) => apiFetch<unknown>(`/bookings/${id}/confirm`, { method: 'POST' }),
    cancel: (id: string) => apiFetch<unknown>(`/bookings/${id}/cancel`, { method: 'POST' }),
    checkIn: (id: string) => apiFetch<unknown>(`/bookings/${id}/check-in`, { method: 'POST' }),
    checkOut: (id: string) => apiFetch<unknown>(`/bookings/${id}/check-out`, { method: 'POST' }),
    verifyId: (id: string) =>
      apiFetch<{ ok: boolean }>(`/bookings/${id}/verify-id`, { method: 'POST' }),
    getIdUploadUrl: (id: string, contentType: string, guestEmail: string) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(`/bookings/${id}/id-upload-url`, {
        method: 'POST',
        body: JSON.stringify({ contentType, guestEmail }),
      }),
    saveIdDocument: (id: string, documentUrl: string, guestEmail: string) =>
      apiFetch<{ ok: boolean }>(`/bookings/${id}/id-document`, {
        method: 'POST',
        body: JSON.stringify({ documentUrl, guestEmail }),
      }),
    getPaymentProofUploadUrl: (id: string, contentType: string, guestEmail: string) =>
      apiFetch<{ uploadUrl: string; publicUrl: string }>(
        `/bookings/${id}/payment-proof-upload-url`,
        { method: 'POST', body: JSON.stringify({ contentType, guestEmail }) },
      ),
    savePaymentProof: (id: string, proofUrl: string, guestEmail: string) =>
      apiFetch<{ ok: boolean }>(`/bookings/${id}/payment-proof`, {
        method: 'POST',
        body: JSON.stringify({ proofUrl, guestEmail }),
      }),
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
    listMessages: (bookingId: string) =>
      apiFetch<{ data: unknown[] }>(`/bookings/${bookingId}/messages`),
    sendMessage: (bookingId: string, body: string, senderName: string) =>
      apiFetch<unknown>(`/bookings/${bookingId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, senderName }),
      }),
  },
  admin: {
    listUsers: () => apiFetch<{ data: unknown[] }>('/auth/admin/users'),
    setUserRole: (id: string, role: string) =>
      apiFetch<unknown>(`/auth/admin/users/${id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    listReviews: () => apiFetch<{ data: unknown[] }>('/admin/reviews'),
    listAuditLog: (limit?: number) =>
      apiFetch<{ data: unknown[] }>(`/auth/admin/audit${limit ? `?limit=${limit}` : ''}`),
    deleteReview: (id: string) => apiFetch<unknown>(`/admin/reviews/${id}`, { method: 'DELETE' }),
    stats: () =>
      apiFetch<{
        activeProperties: number;
        totalUsers: number;
        bookingsThisMonth: number;
        revenueThisMonthMinor: number;
      }>('/auth/admin/stats'),
    listAllBookings: (params?: { status?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const q = qs.toString();
      return apiFetch<{ data: unknown[] }>(`/bookings/admin/all${q ? `?${q}` : ''}`);
    },
  },
  promoCodes: {
    list: () => apiFetch<{ data: unknown[] }>('/promo-codes'),
    create: (body: unknown) =>
      apiFetch<unknown>('/promo-codes', { method: 'POST', body: JSON.stringify(body) }),
    deactivate: (id: string) => apiFetch<void>(`/promo-codes/${id}`, { method: 'DELETE' }),
    validate: (code: string, propertyId: string, amount: number) =>
      apiFetch<{
        id: string;
        code: string;
        discountType: string;
        discountValue: number;
        discountMinor: number;
        finalAmountMinor: number;
      }>(
        `/promo-codes/validate?code=${encodeURIComponent(code)}&propertyId=${propertyId}&amount=${amount}`,
      ),
  },
  reviews: {
    listMine: () => apiFetch<{ data: unknown[] }>('/reviews/mine'),
    replyToReview: (reviewId: string, reply: string) =>
      apiFetch<unknown>(`/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      }),
  },
  enquiry: {
    send: (slug: string, body: { guestName: string; guestEmail: string; message: string }) =>
      apiFetch<{ ok: boolean }>(`/properties/slug/${slug}/enquiry`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    list: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/enquiries`),
    markRead: (propertyId: string, enquiryId: string) =>
      apiFetch<{ ok: boolean }>(`/properties/${propertyId}/enquiries/${enquiryId}/read`, {
        method: 'PATCH',
      }),
  },
  wishlist: {
    list: () => apiFetch<{ data: string[] }>('/wishlist'),
    add: (propertyId: string) =>
      apiFetch<{ ok: boolean }>(`/wishlist/${propertyId}`, { method: 'POST' }),
    remove: (propertyId: string) => apiFetch<void>(`/wishlist/${propertyId}`, { method: 'DELETE' }),
  },
  stripeConnect: {
    status: (propertyId: string) =>
      apiFetch<{ connected: boolean; enabled: boolean; accountId: string | null }>(
        `/stripe/connect/${propertyId}/status`,
      ),
    startOnboarding: (propertyId: string, returnUrl: string, refreshUrl: string) =>
      apiFetch<{ url: string; accountId: string }>(`/stripe/connect/${propertyId}/onboard`, {
        method: 'POST',
        body: JSON.stringify({ returnUrl, refreshUrl }),
      }),
    finalizeOnboarding: (propertyId: string) =>
      apiFetch<{ ok: boolean }>(`/stripe/connect/${propertyId}/finalize`, { method: 'POST' }),
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
  searchAlerts: {
    save: (body: {
      guestEmail: string;
      city?: string;
      propertyType?: string;
      maxPriceMinor?: number;
      amenities?: string[];
    }) =>
      apiFetch<{ id: string }>('/search-alerts', { method: 'POST', body: JSON.stringify(body) }),
    list: (email: string) =>
      apiFetch<{ data: unknown[] }>(`/search-alerts?email=${encodeURIComponent(email)}`),
    remove: (id: string, email: string) =>
      apiFetch<void>(`/search-alerts/${id}?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      }),
  },
  profile: {
    get: () =>
      apiFetch<{
        id: string;
        email: string;
        fullName: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        dateOfBirth: string | null;
        nationality: string | null;
      }>('/auth/me'),
    update: (patch: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      phone?: string;
      dateOfBirth?: string;
      nationality?: string;
    }) => apiFetch<unknown>('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) }),
  },
  referral: {
    getMyCode: () => apiFetch<{ code: string }>('/auth/me/referral'),
  },
  webhooks: {
    list: () => apiFetch<{ data: unknown[] }>('/webhooks'),
    create: (url: string, events: string[]) =>
      apiFetch<unknown>('/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) }),
    remove: (id: string) => apiFetch<void>(`/webhooks/${id}`, { method: 'DELETE' }),
  },
  propertyStaff: {
    list: (propertyId: string) => apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/staff`),
    invite: (propertyId: string, staffEmail: string, role: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ staffEmail, role }),
      }),
    remove: (propertyId: string, id: string) =>
      apiFetch<void>(`/properties/${propertyId}/staff/${id}`, { method: 'DELETE' }),
  },
  blacklist: {
    list: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/properties/${propertyId}/blacklist`),
    add: (propertyId: string, guestEmail: string, reason?: string) =>
      apiFetch<unknown>(`/properties/${propertyId}/blacklist`, {
        method: 'POST',
        body: JSON.stringify({ guestEmail, reason }),
      }),
    remove: (propertyId: string, id: string) =>
      apiFetch<void>(`/properties/${propertyId}/blacklist/${id}`, { method: 'DELETE' }),
  },
  waitlist: {
    join: (body: {
      roomId: string;
      propertyId: string;
      guestEmail: string;
      guestName: string;
      checkIn: string;
      checkOut: string;
    }) =>
      apiFetch<{ id?: string; alreadyJoined?: boolean }>('/waitlist', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    listForProperty: (propertyId: string) =>
      apiFetch<{ data: unknown[] }>(`/waitlist/property/${propertyId}`),
    countsByRoom: (propertyId: string) =>
      apiFetch<{ data: { roomId: string; roomName: string; count: number }[] }>(
        `/waitlist/property/${propertyId}/counts`,
      ),
  },
};
