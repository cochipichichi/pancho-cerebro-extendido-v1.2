
const CACHE_NAME = "ce-pancho-v1";
const CORE = [
  "./",
  "./index.html",
  "./offline.html",
  "./pages/weekly.html",
  "./pages/manual.html",
  "./pages/data.html",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/ui.js",
  "./assets/js/storage.js",
  "./assets/js/narrator.js",
  "./assets/js/weekly.js",
  "./assets/js/manual.js",
  "./assets/js/data.js",
  "./assets/img/logo.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if(req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match("./offline.html"));
    })
  );
});
