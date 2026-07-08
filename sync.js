// ============================================================================
// PlanerSync – gemeinsame Cloud-Synchronisierung für alle Module
// ============================================================================
// Nutzung in einem Modul:
//   window._sync = PlanerSync.starteSync({
//     modul: 'termine',                          // Firestore-Dokument-Name
//     keys: ['termine_events'],                  // zu synchronisierende localStorage-Schlüssel
//     onRemoteChange: () => renderAlles(),        // wird nach eingehender Änderung aufgerufen
//   });
// Nach jedem lokalen Speichern aufrufen:
//   window._sync && window._sync.melde();
//
// Voraussetzung: firebase-app-compat.js, firebase-auth-compat.js und
// firebase-firestore-compat.js müssen VOR dieser Datei per <script> geladen sein.
// ============================================================================
window.PlanerSync = (function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyCt_y7Op1jgSAbl4Y0sFTNbnH32_NeXdt8",
    authDomain: "familyplaner-733de.firebaseapp.com",
    projectId: "familyplaner-733de",
    storageBucket: "familyplaner-733de.firebasestorage.app",
    messagingSenderId: "253061207361",
    appId: "1:253061207361:web:0ea88dbde6fcff54b17dc0"
  };

  const STATUS_KEY = 'planer_syncStatus';
  const GERAET_ID_KEY = 'planer_geraeteId';

  let app = null, auth = null, db = null, authReady = null;
  let verfuegbar = typeof firebase !== 'undefined';

  function holeGeraeteId() {
    let id = localStorage.getItem(GERAET_ID_KEY);
    if (!id) {
      id = 'geraet_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem(GERAET_ID_KEY, id); } catch (e) {}
    }
    return id;
  }
  const geraeteId = holeGeraeteId();

  function setzeStatus(s) {
    try { localStorage.setItem(STATUS_KEY, s); } catch (e) {}
  }

  function initFirebase() {
    if (!verfuegbar) { setzeStatus('nicht_verfuegbar'); return; }
    if (app) return;
    try {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
      setzeStatus('verbindet');
      authReady = new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
          if (user) { resolve(user); return; }
          auth.signInAnonymously().catch((err) => {
            console.warn('PlanerSync: Anmeldung fehlgeschlagen', err);
            setzeStatus('fehler');
          });
        });
      });
    } catch (e) {
      console.warn('PlanerSync: Initialisierung fehlgeschlagen', e);
      setzeStatus('fehler');
      verfuegbar = false;
    }
  }

  // Entfernt rekursiv alle Eigenschaften namens "photo" (Firestore-Größenlimit: 1 MB pro Dokument)
  function entferneFotosTief(objekt) {
    if (Array.isArray(objekt)) return objekt.map(entferneFotosTief);
    if (objekt && typeof objekt === 'object') {
      const kopie = {};
      Object.keys(objekt).forEach((k) => {
        if (k === 'photo') return;
        kopie[k] = entferneFotosTief(objekt[k]);
      });
      return kopie;
    }
    return objekt;
  }

  // Fügt lokal vorhandene "photo"-Felder wieder in eingehende (foto-lose) Remote-Daten ein,
  // damit ein eingehender Sync von einem anderen Gerät niemals lokal gespeicherte Fotos löscht.
  // Geht davon aus, dass Remote- und Lokal-Struktur an derselben Stelle dieselbe Form haben
  // (funktioniert zuverlässig, solange nicht gleichzeitig auf beiden Geräten dieselbe Stelle
  // strukturell verändert wird, z.B. Beete in unterschiedlicher Reihenfolge neu angelegt).
  function fotosWiederEinfuegen(remote, lokal) {
    if (Array.isArray(remote)) {
      if (!Array.isArray(lokal)) return remote;
      return remote.map((item, i) => fotosWiederEinfuegen(item, lokal[i]));
    }
    if (remote && typeof remote === 'object') {
      if (!lokal || typeof lokal !== 'object') return remote;
      const ergebnis = Object.assign({}, remote);
      Object.keys(ergebnis).forEach((k) => { ergebnis[k] = fotosWiederEinfuegen(ergebnis[k], lokal[k]); });
      if (lokal.photo && !ergebnis.photo) ergebnis.photo = lokal.photo;
      return ergebnis;
    }
    return remote;
  }

  function starteSync({ modul, keys, onRemoteChange, transform, vorAnwendungTransform }) {
    if (!verfuegbar) return { melde: function () {} };
    initFirebase();
    if (!verfuegbar) return { melde: function () {} };

    let wendeGeradeRemoteAn = false;
    let pushTimer = null;
    let abbestellen = null;

    function docRef() { return db.collection('planerDaten').doc(modul); }

    function localSnapshot() {
      const out = {};
      keys.forEach((k) => {
        try {
          const raw = localStorage.getItem(k);
          // Wichtig: fehlt der Schlüssel auf DIESEM Gerät (raw === null), wird er hier bewusst
          // NICHT mit aufgenommen. Sonst würde beim Hochladen ein "null" an die Cloud gesendet,
          // das andere Geräte dann fälschlich als "bitte leeren" interpretieren und damit
          // eventuell vorhandene, gute Daten dort überschreiben.
          if (raw === null || raw === undefined) return;
          out[k] = JSON.parse(raw);
        } catch (e) { /* Schlüssel bei Parse-Fehler überspringen statt null zu senden */ }
      });
      return out;
    }

    function remoteAnwenden(werte, istErstmaligerAbgleich) {
      if (!werte) return;
      if (vorAnwendungTransform) {
        try { werte = vorAnwendungTransform(werte, localSnapshot()); } catch (e) { console.warn('PlanerSync vorAnwendungTransform Fehler', e); }
      }
      wendeGeradeRemoteAn = true;
      keys.forEach((k) => {
        if (!Object.prototype.hasOwnProperty.call(werte, k)) return;
        if (werte[k] === undefined || werte[k] === null) return; // schützt auch vor älteren, fehlerhaften Cloud-Einträgen
        try { localStorage.setItem(k, JSON.stringify(werte[k])); } catch (e) {}
      });
      wendeGeradeRemoteAn = false;
      if (onRemoteChange) { try { onRemoteChange(istErstmaligerAbgleich); } catch (e) { console.warn('PlanerSync onRemoteChange Fehler', e); } }
    }

    function push() {
      authReady.then(() => {
        let werte = localSnapshot();
        if (transform) { try { werte = transform(werte); } catch (e) { console.warn('PlanerSync transform Fehler', e); } }
        docRef().set({
          werte: werte,
          _aktualisiertVon: geraeteId,
          _aktualisiertAm: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }).then(() => {
          setzeStatus('online');
        }).catch((err) => {
          console.warn('PlanerSync: Push fehlgeschlagen für', modul, err);
          setzeStatus('fehler');
        });
      });
    }

    // Firestores onSnapshot feuert beim Verbindungsaufbau IMMER sofort mit dem aktuellen
    // Stand (oft sogar zweimal: einmal aus dem lokalen Cache, einmal vom Server bestätigt) –
    // das ist keine "neue" Änderung. Ohne Abgleich würde jedes Öffnen eines Bereichs, dessen
    // letzte Änderung von einem ANDEREN Gerät stammt, fälschlich als frische Änderung gelten.
    // Deshalb wird über einen Zeitstempel-Fingerabdruck erkannt, ob sich seit dem letzten
    // verarbeiteten Stand wirklich etwas geändert hat.
    let letzterVerarbeiteterStempel = null;
    authReady = authReady || Promise.resolve();
    authReady.then(() => {
      abbestellen = docRef().onSnapshot((snap) => {
        setzeStatus('online');
        if (!snap.exists) { push(); return; }
        const data = snap.data();
        if (!data) return;
        if (data._aktualisiertVon === geraeteId) return; // eigene Änderung, nicht erneut anwenden
        let stempelZeit = '';
        try { stempelZeit = data._aktualisiertAm && data._aktualisiertAm.toMillis ? String(data._aktualisiertAm.toMillis()) : ''; } catch (e) {}
        const stempel = data._aktualisiertVon + '|' + stempelZeit;
        if (stempel === letzterVerarbeiteterStempel) return; // gleicher Stand wie zuvor, keine echte neue Änderung
        const istErstmaligerAbgleich = letzterVerarbeiteterStempel === null;
        letzterVerarbeiteterStempel = stempel;
        remoteAnwenden(data.werte, istErstmaligerAbgleich);
      }, (err) => {
        console.warn('PlanerSync: Verbindung fehlgeschlagen für', modul, err);
        setzeStatus('fehler');
      });
    });

    function melde() {
      if (wendeGeradeRemoteAn) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 1200);
    }

    return { melde: melde, entferneFotosTief: entferneFotosTief };
  }

  function pushWerte(modul, keys, transform) {
    if (!verfuegbar) return Promise.resolve();
    initFirebase();
    if (!verfuegbar) return Promise.resolve();
    return (authReady || Promise.resolve()).then(() => {
      let werte = {};
      keys.forEach((k) => {
        try {
          const raw = localStorage.getItem(k);
          if (raw === null || raw === undefined) return;
          werte[k] = JSON.parse(raw);
        } catch (e) { /* Schlüssel bei Parse-Fehler überspringen statt null zu senden */ }
      });
      if (transform) { try { werte = transform(werte); } catch (e) { console.warn('PlanerSync transform Fehler', e); } }
      return db.collection('planerDaten').doc(modul).set({
        werte: werte,
        _aktualisiertVon: geraeteId,
        _aktualisiertAm: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).then(() => setzeStatus('online')).catch((err) => {
        console.warn('PlanerSync: erzwungener Push fehlgeschlagen für', modul, err);
        setzeStatus('fehler');
      });
    });
  }

  return {
    starteSync: starteSync,
    entferneFotosTief: entferneFotosTief,
    fotosWiederEinfuegen: fotosWiederEinfuegen,
    pushWerte: pushWerte,
    status: function () { try { return localStorage.getItem(STATUS_KEY) || 'unbekannt'; } catch (e) { return 'unbekannt'; } },
    geraeteId: geraeteId,
  };
})();
