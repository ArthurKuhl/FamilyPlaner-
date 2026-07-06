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

  function starteSync({ modul, keys, onRemoteChange, transform }) {
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
          out[k] = raw ? JSON.parse(raw) : null;
        } catch (e) { out[k] = null; }
      });
      return out;
    }

    function remoteAnwenden(werte) {
      if (!werte) return;
      wendeGeradeRemoteAn = true;
      keys.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(werte, k) && werte[k] !== undefined) {
          try { localStorage.setItem(k, JSON.stringify(werte[k])); } catch (e) {}
        }
      });
      wendeGeradeRemoteAn = false;
      if (onRemoteChange) { try { onRemoteChange(); } catch (e) { console.warn('PlanerSync onRemoteChange Fehler', e); } }
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

    authReady = authReady || Promise.resolve();
    authReady.then(() => {
      abbestellen = docRef().onSnapshot((snap) => {
        setzeStatus('online');
        if (!snap.exists) { push(); return; }
        const data = snap.data();
        if (!data) return;
        if (data._aktualisiertVon === geraeteId) return; // eigene Änderung, nicht erneut anwenden
        remoteAnwenden(data.werte);
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
        try { const raw = localStorage.getItem(k); werte[k] = raw ? JSON.parse(raw) : null; }
        catch (e) { werte[k] = null; }
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
    pushWerte: pushWerte,
    status: function () { try { return localStorage.getItem(STATUS_KEY) || 'unbekannt'; } catch (e) { return 'unbekannt'; } },
    geraeteId: geraeteId,
  };
})();
