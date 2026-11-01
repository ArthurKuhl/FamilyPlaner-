/* 🗑️ Abfall-Logik – .ics einlesen, Tonnen erkennen, Abfuhrtermine als Termine erzeugen.
 * Gemeinsam für Termine, Startseite und Haushalt (window.AbfallLogik).
 *
 * Einstellungen (localStorage „termine_abfall“, synchronisiert mit Termine):
 *   { termine: [{ d: 'JJJJ-MM-TT', t: 'gelb' }], namen: { typ: 'Anzeigename' }, tonnen: { typ: false },
 *     erinnern: 'vorabend' | 'morgen' | 'aus', uhrzeit: '18:00', wer: 'familie', kalender: 'klein' | 'aus',
 *     haushalt: false, raus: { 'JJJJ-MM-TT': { von, zeit } }, quelle: { datei, am, von, bis, anzahl } }
 * Erzeugte Termine: id „t_abf_JJJJ-MM-TT“, ganztägig, mit Feld abfuhr: ['gelb', 'papier'] */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.AbfallLogik = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TONNEN = [
    { id: 'baum', re: /weihnachtsb|christb|tannenb/i, em: '🎄', name: 'Weihnachtsbaum', farbe: '#2e8b3e' },
    { id: 'sperr', re: /sperr/i, em: '🛋️', name: 'Sperrmüll', farbe: '#7d6339' },
    { id: 'schadstoff', re: /schadstoff|problemstoff|sondermüll/i, em: '☣️', name: 'Problemstoffe', farbe: '#b3261e', nichtRaus: true },
    { id: 'gruen', re: /grünschnitt|grüngut|gartenabf|baum- und strauch|häcksel/i, em: '🌿', name: 'Grüngut', farbe: '#5a8f3a' },
    { id: 'gelb', re: /gelb|wertstoff|leichtverpack|\blvp\b|verpackung/i, em: '🟡', name: 'Gelbe Tonne', farbe: '#e0c419' },
    { id: 'papier', re: /papier|pappe|karton|blaue/i, em: '🔵', name: 'Papier', farbe: '#1f6fd1' },
    { id: 'bio', re: /bio|braune|kompost/i, em: '🟤', name: 'Bio', farbe: '#8b4a1f' },
    { id: 'glas', re: /glas/i, em: '🟢', name: 'Glas', farbe: '#2f9e6b' },
    { id: 'rest', re: /rest|hausmüll|graue|schwarze/i, em: '⚫', name: 'Restmüll', farbe: '#555555' },
  ];
  function tonneErkennen(text) {
    const t = String(text || '');
    const x = TONNEN.find(k => k.re.test(t));
    return x ? x.id : null;
  }
  function tonneInfo(id, cfg) {
    const x = TONNEN.find(k => k.id === id);
    if (x) return x;
    const name = (cfg && cfg.namen && cfg.namen[id]) || String(id).replace(/^x:/, '');
    return { id, em: '🗑️', name, farbe: '#7d6339', nichtRaus: true };
  }
  function typFuer(summary) {
    const t = tonneErkennen(summary);
    if (t) return t;
    const s = String(summary || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return 'x:' + (s || 'Abfuhr');
  }

  // ---------- .ics lesen ----------
  function entfalten(text) { return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, ''); }
  function textWert(v) { return String(v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim(); }
  function datumAus(v) {
    // 20261103 | 20261103T060000 | 20261103T050000Z
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(String(v || '').trim());
    if (!m) return null;
    if (!m[4]) return { datum: m[1] + '-' + m[2] + '-' + m[3], zeit: '' };
    let d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
    if (m[7]) d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0)));
    const p = n => String(n).padStart(2, '0');
    return { datum: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), zeit: p(d.getHours()) + ':' + p(d.getMinutes()) };
  }
  function plusTage(iso, n) {
    const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1, d + n);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function rruleLesen(v) {
    const r = {}; String(v || '').split(';').forEach(t => { const [k, w] = t.split('='); if (k) r[k.toUpperCase()] = w; });
    return r;
  }
  // → [{ uid, summary, description, location, datum, zeit, endDatum, endZeit, allDay, rrule, exdates }]
  function icsLesen(text) {
    const zeilen = entfalten(text).split('\n');
    const liste = []; let ev = null;
    zeilen.forEach(z => {
      if (/^BEGIN:VEVENT/i.test(z)) { ev = { exdates: [] }; return; }
      if (/^END:VEVENT/i.test(z)) { if (ev && ev.datum) liste.push(ev); ev = null; return; }
      if (!ev) return;
      const i = z.indexOf(':'); if (i < 0) return;
      const kopf = z.slice(0, i), wert = z.slice(i + 1);
      const name = kopf.split(';')[0].toUpperCase();
      if (name === 'SUMMARY') ev.summary = textWert(wert);
      else if (name === 'DESCRIPTION') ev.description = textWert(wert);
      else if (name === 'LOCATION') ev.location = textWert(wert);
      else if (name === 'UID') ev.uid = wert.trim();
      else if (name === 'RRULE') ev.rrule = rruleLesen(wert);
      else if (name === 'EXDATE') wert.split(',').forEach(x => { const d = datumAus(x); if (d) ev.exdates.push(d.datum); });
      else if (name === 'DTSTART') { const d = datumAus(wert); if (d) { ev.datum = d.datum; ev.zeit = d.zeit; ev.allDay = !d.zeit || /VALUE=DATE(?!-)/i.test(kopf); } }
      else if (name === 'DTEND') { const d = datumAus(wert); if (d) { ev.endDatum = d.datum; ev.endZeit = d.zeit; } }
    });
    return liste;
  }
  // Wiederholungen (einfach) ausrollen – für Abfallkalender, die mit RRULE arbeiten
  function ausrollen(ev, bisIso) {
    if (!ev.rrule || !ev.rrule.FREQ) return [ev.datum];
    const freq = ev.rrule.FREQ, n = Math.max(1, Number(ev.rrule.INTERVAL) || 1);
    const bis = ev.rrule.UNTIL ? (datumAus(ev.rrule.UNTIL) || {}).datum || bisIso : bisIso;
    const max = Number(ev.rrule.COUNT) || 400;
    const res = []; let d = ev.datum;
    for (let i = 0; i < max && d <= bis && res.length < 400; i++) {
      if (!ev.exdates.includes(d)) res.push(d);
      if (freq === 'DAILY') d = plusTage(d, n);
      else if (freq === 'WEEKLY') d = plusTage(d, 7 * n);
      else if (freq === 'MONTHLY') { const [y, m, t] = d.split('-').map(Number); const x = new Date(y, m - 1 + n, t); d = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
      else if (freq === 'YEARLY') d = (Number(d.slice(0, 4)) + n) + d.slice(4);
      else break;
    }
    return res;
  }

  // Ist das ein Abfallkalender? → { abfall: bool, termine: [{ d, t }], namen, typen: { t: anzahl } }
  function abfuhrAusIcs(text) {
    const evs = icsLesen(text);
    const heute = new Date(); const bisIso = (heute.getFullYear() + 2) + '-12-31';
    const termine = [], namen = {}, typen = {};
    let erkannt = 0;
    evs.forEach(ev => {
      const quelle = (ev.summary || '') + ' ' + (ev.description || '');
      const t = tonneErkennen(ev.summary) || tonneErkennen(quelle) || typFuer(ev.summary);
      if (!t.startsWith('x:')) erkannt++;
      else namen[t] = t.slice(2);
      ausrollen(ev, bisIso).forEach(d => {
        if (termine.some(x => x.d === d && x.t === t)) return;
        termine.push({ d, t }); typen[t] = (typen[t] || 0) + 1;
      });
    });
    termine.sort((a, b) => a.d.localeCompare(b.d));
    return { abfall: evs.length > 0 && erkannt / evs.length >= 0.5, termine, namen, typen, events: evs };
  }

  // ---------- Einstellungen & erzeugte Termine ----------
  function standard(cfg) {
    return Object.assign({ termine: [], namen: {}, tonnen: {}, erinnern: 'vorabend', uhrzeit: '18:00', wer: 'familie', kalender: 'klein', haushalt: false, raus: {}, quelle: null }, cfg || {});
  }
  function aktiv(cfg, t) { return !cfg.tonnen || cfg.tonnen[t] !== false; }
  function hhmm(t) { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  // Tage mit Abfuhr → { 'JJJJ-MM-TT': ['gelb', 'papier'] } (nur gewählte Tonnen)
  function proTag(cfg) {
    cfg = standard(cfg);
    const m = {};
    cfg.termine.forEach(x => { if (!aktiv(cfg, x.t)) return; (m[x.d] = m[x.d] || []).includes(x.t) || m[x.d].push(x.t); });
    return m;
  }
  // Typen, für die man etwas an die Straße stellt (nicht z. B. das Problemstoffmobil)
  function rausTypen(typen, cfg) { return (typen || []).filter(t => !tonneInfo(t, cfg).nichtRaus); }
  function titel(typen, cfg) { return typen.map(t => tonneInfo(t, cfg).name).join(' + '); }
  function symbole(typen, cfg) { return typen.map(t => tonneInfo(t, cfg).em).join(''); }
  // Erinnerung als Vorlauf in Minuten (ganztägige Termine zählen ab 8:00 Uhr, siehe terminlogik.js)
  function vorlaufMinuten(cfg) {
    const u = hhmm(cfg.uhrzeit);
    if (cfg.erinnern === 'vorabend') return 8 * 60 + 24 * 60 - (u === null ? 18 * 60 : u);
    if (cfg.erinnern === 'morgen') return Math.max(15, 8 * 60 - Math.min(u === null ? 6 * 60 : u, 7 * 60 + 45));
    return 0;
  }
  // Ersetzt alle Abfuhr-Termine in events durch neu erzeugte (ab 60 Tagen in der Vergangenheit)
  function termineErzeugen(events, cfg, heuteIso) {
    cfg = standard(cfg);
    const ab = plusTage(heuteIso, -60);
    const rest = (events || []).filter(e => !(e && String(e.id || '').indexOf('t_abf_') === 0));
    const tage = proTag(cfg), vorlauf = vorlaufMinuten(cfg);
    Object.keys(tage).sort().forEach(d => {
      if (d < ab) return;
      const typen = tage[d];
      rest.push({ id: 't_abf_' + d, title: '🗑️ ' + titel(typen, cfg), date: d, allDay: true, startTime: '', endTime: '', wer: cfg.wer || 'familie', location: '',
        notes: 'Abfuhrkalender' + (cfg.quelle && cfg.quelle.datei ? ' (' + cfg.quelle.datei + ')' : ''), erinnerung: vorlauf, erinnerungVorabend: false,
        recurrence: { freq: 'keine' }, abfuhr: typen.slice() });
    });
    return rest;
  }
  // Haushaltsaufgabe „Tonne rausstellen“ an den Vorabenden (id h_abfall); vorhandene Erledigungen bleiben erhalten
  function haushaltAktualisieren(aufgaben, cfg, heuteIso) {
    cfg = standard(cfg);
    const liste = (aufgaben || []).slice();
    const i = liste.findIndex(a => a && a.id === 'h_abfall');
    if (!cfg.haushalt) { if (i !== -1) liste.splice(i, 1); return liste; }
    const tage = proTag(cfg), daten = [], hinweise = {};
    Object.keys(tage).sort().forEach(d => { const r = rausTypen(tage[d], cfg); if (!r.length) return; const v = plusTage(d, -1); if (v < plusTage(heuteIso, -7)) return; daten.push(v); hinweise[v] = symbole(r, cfg) + ' ' + titel(r, cfg); });
    const basis = i !== -1 ? liste[i] : { id: 'h_abfall', titel: 'Tonne rausstellen', icon: '🗑️', raum: 'allgemein', minuten: 5, sterne: 1, zuweisung: 'offen', erledigt: [], angelegt: new Date().toISOString() };
    const neu = Object.assign({}, basis, { turnus: 'termine', daten, hinweise });
    if (i !== -1) liste[i] = neu; else liste.push(neu);
    return liste;
  }
  // Was steht an? Abends (ab 12 Uhr) die Abfuhr von morgen, morgens bis 10 Uhr die von heute.
  function anstehend(cfg, jetzt) {
    cfg = standard(cfg);
    jetzt = jetzt || new Date();
    const p = n => String(n).padStart(2, '0');
    const iso = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const heute = iso(jetzt), morgen = plusTage(heute, 1), tage = proTag(cfg);
    const h = jetzt.getHours();
    const erg = (d, wann, vorabend) => ({ datum: d, wann, typen: tage[d], rausTypen: rausTypen(tage[d], cfg), vorabend, raus: (cfg.raus || {})[d] || null });
    if (h >= 12 && tage[morgen]) return erg(morgen, 'morgen', heute);
    if (h < 10 && tage[heute]) return erg(heute, 'heute', plusTage(heute, -1));
    return null;
  }
  function naechste(cfg, heuteIso, anzahl) {
    const tage = proTag(cfg);
    return Object.keys(tage).sort().filter(d => d >= heuteIso).slice(0, anzahl || 5).map(d => ({ datum: d, typen: tage[d] }));
  }

  return { TONNEN, rausTypen, tonneErkennen, tonneInfo, icsLesen, abfuhrAusIcs, standard, aktiv, proTag, titel, symbole, vorlaufMinuten, termineErzeugen, haushaltAktualisieren, anstehend, naechste, plusTage, datumAus };
});
