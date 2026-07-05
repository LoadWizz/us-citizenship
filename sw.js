/* =========================================================================
 * sw.js — Service Worker: önbellek-öncelikli, ilk yüklemeden sonra
 * tamamen çevrimdışı çalışma. Sürüm değişince eski önbellek temizlenir.
 * ========================================================================= */
"use strict";

const CACHE = "us-citizenship-v13";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/data.js",
  "./js/cues.js",
  "./js/best.js",
  "./js/freq.js",
  "./js/mnemo.js",
  "./js/lang-tr.js",
  "./js/lang-es.js",
  "./js/english-data.js",
  "./js/interview-data.js",
  "./js/db.js",
  "./js/srs.js",
  "./js/speech.js",
  "./js/lang.js",
  "./js/blocks.js",
  "./js/advisor.js",
  "./js/pricing.js",
  "./js/entitlements.js",
  "./js/payments.js",
  "./js/coach.js",
  "./js/selfcheck.js",
  "./js/ui.js",
  "./js/karaoke.js",
  "./js/views/welcome.js",
  "./js/views/home.js",
  "./js/views/study.js",
  "./js/views/block.js",
  "./js/views/exam.js",
  "./js/views/english.js",
  "./js/views/interview.js",
  "./js/views/progress.js",
  "./js/views/settings.js",
  "./js/views/paywall.js",
  "./js/views/billing.js",
  "./legal/style.css",
  "./legal/terms.html",
  "./legal/privacy.html",
  "./legal/refund.html",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // API çağrıları (Claude koç) asla önbelleklenmez — doğrudan ağa gider
  if (url.origin !== location.origin) return;
  // önbellek öncelikli, yoksa ağ, o da yoksa index.html (SPA)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
