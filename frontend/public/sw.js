const CACHE_NAME = 'cupones-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; tag?: string; data?: { url?: string } };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Cupones de Pareja', body: event.data.text() };
  }

  const title = payload.title ?? 'Cupones de Pareja';
  const options = {
    body: payload.body ?? '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: payload.tag ?? 'cupones',
    data: payload.data ?? { url: '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw new Error('Offline');
      }
    }),
  );
});
