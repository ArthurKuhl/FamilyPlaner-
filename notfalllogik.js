/* 🆘 Notfall-Logik – gemeinsam für Notfall-Modul und Startseite.
 * Schätzt aus der Vorratskammer, für wie viele Tage Wasser und Lebensmittel reichen
 * (BBK-Richtwerte), und wertet die Medikamente aus Gesundheit aus.
 * Alles nur grobe Schätzungen: Mengen werden aus „Menge“, Stückzahl und Einheit abgeleitet. */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.NotfallLogik = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // m: BBK-Menge pro Person für 10 Tage (kg bzw. l). Reihenfolge = Reihenfolge der Zuordnung.
  const KATEGORIEN = [
    { id: 'wasser', icon: '💧', text: 'Trinkwasser & Getränke', m: 20, einheit: 'l',
      such: ['wasser', 'sprudel', 'mineral', 'saft', 'schorle', 'nektar', 'limo', 'cola', 'eistee'] },
    { id: 'getreide', icon: '🍞', text: 'Getreide, Brot, Kartoffeln, Nudeln, Reis', m: 3.5, einheit: 'kg',
      such: ['nudel', 'reis', 'kartoffel', 'brot', 'zwieback', 'knäcke', 'hafer', 'müsli', 'muesli', 'couscous', 'mehl', 'spaghetti', 'penne', 'fusilli', 'bulgur', 'grieß', 'polenta', 'cracker', 'tortellini'] },
    { id: 'gemuese', icon: '🥫', text: 'Gemüse & Hülsenfrüchte', m: 4.0, einheit: 'kg',
      such: ['bohne', 'linse', 'erbse', 'kichererbse', 'mais', 'tomate', 'sauerkraut', 'gemüse', 'karotte', 'möhre', 'rote bete', 'gurke', 'paprika', 'pilz', 'champignon', 'eintopf', 'suppe'] },
    { id: 'obst', icon: '🍑', text: 'Obst & Nüsse', m: 2.5, einheit: 'kg',
      such: ['obst', 'apfelmus', 'pfirsich', 'ananas', 'mandarine', 'nuss', 'nüsse', 'mandel', 'rosine', 'trockenobst', 'birne', 'kirsch', 'aprikose', 'dattel', 'feige', 'cashew', 'erdnuss'] },
    { id: 'eiweiss', icon: '🐟', text: 'Fisch, Fleisch, Eier', m: 1.5, einheit: 'kg',
      such: ['thunfisch', 'fisch', 'wurst', 'fleisch', '=ei', 'eier', 'sardine', 'corned', 'hering', 'makrele', 'lachs', 'gulasch', 'ravioli', 'chili'] },
    { id: 'milch', icon: '🥛', text: 'Milch & Milchprodukte', m: 2.6, einheit: 'kg',
      such: ['milch', 'käse', 'kaese', 'parmesan', 'joghurt'] },
    { id: 'fett', icon: '🫒', text: 'Fette & Öle', m: 0.357, einheit: 'kg',
      such: ['öl', 'oel', 'butter', 'margarine', 'schmalz', 'ghee'] },
  ];
  // Zählt nicht als Grundnahrung (würde sonst z. B. „Milchschokolade“ als Milch werten)
  const NICHT_ZAEHLEN = ['schokolade', 'keks', 'zucker', 'honig', 'marmelade', 'salz', 'pfeffer', 'gewürz', 'brühe', 'kaffee', 'tee', 'kakao', 'essig', 'senf', 'ketchup', 'backpulver', 'hefe', 'vanille', 'gummibär', 'chips', 'futter', 'spülmittel', 'waschmittel', 'tablette'];
  const ESSEN = KATEGORIEN.filter(k => k.id !== 'wasser');
  const ESSEN_PRO_TAG = ESSEN.reduce((s, k) => s + k.m, 0) / 10; // ≈ 1,45 kg pro Person und Tag

  // Typisches Gewicht/Volumen einer Einheit, wenn nichts Genaueres bekannt ist
  const EINHEIT_STANDARD = [
    [/^(kiste|kisten|kasten|kästen|träger|tray)/, 9, 9],
    [/^(dose|dosen)/, 0.4, 0.33],
    [/^(glas|gläser)/, 0.35, 0.5],
    [/^(packung|packungen|pck|pack|pkg|karton)/, 0.5, 1],
    [/^(beutel|tüte|tüten|sack)/, 0.5, 0.5],
    [/^(flasche|flaschen|fl)/, 0.75, 1],
    [/^(tube|tuben)/, 0.1, 0.1],
    [/^(portion|portionen)/, 0.25, 0.25],
    [/^(rolle|rollen)/, 0, 0],
    [/^(liter|l)$/, 1, 1],
    [/^(kg|kilo)$/, 1, 1],
    [/^(stück|stk|st)$/, 0.3, 1],
  ];

  function norm(s) { return String(s || '').toLowerCase().trim(); }
  function zahl(s) { return parseFloat(String(s).replace(',', '.')); }
  function passt(name, woerter) {
    // „=ei“ = nur als ganzes Wort (sonst wäre „Reis“ ein Ei)
    return woerter.some(w => w.charAt(0) === '=' ? new RegExp('(^|[\\s-])' + w.slice(1) + '([\\s-]|$)').test(name) : name.includes(w));
  }

  // Kategorie eines Vorrats (oder null)
  function kategorieVon(item) {
    if (!item || !item.name || item.kategorie === 'apotheke') return null;
    const n = norm(item.name);
    if (passt(n, NICHT_ZAEHLEN) && !/wasser|saft/.test(n)) return null;
    const k = KATEGORIEN.find(k => passt(n, k.such));
    return k ? k.id : null;
  }

  // Menge (kg/l) aus einem Text wie „500 g“, „6 x 1,5 l“, „1 kg“
  function mengeAusText(t) {
    t = norm(t);
    let m = t.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|liter)\b/);
    if (m) return Number(m[1]) * einheitInKg(zahl(m[2]), m[3]);
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|liter)\b/);
    if (m) return einheitInKg(zahl(m[1]), m[2]);
    return null;
  }
  function einheitInKg(wert, e) { return e === 'g' || e === 'ml' ? wert / 1000 : e === 'cl' ? wert / 100 : wert; }
  // Stückzahl am Anfang eines Textes wie „3 Dosen“, „2 Packungen, 500 g“
  function stueckAusText(t) {
    if (/\d\s*[x×]\s*\d/.test(norm(t))) return null; // „6 x 1 l“ ist eine Packung
    const m = norm(t).match(/^(\d+)\s*(?:x\s*)?([a-zäöüß.]+)?/);
    if (!m) return null;
    if (m[2] && /^(kg|g|ml|cl|l|liter)\b/.test(m[2])) return null; // „500 g“ ist keine Stückzahl
    return { n: Number(m[1]), einheit: m[2] || '' };
  }
  function standardJeEinheit(einheit, istWasser) {
    const e = norm(einheit).replace(/\.$/, '');
    for (const [re, essen, wasser] of EINHEIT_STANDARD) if (re.test(e)) return istWasser ? wasser : essen;
    return istWasser ? 1 : 0.5;
  }

  // Geschätzte Menge eines Vorrats in kg bzw. l → { menge, geschaetzt, hinweis }
  function mengeVon(item, kat) {
    const istWasser = kat === 'wasser';
    const text = String(item.menge || '');
    const hatAnzahl = item.anzahl !== undefined && item.anzahl !== null && item.anzahl !== '' && !isNaN(Number(item.anzahl));
    const ausText = stueckAusText(text);
    const n = hatAnzahl ? Number(item.anzahl) : (ausText ? ausText.n : null);
    const einheit = item.einheit || (ausText && ausText.einheit) || '';
    const proStueck = mengeAusText(text);
    if (n !== null) {
      if (n <= 0) return { menge: 0, geschaetzt: false };
      if (proStueck !== null) return { menge: n * proStueck, geschaetzt: false };
      const proSt = /(^|[\s-])eier?([\s-]|$)|eier$/.test(norm(item.name)) && !/nudel|pulver/.test(norm(item.name)) ? 0.06 : standardJeEinheit(einheit, istWasser);
      return { menge: n * proSt, geschaetzt: true };
    }
    if (proStueck !== null) return { menge: proStueck, geschaetzt: false };
    // Nur grober Bestand bekannt
    if (item.bestand === 'leer') return { menge: 0, geschaetzt: true };
    const faktor = item.bestand === 'viel' ? 3 : item.bestand === 'mittel' ? 1.5 : 1;
    return { menge: faktor * standardJeEinheit(einheit, istWasser), geschaetzt: true };
  }

  /* Reichweite berechnen.
   * items: vorratskammer_items, personen: Anzahl, eigene: { katId: Menge } (eigene Angaben ersetzen die Schätzung)
   * → { personen, kategorien: [{ id, icon, text, einheit, menge, bedarfProTag, tage, eintraege: [...], eigen }],
   *     wasserTage, essenTage, kuehl: [...], geschaetzt } */
  function reichweite(items, personen, eigene) {
    personen = Math.max(1, Number(personen) || 1);
    eigene = eigene || {};
    const proKat = {}, kuehl = [];
    KATEGORIEN.forEach(k => { proKat[k.id] = []; });
    (Array.isArray(items) ? items : []).forEach(item => {
      const kat = kategorieVon(item);
      if (!kat) return;
      const mg = mengeVon(item, kat);
      if (!(mg.menge > 0)) return;
      const eintrag = { name: item.name, menge: mg.menge, geschaetzt: mg.geschaetzt };
      // Kühlschrank/Gefrierfach: bei Stromausfall nur kurz nutzbar → nicht mitzählen
      if (item.lagerort === 'kuehlschrank' || item.lagerort === 'gefrierfach') { kuehl.push(Object.assign({ kat, lagerort: item.lagerort }, eintrag)); return; }
      proKat[kat].push(eintrag);
    });
    let geschaetzt = false;
    const kategorien = KATEGORIEN.map(k => {
      const eintraege = proKat[k.id].sort((a, b) => b.menge - a.menge);
      const eigen = eigene[k.id] !== undefined && eigene[k.id] !== null && eigene[k.id] !== '' && !isNaN(Number(eigene[k.id]));
      const menge = eigen ? Math.max(0, Number(eigene[k.id])) : eintraege.reduce((s, e) => s + e.menge, 0);
      if (!eigen && eintraege.some(e => e.geschaetzt)) geschaetzt = true;
      const bedarfProTag = k.m / 10 * personen;
      return { id: k.id, icon: k.icon, text: k.text, einheit: k.einheit, menge, bedarfProTag, tage: menge / bedarfProTag, eintraege, eigen };
    });
    const wasser = kategorien[0];
    const essenMenge = kategorien.slice(1).reduce((s, k) => s + k.menge, 0);
    return {
      personen, kategorien, kuehl, geschaetzt,
      wasserTage: Math.floor(wasser.tage + 1e-9),
      essenTage: Math.floor(essenMenge / (ESSEN_PRO_TAG * personen) + 1e-9),
      essenMenge,
    };
  }

  function tageText(t) { return t <= 0 ? 'keinen Tag' : t === 1 ? '1 Tag' : (t > 60 ? 'über 60' : t) + ' Tage'; }
  function mengeText(x, einheit) {
    if (einheit === 'l') return (x < 10 ? Math.round(x * 10) / 10 : Math.round(x)).toLocaleString('de-DE') + ' l';
    return x < 1 ? Math.round(x * 1000).toLocaleString('de-DE') + ' g' : (Math.round(x * 10) / 10).toLocaleString('de-DE') + ' kg';
  }

  // Medikamente aus Gesundheit: [{ name, person, hinweis, tage (oder null) }]
  function medikamente(liste, heuteIso) {
    const h = heuteIso || (function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    const tagNr = iso => { const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
    return (Array.isArray(liste) ? liste : []).filter(m => m && m.name).map(m => {
      let tage = null;
      if (m.vorrat > 0 && m.proTag > 0) {
        const vergangen = Math.max(0, tagNr(h) - tagNr(m.vorratAb || h));
        tage = Math.max(0, Math.floor((m.vorrat - vergangen * m.proTag) / m.proTag));
      }
      return { id: m.id, name: m.name, person: m.person || '', hinweis: m.hinweis || '', tage };
    });
  }

  return { KATEGORIEN, ESSEN_PRO_TAG, kategorieVon, mengeVon, mengeAusText, reichweite, tageText, mengeText, medikamente };
});
