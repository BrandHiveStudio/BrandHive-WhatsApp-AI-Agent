// BrandHive Studio WhatsApp Agent - PWA Minimal Service Worker
// Safe service worker: caches only static branding icons.
// NEVER caches API responses, Supabase calls, messages, or authenticated conversations.

const CACHE_NAME = 'brandhive-pwa-static-v1';

const STATIC_ASSETS = [
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. NEVER cache or intercept:
  // - API routes (/api/*)
  // - Supabase backend (*.supabase.co)
  // - Auth endpoints or signout
  // - WebSocket / SSE connections
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/')
  ) {
    return;
  }

  // 3. For static icon assets, serve from cache if available, falling back to network
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }

  // 4. All other requests (pages, Next.js code) flow straight to network without caching
});
