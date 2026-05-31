// Cache version — bump this whenever you need to force-clear all caches
const SHELL_CACHE  = 'lumina-shell-v2';
const ASSETS_CACHE = 'lumina-assets-v2';
const ALL_CACHES   = [SHELL_CACHE, ASSETS_CACHE];

self.addEventListener('install', () => {
  // Take control immediately; don't wait for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete any caches not in ALL_CACHES (old versions)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept Supabase calls
  if (url.hostname.includes('supabase')) return;

  // ── Vite hashed assets (/assets/…) — cache-first, immutable ──────────────
  // Vite gives every asset a content hash in the filename, so once cached
  // they never go stale. We can keep them indefinitely.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // ── HTML / navigation — ALWAYS network-first, never serve stale ──────────
  // index.html changes on every Vite build (new asset hashes). Serving a
  // cached copy causes the 404s on CSS/JS seen after a new deploy.
  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        // Offline fallback — serve whatever shell we have (e.g. the root page)
        caches.match('/') ?? new Response('Offline', { status: 503 })
      )
    );
    return;
  }

  // ── Everything else (manifest, favicon, fonts…) — stale-while-revalidate ─
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached);
      return cached ?? fetchPromise;
    })
  );
});
