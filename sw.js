const CACHE_NAME = "kfc-checklist-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/chat.js",
  "./assets/js/data.js",
  "./assets/js/guide.js",
  "./assets/js/main.js",
  "./assets/js/pwa.js",
  "./assets/js/storage.js",
  "./assets/js/utils.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./prompts/searchmode_251124.txt",
  "./prompts/ailey-debate-v1213.txt",
  "./prompts/ailey-bailey-x-251023.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
