/* 👶 Betreuungs-Logik – an welchen Tagen braucht ein Kind Betreuung, und wer übernimmt?
 * Gemeinsam für Termine und Startseite (window.BetreuungLogik).
 * Daten (localStorage „termine_betreuung“, synchronisiert mit Termine):
 *   { zuweisung: { 'JJJJ-MM-TT': { wer, notiz } }, extra: [{ id, von, bis, grund }], helfer: ['Oma', 'Opa'], schulferien: false }
 * Bedarfstage: Termine wie „🏫 Kita zu: Teamtag“, „Schließtag“, „Brückentag“ (oder ev.betreuung = true),
 * eigene Einträge (krank, Streik) und auf Wunsch die Schulferien – jeweils ohne Wochenenden und Feiertage. */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.BetreuungLogik = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MUSTER = /kita zu|kita geschlossen|kindergarten zu|schließtag|schliesstag|schließungstag|schule zu|schulfrei|brückentag|teamtag|betreuung fehlt|hort zu|kita-schließ/i;
  const p2 = n => String(n).padStart(2, '0');
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function aus(s) { const [y, m, t] = String(s).split('-').map(Number); return new Date(y, m - 1, t); }
  function plus(s, n) { const d = aus(s); d.setDate(d.getDate() + n); return iso(d); }
  function lies(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function standard(c) { return Object.assign({ zuweisung: {}, extra: [], helfer: ['Oma', 'Opa'], schulferien: false }, c || {}); }
  function feiertag(s) { return (lies('termine_feiertage_BW_' + s.slice(0, 4)) || {})[s] || ''; }
  function ferien(s) { const j = Number(s.slice(0, 4)); const f = (lies('termine_schulferien_BW_' + j) || []).concat(lies('termine_schulferien_BW_' + (j - 1)) || []).find(x => x && x.von <= s && x.bis >= s); return f ? f.name || 'Schulferien' : ''; }
  function werktag(s) { const wt = aus(s).getDay(); return wt !== 0 && wt !== 6 && !feiertag(s); }
  function grundAus(titel) { return String(titel || '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').replace(/^kita zu:\s*/i, '').trim() || 'Schließtag'; }

  // → [{ datum, grund, quelle: 'termin' | 'extra' | 'ferien', wer, notiz }]
  function tage(events, cfg, vonIso, bisIso) {
    cfg = standard(cfg);
    const TL = (typeof TerminLogik !== 'undefined' && TerminLogik) || (typeof window !== 'undefined' && window.TerminLogik);
    const m = {};
    const add = (d, grund, quelle) => { if (d < vonIso || d > bisIso || !werktag(d) || m[d]) return; m[d] = { datum: d, grund, quelle }; };
    (events || []).forEach(ev => {
      if (!ev || ev.abfuhr || !(ev.betreuung || MUSTER.test(ev.title || ''))) return;
      const dauer = TL ? TL.dauerTage(ev) : 0;
      const starts = TL ? TL.vorkommen(ev, plus(vonIso, -dauer), bisIso) : [ev.date];
      starts.forEach(s => { for (let k = 0; k <= dauer; k++) add(plus(s, k), grundAus(ev.title), 'termin'); });
    });
    (cfg.extra || []).forEach(x => { if (!x || !x.von) return; for (let d = x.von, i = 0; d <= (x.bis || x.von) && i < 60; d = plus(d, 1), i++) add(d, x.grund || 'Ohne Betreuung', 'extra'); });
    if (cfg.schulferien) for (let d = vonIso, i = 0; d <= bisIso && i < 400; d = plus(d, 1), i++) { const f = ferien(d); if (f) add(d, f, 'ferien'); }
    return Object.keys(m).sort().map(d => Object.assign(m[d], (cfg.zuweisung || {})[d] || {}));
  }
  function offeneBald(events, cfg, heuteIso, tageVoraus) {
    return tage(events, cfg, heuteIso, plus(heuteIso, tageVoraus || 21)).filter(t => !t.wer);
  }
  function statistik(events, cfg, jahr) {
    const z = {};
    tage(events, cfg, jahr + '-01-01', jahr + '-12-31').forEach(t => { const k = t.wer || '⚠ offen'; z[k] = (z[k] || 0) + 1; });
    return z;
  }
  return { MUSTER, standard, tage, offeneBald, statistik, werktag, plus, iso };
});
