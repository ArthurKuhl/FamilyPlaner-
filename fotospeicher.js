// ============================================================================
// FotoSpeicher – Familienfotos in Firebase Storage (statt im Firestore-Dokument)
// ============================================================================
// Fotos mit "👪 Familie" werden als Datei unter
//   planerFamilien/{Familien-Code}/fotos/{fotoId}.jpg
// abgelegt; im synchronisierten Eintrag steht nur noch die Adresse (url, pfad).
// "🔒 Nur ich"-Fotos werden nie hochgeladen.
// Voraussetzung: firebase-storage-compat.js und sync.js sind vorher geladen.
// Offline: der Service Worker hält einmal geladene Familienfotos im Cache.
// ============================================================================
window.FotoSpeicher = (function () {
  'use strict';
  function verfuegbar() {
    try {
      return typeof firebase !== 'undefined' && typeof firebase.storage === 'function' &&
        !!window.PlanerSync && !!window.PlanerSync.familienId();
    } catch (e) { return false; }
  }
  function ordner() { return 'planerFamilien/' + window.PlanerSync.familienId() + '/fotos/'; }

  // Lädt ein Foto (data:-URL) hoch. neuerName=true hängt einen Zeitstempel an (z.B. nach
  // einer Malstil-Änderung), damit Geräte mit zwischengespeicherter alter Version das neue Bild holen.
  async function hochladen(fotoId, dataUrl, neuerName) {
    if (!verfuegbar()) throw new Error('Cloud-Fotospeicher nicht verfügbar');
    await window.PlanerSync.authBereit();
    const pfad = ordner() + fotoId + (neuerName ? '-' + Date.now().toString(36) : '') + '.jpg';
    const ref = firebase.storage().ref(pfad);
    await ref.putString(dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' });
    const url = await ref.getDownloadURL();
    return { url: url, pfad: pfad };
  }
  function loeschen(pfad) {
    if (!pfad || !verfuegbar()) return Promise.resolve();
    return window.PlanerSync.authBereit()
      .then(() => firebase.storage().ref(pfad).delete())
      .catch(() => {}); // schon gelöscht oder offline – kein Grund für eine Fehlermeldung
  }
  return { verfuegbar: verfuegbar, hochladen: hochladen, loeschen: loeschen };
})();
