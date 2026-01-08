// sw.js (ハイブリッド方式・最終版)
const CACHE_NAME = "softtennis-cache-v74"; // 必要に応じて更新
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール時にキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 新しいSWを即アクティブ化
  );
});

// 有効化時に古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// フェッチイベント
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // HTMLリクエストは network-first
  if (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功したらキャッシュ更新
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)) // オフライン時はキャッシュ
    );
    return;
  }

  // それ以外は cache-first
  event.respondWith(
    caches.match(request)
      .then((res) => res || fetch(request))
  );
});
