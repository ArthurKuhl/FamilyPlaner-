// Gartenplaner Service Worker
// WICHTIG: CACHE_VERSION bei jedem Update der App-Datei erhöhen (z.B. 'v1' -> 'v2'),
// sonst bekommen Nutzer weiterhin die alte, zwischengespeicherte Version ausgeliefert.
const CACHE_VERSION = 'v37';
const CACHE_NAME = 'planer-cache-' + CACHE_VERSION;

const APP_SHELL = [
  './index.html',
  './home.html',
  './garten.html',
  './termine.html',
  './einkauf.html',
  './kochen.html',
  './gesundheit.html',
  './gaming.html',
  './handwerk.html',
  './placeholder.html',
  './sync.js',
  './personen.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Installation: App-Shell in den Cache legen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Aktivierung: alte Cache-Versionen aufräumen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('planer-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch-Strategie:
// - Für die App-Datei selbst: "Network first, fallback Cache" -> Nutzer bekommt
//   bei Internetverbindung immer die aktuellste Version, offline die letzte gecachte.
// - Für alles andere (z.B. Google Fonts, Open-Meteo API): normal ans Netz,
//   bei Fehler (offline) auf Cache zurückfallen falls vorhanden.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Erfolgreiche Antwort im Cache aktualisieren (nur same-origin, um Fehler bei
        // opaken Cross-Origin-Antworten zu vermeiden)
        if (networkResponse && networkResponse.ok && req.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(req))
  );
});
