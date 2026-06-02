import { NextResponse } from 'next/server';

// Serves the Firebase Messaging service worker script.
// Reachable at /firebase-messaging-sw.js via next.config.ts rewrite.
// Route handler lets us inject NEXT_PUBLIC_* config at request time
// instead of baking a static file with hardcoded values.
export const dynamic = 'force-dynamic';

export function GET() {
  const config = {
    apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
    authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? '',
    projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ?? '',
    storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'] ?? '',
    messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] ?? '',
    appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'] ?? '',
  };

  const js = `
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title ?? 'Tara';
  const body = payload.notification?.body ?? '';
  const url = payload.data?.url ?? '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-32.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        const origin = self.location.origin;
        for (const client of clientList) {
          if (client.url === origin + url && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
`.trim();

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
