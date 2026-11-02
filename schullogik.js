/* 🎒 Schul-Logik – Stundenplan, „Was muss mit?“ und nächster Schultag.
 * Gemeinsam für Kinderecke und Startseite (window.SchulLogik).
 * Daten (localStorage „kinder_schule“, synchronisiert mit der Kinderecke):
 *   { kindId: { plan: { 1: 'Deutsch, Mathe, Sport', … 5: '…' }, mitbringen: [{ fach: 'Sport', text: 'Turnbeutel 🩳' }],
 *               todos: [{ id, text, typ: 'ha' | 'brief' | 'sonst', bis: 'JJJJ-MM-TT', erledigt }] } } */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.SchulLogik = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const p2 = n => String(n).padStart(2, '0');
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function aus(s) { const [y, m, t] = String(s).split('-').map(Number); return new Date(y, m - 1, t); }
  function plus(s, n) { const d = aus(s); d.setDate(d.getDate() + n); return iso(d); }
  function lies(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  // Ferien und Feiertage kommen aus dem Zwischenspeicher von Termine (Baden-Württemberg)
  function frei(s) {
    const d = aus(s), wt = d.getDay();
    if (wt === 0 || wt === 6) return 'Wochenende';
    const j = s.slice(0, 4);
    const ft = lies('termine_feiertage_BW_' + j) || {};
    if (ft[s]) return ft[s];
    const fe = (lies('termine_schulferien_BW_' + j) || []).concat(lies('termine_schulferien_BW_' + (Number(j) - 1)) || []).find(f => f && f.von <= s && f.bis >= s);
    return fe ? fe.name || 'Ferien' : '';
  }
  function naechsterSchultag(abIso, maxTage) {
    for (let i = 0; i < (maxTage || 21); i++) { const s = plus(abIso, i); if (!frei(s)) return s; }
    return null;
  }
  function faecherAm(daten, s) {
    if (!daten || !daten.plan) return [];
    const wt = aus(s).getDay();
    return String(daten.plan[wt] || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  }
  function mitbringenAm(daten, s) {
    const f = faecherAm(daten, s).map(x => x.toLowerCase());
    return (daten && daten.mitbringen || []).filter(m => m && m.fach && m.text && f.some(x => x.includes(String(m.fach).toLowerCase())));
  }
  function offeneTodos(daten, bisIso) {
    return (daten && daten.todos || []).filter(t => t && !t.erledigt && (!bisIso || !t.bis || t.bis <= bisIso)).sort((a, b) => (a.bis || '9999').localeCompare(b.bis || '9999'));
  }
  // Was steht für den nächsten Schultag an (ab heute Nachmittag: morgen)? → { datum, wann, faecher, mitbringen, todos }
  function vorschau(daten, jetzt) {
    jetzt = jetzt || new Date();
    if (!daten || !daten.plan) return null;
    const heute = iso(jetzt);
    const ab = jetzt.getHours() >= 13 ? plus(heute, 1) : heute;
    const tag = naechsterSchultag(ab, 4);
    if (!tag) return null;
    const faecher = faecherAm(daten, tag);
    if (!faecher.length) return null;
    const diff = Math.round((aus(tag) - aus(heute)) / 864e5);
    const wann = diff === 0 ? 'heute' : diff === 1 ? 'morgen' : 'am ' + ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][aus(tag).getDay()];
    return { datum: tag, wann, faecher, mitbringen: mitbringenAm(daten, tag), todos: offeneTodos(daten, tag) };
  }
  const MITBRINGEN_VORSCHLAEGE = [['Sport', 'Turnbeutel 🩳'], ['Schwimmen', 'Badesachen 🩱'], ['Kunst', 'Malkasten 🎨'], ['Musik', 'Flöte 🎵'], ['Werken', 'Werkzeug 🔨'], ['Religion', 'Ordner 📒'], ['Englisch', 'Englischbuch 📘']];
  return { iso, plus, frei, naechsterSchultag, faecherAm, mitbringenAm, offeneTodos, vorschau, MITBRINGEN_VORSCHLAEGE };
});
