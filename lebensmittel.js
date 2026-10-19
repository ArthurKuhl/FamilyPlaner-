// ============================================================================
// 🥫 LEBENSMITTEL – gemeinsames Wissen für Einkauf, Vorratskammer, Kochen und die Shell
// ----------------------------------------------------------------------------
//  • Allergene (die 14 kennzeichnungspflichtigen der EU) + Allergien je Person
//    (planer_personenListe[].allergien = ['milch', 'schalenfruechte', …])
//  • Produktgedächtnis aus gescannten Strichcodes (planer_produkte, synchronisiert
//    über das Einkauf-Zusatzdokument „einkauf_produkte“)
//  • Open-Food-Facts-Kategorien → Einkaufs-Kategorie / Lagerort
//  • Produktkarte (Foto, Nutri-Score, Allergene, Zutaten, Nährwerte) + Scan-Dialog
//  • Rezept-Analyse fürs Kochen: Allergene aus den Zutatennamen, geschätzte Nährwerte
// Alles läuft im Browser, ohne Server.
// ============================================================================
window.Lebensmittel = (function () {
  'use strict';
  const KEY_PRODUKTE = 'planer_produkte';
  const KEY_PERSONEN = 'planer_personenListe';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/ß/g, 'ss').replace(/[„“"'()]/g, ' ').replace(/\s+/g, ' ').trim();
  const woerter = (s) => norm(s).split(/[^a-zäöü0-9]+/).filter(Boolean);
  function lies(k, f) { try { const r = localStorage.getItem(k); return r === null ? f : JSON.parse(r); } catch (e) { return f; } }

  // ---------------------------------------------------------------- ALLERGENE
  // wort: Teilwort-Treffer (ab 4 Buchstaben), exakt: nur ganzes Wort, ausser: wird vorher entfernt
  const ALLERGENE = [
    { id: 'gluten', label: 'Gluten', icon: '🌾', off: ['en:gluten'],
      wort: ['mehl', 'weizen', 'dinkel', 'roggen', 'gerste', 'hafer', 'griess', 'nudel', 'spaghetti', 'pasta', 'penne', 'fusilli', 'tagliatelle', 'lasagne', 'gnocchi', 'spätzle', 'maultasche', 'tortellini', 'ravioli', 'brot', 'brötchen', 'toast', 'paniermehl', 'semmelbrösel', 'couscous', 'bulgur', 'blätterteig', 'teig', 'keks', 'zwieback', 'crouton', 'tortilla', 'wrap', 'seitan', 'bier', 'malz', 'baguette', 'croissant', 'brezel', 'knödel', 'müsli', 'cornflakes'],
      ausser: ['glutenfrei', 'maismehl', 'reismehl', 'kartoffelmehl', 'mandelmehl', 'kokosmehl', 'buchweizenmehl', 'reisnudel', 'glasnudel', 'maistortilla', 'kartoffelknödel'] },
    { id: 'krebstiere', label: 'Krebstiere', icon: '🦐', off: ['en:crustaceans'], wort: ['garnele', 'shrimp', 'krabbe', 'hummer', 'languste', 'scampi', 'krebs', 'gambas'] },
    { id: 'eier', label: 'Ei', icon: '🥚', off: ['en:eggs'], exakt: ['ei', 'eier'], wort: ['eigelb', 'eiweiss', 'eiklar', 'eiern', 'rühreier', 'mayonnaise', 'mayo', 'eiernudel', 'eierlikör', 'baiser'], ausser: ['eiweisspulver vegan'] },
    { id: 'fisch', label: 'Fisch', icon: '🐟', off: ['en:fish'], wort: ['fisch', 'lachs', 'thunfisch', 'forelle', 'kabeljau', 'sardelle', 'sardine', 'hering', 'makrele', 'seelachs', 'dorsch', 'zander', 'scholle', 'anchovi', 'pangasius', 'rotbarsch', 'tilapia', 'worcester'] },
    { id: 'erdnuesse', label: 'Erdnüsse', icon: '🥜', off: ['en:peanuts'], wort: ['erdnuss', 'erdnüss', 'peanut'] },
    { id: 'soja', label: 'Soja', icon: '🫘', off: ['en:soybeans'], wort: ['soja', 'tofu', 'tempeh', 'edamame', 'miso'] },
    { id: 'milch', label: 'Milch / Laktose', icon: '🥛', off: ['en:milk'],
      wort: ['milch', 'butter', 'sahne', 'käse', 'joghurt', 'jogurt', 'quark', 'schmand', 'crème', 'creme fraiche', 'frischkäse', 'mozzarella', 'parmesan', 'feta', 'ricotta', 'mascarpone', 'gouda', 'emmentaler', 'cheddar', 'kefir', 'molke', 'ghee', 'béchamel', 'bechamel', 'rahm', 'skyr', 'burrata', 'halloumi', 'pecorino', 'grana padano', 'bergkäse', 'camembert', 'brie', 'schlagsahne', 'kondensmilch', 'milchschokolade'],
      ausser: ['kokosmilch', 'hafermilch', 'mandelmilch', 'sojamilch', 'reismilch', 'erdnussbutter', 'kakaobutter', 'laktosefrei', 'pflanzenmilch', 'veganer käse', 'veganer frischkäse', 'kokosnusscreme', 'hafersahne', 'sojasahne', 'sojajoghurt', 'kokosjoghurt'] },
    { id: 'schalenfruechte', label: 'Nüsse', icon: '🌰', off: ['en:nuts'],
      wort: ['mandel', 'haselnuss', 'haselnüss', 'walnuss', 'walnüss', 'cashew', 'pistazie', 'pekannuss', 'paranuss', 'macadamia', 'nüsse', 'nuss', 'marzipan', 'nougat', 'nutella', 'krokant', 'pesto'],
      ausser: ['erdnuss', 'erdnüss', 'muskatnuss', 'kokosnuss', 'nussbutter erdnuss'] },
    { id: 'sellerie', label: 'Sellerie', icon: '🥬', off: ['en:celery'], wort: ['sellerie', 'suppengemüse', 'suppengrün', 'gemüsebrühe', 'gemüsefond'] },
    { id: 'senf', label: 'Senf', icon: '🟡', off: ['en:mustard'], wort: ['senf', 'dijon'] },
    { id: 'sesam', label: 'Sesam', icon: '⚪', off: ['en:sesame-seeds'], wort: ['sesam', 'tahin', 'hummus'] },
    { id: 'sulfite', label: 'Sulfite', icon: '🍷', off: ['en:sulphur-dioxide-and-sulphites'], wort: ['wein', 'sekt', 'balsamico', 'rosinen', 'trockenobst', 'getrocknete aprikose', 'portwein', 'sherry'], ausser: ['schwein', 'weintraube', 'weinbeere', 'weinsäure', 'weinstein'] },
    { id: 'lupinen', label: 'Lupinen', icon: '🌼', off: ['en:lupin'], wort: ['lupine'] },
    { id: 'weichtiere', label: 'Weichtiere', icon: '🦑', off: ['en:molluscs'], wort: ['muschel', 'tintenfisch', 'calamar', 'oktopus', 'krake', 'schnecke', 'auster', 'sepia'] },
  ];
  const ALLERGEN_INFO = Object.fromEntries(ALLERGENE.map(a => [a.id, a]));
  function allergeneAusOffTags(tags) { return ALLERGENE.filter(a => (tags || []).some(t => a.off.includes(t))).map(a => a.id); }

  // Welche Allergene stecken (vermutlich) in einem Zutatennamen?
  function allergeneInText(text) {
    const treffer = [];
    ALLERGENE.forEach(a => {
      let t = ' ' + norm(text) + ' ';
      (a.ausser || []).forEach(x => { t = t.split(norm(x)).join(' '); });
      const w = woerter(t);
      if ((a.exakt || []).some(x => w.includes(x)) || (a.wort || []).some(x => t.includes(norm(x)))) treffer.push(a.id);
    });
    return treffer;
  }

  // ---------------------------------------------------------------- PERSONEN
  function personen() { const l = lies(KEY_PERSONEN, []); return Array.isArray(l) ? l : []; }
  // → [{ person, enthalten: [ids], spuren: [ids] }] für alle, die betroffen sind
  function betroffene(enthalten, spuren) {
    return personen().map(p => {
      const a = Array.isArray(p.allergien) ? p.allergien : [];
      return { person: p, enthalten: a.filter(x => (enthalten || []).includes(x)), spuren: a.filter(x => (spuren || []).includes(x) && !(enthalten || []).includes(x)) };
    }).filter(b => b.enthalten.length || b.spuren.length);
  }
  const allergenText = (ids) => ids.map(id => (ALLERGEN_INFO[id] || { label: id }).label).join(', ');
  function warnungenHtml(enthalten, spuren, kompakt) {
    const b = betroffene(enthalten, spuren);
    if (!b.length) return '';
    return b.map(x => '<div style="margin-top:6px;padding:7px 10px;border-radius:10px;font-size:' + (kompakt ? '0.76rem' : '0.82rem') + ';line-height:1.35;' +
      (x.enthalten.length ? 'background:rgba(192,57,43,0.13);color:#a33224;font-weight:700;' : 'background:rgba(214,168,74,0.18);color:#8a6418;') + '">' +
      '⚠ ' + esc(x.person.label) + ': ' + (x.enthalten.length ? 'enthält ' + esc(allergenText(x.enthalten)) : '') +
      (x.spuren.length ? (x.enthalten.length ? ' · ' : '') + 'kann Spuren von ' + esc(allergenText(x.spuren)) + ' enthalten' : '') + '</div>').join('');
  }

  // ---------------------------------------------------------------- KATEGORIEN
  // Open-Food-Facts-Kategorien → Einkaufs-Kategorie (Reihenfolge: spezifisch zuerst)
  const OFF_KATEGORIE = [
    ['tiefkuehl', ['en:frozen-foods', 'en:frozen-desserts', 'en:ice-creams']],
    ['drogerie', ['en:non-food-products', 'en:cosmetics', 'en:hygiene', 'en:cleaning-products']],
    ['milchprodukte', ['en:dairies', 'en:milks', 'en:cheeses', 'en:yogurts', 'en:butters', 'en:creams', 'en:eggs', 'en:fermented-milk-products']],
    ['fleisch_fisch', ['en:meats', 'en:fishes', 'en:seafood', 'en:poultries', 'en:sausages', 'en:hams', 'en:prepared-meats']],
    ['brot', ['en:breads', 'en:viennoiseries', 'en:cakes', 'en:pastries', 'en:rusks', 'en:crispbreads']],
    ['suesses', ['en:sweet-spreads', 'en:hazelnut-spreads', 'en:sweet-snacks', 'en:confectioneries', 'en:chocolates', 'en:candies', 'en:chewing-gum', 'en:biscuits-and-cakes', 'en:biscuits', 'en:salty-snacks', 'en:chips-and-fries', 'en:appetizers', 'en:snacks']],
    ['getraenke', ['en:beverages', 'en:waters', 'en:juices', 'en:sodas', 'en:alcoholic-beverages', 'en:coffees', 'en:teas']],
    ['obst_gemuese', ['en:fresh-fruits', 'en:fresh-vegetables', 'en:fruits', 'en:vegetables', 'en:fresh-herbs']],
    ['trockenwaren', ['en:cereals-and-potatoes', 'en:pastas', 'en:rices', 'en:flours', 'en:sugars', 'en:canned-foods', 'en:condiments', 'en:sauces', 'en:spreads', 'en:breakfast-cereals', 'en:legumes', 'en:oils', 'en:spices', 'en:soups', 'en:groceries']],
  ];
  function kategorieAusOff(tags, quelle) {
    if (quelle === 'beauty' || quelle === 'products') return 'drogerie';
    const t = tags || [];
    for (const [kat, liste] of OFF_KATEGORIE) if (liste.some(x => t.includes(x))) return kat;
    return '';
  }
  const KATEGORIE_LAGERORT = { tiefkuehl: 'gefrierfach', milchprodukte: 'kuehlschrank', fleisch_fisch: 'kuehlschrank', obst_gemuese: 'kuehlschrank', trockenwaren: 'vorratsschrank', suesses: 'vorratsschrank', brot: 'vorratsschrank', getraenke: 'keller' };
  const KATEGORIE_NAME = { obst_gemuese: 'Obst & Gemüse', brot: 'Backwaren', milchprodukte: 'Milchprodukte', fleisch_fisch: 'Fleisch & Fisch', tiefkuehl: 'Tiefkühl', trockenwaren: 'Trockenwaren', suesses: 'Süßes & Snacks', getraenke: 'Getränke', drogerie: 'Drogerie' };

  // ---------------------------------------------------------------- PRODUKTGEDÄCHTNIS
  function produkte() { const o = lies(KEY_PRODUKTE, {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function produktMerken(p) {
    if (!p || !p.code || !p.gefunden) return;
    const alle = produkte();
    const eintrag = Object.assign({}, p);
    delete eintrag.fehler; delete eintrag.gefunden; delete eintrag.ausGedaechtnis;
    eintrag.datum = new Date().toISOString().slice(0, 10);
    alle[p.code] = eintrag;
    // Größe begrenzen: höchstens 400 Produkte, die ältesten fliegen raus
    const codes = Object.keys(alle);
    if (codes.length > 400) codes.sort((a, b) => String(alle[a].datum).localeCompare(String(alle[b].datum))).slice(0, codes.length - 400).forEach(c => delete alle[c]);
    try { localStorage.setItem(KEY_PRODUKTE, JSON.stringify(alle)); } catch (e) {}
    if (window._produktSync) window._produktSync.melde();
  }
  function produkt(code) { return code ? produkte()[code] || null : null; }
  function produktZuName(name) {
    const n = norm(name); if (!n) return null;
    const alle = produkte();
    for (const c in alle) if (norm(alle[c].name) === n) return alle[c];
    return null;
  }
  // Startet die Synchronisierung des Produktgedächtnisses (in Einkauf, Vorratskammer, Kochen aufrufen)
  function syncStarten() {
    if (window._produktSync || !window.PlanerSync) return;
    try { window._produktSync = window.PlanerSync.starteSync({ modul: 'einkauf_produkte', keys: [KEY_PRODUKTE] }); } catch (e) {}
  }

  // ---------------------------------------------------------------- PRODUKTKARTE
  const NUTRI_FARBEN = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };
  function nutriScoreHtml(g, klein) {
    g = String(g || '').toLowerCase();
    if (!NUTRI_FARBEN[g]) return '';
    const gr = klein ? 15 : 22;
    return '<span title="Nutri-Score ' + g.toUpperCase() + '" style="display:inline-flex;vertical-align:middle;border-radius:6px;overflow:hidden;font:800 ' + (klein ? '0.6rem' : '0.78rem') + '/1 system-ui,sans-serif;">' +
      ['a', 'b', 'c', 'd', 'e'].map(x => '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + (x === g ? gr + 6 : gr) + 'px;height:' + (x === g ? gr + 6 : gr) + 'px;' +
        (x === g ? 'margin:-3px 0;border-radius:6px;' : 'opacity:0.45;') + 'background:' + NUTRI_FARBEN[x] + ';color:#fff;">' + x.toUpperCase() + '</span>').join('') + '</span>';
  }
  const NOVA_TEXT = { 1: 'unverarbeitet', 2: 'Küchenzutat', 3: 'verarbeitet', 4: 'stark verarbeitet' };
  const NOVA_FARBE = { 1: '#038141', 2: '#85bb2f', 3: '#ee8100', 4: '#e63e11' };
  function chip(text, farbe, titel) {
    return '<span' + (titel ? ' title="' + esc(titel) + '"' : '') + ' style="display:inline-block;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:999px;margin:2px 4px 2px 0;background:' + (farbe || 'rgba(127,127,127,0.15)') + ';' + (farbe ? 'color:#fff;' : '') + '">' + text + '</span>';
  }
  function produktKarteHtml(p) {
    if (!p) return '';
    const n = p.naehr || {};
    const zahl = (v, e) => (v === undefined || v === null || v === '') ? '–' : (Math.round(Number(v) * 10) / 10).toLocaleString('de-DE') + (e || ' g');
    const zeilen = [['Energie', n.kcal != null ? Math.round(n.kcal) + ' kcal' : '–'], ['Fett', zahl(n.fett)], ['davon gesättigt', zahl(n.gfett)], ['Kohlenhydrate', zahl(n.kh)], ['davon Zucker', zahl(n.zucker)], ['Eiweiß', zahl(n.eiweiss)], ['Salz', zahl(n.salz)]];
    const hatNaehr = zeilen.some(z => z[1] !== '–');
    return '<div style="display:flex;gap:12px;align-items:flex-start;">' +
        (p.bild ? '<img src="' + esc(p.bild) + '" alt="" style="width:72px;height:72px;object-fit:contain;border-radius:10px;background:#fff;flex-shrink:0;" onerror="this.remove()">' : '') +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-weight:800;font-size:0.95rem;line-height:1.25;">' + esc(p.name || 'Produkt') + '</div>' +
          '<div style="font-size:0.74rem;opacity:0.75;margin-top:2px;">' + esc([p.marke, p.menge].filter(Boolean).join(' · ')) + (p.kategorie && KATEGORIE_NAME[p.kategorie] ? ' · ' + esc(KATEGORIE_NAME[p.kategorie]) : '') + '</div>' +
          '<div style="margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">' + nutriScoreHtml(p.nutriscore) +
            (NOVA_TEXT[p.nova] ? chip('NOVA ' + p.nova, NOVA_FARBE[p.nova], 'Verarbeitungsgrad: ' + NOVA_TEXT[p.nova]) : '') +
            (/^[a-e]$/.test(p.eco || '') ? chip('🌍 ' + p.eco.toUpperCase(), NUTRI_FARBEN[p.eco], 'Umwelt-Score') : '') + '</div>' +
        '</div></div>' +
      (p.labels && p.labels.length ? '<div style="margin-top:6px;">' + p.labels.map(l => chip(esc(l), '#4f6f45')).join('') + '</div>' : '') +
      warnungenHtml(p.allergene, p.spuren) +
      ((p.allergene || []).length || (p.spuren || []).length ? '<div style="font-size:0.76rem;margin-top:8px;line-height:1.45;">' +
        ((p.allergene || []).length ? '<b>Allergene:</b> ' + p.allergene.map(a => (ALLERGEN_INFO[a] || {}).icon + ' ' + esc((ALLERGEN_INFO[a] || { label: a }).label)).join(', ') : '') +
        ((p.spuren || []).length ? '<br><b>Spuren:</b> ' + esc(allergenText(p.spuren)) : '') + '</div>' : '') +
      (p.zutaten ? '<details style="margin-top:8px;font-size:0.76rem;"><summary style="cursor:pointer;font-weight:700;">Zutaten</summary><div style="margin-top:4px;line-height:1.45;opacity:0.85;">' + esc(p.zutaten) + '</div></details>' : '') +
      (hatNaehr ? '<details style="margin-top:6px;font-size:0.76rem;"><summary style="cursor:pointer;font-weight:700;">Nährwerte pro 100 ' + (p.fluessig ? 'ml' : 'g') + '</summary><table style="margin-top:4px;width:100%;border-collapse:collapse;">' +
        zeilen.map(z => '<tr><td style="padding:2px 0;' + (/davon/.test(z[0]) ? 'padding-left:12px;opacity:0.75;' : '') + '">' + z[0] + '</td><td style="text-align:right;">' + z[1] + '</td></tr>').join('') + '</table></details>' : '') +
      '<div style="font-size:0.66rem;opacity:0.6;margin-top:8px;">Daten: Open Food Facts (von Freiwilligen gepflegt – im Zweifel die Packung prüfen)</div>';
  }

  // Dialog nach dem Scannen: Produktkarte + Knöpfe. Gibt true (übernehmen) / false zurück.
  function produktDialog(p, { knopf = '＋ Übernehmen', abbrechen = 'Abbrechen' } = {}) {
    return new Promise(fertig => {
      const dunkel = document.documentElement.getAttribute('data-dark') === '1';
      const bg = document.createElement('div');
      bg.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;justify-content:center;padding:12px;';
      bg.innerHTML = '<div role="dialog" style="width:min(460px,100%);max-height:88vh;overflow-y:auto;border-radius:20px;padding:16px;font-family:Inter,system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.35);' +
        (dunkel ? 'background:#26231d;color:#efe7d6;' : 'background:#fffaf0;color:#3a2e20;') + '">' + produktKarteHtml(p) +
        '<div style="display:flex;gap:8px;margin-top:14px;">' +
        '<button type="button" data-a="0" style="flex:1;padding:11px;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;font:700 0.88rem Inter,system-ui,sans-serif;cursor:pointer;">' + esc(abbrechen) + '</button>' +
        '<button type="button" data-a="1" style="flex:1.4;padding:11px;border-radius:12px;border:none;background:#c46b41;color:#fff;font:700 0.88rem Inter,system-ui,sans-serif;cursor:pointer;">' + esc(knopf) + '</button></div></div>';
      const zu = (w) => { bg.remove(); fertig(w); };
      bg.addEventListener('click', e => { if (e.target === bg) zu(false); const b = e.target.closest('button[data-a]'); if (b) zu(b.dataset.a === '1'); });
      document.body.appendChild(bg);
    });
  }

  // ---------------------------------------------------------------- NÄHRWERTE FÜRS KOCHEN
  // Pro 100 g (bzw. 100 ml): [kcal, Eiweiß, Kohlenhydrate, Fett], st = Gramm pro Stück, d = Dichte (g/ml), el = Gramm pro EL
  // Grobe Durchschnittswerte – reicht für eine Schätzung pro Portion.
  const N = [
    [['mehl', 'weizenmehl', 'dinkelmehl'], 350, 10, 72, 1.2, { el: 10 }], [['vollkornmehl'], 330, 12, 60, 2, { el: 10 }], [['speisestärke', 'stärke'], 350, 0.4, 86, 0.1, { el: 10 }],
    [['zucker', 'puderzucker', 'rohrzucker'], 400, 0, 100, 0, { el: 15 }], [['vanillezucker'], 400, 0, 100, 0, { pck: 8 }], [['honig'], 305, 0.4, 80, 0, { el: 20 }], [['ahornsirup', 'sirup'], 260, 0, 67, 0, { el: 20 }],
    [['butter'], 740, 0.7, 0.6, 83, { el: 15 }], [['margarine'], 720, 0, 0.4, 80, { el: 15 }], [['öl', 'olivenöl', 'rapsöl', 'sonnenblumenöl', 'sesamöl', 'kokosöl'], 884, 0, 0, 100, { d: 0.92, el: 13 }],
    [['milch', 'vollmilch'], 64, 3.4, 4.8, 3.5, { d: 1.03 }], [['hafermilch', 'sojamilch', 'mandelmilch'], 45, 1, 6, 1.5], [['sahne', 'schlagsahne', 'kochsahne'], 300, 2.4, 3.2, 30, { becher: 200 }],
    [['saure sahne'], 160, 3, 4, 14, { becher: 200 }], [['schmand'], 240, 2.5, 3.5, 24, { becher: 200 }], [['crème fraîche', 'creme fraiche', 'crème fraiche'], 290, 2.4, 2.6, 30, { becher: 150 }],
    [['joghurt', 'naturjoghurt'], 70, 3.5, 4.5, 3.5, { becher: 150 }], [['griechischer joghurt', 'skyr'], 110, 8, 4, 7, { becher: 150 }], [['quark', 'magerquark'], 70, 12, 4, 0.3, { becher: 250 }],
    [['frischkäse'], 250, 6, 3, 24, { becher: 200 }], [['mozzarella'], 250, 18, 1, 19, { st: 125 }], [['parmesan', 'pecorino', 'grana padano'], 400, 35, 0, 29, { el: 6 }], [['feta', 'schafskäse'], 260, 17, 0.5, 21, { st: 200 }],
    [['käse', 'gouda', 'emmentaler', 'bergkäse', 'cheddar', 'reibekäse'], 360, 25, 0, 28], [['ricotta'], 170, 11, 3, 13, { becher: 250 }], [['mascarpone'], 430, 4.6, 4, 44, { becher: 250 }], [['kokosmilch'], 200, 2, 3, 20, { dose: 400 }],
    [['ei', 'eier'], 155, 13, 1, 11, { st: 60 }], [['eigelb'], 350, 16, 0.3, 31, { st: 18 }], [['eiweiss', 'eiklar'], 50, 11, 0.7, 0.2, { st: 33 }],
    [['nudeln', 'spaghetti', 'pasta', 'penne', 'fusilli', 'tagliatelle', 'makkaroni', 'lasagneplatten', 'bandnudeln', 'spätzle'], 355, 12, 71, 1.5], [['gnocchi'], 150, 4, 32, 0.5], [['tortellini', 'ravioli', 'maultaschen'], 250, 10, 40, 6],
    [['reis', 'basmati', 'jasminreis', 'risottoreis', 'milchreis', 'langkornreis'], 350, 7, 78, 0.6], [['couscous', 'bulgur'], 350, 12, 70, 1.5], [['quinoa'], 370, 14, 64, 6], [['haferflocken'], 370, 13, 59, 7, { el: 10 }],
    [['linsen'], 330, 24, 50, 1.5], [['kichererbsen'], 140, 7, 18, 2.5, { dose: 240 }], [['bohnen', 'kidneybohnen', 'weisse bohnen'], 100, 7, 14, 0.5, { dose: 250 }], [['grüne bohnen', 'brechbohnen'], 30, 2, 5, 0.2],
    [['kartoffel', 'kartoffeln'], 75, 2, 16, 0.1, { st: 150 }], [['süsskartoffel'], 85, 1.6, 20, 0.1, { st: 250 }], [['karotte', 'karotten', 'möhre', 'möhren'], 36, 0.9, 7, 0.2, { st: 80 }],
    [['zwiebel', 'zwiebeln', 'schalotte'], 40, 1.2, 8, 0.2, { st: 100 }], [['frühlingszwiebel', 'lauchzwiebel'], 30, 1.8, 5, 0.4, { st: 15 }], [['knoblauch', 'knoblauchzehe'], 140, 6, 28, 0.1, { st: 4, zehe: 4 }],
    [['lauch', 'porree'], 30, 2, 4, 0.3, { st: 250 }], [['sellerie', 'staudensellerie'], 20, 1, 3, 0.2, { st: 40 }], [['tomate', 'tomaten'], 18, 0.9, 3, 0.2, { st: 100 }], [['cherrytomate', 'kirschtomate', 'cocktailtomate'], 20, 1, 3, 0.3, { st: 15 }],
    [['passierte tomaten', 'gehackte tomaten', 'tomatenpüree', 'stückige tomaten', 'dosentomaten'], 25, 1.2, 4, 0.2, { dose: 400 }], [['tomatenmark'], 80, 4.5, 13, 0.5, { el: 15 }],
    [['paprika', 'paprikaschote'], 30, 1, 5, 0.3, { st: 150 }], [['zucchini'], 18, 1.5, 2, 0.3, { st: 250 }], [['aubergine'], 20, 1.2, 3, 0.2, { st: 300 }], [['gurke', 'salatgurke'], 15, 0.6, 2, 0.2, { st: 400 }],
    [['brokkoli'], 35, 3.5, 3, 0.4, { st: 400 }], [['blumenkohl'], 25, 2, 2.5, 0.3, { st: 600 }], [['spinat', 'blattspinat'], 23, 2.9, 1, 0.4], [['champignons', 'pilze', 'champignon', 'steinpilze'], 22, 3, 0.6, 0.3],
    [['kürbis', 'hokkaido', 'butternut'], 30, 1, 6, 0.1, { st: 1000 }], [['erbsen'], 80, 5.5, 12, 0.4], [['mais'], 85, 3, 15, 1.2, { dose: 285 }], [['salat', 'rucola', 'feldsalat', 'eisbergsalat'], 15, 1.3, 1, 0.2, { st: 300 }],
    [['kohl', 'weisskohl', 'rotkohl', 'spitzkohl', 'wirsing', 'kohlrabi'], 28, 1.5, 4, 0.2, { st: 800 }], [['rote bete'], 45, 1.5, 9, 0.1, { st: 150 }], [['avocado'], 210, 2, 1, 22, { st: 200 }],
    [['apfel', 'äpfel'], 54, 0.3, 12, 0.4, { st: 150 }], [['banane'], 93, 1.2, 20, 0.2, { st: 120 }], [['zitrone'], 35, 0.7, 3, 0.6, { st: 100 }], [['limette'], 30, 0.5, 2, 0.2, { st: 60 }],
    [['zitronensaft', 'limettensaft'], 25, 0.4, 2.5, 0.1, { el: 15 }], [['orange'], 47, 1, 9, 0.2, { st: 200 }], [['erdbeeren', 'himbeeren', 'beeren', 'heidelbeeren', 'blaubeeren'], 40, 0.8, 7, 0.4],
    [['ingwer'], 80, 1.8, 16, 0.8, { st: 20 }], [['rosinen'], 300, 2.5, 68, 0.6, { el: 12 }],
    [['hackfleisch', 'gehacktes', 'hack'], 260, 19, 0, 20], [['rinderhack'], 220, 20, 0, 15], [['hähnchenbrust', 'hähnchenbrustfilet', 'hühnerbrust', 'putenbrust', 'putenschnitzel'], 110, 23, 0, 1.5, { st: 150 }],
    [['hähnchen', 'hähnchenschenkel', 'huhn'], 170, 20, 0, 10], [['schweinefleisch', 'schnitzel', 'schweinefilet', 'kotelett', 'schweinelachs'], 140, 22, 0, 5, { st: 150 }], [['rindfleisch', 'rindergulasch', 'gulasch', 'steak', 'rinderfilet'], 150, 22, 0, 7, { st: 200 }],
    [['speck', 'bacon', 'speckwürfel', 'pancetta'], 450, 13, 0, 45], [['schinken', 'kochschinken'], 120, 20, 1, 4, { scheibe: 20 }], [['salami', 'chorizo'], 380, 22, 1, 32, { scheibe: 8 }], [['würstchen', 'wiener', 'bratwurst', 'wurst'], 260, 13, 1, 23, { st: 70 }],
    [['lachs', 'lachsfilet'], 200, 20, 0, 13, { st: 125 }], [['thunfisch'], 110, 25, 0, 1, { dose: 150 }], [['fisch', 'kabeljau', 'seelachs', 'fischfilet', 'pangasius', 'rotbarsch'], 80, 18, 0, 0.7, { st: 125 }], [['garnelen', 'shrimps', 'gambas'], 90, 19, 0, 1.5],
    [['tofu'], 120, 13, 1, 7], [['brot', 'mischbrot', 'vollkornbrot'], 240, 8, 45, 2, { scheibe: 40 }], [['brötchen', 'semmel'], 270, 9, 52, 2, { st: 60 }], [['toast', 'toastbrot'], 260, 8, 48, 4, { scheibe: 25 }], [['baguette'], 260, 9, 52, 1.5, { st: 250 }],
    [['paniermehl', 'semmelbrösel'], 360, 12, 72, 2, { el: 8 }], [['blätterteig'], 400, 6, 35, 26, { pck: 275 }], [['tortilla', 'wrap', 'tortillas', 'wraps'], 300, 8, 50, 7, { st: 60 }], [['pizzateig'], 260, 7, 48, 4, { pck: 400 }],
    [['hefe', 'trockenhefe'], 100, 12, 10, 1, { pck: 7, wuerfel: 42 }], [['schokolade', 'kuvertüre', 'schokotropfen'], 540, 6, 55, 32, { st: 100 }], [['kakao', 'kakaopulver'], 350, 20, 12, 22, { el: 6 }],
    [['nüsse', 'mandeln', 'haselnüsse', 'cashews', 'walnüsse', 'pinienkerne', 'nusskerne'], 620, 20, 8, 55, { el: 10 }], [['erdnüsse'], 590, 25, 10, 49, { el: 10 }], [['erdnussbutter'], 600, 25, 15, 50, { el: 16 }],
    [['sesam', 'sonnenblumenkerne', 'kürbiskerne', 'leinsamen', 'chiasamen'], 570, 22, 10, 48, { el: 10 }], [['marmelade', 'konfitüre'], 250, 0.4, 60, 0.1, { el: 20 }],
    [['sojasauce', 'sojasosse', 'sojasoße'], 60, 8, 6, 0, { el: 16 }], [['senf'], 90, 6, 5, 5, { el: 15 }], [['ketchup'], 110, 1, 25, 0.1, { el: 17 }], [['mayonnaise', 'mayo'], 700, 1, 3, 75, { el: 15 }], [['pesto'], 450, 5, 6, 45, { el: 15, glas: 190 }],
    [['essig', 'balsamico', 'weissweinessig', 'apfelessig'], 20, 0, 1, 0, { el: 15 }], [['wein', 'weisswein', 'rotwein'], 75, 0, 2.6, 0], [['bier'], 43, 0.5, 3.6, 0], [['orangensaft', 'apfelsaft', 'saft'], 45, 0.5, 10, 0.1],
    [['brühe', 'gemüsebrühe', 'hühnerbrühe', 'rinderbrühe', 'fond'], 5, 0.3, 0.5, 0.2], [['wasser'], 0, 0, 0, 0], [['kokosraspeln'], 650, 6, 6, 62, { el: 6 }],
    // Gewürze & Kräuter: zählen als „erkannt“, liefern aber praktisch keine Kalorien
    [['salz', 'pfeffer', 'paprikapulver', 'curry', 'currypulver', 'zimt', 'muskat', 'muskatnuss', 'oregano', 'basilikum', 'petersilie', 'schnittlauch', 'dill', 'thymian', 'rosmarin', 'kräuter', 'chili', 'chiliflocken', 'kreuzkümmel', 'kümmel', 'lorbeer', 'lorbeerblatt', 'lorbeerblätter', 'vanille', 'vanilleschote', 'koriander', 'kurkuma', 'majoran', 'salbei', 'minze', 'ingwerpulver', 'knoblauchpulver', 'gewürz', 'backpulver', 'natron', 'gelatine', 'cayennepfeffer', 'nelken', 'sternanis', 'garam masala', 'italienische kräuter', 'kräuter der provence'], 0, 0, 0, 0, { gewuerz: true }],
  ];
  const N_INDEX = [];
  N.forEach(([namen, kcal, e, kh, f, extra]) => namen.forEach(n => N_INDEX.push({ n: norm(n), kurz: n.length <= 3, w: { kcal, e, kh, f }, x: extra || {} })));
  N_INDEX.sort((a, b) => b.n.length - a.n.length); // längster Treffer gewinnt („kokosmilch“ vor „milch“)
  function naehrEintrag(name) {
    const t = ' ' + norm(name) + ' ', w = woerter(name);
    return N_INDEX.find(x => x.kurz ? w.some(y => y === x.n || (x.n === 'öl' && y.endsWith('öl'))) : t.includes(x.n)) || null;
  }
  function mengeZahl(m) {
    let s = String(m || '').trim().replace(',', '.').replace(/^ca\.?\s*/i, '');
    if (!s) return null;
    const bruch = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
    s = s.replace(/(\d)\s*([½¼¾⅓⅔⅛])/g, (_, a, b) => String(Number(a) + bruch[b])).replace(/[½¼¾⅓⅔⅛]/g, b => String(bruch[b]));
    let r = /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(s); if (r) return (Number(r[1]) + Number(r[2])) / 2;
    r = /^(\d+)\s+(\d+)\/(\d+)/.exec(s); if (r) return Number(r[1]) + Number(r[2]) / Number(r[3]);
    r = /^(\d+)\/(\d+)/.exec(s); if (r) return Number(r[1]) / Number(r[2]);
    r = /^(\d+(?:\.\d+)?)/.exec(s); return r ? Number(r[1]) : null;
  }
  // Menge + Einheit → Gramm (null = unbekannt)
  function gramm(zutat, eintrag) {
    let einheit = norm(zutat.einheit).replace(/\.$/, '');
    let menge = mengeZahl(zutat.menge);
    if (menge === null && !einheit) return null;
    if (menge === null) menge = 1;
    const x = eintrag.x || {}, d = x.d || 1;
    const tab = {
      g: 1, gr: 1, gramm: 1, kg: 1000, mg: 0.001, ml: d, l: 1000 * d, liter: 1000 * d, cl: 10 * d, dl: 100 * d,
      el: x.el || 15, essl: x.el || 15, esslöffel: x.el || 15, tl: (x.el || 15) / 3, teel: (x.el || 15) / 3, teelöffel: (x.el || 15) / 3,
      prise: 0.5, prisen: 0.5, msp: 0.3, messerspitze: 0.3, tasse: 240 * d, tassen: 240 * d, cup: 240 * d, cups: 240 * d,
      becher: x.becher || 200, dose: x.dose || 400, dosen: x.dose || 400, glas: x.glas || 350, gläser: x.glas || 350,
      pck: x.pck || 250, päckchen: x.pck || 250, packung: x.pck || 250, pkt: x.pck || 250, pk: x.pck || 250, würfel: x.wuerfel || 20,
      bund: 50, zehe: x.zehe || 4, zehen: x.zehe || 4, scheibe: x.scheibe || 25, scheiben: x.scheibe || 25, handvoll: 30, schuss: 10, spritzer: 3,
      stück: x.st || 100, stk: x.st || 100, st: x.st || 100, kopf: x.st || 500, knolle: x.st || 100, stange: x.st || 40, stangen: x.st || 40, zweig: 2, zweige: 2, blatt: 1, blätter: 1,
      tropfen: 0.05, etwas: 5, n: 0, nb: 0,
    };
    if (!einheit) return x.st ? menge * x.st : (x.gewuerz ? 0 : null);
    if (Object.prototype.hasOwnProperty.call(tab, einheit)) return menge * tab[einheit];
    return null;
  }
  // Analyse eines Rezepts: Allergene (aus Zutatennamen) und geschätzte Nährwerte pro Portion
  function rezeptAnalyse(r) {
    const zutaten = (r && r.zutaten) || [];
    const allergene = new Set();
    const summe = { kcal: 0, e: 0, kh: 0, f: 0 };
    let erkannt = 0; const offen = [];
    zutaten.forEach(z => {
      const name = String(z.name || '').trim(); if (!name) return;
      // gescanntes Produkt mit gleichem Namen? → dessen echte Angaben verwenden
      const p = produktZuName(name);
      (p && p.allergene && p.allergene.length ? p.allergene : allergeneInText(name)).forEach(a => allergene.add(a));
      let eintrag = naehrEintrag(name);
      if (p && p.naehr && p.naehr.kcal != null) eintrag = { w: { kcal: p.naehr.kcal, e: p.naehr.eiweiss || 0, kh: p.naehr.kh || 0, f: p.naehr.fett || 0 }, x: Object.assign({}, eintrag ? eintrag.x : {}, p.mengeG ? { st: p.mengeG, pck: p.mengeG, dose: p.mengeG, becher: p.mengeG, glas: p.mengeG } : {}) };
      if (!eintrag) { offen.push(name); return; }
      if (eintrag.x && eintrag.x.gewuerz && !zutat_hatViel(z)) { erkannt++; return; }
      const g = gramm(z, eintrag);
      if (g === null) { offen.push(name); return; }
      erkannt++;
      ['kcal', 'e', 'kh', 'f'].forEach(k => { summe[k] += g / 100 * eintrag.w[k]; });
    });
    const portionen = Math.max(1, Number(r && r.portionenBasis) || 1);
    const pro = {}; Object.keys(summe).forEach(k => { pro[k] = summe[k] / portionen; });
    return { allergene: Array.from(allergene), proPortion: pro, erkannt, gesamt: zutaten.filter(z => (z.name || '').trim()).length, offen };
  }
  function zutat_hatViel(z) { return /^(g|kg|ml|l)$/i.test(String(z.einheit || '').trim()) && (mengeZahl(z.menge) || 0) >= 50; }

  return {
    ALLERGENE, ALLERGEN_INFO, allergeneInText, allergeneAusOffTags, allergenText, personen, betroffene, warnungenHtml,
    kategorieAusOff, KATEGORIE_LAGERORT, KATEGORIE_NAME, produkte, produkt, produktMerken, produktZuName, syncStarten,
    nutriScoreHtml, produktKarteHtml, produktDialog, rezeptAnalyse, _gramm: gramm, _naehrEintrag: naehrEintrag, _mengeZahl: mengeZahl,
  };
})();
