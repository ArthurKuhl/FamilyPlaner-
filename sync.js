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
// ============================================================================
// GLOBALES FEHLER-NETZ: zeigt in JEDEM Modul, das diese Datei lädt, eine kurze,
// sichtbare Meldung bei unerwarteten Fehlern (statt dass eine Aktion wie
// "Speichern" wortlos fehlschlägt). Erstellt sein eigenes kleines Banner,
// unabhängig vom CSS des jeweiligen Moduls.
// ============================================================================
(function () {
  let letzteFehlerAnzeigeZeit = 0;
  function zeigeFehlerBanner(text) {
    const jetzt = Date.now();
    if (jetzt - letzteFehlerAnzeigeZeit < 8000) return; // nicht mit mehreren Bannern überfluten
    letzteFehlerAnzeigeZeit = jetzt;
    try {
      let el = document.getElementById('__planerFehlerBanner');
      if (!el) {
        el = document.createElement('div');
        el.id = '__planerFehlerBanner';
        el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:14px;z-index:99999;' +
          'background:#3a2e1f;color:#fdece0;padding:11px 14px;border-radius:12px;' +
          'font:600 12.5px/1.4 -apple-system,Inter,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.35);' +
          'display:flex;align-items:flex-start;gap:8px;';
        document.body.appendChild(el);
      }
      el.innerHTML = '<span style="flex:1;">⚠ ' + text.replace(/[<>]/g, '') + '</span>' +
        '<button style="background:none;border:none;color:#fdece0;font-size:14px;cursor:pointer;padding:0 2px;" onclick="this.parentElement.remove()">✕</button>';
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { if (el && el.parentElement) el.remove(); }, 12000);
    } catch (e) { /* Banner-Anzeige darf selbst nie einen Folgefehler auslösen */ }
  }
  window.addEventListener('error', (e) => {
    const details = (e.error && e.error.message) || e.message || 'Unbekannter Fehler';
    console.error('Planer-Fehler:', e.error || e.message, e.filename, e.lineno);
    zeigeFehlerBanner('Fehler: ' + String(details).slice(0, 100));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const details = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    console.error('Planer-Fehler (async):', e.reason);
    zeigeFehlerBanner('Fehler (async): ' + String(details).slice(0, 100));
  });
})();

// ============================================================================
// SUCHE AUS DER SHELL: Ein Treffer aus „🔍 In allen Bereichen suchen“ öffnet das Modul und
// übergibt den Suchbegriff. Hat das Modul ein eigenes Suchfeld, wird es damit gefüllt (Liste
// gefiltert), sonst springt die Seite zur ersten Fundstelle des Eintrags und markiert sie.
// ============================================================================
(function () {
  const SUCHFELDER = ['#fSuche', '#notizSuche'];
  function sichtbar(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function imModulSuchen(begriff, ziel) {
    const feld = SUCHFELDER.map(s => document.querySelector(s)).find(sichtbar);
    if (feld && begriff) {
      feld.value = begriff;
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      feld.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      return;
    }
    if (!(ziel && springeZu(ziel)) && begriff) springeZu(begriff);
  }
  // Sucht die erste sichtbare Stelle mit dem Text, scrollt dorthin und lässt sie kurz aufleuchten
  function springeZu(text) {
    const q = String(text).toLowerCase().trim();
    if (!q || !document.body) return false;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.toLowerCase().indexOf(q) !== -1) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    let n;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      if (!el || el.closest('script, style, option, datalist, select, textarea, .modal-bg, #__planerFehlerBanner') || !sichtbar(el)) continue;
      const ziel = el.closest('button, li, tr, a, [class*="karte"], [class*="eintrag"], [class*="item"], [class*="zeile"]') || el;
      try { ziel.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { ziel.scrollIntoView(); }
      try {
        ziel.animate([
          { boxShadow: '0 0 0 3px rgba(220,177,88,0.95)', backgroundColor: 'rgba(220,177,88,0.35)' },
          { boxShadow: '0 0 0 3px rgba(220,177,88,0)', backgroundColor: 'rgba(220,177,88,0)' },
        ], { duration: 2600, easing: 'ease-out' });
      } catch (e) {}
      return true;
    }
    return false;
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin || !e.data || e.data.type !== 'shortcutAktion' || e.data.aktion !== 'suche') return;
    // kurz warten, bis das Modul seine Listen fertig aufgebaut hat
    setTimeout(() => imModulSuchen(String(e.data.text || ''), String(e.data.ziel || '')), 600);
  });
})();

// ============================================================================
// EINHEITLICHE KOPFZEILE: Die Standard-Symbole stehen in jedem Modul in derselben
// Reihenfolge rechts nebeneinander – ℹ️ Infos (bzw. ? Hilfe) · 🌐 News · 🎨 Design.
// Modul-eigene Knöpfe (📋, ⚙️, …) bleiben davor, „＋ Neu“/Export ganz rechts.
// ============================================================================
(function () {
  function kopfzeileOrdnen() {
    const theme = document.getElementById('btnThemeAuswahl');
    if (!theme || theme.closest('.kopf-symbole')) return;
    const kopf = theme.closest('header');
    const zeile = theme.parentElement;
    if (!kopf || !zeile) return;
    const imKopf = (el) => el && el.closest('header') === kopf ? el : null;
    const symbole = [
      imKopf(document.getElementById('btnInfosModal')) || imKopf(kopf.querySelector('.btn-help')),
      imKopf(document.getElementById('btnNews')) || imKopf(document.getElementById('btnDeals')),
      theme,
    ].filter(Boolean);
    const gruppe = document.createElement('span');
    gruppe.className = 'kopf-symbole';
    gruppe.style.cssText = 'display:inline-flex;align-items:center;gap:2px;flex-shrink:0;';
    const primaer = Array.from(zeile.children).find(el => el.matches('#btnNeu, .add-btn, .ics-btn'));
    zeile.insertBefore(gruppe, primaer || null);
    symbole.forEach(b => gruppe.appendChild(b));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kopfzeileOrdnen);
  else kopfzeileOrdnen();
})();

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
  const FAMILIEN_ID_KEY = 'planer_familienId';

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

  // Familien-Code (z.B. "K3M9QT") – trennt die Cloud-Daten verschiedener Familien/Haushalte
  // voneinander. Wird von der Shell (index.html) beim ersten Start abgefragt/erzeugt, BEVOR
  // irgendein Modul geladen wird. Fehlt er (z.B. bei direktem Öffnen eines Moduls ohne Shell),
  // wird bewusst NICHT synchronisiert, statt versehentlich in einen ungetrennten globalen
  // Bereich zu schreiben.
  function holeFamilienId() {
    try { return (localStorage.getItem(FAMILIEN_ID_KEY) || '').trim() || null; } catch (e) { return null; }
  }

  // Baut die Firestore-Dokument-Referenz für ein Modul, geschachtelt unter dem Familien-Code.
  // Gibt null zurück, wenn (noch) kein Familien-Code vorhanden ist.
  function docRefFuer(modul) {
    const familienId = holeFamilienId();
    if (!familienId) return null;
    return db.collection('planerFamilien').doc(familienId).collection('daten').doc(modul);
  }

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

  // ---------------------------------------------------------------------------
  // FOTOS NICHT IN DIE CLOUD-DOKUMENTE (Firestore-Größenlimit: 1 MB pro Dokument)
  // Entfernt rekursiv alle Fotos aus den zu synchronisierenden Daten:
  //  - Eigenschaften namens "photo" (z.B. Garten-Tagebuch, Fotoalbum)
  //  - bei Foto-Listen ("fotos") nur die eingebetteten Bilddaten – Einträge mit id, Datum und
  //    ggf. Cloud-Adresse (url, für 👪-Familienfotos in Firebase Storage) bleiben erhalten
  //  - JEDE Eigenschaft, deren Wert ein eingebettetes Bild ist ("data:image/…"),
  //    z.B. Gartenfoto (bgImage) oder Pilz-Logbuch (foto) – auch künftige Felder.
  // Die Fotos bleiben lokal auf dem Gerät erhalten (siehe fotosWiederEinfuegen).
  // ---------------------------------------------------------------------------
  function istEingebettetesBild(wert) { return typeof wert === 'string' && wert.indexOf('data:image') === 0; }
  function entferneFotosTief(objekt) {
    if (Array.isArray(objekt)) return objekt.map(entferneFotosTief);
    if (objekt && typeof objekt === 'object') {
      const kopie = {};
      Object.keys(objekt).forEach((k) => {
        if (k === 'photo') return;
        if (istEingebettetesBild(objekt[k])) return;
        kopie[k] = entferneFotosTief(objekt[k]);
      });
      return kopie;
    }
    return objekt;
  }

  // Fügt lokal vorhandene Fotos wieder in eingehende (foto-lose) Remote-Daten ein,
  // damit ein eingehender Sync von einem anderen Gerät niemals lokal gespeicherte Fotos löscht.
  // Listen-Einträge werden – wenn vorhanden – über ihre id einander zugeordnet, sonst über
  // die Position (wie bisher).
  function fotosWiederEinfuegen(remote, lokal) {
    if (Array.isArray(remote)) {
      if (!Array.isArray(lokal)) return remote;
      const lokalNachId = {};
      lokal.forEach((x) => { if (x && typeof x === 'object' && x.id !== undefined) lokalNachId['id:' + x.id] = x; });
      return remote.map((item, i) => {
        let gegenstueck = lokal[i];
        if (item && typeof item === 'object' && item.id !== undefined) gegenstueck = lokalNachId['id:' + item.id];
        return fotosWiederEinfuegen(item, gegenstueck);
      });
    }
    if (remote && typeof remote === 'object') {
      if (!lokal || typeof lokal !== 'object') return remote;
      const ergebnis = Object.assign({}, remote);
      Object.keys(ergebnis).forEach((k) => { ergebnis[k] = fotosWiederEinfuegen(ergebnis[k], lokal[k]); });
      Object.keys(lokal).forEach((k) => {
        if (ergebnis[k] !== undefined) return;
        if (k === 'photo' || k === 'fotos' || istEingebettetesBild(lokal[k])) ergebnis[k] = lokal[k];
      });
      return ergebnis;
    }
    return remote;
  }

  // Führt beim ersten Abgleich lokale und Cloud-Daten zusammen, statt lokal zu überschreiben.
  // Listen mit Objekten werden über ihre id vereint, Objekte flach zusammengeführt (Cloud gewinnt).
  function werteVereinen(remote, lokal) {
    if (remote === undefined || remote === null) return lokal;
    if (lokal === undefined || lokal === null) return remote;
    if (Array.isArray(remote) && Array.isArray(lokal)) {
      const schluessel = (x) => (x && typeof x === 'object' && x.id !== undefined) ? 'id:' + x.id : 'json:' + JSON.stringify(x);
      const vorhanden = new Set(remote.map(schluessel));
      return remote.concat(lokal.filter(x => !vorhanden.has(schluessel(x))));
    }
    if (typeof remote === 'object' && typeof lokal === 'object' && !Array.isArray(remote) && !Array.isArray(lokal)) {
      return Object.assign({}, lokal, remote);
    }
    return remote;
  }

  // ersterAbgleichVereinen: für Module, die (versehentlich) eine Zeit lang nicht synchronisiert
  // waren – jedes Gerät kann eigene Einträge haben, die beim ersten Abgleich nicht verloren gehen dürfen.
  // ---------------------------------------------------------------------------
  // 3-WEGE-ZUSAMMENFÜHREN (für Listen-Module ohne Fotos)
  // Bisher gewann beim Sync einfach der zuletzt hochgeladene Stand – ändern zwei Geräte
  // gleichzeitig (oder eines offline im Supermarkt), ging ein Eintrag verloren.
  // Jetzt merkt sich jedes Gerät den zuletzt gemeinsamen Stand („Basis“) und führt
  // eigene und fremde Änderungen Eintrag für Eintrag zusammen:
  //  - neu hinzugefügt (hier oder dort) → bleibt
  //  - auf einer Seite gelöscht, auf der anderen unverändert → wird gelöscht
  //  - auf einer Seite geändert → die Änderung gewinnt; auf beiden geändert → die andere Seite gewinnt
  // Listen werden über die id ihrer Einträge zugeordnet, Objekte Feld für Feld.
  // ---------------------------------------------------------------------------
  const ZUSAMMENFUEHREN_MODULE = ['einkauf', 'termine', 'notizblock', 'haushalt', 'vorratskammer', 'geldgeschenke', 'finanzen', 'ausfluege', 'personen', 'kinder'];
  function gleich(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function istObjekt(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function hatIds(arr) { return arr.length > 0 && arr.every(x => istObjekt(x) && x.id !== undefined && x.id !== null); }
  function listenVereinen(b, l, r) {
    const b2 = Array.isArray(b) ? b : [];
    const mitIds = (l.length || r.length) && (l.length === 0 || hatIds(l)) && (r.length === 0 || hatIds(r)) && (b2.length === 0 || hatIds(b2));
    const schl = mitIds ? (x) => 'id:' + x.id : (x) => 'v:' + JSON.stringify(x);
    const B = new Map(b2.map(x => [schl(x), x]));
    const L = new Map(l.map(x => [schl(x), x]));
    const ergebnis = [];
    const erledigt = new Set();
    r.forEach(item => {
      const k = schl(item);
      if (erledigt.has(k)) return;
      erledigt.add(k);
      if (L.has(k)) { ergebnis.push(mitIds ? dreiWege(B.get(k), L.get(k), item) : item); return; }
      // fehlt lokal: hier gelöscht (war in der Basis) – außer die andere Seite hat ihn inzwischen geändert
      if (B.has(k) && gleich(B.get(k), item)) return;
      ergebnis.push(item);
    });
    l.forEach((item, i) => {
      const k = schl(item);
      if (erledigt.has(k)) return;
      erledigt.add(k);
      // fehlt in der Cloud: dort gelöscht (war in der Basis) – außer hier inzwischen geändert
      if (B.has(k) && gleich(B.get(k), item)) return;
      ergebnis.splice(Math.min(i, ergebnis.length), 0, item); // ungefähr an der alten Stelle einfügen
    });
    return ergebnis;
  }
  function dreiWege(b, l, r) {
    if (l === undefined) return r;
    if (r === undefined) return l;
    if (gleich(l, r)) return l;
    if (b !== undefined && gleich(l, b)) return r;
    if (b !== undefined && gleich(r, b)) return l;
    if (Array.isArray(l) && Array.isArray(r)) return listenVereinen(b, l, r);
    if (istObjekt(l) && istObjekt(r)) {
      const bo = istObjekt(b) ? b : {};
      const ergebnis = {};
      new Set(Object.keys(r).concat(Object.keys(l))).forEach(k => {
        const inL = Object.prototype.hasOwnProperty.call(l, k), inR = Object.prototype.hasOwnProperty.call(r, k);
        const inB = Object.prototype.hasOwnProperty.call(bo, k);
        if (inL && inR) { ergebnis[k] = dreiWege(bo[k], l[k], r[k]); return; }
        if (inR) { if (!(inB && gleich(bo[k], r[k]))) ergebnis[k] = r[k]; return; }   // lokal gelöscht?
        if (!(inB && gleich(bo[k], l[k]))) ergebnis[k] = l[k];                        // dort gelöscht?
      });
      return ergebnis;
    }
    return r; // echter Widerspruch bei einem Einzelwert: die andere Seite gewinnt
  }

  function starteSync({ modul, keys, onRemoteChange, transform, vorAnwendungTransform, ersterAbgleichVereinen }) {
    if (!verfuegbar) return { melde: function () {} };
    if (!holeFamilienId()) { setzeStatus('nicht_verfuegbar'); return { melde: function () {} }; }
    initFirebase();
    if (!verfuegbar) return { melde: function () {} };

    let wendeGeradeRemoteAn = false;
    let pushTimer = null;
    let abbestellen = null;

    // Zusammenführen nur für Module ohne Foto-Umwandlung (siehe oben)
    const zusammenfuehren = !transform && ZUSAMMENFUEHREN_MODULE.some(m => modul === m || modul.indexOf(m + '_') === 0);
    let serverVerbunden = false; // erst nach einer echten Server-Antwort hochladen (nicht aus dem Offline-Zwischenspeicher)
    let ausstehend = false;      // lokale Änderungen, die noch nicht hochgeladen werden konnten

    function docRef() { return docRefFuer(modul); }

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

    // Basis = zuletzt gemeinsamer Stand mit der Cloud, je Schlüssel gespeichert (überlebt Neustarts)
    const basisKey = (k) => 'planer_syncBasis:' + modul + '/' + k;
    function basisLesen() {
      const out = {};
      keys.forEach((k) => { try { const raw = localStorage.getItem(basisKey(k)); if (raw !== null) out[k] = JSON.parse(raw); } catch (e) {} });
      return out;
    }
    function basisSetzen(werte) {
      if (!zusammenfuehren || !werte) return;
      keys.forEach((k) => {
        if (!Object.prototype.hasOwnProperty.call(werte, k) || werte[k] === null || werte[k] === undefined) return;
        try { localStorage.setItem(basisKey(k), JSON.stringify(werte[k])); } catch (e) {}
      });
    }
    function lokalGeaendert() {
      if (!zusammenfuehren) return false;
      const lokal = localSnapshot(), basis = basisLesen();
      return keys.some(k => Object.prototype.hasOwnProperty.call(lokal, k) && !gleich(lokal[k], basis[k]));
    }

    const KEY_VEREINT = 'planer_syncVereint_' + modul + ':' + keys.slice().sort().join(',');
    function vereinenNoetig() {
      try { return !!ersterAbgleichVereinen && !localStorage.getItem(KEY_VEREINT); } catch (e) { return false; }
    }
    function vereinenErledigt() { try { localStorage.setItem(KEY_VEREINT, '1'); } catch (e) {} }

    function remoteAnwenden(werte, istErstmaligerAbgleich) {
      if (!werte) return;
      let danachHochladen = false;
      const cloudStand = werte;
      if (vereinenNoetig()) {
        const lokal = localSnapshot();
        werte = Object.assign({}, werte);
        keys.forEach((k) => { if (Object.prototype.hasOwnProperty.call(lokal, k)) werte[k] = werteVereinen(werte[k], lokal[k]); });
        vereinenErledigt();
        danachHochladen = true;
      } else if (zusammenfuehren) {
        const lokal = localSnapshot(), basis = basisLesen();
        werte = Object.assign({}, werte);
        keys.forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(werte, k) || werte[k] === null || werte[k] === undefined) return;
          if (!Object.prototype.hasOwnProperty.call(lokal, k)) return;
          // Ohne bekannte Basis (erster Abgleich nach dem Update) gilt wie bisher der Cloud-Stand –
          // so tauchen auf einem lange nicht geöffneten Gerät keine längst erledigten Einträge wieder auf.
          if (!Object.prototype.hasOwnProperty.call(basis, k)) return;
          werte[k] = dreiWege(basis[k], lokal[k], werte[k]);
          if (!gleich(werte[k], cloudStand[k])) danachHochladen = true;
        });
      }
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
      basisSetzen(cloudStand);
      if (onRemoteChange) { try { onRemoteChange(istErstmaligerAbgleich); } catch (e) { console.warn('PlanerSync onRemoteChange Fehler', e); } }
      if (danachHochladen) { ausstehend = true; setTimeout(push, 500); } // vereinten Stand für alle Geräte hochladen
    }

    function push() {
      // Listen-Module: offline oder ohne bestätigte Server-Verbindung NICHT hochladen. Firestore würde den
      // Schreibvorgang sonst zwischenspeichern und später blind über neuere Änderungen anderer legen.
      // Stattdessen wird beim nächsten Server-Kontakt erst zusammengeführt, dann hochgeladen.
      if (zusammenfuehren && (!navigator.onLine || !serverVerbunden)) { ausstehend = true; setzeStatus('verbindet'); return; }
      if (zusammenfuehren) { pushZusammenfuehren(); return; }
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

    // Hochladen als Transaktion: aktuellen Cloud-Stand lesen, mit lokalen Änderungen zusammenführen,
    // schreiben – alles in einem Schritt. Laden zwei Geräte gleichzeitig hoch, wiederholt Firestore
    // die Transaktion automatisch mit dem neuen Stand, sodass nichts verloren geht.
    let pushLaeuft = false, pushNochmal = false;
    function pushZusammenfuehren() {
      if (pushLaeuft) { pushNochmal = true; return; }
      pushLaeuft = true;
      const lokalStart = localSnapshot();
      authReady.then(() => db.runTransaction((tx) => {
        const ref = docRef();
        return tx.get(ref).then((snap) => {
          const cloud = (snap.exists && snap.data() && snap.data().werte) || {};
          const basis = basisLesen();
          const ergebnis = {};
          keys.forEach((k) => {
            if (!Object.prototype.hasOwnProperty.call(lokalStart, k)) return;
            const inCloud = Object.prototype.hasOwnProperty.call(cloud, k) && cloud[k] !== null && cloud[k] !== undefined;
            ergebnis[k] = (inCloud && Object.prototype.hasOwnProperty.call(basis, k)) ? dreiWege(basis[k], lokalStart[k], cloud[k]) : lokalStart[k];
          });
          tx.set(ref, {
            werte: ergebnis,
            _aktualisiertVon: geraeteId,
            _aktualisiertAm: firebase.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return ergebnis;
        });
      })).then((ergebnis) => {
        ausstehend = false;
        basisSetzen(ergebnis);
        setzeStatus('online');
        // Brachte die Cloud Neues mit, lokal übernehmen – aber nur, wenn hier inzwischen niemand weitergetippt hat
        if (!gleich(localSnapshot(), lokalStart)) { pushNochmal = true; }
        else if (!gleich(ergebnis, lokalStart)) {
          wendeGeradeRemoteAn = true;
          keys.forEach((k) => { if (Object.prototype.hasOwnProperty.call(ergebnis, k)) { try { localStorage.setItem(k, JSON.stringify(ergebnis[k])); } catch (e) {} } });
          wendeGeradeRemoteAn = false;
          if (onRemoteChange) { try { onRemoteChange(false); } catch (e) { console.warn('PlanerSync onRemoteChange Fehler', e); } }
        }
      }).catch((err) => {
        ausstehend = true; // beim nächsten Server-Kontakt erneut versuchen
        console.warn('PlanerSync: Zusammenführen/Hochladen fehlgeschlagen für', modul, err);
        setzeStatus(navigator.onLine ? 'fehler' : 'verbindet');
      }).then(() => {
        pushLaeuft = false;
        if (pushNochmal) { pushNochmal = false; setTimeout(push, 300); }
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
      abbestellen = docRef().onSnapshot({ includeMetadataChanges: zusammenfuehren }, (snap) => {
        const vomServer = !(snap.metadata && snap.metadata.fromCache);
        const geradeVerbunden = vomServer && !serverVerbunden;
        if (vomServer) serverVerbunden = true;
        if (vomServer || !zusammenfuehren) setzeStatus('online');
        if (!snap.exists) { if (vereinenNoetig()) vereinenErledigt(); if (!zusammenfuehren || vomServer) push(); return; }
        const data = snap.data();
        if (!data) return;
        if (data._aktualisiertVon === geraeteId) {
          // Letzte Änderung kam von diesem Gerät: beim ersten Abgleich trotzdem einmal alles hochladen
          if (vereinenNoetig()) { vereinenErledigt(); push(); }
          else if (zusammenfuehren && vomServer && !(snap.metadata && snap.metadata.hasPendingWrites)) {
            // bestätigter eigener Stand = neue Basis; liegen lokal noch Änderungen (z.B. offline gemacht oder
            // von einem anderen Bereich eingetragen), jetzt hochladen
            if (letzterVerarbeiteterStempel === null) { letzterVerarbeiteterStempel = 'eigen'; if (!lokalGeaendert() && data.werte) basisSetzen(data.werte); }
            if (ausstehend || lokalGeaendert()) push();
          }
          return; // eigene Änderung, nicht erneut anwenden
        }
        let stempelZeit = '';
        try { stempelZeit = data._aktualisiertAm && data._aktualisiertAm.toMillis ? String(data._aktualisiertAm.toMillis()) : ''; } catch (e) {}
        const stempel = data._aktualisiertVon + '|' + stempelZeit;
        // Wieder verbunden mit offenen lokalen Änderungen: auch bei gleichem Stand zusammenführen + hochladen
        const nachholen = zusammenfuehren && vomServer && (ausstehend || (geradeVerbunden && lokalGeaendert()));
        if (stempel === letzterVerarbeiteterStempel && !nachholen) return; // gleicher Stand wie zuvor, keine echte neue Änderung
        if (zusammenfuehren && !vomServer && letzterVerarbeiteterStempel !== null) return; // Zwischenspeicher-Echo, Server-Antwort abwarten
        const istErstmaligerAbgleich = letzterVerarbeiteterStempel === null;
        letzterVerarbeiteterStempel = stempel;
        remoteAnwenden(data.werte, istErstmaligerAbgleich);
        if (nachholen && !ausstehend && lokalGeaendert()) push();
      }, (err) => {
        console.warn('PlanerSync: Verbindung fehlgeschlagen für', modul, err);
        setzeStatus('fehler');
      });
    });
    // Zurück online: ausstehende Änderungen beim nächsten Server-Kontakt nachholen
    if (zusammenfuehren) {
      window.addEventListener('offline', () => { serverVerbunden = false; });
      window.addEventListener('online', () => { if (ausstehend || lokalGeaendert()) setTimeout(push, 1500); });
    }

    function melde() {
      if (wendeGeradeRemoteAn) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 1200);
    }

    return { melde: melde, entferneFotosTief: entferneFotosTief };
  }

  // Für Foto-Speicher (fotospeicher.js): wartet, bis Firebase + anonyme Anmeldung bereit sind
  function authBereit() {
    if (!verfuegbar || !holeFamilienId()) return Promise.reject(new Error('Cloud nicht verfügbar'));
    initFirebase();
    if (!verfuegbar || !authReady) return Promise.reject(new Error('Cloud nicht verfügbar'));
    return authReady;
  }

  function pushWerte(modul, keys, transform) {
    if (!verfuegbar) return Promise.resolve();
    if (!holeFamilienId()) return Promise.resolve();
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
      const ref = docRefFuer(modul);
      if (!ref) return;
      return ref.set({
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
    _dreiWege: dreiWege,
    pushWerte: pushWerte,
    authBereit: authBereit,
    status: function () { try { return localStorage.getItem(STATUS_KEY) || 'unbekannt'; } catch (e) { return 'unbekannt'; } },
    geraeteId: geraeteId,
    familienId: holeFamilienId,
    setzeFamilienId: function (id) { try { localStorage.setItem(FAMILIEN_ID_KEY, String(id).trim().toUpperCase()); } catch (e) {} },
  };
})();
