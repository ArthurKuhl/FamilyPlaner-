// ═══════════════════════════════════════════════════════════════
// 🩺 Pflanzen-Doktor – Schadbild-Hilfe
// Antippen, was man sieht → wahrscheinlichste Ursachen mit Erkennen,
// Sofort-Hilfe (bio zuerst) und Vorbeugen. Befund an der Pflanze merken,
// optional Erinnerung „in 7 Tagen nachsehen“ als Notiz-Pin auf der Karte.
// ═══════════════════════════════════════════════════════════════

const DOKTOR_ORTE = [
  { id: 'b', icon: '🍃', label: 'Blätter' },
  { id: 'f', icon: '🍎', label: 'Früchte' },
  { id: 's', icon: '🌿', label: 'Stängel & Triebe' },
  { id: 'w', icon: '🪱', label: 'Wurzel & Erde' },
  { id: 'g', icon: '🌱', label: 'Ganze Pflanze' },
];

const DOKTOR_ZEICHEN = [
  // Blätter
  { id: 'b_gelb', ort: 'b', label: 'gelb / blass' },
  { id: 'b_gelb_unten', ort: 'b', label: 'untere Blätter zuerst gelb' },
  { id: 'b_chlorose', ort: 'b', label: 'gelb, Adern bleiben grün' },
  { id: 'b_braunflecken', ort: 'b', label: 'braune / schwarze Flecken' },
  { id: 'b_wasserflecken', ort: 'b', label: 'dunkle, wässrige Flecken' },
  { id: 'b_weiss', ort: 'b', label: 'weißer, abwischbarer Belag' },
  { id: 'b_grau_unten', ort: 'b', label: 'grau-violetter Flaum unten' },
  { id: 'b_rost', ort: 'b', label: 'orange / braune Pusteln' },
  { id: 'b_mosaik', ort: 'b', label: 'hell-dunkel marmoriert' },
  { id: 'b_gr_loecher', ort: 'b', label: 'große, unregelmäßige Löcher' },
  { id: 'b_kl_loecher', ort: 'b', label: 'viele kleine Löcher (Sieb)' },
  { id: 'b_schrot', ort: 'b', label: 'Löcher mit rötlichem Rand' },
  { id: 'b_buchten', ort: 'b', label: 'Buchten am Blattrand' },
  { id: 'b_schleim', ort: 'b', label: 'Schleimspuren' },
  { id: 'b_kraeusel', ort: 'b', label: 'gekräuselt / eingerollt' },
  { id: 'b_blasen', ort: 'b', label: 'rote Blasen, verdickt' },
  { id: 'b_klebrig', ort: 'b', label: 'klebrig glänzend' },
  { id: 'b_russ', ort: 'b', label: 'schwarzer Rußbelag' },
  { id: 'b_silber', ort: 'b', label: 'silbrig / fein gesprenkelt' },
  { id: 'b_gespinst', ort: 'b', label: 'feine Gespinste' },
  { id: 'b_mine', ort: 'b', label: 'helle Gänge im Blatt' },
  { id: 'b_raender', ort: 'b', label: 'braune Ränder / Spitzen' },
  { id: 'b_papier', ort: 'b', label: 'hell, papierartig (Sonnenseite)' },
  { id: 'b_laeuse', ort: 'b', label: 'Läuse (grün, schwarz …)' },
  { id: 'b_fliegen', ort: 'b', label: 'weiße Fliegen fliegen auf' },
  { id: 'b_raupen', ort: 'b', label: 'Raupen / Fraßkot' },
  { id: 'b_kaefer', ort: 'b', label: 'Käfer oder deren Larven' },
  { id: 'b_hoecker', ort: 'b', label: 'braune Höcker / Schildchen' },
  { id: 'b_watte', ort: 'b', label: 'weiße Watte-Flöckchen' },
  // Früchte
  { id: 'f_faul_braun', ort: 'f', label: 'braune, harte Faulstellen' },
  { id: 'f_bluetenende', ort: 'f', label: 'dunkler Fleck unten (Blütenende)' },
  { id: 'f_grau', ort: 'f', label: 'grauer Schimmelrasen' },
  { id: 'f_schorf', ort: 'f', label: 'dunkle, rissige Flecken' },
  { id: 'f_mumien', ort: 'f', label: 'faulen in Ringen / Mumien' },
  { id: 'f_platzen', ort: 'f', label: 'platzen auf' },
  { id: 'f_madig', ort: 'f', label: 'madig / Bohrloch' },
  { id: 'f_weich', ort: 'f', label: 'weich, eingesunken, riecht sauer' },
  { id: 'f_fallen', ort: 'f', label: 'fallen unreif ab' },
  { id: 'f_klein', ort: 'f', label: 'bleiben klein / kaum Früchte' },
  // Stängel & Triebe
  { id: 's_spitzen', ort: 's', label: 'Triebspitzen welken' },
  { id: 's_flecken', ort: 's', label: 'dunkle Flecken am Stängel' },
  { id: 's_kahl', ort: 's', label: 'kahl gefressen, mit Gespinst' },
  { id: 's_umfall', ort: 's', label: 'Keimlinge knicken um' },
  { id: 's_weg', ort: 's', label: 'Jungpflanzen über Nacht weg' },
  // Wurzel & Erde
  { id: 'w_wucherung', ort: 'w', label: 'Wurzeln mit Wucherungen' },
  { id: 'w_faul', ort: 'w', label: 'Wurzeln braun & matschig' },
  { id: 'w_gaenge', ort: 'w', label: 'Fraßgänge in Rübe / Knolle' },
  { id: 'w_angefressen', ort: 'w', label: 'lässt sich leicht herausziehen' },
  { id: 'w_muecken', ort: 'w', label: 'kleine Mücken über der Erde' },
  { id: 'w_nass', ort: 'w', label: 'Erde dauernd nass' },
  { id: 'w_trocken', ort: 'w', label: 'Erde staubtrocken' },
  { id: 'w_salz', ort: 'w', label: 'weiße Kruste auf der Erde' },
  // Ganze Pflanze
  { id: 'g_schlapp', ort: 'g', label: 'hängt schlaff' },
  { id: 'g_welkt', ort: 'g', label: 'welkt, obwohl Erde feucht' },
  { id: 'g_kuemmert', ort: 'g', label: 'wächst kaum' },
  { id: 'g_vergeilt', ort: 'g', label: 'lang, dünn & blass' },
  { id: 'g_frost', ort: 'g', label: 'nach kalter Nacht schwarz / glasig' },
];

const DOKTOR_TYPEN = {
  pilz: { icon: '🍄', label: 'Pilzkrankheit' },
  tier: { icon: '🐛', label: 'Schädling' },
  virus: { icon: '🦠', label: 'Virus' },
  mangel: { icon: '🧪', label: 'Nährstoffe' },
  pflege: { icon: '💧', label: 'Standort & Pflege' },
};

// nur = betrifft (fast) nur diese Pflanzen · oft = typisch bei diesen
const SCHADBILDER = [
  { id: 'krautfaeule', name: 'Kraut- und Braunfäule', typ: 'pilz', nur: /tomate|kartoffel/, monate: [6,7,8,9], ansteckend: true,
    z: { b_wasserflecken: 4, b_braunflecken: 3, s_flecken: 3, f_faul_braun: 4, b_grau_unten: 1, g_schlapp: 0.5 },
    erkennen: 'Graubraune, schnell wachsende Flecken an Blättern und Stängeln, oft nach feuchtem Wetter. Früchte bekommen harte, braune Stellen.',
    fix: ['Befallene Blätter sofort abschneiden', 'Nur von unten gießen, Blätter trocken halten', 'Regendach oder Tomatenhaus hilft am meisten', 'Stark befallene Pflanzen ganz entfernen'],
    vorbeugen: 'Untere Blätter bis ca. 30 cm entfernen, Abstand halten, robuste Sorten wählen und Tomaten nicht neben Kartoffeln setzen.' },
  { id: 'echtermehltau', name: 'Echter Mehltau', typ: 'pilz', oft: /gurke|zucchini|kürbis|rose|apfel|stachelbeer|erbse|phlox|aster|salbei|wein|monarde/, monate: [5,6,7,8,9], ansteckend: true,
    z: { b_weiss: 6, b_gelb: 1, b_kraeusel: 1 },
    erkennen: 'Weißer, mehliger Belag vor allem oben auf den Blättern, lässt sich abwischen. „Schönwetterpilz“ – kommt bei warmem, trockenem Wetter.',
    fix: ['Befallene Blätter entfernen', 'Milch mit Wasser 1:8 mischen und alle 3–4 Tage sprühen', 'Nicht zu viel Stickstoff düngen'],
    vorbeugen: 'Luftig pflanzen, robuste Sorten, morgens am Boden gießen.' },
  { id: 'falschermehltau', name: 'Falscher Mehltau', typ: 'pilz', oft: /salat|gurke|zwiebel|spinat|rose|wein|traube|kohl|basilikum|erbse|zucchini|kürbis|mangold/, monate: [5,6,7,8,9,10], ansteckend: true,
    z: { b_grau_unten: 6, b_gelb: 2, b_braunflecken: 1 },
    erkennen: 'Oben gelbliche, oft eckige Flecken, auf der Blattunterseite grau-violetter Flaum. Mag kühle Nächte und nasse Blätter.',
    fix: ['Befallene Blätter entfernen', 'Morgens und nur am Boden gießen', 'Mehr Abstand für Luft'],
    vorbeugen: 'Resistente Sorten (bei Salat und Gurke gibt es viele), nicht zu dicht säen, Fruchtwechsel.' },
  { id: 'grauschimmel', name: 'Grauschimmel (Botrytis)', typ: 'pilz', oft: /erdbeer|wein|traube|tomate|salat|himbeer|bohne|rose|pfingstrose|zwiebel|paprika/, monate: [5,6,7,8,9,10], ansteckend: true,
    z: { f_grau: 6, s_flecken: 1, b_braunflecken: 1, b_wasserflecken: 1 },
    erkennen: 'Grauer, stäubender Schimmelrasen an Früchten, Blüten oder Stängeln, meist nach Regenphasen.',
    fix: ['Faule Früchte sofort ablesen und entsorgen', 'Stroh oder Holzwolle unter Erdbeeren legen', 'Nicht über die Blätter gießen'],
    vorbeugen: 'Luftig pflanzen, Unkraut kurz halten, reife Früchte zügig ernten.' },
  { id: 'rost', name: 'Rostpilz', typ: 'pilz', oft: /rose|bohne|lauch|porree|knoblauch|birn|johannisbeer|stockrose|minze|sellerie|schnittlauch|zwiebel/, monate: [5,6,7,8,9,10], ansteckend: true,
    z: { b_rost: 7, b_gelb: 1 },
    erkennen: 'Orange, rostbraune oder dunkle Pusteln, meist auf der Blattunterseite; oben gelbe Flecken. Pusteln stäuben beim Reiben.',
    fix: ['Befallene Blätter entfernen', 'Bei Lauch: stark befallene Blätter abschneiden – der Schaft ist essbar', 'Weniger Stickstoff, mehr Kalium (z. B. Beinwelljauche)'],
    vorbeugen: 'Abstand, Fruchtwechsel, bei Birnen Wacholder in der Nähe meiden (Gitterrost).' },
  { id: 'sternrusstau', name: 'Sternrußtau', typ: 'pilz', nur: /rose/, monate: [5,6,7,8,9,10], ansteckend: true,
    z: { b_braunflecken: 5, b_gelb: 2, f_fallen: 0.5 },
    erkennen: 'Schwarzviolette Flecken mit sternförmig ausgefranstem Rand, Blätter vergilben drumherum und fallen ab.',
    fix: ['Befallene Blätter abzupfen und auch Falllaub aufsammeln', 'Schachtelhalmbrühe vorbeugend sprühen', 'Nicht über die Blätter gießen'],
    vorbeugen: 'ADR-Rosen (geprüft robust) wählen, sonniger, luftiger Platz.' },
  { id: 'schorf', name: 'Schorf', typ: 'pilz', nur: /apfel|birn/, monate: [4,5,6,7,8,9],
    z: { f_schorf: 6, b_braunflecken: 2 },
    erkennen: 'Olivbraune, samtige Flecken auf den Blättern, dunkle, rissige Stellen auf den Früchten. Die Früchte sind trotzdem essbar.',
    fix: ['Falllaub im Herbst aufsammeln (dort überwintert der Pilz)', 'Krone luftig schneiden', 'Schachtelhalmbrühe im Frühjahr'],
    vorbeugen: 'Schorfrobuste Sorten (z. B. „Topaz“, „Santana“, „Rebella“).' },
  { id: 'monilia', name: 'Monilia (Fruchtfäule & Spitzendürre)', typ: 'pilz', nur: /apfel|birn|kirsch|zwetsch|pflaume|aprikose|pfirsich|quitte|mirabelle|nektarin/, monate: [4,5,6,7,8,9], ansteckend: true,
    z: { f_mumien: 6, s_spitzen: 3, f_faul_braun: 1.5 },
    erkennen: 'Faulstellen mit ringförmigen, hellen Schimmelpolstern; Früchte schrumpfen zu „Mumien“. Bei Kirschen welken Triebspitzen nach der Blüte.',
    fix: ['Faule Früchte und Fruchtmumien entfernen – auch die am Baum', 'Welke Triebe bis ins gesunde Holz zurückschneiden', 'Schnittwerkzeug danach reinigen'],
    vorbeugen: 'Verletzungen an Früchten vermeiden (Wespen, Hagel), Krone luftig halten.' },
  { id: 'kraeusel', name: 'Kräuselkrankheit', typ: 'pilz', nur: /pfirsich|nektarin|mandel/, monate: [3,4,5,6],
    z: { b_blasen: 7, b_kraeusel: 3, f_fallen: 0.5 },
    erkennen: 'Junge Blätter sind blasig aufgetrieben, verdickt und rot-gelb verfärbt, später fallen sie ab.',
    fix: ['Befallene Blätter abnehmen', 'Baum mit Kompost und Wasser stärken – er treibt neu aus', 'Behandlung wirkt nur VOR dem Austrieb (ab Mitte Februar)'],
    vorbeugen: 'Regendach im Frühjahr, robuste Sorten wie „Benedicte“ oder „Revita“.' },
  { id: 'schrotschuss', name: 'Schrotschusskrankheit', typ: 'pilz', nur: /kirsch|zwetsch|pflaume|aprikose|pfirsich|mandel|mirabelle/, monate: [4,5,6,7,8],
    z: { b_schrot: 7, b_braunflecken: 2, b_kl_loecher: 1 },
    erkennen: 'Erst rötlich-braune Flecken, dann fällt das Gewebe heraus – das Blatt sieht aus wie mit Schrot beschossen.',
    fix: ['Befallene Triebe und Falllaub entfernen', 'Krone auslichten', 'Schachtelhalmbrühe sprühen'],
    vorbeugen: 'Luftiger Standort, nicht über die Blätter gießen.' },
  { id: 'kohlhernie', name: 'Kohlhernie', typ: 'pilz', nur: /kohl|brokkoli|radieschen|rettich|rucola|kresse|senf|rübe|pak choi|mairübe|wirsing/, ansteckend: true,
    z: { w_wucherung: 7, g_welkt: 2, g_kuemmert: 2, g_schlapp: 1 },
    erkennen: 'Pflanze welkt an warmen Tagen, wächst schlecht. Ausgegraben: knollige Wucherungen an den Wurzeln.',
    fix: ['Pflanzen mit Wurzeln entfernen', '7 Jahre lang keine Kohlgewächse auf dieses Beet', 'Boden kalken (pH über 7 bremst den Erreger)'],
    vorbeugen: 'Fruchtwechsel einhalten, resistente Sorten (z. B. Kohl „Clapton“).' },
  { id: 'welke', name: 'Welkepilz (Fusarium / Verticillium)', typ: 'pilz', oft: /tomate|gurke|aubergine|erdbeer|aster|paprika|kartoffel|melone|ahorn/, monate: [6,7,8,9], ansteckend: true,
    z: { g_welkt: 5, b_gelb_unten: 2, s_spitzen: 1, w_faul: 0.5 },
    erkennen: 'Pflanze welkt trotz feuchter Erde, oft erst nur einseitig. Stängel quer anschneiden: braune Leitbahnen im Inneren.',
    fix: ['Pflanze ganz entfernen', 'Dort einige Jahre nichts Verwandtes pflanzen'],
    vorbeugen: 'Fruchtwechsel, veredelte Pflanzen (Tomate, Gurke) sind widerstandsfähig.' },
  { id: 'umfall', name: 'Umfallkrankheit', typ: 'pilz', monate: [2,3,4,5],
    z: { s_umfall: 8, w_nass: 1 },
    erkennen: 'Keimlinge knicken direkt über der Erde um, der Stängel ist dort dünn und dunkel.',
    fix: ['Befallene Sämlinge entfernen', 'Weniger gießen, regelmäßig lüften', 'Gesunde Sämlinge zügig pikieren'],
    vorbeugen: 'Frische Aussaaterde, saubere Schalen, nicht zu dicht säen, von unten gießen.' },
  { id: 'mosaik', name: 'Mosaikvirus', typ: 'virus', oft: /gurke|zucchini|tomate|bohne|kürbis|paprika|salat|erbse/, ansteckend: true,
    z: { b_mosaik: 7, b_kraeusel: 2, g_kuemmert: 1, f_klein: 1 },
    erkennen: 'Blätter hell- und dunkelgrün marmoriert, oft verformt; Pflanze kümmert. Wird von Blattläusen übertragen.',
    fix: ['Befallene Pflanze entfernen', 'Hände und Werkzeug danach waschen', 'Blattläuse bekämpfen'],
    vorbeugen: 'Resistente Sorten, Blattläuse früh bremsen.' },

  { id: 'blattlaeuse', name: 'Blattläuse', typ: 'tier', monate: [4,5,6,7,8,9],
    z: { b_laeuse: 7, b_klebrig: 3, b_kraeusel: 3, b_russ: 2, s_spitzen: 0.5 },
    erkennen: 'Kolonien an Triebspitzen und Blattunterseiten, Blätter rollen sich ein, alles klebt (Honigtau). Ameisen sind oft dabei.',
    fix: ['Mit einem kräftigen Wasserstrahl abspritzen', 'Schmierseifenlösung (1 EL auf 1 l Wasser) sprühen', 'Nützlinge abwarten: Marienkäfer, Florfliegen, Schwebfliegen räumen meist in 2 Wochen auf'],
    vorbeugen: 'Wenig Stickstoff, Blühpflanzen für Nützlinge, Kapuzinerkresse als Lockpflanze.' },
  { id: 'spinnmilben', name: 'Spinnmilben', typ: 'tier', oft: /gurke|bohne|tomate|erdbeer|aubergine|rose|hibiskus|zitrus|zitrone|palme|efeu|kirschlorbeer/, monate: [5,6,7,8,9],
    z: { b_gespinst: 4, b_silber: 4, b_gelb: 1, w_trocken: 1 },
    erkennen: 'Blätter fein gelblich gesprenkelt, später silbrig; zwischen Blättern feine Gespinste. Kommt bei Hitze und trockener Luft.',
    fix: ['Pflanze abbrausen, auch die Unterseiten', 'Luftfeuchte erhöhen, im Gewächshaus öfter nebeln', 'Raubmilben einsetzen (Gewächshaus, Zimmer)'],
    vorbeugen: 'Im Sommer Gewächshaus feucht halten, Zimmerpflanzen nicht über die Heizung stellen.' },
  { id: 'thripse', name: 'Thripse', typ: 'tier', oft: /lauch|porree|zwiebel|gurke|erbse|bohne|gladiole|orchidee/, monate: [5,6,7,8,9],
    z: { b_silber: 6, b_kraeusel: 1 },
    erkennen: 'Silbrig glänzende Saugflecken mit winzigen schwarzen Kotpünktchen, auf der Unterseite schmale, flinke Insekten.',
    fix: ['Blaue Leimtafeln aufhängen', 'Befallene Teile abschneiden', 'Pflanzen regelmäßig abbrausen'],
    vorbeugen: 'Gleichmäßig feucht halten, Kulturschutznetz bei Lauch.' },
  { id: 'weissefliege', name: 'Weiße Fliege', typ: 'tier', oft: /tomate|kohl|gurke|aubergine|paprika|fuchsie|weihnachtsstern|bohne/, monate: [5,6,7,8,9,10],
    z: { b_fliegen: 8, b_klebrig: 2, b_russ: 1, b_gelb: 0.5 },
    erkennen: 'Beim Anstoßen fliegen kleine weiße „Mottenfliegen“ auf, Larven sitzen flach auf der Blattunterseite.',
    fix: ['Gelbtafeln aufhängen', 'Schlupfwespen (Encarsia) im Gewächshaus', 'Blattunterseiten mit Schmierseifenlösung behandeln'],
    vorbeugen: 'Gewächshaus im Winter leer und sauber, Kapuzinerkresse und Tagetes als Begleiter.' },
  { id: 'schnecken', name: 'Schnecken', typ: 'tier', oft: /salat|kohl|tagetes|dahlie|funkie|hosta|zucchini|kürbis|basilikum|erdbeer|gurke|bohne|lupine|rittersporn|sonnenblume/, monate: [3,4,5,6,7,8,9,10],
    z: { b_schleim: 6, s_weg: 5, b_gr_loecher: 4 },
    erkennen: 'Große, unregelmäßige Fraßlöcher, glänzende Schleimspuren, Jungpflanzen sind über Nacht verschwunden.',
    fix: ['Abends oder früh morgens absammeln', 'Bretter auslegen – darunter sammeln sie sich', 'Bio-Schneckenkorn (Eisen-III-Phosphat) sparsam streuen'],
    vorbeugen: 'Morgens statt abends gießen, Jungpflanzen vorziehen, Schneckenzaun, Igel und Laufenten freuen sich.' },
  { id: 'raupen', name: 'Raupen (z. B. Kohlweißling)', typ: 'tier', oft: /kohl|brokkoli|kohlrabi|rosenkohl|wirsing|kapuzinerkresse|rucola|blumenkohl|grünkohl/, monate: [5,6,7,8,9],
    z: { b_raupen: 7, b_gr_loecher: 3 },
    erkennen: 'Löcher vom Rand oder in der Blattfläche, grüne Krümel (Kot), Raupen und gelbe Eigelege auf der Blattunterseite.',
    fix: ['Raupen und Eigelege absammeln', 'Kulturschutznetz drüberlegen', 'Bei starkem Befall: Bacillus-thuringiensis-Präparat (bio)'],
    vorbeugen: 'Netz direkt nach dem Pflanzen, Tomaten oder Sellerie als Nachbarn schrecken Falter ab.' },
  { id: 'erdfloehe', name: 'Erdflöhe', typ: 'tier', oft: /radieschen|rucola|kohl|rettich|kohlrabi|senf|kresse|pak choi|rübe/, monate: [4,5,6,7,8],
    z: { b_kl_loecher: 7, w_trocken: 1 },
    erkennen: 'Viele kleine, runde Löcher wie ein Sieb, besonders an jungen Pflanzen. Winzige Käfer springen beim Berühren weg.',
    fix: ['Boden feucht halten – Erdflöhe mögen es trocken', 'Gesteinsmehl auf die Blätter stäuben', 'Feines Kulturschutznetz'],
    vorbeugen: 'Mulchen, regelmäßig hacken, Spinat oder Salat als Zwischenreihe.' },
  { id: 'dickmaulruessler', name: 'Dickmaulrüssler', typ: 'tier', oft: /rhododendron|kirschlorbeer|eibe|erdbeer|hortensie|azalee|flieder|efeu|funkie/, monate: [4,5,6,7,8,9],
    z: { b_buchten: 7, g_welkt: 1, w_angefressen: 1 },
    erkennen: 'Halbrunde Buchten am Blattrand (Käfer, nachtaktiv). Gefährlicher sind die Larven, die Wurzeln fressen – die Pflanze welkt.',
    fix: ['Nachts mit Taschenlampe absammeln', 'Nematoden (Heterorhabditis) gießen – im Mai oder Aug./Sept.'],
    vorbeugen: 'Holzwolle in Blumentöpfen als Falle, Topfpflanzen kontrollieren.' },
  { id: 'buchsbaumzuensler', name: 'Buchsbaumzünsler', typ: 'tier', nur: /buchs/, monate: [4,5,6,7,8,9,10],
    z: { s_kahl: 8, b_raupen: 3, b_gespinst: 2 },
    erkennen: 'Grün-schwarz gestreifte Raupen im Inneren, Gespinste, Blätter bis aufs Gerippe abgefressen.',
    fix: ['Raupen absammeln oder mit scharfem Wasserstrahl herausspritzen', 'Bacillus-thuringiensis-Präparat bei warmem Wetter', 'Abgefressene Triebe zurückschneiden – Buchs treibt oft wieder aus'],
    vorbeugen: 'Ab März regelmäßig ins Innere schauen; als Ersatz eignen sich z. B. Ilex „Dark Green“ oder Eibe.' },
  { id: 'moehrenfliege', name: 'Möhrenfliege', typ: 'tier', nur: /karotte|möhre|pastinake|sellerie|petersilie/, monate: [5,6,7,8,9,10],
    z: { w_gaenge: 7, b_gelb: 1 },
    erkennen: 'Rostbraune Fraßgänge in der Möhre, das Laub verfärbt sich rötlich.',
    fix: ['Befallene Möhren ernten und nicht liegen lassen', 'Kulturschutznetz über die Reihe'],
    vorbeugen: 'Netz ab der Aussaat, Mischkultur mit Zwiebeln oder Lauch, luftige Lage.' },
  { id: 'lauchmotte', name: 'Lauchmotte', typ: 'tier', nur: /lauch|porree|zwiebel|knoblauch|schnittlauch/, monate: [5,6,7,8,9],
    z: { b_mine: 4, b_raupen: 3, b_gelb: 0.5 },
    erkennen: 'Fensterartige Fraßstellen und Gänge in den Blättern, kleine Raupen im Herz der Pflanze.',
    fix: ['Befallene Blätter abschneiden', 'Kulturschutznetz'],
    vorbeugen: 'Netz von Mai bis September, Mischkultur mit Möhren.' },
  { id: 'minierfliegen', name: 'Minierfliegen', typ: 'tier', oft: /tomate|mangold|spinat|rote bete|sellerie|chrysantheme|salat/, monate: [5,6,7,8,9],
    z: { b_mine: 6 },
    erkennen: 'Helle, geschlängelte Gänge oder Flecken im Blatt – darin fressen winzige Larven.',
    fix: ['Befallene Blätter abzupfen', 'Gelbtafeln gegen die Fliegen'],
    vorbeugen: 'Kulturschutznetz bei Mangold und Spinat.' },
  { id: 'kartoffelkaefer', name: 'Kartoffelkäfer', typ: 'tier', nur: /kartoffel|aubergine|tomate/, monate: [5,6,7,8],
    z: { b_kaefer: 7, b_gr_loecher: 2 },
    erkennen: 'Gelb-schwarz gestreifte Käfer und rötliche, dicke Larven; orange Eier auf der Blattunterseite.',
    fix: ['Käfer, Larven und Eier absammeln (Kinder helfen gern)', 'Gesteinsmehl stäuben'],
    vorbeugen: 'Ab Mai regelmäßig kontrollieren, Mischkultur mit Kümmel oder Meerrettich.' },
  { id: 'lilienhaehnchen', name: 'Lilienhähnchen', typ: 'tier', nur: /lilie|kaiserkrone/, monate: [4,5,6,7,8],
    z: { b_kaefer: 6, b_gr_loecher: 2 },
    erkennen: 'Leuchtend rote Käfer, Larven verstecken sich unter ihrem eigenen Kot auf der Blattunterseite.',
    fix: ['Käfer und Larven absammeln – über einer hellen Schale, sie lassen sich fallen'],
    vorbeugen: 'Ab dem Austrieb regelmäßig nachsehen.' },
  { id: 'kirschessigfliege', name: 'Kirschessigfliege', typ: 'tier', oft: /kirsch|himbeer|brombeer|heidelbeer|erdbeer|traube|wein|holunder|pflaume|zwetsch/, monate: [6,7,8,9,10],
    z: { f_weich: 6, f_madig: 3 },
    erkennen: 'Reife Früchte werden weich, sinken ein und riechen säuerlich; darin winzige weiße Maden.',
    fix: ['Alle reifen Früchte zügig ernten', 'Befallene Früchte im Restmüll entsorgen (nicht liegen lassen)', 'Essigfallen (Apfelessig + Spülmittel) aufstellen'],
    vorbeugen: 'Feinmaschiges Netz über Beerensträucher, oft und vollständig ernten.' },
  { id: 'apfelwickler', name: 'Apfelwickler (Obstmade)', typ: 'tier', nur: /apfel|birn|quitte|walnuss/, monate: [6,7,8,9],
    z: { f_madig: 6, f_fallen: 3 },
    erkennen: 'Bohrloch mit Krümeln an der Frucht, innen ein Fraßgang bis zum Kerngehäuse; befallene Früchte fallen früh.',
    fix: ['Fallobst regelmäßig aufsammeln', 'Ab Juni Wellpappe-Gürtel um den Stamm – Raupen verpuppen sich darin, wöchentlich kontrollieren'],
    vorbeugen: 'Meisen fördern (Nistkasten), Pheromonfallen zur Kontrolle.' },
  { id: 'wuehlmaus', name: 'Wühlmaus', typ: 'tier', oft: /tulpe|möhre|karotte|sellerie|apfel|kartoffel|rote bete|topinambur|lilie/,
    z: { w_angefressen: 7, g_welkt: 2, w_gaenge: 1, g_schlapp: 1 },
    erkennen: 'Pflanze welkt plötzlich und lässt sich ohne Widerstand herausziehen, Wurzeln oder Knollen sind abgenagt. Flache, unregelmäßige Erdhügel.',
    fix: ['Gang öffnen: Wird er schnell wieder verschlossen, ist er bewohnt', 'Fallen (tierschutzgerecht) in den Gang setzen', 'Knollen und Obstbäume mit Drahtkörben pflanzen'],
    vorbeugen: 'Drahtkörbe beim Pflanzen, Kaiserkrone und Knoblauch als (mäßig wirksame) Abschreckung.' },
  { id: 'schildlaeuse', name: 'Schildläuse', typ: 'tier', oft: /zitrus|zitrone|oleander|lorbeer|orchidee|ficus|palme|efeu|kirschlorbeer|olive/,
    z: { b_hoecker: 7, b_klebrig: 3, b_russ: 2 },
    erkennen: 'Braune oder graue, fest sitzende Höcker an Blattadern und Trieben, darunter klebriger Honigtau.',
    fix: ['Mit einer alten Zahnbürste oder einem Wattestäbchen abstreifen', 'Rapsöl-Präparat sprühen'],
    vorbeugen: 'Kübelpflanzen hell und kühl überwintern, regelmäßig kontrollieren.' },
  { id: 'wolllaeuse', name: 'Woll- und Schmierläuse', typ: 'tier', oft: /orchidee|kaktus|sukkulent|zitrus|ficus|palme|weihnachtsstern|monstera|aloe/,
    z: { b_watte: 8, b_klebrig: 2 },
    erkennen: 'Weiße, wattige Flöckchen in Blattachseln und an Wurzeln, Pflanze wird klebrig.',
    fix: ['Mit Spiritus-Wasser (1:1) und Wattestäbchen abtupfen', 'Pflanze isolieren, damit es sich nicht ausbreitet'],
    vorbeugen: 'Neue Pflanzen erst kontrollieren, nicht zu warm und trocken überwintern.' },
  { id: 'trauermuecken', name: 'Trauermücken', typ: 'tier',
    z: { w_muecken: 8, w_nass: 2, g_kuemmert: 1 },
    erkennen: 'Kleine schwarze Mücken schwirren über der Erde, die Larven leben in feuchter Erde und fressen an jungen Wurzeln.',
    fix: ['Erde zwischendurch gut abtrocknen lassen', 'Gelbstecker in den Topf', 'Eine Schicht Sand auf die Erde'],
    vorbeugen: 'Von unten gießen, Untersetzer leeren, torffreie Erde mit Sand.' },

  { id: 'bluetenendfaeule', name: 'Blütenendfäule', typ: 'mangel', nur: /tomate|paprika|zucchini|gurke|aubergine|chili/, monate: [6,7,8,9],
    z: { f_bluetenende: 8, w_trocken: 1 },
    erkennen: 'Dunkler, eingesunkener Fleck genau am unteren Fruchtende. Ursache ist Calciummangel durch unregelmäßiges Gießen – keine Krankheit.',
    fix: ['Betroffene Früchte abnehmen', 'Gleichmäßig gießen, nie austrocknen lassen', 'Mulchen'],
    vorbeugen: 'Große Töpfe, regelmäßig gießen, nicht zu viel Stickstoff.' },
  { id: 'stickstoff', name: 'Stickstoffmangel', typ: 'mangel',
    z: { b_gelb_unten: 6, b_gelb: 3, g_kuemmert: 2, f_klein: 1 },
    erkennen: 'Erst die unteren, älteren Blätter werden gleichmäßig hellgrün bis gelb, die Pflanze wächst langsam.',
    fix: ['Mit Brennnesseljauche (1:10) oder Hornspänen düngen', 'Kompost einarbeiten'],
    vorbeugen: 'Starkzehrer (Kohl, Tomate, Kürbis) im Frühjahr mit Kompost versorgen.' },
  { id: 'chlorose', name: 'Eisenmangel (Chlorose)', typ: 'mangel', oft: /rhododendron|hortensie|azalee|heidelbeer|rose|zitrus|zitrone|erdbeer|himbeer|petunie/,
    z: { b_chlorose: 8, g_kuemmert: 1 },
    erkennen: 'Junge Blätter werden gelb, die Blattadern bleiben grün. Meist ist der Boden zu kalkhaltig – das Eisen ist da, aber nicht verfügbar.',
    fix: ['Eisendünger (Chelat) geben', 'Mit Regenwasser gießen', 'Bei Moorbeetpflanzen: saure Erde, Nadelstreu mulchen'],
    vorbeugen: 'Kalkliebende und kalkfliehende Pflanzen trennen, Regenwasser sammeln.' },
  { id: 'wassermangel', name: 'Wassermangel', typ: 'pflege', monate: [5,6,7,8,9],
    z: { g_schlapp: 4, w_trocken: 5, b_raender: 2, f_fallen: 1, f_bluetenende: 0.5, f_platzen: 0.5 },
    erkennen: 'Pflanze hängt am Nachmittag, Erde ist trocken, Blattränder werden braun. Nach dem Gießen erholt sie sich.',
    fix: ['Durchdringend gießen (lieber selten und viel)', 'Morgens gießen', 'Mulchschicht auflegen'],
    vorbeugen: 'Gießplan nutzen, Töpfe nicht zu klein, im Hochsommer zweimal schauen.' },
  { id: 'staunaesse', name: 'Staunässe / Wurzelfäule', typ: 'pflege',
    z: { w_nass: 5, w_faul: 5, g_welkt: 2, b_gelb: 2, g_schlapp: 1, w_muecken: 0.5 },
    erkennen: 'Erde bleibt dauernd nass, Pflanze welkt trotzdem, Wurzeln sind braun, matschig und riechen modrig.',
    fix: ['Gießen pausieren, Untersetzer leeren', 'Im Topf: faule Wurzeln abschneiden, in frische Erde setzen', 'Im Beet: Boden lockern, Sand einarbeiten'],
    vorbeugen: 'Töpfe mit Abzugsloch und Drainage, schwere Böden verbessern.' },
  { id: 'sonnenbrand', name: 'Sonnenbrand', typ: 'pflege', monate: [5,6,7,8,9],
    z: { b_papier: 8, b_raender: 1 },
    erkennen: 'Helle, ausgebleichte, papierartige Flecken genau auf der sonnenzugewandten Seite – oft kurz nach dem Rausstellen.',
    fix: ['Schattieren (Vlies, Schattiernetz)', 'Verbrannte Blätter dranlassen, bis neue nachkommen'],
    vorbeugen: 'Jungpflanzen und Kübelpflanzen über eine Woche langsam an die Sonne gewöhnen.' },
  { id: 'frost', name: 'Frostschaden', typ: 'pflege', monate: [10,11,12,1,2,3,4,5],
    z: { g_frost: 9, s_spitzen: 1 },
    erkennen: 'Nach einer kalten Nacht sind Blätter und Triebe schwarz, glasig oder matschig.',
    fix: ['Erfrorene Teile erst abschneiden, wenn keine Frostnacht mehr droht', 'Abwarten – viele Pflanzen treiben wieder aus'],
    vorbeugen: 'Frostempfindliches erst nach den Eisheiligen raus, bei Frostwarnung Vlies drüber.' },
  { id: 'lichtmangel', name: 'Lichtmangel', typ: 'pflege',
    z: { g_vergeilt: 8, b_gelb: 1 },
    erkennen: 'Lange, dünne, blasse Triebe – die Pflanze streckt sich zum Licht. Typisch bei Anzucht am Fenster.',
    fix: ['Heller stellen', 'Kühler stellen bremst das Strecken', 'Vergeilte Sämlinge beim Pikieren tiefer setzen'],
    vorbeugen: 'Aussaat nicht zu früh, Pflanzenlampe, Südfenster.' },
  { id: 'ueberduengung', name: 'Überdüngung / Salz', typ: 'pflege',
    z: { w_salz: 7, b_raender: 3, g_kuemmert: 1 },
    erkennen: 'Braune Blattränder, weiße Kruste auf der Erde oder am Topfrand, die Pflanze wirkt verbrannt.',
    fix: ['Erde gründlich mit Regenwasser durchspülen', 'Einige Wochen nicht düngen', 'Kübelpflanzen umtopfen'],
    vorbeugen: 'Lieber schwach und öfter düngen, organische Dünger bevorzugen.' },
  { id: 'platzen', name: 'Unregelmäßiges Gießen (Früchte platzen)', typ: 'pflege', monate: [6,7,8,9],
    z: { f_platzen: 7, w_trocken: 1 },
    erkennen: 'Früchte reißen auf, meist nach starkem Regen auf trockene Erde – sie wachsen schneller, als die Schale mitkommt.',
    fix: ['Aufgeplatzte Früchte bald verwerten', 'Gleichmäßig gießen, Mulch'],
    vorbeugen: 'Regenschutz bei Tomaten, platzfeste Sorten.' },
  { id: 'bestaeubung', name: 'Bestäubung / Überlast', typ: 'pflege', oft: /zucchini|kürbis|gurke|tomate|paprika|apfel|bohne|birn|kirsch|erdbeer/, monate: [5,6,7,8],
    z: { f_klein: 5, f_fallen: 3 },
    erkennen: 'Blüten fallen ohne Frucht ab oder kleine Früchte vertrocknen. Oft zu wenig Insekten, Hitze über 30 °C oder zu viele Früchte auf einmal.',
    fix: ['Zucchini & Kürbis: männliche Blüte an die weibliche tupfen', 'Tomaten: Blütenstände leicht schütteln', 'Bei Obst: Fruchtbehang ausdünnen'],
    vorbeugen: 'Blühpflanzen für Bienen dazwischen setzen, gleichmäßig wässern.' },
  { id: 'drahtwurm', name: 'Drahtwurm', typ: 'tier', oft: /kartoffel|möhre|karotte|salat|zwiebel|rote bete/,
    z: { w_gaenge: 4, g_welkt: 0.5 },
    erkennen: 'Kleine, runde Bohrgänge in Kartoffeln oder Möhren, darin harte, gelbbraune „Drahtwürmer“ (Larven des Schnellkäfers).',
    fix: ['Kartoffelhälften als Köder eingraben und nach ein paar Tagen mit Larven entfernen', 'Rechtzeitig ernten'],
    vorbeugen: 'Kommt oft nach Rasenumbruch – dort im ersten Jahr keine Kartoffeln.' },
];

let doktorWahl = new Set(), doktorOrte = new Set(), doktorKontext = null, doktorFoto = null, doktorPflanze = '';

function doktorPflanzeObjekt() {
  if (!doktorKontext) return null;
  try {
    if (doktorKontext.art === 'beet') {
      const bed = getCurrentBeds().find(b => b.id === doktorKontext.bedId);
      return bed && bed.plants[doktorKontext.idx] ? { obj: bed.plants[doktorKontext.idx], bed } : null;
    }
    if (doktorKontext.art === 'zimmer') { const z = (typeof zimmerListe === 'function' ? zimmerListe() : []).find(x => x.id === doktorKontext.id); return z ? { obj: z } : null; }
    const fp = getCurrentFreiPflanzen().find(x => x.id === doktorKontext.id);
    return fp ? { obj: fp } : null;
  } catch (e) { return null; }
}

function doktorNorm(t) { return String(t || '').toLowerCase(); }

// Bewertung aller Ursachen für die aktuelle Auswahl
function doktorAuswerten(tags, pflanze, monat) {
  const pn = doktorNorm(pflanze);
  const liste = [];
  SCHADBILDER.forEach(u => {
    let s = 0, erklaert = 0;
    tags.forEach(t => { if (u.z[t]) { s += u.z[t]; erklaert++; } else s -= 0.5; });
    if (!erklaert) return;
    let passtPflanze = null;
    if (pn) {
      if (u.nur) passtPflanze = u.nur.test(pn);
      else if (u.oft && u.oft.test(pn)) passtPflanze = true;
      if (passtPflanze === true) s += 2;
      if (passtPflanze === false) s *= 0.25;
    }
    if (u.monate && monat && !u.monate.includes(monat)) s *= 0.7;
    if (s < 1.5) return;
    liste.push({ u, s, erklaert, passtPflanze });
  });
  liste.sort((a, b) => b.s - a.s);
  return liste;
}

function doktorModalBauen() {
  if (document.getElementById('doktorModal')) return;
  const m = document.createElement('div');
  m.className = 'modal-bg'; m.id = 'doktorModal'; m.style.display = 'none'; m.style.zIndex = '320';
  m.onclick = (e) => { if (e.target === m) doktorSchliessen(); };
  m.innerHTML = `<div class="modal doktor-modal">
    <h2 style="margin-top:0">🩺 Pflanzen-Doktor</h2>
    <div class="form-row">
      <label for="doktorPflanze">Welche Pflanze?</label>
      <input type="text" id="doktorPflanze" list="doktorPflanzenListe" placeholder="z. B. Tomate, Rose, Apfel … (optional)" autocomplete="off" oninput="doktorPflanze=this.value;doktorErgebnis()">
      <datalist id="doktorPflanzenListe"></datalist>
    </div>
    <div class="form-row" id="doktorFotoZeile">
      <div class="doktor-foto-reihe"><label class="btn-secondary doktor-foto-btn">📷 Foto vom Schaden<input type="file" accept="image/*" capture="environment" style="display:none" onchange="doktorFotoGewaehlt(event)"></label><span id="doktorFotoVorschau"></span></div>
    </div>
    <div class="form-row">
      <label>Wo siehst du etwas?</label>
      <div class="doktor-chips" id="doktorOrte"></div>
    </div>
    <div id="doktorZeichen"></div>
    <div id="doktorErgebnis"></div>
    <button type="button" class="doktor-sprung" id="doktorSprung" style="display:none" onclick="document.getElementById('doktorErgebnis').scrollIntoView({behavior:'smooth',block:'start'})"></button>
    <div class="modal-btns"><button class="btn-cancel" style="flex:1" onclick="doktorSchliessen()">Schließen</button></div>
  </div>`;
  document.body.appendChild(m);
}

function doktorOeffnen(quelle, pflanzenName, zimmerId) {
  doktorModalBauen();
  doktorWahl = new Set(); doktorOrte = new Set(); doktorFoto = null; doktorKontext = null;
  if (quelle === 'pp' && typeof activePlantBedId !== 'undefined' && activePlantBedId) doktorKontext = { art: 'beet', bedId: activePlantBedId.bedId, idx: activePlantBedId.idx };
  else if (quelle === 'zi' && zimmerId) doktorKontext = { art: 'zimmer', id: zimmerId };
  else if (quelle === 'fp' && typeof activeFreiPflanzeId !== 'undefined' && activeFreiPflanzeId) doktorKontext = { art: 'frei', id: activeFreiPflanzeId };
  const p = doktorPflanzeObjekt();
  doktorPflanze = pflanzenName || (p && p.obj.name) || '';
  const inp = document.getElementById('doktorPflanze');
  inp.value = doktorPflanze;
  inp.readOnly = !!p;
  inp.classList.toggle('doktor-fest', !!p);
  const namen = new Set(PLANTS.map(x => x.name));
  try { getCurrentBeds().forEach(b => (b.plants || []).forEach(pl => pl.name && namen.add(pl.name))); getCurrentFreiPflanzen().forEach(f => f.name && namen.add(f.name)); } catch (e) {}
  document.getElementById('doktorPflanzenListe').innerHTML = [...namen].sort((a, b) => a.localeCompare(b, 'de')).map(n => `<option value="${escapeHtml(n)}">`).join('');
  document.getElementById('doktorFotoZeile').style.display = p ? '' : 'none';
  document.getElementById('doktorFotoVorschau').innerHTML = '';
  doktorRender();
  document.getElementById('doktorModal').style.display = 'flex';
}
function doktorSchliessen() { const m = document.getElementById('doktorModal'); if (m) m.style.display = 'none'; }

function doktorOrtUmschalten(id) {
  if (doktorOrte.has(id)) {
    doktorOrte.delete(id);
    DOKTOR_ZEICHEN.filter(z => z.ort === id).forEach(z => doktorWahl.delete(z.id));
  } else doktorOrte.add(id);
  doktorRender();
}
function doktorZeichenUmschalten(id) {
  doktorWahl.has(id) ? doktorWahl.delete(id) : doktorWahl.add(id);
  doktorRender();
}

function doktorRender() {
  document.getElementById('doktorOrte').innerHTML = DOKTOR_ORTE.map(o =>
    `<button type="button" class="saat-chip${doktorOrte.has(o.id) ? ' an' : ''}" onclick="doktorOrtUmschalten('${o.id}')">${o.icon} ${o.label}</button>`).join('');
  document.getElementById('doktorZeichen').innerHTML = DOKTOR_ORTE.filter(o => doktorOrte.has(o.id)).map(o =>
    `<div class="form-row"><label>${o.icon} ${o.label}: Was siehst du?</label><div class="doktor-chips">${DOKTOR_ZEICHEN.filter(z => z.ort === o.id).map(z =>
      `<button type="button" class="saat-chip${doktorWahl.has(z.id) ? ' an' : ''}" onclick="doktorZeichenUmschalten('${z.id}')">${escapeHtml(z.label)}</button>`).join('')}</div></div>`).join('');
  doktorErgebnis();
}

function doktorErgebnis() {
  const box = document.getElementById('doktorErgebnis');
  if (!box) return;
  const sprung = document.getElementById('doktorSprung');
  sprung.style.display = 'none';
  if (!doktorWahl.size) {
    box.innerHTML = doktorOrte.size ? '<div class="doktor-leer">Tippe an, was dir auffällt – mehrere Zeichen machen das Ergebnis genauer.</div>' : '';
    return;
  }
  const treffer = doktorAuswerten([...doktorWahl], doktorPflanze, new Date().getMonth() + 1).slice(0, 3);
  if (!treffer.length) { box.innerHTML = '<div class="doktor-leer">Dazu passt nichts Eindeutiges. Nimm ein Zeichen weg oder schau im Lexikon unter „Probleme & Schädlinge“.</div>'; return; }
  sprung.textContent = `↓ ${treffer[0].u.name}${treffer.length > 1 ? ` + ${treffer.length - 1} weitere` : ''} ansehen`;
  sprung.style.display = '';
  const best = treffer[0].s, kannSpeichern = !!doktorPflanzeObjekt();
  box.innerHTML = `<div class="doktor-ergebnis-titel">Wahrscheinlichste Ursachen</div>` + treffer.map((t, i) => {
    const u = t.u, typ = DOKTOR_TYPEN[u.typ];
    const stufe = i === 0 && t.erklaert === doktorWahl.size && t.s >= 5 ? 'sehr wahrscheinlich' : t.s >= best * 0.75 ? 'gut möglich' : 'auch möglich';
    const hinweis = t.erklaert < doktorWahl.size ? ` · erklärt ${t.erklaert} von ${doktorWahl.size} Zeichen` : '';
    return `<div class="doktor-karte${i === 0 ? ' erste' : ''}">
      <div class="doktor-karte-kopf"><span class="doktor-typ" title="${typ.label}">${typ.icon}</span><div><b>${escapeHtml(u.name)}</b><div class="doktor-stufe">${stufe} · ${typ.label}${hinweis}</div></div></div>
      <div class="doktor-abschnitt"><b>So erkennst du es:</b> ${escapeHtml(u.erkennen)}</div>
      <div class="doktor-abschnitt"><b>Was jetzt hilft:</b><ul>${u.fix.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>
      ${u.ansteckend ? '<div class="doktor-warnung">⚠️ Kann sich ausbreiten: befallene Teile in den Restmüll, nicht auf den Kompost.</div>' : ''}
      <div class="doktor-abschnitt doktor-vorbeugen"><b>Fürs nächste Mal:</b> ${escapeHtml(u.vorbeugen)}</div>
      ${kannSpeichern ? `<div class="doktor-aktion">${doktorKontext && doktorKontext.art === 'zimmer' ? '<span></span>' : `<label class="doktor-check"><input type="checkbox" id="doktorNachsehen_${u.id}" checked> 🔔 In 7 Tagen nachsehen</label>`}<button type="button" class="btn-primary" onclick="doktorSpeichern('${u.id}')">✓ Das ist es</button></div>` : ''}
    </div>`;
  }).join('');
}

function doktorFotoGewaehlt(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 5);
    img.onload = () => {
      const scale = Math.min(1, 480 / img.width), c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      doktorFoto = c.toDataURL('image/jpeg', 0.7);
      document.getElementById('doktorFotoVorschau').innerHTML = `<img src="${doktorFoto}" alt="Foto vom Schaden" class="doktor-foto-mini"> <button type="button" class="btn-cancel" style="padding:3px 8px;font-size:0.7rem" onclick="doktorFoto=null;document.getElementById('doktorFotoVorschau').innerHTML=''">✕</button>`;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function doktorPlusTage(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function doktorSpeichern(ursacheId) {
  const p = doktorPflanzeObjekt(), u = SCHADBILDER.find(x => x.id === ursacheId);
  if (!p || !u) return;
  try { pushUndo(); } catch (e) {}
  const pl = p.obj;
  if (!Array.isArray(pl.diagnosen)) pl.diagnosen = [];
  const eintrag = { id: 'dg_' + Date.now().toString(36), datum: heuteISO(), ursache: u.id, name: u.name, symptome: [...doktorWahl] };
  if (doktorFoto) eintrag.foto = doktorFoto;
  pl.diagnosen.unshift(eintrag);
  if (pl.diagnosen.length > 12) pl.diagnosen.length = 12;
  let pinText = '';
  const cb = document.getElementById('doktorNachsehen_' + u.id);
  if (cb && cb.checked) {
    try {
      const pos = doktorKontext.art === 'beet' ? giessPos({ typ: 'beet', bed: p.bed, p: pl }) : giessPos({ typ: 'frei', fp: pl });
      const pin = { id: 'pin_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), icon: '🩺', text: `Nachsehen: ${u.name} an ${pl.name || 'Pflanze'}`, datum: doktorPlusTage(7), jaehrlich: false, x: Math.round(pos.x), y: Math.round(pos.y) };
      notizPins().push(pin);
      eintrag.pinId = pin.id;
      pinText = ' – Erinnerung in 7 Tagen unter „Heute“';
    } catch (e) {}
  }
  saveData();
  try { draw(); } catch (e) {}
  try { notizAnsichtenAktualisieren(); } catch (e) {}
  doktorSchliessen();
  doktorVerlaufRendern();
  if (doktorKontext.art === 'zimmer' && typeof zimmerNachDoktor === 'function') zimmerNachDoktor(pl.id);
  showTempStatus('🩺 Befund gemerkt' + pinText, 5);
}

function doktorVerlaufRendern() {
  ['pp', 'fp'].forEach(q => {
    const el = document.getElementById(q + 'DoktorVerlauf');
    if (!el) return;
    const alt = doktorKontext;
    if (q === 'pp') doktorKontext = (typeof activePlantBedId !== 'undefined' && activePlantBedId) ? { art: 'beet', bedId: activePlantBedId.bedId, idx: activePlantBedId.idx } : null;
    else doktorKontext = (typeof activeFreiPflanzeId !== 'undefined' && activeFreiPflanzeId) ? { art: 'frei', id: activeFreiPflanzeId } : null;
    const p = doktorPflanzeObjekt();
    doktorKontext = alt;
    const liste = p && Array.isArray(p.obj.diagnosen) ? p.obj.diagnosen : [];
    el.innerHTML = liste.length ? `<div class="doktor-verlauf-titel">Bisherige Befunde</div>` + liste.map(d => {
      const u = SCHADBILDER.find(x => x.id === d.ursache), typ = u ? DOKTOR_TYPEN[u.typ] : { icon: '🩺' };
      const datum = d.datum ? d.datum.split('-').reverse().join('.') : '';
      return `<div class="doktor-verlauf-zeile">${d.foto ? `<img src="${d.foto}" alt="" class="doktor-foto-mini">` : `<span class="doktor-typ">${typ.icon}</span>`}
        <div class="dv-text"><b>${escapeHtml(d.name)}</b><span>${datum}</span></div>
        <button type="button" class="dv-btn" title="Nochmal ansehen" onclick="doktorBefundAnsehen('${q}','${d.id}')">👁</button>
        <button type="button" class="dv-btn" title="Löschen" onclick="doktorBefundLoeschen('${q}','${d.id}')">🗑</button></div>`;
    }).join('') : '';
  });
}

function doktorBefundAnsehen(q, id) {
  doktorOeffnen(q);
  const p = doktorPflanzeObjekt(), d = p && (p.obj.diagnosen || []).find(x => x.id === id);
  if (!d) return;
  (d.symptome || []).forEach(t => { const z = DOKTOR_ZEICHEN.find(x => x.id === t); if (z) { doktorWahl.add(t); doktorOrte.add(z.ort); } });
  doktorRender();
}

function doktorBefundLoeschen(q, id) {
  doktorKontext = q === 'pp' ? { art: 'beet', bedId: activePlantBedId.bedId, idx: activePlantBedId.idx } : { art: 'frei', id: activeFreiPflanzeId };
  const p = doktorPflanzeObjekt();
  if (!p || !Array.isArray(p.obj.diagnosen)) return;
  const liste = p.obj.diagnosen, i = liste.findIndex(x => x.id === id);
  if (i === -1) return;
  const weg = liste.splice(i, 1)[0];
  saveData(); doktorVerlaufRendern();
  showTempStatus('🗑 Befund gelöscht', 6, { label: 'Rückgängig', aktion: () => { liste.splice(i, 0, weg); saveData(); doktorVerlaufRendern(); } });
}

// Verlauf beim Öffnen der Pflanzen-Panels aktualisieren
(function () {
  const altPP = window.openPlantPanel, altFP = window.openFreiPflanzePanel;
  if (typeof altPP === 'function') window.openPlantPanel = function () { const r = altPP.apply(this, arguments); try { doktorVerlaufRendern(); } catch (e) {} return r; };
  if (typeof altFP === 'function') window.openFreiPflanzePanel = function () { const r = altFP.apply(this, arguments); try { doktorVerlaufRendern(); } catch (e) {} return r; };
})();
