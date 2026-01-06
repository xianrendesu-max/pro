self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => self.clients.claim());

const TIMEOUT = 12000;

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 自オリジン以外は触らない（安全）
  if (url.origin !== location.origin) return;

  // /api/proxy はそのまま
  if (url.pathname.startsWith("/api/proxy")) {
    event.respondWith(fetchWithTimeout(req));
    return;
  }

  // fetch() を全て proxy 経由へ
  if (req.destination) {
    const target = url.searchParams.get("u");
    if (target) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(target)}`;
      event.respondWith(fetchWithTimeout(new Request(proxyUrl, req)));
    }
  }
});

function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      notify("timeout", "通信がタイムアウトしました");
      reject(new Error("timeout"));
    }, TIMEOUT);

    fetch(request)
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) {
          notify("error", "サーバー応答エラー");
        }
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        notify("error", "通信に失敗しました");
        reject(err);
      });
  });
}

function notify(type, message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(c =>
      c.postMessage({ type, message })
    );
  });
}
