const CACHE_NAME = "softtennis-cache-v01"; // 保険としてバージョン番号残す
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// =====================
// Install
// =====================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            fetch(url)
              .then((res) => {
                if (!res.ok) throw new Error(`Failed to fetch ${url}`);
                return cache.put(url, res);
              })
              .catch((err) => {
                console.warn("SW install fetch failed for", url, err);
              })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// =====================
// Activate
// =====================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
        )
      )
      .then(() => self.clients.claim())
  );
});

// =====================
// Fetch (network-first)
// =====================
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        // ネットワーク成功 → キャッシュ更新
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return networkRes;
      })
      .catch(() =>
        // ネットワーク失敗 → キャッシュから返す
        caches.match(event.request)
      )
  );
});
