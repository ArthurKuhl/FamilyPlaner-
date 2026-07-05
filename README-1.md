# 🌱 Planer

Eine feature-reiche, offline-fähige Familien-/Lebensplaner-App als Progressive Web App (PWA) – läuft direkt im Browser oder installiert auf dem Smartphone-Homescreen. Der Gartenplaner ist der erste, vollständig ausgebaute Bereich; weitere Bereiche (Termine, Gesundheit & Sport, Einkauf, Kochen & Backen, Gaming, ...) folgen als eigenständige Module in derselben App-Hülle.

## Architektur

Die App besteht aus einer schlanken **Shell** (`index.html`) mit der Hauptnavigation, die pro Bereich die passende Modul-Datei in einem Iframe lädt:

- `index.html` – Shell mit Navigation, Service-Worker-Registrierung, merkt sich den zuletzt geöffneten Bereich
- `garten.html` – Gartenplaner-Modul (das ursprüngliche, vollständige Feature-Set)
- `placeholder.html` – Platzhalter für noch nicht gebaute Bereiche
- `manifest.webmanifest`, `service-worker.js`, `icon-*.png` – PWA-Infrastruktur

Neue Bereiche werden als eigene HTML-Datei ergänzt und in der `MODULE`-Liste in `index.html` eingetragen – der Rest der Navigation funktioniert automatisch.

## Funktionen (Bereich Garten)

- 🗺️ Beetplanung per Zeichenwerkzeug (Rechteck, Kreis, Dreieck, L-Form, Freihand)
- 🌿 Pflanzenkatalog mit ~87 Einträgen, Fruchtfolge- und Mischkultur-Prüfung
- 📅 Aussaatkalender mit "Bald säen"-Übersicht
- 🌦️ Wetterintegration (Frost-, Hitze-, Regen- und Hagelwarnungen via Open-Meteo)
- ✅ Pflegeplan mit Tagesübersicht und Aufgaben-Tracking
- 📖 Erntebuch mit Jahresvergleich
- 🌱 Saatgut-Inventar mit Frische- und Aussaatfenster-Anzeige
- 💰 Kostenverfolgung mit Kategorien-Auswertung
- 🥫 Vorratsliste mit Haltbarkeitstracking
- 🍯 Verwertungs- & Haltbarmachen-Referenz für ~70 Pflanzen
- 📷 Foto-Tagebuch je Beet
- 📊 Statistik-Dashboard
- 📄 PDF-/CSV-Export und ICS-Kalenderexport
- 💾 Automatisches Backup-System

## Installation auf dem Smartphone

1. Diese Seite im Browser öffnen: `https://[dein-github-name].github.io/gartenplaner/index.html`
2. **Android (Chrome):** Menü (⋮) → "Zum Startbildschirm hinzufügen"
3. **iOS (Safari):** Teilen-Button → "Zum Home-Bildschirm"

Danach lässt sich die App wie eine normale App vom Homescreen starten – inklusive Offline-Nutzung.

## Technik

- Läuft komplett offline nach dem ersten Laden, keine Server-Backend-Abhängigkeit
- Alle Daten werden lokal im Browser gespeichert (`localStorage`) – **nicht** auf GitHub oder in der Cloud
- Single-File-Architektur (HTML/CSS/JS in einer Datei) + PWA-Hülle (Manifest, Service Worker, Icons)
- Keine externen Abhängigkeiten außer Google Fonts und der Open-Meteo-Wetter-API

## Wichtiger Hinweis zu den Daten

Da alle Daten lokal im Browser liegen, sind sie **geräte- und browserspezifisch**. Es gibt aktuell noch keine automatische Synchronisierung zwischen mehreren Geräten (z. B. zwischen zwei Smartphones). Regelmäßige Backups über die integrierte Export-Funktion werden empfohlen.

## Updates einspielen

Bei einer neuen Version eines Bereichs (z. B. `garten.html`) oder der Shell (`index.html`):
1. Die aktualisierte Datei ins Repository hochladen (alte Datei überschreiben)
2. In `service-worker.js` die `CACHE_VERSION` erhöhen (z. B. `v2` → `v3`), damit installierte Apps die neue Version laden

Ein neuer Bereich (z. B. Termine) wird als eigene Datei (`termine.html`) hochgeladen und in der `MODULE`-Liste in `index.html` sowie in `APP_SHELL` in `service-worker.js` ergänzt.

## Lizenz

Privates Projekt.
