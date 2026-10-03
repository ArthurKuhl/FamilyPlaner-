// Gartenplaner Service Worker
// WICHTIG: CACHE_VERSION bei jedem Update der App-Datei erhöhen (z.B. 'v1' -> 'v2'),
// sonst bekommen Nutzer weiterhin die alte, zwischengespeicherte Version ausgeliefert.
const CACHE_VERSION = 'v368';
const CACHE_NAME = 'planer-cache-' + CACHE_VERSION;

const APP_SHELL = [
  './index.html',
  './home.html',
  './garten.html',
  './termine.html',
  './einkauf.html',
  './kochen.html',
  './vorratskammer.html',
  './gesundheit.html',
  './gaming.html',
  './medien.html',
  './handwerk.html',
  './haushalt.html',
  './geldgeschenke.html',
  './notizblock.html',
  './ausfluege.html',
  './nachrichten.html',
  './finanzen.html',
  './hausplan.html',
  './placeholder.html',
  './sync.js',
  './personen.js',
  './gemeinsam.js',
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

// Antwortet der App auf Anfrage mit der aktuellen Cache-Version, damit sich in der
// Oberfläche anzeigen lässt, ob ein Update tatsächlich angekommen ist.
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

// Fetch-Strategie:
// - Für die App-Datei selbst: "Network first, fallback Cache" -> Nutzer bekommt
//   bei Internetverbindung immer die aktuellste Version, offline die letzte gecachte.
// - Für alles andere (z.B. Google Fonts, Open-Meteo API): normal ans Netz,
//   bei Fehler (offline) auf Cache zurückfallen falls vorhanden.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Eigene App-Dateien immer beim Server nachfragen (cache: 'no-cache'), statt bis zu
  // 10 Minuten eine vom Browser zwischengespeicherte alte Version zu bekommen.
  // Unverändert antwortet GitHub Pages nur kurz mit "304 nicht geändert" – kostet kaum Daten.
  const eigeneDatei = req.url.startsWith(self.location.origin);
  event.respondWith(
    (eigeneDatei ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req))
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

// ---------- Push-Erinnerungen (vom Server über Firebase Cloud Messaging) ----------
// Der Server schickt nur Daten (titel, text, tag, link); angezeigt wird hier selbst,
// damit kein zusätzliches Firebase-Skript im Service Worker nötig ist.
self.addEventListener('push', (event) => {
  let inhalt = {};
  try { inhalt = event.data ? event.data.json() : {}; } catch (e) {}
  const d = inhalt.data || inhalt.notification || inhalt;
  const titel = d.titel || d.title || 'Familienplaner';
  event.waitUntil(self.registration.showNotification(titel, {
    body: d.text || d.body || '',
    tag: d.tag || undefined,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { link: d.link || './index.html' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = (event.notification.data && event.notification.data.link) || './index.html';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenster) => {
    for (const f of fenster) { if ('focus' in f) return f.focus(); }
    return self.clients.openWindow(ziel);
  }));
});
