import { NextResponse } from 'next/server';

// Exposes the VAPID public key to the browser at runtime.
// Reading it server-side means no rebuild is needed when the key changes —
// set FIREBASE_VAPID_KEY as a runtime env var in Portainer and it takes effect immediately.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    vapidKey: process.env['FIREBASE_VAPID_KEY'] ?? null,
  });
}
