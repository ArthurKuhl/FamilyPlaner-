// ==================== 🩺 GARTEN-CHECK (v514) ====================
// Bewertet jedes Beet nach Gärtnerregeln (Mischkultur, Fruchtfolge, Standort, Platz, Natur)
// und den ganzen Garten inkl. Naturgarten-Wert. Orientierung, kein Urteil: Kriterien ohne
// ausreichende Daten werden weggelassen (null) statt schlecht bewertet.
// Daten je Garten: gardens[id].gartenCheck = { natur: { totholz, nisthilfe, wild }, verlauf: { '2026': { note, natur, datum } } }

const GC_KRITERIEN = [
  { id: 'misch', icon: '🤝', name: 'Mischkultur', gewicht: 1 },
  { id: 'frucht', icon: '🔄', name: 'Fruchtfolge', gewicht: 1 },
  { id: 'standort', icon: '☀️', name: 'Standort', gewicht: 1 },
  { id: 'platz', icon: '📏', name: 'Platz', gewicht: 0.8 },
  { id: 'natur', icon: '🐝', name: 'Natur', gewicht: 0.7 },
];
// Pflanzen, die Nützlinge und Bestäuber ins Gemüsebeet holen
const GC_HELFER = ['Ringelblume', 'Kapuzinerkresse', 'Borretsch', 'Phacelia', 'Studentenblume (Tagetes)', 'Dill', 'Kornblume', 'Sonnenblume', 'Lavendel', 'Thymian', 'Salbei', 'Schnittlauch', 'Koriander', 'Oregano', 'Bohnenkraut'];
const GC_NATUR_EXTRA = [
  { id: 'totholz', icon: '🪵', name: 'Totholz- oder Reisighaufen', punkte: 4 },
  { id: 'nisthilfe', icon: '🏠', name: 'Nistkasten oder Insektenhotel', punkte: 3 },
  { id: 'wild', icon: '🌾', name: 'Wilde Ecke (Laub, Brennnessel, ungemäht)', punkte: 3 },
];
const GC_MONATSNAMEN = ['', 'Jan', 'Feb', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function gcRund(x) { return Math.max(0, Math.min(100, Math.round(x))); }
function gcStufe(n) {
  if (n === null || n === undefined) return { text: '–', farbe: '#9a948a', ampel: '⚪', klasse: 'leer' };
  if (n >= 85) return { text: 'sehr gut', farbe: '#3f8a47', ampel: '🟢', klasse: 'gut' };
  if (n >= 70) return { text: 'gut', farbe: '#5e9a4a', ampel: '🟢', klasse: 'gut' };
  if (n >= 50) return { text: 'ausbaufähig', farbe: '#c99a3a', ampel: '🟡', klasse: 'mittel' };
  return { text: 'Baustelle', farbe: '#c0392b', ampel: '🔴', klasse: 'schlecht' };
}
function gcDaten() {
  const g = gardens[currentGardenId];
  if (!g) return { natur: {}, verlauf: {} };
  if (!g.gartenCheck) g.gartenCheck = { natur: {}, verlauf: {} };
  g.gartenCheck.natur = g.gartenCheck.natur || {};
  g.gartenCheck.verlauf = g.gartenCheck.verlauf || {};
  return g.gartenCheck;
}
function gcPflanzenNamen(bed) { return [...new Set((bed.plants || []).map(p => (p.name || '').trim()).filter(Boolean))]; }
function gcSym(name) { const p = PLANTS.find(x => x.name === name); return p ? p.sym : '🌱'; }
function gcIstHelfer(name) {
  if (GC_HELFER.includes(name)) return true;
  const si = typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[name];
  if (si && si.heimisch) return true;
  return gcTierFutterFuer(name).length > 0;
}
function gcTierFutterFuer(name) {
  if (typeof TIERE === 'undefined') return [];
  const n = String(name || '').toLowerCase();
  if (n.length < 3) return [];
  return TIERE.filter(t => (t.pflanzen || []).some(tp => { const l = tp.toLowerCase(); return l === n || (l.length >= 4 && n.includes(l)) || (n.length >= 4 && l.includes(n)); }));
}
function gcFlaecheBelegt(bed) {
  return (bed.plants || []).reduce((s, p) => {
    const n = parseInt(p.anzahl, 10) || 1;
    if (n > 1 && typeof gruppenRadius === 'function' && (p.gruppenR > 0 || (typeof hatTuffForm === 'function' && hatTuffForm(p)))) return s + Math.PI * Math.pow(gruppenRadius(p), 2);
    const a = (typeof pflanzAbstandCm === 'function' && pflanzAbstandCm(p.name)) || 30;
    return s + a * a * n;
  }, 0);
}

// ---------- Bewertung eines Beets ----------
function beetCheck(bed) {
  if (!bed || bed.kind === 'struktur') return null;
  const namen = gcPflanzenNamen(bed);
  const erg = { bed, kriterien: {}, tipps: [], note: null, leer: !namen.length };
  if (!namen.length) return erg;
  const monat = new Date().getMonth() + 1;
  const tipp = (krit, text, plus) => erg.tipps.push({ krit, text, plus: plus || 0 });

  // 🤝 Mischkultur
  if (namen.length >= 2) {
    let gut = 0; const schlecht = [];
    for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
      const a = namen[i], b = namen[j], ca = COMPANIONS[a], cb = COMPANIONS[b];
      if ((ca && ca.bad.includes(b)) || (cb && cb.bad.includes(a))) schlecht.push([a, b]);
      else if ((ca && ca.good.includes(b)) || (cb && cb.good.includes(a))) gut++;
    }
    const bekannt = namen.some(n => COMPANIONS[n]);
    if (bekannt) {
      erg.kriterien.misch = { punkte: gcRund(60 + gut * 12 - schlecht.length * 30), info: gut + ' gute, ' + schlecht.length + ' ungünstige Nachbarschaft' + (schlecht.length === 1 ? '' : 'en') };
      schlecht.slice(0, 3).forEach(([a, b]) => tipp('misch', `${gcSym(a)} ${a} und ${gcSym(b)} ${b} vertragen sich nicht – eins davon in ein anderes Beet umsetzen`, 30));
      if (!gut) {
        const haupt = namen.find(n => COMPANIONS[n] && COMPANIONS[n].good.length);
        const partner = haupt && COMPANIONS[haupt].good.find(g => !namen.includes(g) && PLANTS.some(p => p.name === g) && !plantWouldConflict(bed, g));
        if (partner) tipp('misch', `${gcSym(partner)} ${partner} dazusetzen – guter Nachbar für ${haupt}`, 12);
      }
    }
  }
  // 🔄 Fruchtfolge (nur einjährige Kulturen mit bekannter Familie und vorhandener Historie)
  const einj = (bed.plants || []).filter(p => !isPerennial(p.name) && getFamily(p.name));
  const hist = (bed.history || []).filter(e => !isPerennial(e.name) && getFamily(e.name));
  if (einj.length && hist.length) {
    const fams = [...new Set(einj.map(p => getFamily(p.name)))];
    let punkte = 100; const probleme = [];
    fams.forEach(fam => {
      const p = einj.find(x => getFamily(x.name) === fam);
      const w = getFruchtfolgeWarning(bed, p.name);
      if (w) { punkte -= w.yearsAgo === 1 ? 45 : 30; probleme.push({ p, w }); }
    });
    // Starkzehrer nach Starkzehrer
    const jahr = new Date().getFullYear();
    const vorjahrStark = hist.some(e => getYearOf(e) === jahr - 1 && typeof zehrerVon === 'function' && zehrerVon(e.name) === 'S');
    const jetztStark = einj.some(p => typeof zehrerVon === 'function' && zehrerVon(p.name) === 'S');
    if (vorjahrStark && jetztStark) { punkte -= 15; tipp('frucht', 'Letztes Jahr standen hier schon Starkzehrer – Kompost einarbeiten oder nächstes Jahr Schwachzehrer (Salat, Kräuter, Bohnen)', 15); }
    probleme.forEach(({ p, w }) => {
      const v = typeof fruchtfolgeVorschlaege === 'function' ? fruchtfolgeVorschlaege(bed).vorschlaege.slice(0, 2).map(x => x.name) : [];
      tipp('frucht', `${gcSym(p.name)} ${p.name} (${w.fam}) stand ${w.yearsAgo === 1 ? 'letztes Jahr' : 'vor ' + w.yearsAgo + ' Jahren'} schon hier${v.length ? ' – besser: ' + v.join(' oder ') : ''}`, w.yearsAgo === 1 ? 45 : 30);
    });
    erg.kriterien.frucht = { punkte: gcRund(punkte), info: probleme.length ? probleme.length + ' Familie' + (probleme.length === 1 ? '' : 'n') + ' zu früh wieder hier' : 'Familien wechseln gut' };
  }
  // ☀️ Standort
  const klasse = typeof bedLichtKlasse === 'function' ? bedLichtKlasse(bed) : null;
  if (klasse && LICHT_PASST[klasse]) {
    let ok = 0, n = 0; const falsch = [];
    namen.forEach(name => {
      const b = pflanzenBedingungenFinden(name);
      if (!b || !b[0]) return;
      n++;
      if (LICHT_PASST[klasse].includes(b[0])) ok++; else falsch.push({ name, licht: b[0] });
    });
    if (n) {
      const lt = { sonne: 'sonnig', halbschatten: 'halbschattig', schatten: 'schattig' }[klasse];
      erg.kriterien.standort = { punkte: gcRund(100 * ok / n), info: `Beet ist ${lt} – ${ok} von ${n} Pflanzen passen` };
      falsch.slice(0, 3).forEach(f => tipp('standort', `${gcSym(f.name)} ${f.name} möchte es ${(BED_LICHT[f.licht] || ['', '?'])[1].toLowerCase()} – das Beet ist eher ${lt}`, Math.round(100 / n)));
    }
  } else erg.ohneLicht = true;
  // 📏 Platz
  const flaeche = bedAreaPx2(bed);
  if (flaeche > 400) {
    const q = gcFlaecheBelegt(bed) / flaeche;
    const saison = monat >= 3 && monat <= 9;
    let punkte = 100;
    if (q > 1.2) { punkte = 100 - (q - 1.2) * 130; tipp('platz', `Etwa ${Math.round((q - 1) * 100)} % zu dicht bepflanzt – ausdünnen oder Pflanzen umsetzen (mehr Luft = weniger Pilz)`, Math.round(100 - punkte)); }
    else if (q < 0.5 && saison) {
      punkte = 100 - (0.5 - q) * 110;
      const frei = Math.max(0, (flaeche * (1 - q)) / 10000);
      tipp('platz', `Noch ca. ${frei.toLocaleString('de-DE', { maximumFractionDigits: 1 })} m² frei – Platz für eine Nachkultur oder Gründüngung (z. B. Phacelia)`, Math.round(100 - punkte));
    }
    if (q >= 0.5 || saison || q > 1.2) erg.kriterien.platz = { punkte: gcRund(punkte), info: `${Math.round(q * 100)} % der Fläche belegt (nach Pflanzabstand)` };
  }
  // 🐝 Natur im Beet
  const helfer = namen.filter(gcIstHelfer);
  erg.kriterien.natur = { punkte: gcRund(40 + helfer.length * 30), info: helfer.length ? helfer.length + ' Nützlings-/Insektenpflanze' + (helfer.length === 1 ? '' : 'n') + ': ' + helfer.slice(0, 3).join(', ') : 'keine Pflanze für Nützlinge oder Bestäuber' };
  if (helfer.length < 2) {
    const vorschlag = GC_HELFER.find(h => !namen.includes(h) && PLANTS.some(p => p.name === h) && !plantWouldConflict(bed, h));
    if (vorschlag) tipp('natur', `${gcSym(vorschlag)} ${vorschlag} ergänzen – lockt Nützlinge und Bestäuber an`, 30);
  }
  // Gesamtnote (gewichtet, nur bewertbare Kriterien)
  let s = 0, gw = 0;
  GC_KRITERIEN.forEach(k => { const v = erg.kriterien[k.id]; if (v) { s += v.punkte * k.gewicht; gw += k.gewicht; } });
  erg.note = gw ? Math.round(s / gw) : null;
  // eigene ⭐-Bewertungen
  const sterne = (bed.plants || []).filter(p => p.bewertung > 0).map(p => p.bewertung);
  erg.sterne = sterne.length ? Math.round(sterne.reduce((a, b) => a + b, 0) / sterne.length * 10) / 10 : null;
  erg.tipps.sort((a, b) => b.plus - a.plus);
  return erg;
}

// ---------- Naturgarten-Wert für den ganzen Garten ----------
function naturCheck() {
  const g = gardens[currentGardenId] || {};
  const alle = [];
  (g.beds || []).filter(b => b.kind !== 'struktur').forEach(b => (b.plants || []).forEach(p => p.name && alle.push(p.name.trim())));
  (g.freiPflanzen || []).forEach(p => p.name && alle.push(p.name.trim()));
  const namen = [...new Set(alle)];
  const daten = gcDaten();
  // Blühmonate Februar–Oktober
  const monate = {};
  namen.forEach(n => {
    const b = typeof BLUETEZEIT !== 'undefined' && BLUETEZEIT[n];
    if (!b) return;
    for (let m = 2; m <= 10; m++) if (b[0] <= b[1] ? (m >= b[0] && m <= b[1]) : (m >= b[0] || m <= b[1])) (monate[m] = monate[m] || []).push(n);
  });
  const bluehAnzahl = Object.keys(monate).length;
  const luecken = []; for (let m = 2; m <= 10; m++) if (!monate[m]) luecken.push(m);
  // Futter für Tiere
  const tiere = typeof TIERE === 'undefined' ? [] : TIERE.map(t => ({ t, pflanzen: namen.filter(n => gcTierFutterFuer(n).includes(t)) })).filter(x => x.pflanzen.length);
  // Wasser & Struktur
  const wasser = (Array.isArray(g.wasserstellen) && g.wasserstellen.length > 0) || (g.beds || []).some(b => b.kind === 'struktur' && b.strukturTyp === 'wasser');
  const gehoelz = (g.beds || []).some(b => b.kind === 'struktur' && b.strukturTyp === 'hecke') || (g.freiPflanzen || []).length > 0;
  const heimisch = namen.filter(n => typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[n] && STAUDEN_INFO[n].heimisch);
  const teile = [
    { id: 'bluehen', icon: '🌸', name: 'Blüten von Februar bis Oktober', punkte: Math.round(35 * bluehAnzahl / 9), max: 35, info: bluehAnzahl + ' von 9 Monaten blüht etwas' },
    { id: 'futter', icon: '🐛', name: 'Futterpflanzen für Tiere', punkte: Math.min(25, tiere.length * 5), max: 25, info: tiere.length ? tiere.length + ' Tierarten finden hier Futter' : 'noch keine bekannte Futterpflanze' },
    { id: 'heimisch', icon: '🌿', name: 'Heimische Wildpflanzen', punkte: Math.min(10, heimisch.length * 2), max: 10, info: heimisch.length + ' heimische Arten' },
    { id: 'wasser', icon: '💧', name: 'Wasserstelle', punkte: wasser ? 10 : 0, max: 10, info: wasser ? 'vorhanden' : 'fehlt noch' },
    { id: 'gehoelz', icon: '🌳', name: 'Hecke, Baum oder Strauch', punkte: gehoelz ? 10 : 0, max: 10, info: gehoelz ? 'vorhanden' : 'fehlt noch' },
    { id: 'extra', icon: '🪵', name: 'Totholz, Nisthilfe, wilde Ecke', punkte: GC_NATUR_EXTRA.reduce((s, e) => s + (daten.natur[e.id] ? e.punkte : 0), 0), max: 10, info: GC_NATUR_EXTRA.filter(e => daten.natur[e.id]).length + ' von 3 abgehakt' },
  ];
  const note = gcRund(teile.reduce((s, t) => s + t.punkte, 0));
  const tipps = [];
  if (luecken.length) {
    const m = luecken[0];
    const ideen = (typeof STAUDEN !== 'undefined' ? STAUDEN : []).filter(s => s.heimisch && s.bluete && !namen.includes(s.name) && (s.bluete[0] <= s.bluete[1] ? m >= s.bluete[0] && m <= s.bluete[1] : (m >= s.bluete[0] || m <= s.bluete[1]))).slice(0, 2).map(s => s.sym + ' ' + s.name);
    tipps.push({ text: `Im ${luecken.map(x => GC_MONATSNAMEN[x]).slice(0, 3).join(', ')}${luecken.length > 3 ? ' …' : ''} blüht noch nichts${ideen.length ? ' – z. B. ' + ideen.join(' oder ') : ''}`, plus: Math.round(35 / 9 * luecken.length) });
  }
  if (!wasser) tipps.push({ text: '💧 Eine flache Tränke (Untersetzer mit Steinen) hilft Bienen, Vögeln und Igeln – unter 🦔 Tiere → Mini-Wasserstelle', plus: 10 });
  if (!gehoelz) tipps.push({ text: '🌳 Ein heimischer Strauch (z. B. Faulbaum, Hundsrose, Kornelkirsche) bietet Futter, Nistplatz und Raupenfutter', plus: 10 });
  if (tiere.length < 5 && typeof TIERE !== 'undefined') {
    const fehlt = TIERE.filter(t => !tiere.some(x => x.t === t) && (t.pflanzen || []).length).slice(0, 2);
    fehlt.forEach(t => tipps.push({ text: `${t.icon} ${t.name}: mit ${t.pflanzen.slice(0, 2).join(' oder ')} findet er/sie hier Futter`, plus: 5 }));
  }
  GC_NATUR_EXTRA.filter(e => !daten.natur[e.id]).slice(0, 1).forEach(e => tipps.push({ text: `${e.icon} ${e.name} anlegen – unten abhaken, wenn vorhanden`, plus: e.punkte }));
  return { note, teile, tiere, luecken, monate, tipps };
}

// ---------- Garten gesamt ----------
function gartenCheck() {
  const beete = getCurrentBeds().filter(b => b.kind !== 'struktur').map(beetCheck).filter(Boolean);
  const bewertet = beete.filter(e => e.note !== null);
  const flaeche = e => Math.max(1, bedAreaPx2(e.bed));
  const fs = bewertet.reduce((s, e) => s + flaeche(e), 0);
  const beetNote = bewertet.length ? Math.round(bewertet.reduce((s, e) => s + e.note * flaeche(e), 0) / fs) : null;
  const krit = {};
  GC_KRITERIEN.forEach(k => {
    const mit = bewertet.filter(e => e.kriterien[k.id]);
    krit[k.id] = mit.length ? Math.round(mit.reduce((s, e) => s + e.kriterien[k.id].punkte, 0) / mit.length) : null;
  });
  const natur = naturCheck();
  const gesamt = beetNote === null ? natur.note : Math.round(beetNote * 0.75 + natur.note * 0.25);
  const baustellen = [];
  bewertet.forEach(e => e.tipps.forEach(t => baustellen.push(Object.assign({ bed: e.bed }, t))));
  natur.tipps.forEach(t => baustellen.push(Object.assign({ bed: null }, t)));
  baustellen.sort((a, b) => b.plus - a.plus);
  const sterne = [];
  beete.forEach(e => (e.bed.plants || []).forEach(p => { if (p.bewertung > 0) sterne.push(p.bewertung); }));
  (gardens[currentGardenId]?.freiPflanzen || []).forEach(p => { if (p.bewertung > 0) sterne.push(p.bewertung); });
  return { beete, bewertet, beetNote, krit, natur, gesamt, baustellen, sterne: sterne.length ? Math.round(sterne.reduce((a, b) => a + b, 0) / sterne.length * 10) / 10 : null };
}
function gcVerlaufMerken(c) {
  if (c.gesamt === null) return;
  const d = gcDaten(), j = String(new Date().getFullYear());
  const alt = d.verlauf[j];
  if (alt && alt.note === c.gesamt && alt.natur === c.natur.note) return;
  d.verlauf[j] = { note: c.gesamt, natur: c.natur.note, beete: c.beetNote, sterne: c.sterne, datum: heuteISO() };
  saveData();
}

// ---------- Darstellung ----------
function gcRing(n, gross) {
  const st = gcStufe(n), r = gross ? 44 : 20, w = gross ? 9 : 5, u = 2 * Math.PI * r, s = (r + w) * 2;
  return `<svg class="gc-ring${gross ? ' gross' : ''}" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" role="img" aria-label="Note ${n ?? '–'}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--parchment)" stroke-width="${w}"/>
    ${n !== null ? `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${st.farbe}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${u * n / 100} ${u}" transform="rotate(-90 ${s / 2} ${s / 2})"/>` : ''}
    <text x="50%" y="50%" dy="${gross ? '0.12em' : '0.35em'}" text-anchor="middle" font-size="${gross ? 26 : 13}" font-weight="800" fill="var(--soil)">${n ?? '–'}</text>
    ${gross ? `<text x="50%" y="50%" dy="1.9em" text-anchor="middle" font-size="10.5" font-weight="700" fill="${st.farbe}">${st.text}</text>` : ''}</svg>`;
}
function gcBalken(icon, name, n, info) {
  const st = gcStufe(n);
  return `<div class="gc-balken"><span class="gc-b-name">${icon} ${name}</span><span class="gc-b-spur"><span style="width:${n ?? 0}%;background:${st.farbe}"></span></span><b style="color:${st.farbe}">${n ?? '–'}</b>${info ? `<small>${escapeHtml(info)}</small>` : ''}</div>`;
}
let gcOffen = null;
function gartenCheckRender() {
  const box = document.getElementById('gartenCheckWrap');
  if (!box) return;
  const c = gartenCheck();
  gcVerlaufMerken(c);
  const st = gcStufe(c.gesamt);
  const verlauf = Object.entries(gcDaten().verlauf).sort((a, b) => a[0] - b[0]);
  let h = `<button type="button" class="gc-zurueck" onclick="showView('planen')">← Planen &amp; Ernten</button>
    <div class="hub-kopf"><h2>🩺 Garten-Check</h2><p>Wie gut passen eure Beete zusammen? Eine Orientierung nach bewährten Gärtnerregeln – kein Urteil.</p></div>
    <div class="gc-karte gc-gesamt">
      ${gcRing(c.gesamt, true)}
      <div class="gc-gesamt-text">
        <div class="gc-g-titel">${st.ampel} ${escapeHtml(gardens[currentGardenId]?.name || 'Mein Garten')}</div>
        <div class="gc-g-zeile">🟫 Beete: <b>${c.beetNote ?? '–'}</b> <small>(${c.bewertet.length} von ${c.beete.length} bewertet)</small></div>
        <div class="gc-g-zeile">🦋 Naturgarten: <b>${c.natur.note}</b></div>
        ${c.sterne ? `<div class="gc-g-zeile">⭐ Eure Bewertungen: <b>Ø ${String(c.sterne).replace('.', ',')}</b></div>` : ''}
        ${verlauf.length > 1 ? `<div class="gc-g-zeile gc-verlauf">📈 ${verlauf.map(([j, v]) => `${j}: <b>${v.note}</b>`).join(' → ')}</div>` : ''}
      </div>
    </div>`;
  // Teilwerte
  h += '<div class="gc-karte"><div class="gc-titel">Teilwerte über alle Beete</div>' + GC_KRITERIEN.map(k => gcBalken(k.icon, k.name, c.krit[k.id])).join('') +
    gcBalken('🦋', 'Naturgarten', c.natur.note) + '</div>';
  // Baustellen
  if (c.baustellen.length) {
    h += '<div class="gc-karte"><div class="gc-titel">🔧 Die 3 wichtigsten Baustellen</div>' + c.baustellen.slice(0, 3).map((b, i) =>
      `<div class="gc-baustelle"><span class="gc-nr">${i + 1}</span><div><div>${escapeHtml(b.text)}</div><small>${b.bed ? '🟫 ' + escapeHtml(b.bed.name || 'Beet') : '🦋 Naturgarten'}${b.plus ? ' · bis zu +' + b.plus + ' Punkte' : ''}</small></div></div>`).join('') + '</div>';
  }
  // Beete
  const sortiert = c.beete.slice().sort((a, b) => (a.note ?? 999) - (b.note ?? 999));
  h += `<div class="gc-karte"><div class="gc-titel-zeile"><span class="gc-titel">🟫 Beete</span>
    <label class="gc-karten-schalter"><input type="checkbox" ${ebene('gartencheck') ? 'checked' : ''} onchange="ebeneUmschalten('gartencheck', this.checked)"> Noten auf der Karte</label></div>`;
  if (!c.beete.length) h += '<div class="gc-leer">Noch keine Beete angelegt. Zeichne sie unter 🗺️ Mein Garten ein.</div>';
  sortiert.forEach(e => {
    const s = gcStufe(e.note), offen = gcOffen === e.bed.id;
    h += `<div class="gc-beet${offen ? ' offen' : ''}">
      <button type="button" class="gc-beet-kopf" onclick="gcBeetUmschalten(${jsAttrStr(String(e.bed.id)).replace(/"/g, '&quot;')})">
        ${gcRing(e.note)}<span class="gc-beet-name"><b>${escapeHtml(e.bed.name || 'Beet')}</b><small>${e.leer ? 'leer – wird bewertet, sobald etwas drin steht' : s.text + ' · ' + gcPflanzenNamen(e.bed).length + ' Pflanzenarten' + (e.sterne ? ' · ⭐ ' + String(e.sterne).replace('.', ',') : '')}</small></span>
        <span class="gc-pfeil">${offen ? '▾' : '▸'}</span></button>
      ${offen ? gcBeetDetail(e) : ''}</div>`;
  });
  h += '</div>';
  // Naturgarten
  const n = c.natur, d = gcDaten();
  h += `<div class="gc-karte"><div class="gc-titel">🦋 Naturgarten-Wert: ${n.note} <small style="font-weight:600;color:${gcStufe(n.note).farbe}">${gcStufe(n.note).text}</small></div>
    ${n.teile.map(t => gcBalken(t.icon, t.name, Math.round(t.punkte / t.max * 100), t.info)).join('')}
    <div class="gc-monate">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => `<span class="${n.monate[m] ? 'an' : ''}" title="${n.monate[m] ? escapeHtml(n.monate[m].slice(0, 4).join(', ')) : 'nichts blüht'}">${GC_MONATSNAMEN[m].slice(0, 3)}</span>`).join('')}</div>
    ${n.tiere.length ? `<div class="gc-tiere">${n.tiere.slice(0, 12).map(x => `<span title="${escapeHtml(x.t.name + ': ' + x.pflanzen.join(', '))}">${x.t.icon} ${escapeHtml(x.t.name)}</span>`).join('')}</div>` : ''}
    <div class="gc-unter">Das gibt es bei uns:</div>
    ${GC_NATUR_EXTRA.map(e => `<label class="gc-haken"><input type="checkbox" ${d.natur[e.id] ? 'checked' : ''} onchange="gcNaturSetzen('${e.id}', this.checked)"> ${e.icon} ${e.name}</label>`).join('')}
    ${n.tipps.length ? '<div class="gc-unter">So wird es noch besser:</div>' + n.tipps.slice(0, 4).map(t => `<div class="gc-tipp">💡 ${escapeHtml(t.text)}</div>`).join('') : ''}
  </div>
  <div class="gc-fuss">Bewertet werden nur Kriterien, für die genug Daten da sind: Fruchtfolge braucht eine Anbau-Historie, der Standort die Sonnenlage (🧭 Norden festlegen oder Licht am Beet einstellen). Im Winter zählt freie Fläche nicht als Nachteil.</div>`;
  box.innerHTML = h;
}
function gcBeetDetail(e) {
  if (e.leer) return '<div class="gc-beet-detail"><div class="gc-tipp">Gerade steht nichts im Beet. Für die nächste Saison hilft 🗺️ „Plan für nächstes Jahr“.</div></div>';
  let h = '<div class="gc-beet-detail">';
  GC_KRITERIEN.forEach(k => { const v = e.kriterien[k.id]; h += v ? gcBalken(k.icon, k.name, v.punkte, v.info) : `<div class="gc-balken aus"><span class="gc-b-name">${k.icon} ${k.name}</span><small>${k.id === 'frucht' ? 'noch keine Anbau-Historie' : k.id === 'standort' ? 'Sonnenlage unbekannt' : 'nicht bewertbar'}</small></div>`; });
  if (e.tipps.length) h += e.tipps.slice(0, 4).map(t => `<div class="gc-tipp">💡 ${escapeHtml(t.text)}${t.plus ? ` <small>+${t.plus}</small>` : ''}</div>`).join('');
  else h += '<div class="gc-tipp">✓ Nichts zu verbessern – prima!</div>';
  h += `<button type="button" class="gc-knopf" onclick="gcBeetZeigen(${jsAttrStr(String(e.bed.id)).replace(/"/g, '&quot;')})">🗺️ Beet auf der Karte zeigen</button></div>`;
  return h;
}
function gcBeetUmschalten(id) { gcOffen = String(gcOffen) === String(id) ? null : (getCurrentBeds().find(b => String(b.id) === String(id)) || {}).id; gartenCheckRender(); }
function gcNaturSetzen(id, an) { const d = gcDaten(); if (an) d.natur[id] = true; else delete d.natur[id]; saveData(); gartenCheckRender(); }
function gcBeetZeigen(id) {
  const bed = getCurrentBeds().find(b => String(b.id) === String(id));
  if (!bed) return;
  showView('garden');
  selectedBed = bed; selectedBeds = [bed];
  try { showBedEditor(bed); } catch (e) {}
  draw();
}
// Kompakte Box im Beet-Editor
function gcEditorBox(bed) {
  let box = document.getElementById('gcBeetBox');
  const lage = document.getElementById('bedLageBox');
  if (!box && lage) { box = document.createElement('div'); box.id = 'gcBeetBox'; box.className = 'lage-box gc-editor'; lage.parentNode.insertBefore(box, lage.nextSibling); }
  if (!box) return;
  const e = beetCheck(bed);
  if (!e || e.leer) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = '';
  const st = gcStufe(e.note);
  box.innerHTML = `<div class="lage-titel">🩺 Garten-Check: <span style="color:${st.farbe}">${e.note ?? '–'} · ${st.text}</span></div>
    <div class="gc-editor-chips">${GC_KRITERIEN.filter(k => e.kriterien[k.id]).map(k => `<span title="${escapeHtml(e.kriterien[k.id].info)}">${k.icon} ${e.kriterien[k.id].punkte}</span>`).join('')}</div>
    ${e.tipps.slice(0, 2).map(t => `<div class="lage-zeile lage-klein">💡 ${escapeHtml(t.text)}</div>`).join('')}
    <button type="button" class="btn-secondary lage-knopf" onclick="gcOffen=${jsAttrStr(String(bed.id)).replace(/"/g, '&quot;')};showView('gartencheck')">Alle Details ›</button>`;
}

// ---------- Noten-Abzeichen auf der Karte (Ebene „Garten-Check“) ----------
function gcEcke(bed) {
  let lx, ly;
  if (bed.shape === 'circle') { lx = -(bed.rx ?? bed.r ?? 60) * 0.71; ly = -(bed.ry ?? bed.r ?? 60) * 0.71; }
  else if (bed.shape === 'freehand' && Array.isArray(bed.points) && bed.points.length) { lx = Math.min(...bed.points.map(p => p.x)); ly = Math.min(...bed.points.map(p => p.y)); }
  else { lx = -(bed.w || 100) / 2; ly = -(bed.h || 100) / 2; }
  const rot = bed.rotation || 0;
  return { x: bed.x + rotX(lx, ly, rot), y: bed.y + rotY(lx, ly, rot) };
}
function zeichneGartenCheck() {
  if (!ebene('gartencheck') || !ebene('beete') || bluehMonat || mode === 'giessen' || zeitreiseJahre !== null) return;
  const z = zoomFaktor(), r = 12 / z;
  ctx.save();
  getCurrentBeds().forEach(bed => {
    if (bed.kind === 'struktur' || !bettSichtbar(bed)) return;
    const e = beetCheck(bed);
    if (!e || e.note === null) return;
    const p = gcEcke(bed);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = gcStufe(e.note).farbe; ctx.fill(); ctx.lineWidth = 2 / z; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.font = '800 ' + (10.5 / z) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(String(e.note), p.x, p.y + 0.5 / z);
  });
  ctx.restore();
}

// ---------- Anbindung ----------
(function () {
  if (typeof EBENEN !== 'undefined' && !EBENEN.some(e => e[0] === 'gartencheck')) {
    EBENEN.push(['gartencheck', '🩺', 'Garten-Check-Noten an den Beeten']);
    EBENEN_STANDARD_AUS.push('gartencheck');
  }
  const altAmpel = window.zeichneFruchtfolgeAmpel;
  if (typeof altAmpel === 'function') window.zeichneFruchtfolgeAmpel = function () { const r = altAmpel.apply(this, arguments); try { zeichneGartenCheck(); } catch (e) { console.warn('Garten-Check', e); } return r; };
  const altLage = window.renderBedLage;
  if (typeof altLage === 'function') window.renderBedLage = function (bed) { const r = altLage.apply(this, arguments); try { gcEditorBox(bed); } catch (e) { console.warn('Garten-Check', e); } return r; };
  const altShow = window.showView;
  if (typeof altShow === 'function') window.showView = function (name) {
    if (name === 'gartencheck' && !document.getElementById('view-gartencheck')) {
      const v = document.createElement('div');
      v.className = 'view'; v.id = 'view-gartencheck';
      v.innerHTML = '<div class="zimmer-wrap" id="gartenCheckWrap"></div>';
      const ref = document.getElementById('view-planen');
      ref.parentNode.insertBefore(v, ref);
    }
    const r = altShow.apply(this, arguments);
    if (name === 'gartencheck') { gartenCheckRender(); window.scrollTo({ top: 0 }); }
    return r;
  };
})();
