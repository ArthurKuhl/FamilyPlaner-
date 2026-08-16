// ============================================================================
// PLANER_PERSONEN – gemeinsame Liste der Familienmitglieder für alle Module,
// die eine Personen-Auswahl anbieten (Termine, Gesundheit & Sport, Gaming, ...).
//
// Die Liste ist NICHT mehr fest in dieser Datei einprogrammiert (das würde
// bedeuten, dass jede Familie, die die App nutzt, dieselben Namen sähe!).
// Stattdessen liegt sie pro Familie in localStorage (Schlüssel
// 'planer_personenListe') und wird über sync.js mit den anderen Geräten der
// eigenen Familie synchronisiert. Bearbeitbar über "👪 Personen verwalten"
// in der Kopfzeile der App (index.html).
//
// PERSONEN_STANDARD dient nur als Startbelegung für brandneue, leere
// Installationen (neue Familie, noch keine eigenen Daten) – wird beim
// allerersten Laden einmalig nach localStorage kopiert.
// ============================================================================
window.PLANER_PERSONEN_STANDARD = [
  { id: 'person1', label: 'Person 1', farbe: '#4f6f45' },
  { id: 'person2', label: 'Person 2', farbe: '#5b8bb5' },
];

// Alte, fest einprogrammierte Liste – wird NUR für die einmalige Migration
// bestehender Installationen verwendet, die schon Daten mit diesen IDs haben
// (siehe holePersonenListe() unten). Neue Familien bekommen diese NIE zu Gesicht.
const PLANER_PERSONEN_LEGACY = [
  { id: 'familie', label: 'Familie', farbe: '#4f6f45' },
  { id: 'mama',    label: 'Mama',    farbe: '#c46b41' },
  { id: 'papa',    label: 'Papa',    farbe: '#5b8bb5' },
  { id: 'lev',     label: 'Lev',     farbe: '#c99a3a' },
  { id: 'malia',   label: 'Malia',   farbe: '#8a5c7a' },
];

const PERSONEN_KEY = 'planer_personenListe';

function planerErkenneBestehendeInstallation() {
  // Heuristik: Wenn schon "echte" App-Daten lokal vorhanden sind (z.B. Termine,
  // Rezepte o.ä.), handelt es sich um ein Gerät, das schon vor der Einführung
  // dieser Personenverwaltung im Einsatz war -> alte Namen übernehmen statt
  // "Person 1"/"Person 2" anzuzeigen.
  const bekannteSchluessel = ['termine_liste', 'kochen_rezepte', 'gartenplaner_v3', 'einkauf_liste'];
  return bekannteSchluessel.some(k => {
    try {
      const raw = localStorage.getItem(k);
      return raw && raw !== '[]' && raw !== '{}' && raw !== 'null';
    } catch (e) { return false; }
  });
}

function holePersonenListe() {
  try {
    const raw = localStorage.getItem(PERSONEN_KEY);
    if (raw) {
      const liste = JSON.parse(raw);
      if (Array.isArray(liste) && liste.length) return liste;
    }
  } catch (e) {}
  // Noch keine Liste vorhanden. WICHTIG: nur das Gerät, das die Familie ursprünglich
  // erstellt hat, darf hier einen Startwert erzeugen UND in localStorage speichern -
  // sonst würden zwei Geräte, die beide gleichzeitig zum ersten Mal eine neue,
  // noch leere Sync-Kategorie berühren, jeweils ihre eigene geratene Liste hochladen
  // und sich gegenseitig überschreiben (genau das ist uns mit Mama/Papa/Lev/Malia
  // passiert). Beitretende Geräte zeigen bis zum Eintreffen der echten Cloud-Daten
  // nur einen NICHT gespeicherten, temporären Platzhalter an.
  const startliste = planerErkenneBestehendeInstallation() ? PLANER_PERSONEN_LEGACY : window.PLANER_PERSONEN_STANDARD;
  let istErsteller = false;
  try { istErsteller = localStorage.getItem('planer_familienErsteller') === '1'; } catch (e) {}
  if (istErsteller) {
    try { localStorage.setItem(PERSONEN_KEY, JSON.stringify(startliste)); } catch (e) {}
  }
  return startliste;
}

window.PLANER_PERSONEN = holePersonenListe();

// Erlaubt anderen Skripten (index.html), die Liste nach einer Bearbeitung
// neu zu laden bzw. bei einer eintreffenden Cloud-Änderung zu aktualisieren.
window.planerPersonenNeuLaden = function () {
  window.PLANER_PERSONEN = holePersonenListe();
  return window.PLANER_PERSONEN;
};
