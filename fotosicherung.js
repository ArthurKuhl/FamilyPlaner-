// ============================================================================
// FotoSicherung – automatische, verschlüsselte Sicherung der „🔒 Nur ich“-Fotos
// ============================================================================
// Private Fotos liegen nur auf dem Gerät (localStorage). Geht das Handy verloren,
// wären sie weg. Diese Datei sichert sie automatisch in Firebase Storage – aber
// vorher mit einem eigenen Passwort verschlüsselt (AES-GCM, Schlüssel per PBKDF2).
// Ohne das Passwort sind die Dateien nur Zeichensalat – auch für die Familie.
//
// Ablage:  planerFamilien/{Familien-Code}/sicherung/{Ordner}/{Bild-Prüfsumme}.bin
//          planerFamilien/{Familien-Code}/sicherung/{Ordner}/index-{Gerät}.bin
// {Ordner} wird aus Passwort + Familien-Code berechnet: Wer auf einem neuen Gerät
// dasselbe Passwort eingibt, findet seine Sicherung wieder – ohne Konto.
//
// Was gesichert wird: eingebettete Bilder (data:image…) in Schlüsseln, die NICHT
// vollständig synchronisiert werden (Garten, Kochen und rein lokale Daten), sofern
// das Foto keine Cloud-Adresse (url/fotoUrl) hat – also genau die „Nur ich“-Fotos.
// Wird von index.html geladen (braucht firebase-storage-compat.js und sync.js).
// ============================================================================
window.FotoSicherung = (function () {
  'use strict';
  const KEY = 'planer_fotoSicherung'; // { aktiv, ordner, schluessel(base64), hochgeladen:[hash], letzte, anzahl, fehler }
  const SALZ = 'familienplaner-fotosicherung-v1|';
  const ITERATIONEN = 250000;
  let laeuft = false;
  let ausgeschlosseneKeys = () => [];

  // ---------- kleine Helfer ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  async function sha256(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
  function zustand() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function zustandSetzen(z) { try { localStorage.setItem(KEY, JSON.stringify(z)); } catch (e) {} }
  function familienId() { return window.PlanerSync && window.PlanerSync.familienId && window.PlanerSync.familienId(); }
  function geraetId() { try { return (localStorage.getItem('planer_geraeteId') || 'geraet').replace(/[^\w-]/g, '_'); } catch (e) { return 'geraet'; } }
  function verfuegbar() {
    try { return typeof firebase !== 'undefined' && typeof firebase.storage === 'function' && !!familienId() && !!(window.crypto && crypto.subtle); }
    catch (e) { return false; }
  }

  // ---------- Schlüssel ----------
  async function schluesselAusPasswort(passwort) {
    const fid = familienId();
    const basis = await crypto.subtle.importKey('raw', enc.encode(passwort), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(SALZ + fid), iterations: ITERATIONEN, hash: 'SHA-256' },
      basis, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const ordner = (await sha256('ordner|' + fid + '|' + passwort)).slice(0, 24);
    return { key, ordner, roh: b64(await crypto.subtle.exportKey('raw', key)) };
  }
  async function gespeicherterSchluessel() {
    const z = zustand();
    if (!z.schluessel) return null;
    return crypto.subtle.importKey('raw', unb64(z.schluessel), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  async function verschluesseln(key, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const daten = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
    const aus = new Uint8Array(12 + daten.length); aus.set(iv); aus.set(daten, 12);
    return aus;
  }
  async function entschluesseln(key, bytes) {
    const b = new Uint8Array(bytes);
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)));
  }

  // ---------- Storage ----------
  function ref(ordner, datei) { return firebase.storage().ref('planerFamilien/' + familienId() + '/sicherung/' + ordner + '/' + datei); }
  async function hoch(ordner, datei, bytes) {
    await window.PlanerSync.authBereit();
    // Die Storage-Regeln lassen nur image/* zu – die verschlüsselten Daten laufen deshalb unter diesem Typ.
    await ref(ordner, datei).put(bytes, { contentType: 'image/x-familienplaner-verschluesselt', cacheControl: 'private,max-age=0' });
  }
  async function runter(ordner, datei) {
    await window.PlanerSync.authBereit();
    const url = await ref(ordner, datei).getDownloadURL();
    const antwort = await fetch(url, { cache: 'no-store' });
    if (!antwort.ok) throw new Error('Download fehlgeschlagen (' + antwort.status + ')');
    return antwort.arrayBuffer();
  }

  // ---------- Fotos finden ----------
  // Ein Pfad beschreibt, wo das Bild steckt: [Schlüssel, Schritt, Schritt, …, Feldname].
  // Listen-Einträge werden – wenn sie eine id haben – über die id adressiert, sonst über die Position.
  function privateFotosFinden() {
    const aus = new Set(ausgeschlosseneKeys());
    const funde = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || aus.has(k) || k === KEY || k.indexOf('planer_syncBasis') === 0) continue;
      const roh = localStorage.getItem(k);
      if (!roh || roh.indexOf('data:image') === -1) continue;
      let wert; try { wert = JSON.parse(roh); } catch (e) { continue; }
      (function laufe(o, pfad) {
        if (Array.isArray(o)) { o.forEach((x, idx) => laufe(x, pfad.concat([x && typeof x === 'object' && x.id !== undefined ? 'id:' + x.id : 'i:' + idx]))); return; }
        if (!o || typeof o !== 'object') return;
        const inCloud = !!(o.url || o.fotoUrl);
        Object.keys(o).forEach(f => {
          const v = o[f];
          if (typeof v === 'string' && v.indexOf('data:image') === 0) { if (!inCloud) funde.push({ pfad: pfad.concat([f]), data: v }); }
          else if (v && typeof v === 'object') laufe(v, pfad.concat(['o:' + f]));
        });
      })(wert, [k]);
    }
    return funde;
  }
  function elternObjekt(wurzel, schritte) {
    let o = wurzel;
    for (const s of schritte) {
      if (o === null || typeof o !== 'object') return null;
      if (s.indexOf('id:') === 0) { const id = s.slice(3); o = Array.isArray(o) ? o.find(x => x && String(x.id) === id) : null; }
      else if (s.indexOf('i:') === 0) o = Array.isArray(o) ? o[Number(s.slice(2))] : null;
      else if (s.indexOf('o:') === 0) o = o[s.slice(2)];
      else return null;
    }
    return o && typeof o === 'object' ? o : null;
  }

  // ---------- Sichern ----------
  async function sichern({ still } = {}) {
    const z = zustand();
    if (laeuft || !z.aktiv || !z.ordner || !verfuegbar() || !navigator.onLine) return { uebersprungen: true };
    laeuft = true;
    try {
      const key = await gespeicherterSchluessel();
      const funde = privateFotosFinden();
      const bekannt = new Set(z.hochgeladen || []);
      const eintraege = [];
      let neu = 0;
      for (const f of funde) {
        const hash = (await sha256(f.data)).slice(0, 32);
        eintraege.push({ pfad: f.pfad, hash });
        if (bekannt.has(hash)) continue;
        await hoch(z.ordner, hash + '.bin', await verschluesseln(key, f.data));
        bekannt.add(hash); neu++;
        z.hochgeladen = Array.from(bekannt); zustandSetzen(z); // Fortschritt merken, falls die App zwischendurch geschlossen wird
      }
      const indexText = JSON.stringify({ v: 1, geraet: geraetId(), datum: new Date().toISOString(), eintraege });
      const indexHash = await sha256(indexText.replace(/"datum":"[^"]*",/, ''));
      if (indexHash !== z.indexHash) await hoch(z.ordner, 'index-' + geraetId() + '.bin', await verschluesseln(key, indexText));
      // Bilder, die auf diesem Gerät nicht mehr vorkommen (Foto gelöscht/geteilt), wieder entfernen
      const aktuell = new Set(eintraege.map(e => e.hash));
      const weg = Array.from(bekannt).filter(h => !aktuell.has(h));
      for (const h of weg) { try { await window.PlanerSync.authBereit(); await ref(z.ordner, h + '.bin').delete(); } catch (e) {} bekannt.delete(h); }
      Object.assign(z, { hochgeladen: Array.from(bekannt), indexHash, letzte: new Date().toISOString(), anzahl: aktuell.size, fehler: '' });
      zustandSetzen(z);
      return { neu, anzahl: aktuell.size };
    } catch (e) {
      console.warn('FotoSicherung', e);
      z.fehler = (e && (e.code || e.message)) || String(e); zustandSetzen(z);
      if (!still) throw e;
      return { fehler: z.fehler };
    } finally { laeuft = false; }
  }

  // ---------- Einschalten / Wiederherstellen ----------
  async function einschalten(passwort) {
    if (!verfuegbar()) throw new Error('Cloud nicht verfügbar – Familien-Code und Internet nötig.');
    const s = await schluesselAusPasswort(passwort);
    const alt = zustand();
    zustandSetzen({ aktiv: true, ordner: s.ordner, schluessel: s.roh, hochgeladen: alt.ordner === s.ordner ? (alt.hochgeladen || []) : [] });
    return sichern();
  }
  function ausschalten() { const z = zustand(); zustandSetzen({ aktiv: false, letzte: z.letzte }); }

  // Holt alle gesicherten Fotos (aller Geräte mit diesem Passwort) zurück und setzt sie dort ein,
  // wo auf diesem Gerät das Foto fehlt. Gibt { eingesetzt, vorhanden, ohneZiel } zurück.
  async function wiederherstellen(passwort) {
    if (!verfuegbar()) throw new Error('Cloud nicht verfügbar – Familien-Code und Internet nötig.');
    const s = await schluesselAusPasswort(passwort);
    await window.PlanerSync.authBereit();
    const liste = await firebase.storage().ref('planerFamilien/' + familienId() + '/sicherung/' + s.ordner).listAll();
    const indizes = liste.items.filter(r => /^index-.*\.bin$/.test(r.name));
    if (!indizes.length) return { keineSicherung: true };
    const eintraege = [];
    for (const r of indizes) {
      try { eintraege.push(...JSON.parse(await entschluesseln(s.key, await runter(s.ordner, r.name))).eintraege); }
      catch (e) { console.warn('Index nicht lesbar', r.name, e); }
    }
    const cache = {}; const geaendert = {};
    const daten = (k) => { if (!(k in cache)) { try { cache[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { cache[k] = null; } } return cache[k]; };
    const bilder = {};
    let eingesetzt = 0, vorhanden = 0, ohneZiel = 0;
    for (const e of eintraege) {
      const [k, ...rest] = e.pfad; const feld = rest.pop();
      const eltern = elternObjekt(daten(k), rest);
      if (!eltern) { ohneZiel++; continue; }
      if (typeof eltern[feld] === 'string' && eltern[feld].indexOf('data:image') === 0) { vorhanden++; continue; }
      if (eltern.url || eltern.fotoUrl) { vorhanden++; continue; } // inzwischen mit der Familie geteilt
      if (!bilder[e.hash]) bilder[e.hash] = await entschluesseln(s.key, await runter(s.ordner, e.hash + '.bin'));
      eltern[feld] = bilder[e.hash];
      geaendert[k] = true; eingesetzt++;
    }
    const zuGross = [];
    Object.keys(geaendert).forEach(k => { try { localStorage.setItem(k, JSON.stringify(cache[k])); } catch (err) { zuGross.push(k); } });
    // Danach gleich weiter automatisch sichern – mit demselben Passwort
    const alt = zustand();
    zustandSetzen({ aktiv: true, ordner: s.ordner, schluessel: s.roh, hochgeladen: alt.ordner === s.ordner ? (alt.hochgeladen || []) : [] });
    return { eingesetzt, vorhanden, ohneZiel, speicherVoll: zuGross.length > 0 };
  }

  // ---------- Automatik ----------
  function automatikStarten(ausschluss) {
    if (typeof ausschluss === 'function') ausgeschlosseneKeys = ausschluss;
    const versuch = () => { if (!document.hidden) sichern({ still: true }); };
    setTimeout(versuch, 25000);                      // kurz nach dem Start, wenn alles geladen ist
    setInterval(versuch, 30 * 60 * 1000);            // und alle 30 Minuten
    document.addEventListener('visibilitychange', () => { if (document.hidden) sichern({ still: true }); }); // beim Wegwechseln
    window.addEventListener('online', () => setTimeout(versuch, 5000));
  }

  return { verfuegbar, zustand, einschalten, ausschalten, sichern, wiederherstellen, automatikStarten, _finden: privateFotosFinden, _eltern: elternObjekt };
})();
