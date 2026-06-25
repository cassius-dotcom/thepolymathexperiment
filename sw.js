// The OS — service worker.
// Pre-caches the app shell so the OS opens offline. Network-first for the
// HTML so deploys ship without waiting for the SW to update; stale-while-
// revalidate for static assets. Bump CACHE_NAME whenever the shell list
// changes so old caches are cleared on activate.
const CACHE_NAME = 'the-os-v5';
const SHELL = [
  '/',
  '/the_os.html',
  '/app.js',
  '/styles.css',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // Supabase upserts (POST/PATCH) must pass through.

  const url = new URL(req.url);

  // Cross-origin (supabase, fonts, jsdelivr): leave to the browser HTTP cache.
  // Opaque responses don't survive cache.put cleanly, and we never want stale
  // auth tokens or schema mismatches from a cached Supabase response.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations / HTML so the user always sees the latest
  // shell when online; fall back to cached the_os.html when offline.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch (_) {
        const cached = await caches.match(req);
        return cached || caches.match('/the_os.html');
      }
    })());
    return;
  }

  // Stale-while-revalidate for static assets (CSS/JS/SVG/manifest).
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchAndUpdate = fetch(req).then(res => {
      if (res && res.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
      }
      return res;
    }).catch(() => cached);
    return cached || fetchAndUpdate;
  })());
});
