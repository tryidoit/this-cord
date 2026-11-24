// BetterThisCord Service Worker — caching for offline support.
// Caches static assets (JS, CSS, fonts) and serves them cache-first when offline.
// Does NOT cache API responses — those always go to the network.

const CACHE_NAME = "betterthiscord-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Never cache API calls — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // For static assets (JS, CSS, fonts, images), use cache-first
  if (event.request.destination === "script" || event.request.destination === "style" || event.request.destination === "font" || event.request.destination === "image") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // For navigation requests, try network first, fall back to cached index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
});
