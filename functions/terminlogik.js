// ============================================================
// TerminLogik – gemeinsame Regeln für (wiederkehrende) Termine
// Genutzt von termine.html, home.html, index.html, kinder.html, kochen.html
// und als Kopie in functions/terminlogik.js (Push-Erinnerungen, Kalender-Abo).
// Rechnet nur mit Kalendertagen (JJJJ-MM-TT) – unabhängig von der Zeitzone.
//
// Termin-Felder: date, endDate (mehrtägig, optional), allDay, startTime, endTime,
//   recurrence: { freq, interval, until, wtNr }, exdates: ['JJJJ-MM-TT' …],
//   erinnerung (Minuten vorher), erinnerungVorabend (true = am Vorabend 18 Uhr), geburtsjahr
// freq: keine | taeglich | werktags | woechentlich | monatlich | monatlichWt | jaehrlich
// ============================================================
(function (root) {
  'use strict';
  var MS = 864e5;
  var WT_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var WT_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  function istIso(s) { return /^\d{4}-\d{2}-\d{2}/.test(String(s || '')); }
  function tagNr(iso) { var p = String(iso).slice(0, 10).split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / MS); }
  function isoVon(nr) { return new Date(nr * MS).toISOString().slice(0, 10); }
  function plusTage(iso, n) { return isoVon(tagNr(iso) + n); }
  function wochentag(nr) { return (new Date(nr * MS).getUTCDay() + 6) % 7; } // 0 = Montag
  function monatsLaenge(y, m0) { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
  function nrVon(y, m0, d) { return Math.round(Date.UTC(y, m0, d) / MS); }
  function hhmm(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }

  function freqVon(ev) { return ev && ev.recurrence && ev.recurrence.freq ? ev.recurrence.freq : 'keine'; }
  function istSerie(ev) { return freqVon(ev) !== 'keine'; }
  function intervall(ev) { var n = Number(ev && ev.recurrence && ev.recurrence.interval); return n >= 1 ? Math.floor(n) : 1; }
  function dauerTage(ev) { return ev && istIso(ev.endDate) && ev.endDate.slice(0, 10) > ev.date.slice(0, 10) ? tagNr(ev.endDate) - tagNr(ev.date) : 0; }
  // „Der wievielte Wochentag im Monat“: 1–4, oder -1 = der letzte
  function wtNrVonDatum(iso) { var d = Number(String(iso).slice(8, 10)); var n = Math.ceil(d / 7); return n >= 5 ? -1 : n; }
  function wtNr(ev) { var r = ev.recurrence || {}; return r.wtNr ? Number(r.wtNr) : wtNrVonDatum(ev.date); }
  function nterWochentag(y, m0, wt, nr) {
    if (nr > 0) {
      var erster = wochentag(nrVon(y, m0, 1));
      var tag = 1 + ((wt - erster + 7) % 7) + (nr - 1) * 7;
      return tag <= monatsLaenge(y, m0) ? tag : null;
    }
    var len = monatsLaenge(y, m0);
    var letzter = wochentag(nrVon(y, m0, len));
    return len - ((letzter - wt + 7) % 7);
  }

  // Startdaten aller Vorkommen, die den Bereich [von, bis] berühren (mehrtägige auch, wenn sie hineinragen)
  function vorkommen(ev, von, bis) {
    var out = [];
    if (!ev || !istIso(ev.date) || !istIso(von) || !istIso(bis)) return out;
    var start = tagNr(ev.date), dauer = dauerTage(ev), v = tagNr(von), b = tagNr(bis);
    var freq = freqVon(ev), n = intervall(ev);
    var until = ev.recurrence && istIso(ev.recurrence.until) ? tagNr(ev.recurrence.until) : Infinity;
    var ex = {}; (ev.exdates || []).forEach(function (x) { ex[String(x).slice(0, 10)] = true; });
    function nimm(t) {
      if (t < start || t > until || t > b || t + dauer < v) return;
      var iso = isoVon(t);
      if (!ex[iso]) out.push(iso);
    }
    if (freq === 'keine') { nimm(start); return out; }
    var ab = Math.max(start, v - dauer), ende = Math.min(b, until), i, t, k;
    if (freq === 'taeglich' || freq === 'woechentlich') {
      var schritt = (freq === 'taeglich' ? 1 : 7) * n;
      k = Math.max(0, Math.ceil((ab - start) / schritt));
      for (t = start + k * schritt, i = 0; t <= ende && i < 2000; t += schritt, i++) nimm(t);
      return out;
    }
    if (freq === 'werktags') {
      for (t = ab, i = 0; t <= ende && i < 3000; t++, i++) if (wochentag(t) < 5) nimm(t);
      return out;
    }
    var sd = new Date(start * MS), y0 = sd.getUTCFullYear(), m0 = sd.getUTCMonth(), d0 = sd.getUTCDate();
    var abD = new Date(ab * MS);
    if (freq === 'monatlich' || freq === 'monatlichWt') {
      var wt = wochentag(start), nr = wtNr(ev);
      k = Math.max(0, (abD.getUTCFullYear() - y0) * 12 + abD.getUTCMonth() - m0 - 1);
      k = Math.floor(k / n) * n;
      for (i = 0; i < 1200; i++, k += n) {
        var y = y0 + Math.floor((m0 + k) / 12), m = (m0 + k) % 12;
        if (nrVon(y, m, 1) > ende) break;
        var tag = freq === 'monatlich' ? Math.min(d0, monatsLaenge(y, m)) : nterWochentag(y, m, wt, nr);
        if (tag !== null) nimm(nrVon(y, m, tag));
      }
      return out;
    }
    if (freq === 'jaehrlich') {
      k = Math.max(0, abD.getUTCFullYear() - y0 - 1);
      k = Math.floor(k / n) * n;
      for (i = 0; i < 400; i++, k += n) {
        var yj = y0 + k;
        if (nrVon(yj, 0, 1) > ende) break;
        nimm(nrVon(yj, m0, Math.min(d0, monatsLaenge(yj, m0))));
      }
      return out;
    }
    return out;
  }
  // Findet an diesem Tag statt (auch als Tag 2 eines mehrtägigen Termins)
  function amTag(ev, iso) { return vorkommen(ev, iso, iso).length > 0; }
  // Beginnt an diesem Tag
  function startetAm(ev, iso) { return vorkommen(ev, iso, iso).indexOf(String(iso).slice(0, 10)) !== -1; }
  // Nächstes Vorkommen ab einem Tag (für Suche, Countdown …)
  function naechstes(ev, abIso, maxTage) {
    var bis = plusTage(abIso, maxTage || 800);
    var l = vorkommen(ev, abIso, bis).filter(function (x) { return x >= abIso; });
    return l.length ? l[0] : null;
  }
  // Letztes Vorkommen vor einem Tag
  function letztes(ev, vorIso) {
    if (!ev || !istIso(ev.date) || ev.date.slice(0, 10) >= vorIso) return null;
    var l = vorkommen(ev, ev.date.slice(0, 10), plusTage(vorIso, -1));
    return l.length ? l[l.length - 1] : null;
  }

  function rhythmusText(ev) {
    var f = freqVon(ev), n = intervall(ev);
    if (f === 'keine') return '';
    if (f === 'taeglich') return n === 1 ? 'täglich' : 'alle ' + n + ' Tage';
    if (f === 'werktags') return 'werktags (Mo–Fr)';
    if (f === 'woechentlich') { var wt = WT_KURZ[wochentag(tagNr(ev.date))]; return n === 1 ? 'jeden ' + wt : 'alle ' + n + ' Wochen (' + wt + ')'; }
    if (f === 'monatlich') return (n === 1 ? 'monatlich' : 'alle ' + n + ' Monate') + ' am ' + Number(ev.date.slice(8, 10)) + '.';
    if (f === 'monatlichWt') { var nr = wtNr(ev); return 'jeden ' + (nr === -1 ? 'letzten' : nr + '.') + ' ' + WT_LANG[wochentag(tagNr(ev.date))] + (n === 1 ? ' im Monat' : ' alle ' + n + ' Monate'); }
    if (f === 'jaehrlich') return n === 1 ? 'jährlich' : 'alle ' + n + ' Jahre';
    return '';
  }

  // RRULE (ohne „RRULE:“) für Kalender-Dateien; until als ;UNTIL=… wird angehängt
  function icsRegel(ev) {
    var f = freqVon(ev), n = intervall(ev), r = ev.recurrence || {};
    if (f === 'keine') return '';
    var d0 = Number(ev.date.slice(8, 10)), wt = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][wochentag(tagNr(ev.date))];
    var teile;
    if (f === 'taeglich') teile = ['FREQ=DAILY'];
    else if (f === 'werktags') teile = ['FREQ=WEEKLY', 'BYDAY=MO,TU,WE,TH,FR'];
    else if (f === 'woechentlich') teile = ['FREQ=WEEKLY'];
    else if (f === 'monatlich') teile = d0 > 28 ? ['FREQ=MONTHLY', 'BYMONTHDAY=' + [28, 29, 30, 31].filter(function (x) { return x <= d0; }).join(','), 'BYSETPOS=-1'] : ['FREQ=MONTHLY'];
    else if (f === 'monatlichWt') teile = ['FREQ=MONTHLY', 'BYDAY=' + wtNr(ev) + wt];
    else if (f === 'jaehrlich') teile = ev.date.slice(5, 10) === '02-29' ? ['FREQ=YEARLY', 'BYMONTH=2', 'BYMONTHDAY=28,29', 'BYSETPOS=-1'] : ['FREQ=YEARLY'];
    else return '';
    if (n > 1) teile.push('INTERVAL=' + n);
    if (istIso(r.until)) teile.push('UNTIL=' + r.until.slice(0, 10).replace(/-/g, '') + 'T225959Z');
    return teile.join(';');
  }

  // Erinnerungen, die an diesem Tag fällig werden: [{ vorkommen, minuten (Uhrzeit am Tag), tageVorher }]
  function erinnerungenAm(ev, iso) {
    var res = [];
    if (!ev) return res;
    var vorabend = !!ev.erinnerungVorabend, vorlauf = Number(ev.erinnerung) || 0;
    if (!vorabend && vorlauf <= 0) return res;
    var startMin = ev.allDay || !ev.startTime ? 8 * 60 : hhmm(ev.startTime);
    if (startMin === null) return res;
    var maxTage = vorabend ? 1 : Math.ceil(vorlauf / 1440) + 1;
    for (var j = 0; j <= maxTage; j++) {
      var occ = plusTage(iso, j);
      if (!startetAm(ev, occ)) continue;
      var ziel = vorabend ? (j === 1 ? 18 * 60 : null) : startMin - vorlauf + j * 1440;
      if (ziel !== null && ziel >= 0 && ziel < 1440) res.push({ vorkommen: occ, minuten: ziel, tageVorher: j });
    }
    return res;
  }
  function vorlaufText(ev, tageVorher) {
    if (ev.erinnerungVorabend || tageVorher === 1) return 'morgen' + (ev.allDay || !ev.startTime ? '' : ' um ' + ev.startTime + ' Uhr');
    if (tageVorher === 2) return 'übermorgen' + (ev.allDay || !ev.startTime ? '' : ' um ' + ev.startTime + ' Uhr');
    if (tageVorher > 2) return 'in ' + tageVorher + ' Tagen';
    var v = Number(ev.erinnerung) || 0;
    if (ev.allDay || !ev.startTime) return 'heute';
    if (!v) return 'jetzt (' + ev.startTime + ' Uhr)';
    return 'in ' + (v < 60 ? v + ' Min.' : (v % 60 ? (v / 60).toFixed(1).replace('.', ',') : v / 60) + ' Std.') + ' (' + ev.startTime + ' Uhr)';
  }

  // 🎂 „wird 9“ – nur bei jährlichen Terminen mit Geburtsjahr
  function alter(ev, iso) {
    var gj = Number(ev && ev.geburtsjahr);
    if (!gj || freqVon(ev) !== 'jaehrlich') return null;
    var a = Number(String(iso).slice(0, 4)) - gj;
    return a >= 0 && a < 130 ? a : null;
  }
  function titelMitAlter(ev, iso) {
    var a = alter(ev, iso), t = String((ev && ev.title) || '');
    if (a === null) return t;
    return t + (a === 0 ? ' (Geburt)' : /hochzeit|jahrestag|jubil/i.test(t) ? ' (' + a + '.)' : ' (wird ' + a + ')');
  }

  var TL = {
    tagNr: tagNr, isoVon: isoVon, plusTage: plusTage, wochentag: wochentag, hhmm: hhmm,
    freq: freqVon, istSerie: istSerie, intervall: intervall, dauerTage: dauerTage, wtNrVonDatum: wtNrVonDatum,
    vorkommen: vorkommen, amTag: amTag, startetAm: startetAm, naechstes: naechstes, letztes: letztes,
    rhythmusText: rhythmusText, icsRegel: icsRegel, erinnerungenAm: erinnerungenAm, vorlaufText: vorlaufText,
    alter: alter, titelMitAlter: titelMitAlter, WT_KURZ: WT_KURZ, WT_LANG: WT_LANG,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL;
  else root.TerminLogik = TL;
})(typeof window !== 'undefined' ? window : this);
