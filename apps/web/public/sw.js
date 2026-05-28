const CACHE = 'tara-v1';
const OFFLINE_URL = '/offline.html';

// Pre-cache offline page on install
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin navigation requests (page loads)
  if (
    event.request.mode === 'navigate' &&
    event.request.method === 'GET' &&
    new URL(event.request.url).origin === self.location.origin
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached ?? new Response('Offline', { status: 503 })),
      ),
    );
  }
});
