// ═══════════════════════════════════════════════════════════════
// 🪴 Drinnen & Balkon – Zimmer-, Kübel- und Balkonpflanzen
// Liste ohne Karte. Gießen/Düngen laufen über den Pflegeplan („Heute“),
// die Push-Erinnerungen (als Garten-Notizen) und den Pflanzen-Doktor.
// Daten: gardens[…].zimmerPflanzen = [{ id, name, sym, ort: 'zimmer'|'balkon', platz, angelegt,
//         lastWatered, zuletztGeduengt, intervall (eigener Sommerwert), notiz, diagnosen }]
// ═══════════════════════════════════════════════════════════════

// g = Gießabstand in Tagen [Sommer, Winter] (Winter null = ruht / einjährig) · d = düngen alle d Tage in der Saison
// licht · gift: 0 ungiftig, 1 leicht giftig/reizend, 2 giftig, 3 stark giftig · frost: Balkon, muss vor Frost rein
const ZIMMER_KATALOG = [
  // 🏠 Zimmer
  { n: 'Monstera', s: '🌿', o: 'zimmer', g: [7, 12], d: 14, licht: 'hell, ohne pralle Mittagssonne', gift: 2, tipp: 'Gießen, wenn die oberen 3 cm Erde trocken sind. Blätter ab und zu abwischen. Luftwurzeln nicht abschneiden – in die Erde leiten.' },
  { n: 'Efeutute', s: '🌿', o: 'zimmer', g: [7, 12], d: 14, licht: 'hell bis halbschattig', gift: 2, tipp: 'Sehr pflegeleicht. Hängende Blätter zeigen Durst. Triebe lassen sich in Wasser bewurzeln.' },
  { n: 'Philodendron', s: '🌿', o: 'zimmer', g: [7, 12], d: 14, licht: 'hell bis halbschattig', gift: 2, tipp: 'Mag gleichmäßige Feuchte, aber keine Staunässe. Kletternde Arten brauchen einen Moosstab.' },
  { n: 'Grünlilie', s: '🌱', o: 'zimmer', g: [5, 10], d: 14, licht: 'hell bis halbschattig', gift: 0, tipp: 'Robust und kinderfreundlich. Kindel kann man abnehmen und einpflanzen – ein schönes Projekt mit Kindern.' },
  { n: 'Bogenhanf', s: '🌵', o: 'zimmer', g: [14, 28], d: 28, licht: 'hell bis schattig', gift: 1, tipp: 'Lieber zu trocken als zu nass. Nie in die Blattrosette gießen.' },
  { n: 'Zamioculcas', s: '🌿', o: 'zimmer', g: [14, 28], d: 28, licht: 'hell bis schattig', gift: 2, tipp: 'Speichert Wasser in den Knollen – fast unkaputtbar, nur Staunässe mag sie nicht.' },
  { n: 'Ficus benjamina', s: '🌳', o: 'zimmer', g: [6, 10], d: 14, licht: 'hell, ohne Zugluft', gift: 1, tipp: 'Wirft bei Standortwechsel gern Blätter ab – einen festen Platz geben. Milchsaft reizt die Haut.' },
  { n: 'Gummibaum', s: '🌳', o: 'zimmer', g: [8, 14], d: 14, licht: 'hell', gift: 1, tipp: 'Große Blätter abwischen, damit sie Licht bekommen. Milchsaft reizt die Haut.' },
  { n: 'Geigenfeige', s: '🌳', o: 'zimmer', g: [7, 12], d: 14, licht: 'sehr hell, gern etwas Morgensonne', gift: 1, tipp: 'Mag keinen Umzug und keine Zugluft. Gießen, wenn die oberen 5 cm trocken sind.' },
  { n: 'Orchidee', s: '🌸', o: 'zimmer', g: [7, 12], d: 28, licht: 'hell, keine direkte Sonne', gift: 0, tipp: 'Einmal pro Woche 10 Minuten tauchen und gut abtropfen lassen. Silbrige Wurzeln = Durst, grüne = genug Wasser.' },
  { n: 'Einblatt', s: '🤍', o: 'zimmer', g: [4, 7], d: 14, licht: 'halbschattig', gift: 2, tipp: 'Lässt die Blätter hängen, wenn sie Durst hat – erholt sich nach dem Gießen schnell.' },
  { n: 'Aloe vera', s: '🌵', o: 'zimmer', g: [14, 28], d: 28, licht: 'sonnig', gift: 1, tipp: 'Kakteenerde, sparsam gießen. Im Sommer darf sie auf den Balkon.' },
  { n: 'Kaktus', s: '🌵', o: 'zimmer', g: [14, 40], d: 28, licht: 'sonnig', gift: 0, tipp: 'Im Winter kühl und fast trocken halten – dann blüht er eher. Stacheln: außer Reichweite kleiner Kinder.' },
  { n: 'Sukkulenten', s: '🪴', o: 'zimmer', g: [10, 28], d: 28, licht: 'sonnig', gift: 0, tipp: 'Durchdringend gießen, dann wieder ganz abtrocknen lassen.' },
  { n: 'Calathea', s: '🍃', o: 'zimmer', g: [4, 7], d: 14, licht: 'halbschattig', gift: 0, tipp: 'Mag hohe Luftfeuchte und kalkarmes Wasser. Braune Blattränder = Luft zu trocken.' },
  { n: 'Drachenbaum', s: '🌴', o: 'zimmer', g: [8, 14], d: 14, licht: 'hell bis halbschattig', gift: 1, tipp: 'Verträgt Trockenheit besser als Nässe. Braune Spitzen einfach abschneiden.' },
  { n: 'Yucca-Palme', s: '🌴', o: 'zimmer', g: [10, 21], d: 28, licht: 'sonnig', gift: 1, tipp: 'Darf im Sommer auf den Balkon. Spitze Blätter – nicht in Laufhöhe von Kindern.' },
  { n: 'Kentia-Palme', s: '🌴', o: 'zimmer', g: [7, 12], d: 14, licht: 'hell bis halbschattig', gift: 0, tipp: 'Robuste Zimmerpalme, wächst langsam. Gleichmäßig feucht halten.' },
  { n: 'Goldfruchtpalme', s: '🌴', o: 'zimmer', g: [5, 9], d: 14, licht: 'hell', gift: 0, tipp: 'Braucht Luftfeuchte – ab und zu besprühen. Kinder- und tierfreundlich.' },
  { n: 'Dieffenbachie', s: '🌿', o: 'zimmer', g: [6, 10], d: 14, licht: 'hell bis halbschattig', gift: 3, tipp: 'Stark giftig: Saft verursacht Schwellungen im Mund. Unbedingt außer Reichweite von Kindern und Haustieren.' },
  { n: 'Weihnachtsstern', s: '🌺', o: 'zimmer', g: [5, 7], d: 14, licht: 'hell, warm, ohne Zugluft', gift: 1, tipp: 'Nur mäßig gießen, Wasser im Übertopf nach 10 Minuten abgießen. Milchsaft reizt.' },
  { n: 'Usambaraveilchen', s: '💜', o: 'zimmer', g: [4, 7], d: 14, licht: 'hell, keine Mittagssonne', gift: 0, tipp: 'Von unten über den Untersetzer gießen – Blätter nicht nass machen.' },
  { n: 'Ufopflanze', s: '🌱', o: 'zimmer', g: [6, 10], d: 14, licht: 'hell', gift: 0, tipp: 'Ab und zu drehen, damit sie gerade wächst. Ableger lassen sich gut verschenken.' },
  { n: 'Bananenpflanze', s: '🍌', o: 'zimmer', g: [3, 7], d: 7, licht: 'sehr hell', gift: 0, tipp: 'Durstig und hungrig: im Sommer viel Wasser und wöchentlich düngen.' },
  { n: 'Elefantenfuß', s: '🌴', o: 'zimmer', g: [14, 28], d: 28, licht: 'sonnig', gift: 1, tipp: 'Speichert Wasser im Stamm – lieber zu wenig als zu viel gießen.' },
  { n: 'Zyperngras', s: '🌾', o: 'zimmer', g: [2, 4], d: 14, licht: 'hell', gift: 0, tipp: 'Sumpfpflanze: Im Untersetzer darf immer etwas Wasser stehen.' },
  { n: 'Efeu', s: '🍃', o: 'zimmer', g: [5, 9], d: 14, licht: 'halbschattig, eher kühl', gift: 2, tipp: 'Mag es kühl. Bei trockener Heizungsluft kommen gern Spinnmilben.' },
  { n: 'Basilikum', s: '🌿', o: 'zimmer', g: [2, 3], d: 14, licht: 'sonnig, warm', gift: 0, tipp: 'Morgens von unten gießen, Triebspitzen ernten statt einzelne Blätter – dann wird er buschig.' },
  { n: 'Schnittlauch', s: '🌱', o: 'zimmer', g: [3, 5], d: 21, licht: 'hell', gift: 0, tipp: 'Halme 2–3 cm über der Erde abschneiden, er treibt neu aus.' },
  { n: 'Petersilie', s: '🌿', o: 'zimmer', g: [3, 5], d: 21, licht: 'hell, nicht zu warm', gift: 0, tipp: 'Gleichmäßig feucht halten, äußere Stängel zuerst ernten.' },
  // ☀️ Balkon & Kübel
  { n: 'Geranie', s: '🌺', o: 'balkon', g: [2, 21], d: 7, licht: 'sonnig', gift: 1, frost: true, tipp: 'Im Sommer oft gießen und wöchentlich düngen. Verblühtes ausknipsen.', winter: 'Vor dem ersten Frost zurückschneiden und hell bei 5–10 °C überwintern, kaum gießen.' },
  { n: 'Petunie', s: '🌸', o: 'balkon', g: [1, null], d: 7, licht: 'sonnig', gift: 0, frost: true, tipp: 'Sehr durstig – an heißen Tagen morgens und abends gießen. Eisenhaltiger Dünger gegen gelbe Blätter.' },
  { n: 'Zauberglöckchen', s: '🌼', o: 'balkon', g: [1, null], d: 7, licht: 'sonnig', gift: 0, frost: true, tipp: 'Wie eine kleine Petunie: viel Wasser, viel Dünger, Regenschutz mag sie.' },
  { n: 'Fuchsie', s: '🌺', o: 'balkon', g: [2, 21], d: 7, licht: 'halbschattig', gift: 0, frost: true, tipp: 'Mag keine pralle Sonne. Die Beeren sind essbar.', winter: 'Hell und kühl (5–10 °C) überwintern, im Frühjahr zurückschneiden.' },
  { n: 'Männertreu', s: '💙', o: 'balkon', g: [1, null], d: 14, licht: 'sonnig bis halbschattig', gift: 2, frost: true, tipp: 'Nie austrocknen lassen. Nach der ersten Blüte zurückschneiden, dann blüht sie nochmal.' },
  { n: 'Begonie', s: '🌸', o: 'balkon', g: [2, null], d: 14, licht: 'halbschattig', gift: 1, frost: true, tipp: 'Nicht über die Blüten gießen. Knollenbegonien kann man im Herbst ausgraben und trocken lagern.' },
  { n: 'Oleander', s: '🌸', o: 'balkon', g: [2, 14], d: 7, licht: 'vollsonnig', gift: 3, frost: true, tipp: 'Stark giftig in allen Teilen – mit kleinen Kindern besser nicht oder unerreichbar aufstellen. Liebt Wasser, gern mit Wasser im Untersetzer.', winter: 'Leichte Fröste bis −5 °C verträgt er; dann hell bei 5–10 °C überwintern.' },
  { n: 'Olivenbaum', s: '🫒', o: 'balkon', g: [4, 21], d: 28, licht: 'vollsonnig', gift: 0, frost: true, tipp: 'Lieber trocken als nass. Gießen, wenn die obere Erdschicht trocken ist.', winter: 'Hell bei 5–10 °C überwintern, wenig gießen. Leichter Frost geht kurz.' },
  { n: 'Zitronenbäumchen', s: '🍋', o: 'balkon', g: [3, 10], d: 7, licht: 'vollsonnig', gift: 0, frost: true, tipp: 'Kalkarmes Wasser, Zitrusdünger von März bis September. Gelbe Blätter mit grünen Adern = Eisenmangel.', winter: 'Hell bei 8–12 °C überwintern, Erde nur leicht feucht halten.' },
  { n: 'Lavendel', s: '💜', o: 'balkon', g: [5, 21], d: 28, licht: 'vollsonnig', gift: 0, tipp: 'Mag es mager und trocken. Nach der Blüte um ein Drittel zurückschneiden.', winter: 'Im Topf vor Dauerfrost schützen (Topf einpacken), an frostfreien Tagen leicht gießen.' },
  { n: 'Rosmarin', s: '🌿', o: 'balkon', g: [4, 14], d: 28, licht: 'vollsonnig', gift: 0, frost: true, tipp: 'Staunässe ist schlimmer als Trockenheit.', winter: 'Hell und kühl überwintern oder gut eingepackt an die Hauswand.' },
  { n: 'Kübel-Hortensie', s: '💠', o: 'balkon', g: [1, 14], d: 14, licht: 'halbschattig', gift: 1, tipp: 'Sehr durstig – im Sommer täglich gießen, mit kalkarmem Wasser.', winter: 'Topf einpacken, an geschützter Stelle draußen lassen; an frostfreien Tagen gießen.' },
  { n: 'Balkontomate', s: '🍅', o: 'balkon', g: [1, null], d: 7, licht: 'vollsonnig, regengeschützt', gift: 1, frost: true, tipp: 'Gleichmäßig gießen (sonst platzen die Früchte), Tomatendünger ab der Blüte. Blätter und grüne Früchte nicht essen.' },
  { n: 'Balkon-Erdbeere', s: '🍓', o: 'balkon', g: [2, 14], d: 14, licht: 'sonnig', gift: 0, tipp: 'Gleichmäßig feucht halten, Früchte nicht auf nasser Erde liegen lassen.', winter: 'Topf einpacken und geschützt draußen lassen.' },
  { n: 'Chili', s: '🌶️', o: 'balkon', g: [2, 10], d: 14, licht: 'vollsonnig, warm', gift: 1, frost: true, tipp: 'Scharfe Früchte nicht in Kinderhände (Augen!). Mäßig, aber regelmäßig gießen.', winter: 'Kann hell und kühl überwintern und trägt dann früher.' },
  { n: 'Kapuzinerkresse', s: '🧡', o: 'balkon', g: [2, null], d: 0, licht: 'sonnig', gift: 0, frost: true, tipp: 'Blüten und Blätter sind essbar – toll für Kinder. Nicht düngen, sonst gibt es nur Blätter.' },
  { n: 'Engelstrompete', s: '🎺', o: 'balkon', g: [1, 14], d: 7, licht: 'sonnig bis halbschattig', gift: 3, frost: true, tipp: 'Stark giftig – mit kleinen Kindern nicht empfehlenswert. Riesiger Durst, im Hochsommer zweimal täglich gießen.', winter: 'Vor Frost zurückschneiden und hell oder dunkel bei 5–10 °C überwintern.' },
  { n: 'Bougainvillea', s: '🌺', o: 'balkon', g: [3, 21], d: 14, licht: 'vollsonnig', gift: 1, frost: true, tipp: 'Blüht am besten etwas trocken gehalten. Dornen!', winter: 'Hell bei 10–15 °C überwintern, wenig gießen.' },
  { n: 'Dipladenia', s: '🌸', o: 'balkon', g: [2, 14], d: 14, licht: 'sonnig', gift: 2, frost: true, tipp: 'Verträgt Trockenheit gut. Milchsaft ist giftig.', winter: 'Hell bei 12–15 °C überwintern.' },
  { n: 'Margerite', s: '🌼', o: 'balkon', g: [2, 14], d: 7, licht: 'sonnig', gift: 1, frost: true, tipp: 'Verblühtes regelmäßig abschneiden.', winter: 'Hell und kühl überwintern oder als Einjährige behandeln.' },
  { n: 'Schmucklilie', s: '💙', o: 'balkon', g: [3, 21], d: 14, licht: 'sonnig', gift: 2, frost: true, tipp: 'Blüht besser, wenn der Topf eng ist.', winter: 'Hell und kühl (5–10 °C) fast trocken überwintern.' },
  { n: 'Buchsbaum im Kübel', s: '🌳', o: 'balkon', g: [4, 14], d: 28, licht: 'sonnig bis halbschattig', gift: 2, tipp: 'Regelmäßig ins Innere schauen (Buchsbaumzünsler).', winter: 'Draußen lassen, an frostfreien Tagen gießen.' },
];

const ZIMMER_GIFT = [
  { text: 'gilt als ungiftig', kurz: '', klasse: '' },
  { text: 'leicht giftig / reizend', kurz: '⚠️ leicht giftig', klasse: 'leicht' },
  { text: 'giftig – außer Reichweite von Kindern', kurz: '☠️ giftig', klasse: 'giftig' },
  { text: 'stark giftig – nicht in Kinderreichweite', kurz: '☠️ stark giftig', klasse: 'stark' },
];

let zimmerFilter = 'alle', zimmerEditId = null;

// Zimmerpflanzen gehören zur Wohnung, nicht zu einem bestimmten Garten: sie liegen im ersten Garten, der welche hat
function zimmerListe() {
  const g = Object.values(gardens || {}).find(x => x && Array.isArray(x.zimmerPflanzen) && x.zimmerPflanzen.length) || gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.zimmerPflanzen)) g.zimmerPflanzen = [];
  return g.zimmerPflanzen;
}
function zimmerKat(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return ZIMMER_KATALOG.find(k => k.n.toLowerCase() === n) || ZIMMER_KATALOG.find(k => n.includes(k.n.toLowerCase()) || k.n.toLowerCase().includes(n) && n.length >= 4) || null;
}
function zimmerTageSeit(iso) { if (!iso) return null; const a = new Date(iso + 'T00:00:00'), h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((h - a) / 864e5); }
function zimmerPlusTage(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function zimmerSaison(monat) { monat = monat || new Date().getMonth() + 1; return monat >= 4 && monat <= 9 ? 'sommer' : (monat >= 11 || monat <= 2) ? 'winter' : 'uebergang'; }

// Gießabstand heute (null = ruht / Saison vorbei)
function zimmerIntervall(p, heiss) {
  const k = zimmerKat(p.name);
  const basis = k ? k.g : (p.ort === 'balkon' ? [2, 14] : [7, 12]);
  let sommer = basis[0], winter = basis[1];
  const eigen = parseInt(p.intervall, 10);
  if (eigen > 0) { winter = winter === null ? null : Math.max(eigen, Math.round(eigen * winter / sommer)); sommer = eigen; }
  const s = zimmerSaison();
  let t = s === 'sommer' ? sommer : s === 'winter' ? winter : (winter === null ? (new Date().getMonth() + 1 === 3 ? null : sommer) : Math.round((sommer + winter) / 2));
  if (t === null) return null;
  if (heiss && p.ort === 'balkon' && s !== 'winter') t = Math.max(1, t - 1);
  return t;
}
function zimmerFaellig(p, heiss) {
  const t = zimmerIntervall(p, heiss);
  if (t === null) return null;
  const seit = zimmerTageSeit(p.lastWatered);
  if (seit === null) return { dueToday: true, dueIn: 0, intervall: t, seit: null };
  return { dueToday: seit >= t, dueIn: Math.max(0, t - seit), intervall: t, seit };
}
function zimmerDuengenFaellig(p) {
  const k = zimmerKat(p.name);
  const d = k ? k.d : 14;
  if (!d) return null;
  const m = new Date().getMonth() + 1;
  const saison = p.ort === 'balkon' ? (m >= 4 && m <= 8) : (m >= 3 && m <= 9);
  if (!saison) return null;
  const seit = zimmerTageSeit(p.zuletztGeduengt || p.angelegt);
  return { dueToday: seit === null || seit >= d, dueIn: seit === null ? 0 : Math.max(0, d - seit), intervall: d };
}
function zimmerHeiss() { try { return !!(typeof getUpcomingHeatWarning === 'function' && getUpcomingHeatWarning()); } catch (e) { return false; } }
function zimmerOrtName(p) { return p.ort === 'balkon' ? 'Balkon' : 'Drinnen'; }

// ---------- Pflegeplan / „Heute“ ----------
function zimmerPflegeItems(heiss) {
  const items = [];
  zimmerListe().forEach(p => {
    const f = zimmerFaellig(p, heiss);
    if (f) {
      const id = 'zi_' + p.id + '_water';
      const heuteErledigt = isCareTaskDone(id) && zimmerTageSeit(p.lastWatered) === 0;
      if (f.dueToday || heuteErledigt) items.push({ id, bed: zimmerOrtName(p), plant: p.name, sym: p.sym || '🪴', kind: 'zimmer', urgent: true, text: '💧 gießen' + (heiss && p.ort === 'balkon' ? ' (Hitze)' : ''), dueInDays: 0 });
    }
    const dg = zimmerDuengenFaellig(p);
    if (dg) {
      const id = 'zi_' + p.id + '_dueng';
      const heuteErledigt = isCareTaskDone(id) && zimmerTageSeit(p.zuletztGeduengt) === 0;
      if (dg.dueToday || heuteErledigt) items.push({ id, bed: zimmerOrtName(p), plant: p.name, sym: p.sym || '🪴', kind: 'zimmerdueng', urgent: true, text: '🌿 düngen (ins Gießwasser)', dueInDays: 0 });
    }
  });
  return items;
}
function zimmerBeimAbhaken(id, jetztErledigt) {
  const m = /^zi_(.+)_(water|dueng)$/.exec(id); if (!m) return;
  const p = zimmerListe().find(x => x.id === m[1]); if (!p) return;
  const feld = m[2] === 'water' ? 'lastWatered' : 'zuletztGeduengt';
  const state = getCareDoneState();
  state.ziVorher = state.ziVorher || {};
  if (jetztErledigt) { if (!(id in state.ziVorher)) state.ziVorher[id] = p[feld] || null; p[feld] = heuteISO(); }
  else if (id in state.ziVorher) { if (state.ziVorher[id]) p[feld] = state.ziVorher[id]; else delete p[feld]; delete state.ziVorher[id]; }
  localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  saveData();
  if (document.getElementById('view-zimmer')?.classList.contains('active')) zimmerRender();
}

// ---------- Push: Gieß-Erinnerungen als Garten-Notizen, Frost für Balkonpflanzen ----------
function zimmerPushErgaenzen(plan) {
  const liste = zimmerListe();
  if (!plan || !liste.length) return plan;
  const heute = heuteISO(), proTag = {};
  liste.forEach(p => {
    const t = zimmerIntervall(p, false);
    if (!t) return;
    let d = p.lastWatered ? zimmerPlusTage(p.lastWatered, t) : heute;
    if (d < heute) d = heute;
    for (let i = 0; i < 6 && zimmerTageSeit(d) >= -10; i++, d = zimmerPlusTage(d, t)) (proTag[d] = proTag[d] || []).push(p.name);
  });
  plan.notizen = plan.notizen || [];
  Object.keys(proTag).sort().forEach(d => {
    const namen = [...new Set(proTag[d])];
    plan.notizen.push({ id: 'zi_' + d, t: ('🪴 Heute gießen: ' + namen.slice(0, 5).join(', ') + (namen.length > 5 ? ' …' : '')).slice(0, 140), d, j: 0, e: '', g: 'Drinnen & Balkon' });
  });
  // ❄️ frostempfindliche Balkonpflanzen in die Frostwarnung (Garten mit Wetter-Standort)
  const frostig = liste.filter(p => p.ort === 'balkon' && (zimmerKat(p.name) || {}).frost);
  if (frostig.length && plan.gaerten && plan.gaerten.length) {
    const g = plan.gaerten[0];
    g.frost = g.frost || [];
    frostig.forEach(p => { if (!g.frost.some(f => f.n === p.name)) g.frost.push({ n: p.name, ab: null, t: 'Balkon: reinholen' }); });
    g.pflanzen = (g.pflanzen || 0) + frostig.length;
  }
  return plan;
}

// ---------- Ansicht ----------
function zimmerAnsichtBauen() {
  if (document.getElementById('view-zimmer')) return;
  const v = document.createElement('div');
  v.className = 'view'; v.id = 'view-zimmer';
  v.innerHTML = '<div class="zimmer-wrap" id="zimmerWrap"></div>';
  const ref = document.getElementById('view-planen');
  ref.parentNode.insertBefore(v, ref);
}
function zimmerStatus(p, heiss) {
  const f = zimmerFaellig(p, heiss), k = zimmerKat(p.name);
  if (!f) return { text: k && k.g[1] === null ? '💤 Saison vorbei (einjährig)' : '💤 Winterruhe – kaum gießen', klasse: 'ruhe' };
  if (f.seit === 0) return { text: '✓ heute gegossen', klasse: 'ok' };
  if (f.dueToday) return { text: f.seit === null ? '💧 heute gießen' : '💧 heute gießen · zuletzt vor ' + f.seit + ' Tagen', klasse: 'faellig' };
  return { text: 'nächstes Mal in ' + f.dueIn + ' Tag' + (f.dueIn === 1 ? '' : 'en'), klasse: '' };
}
function zimmerRender() {
  zimmerAnsichtBauen();
  const box = document.getElementById('zimmerWrap');
  const liste = zimmerListe(), heiss = zimmerHeiss();
  const gefiltert = liste.filter(p => zimmerFilter === 'alle' || (zimmerFilter === 'balkon') === (p.ort === 'balkon'))
    .map(p => ({ p, f: zimmerFaellig(p, heiss) }))
    .sort((a, b) => (a.f ? (a.f.seit === 0 ? 1 : a.f.dueToday ? 0 : 2) : 3) - (b.f ? (b.f.seit === 0 ? 1 : b.f.dueToday ? 0 : 2) : 3) || (a.f ? a.f.dueIn : 99) - (b.f ? b.f.dueIn : 99) || a.p.name.localeCompare(b.p.name, 'de'));
  const faellig = liste.filter(p => { const f = zimmerFaellig(p, heiss); return f && f.dueToday && f.seit !== 0; });
  const giftig = liste.filter(p => (zimmerKat(p.name) || {}).gift >= 2);
  const anzahl = { alle: liste.length, zimmer: liste.filter(p => p.ort !== 'balkon').length, balkon: liste.filter(p => p.ort === 'balkon').length };
  box.innerHTML = `<div class="hub-kopf"><h2>🪴 Drinnen &amp; Balkon</h2><p>Zimmer-, Kübel- und Balkonpflanzen – mit Gießplan, Erinnerungen und Doktor.</p></div>
    ${liste.length ? `<div class="zimmer-filter">${[['alle', 'Alle'], ['zimmer', '🏠 Drinnen'], ['balkon', '☀️ Balkon']].map(([id, l]) => `<button type="button" class="saat-chip${zimmerFilter === id ? ' an' : ''}" onclick="zimmerFilter='${id}';zimmerRender()">${l} <span class="zimmer-zahl">${anzahl[id]}</span></button>`).join('')}</div>` : ''}
    ${faellig.length ? `<div class="zimmer-heute"><div><b>💧 Heute gießen:</b> ${faellig.map(p => escapeHtml(p.name)).join(', ')}</div><button type="button" class="btn-primary" onclick="zimmerAlleGegossen()">✓ Alle gegossen</button></div>` : liste.length ? '<div class="zimmer-heute ruhig">✓ Heute ist nichts zu gießen.</div>' : ''}
    ${giftig.length ? `<div class="zimmer-gifthinweis">☠️ ${giftig.length === 1 ? escapeHtml(giftig[0].name) + ' ist' : giftig.length + ' Pflanzen sind'} giftig – außer Reichweite der Kinder stellen.</div>` : ''}
    <div class="zimmer-liste">${gefiltert.map(({ p }) => zimmerKarteHtml(p, heiss)).join('') || (liste.length ? '<div class="empty-state">Hier ist noch nichts.</div>' : '')}</div>
    ${liste.length ? '' : zimmerLeerHtml()}
    <button type="button" class="btn-primary zimmer-neu" onclick="zimmerBearbeiten(null)">＋ Pflanze hinzufügen</button>
    <p class="zimmer-fuss">Gießen und Düngen erscheinen unter „🏠 Heute“ und im Pflegeplan; mit Push-Erinnerung bekommst du morgens einen Hinweis. Giftangaben ohne Gewähr – im Notfall: Giftnotruf.</p>`;
}
function zimmerKarteHtml(p, heiss) {
  const k = zimmerKat(p.name), st = zimmerStatus(p, heiss), gift = k ? ZIMMER_GIFT[k.gift] : null, dg = zimmerDuengenFaellig(p);
  const f = zimmerFaellig(p, heiss);
  const winterHinweis = p.ort === 'balkon' && k && k.frost && k.g[1] !== null && zimmerSaison() !== 'sommer' ? ' · ❄️ frostfrei überwintern' : '';
  return `<div class="zimmer-karte ${st.klasse}">
    <button type="button" class="zimmer-kopf" onclick="zimmerBearbeiten('${p.id}')">
      <span class="zimmer-sym">${escapeHtml(p.sym || '🪴')}</span>
      <span class="zimmer-info"><b>${escapeHtml(p.name)}</b><small>${p.ort === 'balkon' ? '☀️' : '🏠'} ${escapeHtml(p.platz || zimmerOrtName(p))}${gift && gift.kurz ? ` · <span class="zimmer-gift ${gift.klasse}">${gift.kurz}</span>` : ''}</small><small class="zimmer-st">${st.text}${dg && dg.dueToday ? ' · 🌿 düngen' : ''}${winterHinweis}</small></span>
    </button>
    <div class="zimmer-knoepfe">
      ${f ? `<button type="button" class="${f.dueToday && f.seit !== 0 ? 'haupt' : ''}" onclick="zimmerGegossen('${p.id}')" title="Gegossen">💧</button>` : ''}
      ${dg && dg.dueToday ? `<button type="button" onclick="zimmerGeduengt('${p.id}')" title="Gedüngt">🌿</button>` : ''}
      <button type="button" onclick="doktorOeffnen('zi',null,'${p.id}')" title="Pflanzen-Doktor">🩺</button>
    </div>
  </div>`;
}
function zimmerLeerHtml() {
  const vorschlaege = ['Monstera', 'Grünlilie', 'Orchidee', 'Basilikum', 'Geranie', 'Olivenbaum', 'Zitronenbäumchen', 'Balkontomate'];
  return `<div class="zimmer-leer"><div class="zimmer-leer-titel">Schnell anlegen – antippen:</div><div class="zimmer-vorschlaege">${vorschlaege.map(n => { const k = zimmerKat(n); return `<button type="button" class="saat-chip" onclick="zimmerSchnellAnlegen('${n}')">${k.s} ${n}</button>`; }).join('')}</div></div>`;
}
function zimmerSchnellAnlegen(name) {
  const k = zimmerKat(name);
  zimmerListe().push({ id: 'zi' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, sym: k ? k.s : '🪴', ort: k ? k.o : 'zimmer', angelegt: heuteISO() });
  saveData(); zimmerRender();
  showTempStatus('🪴 ' + name + ' angelegt – tippe sie an, um den Platz einzutragen', 4);
}

function zimmerGegossen(id) {
  const p = zimmerListe().find(x => x.id === id); if (!p) return;
  const careId = 'zi_' + id + '_water', f = zimmerFaellig(p, zimmerHeiss());
  if (f && f.dueToday && !isCareTaskDone(careId)) {
    careTaskSetzen(careId, true);
    zimmerRender(); zimmerHeuteAktualisieren();
    showTempStatus('💧 ' + p.name + ' gegossen', 5, { label: 'Rückgängig', aktion: () => { careTaskSetzen(careId, false); zimmerRender(); zimmerHeuteAktualisieren(); } });
    return;
  }
  const vorher = p.lastWatered;
  p.lastWatered = heuteISO(); saveData(); zimmerRender();
  showTempStatus('💧 ' + p.name + ' gegossen', 5, { label: 'Rückgängig', aktion: () => { if (vorher) p.lastWatered = vorher; else delete p.lastWatered; saveData(); zimmerRender(); } });
}
function zimmerGeduengt(id) {
  const p = zimmerListe().find(x => x.id === id); if (!p) return;
  const careId = 'zi_' + id + '_dueng';
  careTaskSetzen(careId, true);
  zimmerRender(); zimmerHeuteAktualisieren();
  showTempStatus('🌿 ' + p.name + ' gedüngt', 5, { label: 'Rückgängig', aktion: () => { careTaskSetzen(careId, false); zimmerRender(); zimmerHeuteAktualisieren(); } });
}
function zimmerAlleGegossen() {
  const heiss = zimmerHeiss();
  const ids = zimmerListe().filter(p => { const f = zimmerFaellig(p, heiss); return f && f.dueToday && f.seit !== 0; }).map(p => 'zi_' + p.id + '_water');
  ids.forEach(id => careTaskSetzen(id, true));
  zimmerRender(); zimmerHeuteAktualisieren();
  showTempStatus('💧 ' + ids.length + '× gegossen', 5, { label: 'Rückgängig', aktion: () => { ids.forEach(id => careTaskSetzen(id, false)); zimmerRender(); zimmerHeuteAktualisieren(); } });
}
function zimmerHeuteAktualisieren() { try { if (document.getElementById('view-home')?.classList.contains('active')) renderHomeOverview(); } catch (e) {} }
function zimmerNachDoktor() { if (document.getElementById('zimmerModal')?.style.display === 'flex') zimmerBearbeiten(zimmerEditId); if (document.getElementById('view-zimmer')?.classList.contains('active')) zimmerRender(); }

// ---------- Anlegen / Bearbeiten ----------
function zimmerModalBauen() {
  if (document.getElementById('zimmerModal')) return;
  const m = document.createElement('div');
  m.className = 'modal-bg'; m.id = 'zimmerModal'; m.style.display = 'none';
  m.onclick = (e) => { if (e.target === m) zimmerSchliessen(); };
  m.innerHTML = `<div class="modal zimmer-modal">
    <h2 id="zimmerTitel" style="margin-top:0">🪴 Pflanze</h2>
    <div class="form-row"><label for="zimmerName">Welche Pflanze?</label>
      <input type="text" id="zimmerName" list="zimmerKatalogListe" placeholder="z. B. Monstera, Geranie, Basilikum …" autocomplete="off" oninput="zimmerNameGeaendert()">
      <datalist id="zimmerKatalogListe">${ZIMMER_KATALOG.map(k => `<option value="${escapeHtml(k.n)}">`).join('')}</datalist></div>
    <div class="form-row"><label>Wo steht sie?</label><div class="zimmer-ort-wahl" id="zimmerOrtWahl"></div></div>
    <div class="form-row"><label for="zimmerPlatz">Platz (optional)</label><input type="text" id="zimmerPlatz" placeholder="z. B. Wohnzimmer Südfenster, Kinderzimmer …"></div>
    <div id="zimmerSteckbrief"></div>
    <div class="form-row"><label for="zimmerIntervall">Gießen alle … Tage (Sommer, optional)</label><input type="text" inputmode="numeric" id="zimmerIntervall" placeholder="automatisch" oninput="zimmerSteckbriefZeigen()"></div>
    <div class="form-row"><label for="zimmerNotiz">Notiz (optional)</label><textarea id="zimmerNotiz" rows="2" placeholder="z. B. Ableger von Oma, 2025 umgetopft …"></textarea></div>
    <div id="zimmerBefunde"></div>
    <div class="modal-btns"><button class="btn-cancel" onclick="zimmerSchliessen()">Abbrechen</button><button class="btn-primary" style="width:auto;flex:1" onclick="zimmerSpeichern()">Speichern</button></div>
    <button type="button" class="btn-cancel" id="zimmerLoeschen" style="width:100%;margin-top:8px;color:var(--terracotta-text)" onclick="zimmerLoeschen()">🗑 Pflanze entfernen</button>
  </div>`;
  document.body.appendChild(m);
}
let zimmerEditOrt = 'zimmer';
function zimmerOrtWahlRender() {
  document.getElementById('zimmerOrtWahl').innerHTML = [['zimmer', '🏠 Drinnen'], ['balkon', '☀️ Balkon / Terrasse']].map(([id, l]) =>
    `<button type="button" class="saat-chip${zimmerEditOrt === id ? ' an' : ''}" onclick="zimmerEditOrt='${id}';zimmerOrtWahlRender();zimmerSteckbriefZeigen()">${l}</button>`).join('');
}
function zimmerBearbeiten(id) {
  zimmerModalBauen();
  zimmerEditId = id;
  const p = id ? zimmerListe().find(x => x.id === id) : null;
  document.getElementById('zimmerTitel').textContent = p ? (p.sym || '🪴') + ' ' + p.name : '🪴 Pflanze hinzufügen';
  document.getElementById('zimmerName').value = p ? p.name : '';
  document.getElementById('zimmerPlatz').value = p ? p.platz || '' : '';
  document.getElementById('zimmerIntervall').value = p && p.intervall ? p.intervall : '';
  document.getElementById('zimmerNotiz').value = p ? p.notiz || '' : '';
  document.getElementById('zimmerLoeschen').style.display = p ? '' : 'none';
  zimmerEditOrt = p ? (p.ort || 'zimmer') : (zimmerFilter === 'balkon' ? 'balkon' : 'zimmer');
  zimmerOrtWahlRender(); zimmerSteckbriefZeigen();
  const bef = p && Array.isArray(p.diagnosen) ? p.diagnosen : [];
  document.getElementById('zimmerBefunde').innerHTML = p ? `<button type="button" class="btn-secondary zimmer-doktor-btn" onclick="doktorOeffnen('zi',null,'${p.id}')">🩺 Was hat meine Pflanze?</button>` +
    (bef.length ? `<div class="doktor-verlauf-titel">Bisherige Befunde</div>` + bef.map(d => `<div class="doktor-verlauf-zeile">${d.foto ? `<img src="${d.foto}" alt="" class="doktor-foto-mini">` : '<span class="doktor-typ">🩺</span>'}<div class="dv-text"><b>${escapeHtml(d.name)}</b><span>${(d.datum || '').split('-').reverse().join('.')}</span></div><button type="button" class="dv-btn" title="Löschen" onclick="zimmerBefundLoeschen('${p.id}','${d.id}')">🗑</button></div>`).join('') : '') : '';
  document.getElementById('zimmerModal').style.display = 'flex';
  if (!p) setTimeout(() => document.getElementById('zimmerName').focus(), 50);
}
function zimmerNameGeaendert() {
  const k = zimmerKat(document.getElementById('zimmerName').value);
  if (k && !zimmerEditId) { zimmerEditOrt = k.o; zimmerOrtWahlRender(); }
  zimmerSteckbriefZeigen();
}
function zimmerSteckbriefZeigen() {
  const box = document.getElementById('zimmerSteckbrief');
  const k = zimmerKat(document.getElementById('zimmerName').value);
  if (!k) { box.innerHTML = document.getElementById('zimmerName').value.trim() ? '<div class="zimmer-steckbrief ruhig">Nicht im Katalog – ich nehme Standardwerte. Trag den Gießabstand unten ein, wenn du ihn kennst.</div>' : ''; return; }
  const eigen = parseInt(document.getElementById('zimmerIntervall').value, 10);
  const sommer = eigen > 0 ? eigen : k.g[0];
  const winter = k.g[1] === null ? null : (eigen > 0 ? Math.max(eigen, Math.round(eigen * k.g[1] / k.g[0])) : k.g[1]);
  const gift = ZIMMER_GIFT[k.gift];
  box.innerHTML = `<div class="zimmer-steckbrief">
    <div class="zs-kopf"><span>${k.s}</span><b>${escapeHtml(k.n)}</b></div>
    <div class="zs-zeile"><span>☀️ Licht</span><span>${escapeHtml(k.licht)}</span></div>
    <div class="zs-zeile"><span>💧 Gießen</span><span>Sommer alle ${sommer === 1 ? 'Tage (täglich)' : sommer + ' Tage'} · ${winter === null ? 'einjährig / ruht im Winter' : 'Winter alle ' + winter + ' Tage'}</span></div>
    <div class="zs-zeile"><span>🌿 Düngen</span><span>${k.d ? (k.d === 7 ? 'wöchentlich' : 'alle ' + k.d + ' Tage') + (k.o === 'balkon' ? ' (April–August)' : ' (März–September)') : 'nicht düngen'}</span></div>
    <div class="zs-zeile"><span>👶 Kinder</span><span class="zimmer-gift ${gift.klasse}">${gift.text}</span></div>
    <div class="zs-tipp">💡 ${escapeHtml(k.tipp)}</div>
    ${k.winter ? `<div class="zs-tipp">❄️ ${escapeHtml(k.winter)}</div>` : ''}
    ${k.o === 'balkon' && zimmerEditOrt === 'zimmer' ? '<div class="zs-tipp">ℹ️ Eigentlich eine Balkonpflanze – drinnen braucht sie den hellsten Platz.</div>' : ''}
  </div>`;
}
function zimmerSchliessen() { const m = document.getElementById('zimmerModal'); if (m) m.style.display = 'none'; }
function zimmerSpeichern() {
  const name = document.getElementById('zimmerName').value.trim();
  if (!name) { showTempStatus('Bitte einen Namen eintragen.', 3); document.getElementById('zimmerName').focus(); return; }
  const k = zimmerKat(name), iv = parseInt(document.getElementById('zimmerIntervall').value, 10);
  const daten = { name: k && k.n.toLowerCase() === name.toLowerCase() ? k.n : name, ort: zimmerEditOrt, platz: document.getElementById('zimmerPlatz').value.trim(), notiz: document.getElementById('zimmerNotiz').value.trim(), intervall: iv > 0 && iv < 100 ? iv : 0 };
  const liste = zimmerListe();
  if (zimmerEditId) {
    const p = liste.find(x => x.id === zimmerEditId); if (!p) return;
    if (p.name !== daten.name) p.sym = k ? k.s : (p.sym || '🪴');
    Object.assign(p, daten);
    if (!p.intervall) delete p.intervall;
  } else {
    const neu = Object.assign({ id: 'zi' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sym: k ? k.s : '🪴', angelegt: heuteISO() }, daten);
    if (!neu.intervall) delete neu.intervall;
    liste.push(neu);
  }
  saveData(); zimmerSchliessen(); zimmerRender(); zimmerHeuteAktualisieren();
  showTempStatus('🪴 Gespeichert', 2);
}
function zimmerLoeschen() {
  const liste = zimmerListe(), i = liste.findIndex(x => x.id === zimmerEditId);
  if (i === -1) return;
  const weg = liste.splice(i, 1)[0];
  saveData(); zimmerSchliessen(); zimmerRender(); zimmerHeuteAktualisieren();
  showTempStatus('🗑 ' + weg.name + ' entfernt', 6, { label: 'Rückgängig', aktion: () => { liste.splice(i, 0, weg); saveData(); zimmerRender(); } });
}
function zimmerBefundLoeschen(pid, did) {
  const p = zimmerListe().find(x => x.id === pid); if (!p || !Array.isArray(p.diagnosen)) return;
  const i = p.diagnosen.findIndex(d => d.id === did); if (i === -1) return;
  const weg = p.diagnosen.splice(i, 1)[0];
  saveData(); zimmerBearbeiten(pid);
  showTempStatus('🗑 Befund gelöscht', 6, { label: 'Rückgängig', aktion: () => { p.diagnosen.splice(i, 0, weg); saveData(); zimmerBearbeiten(pid); } });
}

// ---------- Anbindung an bestehende Funktionen ----------
(function () {
  const altShow = window.showView;
  if (typeof altShow === 'function') window.showView = function (name) {
    if (name === 'zimmer') zimmerAnsichtBauen();
    const r = altShow.apply(this, arguments);
    if (name === 'zimmer') zimmerRender();
    return r;
  };
  const altToggle = window.toggleCareTaskDone;
  if (typeof altToggle === 'function') window.toggleCareTaskDone = function (id) {
    const vorher = isCareTaskDone(id);
    const r = altToggle.apply(this, arguments);
    try { zimmerBeimAbhaken(id, !vorher); } catch (e) {}
    return r;
  };
  const altPlan = window.computeCarePlanData;
  if (typeof altPlan === 'function') window.computeCarePlanData = async function () {
    const d = await altPlan.apply(this, arguments);
    try {
      zimmerPflegeItems(!!(d.hotDry || d.heatWarn)).forEach(i => d.items.push(i));
      if (d.frostWarn) zimmerListe().filter(p => p.ort === 'balkon' && (zimmerKat(p.name) || {}).frost).forEach(p => d.frostAffected.push({ bed: 'Balkon', plant: p.name, sym: p.sym || '🪴' }));
    } catch (e) {}
    return d;
  };
  const altPush = window.gartenPushPlanBerechnen;
  if (typeof altPush === 'function') window.gartenPushPlanBerechnen = function () { return zimmerPushErgaenzen(altPush.apply(this, arguments)); };
})();
