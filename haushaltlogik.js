// Gemeinsame Fälligkeitslogik für Haushaltsaufgaben (Haushalt, Kinderecke, Home).
// Alle Datumsvergleiche laufen über das LOKALE Datum (nicht UTC), damit kurz nach Mitternacht
// nicht noch der Vortag zählt.
//
// Aufgabe: { id, titel, icon, raum, minuten, sterne, turnus: 'taeglich'|'woechentlich'|'intervall'|'monatlich'|'einmalig',
//            wochentage: [0..6], intervallTage, intervallEinheit: 'tage'|'wochen', zuweisung, person, rotationPersonen,
//            rotationIndex, pausiert, angelegt (ISO), uebersprungenAm (ISO), erledigt: [{ datum (ISO), von, foto?, fotoPfad? }] }
(function () {
  const L = {};
  const pad = n => String(n).padStart(2, '0');
  L.lokalIso = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // ISO-Zeitstempel (UTC) oder reines Datum -> lokales Datum JJJJ-MM-TT
  L.tag = function (s) {
    if (!s) return '';
    s = String(s);
    if (s.length <= 10) return s;
    const d = new Date(s);
    return isNaN(d) ? s.slice(0, 10) : L.lokalIso(d);
  };
  L.ausIso = function (iso) { const [j, m, t] = String(iso).slice(0, 10).split('-').map(Number); return new Date(j, (m || 1) - 1, t || 1); };
  L.plusTage = function (iso, n) { const d = L.ausIso(iso); d.setDate(d.getDate() + n); return L.lokalIso(d); };
  L.tageZwischen = function (a, b) { return Math.round((L.ausIso(b) - L.ausIso(a)) / 864e5); };
  L.heute = function () { return L.lokalIso(new Date()); };

  L.letzteErledigung = function (a) { return (a && a.erledigt && a.erledigt.length) ? a.erledigt[a.erledigt.length - 1] : null; };
  // Letzte „Aktion“ (erledigt ODER übersprungen) als lokales Datum
  L.letzteAktionTag = function (a) {
    const e = L.letzteErledigung(a);
    const t1 = e ? L.tag(e.datum) : '';
    const t2 = a.uebersprungenAm ? L.tag(a.uebersprungenAm) : '';
    return t1 > t2 ? t1 : t2;
  };
  L.heuteErledigt = function (a) { const e = L.letzteErledigung(a); return !!e && L.tag(e.datum) === L.heute(); };
  L.heuteUebersprungen = function (a) { return !!a.uebersprungenAm && L.tag(a.uebersprungenAm) === L.heute(); };
  L.intervallTage = function (a) { return Math.max(1, parseInt(a.intervallTage, 10) || 7); };
  L.minuten = function (a) { const m = parseInt(a && a.minuten, 10); return m > 0 ? m : 0; };
  L.sterne = function (a) { const s = parseInt(a && a.sterne, 10); return isNaN(s) ? 1 : Math.max(0, s); };

  // Ist die Aufgabe an diesem (lokalen) Tag „dran“? (nur Tagesraster, ohne Erledigungsstand)
  L.planTagPasst = function (a, iso) {
    if (a.turnus === 'taeglich') return true;
    if (a.turnus === 'woechentlich') return (a.wochentage || []).includes(L.ausIso(iso).getDay());
    return false;
  };

  // Status für heute: { offen, ueberfaelligSeit (ISO|null), naechstesAm (ISO|null), heuteErledigt }
  L.status = function (a, heuteIso) {
    const heute = heuteIso || L.heute();
    const erg = { offen: false, ueberfaelligSeit: null, naechstesAm: null, heuteErledigt: L.heuteErledigt(a) };
    if (a.pausiert) return erg;
    const letzte = L.letzteAktionTag(a);
    const angelegt = a.angelegt ? L.tag(a.angelegt) : '';
    if (a.turnus === 'taeglich') {
      erg.offen = letzte !== heute;
      erg.naechstesAm = erg.offen ? heute : L.plusTage(heute, 1);
      return erg;
    }
    if (a.turnus === 'woechentlich') {
      const tage = a.wochentage || [];
      if (!tage.length) return erg;
      // verpasste Termine der letzten 7 Tage (nach der letzten Aktion und nach dem Anlegen)
      let erster = null;
      for (let i = 7; i >= 0; i--) {
        const d = L.plusTage(heute, -i);
        if (!L.planTagPasst(a, d)) continue;
        if (letzte && d <= letzte) continue;
        if (angelegt && d < angelegt) continue;
        erster = erster || d;
      }
      if (erster) { erg.offen = true; if (erster < heute) erg.ueberfaelligSeit = erster; erg.naechstesAm = erster; return erg; }
      for (let i = 1; i <= 7; i++) { const d = L.plusTage(heute, i); if (L.planTagPasst(a, d)) { erg.naechstesAm = d; break; } }
      return erg;
    }
    if (a.turnus === 'intervall') {
      const n = L.intervallTage(a);
      const basis = letzte || '';
      const faelligAb = basis ? L.plusTage(basis, n) : (angelegt || heute);
      erg.naechstesAm = faelligAb;
      if (faelligAb <= heute) { erg.offen = true; if (basis && faelligAb < heute) erg.ueberfaelligSeit = faelligAb; }
      return erg;
    }
    if (a.turnus === 'monatlich') {
      erg.offen = !letzte || letzte.slice(0, 7) !== heute.slice(0, 7);
      if (!erg.offen) { const d = L.ausIso(heute); erg.naechstesAm = L.lokalIso(new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
      else erg.naechstesAm = heute;
      return erg;
    }
    if (a.turnus === 'einmalig') { erg.offen = !L.letzteErledigung(a) && !a.uebersprungenAm; erg.naechstesAm = erg.offen ? heute : null; return erg; }
    return erg;
  };
  L.istFaelligOffen = function (a) { return L.status(a).offen; };

  // Zuständige Person (ID) – offset = wie viele offene Termine weiter in der Rotation
  L.zustaendigId = function (a, offset) {
    if (a.zuweisung === 'fest' && a.person) return a.person;
    if (a.zuweisung === 'rotation' && (a.rotationPersonen || []).length) {
      const n = a.rotationPersonen.length;
      return a.rotationPersonen[(((a.rotationIndex || 0) + (offset || 0)) % n + n) % n];
    }
    return null;
  };

  // Geplante (noch offene) Termine im Zeitraum [von, bis] – für den Wochenplan.
  // Ergebnis: [{ datum, aufgabe, ueberfaellig, personId }]; monatlich/einmalig werden separat behandelt.
  L.geplanteTermine = function (a, von, bis) {
    const heute = L.heute();
    const st = L.status(a, heute);
    const liste = [];
    if (a.pausiert || a.turnus === 'monatlich' || a.turnus === 'einmalig') return liste;
    let k = 0; // Rotations-Offset
    const push = d => { if (d >= von && d <= bis) liste.push({ datum: d, aufgabe: a, ueberfaellig: d < heute, personId: L.zustaendigId(a, k) }); k++; };
    if (a.turnus === 'intervall') {
      const n = L.intervallTage(a);
      let d = st.naechstesAm || heute;
      if (d < heute) d = heute; // Überfälliges erscheint heute
      for (let i = 0; i < 400 && d <= bis; i++) { push(d); d = L.plusTage(d, n); }
      return liste;
    }
    // täglich / wöchentlich: ab heute (bzw. ab dem verpassten Termin) Tag für Tag
    let start = heute;
    if (st.offen && st.ueberfaelligSeit) { push(heute); start = L.plusTage(heute, 1); }
    else if (!st.offen && (a.turnus === 'taeglich' || L.planTagPasst(a, heute))) start = L.plusTage(heute, 1);
    for (let d = start, i = 0; d <= bis && i < 400; d = L.plusTage(d, 1), i++) if (L.planTagPasst(a, d)) push(d);
    return liste;
  };

  L.turnusText = function (a, wochentagNamen) {
    if (a.turnus === 'taeglich') return 'Täglich';
    if (a.turnus === 'woechentlich') {
      const n = wochentagNamen || ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const reihen = [1, 2, 3, 4, 5, 6, 0].filter(t => (a.wochentage || []).includes(t)).map(t => n[t]);
      return reihen.length ? 'Wöchentlich: ' + reihen.join(', ') : 'Wöchentlich';
    }
    if (a.turnus === 'intervall') {
      const n = L.intervallTage(a);
      if (a.intervallEinheit === 'wochen' && n % 7 === 0) return n === 7 ? 'Jede Woche' : 'Alle ' + (n / 7) + ' Wochen';
      return n === 1 ? 'Jeden Tag' : 'Alle ' + n + ' Tage';
    }
    if (a.turnus === 'monatlich') return 'Monatlich';
    return 'Einmalig';
  };

  window.HaushaltLogik = L;
})();
