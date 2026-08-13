const CACHE_VERSION = "ssat-quest-phase1-v1";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.ico", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isSensitiveRequest(url) {
  return (
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/functions/") ||
    url.hostname.endsWith(".supabase.co")
  );
}

function isStaticAsset(url) {
  return /\.(?:css|js|mjs|ico|png|jpg|jpeg|webp|woff2?|webmanifest)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSensitiveRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    );
    return;
  }

  // Cache only the app's static assets. Same-origin RPC/function responses and
  // authenticated HTML are never persisted by the service worker.
  if (url.origin !== self.location.origin || !isStaticAsset(url)) return;
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)));
          }
          return response;
        }),
    ),
  );
});
