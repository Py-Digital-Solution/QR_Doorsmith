const CACHE = "doorsmith-khati-v1";

const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logo.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // API routes: always network, never cache
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // HTML navigation requests: network-first.
  // Serving stale HTML for a server-rendered app causes a re-fetch loop because
  // the SW updates the cache in the background and the browser detects the mismatch.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(async () => {
          // Offline fallback: cached page or khati home
          const cached = await caches.match(e.request);
          return cached ?? (await caches.match("/khati")) ?? Response.error();
        })
    );
    return;
  }

  // Static assets (_next/static, icons, images): stale-while-revalidate
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|webp)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request)
          .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => cached);
        return cached ?? fetchPromise;
      })
    );
    return;
  }

  // Everything else: network-first, no cache
  e.respondWith(fetch(e.request));
});
