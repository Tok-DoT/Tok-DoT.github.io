// sw.js (安定版・GitHub Pages向け)
const CACHE_NAME = "wakasagi-v1";

// ★静的アセットのみキャッシュ（HTMLは入れない）
const ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// =========================
// install
// =========================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// =========================
// activate（古いキャッシュ削除）
// =========================
self.addEventListener("activate", (event) => {
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

// =========================
// fetch
// =========================
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // ★ HTMLは必ず最新取得（重要）
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // その他はキャッシュOK
  event.respondWith(
    caches.match(request).then((res) => res || fetch(request))
  );
});