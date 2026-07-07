# 🌱 Planer

Eine feature-reiche, offline-fähige Familien-/Lebensplaner-App als Progressive Web App (PWA) – läuft direkt im Browser oder installiert auf dem Smartphone-Homescreen. Alle sechs ursprünglich geplanten Bereiche sind fertig: Garten, Termine, Einkauf, Kochen & Backen, Gesundheit & Sport und Gaming. Zusätzlich ist eine automatische Cloud-Synchronisierung zwischen mehreren Geräten (z.B. zwischen den Handys beider Partner) eingebaut. Weitere Bereiche lassen sich jederzeit als zusätzliche Module ergänzen (siehe Architektur unten).

## Gesamt-Backup (zusätzlich zum Cloud-Sync)

Über das 💾-Symbol oben in der Navigation lässt sich jederzeit eine Sicherungsdatei mit allen Daten aus allen Bereichen exportieren – ein zusätzliches Sicherheitsnetz neben der automatischen Cloud-Synchronisierung, z.B. für den Fall eines gelöschten Firebase-Projekts oder um vor größeren Änderungen einen Wiederherstellungspunkt zu haben.

- **Export**: lädt eine JSON-Datei mit Zeitstempel herunter (`planer-backup-JJJJ-MM-TT-HHmm.json`)
- **Import**: stellt alle Schlüssel aus der Datei wieder her und überträgt sie aktiv in die Cloud, damit auch das andere Gerät den wiederhergestellten Stand erhält. Da dies bestehende (auch neuere) Daten überschreiben kann, wird vorher eine deutliche Bestätigung eingeblendet
- Geräte-/sitzungsspezifische Werte (Geräte-ID, aktueller Sync-Status) werden bewusst nicht mit exportiert/importiert

## Cloud-Synchronisierung

Die App synchronisiert sich automatisch über ein Firebase-Firestore-Projekt (kostenlos). Jedes Modul lädt Änderungen wenige Sekunden nach dem Speichern hoch; auf allen anderen geöffneten Geräten erscheinen sie automatisch, auch ohne Neuladen.

- `sync.js` enthält die komplette Sync-Logik und die Zugangsdaten des gemeinsamen Firebase-Projekts
- Jedes Modul synchronisiert nur seine eigenen Daten (eigenes Firestore-Dokument), Geräte-lokale Anzeige-Einstellungen (z.B. welche Einkaufsliste gerade offen ist) bleiben bewusst unsynchronisiert
- **Fotos im Garten-Tagebuch werden NICHT synchronisiert** (Firestore erlaubt max. 1 MB pro Dokument – Fotos als Bilddaten würden das schnell überschreiten). Alle anderen Garten-Daten (Beete, Pflanzen, Pflegeplan, Erntebuch, Kosten, Vorrat, Sortendatenbank, Saatgut) synchronisieren normal
- Ohne Internetverbindung funktioniert die App weiterhin normal lokal; Änderungen werden automatisch synchronisiert, sobald wieder eine Verbindung besteht
- Der kleine Indikator oben rechts in der Navigation zeigt den Sync-Status: ⏳ verbindet, ☁️ synchronisiert, ⚠️ Fehler (Daten bleiben lokal gespeichert), 📵 Sync nicht verfügbar

**Firestore-Sicherheitsregeln** (unter Firebase Console → Firestore Database → Regeln):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /planerDaten/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
Diese Regeln erlauben Lesen/Schreiben für jeden angemeldeten Nutzer (auch anonym) – ausreichend für die private Nutzung im Familienkreis, da niemand außerhalb des Kreises die Firebase-Konfiguration kennt.

## Architektur

Die App besteht aus einer schlanken **Shell** (`index.html`) mit der Hauptnavigation, die pro Bereich die passende Modul-Datei in einem Iframe lädt:

- `index.html` – Shell mit Navigation, Service-Worker-Registrierung, merkt sich den zuletzt geöffneten Bereich, leitet Kachel-Klicks von der Startseite an den passenden Bereich weiter, Gesamt-Backup (Export/Import aller Bereiche als Datei, Symbol 💾)
- `home.html` – Startseite/Dashboard: zeigt auf einen Blick die heutigen Termine, offene Einkaufslisten-Posten und die heutigen Sport-Einheiten (liest direkt aus dem gemeinsamen Speicher, da alle Module denselben Ursprung teilen); Kacheln sind antippbar und wechseln direkt in den jeweiligen Bereich. Die Garten-Kachel verlinkt bewusst ohne genaue Aufgabenzahl, da diese Berechnung eng mit den Live-Wetterdaten im Garten-Modul verzahnt ist
- `garten.html` – Gartenplaner-Modul (das ursprüngliche, vollständige Feature-Set)
- `personen.js` – gemeinsame Liste der Familienmitglieder (Familie, Mama, Papa, Lev, Malia) für alle Bereiche mit Personen-Auswahl (Termine, Gesundheit & Sport, Gaming). Weitere Personen lassen sich hier an einer einzigen Stelle ergänzen, statt in jedem Modul einzeln
- `termine.html` – Termine-Modul: Kalender- und Agendaansicht, Wiederholungen, Filter nach Person (Familie/Mama/Papa/Lev/Malia)
- `einkauf.html` – Einkauf-Modul: mehrere Einkaufslisten, Kategorien-Gruppierung, Mengen-Parsing bei der Schnelleingabe (z.B. „500g Mehl“), Favoriten-Vorschläge
- `kochen.html` – Kochen & Backen-Modul: Rezeptsammlung mit Portionsskalierung, Favoriten, Kategorie-Filter. Button „Zum Einkauf“ überträgt die (skalierten) Zutaten direkt in die aktive Einkaufsliste (funktioniert, weil beide Module denselben Browser-Speicher nutzen)
- `gesundheit.html` – Gesundheit & Sport-Modul: Tages-Tracking (Gewicht, Schlaf, Wasser, Stimmung) pro Person, Sport-Log mit Kategorien, Gewichtsverlauf als Mini-Chart, Wochenstatistik, Nährstoffbedarf-Rechner (Grundumsatz/Gesamtumsatz nach Mifflin-St-Jeor, Makro- und grobe Mikronährstoff-Richtwerte), eine Krafttraining-Referenz mit Muskelgruppen und Übungsvorschlägen, eine Dehnübungs-Referenz gegen Verspannungen, Hohlkreuz und schlechte Haltung, eine tägliche Medikamenten-/Vitamin-Checkliste pro Person sowie eine Wasser-Erinnerung per Browser-Benachrichtigung (geräte-lokale Einstellung, wird bewusst nicht synchronisiert)
- `gaming.html` – Gaming-Modul: Spielebibliothek mit Status (Wunschliste/Spiele ich/Pausiert/Durchgespielt/Abgebrochen), Plattform, Sterne-Bewertung, Spielzeit, Filter nach Person und Status
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
