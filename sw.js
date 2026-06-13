/**
 * Service Worker for Hanafuda Koi-Koi
 *
 * Handles intelligent caching to ensure users always get the latest version
 * while maximizing performance for static assets.
 *
 * Cache Strategy:
 * - HTML: Network-first (always fetch fresh, fall back to cache if offline)
 * - Hashed assets (JS/CSS with content hash): Cache-first (immutable)
 * - Other assets: Network-first with version checking
 */

const CACHE_NAME = 'hanafuda-v1';
const RUNTIME_CACHE = 'hanafuda-runtime';

// Assets to precache (only critical, immutable assets)
const PRECACHE_ASSETS = [
  '/hanafuda/favicon.svg'
];

/**
 * Install event - precache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete old caches
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map(cacheName => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - intelligent caching based on resource type
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests from our origin
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy 1: HTML files - ALWAYS fetch from network, never cache
  // This ensures index.html is always fresh and points to correct hashed assets
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Only fall back to cache if completely offline
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 2: Hashed assets (JS/CSS with content hash in filename)
  // These are immutable - cache first, they never change
  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE)
        .then(cache => {
          return cache.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }

              // Not in cache, fetch and cache it
              return fetch(request)
                .then(response => {
                  // Only cache successful responses
                  if (response && response.status === 200) {
                    cache.put(request, response.clone());
                  }
                  return response;
                });
            });
        })
    );
    return;
  }

  // Strategy 3: Other assets (images, audio, etc.) with version params
  // Network first, cache as backup
  if (hasVersionParam(url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 4: Everything else - network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

/**
 * Check if a URL path contains a content hash (Vite-style)
 * e.g., /assets/index-DxVoxzIl.js or /assets/index-BLgy49K1.css
 */
function isHashedAsset(pathname) {
  // Match Vite's hash pattern: filename-[hash].ext
  return /\/assets\/[^/]+-[a-zA-Z0-9]{8,}\.(js|css)$/.test(pathname);
}

/**
 * Check if URL has a version parameter
 */
function hasVersionParam(url) {
  return url.searchParams.has('v');
}

/**
 * Listen for messages from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});
