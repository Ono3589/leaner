/* ============================================================
   Leaner — Service Worker

   Strategie: Netzwerk zuerst, Cache als Rückfall.

   Warum nicht Cache zuerst: Solange am Projekt gearbeitet wird,
   ist ein hartnäckiger Zwischenspeicher der häufigste Grund für
   "warum sehe ich meine Änderung nicht". Netzwerk zuerst liefert
   immer den aktuellen Stand und funktioniert offline trotzdem,
   weil jede erfolgreiche Antwort mitgeschrieben wird.

   Fremde Adressen (Supabase, CDN) fasst der Worker nicht an.
   ============================================================ */

const CACHE = 'leaner-v6';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './cloud.js',
  './icons.js',
  './data.js',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './brand/mark.svg',
  './brand/logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .catch(() => {})           // einzelne fehlende Datei darf die Installation nicht kippen
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // Supabase und CDN nie anfassen

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
