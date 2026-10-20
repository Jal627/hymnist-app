// Hymnist service worker: lets the installed app open without a connection.
// Pages and the app itself: network first (so updates arrive), cached copy as the fallback.
// Images, icons and the web fonts: cached after the first use.
const V = "hymnist-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "favicon.png", "logo.png", "stage-logo.png", "icon-192.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
    if (isPage) {
      e.respondWith(
        fetch(req).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; })
          .catch(() => caches.match(req).then((m) => m || caches.match("index.html") || caches.match("./")))
      );
    } else {
      e.respondWith(
        caches.match(req).then((m) => m || fetch(req).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; }))
      );
    }
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((r) => { if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; }))
    );
  }
});
