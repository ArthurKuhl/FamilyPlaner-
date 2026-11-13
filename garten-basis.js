// Gartenplaner – Grundlagen: Pflanzenkatalog, Pflegeplan, Fruchtfolge, Export, Gartenverwaltung
// Teil 1 von 4 des Garten-Skripts (aus garten.html ausgelagert, wird dort in dieser Reihenfolge geladen).
// ==================== PLANT CATALOGUE ====================
// PLANTS → pflanzendaten.js

// ==================== VERWERTUNG & HALTBARMACHEN ====================
// Allgemeine, methodenbezogene Kurzinfos (unabhängig von der einzelnen Pflanze)
// METHOD_INFO → pflanzendaten.js
// Fallback pro Kategorie, falls für eine Pflanze kein eigener Eintrag existiert
// PRESERVATION_FALLBACK → pflanzendaten.js
// Pflanzenspezifische Zuordnung. "note" überschreibt/ergänzt die generischen Methoden,
// z.B. für Blattgemüse, das sich kaum haltbar machen lässt.
// PRESERVATION → pflanzendaten.js
function getPreservationInfo(plantName) {
  const name = (plantName||'').trim();
  const plant = PLANTS.find(p => p.name === name);
  if (!plant || plant.cat === 'Blumen') return null;
  const entry = PRESERVATION[name];
  if (entry) return { methods: entry.methods, note: entry.note || null, cat: plant.cat };
  return { methods: PRESERVATION_FALLBACK[plant.cat] || [], note: null, cat: plant.cat };
}
// Verwendungsarten für Ernteeinträge – teilt sich Icons/Labels mit METHOD_INFO, ergänzt um
// ein paar Optionen, die dort keine Rolle spielen (frisch verzehrt, verschenkt, sonstiges).
const HARVEST_USE_OPTIONS = [
  { key: 'frisch', icon: '🍽️', label: 'Frisch verzehrt' },
  { key: 'einkochen', icon: METHOD_INFO.einkochen.icon, label: METHOD_INFO.einkochen.label },
  { key: 'einfrieren', icon: METHOD_INFO.einfrieren.icon, label: METHOD_INFO.einfrieren.label },
  { key: 'fermentieren', icon: METHOD_INFO.fermentieren.icon, label: METHOD_INFO.fermentieren.label },
  { key: 'trocknen', icon: METHOD_INFO.trocknen.icon, label: METHOD_INFO.trocknen.label },
  { key: 'einlegen', icon: METHOD_INFO.einlegen.icon, label: METHOD_INFO.einlegen.label },
  { key: 'marmelade', icon: METHOD_INFO.marmelade.icon, label: METHOD_INFO.marmelade.label },
  { key: 'saft', icon: METHOD_INFO.saft.icon, label: METHOD_INFO.saft.label },
  { key: 'deko', icon: '💐', label: 'Dekoration' },
  { key: 'verschenkt', icon: '🎁', label: 'Verschenkt/Verkauft' },
  { key: 'sonstiges', icon: '📦', label: 'Sonstiges' },
];
function harvestUseLabel(key) {
  const o = HARVEST_USE_OPTIONS.find(x => x.key === key);
  return o ? `${o.icon} ${o.label}` : null;
}
function populateHarvestMethodSelect() {
  ['ppHarvestMethod', 'fpHarvestMethod'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.dataset.built) return;
    HARVEST_USE_OPTIONS.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.key; opt.textContent = `${o.icon} ${o.label}`;
      sel.appendChild(opt);
    });
    sel.dataset.built = '1';
  });
}
function isPerennial(name) {
  const p = PLANTS.find(p => p.name === (name||'').trim());
  return !!(p && p.perennial);
}
function isFrostTender(name) {
  const p = PLANTS.find(p => p.name === (name||'').trim());
  return !!(p && p.frostTender);
}
// Sicheres Einbetten eines Strings als einfach gequoteter JS-String-Literal
// innerhalb eines doppelt gequoteten HTML-onclick-Attributs (JSON.stringify
// erzeugt Doppel-Anführungszeichen, die das Attribut vorzeitig beenden würden).
function jsAttrStr(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
// Empfohlener Pflanzabstand in cm (Richtwert für Reihenkultur, quadratisch gerechnet)
// SPACING → pflanzendaten.js

// ==================== SYMPTOMS DATA ====================
// SYMPTOMS → pflanzendaten.js

// ==================== PESTS DATA ====================
// PESTS → pflanzendaten.js

// ==================== COMPANION PLANTING (MISCHKULTUR) ====================
// Basierend auf klassischen Mischkultur-Regeln. Namen müssen mit PLANTS bzw.
// frei vergebenen Pflanzennamen übereinstimmen.
// COMPANIONS → pflanzendaten.js
function plantWouldConflict(bed, name) {
  if (!name) return false;
  const cn = COMPANIONS[name];
  for (const p of (bed.plants||[])) {
    const on = (p.name||'').trim();
    if (!on || on===name) continue;
    const co = COMPANIONS[on];
    if ((cn && cn.bad.includes(on)) || (co && co.bad.includes(name))) return true;
  }
  return false;
}
function getBedConflicts(bed) {
  const plants = bed.plants || [];
  const conflicts = [];
  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const an = (plants[i].name || '').trim();
      const bn = (plants[j].name || '').trim();
      if (!an || !bn) continue;
      const ca = COMPANIONS[an], cb = COMPANIONS[bn];
      const isBad = (ca && ca.bad.includes(bn)) || (cb && cb.bad.includes(an));
      if (isBad) conflicts.push([i, j]);
    }
  }
  return conflicts;
}
function plantHasConflict(bed, idx) {
  return getBedConflicts(bed).some(([i, j]) => i === idx || j === idx);
}

// ==================== PFLEGEPLAN (GIESSEN / DÜNGEN / ERNTE) ====================
// Grobe Richtwerte – Gartenpraxis variiert je nach Standort, Wetter & Sorte.
// CARE_INFO → pflanzendaten.js
// ==================== RÜCKSCHNITT-KALENDER (Gehölze) ====================
// Monate: 1=Jan … 12=Dez. monate: [vonMonat, bisMonat] – bevorzugte Zeitspanne für den
// Rückschnitt. hinweis: kurzer Grund/Tipp, warum gerade dieser Zeitraum.
// RUECKSCHNITT → pflanzendaten.js
// ==================== AUSSAATKALENDER ====================
// Monate: 1=Jan … 12=Dez. null = kein Wert.
// vorziehen: [vonMonat, bisMonat], direktsaat: [...], auspflanzen: [...]
// SOWING → pflanzendaten.js
// Typische Erntemonate für Mitteleuropa (grobe Richtwerte, wie beim Aussaatkalender).
// Bei Bereichen, die übers Jahresende hinausgehen (z.B. Winterlauch), ist der Startmonat
// größer als der Endmonat – isInHarvestWindow() behandelt das als Jahreswechsel-Bereich.
// HARVEST_WINDOW → pflanzendaten.js
function isInHarvestWindow(r, month) {
  if (!r) return false;
  if (r[0] <= r[1]) return month >= r[0] && month <= r[1];
  return month >= r[0] || month <= r[1]; // Bereich geht übers Jahresende (z.B. [10,3])
}
const MONTH_NAMES = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const CLIMATE_OFFSET = { mild: -1, normal: 0, rau: 1 };
const CLIMATE_LABEL = { mild: '🌸 Mild', normal: '🌿 Normal', rau: '❄️ Rau' };

function getClimateZone() {
  return gardens[currentGardenId]?.climateZone || 'normal';
}
function setClimateZone(zone, manual) {
  if (!gardens[currentGardenId]) return;
  gardens[currentGardenId].climateZone = zone;
  if (manual !== false) gardens[currentGardenId].climateZoneManual = true;
  saveData();
  refreshSettingsUI();
  renderSowingCalendar(document.getElementById('sowingSearch')?.value || '');
  if (selectedBed) renderSowingHint((selectedPlantOnCanvas && selectedPlantOnCanvas.name) || '');
}
function suggestClimateZoneFromLat(lat) {
  // Grobe Heuristik für Deutschland/Mitteleuropa: südlich = milder, nördlich/höher = rauer.
  if (lat <= 48.5) return 'mild';
  if (lat >= 51) return 'rau';
  return 'normal';
}
function adjustRange(r) {
  if (!r) return null;
  const off = CLIMATE_OFFSET[getClimateZone()] || 0;
  if (!off) return r;
  let a = r[0] + off, b = r[1] + off;
  a = Math.min(12, Math.max(1, a));
  b = Math.min(12, Math.max(1, b));
  return [a, b];
}

function monthRange(r) {
  if (!r) return null;
  if (r[0]===r[1]) return MONTH_NAMES[r[0]];
  return `${MONTH_NAMES[r[0]]}–${MONTH_NAMES[r[1]]}`;
}
function isInWindow(r, month) {
  if (!r) return false;
  return month >= r[0] && month <= r[1];
}
function sowingBadge(r, currentMonth) {
  if (!r) return '';
  const adj = adjustRange(r);
  const active = isInWindow(adj, currentMonth);
  return `<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:${active?'#7a9e72':'var(--parchment)'};color:${active?'#fff':'var(--bark)'};">${monthRange(adj)}</span>`;
}

function hasSeedInStock(plantName) {
  const n = (plantName||'').trim().toLowerCase();
  if (!n) return false;
  return seedInventory.some(e => (e.plant||'').trim().toLowerCase() === n);
}
const SEED_WARNING_DAYS = 21; // Frühwarnung: so viele Tage vor Beginn eines Aussaatfensters
function daysUntilRangeStart(r) {
  if (!r) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate = new Date(now.getFullYear(), r[0]-1, 1);
  let diff = Math.round((startDate - today) / 86400000);
  if (diff < -180) { // Fenster liegt Monate zurück -> gemeint ist das nächste Jahr
    startDate = new Date(now.getFullYear()+1, r[0]-1, 1);
    diff = Math.round((startDate - today) / 86400000);
  }
  return diff;
}
// Ermittelt, ob für eine Pflanze gerade Aussaatzeit ist oder in Kürze beginnt.
// Rückgabe: { active: bool, soonDays: Zahl|null } – soonDays nur gesetzt, wenn nicht aktiv
// und der Start eines der drei Fenster (Vorziehen/Direktsaat/Auspflanzen) innerhalb von
// SEED_WARNING_DAYS Tagen liegt.
function getSowingUrgency(rawRanges) {
  const currentMonth = new Date().getMonth()+1;
  const ranges = rawRanges.map(adjustRange).filter(Boolean);
  let active = false, soonDays = null;
  ranges.forEach(r => {
    if (isInWindow(r, currentMonth)) { active = true; return; }
    const d = daysUntilRangeStart(r);
    if (d !== null && d >= 0 && d <= SEED_WARNING_DAYS) {
      if (soonDays === null || d < soonDays) soonDays = d;
    }
  });
  return { active, soonDays };
}
function openSowingCalendar() {
  document.getElementById('sowingSearch').value='';
  renderSowingCalendar('');
  document.getElementById('sowingModal').style.display='flex';
}
function openNowOverview() {
  const currentMonth = new Date().getMonth()+1;

  // Pflanzbar: nutzt dieselben Aussaat-Daten und Klimazone-Anpassung wie der Aussaatkalender.
  // Zählt als "pflanzbar", wenn Direktsaat ODER Auspflanzen (nicht nur Vorziehen drinnen) passt,
  // da es hier um "was kann jetzt tatsächlich ins Beet" geht.
  const pflanzbar = Object.entries(SOWING)
    .filter(([name, s]) => {
      const direkt = adjustRange(s.direktsaat);
      const aus = adjustRange(s.auspflanzen);
      return isInWindow(direkt, currentMonth) || isInWindow(aus, currentMonth);
    })
    .map(([name]) => name)
    .sort((a,b)=>a.localeCompare(b));

  const erntbar = Object.entries(HARVEST_WINDOW)
    .filter(([name, r]) => isInHarvestWindow(r, currentMonth))
    .map(([name]) => name)
    .sort((a,b)=>a.localeCompare(b));

  function symFor(name) { const p = PLANTS.find(pl=>pl.name===name); return p ? p.sym : '🌿'; }
  function listeHtml(namen, leerText) {
    if (!namen.length) return `<p class="empty-state" style="padding:10px 0">${leerText}</p>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:6px">${namen.map(n =>
      `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--cream);border:1px solid var(--parchment);border-radius:20px;padding:5px 12px;font-size:0.8rem">${symFor(n)} ${n}</span>`
    ).join('')}</div>`;
  }

  document.getElementById('nowOverviewContent').innerHTML = `
    <div style="margin-bottom:16px">
      <h3 style="font-size:0.88rem;margin-bottom:8px;color:var(--moss)">🌱 Jetzt pflanzbar (${MONTH_NAMES[currentMonth]})</h3>
      ${listeHtml(pflanzbar, 'Aktuell ist für keine der bekannten Pflanzen Direktsaat oder Auspflanzen dran.')}
    </div>
    <div>
      <h3 style="font-size:0.88rem;margin-bottom:8px;color:#a8621a">🧺 Jetzt erntbar (${MONTH_NAMES[currentMonth]})</h3>
      ${listeHtml(erntbar, 'Für diesen Monat sind aktuell keine Ernten hinterlegt.')}
    </div>
  `;
  document.getElementById('nowModal').style.display='flex';
}
function sowingBadgeCell(r, currentMonth, plantName, phaseKey) {
  if (!r) return '<span style="color:var(--parchment)">–</span>';
  const adj = adjustRange(r);
  return `<span style="display:inline-flex;align-items:center;gap:3px">${sowingBadge(r,currentMonth)}<button onclick="createSowingReminder(${jsAttrStr(plantName)},'${phaseKey}',${adj[0]})" title="Erinnerung für Kalender-App erstellen (Alarm bei Fensterbeginn)" style="background:none;border:none;cursor:pointer;font-size:0.72rem;padding:0;opacity:0.7">📅</button><button onclick="createSowingReminderDirekt(${jsAttrStr(plantName)},'${phaseKey}',${adj[0]})" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.72rem;padding:0;opacity:0.7">📌</button></span>`;
}
function createSowingReminder(name, phaseKey, startMonth) {
  const now = new Date(); now.setHours(0,0,0,0);
  let start = new Date(now.getFullYear(), startMonth-1, 1);
  if ((now - start) > 180*86400000) start = new Date(now.getFullYear()+1, startMonth-1, 1);
  const phaseLabels = { vorziehen: 'Vorziehen (Voranzucht)', direktsaat: 'Direktsaat', auspflanzen: 'Auspflanzen', rueckschnitt: 'Rückschnitt' };
  const label = phaseLabels[phaseKey] || phaseKey;
  const icon = phaseKey === 'rueckschnitt' ? '✂️' : '🌱';
  const title = `${icon} ${label}: ${name}`;
  const desc = `Gartenplaner-Erinnerung: Zeit für "${label}" von ${name}.`;
  const ics = buildTaskICS(title, desc, start, 6, 0);
  downloadICS(ics, `aussaat-${name.toLowerCase().replace(/[^a-z0-9]+/gi,'-')}-${phaseKey}.ics`);
}
function createSowingReminderDirekt(name, phaseKey, startMonth) {
  const now = new Date(); now.setHours(0,0,0,0);
  let start = new Date(now.getFullYear(), startMonth-1, 1);
  if ((now - start) > 180*86400000) start = new Date(now.getFullYear()+1, startMonth-1, 1);
  const phaseLabels = { vorziehen: 'Vorziehen (Voranzucht)', direktsaat: 'Direktsaat', auspflanzen: 'Auspflanzen', rueckschnitt: 'Rückschnitt' };
  const label = phaseLabels[phaseKey] || phaseKey;
  const icon = phaseKey === 'rueckschnitt' ? '✂️' : '🌱';
  gartenTerminDirektEintragen(`${icon} ${label}: ${name}`, `Gartenplaner-Erinnerung: Zeit für "${label}" von ${name}.`, start);
}
// ---------- Aussaatkalender: Ansicht, Sortierung & Filter (geräte-lokal gemerkt) ----------
const SAAT_FARBEN = { vorziehen: '#7aa6c9', direktsaat: '#c99a3a', auspflanzen: '#6f9e4f' };
const SAAT_KATEGORIEN = [['Gemüse', ['Gemüse']], ['Kräuter', ['Kräuter']], ['Obst & Beeren', ['Obst', 'Beeren']], ['Blumen', ['Blumen']]];
let saatOpt = { ansicht: 'tabelle', sort: 'az', filter: 'alle', monat: null };
try { Object.assign(saatOpt, JSON.parse(localStorage.getItem('garten_saatOptionen') || '{}')); } catch (e) {}
saatOpt.monat = null; // Monatsansicht startet immer beim aktuellen Monat
function saatOptSetzen(k, v) {
  saatOpt[k] = v;
  try { localStorage.setItem('garten_saatOptionen', JSON.stringify({ ansicht: saatOpt.ansicht, sort: saatOpt.sort, filter: saatOpt.filter })); } catch (e) {}
  renderSowingCalendar(document.getElementById('sowingSearch')?.value || '');
}
function saatKategorie(name) {
  const p = PLANTS.find(x => x.name === name);
  const cat = p ? p.cat : '';
  const k = SAAT_KATEGORIEN.find(([, cats]) => cats.includes(cat));
  return k ? k[0] : 'Sonstige';
}
function saatImGarten() {
  const namen = new Set();
  getCurrentBeds().forEach(b => (b.plants || []).forEach(p => p.name && namen.add(p.name)));
  getCurrentFreiPflanzen().forEach(fp => fp.name && namen.add(fp.name));
  return namen;
}
// Monate bis zum nächsten Start einer Phase (0 = gerade aktiv) – für "Als Nächstes dran"
function saatMonateBisNaechstes(s) {
  const jetzt = new Date().getMonth() + 1;
  let best = 99;
  [s.vorziehen, s.direktsaat, s.auspflanzen].map(adjustRange).filter(Boolean).forEach(r => {
    const d = isInWindow(r, jetzt) ? 0 : ((r[0] - jetzt + 12) % 12);
    if (d < best) best = d;
  });
  return best;
}
function saatSteuerungRendern() {
  const box = document.getElementById('saatSteuerung');
  if (!box) return;
  const chip = (k, v, t) => '<button type="button" class="saat-chip' + (saatOpt[k] === v ? ' an' : '') + '" onclick="saatOptSetzen(\'' + k + '\',\'' + v + '\')">' + t + '</button>';
  const sortZeile = saatOpt.ansicht === 'monat' ? '' :
    '<div class="saat-reihe"><span class="saat-label">Sortieren</span>' + chip('sort', 'az', '🔤 A–Z') + chip('sort', 'naechstes', '⏳ Als Nächstes dran') + chip('sort', 'kategorie', '🗂️ Nach Art') + '</div>';
  box.innerHTML =
    '<div class="saat-reihe"><span class="saat-label">Ansicht</span>' + chip('ansicht', 'tabelle', '📋 Tabelle') + chip('ansicht', 'jahr', '📊 Jahresübersicht') + chip('ansicht', 'monat', '📅 Nach Monat') + '</div>' +
    sortZeile +
    '<div class="saat-reihe"><span class="saat-label">Zeigen</span>' + chip('filter', 'alle', 'Alle') + chip('filter', 'garten', '🌱 In meinem Garten') + chip('filter', 'aktiv', '✅ Jetzt dran') + chip('filter', 'saatgut', '🌰 Saatgut da') +
      SAAT_KATEGORIEN.map(([k]) => chip('filter', 'kat:' + k, k)).join('') + '</div>';
}
function saatEintraegeFiltern(filter) {
  const jetzt = new Date().getMonth() + 1;
  const imGarten = saatOpt.filter === 'garten' ? saatImGarten() : null;
  return Object.entries(SOWING).filter(([name, s]) => {
    if (filter && !name.toLowerCase().includes(filter)) return false;
    const f = saatOpt.filter;
    if (f === 'garten') return imGarten.has(name);
    if (f === 'aktiv') return getSowingUrgency([s.vorziehen, s.direktsaat, s.auspflanzen]).active;
    if (f === 'saatgut') return hasSeedInStock(name);
    if (f.indexOf('kat:') === 0) return saatKategorie(name) === f.slice(4);
    return true;
  });
}
function saatEintraegeSortieren(entries) {
  const az = (a, b) => a[0].localeCompare(b[0]);
  if (saatOpt.sort === 'naechstes') return entries.sort((a, b) => saatMonateBisNaechstes(a[1]) - saatMonateBisNaechstes(b[1]) || az(a, b));
  if (saatOpt.sort === 'kategorie') {
    const reihenfolge = SAAT_KATEGORIEN.map(k => k[0]).concat('Sonstige');
    return entries.sort((a, b) => reihenfolge.indexOf(saatKategorie(a[0])) - reihenfolge.indexOf(saatKategorie(b[0])) || az(a, b));
  }
  return entries.sort(az);
}
// Gruppen-Überschrift, wenn sich Art bzw. "dran in X Monaten" ändert
function saatGruppenTitel(name, s) {
  if (saatOpt.sort === 'kategorie') return saatKategorie(name);
  if (saatOpt.sort === 'naechstes') {
    const m = saatMonateBisNaechstes(s);
    if (m === 0) return '✅ Jetzt dran';
    if (m === 1) return 'Nächsten Monat (' + MONTH_NAMES[((new Date().getMonth() + 1) % 12) + 1] + ')';
    if (m > 12) return 'Ohne Termin';
    return 'In ' + m + ' Monaten (' + MONTH_NAMES[((new Date().getMonth() + m) % 12) + 1] + ')';
  }
  return null;
}
function renderSaatJahr(entries) {
  const jetzt = new Date().getMonth() + 1;
  let h = '<div class="saat-legende"><span style="--f:' + SAAT_FARBEN.vorziehen + '">🏠 Vorziehen</span><span style="--f:' + SAAT_FARBEN.direktsaat + '">🌍 Direktsaat</span><span style="--f:' + SAAT_FARBEN.auspflanzen + '">🌱 Auspflanzen</span></div>';
  h += '<div class="saat-jahr"><span></span>' + [1,2,3,4,5,6,7,8,9,10,11,12].map(m => '<span class="mon' + (m === jetzt ? ' jetzt' : '') + '">' + MONTH_NAMES[m].charAt(0) + '</span>').join('');
  let letzteGruppe = null;
  entries.forEach(([name, s]) => {
    const g = saatGruppenTitel(name, s);
    if (g && g !== letzteGruppe) { h += '<div class="saat-gruppe">' + g + '</div>'; letzteGruppe = g; }
    const plant = PLANTS.find(p => p.name === name);
    const phasen = ['vorziehen', 'direktsaat', 'auspflanzen'].map(k => [k, adjustRange(s[k])]);
    h += '<span class="name" title="' + escapeHtml(name) + '">' + (plant ? plant.sym : '🌿') + ' ' + escapeHtml(name) + '</span>';
    for (let m = 1; m <= 12; m++) {
      h += '<span class="zelle' + (m === jetzt ? ' jetzt' : '') + '">' + phasen.map(([k, r]) => '<i style="background:' + (r && isInWindow(r, m) ? SAAT_FARBEN[k] : 'transparent') + '"></i>').join('') + '</span>';
    }
  });
  return h + '</div>';
}
function renderSaatMonat(entries) {
  const jetzt = new Date().getMonth() + 1;
  const m = saatOpt.monat || jetzt;
  const vorher = m === 1 ? 12 : m - 1;
  const phasen = [['vorziehen', '🏠 Vorziehen (drinnen)'], ['direktsaat', '🌍 Direktsaat (draußen)'], ['auspflanzen', '🌱 Auspflanzen ins Beet']];
  const MONATE_LANG = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  let h = '<div class="saat-monat-kopf"><button type="button" onclick="saatOpt.monat=' + (m === 1 ? 12 : m - 1) + ';renderSowingCalendar(document.getElementById(\'sowingSearch\').value)" aria-label="Vorheriger Monat">‹</button><span>' + MONATE_LANG[m] + (m === jetzt ? ' (jetzt)' : '') + '</span><button type="button" onclick="saatOpt.monat=' + (m === 12 ? 1 : m + 1) + ';renderSowingCalendar(document.getElementById(\'sowingSearch\').value)" aria-label="Nächster Monat">›</button></div>';
  let irgendwas = false;
  phasen.forEach(([k, titel]) => {
    const liste = entries.filter(([, s]) => { const r = adjustRange(s[k]); return r && isInWindow(r, m); }).sort((a, b) => a[0].localeCompare(b[0]));
    if (!liste.length) return;
    irgendwas = true;
    h += '<div class="saat-phase"><h4>' + titel + ' <span style="font-weight:400;color:var(--bark)">· ' + liste.length + '</span></h4><div class="saat-pflanzen">' +
      liste.map(([name, s]) => {
        const r = adjustRange(s[k]);
        const neu = r && !isInWindow(r, vorher); // beginnt in diesem Monat
        const plant = PLANTS.find(p => p.name === name);
        return '<span class="saat-pflanze' + (neu ? ' neu' : '') + '" title="' + (neu ? 'Startet in diesem Monat' : 'Läuft schon seit ' + MONTH_NAMES[r[0]]) + '">' + (plant ? plant.sym : '🌿') + ' ' + escapeHtml(name) + '</span>';
      }).join('') + '</div></div>';
  });
  if (!irgendwas) h += '<div class="empty-state">In diesem Monat steht nichts an – Zeit für Planung, Werkzeugpflege und Saatgut-Bestellung. 🌰</div>';
  else h += '<p style="font-size:0.66rem;color:var(--bark)">Grün umrandet = startet in diesem Monat.</p>';
  return h;
}
function renderSowingCalendar(filter) {
  filter=(filter||'').trim().toLowerCase();
  saatSteuerungRendern();
  const currentMonth = new Date().getMonth()+1;
  const entries = saatEintraegeSortieren(saatEintraegeFiltern(filter));
  if (!entries.length) {
    document.getElementById('sowingCalendarContent').innerHTML='<div class="empty-state">Keine Treffer' + (saatOpt.filter !== 'alle' ? ' – Filter „Alle“ wählen, um alles zu sehen.' : '.') + '</div>';
    return;
  }
  if (saatOpt.ansicht === 'jahr') { document.getElementById('sowingCalendarContent').innerHTML = renderSaatJahr(entries); return; }
  if (saatOpt.ansicht === 'monat') { document.getElementById('sowingCalendarContent').innerHTML = renderSaatMonat(entries); return; }
  // Alle Zeilen teilen sich EIN gemeinsames Grid (statt je Zeile ein eigenes), damit die
  // Spaltenbreiten über die gesamte Liste hinweg konsistent ausgerichtet sind.
  let gridCells = `<div style="display:contents;font-size:0.7rem;font-weight:600;color:var(--bark)">
    <span style="padding:4px 8px;border-bottom:1px solid var(--parchment);margin-bottom:6px">Pflanze</span>
    <span style="padding:4px 8px;border-bottom:1px solid var(--parchment);margin-bottom:6px">🏠 Vorziehen</span>
    <span style="padding:4px 8px;border-bottom:1px solid var(--parchment);margin-bottom:6px">🌍 Direktsaat</span>
    <span style="padding:4px 8px;border-bottom:1px solid var(--parchment);margin-bottom:6px">🌱 Auspflanzen</span>
  </div>`;
  let letzteGruppe = null;
  entries.forEach(([name, s])=>{
    const gruppe = saatGruppenTitel(name, s);
    if (gruppe && gruppe !== letzteGruppe) { gridCells += '<div class="saat-gruppe">' + gruppe + '</div>'; letzteGruppe = gruppe; }
    const plant = PLANTS.find(p=>p.name===name);
    const sym = plant ? plant.sym : '🌿';
    const urgency = getSowingUrgency([s.vorziehen, s.direktsaat, s.auspflanzen]);
    const inStock = hasSeedInStock(name);
    const istZeitkritisch = urgency.active || urgency.soonDays !== null;
    // Halbtransparent, damit es im hellen UND dunklen Modus lesbar bleibt
    const rowBg = urgency.active ? 'rgba(122,158,114,0.22)' : (urgency.soonDays !== null ? 'rgba(201,154,58,0.16)' : 'transparent');

    // Saatgut-Status wird für JEDE Pflanze ohne Vorrat konsistent angezeigt (kleines Symbol
    // neben dem Namen), damit nicht mal ein "+ erfassen" da ist und mal nicht. Nur bei
    // zeitkritischen Pflanzen (Fenster aktiv/bald) gibt es zusätzlich den auffälligen,
    // vollbreiten Warnhinweis mit Erklärtext.
    const saatgutSymbol = inStock
      ? ' <span title="Saatgut vorhanden" style="font-size:0.7rem">🌰</span>'
      : ` <button onclick="openSeedForm(null,${jsAttrStr(name)})" title="Kein Saatgut auf Lager – zum Erfassen antippen" style="background:none;border:1px solid var(--parchment);color:var(--bark);border-radius:5px;padding:0px 5px;font-size:0.64rem;cursor:pointer;vertical-align:middle">+ Saatgut</button>`;

    const seedNote = (istZeitkritisch && !inStock)
      ? `<div style="grid-column:1/-1;font-size:0.68rem;color:#a8621a;display:flex;align-items:center;gap:6px;padding:2px 0 4px 26px">⚠️ ${urgency.active ? 'Saatzeit aktuell – noch kein Saatgut auf Lager' : `Saatzeit in ${urgency.soonDays} Tag(en) – noch kein Saatgut auf Lager`}</div>`
      : '';

    gridCells += `<div style="display:contents">
      <span style="font-size:0.82rem;padding:5px 8px;border-radius:7px 0 0 7px;background:${rowBg}">${sym} ${name}${saatgutSymbol}</span>
      <span style="padding:5px 8px;background:${rowBg}">${sowingBadgeCell(s.vorziehen,currentMonth,name,'vorziehen')}</span>
      <span style="padding:5px 8px;background:${rowBg}">${sowingBadgeCell(s.direktsaat,currentMonth,name,'direktsaat')}</span>
      <span style="padding:5px 8px;border-radius:0 7px 7px 0;background:${rowBg}">${sowingBadgeCell(s.auspflanzen,currentMonth,name,'auspflanzen')}</span>
      ${seedNote}
    </div>`;
  });
  document.getElementById('sowingCalendarContent').innerHTML =
    `<p style="font-size:0.68rem;color:var(--bark);margin-bottom:8px">Grün hinterlegt = aktuell passender Zeitraum (${MONTH_NAMES[currentMonth]})${getClimateZone()!=='normal'?` · Zeiten an ${CLIMATE_LABEL[getClimateZone()]}-Klima angepasst`:''}</p>
    <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;row-gap:2px">${gridCells}</div>`;
}

function renderSowingHint(plantName, targetId) {
  targetId = targetId || 'sowingHint';
  const box = document.getElementById(targetId);
  if (!box) return;
  const s = SOWING[plantName];
  if (!s) {
    box.style.display = 'none';
    return;
  }
  const currentMonth = new Date().getMonth()+1;
  const vor = adjustRange(s.vorziehen), dir = adjustRange(s.direktsaat), aus = adjustRange(s.auspflanzen);
  const urgency = getSowingUrgency([s.vorziehen, s.direktsaat, s.auspflanzen]);
  const anyActive = urgency.active;
  const parts = [];
  if (vor) parts.push(`🏠 Vorziehen: ${monthRange(vor)} <button onclick="createSowingReminder(${jsAttrStr(plantName)},'vorziehen',${vor[0]})" title="Erinnerung für Kalender-App erstellen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📅</button><button onclick="createSowingReminderDirekt(${jsAttrStr(plantName)},'vorziehen',${vor[0]})" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📌</button>`);
  if (dir) parts.push(`🌍 Direktsaat: ${monthRange(dir)} <button onclick="createSowingReminder(${jsAttrStr(plantName)},'direktsaat',${dir[0]})" title="Erinnerung für Kalender-App erstellen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📅</button><button onclick="createSowingReminderDirekt(${jsAttrStr(plantName)},'direktsaat',${dir[0]})" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📌</button>`);
  if (aus) parts.push(`🌱 Auspflanzen: ${monthRange(aus)} <button onclick="createSowingReminder(${jsAttrStr(plantName)},'auspflanzen',${aus[0]})" title="Erinnerung für Kalender-App erstellen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📅</button><button onclick="createSowingReminderDirekt(${jsAttrStr(plantName)},'auspflanzen',${aus[0]})" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7">📌</button>`);
  if (!parts.length) { box.style.display='none'; return; }
  const zone = getClimateZone();
  const zoneNote = zone!=='normal' ? ` · ${CLIMATE_LABEL[zone]}-Klima berücksichtigt` : '';
  const needsSeed = (urgency.active || urgency.soonDays !== null) && !hasSeedInStock(plantName);
  const stockNote = needsSeed
    ? `<br><span style="color:#a8621a">⚠️ ${urgency.active ? 'Kein Saatgut auf Lager' : `Saatzeit in ${urgency.soonDays} Tag(en) – noch kein Saatgut auf Lager`} – <span style="text-decoration:underline;cursor:pointer" onclick="openSeedForm(null,${jsAttrStr(plantName)})">jetzt erfassen</span></span>`
    : '';
  box.innerHTML=`<div style="font-size:0.76rem;padding:10px 12px;border-radius:9px;background:${anyActive?'#f0f8ec':'#fff8ec'};border-left:4px solid ${anyActive?'#4a6f5c':'#c47a10'};color:#2c2415">
    <strong>${anyActive?'✅ Jetzt guter Zeitpunkt':'⚠️ Aktuell nicht die ideale Pflanzzeit'}</strong>${zoneNote}<br>
    <span style="color:#5a4832">${parts.join(' · ')}</span>${stockNote}
  </div>`;
  box.style.display='block';
}
// ==================== STANDORT & BEDINGUNGEN je Pflanze ====================
// Kompakte Angaben, was die Pflanze bevorzugt – Grundlage gegen Kümmerwuchs und Krankheiten.
// [Licht, Wasser, Nährstoffe, Boden, Klima/Luft, Krankheiten vorbeugen]
// Licht: V=vollsonnig, S=sonnig, SH=sonnig–halbschattig, H=halbschattig, HS=halbschattig–schattig
// Wasser: w=wenig/trocken, m=mäßig, v=viel/gleichmäßig feucht · Nährstoffe: S=Starkzehrer, M=Mittelzehrer, W=Schwachzehrer
// PFLANZEN_BEDINGUNGEN → pflanzendaten.js
// PFLANZEN_BEDINGUNGEN_ALIAS → pflanzendaten.js
// Findet zu einem frei eingegebenen Pflanzennamen den passenden Schlüssel einer Tabelle
// (z.B. "Birne", "Birnenbaum" -> "Birnbaum"; "Feigenbaum" -> "Feige"; "Kirsche" -> "Kirschbaum").
function pflanzenSchluesselFinden(name, tabelle) {
  if (!name || !tabelle) return null;
  const n = String(name).trim();
  if (tabelle[n]) return n;
  const schluessel = Object.keys(tabelle);
  const finde = (kandidat) => schluessel.find(k => k.toLowerCase() === kandidat);
  const klein = n.toLowerCase();
  const stamm = klein.replace(/e?n?baum$/, '');          // birnenbaum -> birn, feigenbaum -> feig, apfelbaum -> apfel
  const kandidaten = [klein, PFLANZEN_BEDINGUNGEN_ALIAS[klein] && PFLANZEN_BEDINGUNGEN_ALIAS[klein].toLowerCase(),
    klein + 'baum', klein + 'nbaum', klein.replace(/e$/, '') + 'baum',
    stamm, stamm + 'e', stamm + 'baum', stamm + 'ebaum'];
  for (const k of kandidaten) { if (!k) continue; const t = finde(k); if (t) return t; }
  // Alias-Ziel kann in dieser Tabelle anders heißen (z.B. "Pflaumenbaum" vs. "Pflaume")
  const alias = PFLANZEN_BEDINGUNGEN_ALIAS[klein] || PFLANZEN_BEDINGUNGEN_ALIAS[stamm + 'e'];
  if (alias) { const t = finde(alias.toLowerCase()) || finde(alias.toLowerCase().replace(/n?baum$/, '')); if (t) return t; }
  return null;
}
function pflanzenBedingungenFinden(name) {
  const k = pflanzenSchluesselFinden(name, PFLANZEN_BEDINGUNGEN);
  return k ? PFLANZEN_BEDINGUNGEN[k] : null;
}
const BED_LICHT = { V: ['☀️', 'Vollsonnig'], S: ['☀️', 'Sonnig'], SH: ['🌤️', 'Sonnig bis halbschattig'], H: ['⛅', 'Halbschattig'], HS: ['☁️', 'Halbschattig bis schattig'] };
const BED_WASSER = { w: ['🌵', 'Wenig Wasser, eher trocken'], m: ['💧', 'Mäßig gießen'], v: ['💦', 'Gleichmäßig feucht halten'] };
const BED_NAEHR = { S: ['🍽️', 'Starkzehrer'], M: ['🥣', 'Mittelzehrer'], W: ['🥄', 'Schwachzehrer'] };
function renderBedingungenHint(plantName, targetId) {
  const box = document.getElementById(targetId);
  if (!box) return;
  const b = pflanzenBedingungenFinden(plantName);
  const lexLink = (plantName || '').trim() ? '<button type="button" class="lex-panel-link" onclick="lexikonOeffnen(' + jsAttrStr(plantName.trim()).replace(/"/g, '&quot;') + ')">📖 Alles über ' + escapeHtml(plantName.trim()) + ' ›</button>' : '';
  const gift = giftHinweisHtml(plantName);
  if (!b) { box.innerHTML = gift + lexLink; box.style.display = gift || lexLink ? 'block' : 'none'; return; }
  const [licht, wasser, naehr, boden, klima, vorbeugen] = b;
  const chip = (arr) => arr ? '<span class="bed-chip">' + arr[0] + ' ' + arr[1] + '</span>' : '';
  const plantDef = (typeof PLANTS !== 'undefined') ? PLANTS.find(p => p.name === plantName) : null;
  box.innerHTML = gift + '<div class="bedingungen-box">' +
    '<div class="bedingungen-titel">🌱 Bevorzugt</div>' +
    '<div class="bed-chips">' + chip(BED_LICHT[licht]) + chip(BED_WASSER[wasser]) + chip(BED_NAEHR[naehr]) +
      (plantDef && plantDef.frostTender ? '<span class="bed-chip">❄️ Frostempfindlich</span>' : '') + '</div>' +
    '<div class="bed-zeile"><b>🪨 Boden:</b> ' + escapeHtml(boden) + '</div>' +
    '<div class="bed-zeile"><b>🌬️ Klima &amp; Lage:</b> ' + escapeHtml(klima) + '</div>' +
    '<div class="bed-zeile bed-vorbeugen"><b>🛡️ Gesund halten:</b> ' + escapeHtml(vorbeugen) + '</div>' +
  '</div>' + lexLink;
  box.style.display = 'block';
}

function renderRueckschnittHint(plantName, targetId) {
  const box = document.getElementById(targetId);
  if (!box) return;
  const info = RUECKSCHNITT[pflanzenSchluesselFinden(plantName, RUECKSCHNITT) || plantName];
  if (!info || !info.monate) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const currentMonth = new Date().getMonth() + 1;
  const aktiv = isInWindow(info.monate, currentMonth);
  const zeitraum = monthRange(info.monate);
  box.style.display = 'block';
  box.innerHTML = `<div style="font-size:0.76rem;padding:10px 12px;border-radius:9px;background:${aktiv?'#f0f8ec':'#fdf3e6'};border-left:4px solid ${aktiv?'#4a6f5c':'#a8763e'};color:#2c2415">
    <strong>✂️ Rückschnitt: ${zeitraum}</strong>${aktiv ? ' <span style="color:#4a6f5c;font-weight:700;">· jetzt dran</span>' : ''}
    <button onclick="createSowingReminder(${jsAttrStr(plantName)},'rueckschnitt',${info.monate[0]})" title="Erinnerung für Kalender-App erstellen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7;margin-left:4px;">📅</button><button onclick="createSowingReminderDirekt(${jsAttrStr(plantName)},'rueckschnitt',${info.monate[0]})" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.7rem;padding:0;opacity:0.7;">📌</button>
    <br><span style="color:#5a4832">${info.hinweis}</span>
  </div>`;
}

// ==================== SORTENDATENBANK ====================
// BLATTPROBLEME → pflanzendaten.js

// PFLANZEN_IDEEN → pflanzendaten.js

// MULCH_ARTEN → pflanzendaten.js

// ==================== PFLANZEN-STECKBRIEFE ====================
// Kuratierte Auswahl der häufigsten Garten-Pflanzen (nicht alle ~100+ aus PLANTS,
// bei Bedarf einzeln erweiterbar). Key = exakter Name aus PLANTS.
// PLANT_STECKBRIEFE → pflanzendaten.js
function populateSteckbriefSelect() {
  const sel = document.getElementById('steckbriefSel');
  if (!sel) return;
  const names = Object.keys(PLANT_STECKBRIEFE).sort((a,b) => a.localeCompare(b, 'de'));
  const prev = sel.value;
  sel.innerHTML = names.map(n => {
    const p = PLANTS.find(pl => pl.name === n);
    const sym = p ? p.sym : '🌱';
    return `<option value="${escapeHtml(n)}">${sym} ${escapeHtml(n)}</option>`;
  }).join('');
  if (prev && names.includes(prev)) sel.value = prev;
}
function renderSteckbrief() {
  const sel = document.getElementById('steckbriefSel');
  const box = document.getElementById('steckbriefBox');
  if (!sel || !box) return;
  const sb = PLANT_STECKBRIEFE[sel.value];
  if (!sb) { box.innerHTML = '<div class="empty-state">Kein Steckbrief vorhanden.</div>'; return; }
  const rows = [
    ['☀️ Standort', sb.standort], ['🌍 Boden', sb.boden], ['🌱 Aussaat/Pflanzzeit', sb.aussaat],
    ['🧺 Ernte', sb.ernte], ['🧰 Pflege', sb.pflege],
  ];
  box.innerHTML = `
    <div style="padding:10px 12px;border:1px solid var(--parchment);border-radius:8px">
      ${rows.map(([label, val]) => `<div style="margin-bottom:6px;font-size:0.74rem"><strong>${label}:</strong> ${escapeHtml(val)}</div>`).join('')}
      ${sb.besonderheit ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--parchment);font-size:0.72rem;color:var(--moss)"><strong>💡 Besonderheit:</strong> ${escapeHtml(sb.besonderheit)}</div>` : ''}
    </div>`;
}


function renderMulch() {
  const box = document.getElementById('mulchBox');
  if (!box) return;
  box.innerHTML = MULCH_ARTEN.map(m => `
    <div style="padding:8px 10px;border:1px solid var(--parchment);border-radius:8px">
      <div style="font-weight:700;font-size:0.8rem">${escapeHtml(m.name)}</div>
      <div style="font-size:0.7rem;color:var(--bark);margin-top:3px"><strong>Geeignet für:</strong> ${escapeHtml(m.geeignet)}</div>
      <div style="font-size:0.7rem;color:var(--moss);margin-top:3px">${escapeHtml(m.hinweis)}</div>
    </div>`).join('');
}

function renderBlattprobleme() {
  const box = document.getElementById('blattproblemeBox');
  if (!box) return;
  box.innerHTML = BLATTPROBLEME.map(p => `
    <div style="padding:8px;border:1px solid var(--parchment);border-radius:8px;text-align:center">
      <div style="font-size:1.5rem">${p.icon}</div>
      <div style="font-weight:700;font-size:0.76rem;margin-top:2px">${escapeHtml(p.titel)}</div>
      <div style="font-size:0.68rem;color:var(--bark);margin-top:4px"><strong>Ursache:</strong> ${escapeHtml(p.ursache)}</div>
      <div style="font-size:0.68rem;color:var(--moss);margin-top:3px"><strong>Fix:</strong> ${escapeHtml(p.fix)}</div>
    </div>`).join('');
}

function renderPflanzenIdeen() {
  const sel = document.getElementById('pflanzenIdeenSel');
  const box = document.getElementById('pflanzenIdeenBox');
  if (!sel || !box) return;
  const liste = PFLANZEN_IDEEN[sel.value] || [];
  box.innerHTML = liste.map(p => `
    <div style="padding:8px;border:1px solid var(--parchment);border-radius:8px">
      <div style="font-weight:700;font-size:0.76rem">${escapeHtml(p.name)}</div>
      <div style="font-size:0.68rem;color:var(--bark);margin-top:3px">${escapeHtml(p.info)}</div>
    </div>`).join('');
}

function switchVdbTab(id) {
  ['sorten','probleme','ideen','mulch','steckbrief'].forEach(t => {
    const content = document.getElementById('vdbTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (content) content.classList.toggle('active', t === id);
  });
  document.querySelectorAll('#varietyModal .tabs .tab').forEach((el, i) => {
    const isActive = ['sorten','probleme','ideen','mulch','steckbrief'][i] === id;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  if (id === 'probleme') renderBlattprobleme();
  if (id === 'ideen') renderPflanzenIdeen();
  if (id === 'mulch') renderMulch();
  if (id === 'steckbrief') { populateSteckbriefSelect(); renderSteckbrief(); }
}

let varietyDB = {}; // { plantName: [ {id,name,rating,source,harvest,notes} ] }
function loadVarieties() {
  try { varietyDB = JSON.parse(localStorage.getItem('gartenplaner_varieties') || '{}') || {}; } catch(e) { varietyDB = {}; }
}
function saveVarieties() {
  try { localStorage.setItem('gartenplaner_varieties', JSON.stringify(varietyDB)); }
  catch(e) { showTempStatus('⚠ Sortendatenbank konnte nicht gespeichert werden.', 6); }
}
function starString(n) { n = +n||0; return n>0 ? '⭐'.repeat(n) : '–'; }
function populateVarietyPlantSelect(preselect) {
  const sel = document.getElementById('varietyPlantSel');
  if (!sel) return;
  const names = PLANTS.map(p=>p.name).sort((a,b)=>a.localeCompare(b,'de'));
  sel.innerHTML = names.map(n=>{
    const plant = PLANTS.find(p=>p.name===n);
    return `<option value="${escapeHtml(n)}">${plant.sym} ${escapeHtml(n)}</option>`;
  }).join('');
  if (preselect && names.includes(preselect)) sel.value = preselect;
}
function openVarietyDB(plantName) {
  populateVarietyPlantSelect(plantName);
  resetVarietyForm();
  renderVarietyList();
  switchVdbTab('sorten');
  document.getElementById('varietyModal').style.display = 'flex';
}
function renderVarietyDatalist(plantName) {
  const dl = document.getElementById('varietyDatalist');
  if (!dl) return;
  const list = (varietyDB[plantName] || []);
  dl.innerHTML = list.map(v=>`<option value="${escapeHtml(v.name)}">`).join('');
}
function renderVarietyList() {
  const plantName = document.getElementById('varietyPlantSel').value;
  const box = document.getElementById('varietyListBox');
  const list = varietyDB[plantName] || [];
  if (!list.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Sorten für diese Pflanze eingetragen.</div>';
    return;
  }
  box.innerHTML = list.map(v => `
    <div style="padding:8px 10px;border:1px solid var(--parchment);border-radius:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <strong style="font-size:0.84rem">${escapeHtml(v.name)}</strong>
        <span style="font-size:0.78rem">${starString(v.rating)}</span>
      </div>
      ${v.source ? `<div style="font-size:0.72rem;color:var(--bark)">📦 ${escapeHtml(v.source)}</div>` : ''}
      ${v.harvest ? `<div style="font-size:0.72rem;color:var(--bark)">🧺 ${escapeHtml(v.harvest)}</div>` : ''}
      ${v.notes ? `<div style="font-size:0.74rem;margin-top:4px">${escapeHtml(v.notes).replace(/\n/g,'<br>')}</div>` : ''}
      <div style="margin-top:6px;display:flex;gap:6px">
        <button class="btn-secondary" style="font-size:0.68rem;padding:3px 8px" onclick="editVariety('${v.id}')">✏️ Bearbeiten</button>
        <button class="btn-secondary" style="font-size:0.68rem;padding:3px 8px;color:#c05030;border-color:#c05030" onclick="deleteVariety('${v.id}')">🗑 Löschen</button>
      </div>
    </div>`).join('');
}
function resetVarietyForm() {
  document.getElementById('varietyEditId').value = '';
  document.getElementById('varietyFormTitle').textContent = '➕ Neue Sorte';
  document.getElementById('varietyName').value = '';
  document.getElementById('varietyRating').value = '0';
  document.getElementById('varietySource').value = '';
  document.getElementById('varietyHarvest').value = '';
  document.getElementById('varietyNotes').value = '';
  document.getElementById('varietyCancelEditBtn').style.display = 'none';
}
function editVariety(id) {
  const plantName = document.getElementById('varietyPlantSel').value;
  const v = (varietyDB[plantName]||[]).find(x=>x.id===id);
  if (!v) return;
  document.getElementById('varietyEditId').value = v.id;
  document.getElementById('varietyFormTitle').textContent = '✏️ Sorte bearbeiten';
  document.getElementById('varietyName').value = v.name||'';
  document.getElementById('varietyRating').value = String(v.rating||0);
  document.getElementById('varietySource').value = v.source||'';
  document.getElementById('varietyHarvest').value = v.harvest||'';
  document.getElementById('varietyNotes').value = v.notes||'';
  document.getElementById('varietyCancelEditBtn').style.display = 'inline-block';
}
function saveVarietyForm() {
  const plantName = document.getElementById('varietyPlantSel').value;
  const name = document.getElementById('varietyName').value.trim();
  if (!name) { showTempStatus('⚠ Bitte einen Sortennamen eintragen.', 5); return; }
  if (!varietyDB[plantName]) varietyDB[plantName] = [];
  const id = document.getElementById('varietyEditId').value;
  const data = {
    name,
    rating: +document.getElementById('varietyRating').value || 0,
    source: document.getElementById('varietySource').value.trim(),
    harvest: document.getElementById('varietyHarvest').value.trim(),
    notes: document.getElementById('varietyNotes').value.trim(),
  };
  if (id) {
    const existing = varietyDB[plantName].find(x=>x.id===id);
    if (existing) Object.assign(existing, data);
  } else {
    data.id = 'var_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    varietyDB[plantName].push(data);
  }
  saveVarieties();
  resetVarietyForm();
  renderVarietyList();
  renderVarietyDatalist(plantName);
}
function deleteVariety(id) {
  const plantName = document.getElementById('varietyPlantSel').value;
  if (!varietyDB[plantName]) return;
  const liste = varietyDB[plantName];
  const index = liste.findIndex(x => x.id === id);
  if (index === -1) return;
  const entfernt = liste[index];
  liste.splice(index, 1);
  saveVarieties();
  renderVarietyList();
  renderVarietyDatalist(plantName);
  zeigeLoeschToast('Sorte gelöscht: „' + (entfernt.name || '') + '"', () => {
    liste.splice(index, 0, entfernt);
    saveVarieties();
    renderVarietyList();
    renderVarietyDatalist(plantName);
  });
}

// ==================== WETTER ====================
let weatherCache = null; // { lat, lon, fetchedAt, current, daily }
function getWeatherSettings() {
  return gardens[currentGardenId]?.weatherLoc || null;
}
function requestWeatherLocation() {
  if (!navigator.geolocation) {
    const wsb1 = document.getElementById('weatherSettingsBox'); if (wsb1) wsb1.innerHTML = '⚠ Standortfreigabe wird von diesem Browser nicht unterstützt.';
    return;
  }
  const wsb2 = document.getElementById('weatherSettingsBox'); if (wsb2) wsb2.textContent = 'Standort wird abgefragt…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      if (gardens[currentGardenId]) {
        gardens[currentGardenId].weatherLoc = loc;
        if (!gardens[currentGardenId].climateZoneManual) {
          setClimateZone(suggestClimateZoneFromLat(loc.lat), false);
        }
      }
      saveData();
      fetchWeather(loc, true);
    },
    (err) => {
      const wsb3 = document.getElementById('weatherSettingsBox'); if (wsb3) wsb3.innerHTML = '⚠ Standort konnte nicht ermittelt werden. Bitte Standortfreigabe im Browser erlauben.';
    },
    { timeout: 10000 }
  );
}
const WEATHER_PAST_DAYS = 2;
async function fetchWeather(loc, forceRefresh) {
  if (!loc) { loc = getWeatherSettings(); }
  if (!loc) return null;
  const now = Date.now();
  if (!forceRefresh && weatherCache && weatherCache.lat===loc.lat && weatherCache.lon===loc.lon && (now - weatherCache.fetchedAt) < 60*60*1000) {
    renderWeatherUI(weatherCache);
    persistiereWetterHinweise();
    return weatherCache;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code,soil_temperature_6cm,soil_moisture_1_to_3cm&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,sunshine_duration,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,et0_fao_evapotranspiration&past_days=${WEATHER_PAST_DAYS}&forecast_days=3&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Wetterdienst nicht erreichbar');
    const data = await res.json();
    weatherCache = { lat: loc.lat, lon: loc.lon, fetchedAt: now, current: data.current, daily: data.daily, hourly: data.hourly };
    renderWeatherUI(weatherCache);
    persistiereWetterHinweise();
    return weatherCache;
  } catch (e) {
    const wsb4 = document.getElementById('weatherSettingsBox'); if (wsb4) wsb4.innerHTML = '⚠ Wetterdaten konnten nicht geladen werden (keine Internetverbindung?).';
    return null;
  }
}
// Speichert eine kompakte Zusammenfassung der aktuellen Wetterwarnungen, damit die
// Übersicht-Startseite sie anzeigen kann, ohne selbst einen Wetterabruf durchführen zu
// müssen. Bewusst NICHT synchronisiert (geräte-/standortspezifisch, schnell veraltet).
function persistiereWetterHinweise() {
  try {
    const hinweise = {
      aktualisiertAm: new Date().toISOString(),
      frost: !!getUpcomingFrostWarning(),
      hitze: !!getUpcomingHeatWarning(),
      starkregen: !!getUpcomingHeavyRainWarning(),
      hagel: !!getUpcomingHailWarning(),
    };
    localStorage.setItem('gartenplaner_wetterHinweise', JSON.stringify(hinweise));
  } catch (e) {}
}
function weatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫';
  if (code >= 51 && code <= 67) return '🌧';
  if (code >= 71 && code <= 77) return '🌨';
  if (code >= 80 && code <= 82) return '🌦';
  if (code >= 95) return '⛈';
  return '🌡';
}
function renderWeatherUI(w) {
  const settingsBox = document.getElementById('weatherSettingsBox');
  const sbBox = document.getElementById('sbWeather');
  if (!w || !w.current) {
    if (settingsBox) settingsBox.textContent = 'Noch kein Standort hinterlegt.';
    if (sbBox) sbBox.textContent = '';
    return;
  }
  const cur = w.current;
  const frostWarn = getUpcomingFrostWarning();
  const heatWarn = getUpcomingHeatWarning();
  const heavyRainWarn = getUpcomingHeavyRainWarning();
  const hailWarn = getUpcomingHailWarning();
  const icon = frostWarn ? '❄️' : weatherIcon(cur.weather_code);
  if (sbBox) sbBox.textContent = `${icon} ${Math.round(cur.temperature_2m)}°C`;
  if (settingsBox) {
    const allDays = w.daily?.time || [];
    const recentRain = getRecentRainMm(2);
    const rows = allDays.slice(WEATHER_PAST_DAYS).map((d, i) => {
      const date = new Date(d);
      const label = i===0 ? 'Heute' : i===1 ? 'Morgen' : date.toLocaleDateString('de-DE',{weekday:'short'});
      const idx = WEATHER_PAST_DAYS + i;
      const rain = w.daily.precipitation_sum[idx];
      const prob = w.daily.precipitation_probability_max[idx];
      const tmax = Math.round(w.daily.temperature_2m_max[idx]);
      const tmin = Math.round(w.daily.temperature_2m_min[idx]);
      const frostDay = tmin <= FROST_THRESHOLD ? ' ❄️' : (tmin <= FROST_RISK_THRESHOLD ? ' 🧊' : '');
      const heatDay = tmax >= HEAT_THRESHOLD ? ' 🌡️' : '';
      const dailyCode = w.daily.weather_code ? w.daily.weather_code[idx] : null;
      const hailDay = (dailyCode === 96 || dailyCode === 99) ? ' ⛈' : '';
      return `<div style="display:flex;justify-content:space-between;gap:6px;padding:3px 0">
        <span>${label}</span><span>${tmin}–${tmax}°C${frostDay}${heatDay}${hailDay}</span><span>${rain>0?`🌧 ${rain.toFixed(1)}mm (${prob}%)`:'trocken'}</span>
      </div>`;
    }).join('');
    settingsBox.innerHTML = wetterWarnBanner() + `<div style="margin-bottom:4px">${icon} Aktuell ${Math.round(cur.temperature_2m)}°C, Niederschlag ${cur.precipitation} mm</div>
      <div style="font-size:0.7rem;color:var(--bark);margin-bottom:6px">Regen letzte 2 Tage: ${recentRain.toFixed(1)} mm – fließt automatisch in den 🚿 Gießplan mit ein.</div>
      ${rows}
      <button class="btn-secondary" onclick="fetchWeather(null,true)" style="margin-top:6px">🔄 Aktualisieren</button>`;
  }
}
function wetterWarnBanner() {
  const frostWarn = getUpcomingFrostWarning();
  const heatWarn = getUpcomingHeatWarning();
  const heavyRainWarn = getUpcomingHeavyRainWarning();
  const hailWarn = getUpcomingHailWarning();
    let frostBanner = '';
  if (frostWarn) {
    const isFrost = frostWarn.worst.level === 'frost';
    const dayList = frostWarn.days.map(d => `${d.label} ${Math.round(d.tmin)}°C`).join(', ');
    frostBanner = `<div style="font-size:0.74rem;padding:6px 9px;border-radius:7px;background:${isFrost?'#e3ecfb':'#f0f4fb'};border-left:3px solid ${isFrost?'#4a6fa5':'#8ea4c9'};margin-bottom:8px;color:#2c2415">
      ❄️ <strong>${isFrost?'Frost erwartet':'Frostgefahr'}:</strong> ${dayList} – frostempfindliche Pflanzen abdecken oder reinholen${winterschutzListe().length ? ' (🧤 Liste unter „Heute“)' : ''}.
    </div>`;
  }
  let heatBanner = '';
  if (heatWarn) {
    const dayList = heatWarn.days.map(d => `${d.label} ${Math.round(d.tmax)}°C`).join(', ');
    heatBanner = `<div style="font-size:0.74rem;padding:6px 9px;border-radius:7px;background:#fdf3e0;border-left:3px solid #d4880a;margin-bottom:8px;color:#2c2415">
      🌡️ <strong>Hitze erwartet:</strong> ${dayList} – morgens/abends gießen statt mittags, Mulch hilft gegen Austrocknung, empfindliche Pflanzen ggf. beschatten. Tränken für Insekten, Vögel &amp; Igel täglich frisch füllen.
    </div>`;
  }
  let heavyRainBanner = '';
  if (heavyRainWarn) {
    const dayList = heavyRainWarn.days.map(d => `${d.label} ${Math.round(d.sum)}mm`).join(', ');
    heavyRainBanner = `<div style="font-size:0.74rem;padding:6px 9px;border-radius:7px;background:#e3f0fb;border-left:3px solid #5b8bb5;margin-bottom:8px;color:#2c2415">
      🌧️ <strong>Starkregen erwartet:</strong> ${dayList} – hohe Beete/Töpfe auf Staunässe prüfen, empfindliche Jungpflanzen ggf. schützen.
    </div>`;
  }
  let hailBanner = '';
  if (hailWarn) {
    const dayList = hailWarn.days.map(d => d.label).join(', ');
    hailBanner = `<div style="font-size:0.74rem;padding:6px 9px;border-radius:7px;background:#e3f0fb;border-left:3px solid #5b8bb5;margin-bottom:8px;color:#2c2415">
      🧊 <strong>Hagelgefahr:</strong> ${dayList} – Vlies, Kisten oder Folie zum Abdecken empfindlicher Pflanzen bereitlegen.
    </div>`;
  }
  return frostBanner + heatBanner + heavyRainBanner + hailBanner;
}
// ==================== PFLANZEN-BEWERTUNG (Pflanze + essbare Teile, Sorten-Vergleich) ====================
// Gleiche Logik wie im Gaming-Modul: Einzelpunkte 1–5 ★, nur bewertete Punkte zählen in den
// Durchschnitt; ohne Einzelpunkte kann der Abschnitt direkt bewertet werden.
// Gespeichert am einzelnen Pflanzen-Objekt (Beet-Pflanze oder Einzelpflanze):
//   plant.bewertungDetail = { pflanze:{}, essbar:{}, manuellPflanze, manuellEssbar, nochmal, boden, notiz, jahr, essbarZeigen }
//   plant.bewertung       = Gesamtwert (für Listen und Karten)
const GB_PFLANZE = [
  { id: 'wuchs', label: 'Wuchs/Form' }, { id: 'bluete', label: 'Blüte/Farbe' }, { id: 'optik', label: 'Optik' },
  { id: 'robust', label: 'Robustheit' }, { id: 'pflege', label: 'Pflege\u00adleicht' }, { id: 'schnitt', label: 'Schnitt\u00adverträglichkeit' },
];
const GB_ESSBAR = [
  { id: 'ertrag', label: 'Ertrag' }, { id: 'geschmack', label: 'Geschmack' }, { id: 'biss', label: 'Biss/Festigkeit' },
  { id: 'saftig', label: 'Saftigkeit' }, { id: 'mundgefuehl', label: 'Mundgefühl' }, { id: 'lager', label: 'Lager\u00adfähigkeit' },
  { id: 'vielseitig', label: 'Vielseitigkeit' },
];
const GB_BODEN = [
  ['', '– nicht angegeben –'], ['humus', '🌱 Gartenerde/Humus'], ['lehm', '🧱 Lehmig/schwer'], ['sand', '⏳ Sandig/leicht'],
  ['hochbeet', '🪵 Hochbeet-Erde'], ['kuebel', '🪴 Kübel/Topf'], ['sonstiges', '📦 Sonstiges'],
];
const GB_ESSBAR_KATEGORIEN = ['Gemüse', 'Kräuter', 'Obst', 'Beeren'];

function gbRund(n) { return Math.round(n * 10) / 10; }
function gbText(n) { return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function gbAbschnitt(werte, manuell) {
  const w = Object.values(werte || {}).filter(x => x >= 1 && x <= 5);
  return w.length ? gbRund(w.reduce((a, b) => a + b, 0) / w.length) : (manuell || 0);
}
function gbGesamt(d) {
  if (!d) return 0;
  const teile = [gbAbschnitt(d.pflanze, d.manuellPflanze), gbAbschnitt(d.essbar, d.manuellEssbar)].filter(x => x > 0);
  return teile.length ? gbRund(teile.reduce((a, b) => a + b, 0) / teile.length) : 0;
}
function gbIstEssbar(plant) {
  const d = plant.bewertungDetail || {};
  if (d.essbarZeigen === true) return true;
  if (d.essbarZeigen === false) return false;
  const stamm = PLANTS.find(p => p.name === (plant.name || '').trim());
  return !!((stamm && GB_ESSBAR_KATEGORIEN.includes(stamm.cat)) || (plant.harvests || []).length || Object.keys(d.essbar || {}).length);
}
function gbSterneHtml(wert, groesse) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const f = Math.round(Math.max(0, Math.min(1, wert - (i - 1))) * 100);
    html += `<span class="gb-stern" style="--f:${f}%;font-size:${groesse || '1rem'}">★</span>`;
  }
  return html;
}
// Holt die gerade geöffnete Pflanze samt Standort, je nach Panel
function gbAktuellePflanze(prefix) {
  if (prefix === 'pp') {
    if (!activePlantBedId) return null;
    const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
    const plant = bed && bed.plants[activePlantBedId.idx];
    return plant ? { plant, standort: plant.location || '', bed } : null;
  }
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  return fp ? { plant: fp, standort: fp.standort || '', bed: null } : null;
}
function gbDetail(plant) {
  if (!plant.bewertungDetail) {
    // Übernahme der alten einfachen Sternbewertung als direkt gesetzter Wert
    const d = { pflanze: {}, essbar: {}, manuellPflanze: 0, manuellEssbar: 0, nochmal: null, boden: '', notiz: '', jahr: null };
    if (plant.bewertung > 0) {
      if (gbIstEssbar(plant)) d.manuellEssbar = Math.round(plant.bewertung); else d.manuellPflanze = Math.round(plant.bewertung);
    }
    plant.bewertungDetail = d;
  }
  return plant.bewertungDetail;
}
function gbSpeichern(prefix) {
  const akt = gbAktuellePflanze(prefix);
  if (!akt) return;
  const d = gbDetail(akt.plant);
  d.jahr = new Date().getFullYear();
  akt.plant.bewertung = gbGesamt(d);
  saveData();
  if (prefix === 'pp') {
    if (akt.bed && selectedBed === akt.bed) renderBedPlantList(akt.bed, document.getElementById('bedPlantSearch')?.value || '');
    renderPpSterneEingabe();
  } else {
    renderFreiPflanzenList();
  }
  gbRender(prefix);
}
function gbKnoepfe(prefix, wert, klickbar, aktion) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const f = Math.round(Math.max(0, Math.min(1, wert - (i - 1))) * 100);
    html += `<button type="button" class="gb-stern gb-knopf" style="--f:${f}%" ${klickbar ? `onclick="gbSetzen('${prefix}','${aktion}',${wert === i ? 0 : i})"` : 'disabled'} aria-label="${i} Sterne">★</button>`;
  }
  return html;
}
// aktion: 'mp' = Pflanze direkt, 'me' = Essbar direkt, 'p:<id>' / 'e:<id>' = Einzelpunkt
function gbSetzen(prefix, aktion, wert) {
  const akt = gbAktuellePflanze(prefix);
  if (!akt) return;
  const d = gbDetail(akt.plant);
  if (aktion === 'mp') d.manuellPflanze = wert;
  else if (aktion === 'me') d.manuellEssbar = wert;
  else {
    const [bereich, id] = aktion.split(':');
    const ziel = bereich === 'p' ? (d.pflanze = d.pflanze || {}) : (d.essbar = d.essbar || {});
    if (wert) ziel[id] = wert; else delete ziel[id];
  }
  gbSpeichern(prefix);
}
function gbNochmal(prefix, wert) {
  const akt = gbAktuellePflanze(prefix); if (!akt) return;
  const d = gbDetail(akt.plant);
  d.nochmal = d.nochmal === wert ? null : wert;
  gbSpeichern(prefix);
}
function gbFeld(prefix, feld, wert) {
  const akt = gbAktuellePflanze(prefix); if (!akt) return;
  gbDetail(akt.plant)[feld] = wert;
  akt.plant.bewertung = gbGesamt(akt.plant.bewertungDetail);
  saveData();   // ohne Neuzeichnen, damit beim Tippen der Fokus bleibt
}
function gbEssbarUmschalten(prefix, an) {
  const akt = gbAktuellePflanze(prefix); if (!akt) return;
  const d = gbDetail(akt.plant);
  d.essbarZeigen = an;
  if (!an) { d.essbar = {}; d.manuellEssbar = 0; }
  gbSpeichern(prefix);
}
function gbAbschnittHtml(prefix, titel, kriterien, werte, manuell, kuerzel, manuellAktion) {
  const anzahl = Object.values(werte || {}).filter(x => x >= 1 && x <= 5).length;
  const wert = gbAbschnitt(werte, manuell);
  return `<div class="gb-abschnitt">
    <div class="gb-zeile gb-kopf"><span>${titel}</span><div class="gb-sterne">${gbKnoepfe(prefix, wert, anzahl === 0, manuellAktion)}</div></div>
    <div class="gb-hinweis">${anzahl ? 'Ø ' + gbText(wert) + ' aus ' + anzahl + (anzahl === 1 ? ' Punkt' : ' Punkten') : (manuell ? 'Direkt vergeben' : 'Direkt vergeben oder einzeln bewerten')}</div>
    ${kriterien.map(k => `<div class="gb-zeile"><span>${k.label}</span><div class="gb-sterne">${gbKnoepfe(prefix, (werte || {})[k.id] || 0, true, kuerzel + ':' + k.id)}</div></div>`).join('')}
  </div>`;
}
function gbRender(prefix) {
  const box = document.getElementById(prefix + 'BewertungInhalt');
  const akt = gbAktuellePflanze(prefix);
  if (!box || !akt) return;
  const plant = akt.plant, d = gbDetail(plant);
  const gesamt = gbGesamt(d);
  const essbar = gbIstEssbar(plant);
  const standort = STANDORT_OPTIONEN.find(o => o.value === akt.standort);
  let html = `<div class="gb-gesamt">
      <div>${gbSterneHtml(gesamt, '1.5rem')}</div>
      <div class="gb-gesamt-text">${gesamt ? '<b>' + gbText(gesamt) + '</b> Gesamt' + (d.jahr ? ' · Saison ' + d.jahr : '') : 'Noch nicht bewertet'}</div>
    </div>`;
  html += gbAbschnittHtml(prefix, '🌿 Pflanze', GB_PFLANZE, d.pflanze, d.manuellPflanze, 'p', 'mp');
  if (essbar) {
    html += gbAbschnittHtml(prefix, '🍅 Essbare Teile', GB_ESSBAR, d.essbar, d.manuellEssbar, 'e', 'me');
    html += `<button type="button" class="gb-link" onclick="gbEssbarUmschalten('${prefix}', false)">Essbare Teile ausblenden</button>`;
  } else {
    html += `<button type="button" class="gb-link" onclick="gbEssbarUmschalten('${prefix}', true)">＋ Essbare Teile bewerten</button>`;
  }
  html += `<div class="gb-abschnitt">
      <div class="gb-unter">Nochmal anbauen?</div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="gb-daumen${d.nochmal === true ? ' aktiv-ja' : ''}" onclick="gbNochmal('${prefix}', true)">👍 Ja</button>
        <button type="button" class="gb-daumen${d.nochmal === false ? ' aktiv-nein' : ''}" onclick="gbNochmal('${prefix}', false)">👎 Nein</button>
      </div>
    </div>
    <div class="gb-abschnitt">
      <div class="gb-unter">Bedingungen</div>
      <div class="gb-hinweis" style="margin-bottom:6px;">Standort: ${standort ? standort.icon + ' ' + standort.label.replace(/\u00ad/g, '') : 'nicht angegeben'} <span style="opacity:0.7">(im Info-Tab änderbar)</span></div>
      <div class="form-row"><label>Boden</label>
        <select onchange="gbFeld('${prefix}','boden',this.value)">${GB_BODEN.map(([v, l]) => `<option value="${v}"${d.boden === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Notiz zur Bewertung</label>
        <textarea rows="2" placeholder="z.B. zu wenig Sonne, im Kübel schnell trocken …" oninput="gbFeld('${prefix}','notiz',this.value)">${escapeHtml(d.notiz || '')}</textarea>
      </div>
    </div>
    <button type="button" class="btn-secondary" style="width:100%;" onclick="gbVergleichOeffnen('${escapeHtml((plant.name || '').replace(/'/g, ''))}')">📊 Sorten-Vergleich</button>`;
  box.innerHTML = html;
}

// ---------- Sorten-Vergleich über alle Gärten ----------
function gbAlleBewertungen() {
  const liste = [];
  Object.keys(gardens).forEach(gid => {
    const g = gardens[gid];
    (g.beds || []).filter(b => b.kind !== 'struktur').forEach(bed => (bed.plants || []).forEach(p => {
      liste.push({ plant: p, name: p.name, sorte: p.variety, sym: p.sym, garten: g.name, ort: bed.name || 'Beet', standort: p.location });
    }));
    (g.freiPflanzen || []).forEach(fp => liste.push({ plant: fp, name: fp.name, sorte: fp.sorte, sym: fp.sym, garten: g.name, ort: 'Einzelpflanze', standort: fp.standort }));
  });
  return liste.filter(x => (x.plant.bewertung > 0) || (x.plant.bewertungDetail && x.plant.bewertungDetail.nochmal != null));
}
function gbVergleichOeffnen(suche) {
  document.getElementById('gbVergleichSuche').value = suche || '';
  gbVergleichRendern();
  document.getElementById('modalSortenVergleich').style.display = 'flex';
}
function gbVergleichRendern() {
  const suche = document.getElementById('gbVergleichSuche').value.trim().toLowerCase();
  const gruppen = {};
  gbAlleBewertungen().forEach(x => {
    const name = (x.name || 'Unbenannt').trim(), sorte = (x.sorte || '').trim();
    if (suche && !(name + ' ' + sorte).toLowerCase().includes(suche)) return;
    const key = name.toLowerCase() + '|' + sorte.toLowerCase();
    (gruppen[key] = gruppen[key] || { name, sorte, sym: x.sym, eintraege: [] }).eintraege.push(x);
  });
  const liste = Object.values(gruppen).map(gr => {
    const mit = gr.eintraege.filter(e => e.plant.bewertung > 0);
    const schnitt = (fn) => { const w = gr.eintraege.map(fn).filter(v => v > 0); return w.length ? gbRund(w.reduce((a, b) => a + b, 0) / w.length) : 0; };
    return Object.assign(gr, {
      gesamt: mit.length ? gbRund(mit.reduce((a, e) => a + e.plant.bewertung, 0) / mit.length) : 0,
      pflanze: schnitt(e => { const d = e.plant.bewertungDetail; return d ? gbAbschnitt(d.pflanze, d.manuellPflanze) : 0; }),
      essbar: schnitt(e => { const d = e.plant.bewertungDetail; return d ? gbAbschnitt(d.essbar, d.manuellEssbar) : 0; }),
      ja: gr.eintraege.filter(e => e.plant.bewertungDetail && e.plant.bewertungDetail.nochmal === true).length,
      nein: gr.eintraege.filter(e => e.plant.bewertungDetail && e.plant.bewertungDetail.nochmal === false).length,
    });
  }).sort((a, b) => b.gesamt - a.gesamt);
  const box = document.getElementById('gbVergleichListe');
  if (!liste.length) { box.innerHTML = '<div class="empty-state">' + (suche ? 'Keine Bewertungen zu „' + escapeHtml(suche) + '“.' : 'Noch keine Pflanze bewertet.') + '</div>'; return; }
  const bodenLabel = (v) => (GB_BODEN.find(b => b[0] === v) || ['', ''])[1];
  box.innerHTML = liste.map(gr => `<div class="gb-gruppe">
      <div class="gb-zeile"><b>${gr.sym || '🌱'} ${escapeHtml(gr.name)}${gr.sorte ? ' <span style="font-weight:500;color:var(--bark)">· ' + escapeHtml(gr.sorte) + '</span>' : ''}</b>
        <span style="white-space:nowrap">${gbSterneHtml(gr.gesamt, '0.9rem')} ${gr.gesamt ? gbText(gr.gesamt) : ''}</span></div>
      <div class="gb-hinweis">${gr.eintraege.length} ${gr.eintraege.length === 1 ? 'Pflanze' : 'Pflanzen'}${gr.pflanze ? ' · 🌿 ' + gbText(gr.pflanze) : ''}${gr.essbar ? ' · 🍅 ' + gbText(gr.essbar) : ''}${gr.ja ? ' · 👍 ' + gr.ja : ''}${gr.nein ? ' · 👎 ' + gr.nein : ''}</div>
      ${gr.eintraege.map(e => {
        const d = e.plant.bewertungDetail || {};
        const st = STANDORT_OPTIONEN.find(o => o.value === e.standort);
        const teile = [escapeHtml(e.garten || '') + ' › ' + escapeHtml(e.ort), st ? st.icon + ' ' + st.label.replace(/\u00ad/g, '') : '', d.boden ? bodenLabel(d.boden) : '', d.jahr || ''].filter(Boolean);
        return `<div class="gb-eintrag"><div>${teile.join(' · ')}${d.notiz ? '<div style="font-style:italic;">„' + escapeHtml(d.notiz) + '“</div>' : ''}</div>
          <div style="white-space:nowrap;text-align:right;">${e.plant.bewertung ? gbText(e.plant.bewertung) + ' ★' : ''}${d.nochmal === true ? ' 👍' : d.nochmal === false ? ' 👎' : ''}</div></div>`;
      }).join('')}
    </div>`).join('');
}

// ==================== WETTER-DETAILANSICHT (Tipp auf die Temperatur unten) ====================
// WETTER_TEXTE → pflanzendaten.js
function wetterText(code) { return WETTER_TEXTE[code] || ''; }
function wetterUhrzeit(iso) { return iso ? iso.slice(11, 16) : '–'; }
function wetterKachel(label, wert) {
  return `<div style="background:var(--cream);border-radius:8px;padding:6px 8px;"><div style="font-size:0.62rem;color:var(--bark);text-transform:uppercase;letter-spacing:0.04em;">${label}</div><div style="font-size:0.85rem;font-weight:600;">${wert}</div></div>`;
}
function oeffneWetterDetail() {
  const modal = document.getElementById('modalWetter');
  const inhalt = document.getElementById('wetterDetailInhalt');
  const w = weatherCache;
  modal.style.display = 'flex';
  if (!getWeatherSettings()) {
    inhalt.innerHTML = `<p style="font-size:0.85rem;color:var(--bark);margin-bottom:10px;">Für die Wetterdaten braucht der Garten einen Standort.</p>
      <button class="btn-primary" style="width:100%;" onclick="requestWeatherLocation();setTimeout(oeffneWetterDetail,2500)">📍 Standort freigeben</button>`;
    return;
  }
  if (!w || !w.current) {
    inhalt.innerHTML = '<p style="font-size:0.85rem;color:var(--bark);">Wetterdaten werden geladen …</p>';
    fetchWeather(null, true).then(r => { if (r) oeffneWetterDetail(); else inhalt.innerHTML = '<p style="font-size:0.85rem;color:var(--bark);">⚠ Wetterdaten konnten nicht geladen werden (keine Internetverbindung?).</p>'; });
    return;
  }
  const cur = w.current, d = w.daily, h = w.hourly;
  // --- Aktuell ---
  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <div style="font-size:2.4rem;line-height:1;">${weatherIcon(cur.weather_code)}</div>
      <div><div style="font-size:1.6rem;font-weight:700;line-height:1.1;">${Math.round(cur.temperature_2m)}°C</div>
      <div style="font-size:0.78rem;color:var(--bark);">${wetterText(cur.weather_code)}${cur.apparent_temperature != null ? ' · gefühlt ' + Math.round(cur.apparent_temperature) + '°' : ''}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;">
      ${wetterKachel('Wind', cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) + ' km/h' : '–')}
      ${wetterKachel('Böen', cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) + ' km/h' : '–')}
      ${wetterKachel('Luftfeuchte', cur.relative_humidity_2m != null ? cur.relative_humidity_2m + ' %' : '–')}
    </div>`;
  // --- Boden (für Aussaat und Gießen interessant) ---
  if (h && h.time) {
    const jetztIdx = Math.max(0, h.time.findIndex(t => new Date(t) >= new Date(Date.now() - 30 * 60000)));
    const bodenT = h.soil_temperature_6cm ? h.soil_temperature_6cm[jetztIdx] : null;
    const bodenF = h.soil_moisture_1_to_3cm ? h.soil_moisture_1_to_3cm[jetztIdx] : null;
    if (bodenT != null || bodenF != null) {
      const feuchteText = bodenF == null ? '–' : (bodenF < 0.15 ? 'trocken' : bodenF < 0.3 ? 'mittel' : 'feucht') + ' (' + Math.round(bodenF * 100) + ' %)';
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
        ${wetterKachel('🌱 Boden 6 cm', bodenT != null ? Math.round(bodenT) + '°C' : '–')}
        ${wetterKachel('💧 Bodenfeuchte', feuchteText)}
      </div>`;
    }
    // --- Stundenverlauf der nächsten 24 Stunden ---
    const stunden = [];
    for (let i = jetztIdx; i < Math.min(h.time.length, jetztIdx + 24); i++) stunden.push(i);
    html += `<div style="font-size:0.72rem;font-weight:700;color:var(--bark);text-transform:uppercase;letter-spacing:0.05em;margin:4px 0 4px;">Nächste 24 Stunden</div>
      <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;scrollbar-width:thin;">` +
      stunden.map(i => {
        const p = h.precipitation_probability ? h.precipitation_probability[i] : null;
        return `<div style="flex:0 0 46px;text-align:center;background:var(--cream);border-radius:8px;padding:5px 2px;">
          <div style="font-size:0.62rem;color:var(--bark);">${wetterUhrzeit(h.time[i])}</div>
          <div style="font-size:1rem;">${weatherIcon(h.weather_code ? h.weather_code[i] : null)}</div>
          <div style="font-size:0.78rem;font-weight:700;">${Math.round(h.temperature_2m[i])}°</div>
          <div style="font-size:0.6rem;color:#5b8bb5;min-height:0.8em;">${p ? p + '%' : ''}</div>
        </div>`;
      }).join('') + '</div>';
  }
  // --- Warnungen (Frost, Hitze, Starkregen, Hagel) ---
  html += wetterWarnBanner();
  // --- Heute, morgen, übermorgen ---
  for (let o = 0; o < 3; o++) {
    const idx = getWeatherDayIndex(o);
    if (!d.time || d.time[idx] == null) continue;
    const titel = o === 0 ? 'Heute' : o === 1 ? 'Morgen' : new Date(d.time[idx]).toLocaleDateString('de-DE', { weekday: 'long' });
    const regen = d.precipitation_sum[idx] || 0, prob = d.precipitation_probability_max[idx];
    const sonne = d.sunshine_duration ? d.sunshine_duration[idx] / 3600 : null;
    const et0 = d.et0_fao_evapotranspiration ? d.et0_fao_evapotranspiration[idx] : null;
    // Gießhinweis: Verdunstung deutlich höher als Regen → Beete trocknen aus
    const bilanz = et0 != null ? regen - et0 : null;
    const giessText = bilanz == null ? '' : bilanz < -2 ? '🚿 Gießen sinnvoll' : bilanz < 0 ? '🚿 evtl. gießen' : '💧 Regen reicht';
    html += `<div style="border:1px solid var(--parchment);border-radius:10px;padding:9px 10px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
        <strong style="font-size:0.9rem;">${weatherIcon(d.weather_code[idx])} ${titel}</strong>
        <span style="font-size:0.85rem;font-weight:700;">${Math.round(d.temperature_2m_min[idx])}° / ${Math.round(d.temperature_2m_max[idx])}°</span>
      </div>
      <div style="font-size:0.75rem;color:var(--bark);margin-bottom:6px;">${wetterText(d.weather_code[idx])}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
        ${wetterKachel('🌧 Regen', regen > 0 ? regen.toFixed(1).replace('.', ',') + ' mm' + (prob != null ? ' (' + prob + '%)' : '') : 'trocken')}
        ${wetterKachel('💨 Wind / Böen', (d.wind_speed_10m_max ? Math.round(d.wind_speed_10m_max[idx]) : '–') + ' / ' + (d.wind_gusts_10m_max ? Math.round(d.wind_gusts_10m_max[idx]) : '–') + ' km/h')}
        ${wetterKachel('☀️ Sonne', sonne != null ? sonne.toFixed(1).replace('.', ',') + ' Std.' : '–')}
        ${wetterKachel('🔆 UV-Index', d.uv_index_max ? Math.round(d.uv_index_max[idx]) : '–')}
        ${wetterKachel('🌅 Auf / Unter', d.sunrise ? wetterUhrzeit(d.sunrise[idx]) + ' / ' + wetterUhrzeit(d.sunset[idx]) : '–')}
        ${wetterKachel('💦 Verdunstung', et0 != null ? et0.toFixed(1).replace('.', ',') + ' mm' + (giessText ? '<br><span style="font-size:0.7rem;font-weight:500;">' + giessText + '</span>' : '') : '–')}
      </div>
    </div>`;
  }
  const stand = new Date(w.fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.68rem;color:var(--bark);">
      <span>Stand ${stand} Uhr · Daten: Open-Meteo</span>
      <button class="btn-secondary" style="padding:5px 10px;font-size:0.75rem;" onclick="fetchWeather(null,true).then(oeffneWetterDetail)">🔄 Aktualisieren</button>
    </div>`;
  inhalt.innerHTML = html;
  // Nach oben: das Aktuell-Wetter soll zuerst sichtbar sein (auch wenn ein Knopf automatisch den Fokus bekommt)
  const box = modal.querySelector('.modal');
  box.scrollTop = 0;
  setTimeout(() => { if (document.activeElement && box.contains(document.activeElement)) document.activeElement.blur(); box.scrollTop = 0; }, 80);
}
function getWeatherDayIndex(offset) {
  return WEATHER_PAST_DAYS + offset; // offset: 0=heute, -1=gestern, +1=morgen ...
}
function getRecentRainMm(days) {
  if (!weatherCache || !weatherCache.daily) return 0;
  let sum = 0;
  for (let o = -days; o <= 0; o++) {
    const idx = getWeatherDayIndex(o);
    const v = weatherCache.daily.precipitation_sum?.[idx];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}
function getRainForecastInfo() {
  if (!weatherCache || !weatherCache.daily) return null;
  const idxToday = getWeatherDayIndex(0);
  const idxTom = getWeatherDayIndex(1);
  return {
    today: { sum: weatherCache.daily.precipitation_sum?.[idxToday]||0, prob: weatherCache.daily.precipitation_probability_max?.[idxToday]||0 },
    tomorrow: { sum: weatherCache.daily.precipitation_sum?.[idxTom]||0, prob: weatherCache.daily.precipitation_probability_max?.[idxTom]||0 },
  };
}
function isRainExpectedSoon() {
  const f = getRainForecastInfo();
  if (!f) return false;
  return (f.today.prob>=50 && f.today.sum>=1) || (f.tomorrow.prob>=60 && f.tomorrow.sum>=2);
}

// Frost: <=0°C = Frost, 0–2°C = Frostgefahr (Bodenfrost/Kaltluft möglich)
const FROST_THRESHOLD = 0;
const FROST_RISK_THRESHOLD = 2;
function getFrostForecastInfo() {
  if (!weatherCache || !weatherCache.daily) return null;
  const days = [];
  const labels = ['Heute', 'Morgen', 'Übermorgen'];
  for (let o = 0; o <= 2; o++) {
    const idx = getWeatherDayIndex(o);
    const tmin = weatherCache.daily.temperature_2m_min?.[idx];
    if (typeof tmin !== 'number') continue;
    let level = null;
    if (tmin <= FROST_THRESHOLD) level = 'frost';
    else if (tmin <= FROST_RISK_THRESHOLD) level = 'risk';
    days.push({ offset: o, label: labels[o], tmin, level });
  }
  return days;
}
function getUpcomingFrostWarning() {
  const days = getFrostForecastInfo();
  if (!days) return null;
  const relevant = days.filter(d => d.level);
  if (!relevant.length) return null;
  const worst = relevant.find(d => d.level === 'frost') || relevant[0];
  return { days: relevant, worst };
}

// Hitze: ab dieser Tageshöchsttemperatur (°C) wird gewarnt
const HEAT_THRESHOLD = 30;
function getUpcomingHeatWarning() {
  if (!weatherCache || !weatherCache.daily) return null;
  const labels = ['heute', 'morgen', 'übermorgen'];
  const days = [];
  for (let o = 0; o <= 2; o++) {
    const idx = getWeatherDayIndex(o);
    const tmax = weatherCache.daily.temperature_2m_max?.[idx];
    if (typeof tmax === 'number' && tmax >= HEAT_THRESHOLD) days.push({ offset: o, label: labels[o], tmax });
  }
  return days.length ? { days, worst: days[0] } : null;
}
// Starkregen: ab dieser Tagesniederschlagssumme (mm) bzw. hoher Wahrscheinlichkeit + Menge wird gewarnt
const HEAVY_RAIN_THRESHOLD_MM = 20;
function getUpcomingHeavyRainWarning() {
  if (!weatherCache || !weatherCache.daily) return null;
  const labels = ['heute', 'morgen', 'übermorgen'];
  const days = [];
  for (let o = 0; o <= 2; o++) {
    const idx = getWeatherDayIndex(o);
    const sum = weatherCache.daily.precipitation_sum?.[idx];
    const prob = weatherCache.daily.precipitation_probability_max?.[idx];
    if (typeof sum !== 'number') continue;
    if (sum >= HEAVY_RAIN_THRESHOLD_MM || (sum >= 10 && prob >= 80)) days.push({ offset: o, label: labels[o], sum, prob });
  }
  return days.length ? { days, worst: days[0] } : null;
}
// Hagel: WMO-Wettercodes 96/99 = Gewitter mit leichtem/starkem Hagel
function getUpcomingHailWarning() {
  if (!weatherCache || !weatherCache.daily || !weatherCache.daily.weather_code) return null;
  const labels = ['heute', 'morgen', 'übermorgen'];
  const days = [];
  for (let o = 0; o <= 2; o++) {
    const idx = getWeatherDayIndex(o);
    const code = weatherCache.daily.weather_code?.[idx];
    if (code === 96 || code === 99) days.push({ offset: o, label: labels[o], severe: code === 99 });
  }
  return days.length ? { days, worst: days[0] } : null;
}

function daysBetween(d1, d2) { return Math.round((d2 - d1) / 86400000); }
let lastCareItems = [];
function createCareReminder(id) {
  const item = lastCareItems.find(i => i.id === id);
  if (!item) { showTempStatus('⚠ Aufgabe nicht mehr aktuell – Pflegeplan neu öffnen.', 4); return; }
  const date = new Date(); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + Math.max(0, item.dueInDays || 0));
  const title = `${item.sym||'🌱'} ${item.plant} (${item.bed})`;
  const desc = `Gartenplaner-Erinnerung: ${item.text.replace(/^[^\wÄÖÜäöü]+/, '')} – ${item.plant} im Beet "${item.bed}".`;
  const ics = buildTaskICS(title, desc, date, 6, 0);
  downloadICS(ics, `pflege-${(item.plant||'aufgabe').toLowerCase().replace(/[^a-z0-9]+/gi,'-')}-${item.kind}.ics`);
}
function createCareReminderDirekt(id) {
  const item = lastCareItems.find(i => i.id === id);
  if (!item) { showTempStatus('⚠ Aufgabe nicht mehr aktuell – Pflegeplan neu öffnen.', 4); return; }
  const date = new Date(); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + Math.max(0, item.dueInDays || 0));
  const title = `${item.sym||'🌱'} ${item.plant} (${item.bed})`;
  const desc = `Gartenplaner-Erinnerung: ${item.text.replace(/^[^\wÄÖÜäöü]+/, '')} – ${item.plant} im Beet "${item.bed}".`;
  gartenTerminDirektEintragen(title, desc, date);
}

// ==================== PFLEGEPLAN: ERLEDIGT-STATUS (täglich) ====================
function getCareDoneState() {
  const today = new Date().toISOString().slice(0,10);
  let state;
  try { state = JSON.parse(localStorage.getItem('gartenplaner_careDone') || 'null'); } catch(e) { state = null; }
  if (!state || state.date !== today) {
    state = { date: today, done: [] };
    localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  }
  return state;
}
function isCareTaskDone(id) {
  return getCareDoneState().done.includes(id);
}
function toggleCareTaskDone(id) {
  const state = getCareDoneState();
  const i = state.done.indexOf(id);
  if (i === -1) state.done.push(id); else state.done.splice(i, 1);
  localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  giessTagebuchBeimAbhaken(id, i === -1);
  wasserstelleBeimAbhaken(id, i === -1);
}

// ==================== 💧 GIESS-TAGEBUCH ====================
// Beim Abhaken einer Gieß-Aufgabe merkt sich die Pflanze das Datum (plant.lastWatered). Der Pflegeplan
// rechnet dann ab dem letzten Gießen – oder ab dem letzten kräftigen Regen (≥ 8 mm an einem Tag) –
// statt stur ab dem Pflanzdatum.
const STARKREGEN_MM = 8;
function heuteISO() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function letzterStarkregenTag() {
  if (!weatherCache || !weatherCache.daily) return null;
  for (let o = 0; o >= -WEATHER_PAST_DAYS; o--) {
    const v = weatherCache.daily.precipitation_sum?.[getWeatherDayIndex(o)];
    if (typeof v === 'number' && v >= STARKREGEN_MM) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + o); return d; }
  }
  return null;
}
// liefert { datum, quelle: 'gegossen'|'regen' } oder null
function letzteBewaesserung(plant) {
  let best = null;
  if (plant && plant.lastWatered) { const d = new Date(plant.lastWatered + 'T00:00:00'); if (!isNaN(d.getTime())) best = { datum: d, quelle: 'gegossen' }; }
  const regen = letzterStarkregenTag();
  if (regen && (!best || regen > best.datum)) best = { datum: regen, quelle: 'regen' };
  return best;
}
// Gieß-Fälligkeit: { dueToday, dueIn }
function giessFaelligkeit(plant, intervall, alter) {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const lw = letzteBewaesserung(plant);
  if (lw) {
    const seit = daysBetween(lw.datum, heute);
    // heute schon gegossen → bleibt als (erledigte) Aufgabe von heute stehen
    if (seit === 0 && lw.quelle === 'gegossen') return { dueToday: true, dueIn: 0, gegossenHeute: true };
    return { dueToday: seit >= intervall, dueIn: Math.max(1, intervall - seit), letzte: lw, seit };
  }
  const r = alter % intervall;
  return { dueToday: r === 0, dueIn: intervall - r };
}
// Abhaken einer Gieß-Aufgabe trägt das Datum an der Pflanze ein (Rückgängig stellt den alten Wert wieder her)
function giessTagebuchBeimAbhaken(id, jetztErledigt) {
  if (!/_water$/.test(id)) return;
  const t = careIdTeile(id);
  const bed = getCurrentBeds().find(b => String(b.id) === t.bedId);
  const plant = bed && bed.plants && bed.plants[t.idx];
  if (!plant) return;
  const state = getCareDoneState();
  state.giessVorher = state.giessVorher || {};
  if (jetztErledigt) {
    if (!(id in state.giessVorher)) state.giessVorher[id] = plant.lastWatered || null;
    plant.lastWatered = heuteISO();
  } else {
    if (id in state.giessVorher) { if (state.giessVorher[id]) plant.lastWatered = state.giessVorher[id]; else delete plant.lastWatered; delete state.giessVorher[id]; }
  }
  localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  saveData();
}
function pflanzeJetztGegossen() {
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  const plant = bed && bed.plants[activePlantBedId.idx];
  if (!plant) return;
  const id = bed.id + '_' + activePlantBedId.idx + '_water';
  if (!isCareTaskDone(id)) toggleCareTaskDone(id); else { plant.lastWatered = heuteISO(); saveData(); }
  renderGiessInfo(plant);
  showTempStatus('💧 Gegossen – eingetragen', 3);
}
function renderGiessInfo(plant) {
  const box = document.getElementById('ppGiessInfo');
  if (!box) return;
  const info = CARE_INFO[lexKatalogName((plant.name || '').trim())];
  if (!info || !info.waterDays) { box.style.display = 'none'; return; }
  const lw = letzteBewaesserung(plant);
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  let txt = 'Noch nicht eingetragen – der Plan rechnet ab dem Pflanzdatum.';
  if (lw) {
    const seit = daysBetween(lw.datum, heute);
    const wann = seit === 0 ? 'heute' : seit === 1 ? 'gestern' : 'vor ' + seit + ' Tagen';
    const naechst = Math.max(0, info.waterDays - seit);
    txt = (lw.quelle === 'regen' ? '🌧 Kräftiger Regen ' : '💧 Zuletzt gegossen ') + wann + ' · ' + (naechst === 0 ? '<b>heute wieder fällig</b>' : 'wieder in ' + naechst + ' Tag' + (naechst > 1 ? 'en' : ''));
  }
  box.innerHTML = `<div class="giess-box"><span class="giess-text">${txt}<span class="giess-sub">Rhythmus: etwa alle ${info.waterDays} Tage</span></span><button type="button" class="giess-btn" onclick="pflanzeJetztGegossen()">💧 Gegossen</button></div>`;
  box.style.display = 'block';
}

async function computeCarePlanData() {
  const beds = getCurrentBeds();
  const today = new Date(); today.setHours(0,0,0,0);
  const items = []; // {bedName, plantName, sym, kind, text, urgent}
  let undated = 0;

  const loc = getWeatherSettings();
  let weather = null;
  if (loc) weather = await fetchWeather(loc, false);
  const rainSoon = isRainExpectedSoon();
  const recentRain = weather ? getRecentRainMm(2) : 0;
  const heavyRainRecently = recentRain >= 8; // mm über 2 Tage – Gießen heute meist entbehrlich
  const hotDry = !!(weather && weather.current && weather.current.temperature_2m >= 28 && recentRain < 3);

  const bedWaterStatus = {}; // bedName -> { today: n, skippedByRain: n }
  const frostWarn = getUpcomingFrostWarning();
  const heatWarn = getUpcomingHeatWarning();
  const heavyRainWarn = getUpcomingHeavyRainWarning();
  const hailWarn = getUpcomingHailWarning();
  const frostAffected = []; // { bed, plant, sym }

  for (const bed of beds) {
    const bedName = bed.name || 'Beet';
    (bed.plants||[]).forEach((plant, pIdx) => {
      const name = (plant.name||'').trim();
      const taskIdBase = `${bed.id}_${pIdx}`;

      if (frostWarn && isFrostTender(name)) {
        const planted = plant.date ? new Date(plant.date) : null;
        if (planted) planted.setHours(0,0,0,0);
        if (!planted || !isNaN(planted.getTime()) && planted <= today) {
          frostAffected.push({ bed: bedName, plant: name, sym: plant.sym });
        }
      }

      const info = CARE_INFO[name];
      if (!info) return;
      if (!plant.date) { undated++; return; }
      const planted = new Date(plant.date); planted.setHours(0,0,0,0);
      if (isNaN(planted.getTime())) { undated++; return; }
      const age = daysBetween(planted, today);
      if (age < 0) return; // in der Zukunft geplant

      if (info.waterDays > 0) {
        const effectiveInterval = hotDry ? Math.max(1, info.waterDays - 1) : info.waterDays;
        const gf = giessFaelligkeit(plant, effectiveInterval, age);
        const dueIn = gf.dueIn;
        const dueToday = gf.dueToday;
        let text, urgent = dueToday, skip = false;

        if (dueToday && heavyRainRecently) {
          skip = true; urgent = false;
          text = `🌧 Heute nicht nötig – ${recentRain.toFixed(0)}mm Regen in den letzten 2 Tagen`;
        } else if (dueToday && hotDry) {
          text = `🚿 Heute gießen – ☀️ heiß &amp; trocken, Boden trocknet schneller aus`;
        } else if (dueToday && rainSoon) {
          text = `🚿 Heute fällig – 🌧 Regen erwartet, ggf. abwarten`;
        } else if (dueToday) {
          text = `🚿 Heute gießen`;
        } else {
          text = `🚿 Gießen in ${dueIn} Tag(en)`;
        }
        items.push({ id: taskIdBase+'_water', bed: bedName, plant: name, sym: plant.sym, kind: 'water', urgent, text, skip, dueInDays: dueToday ? 0 : dueIn });

        if (!bedWaterStatus[bedName]) bedWaterStatus[bedName] = { today: 0, skippedByRain: 0 };
        if (dueToday && !skip) bedWaterStatus[bedName].today++;
        if (dueToday && skip) bedWaterStatus[bedName].skippedByRain++;
      }
      if (info.fertilizeDays > 0) {
        const sinceFert = age % info.fertilizeDays;
        if (sinceFert <= 1) {
          items.push({ id: taskIdBase+'_fertilize', bed: bedName, plant: name, sym: plant.sym, kind: 'fertilize',
            urgent: true, text: `🌿 Düngen fällig`, dueInDays: 0 });
        }
      }
      if (info.harvestDays > 0) {
        const toHarvest = info.harvestDays - age;
        if (toHarvest <= 0) {
          items.push({ id: taskIdBase+'_harvest', bed: bedName, plant: name, sym: plant.sym, kind: 'harvest',
            urgent: true, text: `🧺 Erntereif (seit ${Math.abs(toHarvest)} Tag(en))`, dueInDays: 0 });
        } else if (toHarvest <= 7) {
          items.push({ id: taskIdBase+'_harvest', bed: bedName, plant: name, sym: plant.sym, kind: 'harvest',
            urgent: false, text: `🧺 Ernte in ca. ${toHarvest} Tag(en)`, dueInDays: toHarvest });
        }
      }
    });
  }
  wasserstellenPflegeItems(hotDry || !!heatWarn).forEach(i => items.push(i));
  return { items, undated, weather, rainSoon, bedWaterStatus, hotDry, recentRain, frostWarn, frostAffected, heatWarn, heavyRainWarn, hailWarn };
}
async function openCarePlan() {
  const d = await computeCarePlanData();
  lastCareItems = d.items;
  renderCarePlan(d.items, d.undated, d.weather, d.rainSoon, d.bedWaterStatus, d.hotDry, d.recentRain, d.frostWarn, d.frostAffected);
  document.getElementById('carePlanModal').style.display = 'flex';
}
function renderCarePlan(items, undated, weather, rainSoon, bedWaterStatus, hotDry, recentRain, frostWarn, frostAffected) {
  const box = document.getElementById('carePlanContent');
  let weatherBanner = '';
  if (weather && weather.current) {
    const icon = weatherIcon(weather.current.weather_code);
    weatherBanner = `<div style="font-size:0.74rem;padding:6px 9px;border-radius:7px;background:${rainSoon?'#e3f0fb':'var(--cream)'};margin-bottom:10px">
      ${icon} Aktuell ${Math.round(weather.current.temperature_2m)}°C ${rainSoon?'· 🌧 Regen in den nächsten 1–2 Tagen erwartet':''}${hotDry?' · ☀️ heiß &amp; trocken':''}
    </div>`;
  } else if (!getWeatherSettings()) {
    weatherBanner = `<div class="empty-state" style="margin-bottom:10px">💡 Tipp: Hinterlege deinen Standort unter ⚙️ Einstellungen → 🌤 Wetter, damit der Gießplan Regen und Hitze automatisch berücksichtigt.</div>`;
  }

  let frostBanner = '';
  if (frostWarn) {
    const isFrost = frostWarn.worst.level === 'frost';
    const dayList = frostWarn.days.map(d => `${d.label} ${Math.round(d.tmin)}°C`).join(', ');
    frostBanner = `<div style="font-size:0.78rem;padding:8px 9px;border-radius:7px;background:${isFrost?'#e3ecfb':'#f0f4fb'};border-left:3px solid ${isFrost?'#4a6fa5':'#8ea4c9'};margin-bottom:10px">
      <div>❄️ <strong>${isFrost?'Frost erwartet':'Frostgefahr'}:</strong> ${dayList}</div>
      ${frostAffected && frostAffected.length ? `<div style="margin-top:5px;font-size:0.74rem;color:var(--bark)">Betroffen: ${frostAffected.map(f=>`${f.sym} ${escapeHtml(f.plant)} (${escapeHtml(f.bed)})`).join(', ')} – abdecken (Vlies/Folie) oder reinholen.</div>` : ''}
    </div>`;
  }

  let bedBanner = '';
  const bedNames = Object.keys(bedWaterStatus || {});
  if (bedNames.length) {
    const needToday = bedNames.filter(n => bedWaterStatus[n].today > 0);
    const skippedByRain = bedNames.filter(n => bedWaterStatus[n].today === 0 && bedWaterStatus[n].skippedByRain > 0);
    if (needToday.length || skippedByRain.length) {
      bedBanner += `<div style="margin-bottom:12px">`;
      if (needToday.length) {
        bedBanner += `<div style="font-size:0.78rem;padding:6px 9px;border-radius:7px;background:#fff3e0;border-left:3px solid #d4880a;margin-bottom:5px;color:#2c2415">🚿 <strong>Heute gießen:</strong> ${needToday.map(escapeHtml).join(', ')}</div>`;
      }
      if (skippedByRain.length) {
        bedBanner += `<div style="font-size:0.78rem;padding:6px 9px;border-radius:7px;background:#e3f0fb;border-left:3px solid #5b8bb5;color:#2c2415">🌧 <strong>Durch Regen versorgt:</strong> ${skippedByRain.map(escapeHtml).join(', ')} (${recentRain.toFixed(0)}mm in 2 Tagen)</div>`;
      }
      bedBanner += `</div>`;
    }
  }

  if (!items.length) {
    box.innerHTML = frostBanner + weatherBanner + bedBanner + '<div class="empty-state">Keine fälligen Aufgaben gefunden. Trage bei deinen Pflanzen ein Pflanzdatum ein, damit der Plan etwas berechnen kann.</div>';
    return;
  }
  items.sort((a,b)=> (b.urgent?1:0) - (a.urgent?1:0));
  const groups = { water: '🚿 Gießen', traenke: '💦 Wasserstellen', fertilize: '🌿 Düngen', harvest: '🧺 Ernte' };
  let html = frostBanner + weatherBanner + bedBanner;
  for (const kind of Object.keys(groups)) {
    const list = items.filter(i=>i.kind===kind);
    if (!list.length) continue;
    html += `<div style="font-size:0.8rem;font-weight:600;margin:10px 0 6px;color:var(--soil)">${groups[kind]}</div>`;
    html += list.map(i => {
      const done = isCareTaskDone(i.id);
      const bg = done ? '#eef2ea' : (i.skip ? '#e3f0fb' : (i.urgent ? '#fff3e0' : 'var(--cream)'));
      const border = done ? 'var(--parchment)' : (i.skip ? '#5b8bb5' : (i.urgent ? '#d4880a' : 'var(--moss)'));
      return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 9px;margin-bottom:5px;border-radius:7px;background:${bg};border-left:3px solid ${border};${done?'opacity:0.6':''}">
        <input type="checkbox" ${done?'checked':''} onchange="toggleCareTaskDone('${i.id}');openCarePlan();" title="Als erledigt markieren" style="cursor:pointer;flex-shrink:0">
        <span style="font-size:1rem">${i.sym}</span>
        <span style="flex:1;font-size:0.78rem;${done?'text-decoration:line-through':''}"><strong>${i.plant}</strong> · ${i.bed}</span>
        <span style="font-size:0.72rem;color:var(--bark)">${i.text}</span>
        <button onclick="createCareReminder('${i.id}')" title="Erinnerung für Kalender-App erstellen (Alarm um 6:00)" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.7;flex-shrink:0">📅</button>
        <button onclick="createCareReminderDirekt('${i.id}')" title="Direkt ins Termine-Modul eintragen" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.7;flex-shrink:0">📌</button>
      </div>`;
    }).join('');
  }
  if (undated) {
    html += `<div class="empty-state" style="margin-top:8px">ℹ️ ${undated} Pflanze(n) ohne Pflanzdatum wurden nicht berücksichtigt.</div>`;
  }
  box.innerHTML = html;
}

// ==================== PDF-EXPORT (DRUCKANSICHT) ====================
// ==================== HILFSFUNKTION: BEETFLÄCHE IN PX² ====================
function polygonAreaPx2(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}
function pointInPolygon(rx, ry, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y, xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > ry) !== (yj > ry)) && (rx < (xj - xi) * (ry - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function bedAreaPx2(bed) {
  if (bed.shape === 'circle') {
    const radX = bed.rx ?? bed.r ?? 60, radY = bed.ry ?? bed.r ?? 60;
    return Math.PI * radX * radY;
  }
  const w = bed.w || 120, h = bed.h || 80;
  if (bed.shape === 'lshape') {
    const cw = Math.min(bed.cutW || 0, w - 1), ch = Math.min(bed.cutH || 0, h - 1);
    return w * h - cw * ch;
  }
  if (bed.shape === 'tri') return w * h / 2;
  if (bed.shape === 'freehand') return bed.points && bed.points.length >= 3 ? polygonAreaPx2(bed.points) : 0;
  return w * h;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function exportPDF() {
  const beds = getCurrentBeds();
  const gardenName = escapeHtml(gardens[currentGardenId]?.name || 'Mein Garten');
  const today = new Date().toLocaleDateString('de-DE');
  let canvasImg = '';
  try { canvasImg = document.getElementById('gardenCanvas').toDataURL('image/png'); } catch(e) {}

  // Legende: alle im Garten vorkommenden Symbole eindeutig sammeln
  const legendMap = new Map();
  beds.forEach(bed => (bed.plants||[]).forEach(p => {
    if (p.sym && !legendMap.has(p.sym)) legendMap.set(p.sym, p.name || '–');
  }));
  const totalPlants = beds.reduce((s,b)=>s+(b.plants||[]).length, 0);
  const legendHtml = legendMap.size ? `
    <div class="legend">
      <strong>Zeichenerklärung:</strong>
      <div class="legend-grid">
        ${[...legendMap.entries()].map(([sym,name])=>`<span class="legend-item">${escapeHtml(sym)} ${escapeHtml(name)}</span>`).join('')}
      </div>
    </div>` : '';
  const summaryHtml = `<p class="muted">${beds.length} Beet${beds.length===1?'':'e'} · ${totalPlants} Pflanze${totalPlants===1?'':'n'}${getGardenSizeM()?` · Gartenfläche ca. ${getGardenSizeM().w}×${getGardenSizeM().h} m`:''}</p>`;

  let bedsHtml = '';
  beds.forEach((bed, i) => {
    const plants = bed.plants || [];
    const cmPerPx = getScale();
    let areaPx2 = bedAreaPx2(bed);
    const areaM2 = (areaPx2 * cmPerPx * cmPerPx / 10000).toFixed(2);

    const plantsHtml = plants.length ? `
      <table>
        <tr><th>Symbol</th><th>Pflanze</th><th>Sorte</th><th>Gepflanzt</th><th>Notizen</th></tr>
        ${plants.map(p=>{
          const notesRaw = (p.notes||'').toString();
          const notes = notesRaw.length>60 ? notesRaw.slice(0,60)+'…' : (notesRaw||'–');
          return `<tr><td>${escapeHtml(p.sym)}</td><td>${escapeHtml(p.name)||'–'}</td><td>${escapeHtml(p.variety)||'–'}</td><td>${escapeHtml(p.date)||'–'}</td><td>${escapeHtml(notes)}</td></tr>`;
        }).join('')}
      </table>` : '<p class="muted">Keine Pflanzen in diesem Beet.</p>';

    const history = bed.history || [];
    const histHtml = history.length ? `
      <p class="muted" style="margin-top:6px"><strong>Frühere Anbauten:</strong> ${history.map(h=>`${escapeHtml(h.name)||'–'} (${escapeHtml((h.date||h.removedAt||'').slice(0,4))})`).join(', ')}</p>` : '';

    bedsHtml += `
      <div class="bed-block">
        <h3><span class="swatch" style="background:${escapeHtml(bed.color||'#7a9e72')}"></span>${escapeHtml(bed.name) || 'Beet ' + (i+1)} <span class="muted">– ca. ${areaM2} m²</span></h3>
        ${plantsHtml}
        ${histHtml}
      </div>`;
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gartenplan – ${gardenName}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#2a2016;margin:30px;}
    h1{font-size:1.5rem;margin-bottom:2px;}
    .muted{color:#6b5d4a;font-size:0.82rem;}
    img.plan{max-width:100%;border:1px solid #ccc;margin:14px 0 22px;}
    .bed-block{margin-bottom:22px;page-break-inside:avoid;}
    h3{font-size:1.05rem;margin:0 0 8px;display:flex;align-items:center;gap:8px;}
    .swatch{display:inline-block;width:14px;height:14px;border-radius:3px;}
    table{width:100%;border-collapse:collapse;font-size:0.82rem;margin-top:4px;}
    th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;}
    th{background:#f0ece0;}
    .legend{margin:10px 0 20px;padding:10px 12px;background:#f7f3e8;border-radius:6px;font-size:0.82rem;page-break-inside:avoid;}
    .legend-grid{display:flex;flex-wrap:wrap;gap:5px 16px;margin-top:6px;}
    .legend-item{white-space:nowrap;}
    .plan-page{page-break-after:always;}
    footer{margin-top:24px;font-size:0.7rem;color:#8a7c66;border-top:1px solid #ddd;padding-top:6px;}
    @media print{ body{margin:14mm;} }
  </style></head><body>
    <h1>🌿 Gartenplan: ${gardenName}</h1>
    <p class="muted">Erstellt am ${today}</p>
    ${summaryHtml}
    <div class="plan-page">
      ${canvasImg ? `<img class="plan" src="${canvasImg}" alt="Gartenplan-Grafik">` : ''}
      ${legendHtml}
    </div>
    <h2>Beete &amp; Pflanzen</h2>
    ${bedsHtml || '<p class="muted">Noch keine Beete angelegt.</p>'}
    <footer>Gartenplaner · ${gardenName} · Seite erstellt am ${today}</footer>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Bitte Pop-ups für diese Seite erlauben, um den PDF-Export zu nutzen.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { try { win.focus(); win.print(); } catch(e) {} }, 400);
}

// ==================== MASSSTABS-PDF (DRUCK IN REALER GRÖSSE) ====================
function openScalePdfModal() {
  if (!getGardenSizeM()) {
    showTempStatus('⚠ Tipp: Hinterlege unter ⚙️ Einstellungen eine reale Gartengröße, damit der Maßstab exakt stimmt.', 6);
  }
  document.getElementById('scalePdfModal').style.display = 'flex';
}
function generateScaledPDF() {
  const scaleSel = document.getElementById('scalePdfSelect').value;
  document.getElementById('scalePdfModal').style.display = 'none';
  exportScaledPDF(scaleSel);
}
function exportScaledPDF(scaleSel) {
  const gardenName = escapeHtml(gardens[currentGardenId]?.name || 'Mein Garten');
  const today = new Date().toLocaleDateString('de-DE');
  const cmPerPx = getScale();
  const canvasEl = document.getElementById('gardenCanvas');
  const realWidthCm = canvasEl.width * cmPerPx;
  const realHeightCm = canvasEl.height * cmPerPx;

  let scaleDenom;
  if (scaleSel === 'auto') {
    const candidates = [10,20,25,50,75,100,150,200,300,500,1000];
    scaleDenom = candidates.find(s => (realWidthCm/s) <= 24 && (realHeightCm/s) <= 16) || 1000;
  } else {
    scaleDenom = parseInt(scaleSel, 10) || 100;
  }

  const printWmm = (realWidthCm / scaleDenom) * 10;
  const printHmm = (realHeightCm / scaleDenom) * 10;
  const barMeterMm = (100 / scaleDenom) * 10; // 1 Meter in mm bei diesem Maßstab

  let canvasImg = '';
  try { canvasImg = canvasEl.toDataURL('image/png'); } catch(e) {}

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gartenplan (Maßstab 1:${scaleDenom}) – ${gardenName}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#2a2016;margin:0;padding:14mm;}
    h1{font-size:1.2rem;margin:0 0 2px;}
    .muted{color:#6b5d4a;font-size:0.78rem;margin:0 0 10px;}
    .plan-wrap{border:1px solid #ccc;}
    img.plan{display:block;width:${printWmm.toFixed(1)}mm;height:${printHmm.toFixed(1)}mm;}
    .scalebar{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:0.75rem;color:#6b5d4a;}
    .scalebar .bar{height:4px;background:#2a2016;width:${barMeterMm.toFixed(1)}mm;}
    @page { size: A4 landscape; margin: 10mm; }
    @media print{ body{padding:0;} }
  </style></head><body>
    <h1>🌿 Gartenplan (maßstabsgetreu): ${gardenName}</h1>
    <p class="muted">Maßstab 1:${scaleDenom} · Erstellt am ${today} · Beim Drucken „Tatsächliche Größe / 100%" wählen, nicht „An Seite anpassen"!</p>
    <div class="plan-wrap">${canvasImg ? `<img class="plan" src="${canvasImg}" alt="Gartenplan">` : '<p class="muted">Keine Zeichnung verfügbar.</p>'}</div>
    <div class="scalebar"><span class="bar"></span><span>= 1 Meter (bei korrektem Druckmaßstab)</span></div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Bitte Pop-ups für diese Seite erlauben, um den PDF-Export zu nutzen.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { try { win.focus(); win.print(); } catch(e) {} }, 400);
}

// ==================== FOTO-TAGEBUCH PRO BEET ====================
function handleBedPhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !selectedBed) return;
  const bed = selectedBed; // Beet merken – der Malstil-Dialog kann einen Moment offen sein
  const inputEl = document.getElementById('bedPhotoInput');
  // Bild auf max. 480px verkleinern und im Tagebuch speichern (wie bisher)
  function speichern(quelle) {
    const img = new Image();
    img.onerror = () => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); inputEl.value=''; };
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.72);
      const date = document.getElementById('bedPhotoDate').value || new Date().toISOString().slice(0,10);
      const note = document.getElementById('bedPhotoNote').value || '';
      pushUndo();
      if (!bed.photoLog) bed.photoLog = [];
      bed.photoLog.push({ date, photo: dataUrl, note });
      saveData();
      document.getElementById('bedPhotoNote').value = '';
      inputEl.value = '';
      if (selectedBed === bed) renderBedPhotoLog(bed);
      showTempStatus('📷 Foto zum Tagebuch hinzugefügt', 3);
    };
    img.src = quelle;
  }
  // Mit Malfilter: erst Stil wählen (Original, Bleistift, Buntstift, Aquarell, Pastell)
  if (window.Malfilter) {
    window.Malfilter.dialog(file, { titel: '📷 Foto fürs Tagebuch' })
      .then((ergebnis) => { if (ergebnis) speichern(ergebnis); else inputEl.value = ''; })
      .catch(() => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); inputEl.value=''; });
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => { showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5); inputEl.value=''; };
  reader.onload = (ev) => speichern(ev.target.result);
  reader.readAsDataURL(file);
}
function renderBedPhotoLog(bed) {
  const box = document.getElementById('bedPhotoGallery');
  if (!box || !bed) return;
  const log = bed.photoLog || [];
  if (!log.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Fotos im Tagebuch. Lade oben ein Foto hoch, um den Wachstumsverlauf festzuhalten.</div>';
    return;
  }
  const sorted = log.map((entry, i) => ({ entry, i })).sort((a,b) => a.entry.date < b.entry.date ? 1 : -1);
  box.innerHTML = sorted.map(({entry, i}) => `
    <div style="display:flex;gap:8px;align-items:center;padding:6px;border-radius:8px;background:var(--cream)">
      <img src="${entry.photo}" onclick="openLightbox('${entry.photo}')" style="width:56px;height:56px;object-fit:cover;border-radius:6px;cursor:zoom-in;flex-shrink:0"/>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.74rem;color:var(--soil);font-weight:600">${escapeHtml(entry.date)}</div>
        ${entry.note ? `<div style="font-size:0.7rem;color:var(--bark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(entry.note)}</div>` : ''}
      </div>
      <button onclick="deleteBedPhoto(${i})" style="background:none;border:none;color:#c05030;cursor:pointer;font-size:0.85rem;opacity:0.6;flex-shrink:0" title="Foto löschen">🗑</button>
    </div>`).join('');
}
function deleteBedPhoto(idx) {
  if (!selectedBed || !selectedBed.photoLog) return;
  pushUndo();
  selectedBed.photoLog.splice(idx, 1);
  saveData();
  renderBedPhotoLog(selectedBed);
}
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('photoLightbox').style.display = 'flex';
}

// ==================== BEET-VORLAGEN (TEMPLATES) ====================
let bedTemplates = [];
function loadBedTemplates() {
  try { bedTemplates = JSON.parse(localStorage.getItem('gartenplaner_bedTemplates') || '[]') || []; }
  catch(e) { bedTemplates = []; }
}
function saveBedTemplatesStorage() {
  try { localStorage.setItem('gartenplaner_bedTemplates', JSON.stringify(bedTemplates)); } catch(e) {}
}
function saveBedAsTemplate() {
  if (!selectedBed) return;
  const suggested = selectedBed.name || 'Beet-Vorlage';
  const name = prompt('Name der Vorlage:', suggested);
  if (!name) return;
  const tpl = {
    id: 'tpl_' + Date.now(),
    name,
    shape: selectedBed.shape,
    rx: selectedBed.rx, ry: selectedBed.ry,
    w: selectedBed.w,
    h: selectedBed.h,
    apexOffset: selectedBed.apexOffset,
    cutW: selectedBed.cutW,
    cutH: selectedBed.cutH,
    points: selectedBed.points,
    color: selectedBed.color,
    plants: (selectedBed.plants || []).map(p => ({
      sym: p.sym, name: p.name, variety: p.variety || '', rx: p.rx, ry: p.ry,
      notes: p.notes || '', location: p.location || ''
    }))
  };
  bedTemplates.push(tpl);
  saveBedTemplatesStorage();
  showTempStatus(`💾 Vorlage "${name}" gespeichert (${tpl.plants.length} Pflanze(n))`, 4);
}
function openTemplateModal() {
  renderTemplateList();
  renderBeispielBeete();
  document.getElementById('templateModal').style.display = 'flex';
}
function renderTemplateList() {
  const box = document.getElementById('templateListBox');
  if (!bedTemplates.length) {
    box.innerHTML = '<div style="font-size:0.74rem;color:var(--bark);padding:8px 10px;border:1px dashed var(--parchment);border-radius:var(--radius-sm)">Noch keine eigenen Vorlagen – im Beet-Editor über „💾 Als Vorlage speichern“ anlegen.</div>';
    return;
  }
  const shapeLabel = { circle: 'Rund', rect: 'Rechteckig', tri: 'Dreieckig', lshape: 'L-Form', freehand: 'Freiform' };
  box.innerHTML = bedTemplates.map(t => `
    <div class="bed-item" style="cursor:default">
      <span class="bed-color-dot" style="background:${t.color||'#7a9e72'}"></span>
      <span style="flex:1;min-width:0">
        <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.name)}</div>
        <div style="font-size:0.68rem;color:var(--bark)">${shapeLabel[t.shape]||t.shape} · ${t.plants.length} Pflanze(n)</div>
      </span>
      <button class="tool-btn" style="padding:4px 8px;font-size:0.7rem" onclick="insertTemplate('${t.id}')">➕ Einfügen</button>
      <button class="bed-item-del" onclick="deleteTemplate('${t.id}')" title="Vorlage löschen">🗑</button>
    </div>`).join('');
}
// ==================== 🔍 PFLANZE BESTIMMEN (Pl@ntNet) ====================
// Bis zu 5 Fotos einer Pflanze → Pl@ntNet schlägt die wahrscheinlichsten Arten vor (deutsche Namen).
// Schlüssel: kostenlos auf my.plantnet.org, dort „expose my API key“ + eigene github.io-Adresse unter
// „Authorized domains“ eintragen – dann funktioniert er nur von dieser App aus.
const PLANTNET_KEY = '2b10mktgnQfDFgRwPV02tpGjSO'; // familienweiter Schlüssel (nur von der eigenen github.io-Adresse aus gültig); ein im Bestimmen-Fenster eingegebener Schlüssel hat Vorrang
const PLANTNET_KEY_LOKAL = 'garten_plantnetKey';
let pnBilder = [];          // [{ blob, url }]
let pnOrgan = 'auto';
let pnKontext = null;       // { typ: 'beet', bedId, idx } | { typ: 'frei', id } | null (nur nachschlagen)
function plantnetSchluessel() {
  let lokal = '';
  try { lokal = localStorage.getItem(PLANTNET_KEY_LOKAL) || ''; } catch (e) {}
  return (lokal || PLANTNET_KEY || '').trim();
}
function pnBildVerkleinern(quelle) {
  return new Promise((ok, fehler) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280, f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok({ blob: b, url: URL.createObjectURL(b) }) : fehler(new Error('Bild')), 'image/jpeg', 0.85);
    };
    img.onerror = () => fehler(new Error('Bild konnte nicht gelesen werden'));
    img.src = quelle;
  });
}
function pflanzeBestimmenOeffnen(kontext) {
  pnKontext = kontext || null;
  pnBilder.forEach(b => URL.revokeObjectURL(b.url));
  pnBilder = [];
  document.getElementById('pnErgebnis').innerHTML = '';
  // vorhandenes Foto der Pflanze gleich mitverwenden
  let objekt = null;
  if (pnKontext && pnKontext.typ === 'beet') { const bed = getCurrentBeds().find(b => b.id === pnKontext.bedId); objekt = bed && bed.plants[pnKontext.idx]; }
  if (pnKontext && pnKontext.typ === 'frei') objekt = getCurrentFreiPflanzen().find(x => x.id === pnKontext.id);
  const foto = objekt && typeof ppFotoTitelbild === 'function' ? ppFotoTitelbild(objekt) : null;
  const daten = foto && (foto.data || foto.photo);
  const fertig = () => { pnRendern(); document.getElementById('plantnetModal').style.display = 'flex'; };
  if (daten && String(daten).indexOf('data:image') === 0) pnBildVerkleinern(daten).then(b => { pnBilder.push(b); fertig(); }).catch(fertig);
  else fertig();
}
function pflanzeBestimmenSchliessen() { document.getElementById('plantnetModal').style.display = 'none'; }
function pnRendern() {
  const schluessel = plantnetSchluessel();
  document.getElementById('pnSchluesselBox').style.display = schluessel ? 'none' : '';
  document.getElementById('pnHauptBox').style.display = schluessel ? '' : 'none';
  document.getElementById('pnBilder').innerHTML = pnBilder.map((b, i) =>
    `<div class="pn-bild"><img src="${b.url}" alt=""><button type="button" onclick="pnBildEntfernen(${i})" aria-label="Foto entfernen">✕</button></div>`).join('') +
    (pnBilder.length < 5 ? `<button type="button" class="pn-bild-neu" onclick="document.getElementById('pnBildInput').click()">📷<span>${pnBilder.length ? 'Noch ein Foto' : 'Foto aufnehmen'}</span></button>` : '');
  document.querySelectorAll('[data-pn-organ]').forEach(b => b.classList.toggle('an', b.dataset.pnOrgan === pnOrgan));
  document.getElementById('btnPnBestimmen').disabled = !pnBilder.length;
}
function pnBildEntfernen(i) { const b = pnBilder.splice(i, 1)[0]; if (b) URL.revokeObjectURL(b.url); pnRendern(); }
function pnOrganSetzen(o) { pnOrgan = o; pnRendern(); }
function pnBilderGewaehlt(e) {
  const dateien = Array.from(e.target.files || []).slice(0, 5 - pnBilder.length);
  e.target.value = '';
  Promise.all(dateien.map(d => new Promise(ok => { const r = new FileReader(); r.onload = ev => ok(ev.target.result); r.onerror = () => ok(null); r.readAsDataURL(d); })))
    .then(liste => Promise.all(liste.filter(Boolean).map(q => pnBildVerkleinern(q).catch(() => null))))
    .then(bilder => { bilder.filter(Boolean).forEach(b => pnBilder.push(b)); pnRendern(); });
}
function pnSchluesselSpeichern() {
  const wert = document.getElementById('pnSchluesselInput').value.trim();
  if (!wert) return;
  try { localStorage.setItem(PLANTNET_KEY_LOKAL, wert); } catch (e) {}
  pnRendern();
}
function pnKatalogTreffer(namen) {
  for (const n of namen) {
    const k = String(n || '').trim().toLowerCase();
    if (!k) continue;
    const p = PLANTS.find(x => x.name.toLowerCase() === k || x.name.toLowerCase().replace(/\s*\(.*\)/, '') === k);
    if (p) return p;
    const alias = PFLANZEN_BEDINGUNGEN_ALIAS[k];
    if (alias) { const p2 = PLANTS.find(x => x.name === alias); if (p2) return p2; }
  }
  return null;
}
let pnLetzteErgebnisse = [];
async function pnBestimmen() {
  const box = document.getElementById('pnErgebnis');
  const schluessel = plantnetSchluessel();
  if (!schluessel || !pnBilder.length) return;
  if (!navigator.onLine) { box.innerHTML = '<div class="pn-fehler">⚠ Keine Internetverbindung.</div>'; return; }
  const btn = document.getElementById('btnPnBestimmen');
  btn.disabled = true; btn.textContent = '⏳ Pl@ntNet sucht …';
  box.innerHTML = '';
  try {
    const fd = new FormData();
    pnBilder.forEach((b, i) => { fd.append('images', b.blob, 'pflanze' + (i + 1) + '.jpg'); fd.append('organs', pnOrgan); });
    const url = 'https://my-api.plantnet.org/v2/identify/all?api-key=' + encodeURIComponent(schluessel) + '&lang=de&nb-results=5';
    const res = await fetch(url, { method: 'POST', body: fd });
    let daten = null;
    try { daten = await res.json(); } catch (e) {}
    if (!res.ok) {
      const meldung = res.status === 404 ? 'Keine Pflanze erkannt. Probier ein schärferes Foto aus der Nähe – am besten ein einzelnes Blatt, eine Blüte oder Frucht.'
        : (res.status === 401 || res.status === 403) ? 'Der Schlüssel wird nicht akzeptiert. Ist er richtig, und ist diese Adresse bei Pl@ntNet unter „Authorized domains“ eingetragen?'
        : res.status === 429 ? 'Das Tageskontingent ist aufgebraucht – morgen geht es wieder.'
        : 'Pl@ntNet antwortet gerade nicht (' + res.status + (daten && daten.message ? ': ' + daten.message : '') + ').';
      box.innerHTML = '<div class="pn-fehler">⚠ ' + escapeHtml(meldung) + '</div>' +
        ((res.status === 401 || res.status === 403) ? '<button type="button" class="pn-link" onclick="pnSchluesselAendern()">Schlüssel ändern</button>' : '');
      return;
    }
    pnLetzteErgebnisse = (daten.results || []).slice(0, 5);
    if (!pnLetzteErgebnisse.length) { box.innerHTML = '<div class="pn-fehler">Keine Treffer – anderes Foto probieren.</div>'; return; }
    box.innerHTML = '<div class="pn-titel">Wahrscheinlich ist es …</div>' + pnLetzteErgebnisse.map((r, i) => {
      const sp = r.species || {};
      const deutsch = (sp.commonNames || [])[0] || '';
      const wiss = sp.scientificNameWithoutAuthor || sp.scientificName || '';
      const katalog = pnKatalogTreffer((sp.commonNames || []).concat([wiss]));
      const prozent = Math.round((r.score || 0) * 100);
      return `<div class="pn-treffer${i === 0 ? ' erster' : ''}">
        <div class="pn-treffer-kopf"><span class="pn-name">${katalog ? katalog.sym + ' ' : ''}${escapeHtml(deutsch || wiss)}</span><span class="pn-prozent">${prozent} %</span></div>
        <div class="pn-wiss"><i>${escapeHtml(wiss)}</i>${sp.family && sp.family.scientificNameWithoutAuthor ? ' · ' + escapeHtml(sp.family.scientificNameWithoutAuthor) : ''}${(sp.commonNames || []).length > 1 ? ' · auch: ' + escapeHtml(sp.commonNames.slice(1, 3).join(', ')) : ''}</div>
        <div class="pn-balken"><span style="width:${prozent}%"></span></div>
        <div class="pn-knoepfe">
          ${pnKontext ? `<button type="button" class="tool-btn" onclick="pnUebernehmen(${i})">✓ Übernehmen${katalog && katalog.name !== deutsch ? ' als „' + escapeHtml(katalog.name) + '“' : ''}</button>` : ''}
          ${r.gbif && r.gbif.id ? `<a class="pn-link" href="https://www.gbif.org/species/${encodeURIComponent(r.gbif.id)}" target="_blank" rel="noopener">Mehr dazu ↗</a>` : ''}
        </div>
      </div>`;
    }).join('') +
    `<div class="pn-fuss">Bestimmung: Pl@ntNet${typeof daten.remainingIdentificationRequests === 'number' ? ' · heute noch ' + daten.remainingIdentificationRequests + ' Bestimmungen' : ''} · Ergebnisse sind Vorschläge, keine Garantie (Vorsicht bei Giftpflanzen und Pilzen!).</div>`;
  } catch (e) {
    box.innerHTML = '<div class="pn-fehler">⚠ Pl@ntNet war nicht erreichbar. Später erneut versuchen.</div>';
  } finally {
    btn.disabled = !pnBilder.length; btn.textContent = '🔍 Bestimmen';
  }
}
function pnSchluesselAendern() {
  try { localStorage.removeItem(PLANTNET_KEY_LOKAL); } catch (e) {}
  document.getElementById('pnSchluesselBox').style.display = '';
  document.getElementById('pnHauptBox').style.display = 'none';
}
function pnUebernehmen(i) {
  const r = pnLetzteErgebnisse[i];
  if (!r || !pnKontext) return;
  const sp = r.species || {};
  const katalog = pnKatalogTreffer((sp.commonNames || []).concat([sp.scientificNameWithoutAuthor || '']));
  const name = katalog ? katalog.name : ((sp.commonNames || [])[0] || sp.scientificNameWithoutAuthor || 'Pflanze');
  pushUndo();
  if (pnKontext.typ === 'beet') {
    const bed = getCurrentBeds().find(b => b.id === pnKontext.bedId);
    const plant = bed && bed.plants[pnKontext.idx];
    if (!plant) return;
    if (katalog) plant.sym = katalog.sym;
    document.getElementById('ppName').value = name;
    savePlantInfo();
    openPlantPanel(bed, pnKontext.idx);
  } else if (pnKontext.typ === 'frei') {
    const fp = getCurrentFreiPflanzen().find(x => x.id === pnKontext.id);
    if (!fp) return;
    if (katalog) fp.sym = katalog.sym;
    document.getElementById('fpName').value = name;
    fpAutoSave();
    openFreiPflanzePanel(fp);
  }
  pflanzeBestimmenSchliessen();
  showTempStatus('🔍 Als „' + name + '“ übernommen', 3);
}

// ==================== BEISPIELBEETE (bewährte Mischkultur-Kombinationen) ====================
// Fest eingebaut, nicht synchronisiert. „Einfügen“ legt ein normales Beet an (Rechteck, Pflanzen
// in Reihen nach Art gruppiert), danach ist es wie jedes andere Beet frei veränderbar.
// zehrer: Hauptkultur des Beets – S = Starkzehrer, M = Mittelzehrer, W = Schwachzehrer (für die Fruchtfolge)
// BEISPIEL_BEETE → pflanzendaten.js
// BEISPIEL_ZEHRER → pflanzendaten.js
let beispielFilterWert = 'alle';
function beispielFilterSetzen(f) { beispielFilterWert = f; renderBeispielBeete(); }
function renderBeispielBeete() {
  const filterBox = document.getElementById('beispielFilter');
  const box = document.getElementById('beispielBeeteBox');
  if (!filterBox || !box) return;
  const chip = (k, t) => `<button type="button" class="saat-chip${beispielFilterWert === k ? ' an' : ''}" onclick="beispielFilterSetzen('${k}')">${t}</button>`;
  filterBox.innerHTML = chip('alle', 'Alle') + chip('S', BEISPIEL_ZEHRER.S) + chip('M', BEISPIEL_ZEHRER.M) + chip('W', BEISPIEL_ZEHRER.W);
  const liste = BEISPIEL_BEETE.filter(b => beispielFilterWert === 'alle' || b.zehrer === beispielFilterWert);
  box.innerHTML = liste.map(b => {
    const anzahl = b.pflanzen.reduce((s, [, n]) => s + n, 0);
    const mehrjaehrig = b.pflanzen.some(([n]) => isPerennial(n));
    const pflanzen = b.pflanzen.map(([n, a]) => {
      const p = PLANTS.find(x => x.name === n);
      return `<span>${p ? p.sym : '🌱'} ${escapeHtml(n)} ×${a}</span>`;
    }).join('');
    return `<div class="beispiel-karte" style="--bf:${b.farbe}">
      <div class="beispiel-kopf">
        <span class="beispiel-titel">${b.icon} ${escapeHtml(b.name)}
          <div class="beispiel-meta">${BEISPIEL_ZEHRER[b.zehrer]} · ${zahlDe(b.w / 100)} × ${zahlDe(b.h / 100)} m · ${anzahl} Pflanzen${mehrjaehrig ? ' · 🔄 teils mehrjährig' : ''}</div></span>
        <button class="tool-btn" style="padding:6px 10px;font-size:0.72rem;flex-shrink:0" onclick="beispielBeetEinfuegen('${b.id}')">➕ Einfügen</button>
      </div>
      <div class="beispiel-pflanzen">${pflanzen}</div>
      <div class="beispiel-text">${escapeHtml(b.text)}</div>
      ${b.tipp ? `<div class="beispiel-tipp">💡 ${escapeHtml(b.tipp)}</div>` : ''}
    </div>`;
  }).join('');
}
function beispielBeetEinfuegen(id) {
  const bsp = BEISPIEL_BEETE.find(b => b.id === id);
  if (!bsp || !gardens[currentGardenId]) return;
  // Pflanzen in einem Raster verteilen, nach Art gruppiert (Reihenfolge der Liste)
  const namen = [];
  bsp.pflanzen.forEach(([n, a]) => { for (let k = 0; k < a; k++) namen.push(n); });
  const spalten = Math.max(1, Math.round(Math.sqrt(namen.length * bsp.w / bsp.h)));
  const zeilen = Math.ceil(namen.length / spalten);
  const zellW = bsp.w / spalten, zellH = bsp.h / zeilen;
  const plants = namen.map((n, k) => ({
    sym: (PLANTS.find(p => p.name === n) || {}).sym || '🌱', name: n, variety: '',
    rx: -bsp.w / 2 + zellW * (k % spalten + 0.5), ry: -bsp.h / 2 + zellH * (Math.floor(k / spalten) + 0.5),
    notes: '', date: '', location: '', pest: '', solution: '', harvests: [],
  }));
  // Name eindeutig machen, falls das Beispiel schon einmal eingefügt wurde
  const vorhanden = getCurrentBeds().map(b => b.name);
  let name = bsp.name, nr = 2;
  while (vorhanden.includes(name)) name = bsp.name + ' ' + nr++;
  pushUndo();
  const jitter = () => Math.floor(Math.random() * 40) - 20;
  const bed = { id: Date.now(), shape: 'rect', x: canvas.width / 2 + jitter(), y: canvas.height / 2 + jitter(),
    w: bsp.w, h: bsp.h, color: bsp.farbe, name, rotation: 0, plants };
  getCurrentBeds().push(bed);
  selectedBed = bed; selectedBeds = [bed];
  document.getElementById('templateModal').style.display = 'none';
  showBedEditor(bed);
  draw(); renderBedList(); saveData(); updateStatus();
  beetFotoAnsichtenAktualisieren();
  showTempStatus(`➕ „${name}“ angelegt – auf der Karte an die richtige Stelle ziehen`, 5);
}



// ==================== 🧭 NORDPFEIL & ☀️ LAGE DER BEETE ====================
// gardens[id].nordGrad = Winkel von „oben auf der Karte“ im Uhrzeigersinn bis Norden (0 = oben ist Norden).
// Die Sonnenstunden werden grob geschätzt: Gebäude, Mauern und Bäume, die in Richtung Osten, Süden oder Westen
// vor einem Beet stehen, nehmen Morgen-, Mittags- bzw. Abendsonne weg. Pro Beet lässt sich das von Hand korrigieren.
function nordGrad() { const g = gardens[currentGardenId]; return g && typeof g.nordGrad === 'number' ? g.nordGrad : null; }
function kartenRichtung(peilung) { const a = ((nordGrad() || 0) + peilung) * Math.PI / 180; return { x: Math.sin(a), y: -Math.cos(a) }; }
const SONNEN_SEKTOREN = [[90, 3, 'Morgensonne', 'Osten'], [135, 2, 'Vormittagssonne', 'Südosten'], [180, 3, 'Mittagssonne', 'Süden'], [225, 2, 'Nachmittagssonne', 'Südwesten'], [270, 2, 'Abendsonne', 'Westen']];
const RICHTUNG_8 = [['N', 0, 'Norden'], ['NO', 45, 'Nordosten'], ['O', 90, 'Osten'], ['SO', 135, 'Südosten'], ['S', 180, 'Süden'], ['SW', 225, 'Südwesten'], ['W', 270, 'Westen'], ['NW', 315, 'Nordwesten']];
function schattenWerfer(ausser) {
  const liste = [];
  getCurrentBeds().forEach(b => {
    if (b === ausser || b.kind !== 'struktur') return;
    // Rechteckige Elemente als (gedrehtes) Rechteck, runde als Kreis
    const form = b.shape === 'circle' ? { r: Math.max(b.rx ?? b.r ?? 60, b.ry ?? b.r ?? 60) } : { w: b.w || 100, h: b.h || 100, rot: b.rotation || 0 };
    if (b.strukturTyp === 'gebaeude') liste.push(Object.assign({ x: b.x, y: b.y, weite: 600, dicht: 1, icon: '🏠', name: b.name || 'Gebäude' }, form));
    else if (b.strukturTyp === 'mauer') liste.push(Object.assign({ x: b.x, y: b.y, weite: 250, dicht: 0.9, icon: '🧱', name: b.name || 'Mauer' }, form));
    else if (b.strukturTyp === 'hecke') liste.push(Object.assign({ x: b.x, y: b.y, weite: 300, dicht: 0.7, icon: '🌳', name: b.name || 'Hecke' }, form));
  });
  getCurrentFreiPflanzen().forEach(fp => {
    const n = (fp.name || '').trim(), abst = kronenDurchmesser(fp).d;
    const baum = abst >= 250 || /baum|walnuss|linde|eiche|buche|ahorn|birke|tanne|fichte|kiefer|hasel/i.test(n) || ['🌳', '🌲'].includes(fp.sym);
    if (baum) liste.push({ x: fp.x, y: fp.y, r: Math.max(120, abst / 2 || 150), weite: 500, dicht: 0.6, icon: fp.sym || '🌳', name: n || 'Baum' });
  });
  return liste;
}
// Abstand, nach dem ein Strahl (Start x,y, Richtung v) das Hindernis trifft – oder null.
// rand = halbe „Strahlbreite“ (ein Beet ist kein Punkt).
function strahlTreffer(x, y, v, w, rand) {
  if (w.w) {
    const a = -(w.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const ox = (x - w.x) * c - (y - w.y) * s, oy = (x - w.x) * s + (y - w.y) * c;
    const vx = v.x * c - v.y * s, vy = v.x * s + v.y * c;
    const hx = w.w / 2 + rand, hy = w.h / 2 + rand;
    let tmin = -Infinity, tmax = Infinity;
    for (const [o, d, h] of [[ox, vx, hx], [oy, vy, hy]]) {
      if (Math.abs(d) < 1e-9) { if (Math.abs(o) > h) return null; continue; }
      let t1 = (-h - o) / d, t2 = (h - o) / d; if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    if (tmax <= 0) return null;
    if (tmin <= 0) return null; // Beet liegt (teilweise) im Hindernis – nicht werten
    return tmin;
  }
  const dx = w.x - x, dy = w.y - y, t = dx * v.x + dy * v.y;
  if (t <= 1) return null;
  const quer = Math.abs(dx * v.y - dy * v.x);
  return quer < w.r + rand ? Math.max(1, t - w.r) : null;
}
function bedLage(bed) {
  if (nordGrad() === null) return null;
  const werfer = schattenWerfer(bed), halb = Math.min(getBedRadius(bed), 150) * 0.35;
  const trifft = (peilung, maxWeite) => {
    const v = kartenRichtung(peilung);
    let best = null;
    werfer.forEach(w => {
      const t = strahlTreffer(bed.x, bed.y, v, w, halb);
      if (t === null || t > (maxWeite || w.weite)) return;
      if (!best || w.dicht > best.dicht) best = w;
    });
    return best;
  };
  let stunden = 0;
  const verdeckt = [];
  SONNEN_SEKTOREN.forEach(([peilung, h, wann]) => {
    const w = trifft(peilung);
    stunden += h * (w ? 1 - w.dicht : 1);
    if (w) verdeckt.push({ w, wann });
  });
  // Mauer/Gebäude direkt nördlich = Beet liegt vor einer Südwand (warm, geschützt)
  const nord = trifft(0, 150);
  const warm = !!(nord && nord.dicht >= 0.9);
  stunden = Math.round(stunden * 2) / 2;
  return { stunden, klasse: stunden >= 6 ? 'sonne' : stunden >= 3 ? 'halbschatten' : 'schatten', verdeckt, warm, waermeQuelle: warm ? nord : null };
}
function bedLichtKlasse(bed) { return bed.lichtManuell || (bedLage(bed) || {}).klasse || null; }
const LICHT_PASST = { sonne: ['V', 'S', 'SH'], halbschatten: ['SH', 'H', 'S'], schatten: ['H', 'HS'] };
function bedLichtSetzen(wert) {
  if (!selectedBed) return;
  pushUndo();
  if (wert) selectedBed.lichtManuell = wert; else delete selectedBed.lichtManuell;
  saveData(); renderBedLage(selectedBed);
}
function renderBedLage(bed) {
  const box = document.getElementById('bedLageBox');
  if (!box) return;
  if (!bed || bed.kind === 'struktur') { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  const lage = bedLage(bed);
  let html = '<div class="lage-titel">☀️ Sonne &amp; Lage</div>';
  if (!lage && !bed.lichtManuell) {
    html += `<div class="lage-zeile">Lege einmal fest, wo auf deiner Karte Norden ist – dann schätzt die App für jedes Beet die Sonnenstunden und schlägt passende Pflanzen vor.</div>
      <button type="button" class="btn-secondary lage-knopf" onclick="nordModalOeffnen()">🧭 Norden festlegen</button>`;
  }
  const klasse = bedLichtKlasse(bed);
  if (lage) {
    const li = BLUMEN_LICHT[lage.klasse];
    html += `<div class="lage-zeile"><b>${li[0]} ca. ${zahlDe(lage.stunden)} Std. direkte Sonne</b> <span style="opacity:.75">(${li[1]}, geschätzt)</span></div>`;
    lage.verdeckt.forEach(({ w, wann }) => { html += `<div class="lage-zeile lage-klein">${escapeHtml(w.icon)} ${escapeHtml(w.name)} nimmt ${w.dicht < 1 ? 'teilweise ' : ''}die ${wann}</div>`; });
    if (lage.warm) html += `<div class="lage-zeile lage-klein">🔥 Liegt vor einer Südwand (${escapeHtml(lage.waermeQuelle.name)}) – besonders warm und geschützt</div>`;
    if (!lage.verdeckt.length) html += `<div class="lage-zeile lage-klein">Keine Gebäude, Mauern oder Bäume im Osten, Süden oder Westen eingezeichnet.</div>`;
  }
  html += `<div class="lage-zeile" style="margin-top:6px"><label style="font-size:0.72rem">Tatsächlich: <select onchange="bedLichtSetzen(this.value)" style="font-size:0.74rem">
    <option value=""${!bed.lichtManuell ? ' selected' : ''}>${lage ? 'wie geschätzt' : '– bitte wählen –'}</option>
    ${Object.entries(BLUMEN_LICHT).map(([k, v]) => `<option value="${k}"${bed.lichtManuell === k ? ' selected' : ''}>${v[0]} ${v[1]} (${v[2]})</option>`).join('')}
  </select></label></div>`;
  // Passen die Pflanzen zur Lage?
  if (klasse) {
    const warn = [];
    const gesehen = new Set();
    (bed.plants || []).forEach(p => {
      const n = (p.name || '').trim(); if (!n || gesehen.has(n)) return; gesehen.add(n);
      const bd = pflanzenBedingungenFinden(n); if (!bd) return;
      const l = bd[0];
      if (klasse === 'schatten' && ['V', 'S', 'SH'].includes(l)) warn.push(`${n} braucht mehr Sonne`);
      else if (klasse === 'halbschatten' && l === 'V') warn.push(`${n} wünscht volle Sonne – wächst hier schwächer`);
      else if (klasse === 'sonne' && l === 'HS') warn.push(`${n} mag es schattiger`);
    });
    if (warn.length) html += `<div class="lage-warn">⚠️ ${warn.map(escapeHtml).join('<br>⚠️ ')}</div>`;
    html += `<button type="button" class="btn-secondary lage-knopf" onclick="blumenFilter={licht:'${klasse}',boden:'alle'};openBlumenBeete()">🌸 Passende Blumenbeete für diese Lage</button>`;
  }
  // 🦔 Tiere
  html += bedTiereHtml(bed, klasse);
  box.innerHTML = html;
}
// Passt eine Futterpflanze aus dem Tier-Lexikon zu dieser Pflanze? Gleicher Katalogname (inkl. Aliase wie „Primel“)
// oder als ganzes Wort enthalten („Salbei“ ↔ „Wiesen-Salbei“), aber nicht als Wortteil („Weide“ ≠ „Blutweiderich“).
function pflanzeGleich(tierPflanze, name) {
  const a = lexNorm(lexKatalogName(tierPflanze)), b = lexNorm(lexKatalogName(name));
  if (a === b) return true;
  const woerter = x => lexNorm(x).split(/[\s\-()]+/).filter(w => w.length > 2);
  const pa = lexNorm(tierPflanze), pb = lexNorm(name);
  return woerter(name).includes(pa) || woerter(tierPflanze).includes(pb);
}
function tiereFuerPflanze(name) {
  return alleTiere().filter(t => (t.pflanzen || []).some(p => pflanzeGleich(p, name)));
}
function bedTiereHtml(bed, klasse) {
  const namen = [...new Set((bed.plants || []).map(p => (p.name || '').trim()).filter(Boolean))];
  const tiere = new Map();
  namen.forEach(n => tiereFuerPflanze(n).forEach(t => { if (!tiere.has(t.id)) tiere.set(t.id, { t, pfl: [] }); tiere.get(t.id).pfl.push(n); }));
  let html = '<div class="lage-titel" style="margin-top:12px">🦔 Gut für Tiere</div>';
  if (tiere.size) {
    html += `<div class="lage-chips">${[...tiere.values()].slice(0, 12).map(({ t, pfl }) => `<button type="button" class="lex-pchip" title="dank ${escapeHtml(pfl.join(', '))}" onclick="tierDetailOeffnen('${t.id}')">${t.icon} ${escapeHtml(t.name)}</button>`).join('')}${tiere.size > 12 ? `<span class="lage-klein">+${tiere.size - 12}</span>` : ''}</div>`;
  } else html += `<div class="lage-zeile lage-klein">Die Pflanzen in diesem Beet stehen bei keinem Tier im Lexikon als Futterpflanze.</div>`;
  // Ideen: Stauden, die zur Lage passen und ein Tier anlocken, das hier noch nicht versorgt ist
  if (klasse && typeof STAUDEN !== 'undefined') {
    const imGarten = new Set(); getCurrentBeds().forEach(b => (b.plants || []).forEach(p => imGarten.add((p.name || '').trim()))); getCurrentFreiPflanzen().forEach(fp => imGarten.add((fp.name || '').trim()));
    const sicht = tierSichtungen();
    const ideen = STAUDEN.filter(s => LICHT_PASST[klasse].includes(s.licht) && !imGarten.has(s.name))
      .map(s => { const ts = tiereFuerPflanze(s.name).filter(t => !tiere.has(t.id)); return { s, ts, wert: ts.length + ts.filter(t => !sicht[t.id]).length * 0.5 + (s.heimisch ? 0.5 : 0) }; })
      .filter(x => x.ts.length).sort((a, b) => b.wert - a.wert).slice(0, 3);
    if (ideen.length) html += `<div class="lage-zeile lage-klein" style="margin-top:6px">💡 Passt hierher und lockt neue Gäste an:</div>` + ideen.map(({ s, ts }) =>
      `<div class="lage-idee" onclick="lexikonOeffnen(${jsAttrStr(s.name).replace(/"/g, '&quot;')})">${s.sym} <b>${escapeHtml(s.name)}</b> → ${ts.slice(0, 3).map(t => t.icon + ' ' + escapeHtml(t.name)).join(', ')}</div>`).join('');
  }
  return html;
}

// ---------- Nord-Dialog ----------
let nordEntwurf = 0;
function nordModalOeffnen() {
  nordEntwurf = nordGrad() ?? 0;
  document.getElementById('nordModal').style.display = 'flex';
  const kompass = !!(window.DeviceOrientationEvent);
  document.getElementById('nordKompassZeile').style.display = kompass ? '' : 'none';
  nordModalRendern();
}
function nordModalSchliessen() { document.getElementById('nordModal').style.display = 'none'; window.removeEventListener('deviceorientationabsolute', nordKompassEvent); window.removeEventListener('deviceorientation', nordKompassEvent); }
function nordObenSetzen(peilungOben) { nordEntwurf = (360 - peilungOben) % 360; nordModalRendern(); }
function nordModalRendern() {
  const oben = (360 - nordEntwurf) % 360;
  document.getElementById('nordRose').style.transform = `rotate(${nordEntwurf}deg)`;
  document.getElementById('nordRegler').value = nordEntwurf;
  const naechste = RICHTUNG_8.reduce((b, r) => { const d = Math.min(Math.abs(r[1] - oben), 360 - Math.abs(r[1] - oben)); return d < b[0] ? [d, r] : b; }, [999, null])[1];
  document.getElementById('nordText').textContent = `Oben auf der Karte ist ${naechste[2]}${Math.round(oben) % 45 ? ' (' + Math.round(oben) + '°)' : ''}.`;
  document.getElementById('nordKnoepfe').innerHTML = RICHTUNG_8.map(r => `<button type="button" class="saat-chip${Math.round(oben) === r[1] ? ' an' : ''}" onclick="nordObenSetzen(${r[1]})">${r[0]}</button>`).join('');
}
let nordKompassWert = null;
function nordKompassEvent(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
  if (h === null) return;
  nordKompassWert = h;
  document.getElementById('nordKompassAnzeige').textContent = 'Blickrichtung: ' + Math.round(h) + '°';
}
async function nordKompassStarten() {
  try { if (typeof DeviceOrientationEvent.requestPermission === 'function') { const ok = await DeviceOrientationEvent.requestPermission(); if (ok !== 'granted') return; } } catch (e) {}
  nordKompassWert = null;
  window.addEventListener('deviceorientationabsolute', nordKompassEvent);
  window.addEventListener('deviceorientation', nordKompassEvent);
  document.getElementById('nordKompassAnzeige').textContent = 'Handy flach halten …';
  setTimeout(() => { if (nordKompassWert === null) document.getElementById('nordKompassAnzeige').textContent = 'Kein Kompass gefunden – bitte oben eine Richtung antippen.'; }, 2500);
}
function nordKompassUebernehmen() { if (nordKompassWert === null) return; nordObenSetzen(Math.round(nordKompassWert)); }
function nordSpeichern(entfernen) {
  const g = gardens[currentGardenId]; if (!g) return;
  pushUndo();
  if (entfernen) delete g.nordGrad; else g.nordGrad = Math.round(nordEntwurf) % 360;
  saveData(); nordModalSchliessen(); nordWidgetAktualisieren();
  if (selectedBed) renderBedLage(selectedBed);
  showTempStatus(entfernen ? 'Nordpfeil entfernt' : '🧭 Norden gespeichert – die Beete zeigen jetzt ihre Sonnenstunden', 4);
}
function nordWidgetAktualisieren() {
  const pf = document.getElementById('nordWidgetPfeil'); if (!pf) return;
  const n = nordGrad();
  pf.style.transform = `rotate(${n || 0}deg)`;
  pf.style.opacity = n === null ? 0.45 : 1;
  document.getElementById('nordWidgetBtn').title = n === null ? 'Norden festlegen' : 'Nordpfeil – antippen zum Ändern';
}

// ==================== 🧤 WINTERSCHUTZ im „Heute“-Bereich ====================
function winterschutzSaison() { const d = new Date(); return String(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1); }
function winterschutzInfo(name) {
  const n = lexKatalogName(name);
  if (WINTERSCHUTZ[n]) return WINTERSCHUTZ[n];
  if (isFrostTender(n)) return ['nacht', 'Bei Frost mit Vlies abdecken oder ins Haus holen', 'abdecken'];
  return null;
}
function winterschutzListe() {
  const g = gardens[currentGardenId]; if (!g) return [];
  const map = new Map();
  const dazu = (name, ort) => {
    const n = lexKatalogName((name || '').trim()); if (!n) return;
    const info = winterschutzInfo(n); if (!info) return;
    if (!map.has(n)) map.set(n, { name: n, anzahl: 0, orte: new Set(), info });
    const e = map.get(n); e.anzahl++; if (ort) e.orte.add(ort);
  };
  (g.beds || []).filter(b => b.kind !== 'struktur').forEach(b => (b.plants || []).forEach(p => dazu(p.name, b.name)));
  (g.freiPflanzen || []).forEach(fp => dazu(fp.name, 'frei im Garten'));
  const erledigt = ((g.winterschutz || {})[winterschutzSaison()]) || {};
  return [...map.values()].map(e => Object.assign(e, { erledigt: e.info[0] === 'saison' ? erledigt[e.name] || null : null }))
    .sort((a, b) => (!!a.erledigt - !!b.erledigt) || ((a.info[0] === 'saison' ? 0 : 1) - (b.info[0] === 'saison' ? 0 : 1)) || a.name.localeCompare(b.name, 'de'));
}
function winterschutzUmschalten(name) {
  const g = gardens[currentGardenId]; if (!g) return;
  const s = winterschutzSaison();
  g.winterschutz = g.winterschutz || {};
  g.winterschutz[s] = g.winterschutz[s] || {};
  if (g.winterschutz[s][name]) delete g.winterschutz[s][name]; else g.winterschutz[s][name] = heuteISO();
  // alte Saisons aufräumen
  Object.keys(g.winterschutz).forEach(k => { if (Number(k) < Number(s) - 1) delete g.winterschutz[k]; });
  saveData(); renderHomeOverview();
}
function winterschutzHtml() {
  const monat = new Date().getMonth() + 1;
  const frost = getUpcomingFrostWarning();
  if (!frost && !(monat >= 10 || monat <= 3)) return '';
  const liste = winterschutzListe();
  if (!liste.length) return '';
  const offen = liste.filter(e => e.info[0] === 'saison' && !e.erledigt).length;
  const pflanze = n => (PLANTS.find(p => p.name === n) || {}).sym || '🌱';
  return `<div class="winter-karte${frost ? ' frost' : ''}">
    <div class="winter-kopf">🧤 Winterschutz <span>${frost ? '❄️ ' + escapeHtml(frost.days.map(d => d.label + ' ' + Math.round(d.tmin) + '°C').slice(0, 2).join(', ')) : offen ? offen + ' offen' : '✅ alles erledigt'}</span></div>
    ${liste.map(e => `<div class="winter-zeile${e.erledigt ? ' fertig' : ''}">
      <span class="winter-sym">${pflanze(e.name)}</span>
      <span class="winter-text"><b>${escapeHtml(e.name)}</b>${e.anzahl > 1 ? ' ×' + e.anzahl : ''}<small>${escapeHtml([...e.orte].slice(0, 2).join(', '))}</small><span>${escapeHtml(e.info[1])}</span></span>
      ${e.info[0] === 'saison' ? `<button type="button" class="winter-btn" onclick="winterschutzUmschalten(${jsAttrStr(e.name).replace(/"/g, '&quot;')})">${e.erledigt ? '↺' : '✓ erledigt'}</button>` : '<span class="winter-chip">bei Frost</span>'}
    </div>`).join('')}
  </div>`;
}

// ==================== 🌸 BLUMEN- & STAUDENBEETE: Vorschläge mit Pflanzplan ====================
// Daten: BLUMEN_BEETE, STAUDEN_INFO, BLUETEZEIT (pflanzendaten.js). Der Pflanzplan wird aus Höhe und
// Abstand berechnet: Rand-Beet = hohe Pflanzen hinten (obere Kante), Insel-Beet = hohe Pflanzen in der Mitte.
let blumenFilter = { licht: 'alle', boden: 'alle' };
function openBlumenBeete() {
  const t = document.getElementById('templateModal'); if (t) t.style.display = 'none';
  renderBlumenBeete();
  document.getElementById('blumenBeeteModal').style.display = 'flex';
}
function blumenFilterSetzen(art, wert) { blumenFilter[art] = wert; renderBlumenBeete(); }
function blumenInfo(n) { const si = STAUDEN_INFO[n] || {}; return { hoehe: si.hoehe || 50, abstand: si.abstand || SPACING[n] || 30, farbe: si.farbe || '#c9a0c0', heimisch: !!si.heimisch, bluete: BLUETEZEIT[n] || null, giftig: !!si.giftig }; }
// kleiner, fester Zufall – damit der Plan bei jedem Öffnen gleich aussieht
function blumenZufall(seed) { let x = 0; for (const c of String(seed)) x = (x * 31 + c.charCodeAt(0)) % 9973; return () => { x = (x * 7919 + 13) % 9973; return x / 9973; }; }
function blumenLayout(b) {
  const zufall = blumenZufall(b.id);
  const punkte = [];
  const klasse = h => h >= 90 ? 0 : h >= 40 ? 1 : 2;
  if (b.form === 'insel') {
    // Ringe von innen nach außen, hohe Arten zuerst; jede Art bleibt als Gruppe (Bogenstück) zusammen
    const R = b.w / 2;
    const einzel = [];
    b.pflanzen.slice().sort((x, y) => blumenInfo(y[0]).hoehe - blumenInfo(x[0]).hoehe).forEach(([n, a]) => { for (let i = 0; i < a; i++) einzel.push(n); });
    const mittelAbstand = einzel.reduce((s, n) => s + blumenInfo(n).abstand, 0) / einzel.length;
    let d = mittelAbstand, ringe;
    for (let versuch = 0; versuch < 30; versuch++) {
      ringe = []; let k = 0, j = 0;
      while (k < einzel.length) {
        const r = j === 0 ? 0 : j * d;
        if (r > R - d * 0.35) { ringe = null; break; }
        const kap = j === 0 ? 1 : Math.max(1, Math.floor(2 * Math.PI * r / d));
        ringe.push({ r, liste: einzel.slice(k, k + kap) }); k += kap; j++;
      }
      if (ringe) break;
      d *= 0.93;
    }
    // äußersten Ring an den Rand schieben, die übrigen gleichmäßig verteilen
    const n = ringe.length;
    ringe.forEach((ring, j) => {
      const r = n === 1 ? 0 : (j === 0 && ring.liste.length === 1 ? 0 : (R - d * 0.45) * (j + (ringe[0].liste.length === 1 ? 0 : 0.5)) / (n - (ringe[0].liste.length === 1 ? 1 : 0.5)));
      const start = zufall() * Math.PI * 2;
      ring.liste.forEach((name, i) => {
        if (r === 0) { punkte.push({ name, x: 0, y: 0 }); return; }
        const w = start + i / ring.liste.length * Math.PI * 2;
        const rr = r * (0.94 + zufall() * 0.1);
        punkte.push({ name, x: Math.cos(w) * rr, y: Math.sin(w) * rr });
      });
    });
  } else {
    const W = b.w, H = b.h;
    const baender = [[], [], []];
    b.pflanzen.forEach(([n, a]) => baender[klasse(blumenInfo(n).hoehe)].push([n, a]));
    const flaeche = band => band.reduce((s, [n, a]) => s + a * Math.pow(blumenInfo(n).abstand, 2), 0);
    // Bandhöhe nach Fläche, aber mindestens so hoch wie der größte Pflanzabstand im Band
    const roh = baender.map(bd => bd.length ? Math.max(flaeche(bd) / W, Math.max(...bd.map(([n]) => blumenInfo(n).abstand)) * 0.8) : 0);
    const summe = roh.reduce((s, x) => s + x, 0) || 1;
    let y0 = -H / 2;
    baender.forEach((band, bi) => {
      if (!band.length) return;
      const bh = H * roh[bi] / summe;
      const bf = flaeche(band) || 1;
      let x0 = -W / 2;
      band.forEach(([n, a]) => {
        const gw = W * a * Math.pow(blumenInfo(n).abstand, 2) / bf;
        const spalten = Math.min(a, Math.max(1, Math.round(Math.sqrt(a * gw / bh))));
        const zeilen = Math.ceil(a / spalten);
        const cw = gw / spalten, ch = bh / zeilen;
        for (let i = 0; i < a; i++) {
          const zi = Math.floor(i / spalten), si = i % spalten;
          const versatz = zi % 2 ? cw * 0.25 : -cw * 0.25 * (spalten > 1 ? 1 : 0);
          const x = x0 + cw * (si + 0.5) + versatz + (zufall() - 0.5) * cw * 0.25;
          const y = y0 + ch * (zi + 0.5) + (zufall() - 0.5) * ch * 0.25;
          const rr = Math.min(blumenInfo(n).abstand / 2, W / 4, H / 4) * 0.7;
          punkte.push({ name: n, x: Math.max(-W / 2 + rr, Math.min(W / 2 - rr, x)), y: Math.max(-H / 2 + rr, Math.min(H / 2 - rr, y)) });
        }
        x0 += gw;
      });
      y0 += bh;
    });
  }
  return punkte;
}
function blumenVorschauSvg(b) {
  const punkte = blumenLayout(b);
  const W = b.w, H = b.h, rand = 12;
  const grund = b.form === 'insel'
    ? `<ellipse cx="0" cy="0" rx="${W / 2}" ry="${H / 2}" fill="#a98b6a" opacity="0.55"/>`
    : `<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="8" fill="#a98b6a" opacity="0.55"/>` +
      `<line x1="${-W / 2}" y1="${-H / 2 - 4}" x2="${W / 2}" y2="${-H / 2 - 4}" stroke="#6b5a45" stroke-width="3" stroke-dasharray="6 4"/>`;
  const kreise = punkte.map(p => { const i = blumenInfo(p.name); const r = Math.max(5, i.abstand / 2 * 0.95);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${i.farbe}" fill-opacity="0.78" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>`; }).join('');
  // eine Beschriftung je Pflanzengruppe (Mittelpunkt)
  const gruppen = {};
  punkte.forEach(p => { (gruppen[p.name] = gruppen[p.name] || []).push(p); });
  const schrift = Math.max(9, Math.min(15, W / 22));
  const texte = Object.entries(gruppen).map(([n, ps]) => {
    const x = ps.reduce((s, p) => s + p.x, 0) / ps.length, y = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    const kurz = n.length > 13 ? n.split(/[\s-]/).pop() : n;
    return `<text x="${x.toFixed(1)}" y="${(y + schrift / 3).toFixed(1)}" font-size="${schrift}" text-anchor="middle" fill="#1f1a12" stroke="#fff" stroke-width="3" paint-order="stroke" font-weight="600">${escapeHtml(kurz)}</text>`;
  }).join('');
  return `<svg class="blumen-svg" viewBox="${-W / 2 - rand} ${-H / 2 - rand} ${W + rand * 2} ${H + rand * 2}" role="img" aria-label="Pflanzplan ${escapeHtml(b.name)}">${grund}${kreise}${texte}</svg>`;
}
function blumenBluehbalken(b) {
  const monate = Array.from({ length: 12 }, (_, m) => b.pflanzen.filter(([n]) => { const bl = blumenInfo(n).bluete; return bl && isInHarvestWindow(bl, m + 1); }));
  const max = Math.max(1, ...monate.map(l => l.length));
  return `<div class="blumen-bluete">${monate.map((l, m) => {
    const farben = l.map(([n]) => blumenInfo(n).farbe);
    const bg = farben.length ? `linear-gradient(90deg, ${farben.map((f, i) => `${f} ${i / farben.length * 100}% ${(i + 1) / farben.length * 100}%`).join(', ')})` : 'transparent';
    return `<span title="${'JFMAMJJASOND'[m]}: ${l.map(([n]) => n).join(', ') || 'keine Blüte'}"><i style="background:${bg};opacity:${l.length ? 0.45 + 0.55 * l.length / max : 0}"></i>${'JFMAMJJASOND'[m]}</span>`;
  }).join('')}</div>`;
}
function renderBlumenBeete() {
  const box = document.getElementById('blumenBeeteBox');
  const chip = (art, k, t) => `<button type="button" class="saat-chip${blumenFilter[art] === k ? ' an' : ''}" onclick="blumenFilterSetzen('${art}','${k}')">${t}</button>`;
  document.getElementById('blumenFilterLicht').innerHTML = chip('licht', 'alle', 'Alle') + Object.entries(BLUMEN_LICHT).map(([k, v]) => chip('licht', k, v[0] + ' ' + v[1] + ' <small>(' + v[2].replace('mehr als ', '> ').replace('weniger als ', '< ').replace(' Std. Sonne', ' h') + ')</small>')).join('');
  document.getElementById('blumenFilterBoden').innerHTML = chip('boden', 'alle', 'Alle Böden') + Object.entries(BLUMEN_BODEN).map(([k, v]) => chip('boden', k, v[0] + ' ' + v[1])).join('');
  const liste = BLUMEN_BEETE.filter(b => (blumenFilter.licht === 'alle' || b.licht === blumenFilter.licht) && (blumenFilter.boden === 'alle' || b.boden === blumenFilter.boden));
  if (!liste.length) { box.innerHTML = '<div class="empty-state">Für diese Kombination gibt es noch keinen Vorschlag – probier einen anderen Boden.</div>'; return; }
  box.innerHTML = liste.map(b => {
    const anzahl = b.pflanzen.reduce((s, [, n]) => s + n, 0);
    const arten = b.pflanzen.length, heimisch = b.pflanzen.filter(([n]) => blumenInfo(n).heimisch).length;
    const giftig = b.pflanzen.filter(([n]) => blumenInfo(n).giftig).map(([n]) => n);
    const li = BLUMEN_LICHT[b.licht], bo = BLUMEN_BODEN[b.boden];
    const pflanzen = b.pflanzen.map(([n, a]) => { const i = blumenInfo(n);
      return `<button type="button" class="blumen-pflanze" onclick="blumenLexikon(${jsAttrStr(n).replace(/"/g, '&quot;')})"><i style="background:${i.farbe}"></i>${escapeHtml(n)} ×${a}</button>`; }).join('');
    return `<div class="beispiel-karte blumen-karte">
      <div class="beispiel-kopf">
        <span class="beispiel-titel">${b.icon} ${escapeHtml(b.name)}
          <div class="beispiel-meta">${zahlDe(b.w / 100)} × ${zahlDe(b.h / 100)} m${b.form === 'insel' ? ' (rund)' : ''} · ${anzahl} Pflanzen · ${arten} Arten</div></span>
        <button class="tool-btn" style="padding:6px 10px;font-size:0.72rem;flex-shrink:0" onclick="blumenBeetEinfuegen('${b.id}')">➕ Einfügen</button>
      </div>
      <div class="blumen-lage">
        <span>${li[0]} ${li[1]} · ${li[2]}</span><span>🧭 ${b.richtung.map(r => HIMMELSRICHTUNG[r]).join(', ')}</span><span>${bo[0]} ${bo[1]}</span><span>🌿 ${heimisch} von ${arten} heimisch</span>
      </div>
      ${blumenVorschauSvg(b)}
      <div class="blumen-hinweis">${b.form === 'insel' ? '⭕ Hohe Pflanzen in der Mitte, niedrige außen' : '⬆️ Oben = Rückseite (Wand, Zaun oder Hecke) – hohe Pflanzen hinten, niedrige vorne'}</div>
      <div class="blumen-abschnitt">🌸 Blüte im Jahr</div>
      ${blumenBluehbalken(b)}
      <div class="blumen-pflanzen">${pflanzen}</div>
      <div class="beispiel-text">${escapeHtml(b.text)}</div>
      ${b.tipp ? `<div class="beispiel-tipp">💡 ${escapeHtml(b.tipp)}</div>` : ''}
      ${giftig.length ? `<div class="beispiel-tipp">☠️ Giftig: ${escapeHtml(giftig.join(', '))} – bei kleinen Kindern nicht direkt an den Spielbereich pflanzen.</div>` : ''}
    </div>`;
  }).join('');
}
function blumenLexikon(n) { document.getElementById('blumenBeeteModal').style.display = 'none'; lexikonOeffnen(n); }
function blumenBeetEinfuegen(id) {
  const b = BLUMEN_BEETE.find(x => x.id === id);
  if (!b || !gardens[currentGardenId]) return;
  const plants = blumenLayout(b).map(p => ({
    sym: (PLANTS.find(x => x.name === p.name) || {}).sym || '🌸', name: p.name, variety: '',
    rx: Math.round(p.x), ry: Math.round(p.y), notes: '', date: '', location: '', pest: '', solution: '', harvests: [],
  }));
  const vorhanden = getCurrentBeds().map(x => x.name);
  let name = b.name, nr = 2;
  while (vorhanden.includes(name)) name = b.name + ' ' + nr++;
  pushUndo();
  const jitter = () => Math.floor(Math.random() * 40) - 20;
  const bed = b.form === 'insel'
    ? { id: Date.now(), shape: 'circle', x: canvas.width / 2 + jitter(), y: canvas.height / 2 + jitter(), rx: b.w / 2, ry: b.h / 2, color: '#d488a0', name, rotation: 0, plants }
    : { id: Date.now(), shape: 'rect', x: canvas.width / 2 + jitter(), y: canvas.height / 2 + jitter(), w: b.w, h: b.h, color: '#d488a0', name, rotation: 0, plants };
  getCurrentBeds().push(bed);
  selectedBed = bed; selectedBeds = [bed];
  document.getElementById('blumenBeeteModal').style.display = 'none';
  showBedEditor(bed);
  draw(); renderBedList(); saveData(); updateStatus();
  beetFotoAnsichtenAktualisieren();
  showTempStatus(`🌸 „${name}“ angelegt – auf der Karte an die richtige Stelle ziehen und drehen`, 5);
}

function insertTemplate(id) {
  const tpl = bedTemplates.find(t => t.id === id);
  if (!tpl || !gardens[currentGardenId]) return;
  pushUndo();
  const jitter = () => Math.floor(Math.random()*40) - 20;
  const bed = {
    id: Date.now(),
    shape: tpl.shape,
    x: (canvas.width/2) + jitter(),
    y: (canvas.height/2) + jitter(),
    r: undefined,
    rx: tpl.shape==='circle' ? tpl.rx : undefined,
    ry: tpl.shape==='circle' ? tpl.ry : undefined,
    w: tpl.shape!=='circle' ? tpl.w : undefined,
    h: tpl.shape!=='circle' ? tpl.h : undefined,
    apexOffset: tpl.shape==='tri' ? tpl.apexOffset : undefined,
    cutW: tpl.shape==='lshape' ? tpl.cutW : undefined,
    cutH: tpl.shape==='lshape' ? tpl.cutH : undefined,
    points: tpl.shape==='freehand' ? (tpl.points||[]).map(p=>({x:p.x,y:p.y})) : undefined,
    color: tpl.color,
    name: tpl.name,
    rotation: 0,
    plants: tpl.plants.map(p => ({ sym:p.sym, name:p.name, variety:p.variety||'', rx:p.rx, ry:p.ry, notes:p.notes||'', date:'', location:p.location||'', pest:'', solution:'', harvests:[] }))
  };
  getCurrentBeds().push(bed);
  selectedBed = bed; selectedBeds = [bed];
  document.getElementById('templateModal').style.display = 'none';
  showBedEditor(bed);
  draw(); renderBedList(); saveData(); updateStatus();
  showTempStatus(`➕ Vorlage "${tpl.name}" eingefügt`, 3);
}
function deleteTemplate(id) {
  const index = bedTemplates.findIndex(t => t.id === id);
  if (index === -1) return;
  const entfernt = bedTemplates[index];
  bedTemplates.splice(index, 1);
  saveBedTemplatesStorage();
  renderTemplateList();
  zeigeLoeschToast('Vorlage gelöscht: „' + entfernt.name + '"', () => {
    bedTemplates.splice(index, 0, entfernt);
    saveBedTemplatesStorage();
    renderTemplateList();
  });
}

// ==================== STATISTIK-DASHBOARD ====================
function openStats() {
  renderStats();
  document.getElementById('statsModal').style.display = 'flex';
}
function statCard(label, value, warn) {
  return `<div class="stat-card" style="background:var(--cream);border-radius:var(--radius-sm);padding:11px;text-align:center;${warn ? 'border:1.5px solid var(--warn)' : ''}">
    <div style="font-size:1.3rem;font-weight:700;color:${warn ? 'var(--warn)' : 'var(--moss)'}">${value}</div>
    <div style="font-size:0.68rem;color:var(--bark);margin-top:2px">${label}</div>
  </div>`;
}
function renderStats() {
  const box = document.getElementById('statsContent');
  const beds = getCurrentBeds();
  const cmPerPx = getScale();
  let totalAreaM2 = 0, plantCount = 0, conflictCount = 0, undatedCount = 0, perennialCount = 0;
  const catCounts = {}, nameCounts = {};

  beds.forEach(bed => {
    const areaPx2 = bedAreaPx2(bed);
    totalAreaM2 += areaPx2 * cmPerPx * cmPerPx / 10000;
    conflictCount += getBedConflicts(bed).length;
    (bed.plants || []).forEach(p => {
      plantCount++;
      const name = (p.name || '').trim();
      if (!name) return;
      nameCounts[name] = (nameCounts[name] || 0) + 1;
      if (!p.date) undatedCount++;
      if (isPerennial(name)) perennialCount++;
      const cat = (PLANTS.find(pl => pl.name === name) || {}).cat || 'Sonstiges';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
  });

  if (!plantCount && !beds.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Beete in diesem Garten. Lege Beete an und platziere Pflanzen, um hier Statistiken zu sehen.</div>';
    return;
  }

  let html = '';
  const frostWarn = getUpcomingFrostWarning();
  if (frostWarn) {
    let frostTenderCount = 0;
    beds.forEach(bed => (bed.plants||[]).forEach(p => { if (isFrostTender((p.name||'').trim())) frostTenderCount++; }));
    if (frostTenderCount > 0) {
      const isFrost = frostWarn.worst.level === 'frost';
      const dayList = frostWarn.days.map(d => `${d.label} ${Math.round(d.tmin)}°C`).join(', ');
      html += `<div style="font-size:0.78rem;padding:8px 9px;border-radius:7px;background:${isFrost?'#e3ecfb':'#f0f4fb'};border-left:3px solid ${isFrost?'#4a6fa5':'#8ea4c9'};margin-bottom:14px;color:#2c2415">
        ❄️ <strong>${isFrost?'Frost erwartet':'Frostgefahr'}:</strong> ${dayList} · ${frostTenderCount} frostempfindliche Pflanze(n) in diesem Garten – was genau zu tun ist, steht unter 🏠 Heute → 🧤 Winterschutz.
      </div>`;
    }
  }
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">`;
  html += statCard('🪴 Beete', beds.length);
  html += statCard('🌱 Pflanzen', plantCount);
  html += statCard('🔄 Mehrjährig', perennialCount);
  html += statCard('📐 Fläche gesamt', totalAreaM2.toFixed(1) + ' m²');
  html += statCard('⚠️ Mischkultur-Konflikte', conflictCount, conflictCount > 0);
  html += `</div>`;

  const size = getGardenSizeM();
  if (size && size.w > 0 && size.h > 0) {
    const totalGardenM2 = size.w * size.h;
    const usagePct = Math.min(100, (totalAreaM2 / totalGardenM2) * 100);
    html += `<div style="margin-bottom:14px">
      <div style="font-size:0.72rem;color:var(--bark);margin-bottom:4px">Flächennutzung: ${totalAreaM2.toFixed(1)} m² von ${totalGardenM2.toFixed(0)} m² Gartenfläche (${usagePct.toFixed(0)}%)</div>
      <div style="height:10px;border-radius:6px;background:var(--parchment);overflow:hidden">
        <div style="height:100%;width:${usagePct}%;background:var(--moss)"></div>
      </div>
    </div>`;
  }

  const catColors = { 'Gemüse':'#7a9e72', 'Kräuter':'#b5cc8e', 'Beeren':'#c0633a', 'Obst':'#8b6f47', 'Blumen':'#d488a0', 'Sonstiges':'#a8a8a8' };
  const catOrder = ['Gemüse','Kräuter','Beeren','Obst','Blumen','Sonstiges'];
  const catTotal = Object.values(catCounts).reduce((a,b) => a+b, 0);
  if (catTotal > 0) {
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Verteilung nach Kategorie</div>`;
    html += `<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;margin-bottom:6px">`;
    catOrder.forEach(cat => {
      const n = catCounts[cat] || 0;
      if (!n) return;
      html += `<div style="width:${(n/catTotal)*100}%;background:${catColors[cat]}" title="${cat}: ${n}"></div>`;
    });
    html += `</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">`;
    catOrder.forEach(cat => {
      const n = catCounts[cat] || 0;
      if (!n) return;
      html += `<span style="font-size:0.7rem;color:var(--bark);display:flex;align-items:center;gap:4px"><span style="width:9px;height:9px;border-radius:2px;background:${catColors[cat]};display:inline-block"></span>${cat}: ${n}</span>`;
    });
    html += `</div>`;
  }

  const topPlants = Object.entries(nameCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
  if (topPlants.length) {
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Häufigste Pflanzen</div>`;
    html += topPlants.map(([name,n]) => {
      const plant = PLANTS.find(p => p.name === name);
      const sym = plant ? plant.sym : '🌿';
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.78rem"><span>${sym}</span><span style="flex:1">${name}</span><span style="color:var(--bark)">${n}×</span></div>`;
    }).join('');
  }

  const harvestTotals = {};
  const harvestByPlant = {};
  const methodCounts = {};
  beds.forEach(bed => {
    (bed.plants || []).forEach(p => {
      (p.harvests || []).forEach(h => {
        const n = normalizeHarvestUnit(h.unit, parseFloat(h.amount)||0);
        harvestTotals[n.unit] = (harvestTotals[n.unit]||0) + n.amount;
        const name = (p.name||'').trim() || 'Unbenannt';
        harvestByPlant[name] = harvestByPlant[name] || {};
        harvestByPlant[name][n.unit] = (harvestByPlant[name][n.unit]||0) + n.amount;
        if (h.method) methodCounts[h.method] = (methodCounts[h.method]||0) + 1;
      });
    });
  });
  const harvestUnits = Object.keys(harvestTotals);
  if (harvestUnits.length) {
    html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">🧺 Ertrag gesamt</div>`;
    html += `<div style="font-size:0.85rem;color:var(--moss);font-weight:600;margin-bottom:8px">${harvestUnits.map(u => `${harvestTotals[u]%1===0?harvestTotals[u]:harvestTotals[u].toFixed(2)} ${u}`).join(' · ')}</div>`;
    const topHarvest = Object.entries(harvestByPlant)
      .map(([name, units]) => ({ name, kg: units.kg||0, label: Object.entries(units).map(([u,n])=>`${n%1===0?n:n.toFixed(2)} ${u}`).join(', ') }))
      .sort((a,b) => b.kg - a.kg)
      .slice(0,5);
    if (topHarvest.length) {
      html += topHarvest.map(t => {
        const plant = PLANTS.find(p => p.name === t.name);
        const sym = plant ? plant.sym : '🧺';
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.78rem"><span>${sym}</span><span style="flex:1">${t.name}</span><span style="color:var(--bark)">${t.label}</span></div>`;
      }).join('');
    }
  }

  // Verwertung: wie oft welche Verwendung bei der Ernte angegeben wurde (aktueller Garten)
  const methodEntries = Object.entries(methodCounts).sort((a,b) => b[1]-a[1]);
  if (methodEntries.length) {
    const maxMethodCount = Math.max(...methodEntries.map(e=>e[1]));
    html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">🥫 Verwertung</div>`;
    html += methodEntries.map(([key, count]) => {
      const opt = HARVEST_USE_OPTIONS.find(o=>o.key===key);
      const label = opt ? `${opt.icon} ${opt.label}` : key;
      const pct = (count/maxMethodCount)*100;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:130px;font-size:0.72rem;color:var(--bark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}</span>
        <div style="flex:1;height:8px;border-radius:5px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--moss)"></div></div>
        <span style="width:26px;text-align:right;font-size:0.7rem;color:var(--bark)">${count}×</span>
      </div>`;
    }).join('');
  }

  // Vorrat: aktueller Bestand (gartenübergreifend erfasst, wie in der Vorratsliste selbst)
  const activePantry = pantryEntries.filter(e => !e.consumed);
  if (pantryEntries.length) {
    const expiringSoon = getExpiringPantryItems();
    html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">🥫 Vorrat <span style="font-weight:400;color:var(--bark);font-size:0.66rem">– gartenübergreifend</span></div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">`;
    html += statCard('📦 Vorhandene Vorräte', activePantry.length);
    html += statCard('⏳ Läuft bald ab', expiringSoon.length, expiringSoon.length > 0);
    html += `</div>`;
    const pantryByMethod = {};
    activePantry.forEach(e => { const m = e.method || 'Sonstiges'; pantryByMethod[m] = (pantryByMethod[m]||0) + 1; });
    const pantryMethodEntries = Object.entries(pantryByMethod).sort((a,b) => b[1]-a[1]);
    if (pantryMethodEntries.length) {
      const maxPantryCount = Math.max(...pantryMethodEntries.map(e=>e[1]));
      html += pantryMethodEntries.map(([label, count]) => {
        const pct = (count/maxPantryCount)*100;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="width:110px;font-size:0.72rem;color:var(--bark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}</span>
          <div style="flex:1;height:8px;border-radius:5px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${pct}%;background:#d4880a"></div></div>
          <span style="width:26px;text-align:right;font-size:0.7rem;color:var(--bark)">${count}×</span>
        </div>`;
      }).join('');
    }
  }

  if (undatedCount > 0) {
    html += `<div class="empty-state" style="margin-top:10px">ℹ️ ${undatedCount} Pflanze(n) ohne Pflanzdatum (nicht in Pflegeplan/Erntekalender berücksichtigt).</div>`;
  }
  if (!plantCount) {
    html += `<div class="empty-state" style="margin-top:10px">Noch keine Pflanzen platziert.</div>`;
  }

  box.innerHTML = html;
}

// ==================== ERNTEKALENDER-EXPORT (ICS) ====================
function icsPad2(n) { return String(n).padStart(2, '0'); }
function icsDateStr(d) { return d.getFullYear() + icsPad2(d.getMonth()+1) + icsPad2(d.getDate()); }
function icsEscape(s) {
  return String(s ?? '').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');
}
// Erstellt eine einzelne .ics-Datei mit einem Termin UND eingebautem Alarm (VALARM),
// der beim Import in die Kalender-App (Google/Apple Kalender etc.) zur angegebenen
// Uhrzeit eine Benachrichtigung auslöst – das ist der "echte Handy-Alarm" fürs Gerät,
// den eine reine Web-App technisch nicht selbst auslösen kann.
function buildTaskICS(title, description, dateObj, hour, minute) {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const now = new Date();
  const dtstamp = icsDateStr(now) + 'T' + icsPad2(now.getHours()) + icsPad2(now.getMinutes()) + icsPad2(now.getSeconds()) + 'Z';
  const dtStart = icsDateStr(dateObj) + 'T' + icsPad2(hour) + icsPad2(minute) + '00';
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gartenplaner//DE\r\nCALSCALE:GREGORIAN\r\n';
  ics += 'BEGIN:VEVENT\r\n';
  ics += `UID:erinnerung-${Date.now()}-${Math.random().toString(36).slice(2,8)}@gartenplaner\r\n`;
  ics += `DTSTAMP:${dtstamp}\r\n`;
  ics += `DTSTART:${dtStart}\r\n`;
  ics += `DURATION:PT15M\r\n`;
  ics += `SUMMARY:${icsEscape(title)}\r\n`;
  ics += `DESCRIPTION:${icsEscape(description)}\r\n`;
  ics += 'BEGIN:VALARM\r\n';
  ics += 'ACTION:DISPLAY\r\n';
  ics += `DESCRIPTION:${icsEscape(title)}\r\n`;
  ics += 'TRIGGER:PT0S\r\n';
  ics += 'END:VALARM\r\n';
  ics += 'END:VEVENT\r\n';
  ics += 'END:VCALENDAR\r\n';
  return ics;
}
function downloadICS(ics, filename) {
  if (!ics) { showTempStatus('⚠ Erinnerung konnte nicht erstellt werden.', 4); return; }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showTempStatus('📅 Erinnerung heruntergeladen – Datei öffnen und zum Kalender hinzufügen.', 5);
}
// ---------- Direkt ins Termine-Modul eintragen (Alternative zum ICS-Download) ----------
function gartenTerminDirektEintragen(title, notes, dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) { showTempStatus('⚠ Erinnerung konnte nicht erstellt werden.', 4); return; }
  try {
    const KEY_TERMINE_EVENTS = 'termine_events_v1';
    const raw = localStorage.getItem(KEY_TERMINE_EVENTS);
    const events = raw ? (JSON.parse(raw) || []) : [];
    events.push({
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: title,
      date: dateObj.getFullYear() + '-' + String(dateObj.getMonth()+1).padStart(2,'0') + '-' + String(dateObj.getDate()).padStart(2,'0'),
      allDay: false,
      startTime: gartenErinnerungsUhrzeit(), endTime: '', // mit Uhrzeit, damit der Push-Server erinnert
      wer: 'familie',
      location: '',
      notes: notes,
      erinnerung: 0,
      recurrence: { freq: 'keine', until: null }
    });
    gartenTermineSpeichern(events);
    showTempStatus('📌 „' + title + '" wurde für ' + gartenErinnerungsUhrzeit() + ' Uhr in die Termine eingetragen.', 4);
  } catch (e) { showTempStatus('⚠ Eintragen fehlgeschlagen.', 4); }
}
// ---------- Pflanz-Erinnerungen (geplante Pflanzungen → Termin mit Uhrzeit → Push) ----------
// Liegt das Pflanzdatum einer Beet-Pflanze in der Zukunft, kann daraus ein Termin im
// Termine-Modul werden. Der Termin bekommt eine Uhrzeit, damit der Push-Server erinnert,
// und ist über plant.pflanzTerminId verknüpft (Datum ändern → Termin wandert mit).
const KEY_GARTEN_ERINNERUNG_ZEIT = 'garten_erinnerungUhrzeit'; // geräte-lokal, Standard 09:00
function gartenErinnerungsUhrzeit() {
  try { return localStorage.getItem(KEY_GARTEN_ERINNERUNG_ZEIT) || '09:00'; } catch (e) { return '09:00'; }
}
function gartenTermineLaden() {
  try { return JSON.parse(localStorage.getItem('termine_events_v1') || '[]') || []; } catch (e) { return []; }
}
function gartenTermineSpeichern(events) {
  localStorage.setItem('termine_events_v1', JSON.stringify(events));
  if (window._termineSync) window._termineSync.melde();
}
function pflanzIsoHeute() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function pflanzTerminTitel(plant) {
  return '🌱 ' + [plant.name || 'Pflanze', plant.variety].filter(Boolean).join(' ') + ' pflanzen';
}
// Legt den Termin an bzw. aktualisiert ihn; gibt true zurück, wenn etwas geschrieben wurde
function pflanzTerminSetzen(plant, bed, still) {
  if (!plant || !plant.date || plant.date < pflanzIsoHeute()) return false;
  const events = gartenTermineLaden();
  const garten = gardens[currentGardenId] ? gardens[currentGardenId].name : '';
  const notiz = 'Geplante Pflanzung aus dem Gartenplaner' + (bed && bed.name ? ' – ' + bed.name : '') + (garten ? ' (' + garten + ')' : '') + '.';
  let ev = plant.pflanzTerminId ? events.find(e => e.id === plant.pflanzTerminId) : null;
  if (ev) {
    ev.date = plant.date; ev.title = pflanzTerminTitel(plant); ev.notes = notiz;
  } else {
    ev = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: pflanzTerminTitel(plant), date: plant.date, allDay: false,
      startTime: gartenErinnerungsUhrzeit(), endTime: '', wer: 'familie', location: '',
      notes: notiz, erinnerung: 0, recurrence: { freq: 'keine', until: null },
    };
    events.push(ev);
    plant.pflanzTerminId = ev.id;
  }
  gartenTermineSpeichern(events);
  if (!still) showTempStatus('🔔 Erinnerung am ' + new Date(plant.date + 'T00:00').toLocaleDateString('de-DE') + ' um ' + ev.startTime + ' Uhr eingetragen.', 4);
  return true;
}
function pflanzTerminEntfernen(plant) {
  if (!plant || !plant.pflanzTerminId) return;
  const events = gartenTermineLaden();
  const rest = events.filter(e => e.id !== plant.pflanzTerminId);
  delete plant.pflanzTerminId;
  if (rest.length !== events.length) gartenTermineSpeichern(rest);
}
function aktivePflanzeUndBeet() {
  if (!activePlantBedId) return {};
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  return { bed, plant: bed && bed.plants[activePlantBedId.idx] };
}
function renderPflanzErinnerung() {
  const box = document.getElementById('ppErinnerungBox');
  if (!box) return;
  const { plant } = aktivePflanzeUndBeet();
  if (!plant || !plant.date || plant.date < pflanzIsoHeute()) { box.innerHTML = ''; return; }
  const ev = plant.pflanzTerminId ? gartenTermineLaden().find(e => e.id === plant.pflanzTerminId) : null;
  box.innerHTML = ev
    ? `<div style="font-size:0.72rem;color:var(--moss);margin-top:4px;">🔔 Erinnerung am ${new Date(plant.date + 'T00:00').toLocaleDateString('de-DE')} um ${ev.startTime || '–'} Uhr
        <button type="button" onclick="pflanzErinnerungAus()" style="background:none;border:none;color:var(--bark);text-decoration:underline;cursor:pointer;font-size:0.72rem;">entfernen</button></div>`
    : `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;">
        <button type="button" class="btn-secondary" style="padding:6px 10px;font-size:0.78rem;" onclick="pflanzErinnerungAn()">🔔 Erinnern</button>
        <span style="font-size:0.72rem;color:var(--bark);">um</span>
        <input type="time" value="${gartenErinnerungsUhrzeit()}" style="width:auto;padding:4px 6px;font-size:0.78rem;" title="Uhrzeit für Garten-Erinnerungen (gilt für dieses Gerät)"
          onchange="try{localStorage.setItem('${KEY_GARTEN_ERINNERUNG_ZEIT}', this.value || '09:00')}catch(e){}">
      </div>`;
}
function pflanzErinnerungAn() {
  const { plant, bed } = aktivePflanzeUndBeet();
  if (pflanzTerminSetzen(plant, bed)) { saveData(); renderPflanzErinnerung(); }
}
function pflanzErinnerungAus() {
  const { plant } = aktivePflanzeUndBeet();
  pflanzTerminEntfernen(plant); saveData(); renderPflanzErinnerung();
  showTempStatus('Erinnerung entfernt.', 3);
}
// Beet: alle Pflanzen mit Zukunftsdatum auf einmal
function beetPflanzErinnerungen() {
  const bed = selectedBed;
  if (!bed) return;
  const kandidaten = (bed.plants || []).filter(p => p.date && p.date >= pflanzIsoHeute());
  if (!kandidaten.length) { showTempStatus('In diesem Beet gibt es keine Pflanzen mit Pflanzdatum in der Zukunft.', 4); return; }
  let neu = 0;
  kandidaten.forEach(p => { const hatte = !!p.pflanzTerminId; if (pflanzTerminSetzen(p, bed, true) && !hatte) neu++; });
  saveData();
  renderBeetErinnerungKnopf();
  showTempStatus('🔔 ' + kandidaten.length + ' Pflanz-Erinnerung' + (kandidaten.length === 1 ? '' : 'en') + ' eingetragen' + (neu < kandidaten.length ? ' (' + (kandidaten.length - neu) + ' davon aktualisiert)' : '') + '.', 5);
}
function renderBeetErinnerungKnopf() {
  const btn = document.getElementById('btnBeetErinnerungen');
  if (!btn) return;
  const n = selectedBed ? (selectedBed.plants || []).filter(p => p.date && p.date >= pflanzIsoHeute()).length : 0;
  btn.style.display = n ? '' : 'none';
  btn.textContent = '🔔 Geplante Pflanzungen erinnern (' + n + ')';
}
// ---------- Standort-Auswahl als Icon-Buttons (Beet-Pflanzen & freistehende Pflanzen) ----------
const STANDORT_OPTIONEN = [
  { value: 'Sonne (6+ Std.)', icon: '☀️', label: 'Sonne' },
  { value: 'Halbschatten (3-6 Std.)', icon: '⛅', label: 'Halb\u00adschatten' }, // weiche Trennung, falls es eng wird
  { value: 'Schatten (<3 Std.)', icon: '☁️', label: 'Schatten' },
];
function renderStandortReihe(containerId, selectId, onChange) {
  const box = document.getElementById(containerId);
  const select = document.getElementById(selectId);
  if (!box || !select) return;
  const aktuell = select.value;
  box.innerHTML = '';
  STANDORT_OPTIONEN.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pp-standort-btn' + (aktuell === opt.value ? ' aktiv' : '');
    btn.innerHTML = opt.icon + '<span>' + opt.label + '</span>';
    btn.title = opt.value;
    btn.addEventListener('click', () => {
      select.value = (select.value === opt.value) ? '' : opt.value;
      renderStandortReihe(containerId, selectId, onChange);
      onChange();
    });
    box.appendChild(btn);
  });
}
// ---------- Ernte-Erinnerung im Ernte-Tab (Beet-Pflanzen & freistehende Pflanzen) ----------
function renderErnteErinnerungBox(targetId, plantName, plantDate) {
  const box = document.getElementById(targetId);
  if (!box) return;
  const name = (plantName || '').trim();
  const info = CARE_INFO[name];
  if (!name || !info || !info.harvestDays || !plantDate) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const planted = new Date(plantDate);
  if (isNaN(planted.getTime())) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const zielDatum = new Date(planted); zielDatum.setDate(zielDatum.getDate() + info.harvestDays);
  const heute = new Date(); heute.setHours(0,0,0,0);
  const vergangen = zielDatum < heute;
  const datumText = zielDatum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  box.style.display = 'block';
  box.innerHTML = `<div style="font-size:0.76rem;padding:10px 12px;border-radius:9px;background:#f0f8ec;border-left:4px solid #4a6f5c;color:#2c2415;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <span style="flex:1;min-width:170px;">🧺 Voraussichtliche Ernte ${vergangen ? 'war um' : 'ab'} <strong>${datumText}</strong> (ca. ${info.harvestDays} Tage nach Pflanzung)</span>
    <button type="button" id="${targetId}Btn" style="background:#4a6f5c;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:0.72rem;font-weight:700;cursor:pointer;">📌 Erinnerung eintragen</button>
  </div>`;
  document.getElementById(targetId + 'Btn').addEventListener('click', () => {
    gartenTerminDirektEintragen('🧺 Ernte: ' + name, 'Voraussichtlicher Erntezeitpunkt, automatisch berechnet aus Pflanzdatum + typischer Kulturdauer – bitte vor Ort prüfen.', zielDatum);
  });
}
function exportHarvestCalendar() {
  const beds = getCurrentBeds();
  const gardenName = gardens[currentGardenId]?.name || 'Mein Garten';
  const events = [];

  beds.forEach(bed => {
    (bed.plants || []).forEach(plant => {
      const name = (plant.name || '').trim();
      const info = CARE_INFO[name];
      if (!info || !info.harvestDays || !plant.date) return;
      const planted = new Date(plant.date);
      if (isNaN(planted.getTime())) return;
      const start = new Date(planted); start.setDate(start.getDate() + info.harvestDays);
      const end = new Date(start); end.setDate(end.getDate() + 7); // ca. 1 Woche Erntefenster
      events.push({ name, sym: plant.sym || '🌱', bed: bed.name || 'Beet', start, end });
    });
  });

  if (!events.length) {
    alert('Keine Erntetermine berechenbar. Trage bei deinen Pflanzen ein Pflanzdatum ein (im Pflanzen-Panel), damit Erntetermine geschätzt werden können.');
    return;
  }

  const now = new Date();
  const dtstamp = icsDateStr(now) + 'T' + icsPad2(now.getHours()) + icsPad2(now.getMinutes()) + icsPad2(now.getSeconds()) + 'Z';
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gartenplaner//DE\r\nCALSCALE:GREGORIAN\r\n';
  events.forEach((ev, i) => {
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:ernte-${currentGardenId}-${i}-${now.getTime()}@gartenplaner\r\n`;
    ics += `DTSTAMP:${dtstamp}\r\n`;
    ics += `DTSTART;VALUE=DATE:${icsDateStr(ev.start)}\r\n`;
    ics += `DTEND;VALUE=DATE:${icsDateStr(ev.end)}\r\n`;
    ics += `SUMMARY:${icsEscape('🧺 Ernte: ' + ev.sym + ' ' + ev.name + ' (' + ev.bed + ')')}\r\n`;
    ics += `DESCRIPTION:${icsEscape('Voraussichtlicher Erntezeitraum für ' + ev.name + ' im Beet "' + ev.bed + '", Garten "' + gardenName + '". Automatisch berechnet aus Pflanzdatum + typischer Kulturdauer – bitte vor Ort prüfen.')}\r\n`;
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'erntekalender-' + gardenName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showTempStatus(`Erntekalender exportiert (${events.length} Termine)`, 3);
}

// ==================== PFLANZSCHILDER-DRUCK ====================
function exportLabels() {
  const beds = getCurrentBeds();
  const labels = [];
  for (const bed of beds) {
    for (const plant of (bed.plants||[])) {
      const name = (plant.name||'').trim();
      if (!name) continue;
      labels.push({
        sym: plant.sym || '🌿',
        name,
        variety: (plant.variety||'').trim(),
        date: plant.date || '',
        bed: bed.name || 'Beet',
      });
    }
  }
  if (!labels.length) {
    alert('Keine Pflanzen mit Namen gefunden. Lege zuerst Pflanzen in deinen Beeten an.');
    return;
  }
  const cardsHtml = labels.map(l => {
    const dateStr = l.date ? new Date(l.date).toLocaleDateString('de-DE') : '';
    return `
      <div class="label-card">
        <div class="label-sym">${escapeHtml(l.sym)}</div>
        <div class="label-name">${escapeHtml(l.name)}</div>
        ${l.variety ? `<div class="label-variety">${escapeHtml(l.variety)}</div>` : ''}
        ${dateStr ? `<div class="label-date">🗓 ${escapeHtml(dateStr)}</div>` : ''}
        <div class="label-bed">${escapeHtml(l.bed)}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pflanzschilder</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#2a2016;margin:10mm;}
    .label-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;}
    .label-card{
      border:1px dashed #999;border-radius:6px;padding:8px 6px;
      text-align:center;page-break-inside:avoid;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:30mm;
    }
    .label-sym{font-size:1.6rem;line-height:1;}
    .label-name{font-weight:700;font-size:0.85rem;margin-top:2px;}
    .label-variety{font-size:0.74rem;color:#5b4d3a;font-style:italic;}
    .label-date{font-size:0.68rem;color:#6b5d4a;margin-top:2px;}
    .label-bed{font-size:0.62rem;color:#9a8a72;margin-top:3px;border-top:1px solid #e8e0c8;padding-top:2px;width:80%;}
    @media print{ body{margin:8mm;} .label-card{border:1px dashed #aaa;} }
  </style></head><body>
    <div class="label-grid">${cardsHtml}</div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Bitte Pop-ups für diese Seite erlauben, um die Pflanzschilder zu drucken.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { try { win.focus(); win.print(); } catch(e) {} }, 400);
}

// ==================== FRUCHTFOLGE (CROP ROTATION) ====================
// FAMILIES → pflanzendaten.js
function getFamily(name){ return FAMILIES[(name||'').trim()] || null; }
function getYearOf(entry){
  const d = entry.date || entry.removedAt;
  if (d) { const y=parseInt(String(d).slice(0,4)); if(!isNaN(y)) return y; }
  return new Date().getFullYear();
}
const FRUCHTFOLGE_WARNING_YEARS = 3; // Rückschau-Fenster für aktive Fruchtfolge-Warnungen
// Prüft, ob die Familie einer Pflanze innerhalb der letzten FRUCHTFOLGE_WARNING_YEARS Jahre
// bereits in diesem Beet stand (Historie + aktuell andere Pflanzen). Mehrjährige Pflanzen
// werden dabei bewusst ignoriert (siehe renderFruchtfolge).
function getFruchtfolgeWarning(bed, plantName) {
  const name = (plantName||'').trim();
  if (!name || isPerennial(name)) return null;
  const fam = getFamily(name);
  if (!fam) return null;
  const currentYear = new Date().getFullYear();
  const history = bed.history || [];
  const allEntries = [...history, ...(bed.plants||[]).map(p=>({name:p.name, date:p.date, active:true}))];
  let mostRecentYear = null;
  for (const e of allEntries) {
    if (isPerennial(e.name)) continue;
    if (getFamily(e.name) !== fam) continue;
    const y = e.active ? currentYear : getYearOf(e);
    if (y >= currentYear) continue;
    if (currentYear - y > FRUCHTFOLGE_WARNING_YEARS) continue;
    if (mostRecentYear === null || y > mostRecentYear) mostRecentYear = y;
  }
  return mostRecentYear === null ? null : { fam, year: mostRecentYear, yearsAgo: currentYear - mostRecentYear };
}
function bedHasFruchtfolgeConflict(bed) {
  const fams = new Set((bed.plants||[]).filter(p=>!isPerennial(p.name)).map(p=>getFamily(p.name)).filter(Boolean));
  for (const fam of fams) {
    const p = (bed.plants||[]).find(pl => getFamily(pl.name) === fam);
    if (p && getFruchtfolgeWarning(bed, p.name)) return true;
  }
  return false;
}
function renderFruchtfolge(bed){
  const box=document.getElementById('fruchtfolgeBox');
  if(!box) return;
  const history = bed.history || [];
  const currentYear = new Date().getFullYear();
  const activeEntries = (bed.plants||[]).map(p=>({name:p.name,date:p.date}));
  const allEntries = [...history, ...activeEntries.map(e=>({...e, active:true}))];
  if (!allEntries.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Anbau-Historie. Sobald Pflanzen entfernt oder über Jahre hinweg dokumentiert werden, erscheint hier die Fruchtfolge.</div>';
    return;
  }
  // Gruppieren nach Jahr -> Set von Familien
  const byYear = {};
  for (const e of allEntries) {
    const y = e.active ? currentYear : getYearOf(e);
    const fam = getFamily(e.name);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push({ name: e.name || '(unbenannt)', fam, active: !!e.active, perennial: isPerennial(e.name) });
  }
  const years = Object.keys(byYear).map(Number).sort((a,b)=>b-a);

  // Warnungen: gleiche Familie wie im aktuellen Beet bereits in den letzten Jahren angebaut
  // Mehrjährige Pflanzen (Bäume, Beerensträucher, ausdauernde Kräuter) werden bewusst nicht rotiert
  // und lösen daher keine Fruchtfolge-Warnung aus.
  const currentFamilies = new Set((bed.plants||[]).filter(p=>!isPerennial(p.name)).map(p=>getFamily(p.name)).filter(Boolean));
  const warnings = [];
  for (const fam of currentFamilies) {
    const plantOfFam = (bed.plants||[]).find(p => getFamily(p.name) === fam);
    const w = plantOfFam && getFruchtfolgeWarning(bed, plantOfFam.name);
    if (w) warnings.push(`⚠️ <strong>${fam}</strong> stand bereits ${w.yearsAgo===1?'letztes Jahr':`vor ${w.yearsAgo} Jahren`} (${w.year}) in diesem Beet – Fruchtfolge-Pause empfohlen (mind. 2-4 Jahre).`);
  }

  let html = '';
  if (warnings.length) {
    html += warnings.map(w=>`<div class="symptom-card" style="margin-bottom:6px">${w}</div>`).join('');
  }
  html += years.map(y => {
    const items = byYear[y];
    const grouped = items.map(e => `${e.name}${e.fam?` <span style="color:var(--bark);font-size:0.68rem">(${e.fam})</span>`:''}${e.active?' 🌱':''}`).join(', ');
    return `<div style="font-size:0.78rem;margin-bottom:5px"><strong>${y}${y===currentYear?' (aktuell)':''}:</strong> ${grouped}</div>`;
  }).join('');
  box.innerHTML = html;
}

// ==================== FRUCHTFOLGE-TIMELINE (MEHRJAHRESANSICHT) ====================
const FAMILY_PALETTE = ['#c0633a','#7a9e72','#5b8bb5','#d6a84a','#8b6f47','#b56ccc','#4a6741','#d488a0','#6b9e9e','#a8a83a','#c05050','#7a7ad0'];
function familyColor(fam) {
  if (!fam) return '#a8a8a8';
  let h = 0;
  for (let i = 0; i < fam.length; i++) h = (h * 31 + fam.charCodeAt(i)) % 997;
  return FAMILY_PALETTE[Math.abs(h) % FAMILY_PALETTE.length];
}
function openRotationTimeline() {
  renderRotationTimeline();
  document.getElementById('rotationModal').style.display = 'flex';
}
function renderRotationTimeline() {
  const box = document.getElementById('rotationTimelineContent');
  const beds = getCurrentBeds();
  const currentYear = new Date().getFullYear();
  if (!beds.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Beete in diesem Garten.</div>';
    return;
  }

  const bedData = beds.map(bed => {
    const history = bed.history || [];
    const activeEntries = (bed.plants || []).map(p => ({ name: p.name, date: p.date, active: true }));
    const allEntries = [...history, ...activeEntries];
    const byYear = {};
    allEntries.forEach(e => {
      const y = e.active ? currentYear : getYearOf(e);
      const fam = getFamily(e.name);
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push({ name: e.name || '(unbenannt)', fam, active: !!e.active, perennial: isPerennial(e.name) });
    });
    return { bed, byYear };
  });

  const hasAnyData = bedData.some(({ byYear }) => Object.keys(byYear).length > 0);
  if (!hasAnyData) {
    box.innerHTML = '<div class="empty-state">Noch keine Anbau-Historie. Sobald Pflanzen über mehrere Jahre dokumentiert oder entfernt werden, erscheint hier die Timeline.</div>';
    return;
  }

  let minYear = currentYear, maxYear = currentYear;
  bedData.forEach(({ byYear }) => {
    Object.keys(byYear).map(Number).forEach(y => { if (y < minYear) minYear = y; if (y > maxYear) maxYear = y; });
  });
  minYear = Math.max(minYear, currentYear - 7); // max. 8 Jahre für Übersichtlichkeit
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  // Warnungen: gleiche Pflanzenfamilie im selben Beet innerhalb von <=3 Jahren erneut angebaut
  const warnings = [];
  bedData.forEach(({ bed, byYear }) => {
    const ys = Object.keys(byYear).map(Number).sort((a,b) => a-b);
    for (let i = 0; i < ys.length; i++) {
      for (let j = i+1; j < ys.length; j++) {
        const y1 = ys[i], y2 = ys[j];
        if (y2 - y1 > 3) continue;
        const fams1 = new Set(byYear[y1].filter(e=>!e.perennial).map(e => e.fam).filter(Boolean));
        byYear[y2].filter(e=>!e.perennial).map(e => e.fam).filter(Boolean).forEach(f => {
          if (fams1.has(f)) warnings.push(`⚠️ <strong>${escapeHtml(bed.name||'Beet')}</strong>: ${escapeHtml(f)} in ${y1} und erneut ${y2} – Pause &lt;4 Jahre.`);
        });
      }
    }
  });
  const uniqueWarnings = [...new Set(warnings)];

  let tableHtml = `<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:0.72rem">`;
  tableHtml += `<tr><th style="text-align:left;padding:4px 8px;position:sticky;left:0;background:var(--white)">Beet</th>${years.map(y => `<th style="padding:4px 8px;text-align:center;${y===currentYear?'color:var(--moss)':''}">${y}${y===currentYear?' 🌱':''}</th>`).join('')}</tr>`;
  bedData.forEach(({ bed, byYear }) => {
    tableHtml += `<tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap;position:sticky;left:0;background:var(--white)">${escapeHtml(bed.name)||'Beet'}</td>`;
    years.forEach(y => {
      const items = byYear[y] || [];
      if (!items.length) { tableHtml += `<td style="padding:4px 6px;text-align:center;color:var(--parchment)">–</td>`; return; }
      const cellHtml = items.map(it => {
        const color = familyColor(it.fam);
        return `<span title="${escapeHtml(it.fam||'unbekannte Familie')}" style="display:inline-block;padding:1px 5px;border-radius:8px;background:${color}22;border:1px solid ${color};color:var(--soil);margin:1px;font-size:0.68rem;white-space:nowrap">${escapeHtml(it.name)}</span>`;
      }).join('');
      tableHtml += `<td style="padding:4px 6px;text-align:center">${cellHtml}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</table></div>`;

  const famsPresent = new Set();
  bedData.forEach(({ byYear }) => Object.values(byYear).forEach(items => items.forEach(it => { if (it.fam) famsPresent.add(it.fam); })));
  let legendHtml = '';
  if (famsPresent.size) {
    legendHtml = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--parchment)">` +
      [...famsPresent].sort().map(fam => `<span style="font-size:0.7rem;color:var(--bark);display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:3px;background:${familyColor(fam)};display:inline-block"></span>${escapeHtml(fam)}</span>`).join('') +
      `</div>`;
  }

  const warningsHtml = uniqueWarnings.length
    ? `<div style="margin-bottom:12px">${uniqueWarnings.map(w => `<div class="symptom-card" style="margin-bottom:6px">${w}</div>`).join('')}</div>`
    : '';

  box.innerHTML = warningsHtml + tableHtml + legendHtml;
}

// ==================== MULTI-GARDEN STATE ====================
let gardens = {};        // { id: { name, beds: [] } }
let currentGardenId = null;

// ==================== UNDO / REDO ====================
let undoStack = [];
let redoStack = [];
const UNDO_LIMIT = 20;
function pushUndo() {
  undoStack.push(JSON.stringify({ gardens, currentGardenId }));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = [];
  updateUndoBtn();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify({ gardens, currentGardenId }));
  if (redoStack.length > UNDO_LIMIT) redoStack.shift();
  const prev = JSON.parse(undoStack.pop());
  gardens = prev.gardens;
  currentGardenId = prev.currentGardenId;
  selectedBed = null;
  selectedPlantOnCanvas = null;
  hideBedEditor();
  renderGardenTabs();
  renderBedList();
  updateStatus();
  draw();
  saveData();
  updateUndoBtn();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify({ gardens, currentGardenId }));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  const next = JSON.parse(redoStack.pop());
  gardens = next.gardens;
  currentGardenId = next.currentGardenId;
  selectedBed = null;
  selectedPlantOnCanvas = null;
  hideBedEditor();
  renderGardenTabs();
  renderBedList();
  updateStatus();
  draw();
  saveData();
  updateUndoBtn();
}
function updateUndoBtn() {
  const btn = document.getElementById('btnUndo');
  if (btn) btn.disabled = undoStack.length === 0;
  const rbtn = document.getElementById('btnRedo');
  if (rbtn) rbtn.disabled = redoStack.length === 0;
}

// ==================== EXPORT / IMPORT ====================
function exportData() {
  const data = JSON.stringify({
    gardens, currentGardenId,
    varietyDB, bedTemplates, seedInventory, costEntries, pantryEntries, shopEntries,
    _backupVersion: 2
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gartenplaner-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try { localStorage.setItem('gartenplaner_lastExport', String(Date.now())); } catch(e) {}
  showTempStatus('✓ Backup heruntergeladen (inkl. Fotos)', 3);
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
      if (!parsed || typeof parsed.gardens !== 'object') throw new Error('invalid');
    } catch (err) {
      alert('Ungültige Backup-Datei.');
      return;
    }
    const hasExtras = parsed._backupVersion >= 2;
    const warnMsg = hasExtras
      ? 'Import ersetzt alle aktuellen Gärten, Sorten, Saatgut-, Kosten-, Vorrats- und Shop-Daten durch den Inhalt der Datei. Fortfahren?'
      : 'Diese Backup-Datei stammt aus einer älteren Version und enthält nur Gärten (kein Saatgut/Kosten/Vorrat/Sorten/Shops). Diese Bereiche bleiben unverändert. Gärten trotzdem importieren?';
    if (!confirm(warnMsg)) return;
    pushUndo();
    gardens = parsed.gardens;
    currentGardenId = parsed.currentGardenId && parsed.gardens[parsed.currentGardenId]
      ? parsed.currentGardenId
      : Object.keys(parsed.gardens)[0];
    if (hasExtras) {
      varietyDB = parsed.varietyDB || {};
      bedTemplates = parsed.bedTemplates || [];
      seedInventory = parsed.seedInventory || [];
      costEntries = parsed.costEntries || [];
      pantryEntries = parsed.pantryEntries || [];
      shopEntries = parsed.shopEntries || [];
      saveVarieties();
      saveBedTemplatesStorage();
      saveSeedInventoryData();
      saveCosts();
      savePantry();
      saveShops();
    }
    selectedBed = null;
    selectedPlantOnCanvas = null;
    hideBedEditor();
    saveData();
    renderGardenTabs();
    renderBedList();
    updateStatus();
    draw();
    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id) showView(activeView.id.replace('view-', ''));
    showTempStatus(hasExtras ? '✓ Import erfolgreich (alle Module)' : '✓ Gärten importiert', 3);
  };
  reader.readAsText(file);
  e.target.value = '';
}

function loadAllData() {
  try {
    const raw = localStorage.getItem('gartenplaner_v3');
    if (raw && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        gardens = parsed.gardens || {};
        currentGardenId = parsed.currentGardenId || null;
      }
    }
  } catch(e) {}
  // Migrate from v2
  if (Object.keys(gardens).length === 0) {
    try {
      const old = localStorage.getItem('gartenplaner_v2');
      if (old) {
        const oldBeds = JSON.parse(old);
        const id = 'g_' + Date.now();
        gardens[id] = { name: 'Mein Garten', beds: oldBeds };
        currentGardenId = id;
      }
    } catch(e) {}
  }
  if (Object.keys(gardens).length === 0) {
    const id = 'g_' + Date.now();
    gardens[id] = { name: 'Mein Garten', beds: [] };
    currentGardenId = id;
  }
  if (!currentGardenId || !gardens[currentGardenId]) {
    currentGardenId = Object.keys(gardens)[0];
  }
  // Migration: bereits erreichte Ernte-Meilensteine einmalig nur vermerken statt
  // nachträglich zu feiern, damit beim ersten Start nach Einführung dieser Funktion
  // nicht plötzlich für längst erreichte Erfolge ein Popup aufploppt.
  if (!localStorage.getItem('gartenplaner_meilensteinMigriert')) {
    let migrationGeaendert = false;
    Object.values(gardens).forEach(g => (g.beds || []).forEach(bed => (bed.plants || []).forEach(plant => {
      if (!plant.meilensteineErnte) plant.meilensteineErnte = [];
      const anzahl = (plant.harvests || []).length;
      MEILENSTEIN_STUFEN.forEach(stufe => {
        if (anzahl >= stufe && !plant.meilensteineErnte.includes(stufe)) { plant.meilensteineErnte.push(stufe); migrationGeaendert = true; }
      });
    })));
    if (migrationGeaendert) {
      try { localStorage.setItem('gartenplaner_v3', JSON.stringify({ gardens, currentGardenId })); } catch (e) {}
    }
    try { localStorage.setItem('gartenplaner_meilensteinMigriert', '1'); } catch (e) {}
  }
}

const ROLLING_BACKUP_MIN_INTERVAL_MS = 60 * 60 * 1000; // höchstens stündlich aktualisieren
// Sichert den bisherigen (noch nicht überschriebenen) Datenstand in einen zweiten
// localStorage-Schlüssel – höchstens einmal pro Stunde, damit bei einem beschädigten
// oder versehentlich geleerten Hauptspeicher eine unabhängige, etwas ältere Kopie bleibt.
function maybeUpdateRollingBackup(prevRaw) {
  try {
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem('gartenplaner_backupMeta') || 'null'); } catch(e) {}
    const now = Date.now();
    if (!meta || (now - meta.timestamp) >= ROLLING_BACKUP_MIN_INTERVAL_MS) {
      localStorage.setItem('gartenplaner_v3_backup', prevRaw);
      localStorage.setItem('gartenplaner_backupMeta', JSON.stringify({ timestamp: now }));
    }
  } catch(e) { /* Speicherplatz evtl. voll - Backup wird beim nächsten Mal erneut versucht */ }
}
function restoreRollingBackup() {
  let meta = null, backupRaw = null;
  try { meta = JSON.parse(localStorage.getItem('gartenplaner_backupMeta') || 'null'); } catch(e) {}
  try { backupRaw = localStorage.getItem('gartenplaner_v3_backup'); } catch(e) {}
  if (!backupRaw) {
    alert('Noch kein automatisches Backup vorhanden. Es wird erstellt, sobald mindestens eine Stunde seit dem letzten Speichern vergangen ist.');
    return;
  }
  const when = meta ? new Date(meta.timestamp).toLocaleString('de-DE') : 'unbekanntem Zeitpunkt';
  if (!confirm(`Auf das automatische Backup vom ${when} zurücksetzen?\n\nDein AKTUELLER Stand wird dabei überschrieben. Änderungen seit ${when} gehen verloren – vorher lieber über ⚙️ Mehr → ⬇ Sicherung exportieren sichern, falls du dir nicht sicher bist.`)) return;
  try {
    const parsed = JSON.parse(backupRaw);
    gardens = parsed.gardens || {};
    currentGardenId = parsed.currentGardenId && gardens[parsed.currentGardenId]
      ? parsed.currentGardenId
      : Object.keys(gardens)[0] || null;
    selectedBed = null; selectedBeds = []; selectedPlantOnCanvas = null;
    hideBedEditor();
    saveData();
    renderGardenTabs();
    renderBedList();
    updateStatus();
    draw();
    showTempStatus(`✓ Backup vom ${when} wiederhergestellt`, 5);
  } catch(e) {
    alert('Backup konnte nicht gelesen werden.');
  }
}
function saveData() {
  try {
    const prevRaw = localStorage.getItem('gartenplaner_v3');
    if (prevRaw) maybeUpdateRollingBackup(prevRaw);
    localStorage.setItem('gartenplaner_v3', JSON.stringify({ gardens, currentGardenId }));
    if (window._sync) window._sync.melde();
  } catch(e) {
    showTempStatus('⚠ Speichern fehlgeschlagen – Speicherplatz im Browser ist evtl. voll. Bitte exportieren (⚙️ Mehr → ⬇ Sicherung exportieren) und ggf. große Fotos entfernen.', 10);
  }
  renderBedList();
  updateStatus();
}

function getCurrentBeds() {
  return gardens[currentGardenId]?.beds || [];
}

function setCurrentBeds(b) {
  if (gardens[currentGardenId]) gardens[currentGardenId].beds = b;
}

function getCurrentFreiPflanzen() {
  if (!gardens[currentGardenId]) return [];
  if (!gardens[currentGardenId].freiPflanzen) gardens[currentGardenId].freiPflanzen = [];
  return gardens[currentGardenId].freiPflanzen;
}

// ==================== BEREICHE (Zonen zum schnellen Ranzoomen bei langgezogenen Grundstücken) ====================
function getCurrentZones() {
  if (!gardens[currentGardenId]) return [];
  if (!gardens[currentGardenId].zones) gardens[currentGardenId].zones = [];
  return gardens[currentGardenId].zones;
}

// ==================== SETTINGS: MASSSTAB & HINTERGRUND ====================
function getScale() {
  // Fest auf 1 (1 Zeichen-Einheit = 1 echter cm) – auch für Gärten mit einem älteren,
  // vom Bildschirm abhängigen gespeicherten Wert, damit Beete überall real-proportional bleiben.
  return 1;
}
function getGardenSizeM() {
  return gardens[currentGardenId]?.sizeM || null;
}
function applyGardenSizeM() {
  const w = parseFloat(document.getElementById('gardenSizeWInput').value);
  const h = parseFloat(document.getElementById('gardenSizeHInput').value);
  if (!gardens[currentGardenId] || isNaN(w) || isNaN(h) || w<=0 || h<=0) {
    showTempStatus('⚠ Bitte gültige Breite und Tiefe in Metern eintragen.', 5);
    return;
  }
  gardens[currentGardenId].sizeM = { w, h };
  gardens[currentGardenId].scaleCmPerPx = 1; // fest: 1 Zeichen-Einheit = 1 echter cm
  saveData();
  refreshSettingsUI();
  resizeCanvas();
}
function clearGardenSizeM() {
  if (!gardens[currentGardenId]) return;
  delete gardens[currentGardenId].sizeM;
  saveData();
  refreshSettingsUI();
  resizeCanvas();
}
function getBgColor() {
  return gardens[currentGardenId]?.bgColor || null;
}
let bgImageEl = null, bgImageLoadedFor = null;
function getBgImage() { return gardens[currentGardenId]?.bgImage || null; }
function getBgImageOpacity() { return gardens[currentGardenId]?.bgImageOpacity ?? 0.5; }
function handleBgImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !gardens[currentGardenId]) return;
  const reader = new FileReader();
  reader.onerror = () => { showTempStatus('⚠ Bild konnte nicht gelesen werden.', 5); e.target.value=''; };
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); e.target.value=''; };
    img.onload = () => {
      const maxW = 1600;
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.78);
      gardens[currentGardenId].bgImage = dataUrl;
      if (gardens[currentGardenId].bgImageOpacity === undefined) gardens[currentGardenId].bgImageOpacity = 0.5;
      saveData();
      loadBgImageEl(dataUrl);
      refreshSettingsUI();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function loadBgImageEl(dataUrl) {
  if (!dataUrl) { bgImageEl = null; bgImageLoadedFor = null; draw(); return; }
  const img = new Image();
  const forGarden = currentGardenId;
  img.onload = () => { bgImageEl = img; bgImageLoadedFor = forGarden; draw(); };
  img.src = dataUrl;
}
function updateBgImageOpacity(val) {
  if (!gardens[currentGardenId]) return;
  gardens[currentGardenId].bgImageOpacity = parseFloat(val);
  saveData();
  draw();
}
function removeBgImage() {
  if (!gardens[currentGardenId]) return;
  delete gardens[currentGardenId].bgImage;
  delete gardens[currentGardenId].bgImageOpacity;
  bgImageEl = null; bgImageLoadedFor = null;
  saveData();
  refreshSettingsUI();
  draw();
}
function applyBgColor() {
  const wrap = document.getElementById('canvasWrap');
  const c = getBgColor();
  wrap.style.backgroundColor = c || '';
}
function selectBgColor(el, color) {
  if (!gardens[currentGardenId]) return;
  gardens[currentGardenId].bgColor = color;
  document.querySelectorAll('#bgColorPicker .color-swatch').forEach(s=>s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  document.getElementById('bgColorCustom').value = color;
  applyBgColor();
  saveData();
}
function resetBgColor() {
  if (!gardens[currentGardenId]) return;
  delete gardens[currentGardenId].bgColor;
  applyBgColor();
  refreshSettingsUI();
  saveData();
}
function refreshSettingsUI() {
  const size = getGardenSizeM();
  document.getElementById('gardenSizeWInput').value = size ? size.w : '';
  document.getElementById('gardenSizeHInput').value = size ? size.h : '';
  const sizeHint = document.getElementById('gardenSizeHint');
  if (sizeHint) {
    sizeHint.textContent = size
      ? `✓ Aktiv: ${size.w} × ${size.h} m – gestrichelte Grenze im Plan sichtbar, Zeichenfläche exakt in diesem Maßstab.`
      : 'Noch keine Gartengröße hinterlegt – Zeichenfläche nutzt eine Standardgröße von 10 × 8 m.';
  }
  const bg = getBgColor();
  document.querySelectorAll('#bgColorPicker .color-swatch').forEach(s=>s.classList.toggle('selected', s.dataset.color===bg));
  document.getElementById('bgColorCustom').value = bg || '#d6e8f0';
  const bgImg = getBgImage();
  const bgImgControls = document.getElementById('bgImageControls');
  if (bgImgControls) {
    bgImgControls.style.display = bgImg ? 'block' : 'none';
    if (bgImg) document.getElementById('bgImageOpacity').value = getBgImageOpacity();
  }
  try { bgTransAnzeigen(); kartenStilKnopfAktualisieren(); } catch (e) {}
  const loc = getWeatherSettings();
  if (loc) { if (weatherCache) renderWeatherUI(weatherCache); else fetchWeather(loc, false); }
  else { const wsb5 = document.getElementById('weatherSettingsBox'); if (wsb5) wsb5.textContent = 'Noch kein Standort hinterlegt.'; }
  const zone = getClimateZone();
  const zoneSel = document.getElementById('climateZoneSelect');
  if (zoneSel) zoneSel.value = zone;
  const zoneHint = document.getElementById('climateZoneHint');
  if (zoneHint) {
    const manual = gardens[currentGardenId]?.climateZoneManual;
    zoneHint.textContent = manual
      ? '✓ Manuell eingestellt.'
      : (loc ? '↻ Automatisch aus deinem Standort geschätzt – kann jederzeit angepasst werden.' : 'Tipp: Standort oben freigeben für eine automatische Schätzung.');
  }
}
function renderBedPlantList(bed, filter) {
  setTimeout(renderBeetErinnerungKnopf, 0);
  renderBeetHinweiseSidebar(bed);
  const box = document.getElementById('bedPlantList');
  if (!box || !bed) return;
  filter = (filter || '').trim().toLowerCase();
  const plants = bed.plants || [];
  const tuffBtn = document.getElementById('btnTuffZusammen');
  if (tuffBtn) {
    const kand = tuffKandidaten(bed), n = kand.reduce((s, g) => s + g.length, 0);
    tuffBtn.style.display = kand.length ? '' : 'none';
    tuffBtn.textContent = `🌷 ${n} eng stehende gleiche Pflanzen zu ${kand.length === 1 ? 'einem Tuff' : kand.length + ' Tuffs'} zusammenfassen`;
  }
  if (!plants.length) {
    box.innerHTML = '<div class="empty-state" style="font-size:0.72rem">Noch keine Pflanzen in diesem Beet. Im 🌱-Modus aufs Beet tippen, um welche zu platzieren.</div>';
    return;
  }
  const items = plants
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !filter || (p.name||'').toLowerCase().includes(filter) || (p.variety||'').toLowerCase().includes(filter));
  if (!items.length) {
    box.innerHTML = '<div class="empty-state" style="font-size:0.72rem">Keine Treffer.</div>';
    return;
  }
  box.innerHTML = items.map(({ p, idx }) => {
    const conflict = plantHasConflict(bed, idx);
    const rotConflict = !isPerennial(p.name) && getFruchtfolgeWarning(bed, p.name);
    return `<div class="bed-item" onclick="openPlantPanel(selectedBed, ${idx})">
      <span style="font-size:1rem">${p.sym||'🌱'}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${istGruppe(p)?'<b>'+parseInt(p.anzahl,10)+'×</b> ':''}${escapeHtml(p.name)||'–'}${p.variety?' · '+escapeHtml(p.variety):''}</span>
      ${conflict ? '<span title="Mischkultur-Konflikt" style="color:#c05030">⚠️</span>' : ''}
      ${rotConflict ? `<span title="Fruchtfolge-Warnung: ${escapeHtml(rotConflict.fam)} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} hier" style="color:#a8621a">🔄⚠️</span>` : ''}
    </div>`;
  }).join('');
}
function renderBedArea(bed) {
  const box = document.getElementById('bedAreaDisplay');
  if (!box) return;
  const cmPerPx = getScale();
  const areaPx2 = bedAreaPx2(bed);
  const areaM2 = areaPx2 * cmPerPx * cmPerPx / 10000;
  box.textContent = `📐 Fläche: ca. ${areaM2.toFixed(2)} m²`;
  renderDensity(bed, areaM2);
}
function renderDensity(bed, areaM2) {
  const sel = document.getElementById('densityPlantSel');
  const out = document.getElementById('densityResult');
  if (!sel || !out) return;
  const name = sel.value;
  if (!name) { out.textContent=''; return; }
  const spacing = SPACING[name];
  if (!spacing) { out.textContent='Für diese Pflanze liegt kein Abstandswert vor.'; return; }
  const perM2 = 10000 / (spacing * spacing);
  const total = Math.floor(areaM2 * perM2);
  out.textContent = `≈ ${perM2.toFixed(1)} Pflanzen/m² → Platz für ca. ${total} ${name}-Pflanzen in diesem Beet (bei ${spacing} cm Abstand).`;
}

// ==================== GARDEN MANAGEMENT ====================
function renderGardenTabs() {
  const cont = document.getElementById('gardenTabs');
  cont.innerHTML = Object.entries(gardens).map(([id, g]) => `
    <button class="garden-tab ${id === currentGardenId ? 'active' : ''}" onclick="closeDropdowns();switchGarden('${id}')">
      🌳 ${g.name}
      <span class="del-g" onclick="renameGarten(event,'${id}')" title="Umbenennen">✏️</span>
      ${Object.keys(gardens).length > 1 ? `<span class="del-g" onclick="deleteGarden(event,'${id}')">✕</span>` : ''}
    </button>
  `).join('');
  const nameEl = document.getElementById('gartenWahlName');
  if (nameEl) nameEl.textContent = (gardens[currentGardenId] && gardens[currentGardenId].name) || 'Garten';
}
function renameGarten(e, id) {
  e.stopPropagation();
  const neu = prompt('Neuer Name für diesen Garten:', gardens[id].name);
  if (neu === null) return;
  const getrimmt = neu.trim();
  if (!getrimmt) return;
  gardens[id].name = getrimmt;
  saveData();
  renderGardenTabs();
}

function switchGarden(id) {
  currentGardenId = id;
  selectedBed = null;
  selectedPlantOnCanvas = null;
  bgImageEl = null; bgImageLoadedFor = null;
  hideBedEditor();
  renderGardenTabs();
  renderBedList();
  updateStatus();
  resizeCanvas(true);
  applyBgColor();
  document.getElementById('sb4').textContent = gardens[id]?.name || '';
  const loc = getWeatherSettings();
  if (loc) fetchWeather(loc, false); else { weatherCache=null; const sb=document.getElementById('sbWeather'); if(sb) sb.textContent=''; }
}

function addGardenPrompt() {
  document.getElementById('modalGardenName').value = '';
  document.getElementById('gardenModal').style.display = 'flex';
  setTimeout(() => document.getElementById('modalGardenName').focus(), 50);
}

function closeModal() { document.getElementById('gardenModal').style.display = 'none'; }
function openHelpModal() { document.getElementById('helpModal').style.display = 'flex'; }

function confirmAddGarden() {
  const name = document.getElementById('modalGardenName').value.trim();
  if (!name) return;
  const id = 'g_' + Date.now();
  gardens[id] = { name, beds: [] };
  saveData();
  switchGarden(id);
  renderGardenTabs();
  closeModal();
}

// ==================== GARTEN FÜR NÄCHSTES JAHR ÜBERNEHMEN ====================
function openJahresUebernahmeModal() {
  if (!gardens[currentGardenId]) return;
  const aktuellerName = gardens[currentGardenId].name || 'Mein Garten';
  const naechstesJahr = new Date().getFullYear() + 1;
  // Falls der Name bereits auf eine Jahreszahl endet, diese für den Vorschlag hochzählen, sonst Jahr anhängen
  const jahrMatch = aktuellerName.match(/(\d{4})\s*$/);
  const vorschlag = jahrMatch
    ? aktuellerName.replace(/\d{4}\s*$/, naechstesJahr)
    : `${aktuellerName} ${naechstesJahr}`;
  document.getElementById('jahresUebernahmeName').value = vorschlag;
  document.getElementById('jahresUebernahmeModus').value = 'mehrjaehrig';
  document.getElementById('jahresUebernahmeModal').style.display = 'flex';
}

function jahresUebernahmeAusfuehren() {
  const quelle = gardens[currentGardenId];
  if (!quelle) return;
  const name = document.getElementById('jahresUebernahmeName').value.trim() || (quelle.name + ' (Kopie)');
  const modus = document.getElementById('jahresUebernahmeModus').value; // 'alle' | 'mehrjaehrig'
  const heuteISO = new Date().toISOString().slice(0,10);

  // Tiefe Kopie der Beete/Strukturen, jedes mit neuer eindeutiger ID
  const neueBeete = JSON.parse(JSON.stringify(quelle.beds || []));
  let mehrjaehrigBehalten = 0, einjaehrigVerschoben = 0;
  neueBeete.forEach((bed, i) => {
    bed.id = Date.now() + i; // neue eindeutige ID im neuen Garten
    if (bed.kind === 'struktur') return; // Strukturen haben keine Pflanzen
    if (modus === 'alle') {
      mehrjaehrigBehalten += (bed.plants||[]).length;
      return;
    }
    const behalten = [];
    const entfernt = [];
    (bed.plants || []).forEach(p => {
      if (isPerennial(p.name)) { behalten.push(p); mehrjaehrigBehalten++; }
      else { entfernt.push(p); einjaehrigVerschoben++; }
    });
    bed.plants = behalten;
    if (entfernt.length) {
      if (!bed.history) bed.history = [];
      entfernt.forEach(p => {
        bed.history.push({ name: p.name, variety: p.variety, date: p.date, removedAt: heuteISO });
      });
    }
  });

  const neueFreiPflanzen = JSON.parse(JSON.stringify(quelle.freiPflanzen || []));

  const id = 'g_' + Date.now();
  gardens[id] = {
    name,
    beds: neueBeete,
    freiPflanzen: neueFreiPflanzen,
    sizeM: quelle.sizeM,
    scaleCmPerPx: quelle.scaleCmPerPx,
    bgColor: quelle.bgColor,
    bgImage: quelle.bgImage,
    bgImageOpacity: quelle.bgImageOpacity,
    climateZone: quelle.climateZone,
    climateZoneManual: quelle.climateZoneManual,
    weatherLoc: quelle.weatherLoc,
  };
  pushUndo();
  saveData();
  switchGarden(id);
  renderGardenTabs();
  document.getElementById('jahresUebernahmeModal').style.display = 'none';
  switchTab('beds');
  const meldung = modus === 'alle'
    ? `✓ „${name}" angelegt – alle Pflanzen übernommen.`
    : `✓ „${name}" angelegt – ${mehrjaehrigBehalten} mehrjährige Pflanze(n) übernommen, ${einjaehrigVerschoben} einjährige in die Fruchtfolge-Historie verschoben.`;
  showTempStatus(meldung, 7);
}

function deleteGarden(e, id) {
  e.stopPropagation();
  if (Object.keys(gardens).length <= 1) return;
  if (!confirm(`Garten "${gardens[id].name}" wirklich löschen?`)) return;
  pushUndo();
  delete gardens[id];
  if (currentGardenId === id) currentGardenId = Object.keys(gardens)[0];
  saveData();
  renderGardenTabs();
  switchGarden(currentGardenId);
}

document.getElementById('modalGardenName').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddGarden(); });

