/* 🎉 Festdaten – Vorlagen, Mottos, Spiele-Sammlung, Schnitzeljagd-Aufgaben und Rätsel.
 * Wird vom Modul „Feste“ benutzt (window.FestDaten). */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.FestDaten = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Festarten mit Vorlagen ----------
  // ablauf: [Uhrzeit, Dauer (Min.), Titel]; aufgaben: [Tage vorher, Text]; essen: [Name, Einheit, pro Kind, pro Erwachsenem]
  const ARTEN = [
    { id: 'kindergeburtstag', em: '🎈', name: 'Kindergeburtstag', kinder: true, von: '14:00', bis: '17:30',
      ablauf: [['14:00', 30, '🎈 Ankommen & Geschenke auspacken'], ['14:30', 30, '🎂 Kuchen & Kerzen auspusten'], ['15:00', 60, '🗺️ Schnitzeljagd'], ['16:00', 30, '🎲 Spiele'], ['16:30', 30, '🌭 Abendessen'], ['17:00', 30, '🎁 Mitgebsel & ruhiges Spiel'], ['17:30', 0, '👋 Abholen']],
      aufgaben: [[28, 'Datum festlegen und überlegen, wer eingeladen wird'], [21, 'Einladungen verschicken'], [14, 'Deko und Mitgebsel besorgen'], [7, 'Zusagen und Allergien nachfragen'], [7, 'Schnitzeljagd planen, Karten drucken'], [3, 'Großeinkauf erledigen'], [1, 'Kuchen backen'], [1, 'Schnitzeljagd-Hinweise verstecken (oder am Morgen)'], [0, 'Deko aufhängen, Handy/Kamera laden'], [0, 'Telefonnummern der Eltern griffbereit legen']],
      essen: [['Kuchen/Muffins', 'Stück', 1.5, 1.5], ['Würstchen', 'Stück', 2, 2], ['Brötchen', 'Stück', 1, 1], ['Getränke (Saft, Wasser)', 'l', 0.6, 0.75], ['Gemüsesticks & Obst', 'Portionen', 1, 0.5], ['Knabbereien', 'Tüten', 0.2, 0.1]],
      budget: ['Deko', 'Essen & Getränke', 'Mitgebsel', 'Preise für Spiele & Schatz'],
      mitgebsel: ['Seifenblasen', 'Sticker', 'kleine Süßigkeit', 'etwas zum Motto'] },
    { id: 'geburtstag', em: '🥂', name: 'Geburtstagsfeier', kinder: false, von: '18:00', bis: '23:00',
      ablauf: [['18:00', 30, '🥂 Empfang & Sekt'], ['18:30', 90, '🍽️ Buffet'], ['20:00', 30, '🎂 Torte, Rede & Anstoßen'], ['20:30', 120, '🎶 Musik, Spiele & Quatschen']],
      aufgaben: [[42, 'Datum und Ort festlegen'], [28, 'Einladungen verschicken'], [14, 'Essen planen (Buffet, Catering, Mitbringliste)'], [7, 'Zusagen nachfragen, Getränke bestellen'], [3, 'Einkauf erledigen'], [1, 'Vorbereiten, Tische stellen'], [0, 'Deko, Musik, Kühlung für Getränke']],
      essen: [['Buffet-Portionen', 'Portionen', 0.6, 1], ['Torte/Kuchen', 'Stück', 1, 1], ['Getränke ohne Alkohol', 'l', 0.6, 0.75], ['Sekt/Wein/Bier', 'l', 0, 0.75], ['Brot & Baguette', 'Stück', 0.1, 0.2]],
      budget: ['Essen', 'Getränke', 'Deko', 'Location/Leihgeräte'], mitgebsel: [] },
    { id: 'grillfest', em: '🔥', name: 'Grillfest', kinder: false, von: '16:00', bis: '22:00',
      ablauf: [['16:00', 60, '👋 Ankommen & Getränke'], ['17:00', 30, '🔥 Grill anheizen'], ['17:30', 90, '🍖 Essen'], ['19:00', 90, '🎯 Spiele (Kubb, Cornhole)'], ['20:30', 60, '🔥 Feuerschale & Stockbrot']],
      aufgaben: [[21, 'Gäste einladen'], [7, 'Mitbringliste abstimmen (Salate, Nachtisch)'], [3, 'Grillgut bestellen/einkaufen, Kohle prüfen'], [1, 'Salate vorbereiten, Getränke kühlen'], [0, 'Sitzplätze, Licht, Mückenschutz']],
      essen: [['Grillwürste', 'Stück', 2, 2.5], ['Steaks/Fleisch', 'Stück', 0, 1], ['Grillgemüse/Halloumi', 'Portionen', 0.5, 0.5], ['Salate', 'Portionen', 0.5, 1], ['Baguette', 'Stück', 0.2, 0.25], ['Getränke', 'l', 0.75, 1.5], ['Grillkohle', 'kg', 0.2, 0.2]],
      budget: ['Grillgut', 'Getränke', 'Kohle & Zubehör'], mitgebsel: [] },
    { id: 'familie', em: '🎄', name: 'Familientreffen', kinder: false, von: '12:00', bis: '18:00',
      ablauf: [['12:00', 90, '🍽️ Mittagessen'], ['13:30', 60, '🚶 Spaziergang'], ['15:00', 60, '☕ Kaffee & Kuchen'], ['16:00', 90, '🎁 Geschenke, Spiele, Erzählen']],
      aufgaben: [[28, 'Termin mit allen abstimmen'], [14, 'Menü planen, wer bringt was mit?'], [7, 'Übernachtung klären (falls nötig)'], [3, 'Einkauf erledigen'], [1, 'Vorkochen, Tisch decken']],
      essen: [['Hauptgericht', 'Portionen', 0.6, 1], ['Kuchen', 'Stück', 1.5, 2], ['Getränke', 'l', 0.6, 1]],
      budget: ['Essen', 'Getränke', 'Geschenke'], mitgebsel: [] },
    { id: 'leer', em: '✨', name: 'Eigenes Fest', kinder: false, von: '', bis: '', ablauf: [], aufgaben: [], essen: [], budget: [], mitgebsel: [] },
  ];

  // ---------- Mottos ----------
  const MOTTOS = [
    { id: '', em: '🎈', name: 'Ohne Motto', intro: '{name} {wird} und möchte das mit dir feiern!', start: 'Hallo, ihr Schatzsucher! Ein Schatz ist versteckt – findet ihr ihn?' },
    { id: 'piraten', em: '🏴‍☠️', name: 'Piraten', intro: 'Ahoi, ihr Landratten! Kapitän {name} {wird} und sucht eine mutige Crew für die große Schatzsuche!', kleidung: 'Piraten-Verkleidung erwünscht – Augenklappen gibt es zur Not an Bord.', start: 'Ahoi, Crew! Käpt’n Blaubart hat seinen Schatz versteckt. Folgt den Hinweisen – aber hütet euch vor Haien!' },
    { id: 'dinos', em: '🦕', name: 'Dinos', intro: 'Rooaar! {name} {wird} und lädt alle Dino-Forscher zu einer Expedition in die Urzeit ein!', kleidung: 'Forscher-Hut oder Dino-Kostüm sind willkommen.', start: 'Achtung, Dino-Forscher! Ein Dino-Ei ist verschwunden. Findet es, bevor die Mama-Dino zurückkommt!' },
    { id: 'detektive', em: '🕵️', name: 'Detektive', intro: 'Streng geheim! Detektiv {name} {wird} und braucht Unterstützung bei einem kniffligen Fall.', kleidung: 'Lupe und Detektiv-Mantel nicht vergessen!', start: 'Streng geheim, Detektive! Der Geburtstagskuchen wurde entführt. Folgt der Spur und löst den Fall!' },
    { id: 'einhorn', em: '🦄', name: 'Einhorn & Glitzer', intro: 'Glitzeralarm! {name} {wird} und lädt dich ins Einhornland ein.', kleidung: 'Glitzer ist ausdrücklich erlaubt.', start: 'Das kleine Einhorn hat seinen Glitzerschatz verloren. Helft ihr ihm, ihn wiederzufinden?' },
    { id: 'weltraum', em: '🚀', name: 'Weltraum', intro: '3 … 2 … 1 … Start! Astronaut/in {name} {wird} und sucht eine Crew für die Reise zu den Sternen.', kleidung: 'Raumanzug optional.', start: 'Bodenstation an Crew: Die Raumkapsel mit den Sternen-Vorräten ist gelandet – findet sie!' },
    { id: 'feuerwehr', em: '🚒', name: 'Feuerwehr', intro: 'Tatü-tata! {name} {wird} – die Feuerwehr braucht dringend Verstärkung!', kleidung: 'Helm und Feuerwehrjacke gerne mitbringen.', start: 'Einsatz für die Kinderfeuerwehr! Folgt den Hinweisen zum Einsatzort.' },
    { id: 'dschungel', em: '🐒', name: 'Dschungel', intro: 'Abenteuer im Dschungel! {name} {wird} und lädt zur großen Expedition ein.', kleidung: 'Tarnfarben oder Tierkostüm erwünscht.', start: 'Die Affen haben die Bananen-Schatzkiste versteckt. Findet sie im Dschungel!' },
    { id: 'ritter', em: '🏰', name: 'Ritter & Burgfräulein', intro: 'Hört, hört! {name} {wird} und lädt alle Ritter und Burgfräulein auf die Burg ein.', kleidung: 'Ritterhelm oder Krone willkommen.', start: 'Der Drache hat den Königsschatz geraubt! Tapfere Ritter, folgt seiner Spur!' },
    { id: 'fussball', em: '⚽', name: 'Fußball', intro: 'Anpfiff! {name} {wird} und stellt das Team für das große Geburtstagsturnier auf.', kleidung: 'Lieblingstrikot und Sportschuhe anziehen.', start: 'Der goldene Pokal ist verschwunden! Trainiert unterwegs und holt ihn euch zurück!' },
    { id: 'meer', em: '🧜', name: 'Unterwasserwelt', intro: 'Abtauchen! {name} {wird} und lädt dich in die Unterwasserwelt ein.', kleidung: 'Meerjungfrau, Taucher oder Fisch – alles ist erlaubt.', start: 'Die Meerjungfrau hat ihre Perlenkiste verloren. Taucht los und findet sie!' },
    { id: 'zauber', em: '🪄', name: 'Zauberschule', intro: 'Simsalabim! {name} {wird} und lädt zur Zauberschule ein.', kleidung: 'Umhang und Zauberstab mitbringen.', start: 'Junge Zauberlehrlinge! Der Zauberstab des Meisters ist verschwunden – folgt den magischen Hinweisen!' },
  ];

  // ---------- Spiele-Sammlung ----------
  // ort: drinnen | draussen | beides; motto: passende Mottos; ruhig: für zwischendurch
  const SPIELE = [
    { id: 'topfschlagen', em: '🍲', name: 'Topfschlagen', min: 3, max: 8, ort: 'beides', dauer: 10, material: 'Topf, Kochlöffel, Augenbinde, kleiner Preis', text: 'Unter einem umgedrehten Topf liegt eine Süßigkeit. Ein Kind bekommt die Augen verbunden und klopft mit dem Kochlöffel auf dem Boden herum. Die anderen rufen „heiß“ oder „kalt“. Wer den Topf trifft, darf den Preis behalten.' },
    { id: 'stopptanz', em: '💃', name: 'Stopptanz', min: 3, max: 10, ort: 'drinnen', dauer: 10, material: 'Musik', text: 'Alle tanzen zur Musik. Stoppt sie, müssen alle sofort einfrieren. Wer wackelt, scheidet aus – bei Kleinen lieber ohne Ausscheiden, stattdessen eine lustige Aufgabe (z. B. wie ein Frosch hüpfen).' },
    { id: 'jerusalem', em: '🪑', name: 'Reise nach Jerusalem', min: 4, max: 10, ort: 'drinnen', dauer: 15, material: 'Stühle (einer weniger als Kinder), Musik', text: 'Die Stühle stehen abwechselnd mit der Lehne nach innen im Kreis. Die Kinder laufen zur Musik herum. Stoppt sie, sucht sich jeder einen Stuhl – wer keinen bekommt, scheidet aus, und ein Stuhl kommt weg.' },
    { id: 'eierlauf', em: '🥄', name: 'Eierlauf', min: 4, max: 10, ort: 'draussen', dauer: 10, material: 'Löffel, gekochte Eier oder Tischtennisbälle', text: 'Jedes Kind balanciert ein Ei auf einem Löffel bis zu einer Markierung und zurück. Fällt es herunter, geht es an der Stelle weiter. Als Staffel in zwei Teams besonders spannend.' },
    { id: 'sackhuepfen', em: '🛍️', name: 'Sackhüpfen', min: 4, max: 10, ort: 'draussen', dauer: 10, material: 'Kartoffelsäcke oder alte Kissenbezüge', text: 'Die Kinder steigen in einen Sack und hüpfen um die Wette bis zum Ziel. Auf weichem Rasen spielen.' },
    { id: 'schokoladenessen', em: '🍫', name: 'Schokoladenessen', min: 5, max: 12, ort: 'drinnen', dauer: 15, material: 'Tafel Schokolade (eingepackt), Messer, Gabel, Mütze, Schal, Handschuhe, Würfel', text: 'Reihum wird gewürfelt. Wer eine 6 hat, zieht schnell Mütze, Schal und Handschuhe an und isst die Schokolade mit Messer und Gabel – bis das nächste Kind eine 6 würfelt.' },
    { id: 'wattepusten', em: '☁️', name: 'Wattepusten', min: 3, max: 8, ort: 'drinnen', dauer: 10, material: 'Wattebausch, Tisch, Strohhalme', text: 'Zwei Teams sitzen sich am Tisch gegenüber und versuchen, einen Wattebausch über die Tischkante der anderen zu pusten. Hände bleiben unter dem Tisch.', ruhig: true },
    { id: 'ballontanz', em: '🎈', name: 'Luftballontanz', min: 4, max: 12, ort: 'beides', dauer: 10, material: 'Luftballons, Musik', text: 'Paare tanzen mit einem Luftballon zwischen den Stirnen (oder Bäuchen). Welches Paar hält seinen Ballon am längsten, ohne die Hände zu benutzen?' },
    { id: 'mumie', em: '🧻', name: 'Mumien wickeln', min: 5, max: 12, ort: 'drinnen', dauer: 10, material: 'Klopapier (1 Rolle pro Team)', text: 'In Teams wird je ein Kind so schnell wie möglich mit Klopapier zur Mumie gewickelt. Die schönste oder schnellste Mumie gewinnt.' },
    { id: 'pantomime', em: '🎭', name: 'Pantomime', min: 6, max: 99, ort: 'drinnen', dauer: 15, material: 'Zettel mit Begriffen (Tiere, Berufe, Sportarten)', text: 'Ein Kind zieht einen Begriff und stellt ihn ohne Worte dar. Wer ihn zuerst errät, ist als Nächstes dran.' },
    { id: 'fluesterpost', em: '👂', name: 'Flüsterpost', min: 5, max: 12, ort: 'drinnen', dauer: 10, material: '–', text: 'Alle sitzen im Kreis. Das erste Kind flüstert einen Satz ins Ohr des Nachbarn, der flüstert weiter. Das letzte Kind sagt laut, was angekommen ist.', ruhig: true },
    { id: 'koffer', em: '🧳', name: 'Ich packe meinen Koffer', min: 6, max: 14, ort: 'drinnen', dauer: 10, material: '–', text: '„Ich packe meinen Koffer und nehme mit …“ – jedes Kind wiederholt alle bisherigen Dinge und fügt eins hinzu.', ruhig: true },
    { id: 'ichsehewas', em: '👀', name: 'Ich sehe was, was du nicht siehst', min: 3, max: 7, ort: 'beides', dauer: 10, material: '–', text: 'Ein Kind sucht sich etwas aus und nennt die Farbe. Die anderen raten.', ruhig: true },
    { id: 'dosenwerfen', em: '🥫', name: 'Dosenwerfen', min: 4, max: 12, ort: 'draussen', dauer: 15, material: '6–10 leere Dosen, 3 Bälle', text: 'Dosen zur Pyramide stapeln. Jedes Kind hat drei Würfe – wie viele Dosen fallen? Abstand nach Alter anpassen.' },
    { id: 'wasserstaffel', em: '💦', name: 'Wasserstaffel', min: 5, max: 12, ort: 'draussen', dauer: 15, material: 'Becher, Schwämme, 2 Eimer pro Team', text: 'Teams transportieren mit Schwamm oder Becher Wasser von einem vollen in einen leeren Eimer. Welches Team hat nach 3 Minuten mehr? Nur bei warmem Wetter.' },
    { id: 'tauziehen', em: '🪢', name: 'Tauziehen', min: 6, max: 99, ort: 'draussen', dauer: 10, material: 'Dickes Seil, Markierung in der Mitte', text: 'Zwei Teams ziehen an den Enden eines Seils. Wer das andere Team über die Mittellinie zieht, gewinnt. Auf Rasen spielen, Hände nicht ums Seil wickeln.' },
    { id: 'blindekuh', em: '🙈', name: 'Blinde Kuh', min: 4, max: 10, ort: 'beides', dauer: 10, material: 'Augenbinde', text: 'Ein Kind hat die Augen verbunden und versucht, die anderen zu fangen und durch Tasten zu erraten. Stolperfallen vorher wegräumen.' },
    { id: 'feuerwasser', em: '🌊', name: 'Feuer, Wasser, Sturm', min: 4, max: 10, ort: 'beides', dauer: 10, material: 'Musik', text: 'Alle laufen zur Musik. Bei „Feuer“ in eine Ecke, bei „Wasser“ auf einen Stuhl/Erhöhung, bei „Sturm“ flach auf den Boden. Wer zuletzt reagiert, macht die nächste Ansage.' },
    { id: 'goldsuche', em: '🪙', name: 'Goldsuche im Sand', min: 3, max: 6, ort: 'draussen', dauer: 15, material: 'Sandkasten, Schokotaler, Schaufeln, Siebe', text: 'Im Sandkasten sind Schokotaler vergraben. Mit Schaufeln und Sieben suchen die Kleinen nach dem Gold.', motto: ['piraten', 'dinos'] },
    { id: 'kim', em: '🧠', name: 'Kim-Spiel (Merkspiel)', min: 6, max: 12, ort: 'drinnen', dauer: 10, material: 'Tablett, 10–15 Gegenstände, Tuch', text: 'Alle schauen sich eine Minute die Gegenstände an. Dann wird das Tablett abgedeckt und etwas weggenommen – was fehlt?', ruhig: true, motto: ['detektive'] },
    { id: 'fuehlsack', em: '🫳', name: 'Fühlsack', min: 4, max: 10, ort: 'drinnen', dauer: 10, material: 'Stoffbeutel, Alltagsgegenstände', text: 'Im Beutel sind Gegenstände versteckt. Wer errät durch Tasten, was es ist?', ruhig: true },
    { id: 'zeitungstanz', em: '📰', name: 'Zeitungstanz', min: 6, max: 14, ort: 'drinnen', dauer: 10, material: 'Zeitungen, Musik', text: 'Paare tanzen auf einer Zeitungsseite. Stoppt die Musik, wird die Zeitung gefaltet. Wer den Boden berührt, scheidet aus.' },
    { id: 'mehlschneiden', em: '🍰', name: 'Mehlschneiden', min: 6, max: 14, ort: 'drinnen', dauer: 10, material: 'Mehl, Teller, Messer, Gummibärchen', text: 'Mehl wird zu einem festen „Kuchen“ gestürzt, oben liegt ein Gummibärchen. Reihum schneidet jeder ein Stück ab. Bei wem das Bärchen fällt, muss es ohne Hände aus dem Mehl holen.' },
    { id: 'limbo', em: '🎵', name: 'Limbo', min: 5, max: 99, ort: 'beides', dauer: 10, material: 'Besenstiel oder Seil, Musik', text: 'Alle tanzen nacheinander unter der Stange durch, ohne sie zu berühren. Nach jeder Runde geht sie tiefer.' },
    { id: 'staffel', em: '🏃', name: 'Staffellauf', min: 5, max: 12, ort: 'draussen', dauer: 15, material: 'Hütchen, Staffelstab', text: 'Zwei Teams laufen abwechselnd zu einem Hütchen und zurück. Varianten: rückwärts, auf einem Bein, als Schubkarre.' },
    { id: 'parcours', em: '🧗', name: 'Hindernisparcours', min: 4, max: 12, ort: 'draussen', dauer: 20, material: 'Reifen, Seile, Kissen, Eimer, Bälle', text: 'Aus Gartenstühlen, Reifen und Seilen einen Parcours bauen. Jedes Kind läuft auf Zeit – oder alle zusammen ohne Zeit für die Kleinen.' },
    { id: 'waescheklammern', em: '📎', name: 'Wäscheklammern klauen', min: 5, max: 12, ort: 'beides', dauer: 10, material: 'Wäscheklammern (5 pro Kind)', text: 'Jedes Kind steckt sich Klammern an die Kleidung und versucht, den anderen ihre abzunehmen. Wer am Ende die meisten hat, gewinnt.' },
    { id: 'blindmalen', em: '🖍️', name: 'Malen mit verbundenen Augen', min: 5, max: 12, ort: 'drinnen', dauer: 10, material: 'Papier, Stifte, Augenbinde', text: 'Ein Begriff wird genannt (z. B. Haus, Katze) und alle malen ihn mit verbundenen Augen. Die Ergebnisse sorgen für viel Gelächter.', ruhig: true },
    { id: 'werbinich', em: '🏷️', name: 'Wer bin ich?', min: 8, max: 99, ort: 'drinnen', dauer: 15, material: 'Post-its, Stift', text: 'Jeder bekommt einen Zettel mit einer Figur oder einem Tier auf die Stirn und muss durch Ja/Nein-Fragen herausfinden, wer er ist.', ruhig: true },
    { id: 'montagsmaler', em: '🎨', name: 'Montagsmaler', min: 7, max: 99, ort: 'drinnen', dauer: 15, material: 'Papier oder Tafel, Stifte, Begriffe', text: 'Ein Kind malt einen Begriff, das eigene Team rät. Pro Begriff eine Minute Zeit.' },
    { id: 'pinata', em: '🪅', name: 'Piñata', min: 4, max: 12, ort: 'draussen', dauer: 15, material: 'Piñata, Stock, Augenbinde, Süßigkeiten', text: 'Die Piñata hängt am Ast. Die Kinder schlagen nacheinander mit verbundenen Augen dagegen, bis die Süßigkeiten herausfallen. Großen Abstand für die anderen markieren!' },
    { id: 'seifenblasen', em: '🫧', name: 'Seifenblasen fangen', min: 2, max: 5, ort: 'draussen', dauer: 10, material: 'Seifenblasen', text: 'Ein Erwachsener pustet Seifenblasen, die Kleinen fangen und zerplatzen sie – ganz ohne Gewinner.' },
    { id: 'muffins', em: '🧁', name: 'Muffins verzieren', min: 4, max: 12, ort: 'drinnen', dauer: 20, material: 'Muffins, Zuckerguss, Streusel, Smarties', text: 'Jedes Kind verziert seinen eigenen Muffin – gleichzeitig Programmpunkt und Nachtisch.', ruhig: true },
    { id: 'fingerabdruck', em: '🔍', name: 'Fingerabdruck-Detektive', min: 7, max: 12, ort: 'drinnen', dauer: 15, material: 'Stempelkissen, Papier, Lupen', text: 'Alle nehmen ihre Fingerabdrücke. Dann gibt es einen „Tatort“-Abdruck – wessen Finger war das? Die Lupe hilft.', motto: ['detektive'] },
    { id: 'dinoeier', em: '🥚', name: 'Dino-Eier ausgraben', min: 4, max: 9, ort: 'draussen', dauer: 20, material: 'Eier aus Gips oder Sand mit kleiner Dino-Figur, Pinsel, Löffel', text: 'Wie echte Forscher klopfen und pinseln die Kinder ihre Dino-Eier frei. Die Figur darf mit nach Hause.', motto: ['dinos'] },
    { id: 'kanonen', em: '🏴‍☠️', name: 'Kanonenkugel-Zielwerfen', min: 4, max: 10, ort: 'draussen', dauer: 10, material: 'Bälle, Karton als Piratenschiff', text: 'Ein Karton-Piratenschiff steht in einigen Metern Abstand. Wer versenkt es mit den meisten Treffern?', motto: ['piraten'] },
    { id: 'rakete', em: '🚀', name: 'Luftballon-Raketen', min: 6, max: 12, ort: 'beides', dauer: 15, material: 'Ballons, lange Schnur, Strohhalme, Klebeband', text: 'Eine Schnur wird durch einen Strohhalm gespannt, ein aufgeblasener Ballon daran geklebt und losgelassen. Wessen Rakete fliegt am weitesten?', motto: ['weltraum'] },
    { id: 'zauberstab', em: '🪄', name: 'Zauberstäbe basteln', min: 4, max: 10, ort: 'drinnen', dauer: 20, material: 'Holzstäbe, Bänder, Sticker, Glitzer', text: 'Jedes Kind gestaltet seinen eigenen Zauberstab – perfekt auch als Mitgebsel.', ruhig: true, motto: ['zauber', 'einhorn'] },
    { id: 'elfmeter', em: '⚽', name: 'Elfmeterschießen', min: 5, max: 99, ort: 'draussen', dauer: 15, material: 'Ball, Tor', text: 'Jeder schießt drei Elfmeter, abwechselnd steht jemand im Tor. Kleine Kinder bekommen einen kürzeren Abstand.', motto: ['fussball'] },
    { id: 'spritzen', em: '🚒', name: 'Feuerwehr-Zielspritzen', min: 4, max: 10, ort: 'draussen', dauer: 15, material: 'Spritzflaschen, Plastikbecher oder Dosen', text: 'Auf einem Brett stehen Becher. Mit Spritzflaschen „löschen“ die Kinder das Feuer, indem sie die Becher umspritzen.', motto: ['feuerwehr'] },
    { id: 'quiz', em: '🎤', name: 'Quiz über das Geburtstagskind', min: 8, max: 99, ort: 'drinnen', dauer: 20, material: 'Fragen auf Karten, Stift, Papier', text: 'Fragen über das Geburtstagskind: Lieblingsessen, peinlichste Geschichte, erstes Auto … Wer kennt es am besten?' },
    { id: 'kubb', em: '🪵', name: 'Kubb (Wikingerschach)', min: 7, max: 99, ort: 'draussen', dauer: 30, material: 'Kubb-Spiel', text: 'Zwei Teams werfen mit Holzstäben die Klötze des Gegners um und zum Schluss den König. Ideal für Rasen und gemischte Altersgruppen.' },
    { id: 'cornhole', em: '🎯', name: 'Cornhole', min: 6, max: 99, ort: 'draussen', dauer: 20, material: 'Cornhole-Bretter, Säckchen', text: 'Säckchen auf das schräge Brett werfen: auf dem Brett 1 Punkt, im Loch 3 Punkte. Wer zuerst 21 hat, gewinnt.' },
    { id: 'stockbrot', em: '🔥', name: 'Stockbrot am Feuer', min: 4, max: 99, ort: 'draussen', dauer: 30, material: 'Feuerschale, Teig, Stöcke', text: 'Teig um einen Stock wickeln und über der Glut (nicht in der Flamme) drehen, bis er goldbraun ist. Erwachsene beaufsichtigen das Feuer.', ruhig: true },
  ];

  // ---------- Schnitzeljagd: Aufgaben-Ideen ----------
  const AUFGABEN = [
    { text: 'Findet 5 Dinge, die rot sind, und bringt sie mit.', min: 3, max: 8 },
    { text: 'Singt gemeinsam ganz laut „Happy Birthday“.', min: 3, max: 8 },
    { text: 'Hüpft auf einem Bein bis zum nächsten Baum.', min: 4, max: 9 },
    { text: 'Balanciert ein Ei auf dem Löffel bis zur Markierung.', min: 4, max: 9 },
    { text: 'Trefft dreimal mit dem Ball in den Eimer.', min: 4, max: 10 },
    { text: 'Sammelt 10 Blätter, Steine oder Tannenzapfen.', min: 4, max: 10 },
    { text: 'Ertastet im Fühlsack drei Gegenstände.', min: 4, max: 9 },
    { text: 'Jedes Kind macht ein Tier vor – die anderen raten.', min: 4, max: 10 },
    { text: 'Geht 20 Schritte rückwärts, ohne euch umzudrehen.', min: 5, max: 10 },
    { text: 'Stellt euch der Größe nach auf – ohne zu sprechen!', min: 6, max: 12 },
    { text: 'Rätsel: Was hat Zähne, kann aber nicht beißen? (Lösung: der Kamm)', min: 6, max: 12 },
    { text: 'Rätsel: Was läuft, hat aber keine Beine? (Lösung: Wasser, die Nase, die Uhr)', min: 6, max: 12 },
    { text: 'Rätsel: Je mehr man wegnimmt, desto größer wird es. Was ist das? (Lösung: ein Loch)', min: 8, max: 14 },
    { text: 'Rätsel: Was gehört dir, wird aber von anderen öfter benutzt als von dir? (Lösung: dein Name)', min: 9, max: 14 },
    { text: 'Merkt euch 10 Sekunden lang alles auf dem Tablett – was fehlt danach?', min: 6, max: 12 },
    { text: 'Zählt alle Fenster am Haus. Die Zahl öffnet das Zahlenschloss!', min: 7, max: 14 },
    { text: 'Bildet mit euren Körpern den Anfangsbuchstaben des Geburtstagskinds.', min: 7, max: 14 },
    { text: 'Baut eine Menschenpyramide oder macht ein verrücktes Gruppenfoto.', min: 7, max: 14 },
    { text: 'Dichtet einen Vierzeiler für das Geburtstagskind.', min: 9, max: 14 },
    { text: 'Findet den versteckten Umschlag – die Erwachsenen sagen nur „heiß“ oder „kalt“.', min: 3, max: 7 },
    { text: 'Schwört den Piratenschwur: „Arrr – wir teilen jede Beute!“', min: 4, max: 10, motto: 'piraten' },
    { text: 'Grabt im Sand nach dem Dino-Knochen.', min: 3, max: 8, motto: 'dinos' },
    { text: 'Nehmt von allen Detektiven die Fingerabdrücke.', min: 6, max: 12, motto: 'detektive' },
    { text: 'Countdown von 10 rückwärts – und dann ein Raketen-Sprung!', min: 3, max: 8, motto: 'weltraum' },
    { text: 'Löscht das „Feuer“: Spritzt mit der Wasserflasche drei Becher um.', min: 4, max: 10, motto: 'feuerwehr' },
    { text: 'Sprecht gemeinsam einen Zauberspruch – je lauter, desto besser!', min: 4, max: 10, motto: 'zauber' },
  ];

  // ---------- Rätsel ----------
  const RAETSEL = {
    bild: { name: '🖼️ Bilderrätsel', anleitung: 'Wo ist das? Lauft hin!', stufe: 'klein' },
    vorlesen: { name: '📣 Zum Vorlesen', anleitung: 'Ein Erwachsener liest vor:', stufe: 'klein' },
    rueckwaerts: { name: '🔄 Rückwärts', anleitung: 'Lest den Hinweis von hinten nach vorn!', stufe: 'mittel' },
    salat: { name: '🥗 Buchstabensalat', anleitung: 'Bringt die Buchstaben jedes Wortes in die richtige Reihenfolge!', stufe: 'mittel' },
    zahlen: { name: '🔢 Zahlencode', anleitung: 'Jede Zahl ist ein Buchstabe (A = 1, B = 2 …). Die Code-Tabelle hilft!', stufe: 'mittel' },
    rechnen: { name: '➕ Rechenrätsel', anleitung: 'Rechnet jede Aufgabe aus – das Ergebnis ist ein Buchstabe (A = 1, B = 2 …).', stufe: 'gross' },
    symbol: { name: '🔣 Geheimschrift', anleitung: 'Entschlüsselt die Zeichen mit der Geheimcode-Tabelle!', stufe: 'gross' },
    spiegel: { name: '🪞 Spiegelschrift', anleitung: 'Haltet die Karte vor einen Spiegel!', stufe: 'gross' },
  };
  const STUFEN = {
    klein: { name: 'Klein (bis 6 Jahre)', folge: ['bild', 'bild', 'vorlesen'] },
    mittel: { name: 'Mittel (7–9 Jahre)', folge: ['rueckwaerts', 'salat', 'zahlen'] },
    gross: { name: 'Groß (ab 10 Jahren)', folge: ['symbol', 'rechnen', 'spiegel', 'zahlen', 'salat'] },
  };
  function stufeFuerAlter(alter) { const a = Number(alter) || 0; return !a ? 'mittel' : a <= 6 ? 'klein' : a <= 9 ? 'mittel' : 'gross'; }

  const SYMBOLE = ['☀', '☂', '☃', '★', '♠', '♣', '♥', '♦', '♪', '✿', '☘', '⚓', '⚡', '✈', '☎', '✂', '✉', '⌛', '☕', '♛', '✪', '❄', '☯', '✎', '♞', '☁'];
  const ORT_BILDER = [
    [/rutsch/, '🛝'], [/schaukel|spielplatz/, '🎠'], [/trampolin/, '🤸'], [/sandkast/, '🏖️'], [/baum|ast\b/, '🌳'], [/busch|hecke|strauch/, '🌿'],
    [/blume|beet/, '🌷'], [/blumentopf|pflanze|topf/, '🪴'], [/briefkast/, '📬'], [/fahrrad|rad\b/, '🚲'], [/auto|garage/, '🚗'], [/mülltonne|tonne|müll/, '🗑️'],
    [/kühlschrank/, '🧊'], [/badewanne|bad\b|dusche/, '🛁'], [/toilette|klo/, '🚽'], [/wäsche|waschmasch/, '🧺'], [/kuschel|teddy|spielzeug/, '🧸'],
    [/kiste|karton|box/, '📦'], [/ball/, '⚽'], [/zelt/, '⛺'], [/gartenhaus|hütte|schuppen/, '🛖'], [/treppe|leiter/, '🪜'], [/fenster/, '🪟'],
    [/uhr/, '🕰️'], [/buch|regal/, '📚'], [/lampe|licht/, '💡'], [/bett/, '🛏️'], [/sofa|couch/, '🛋️'], [/tisch|stuhl|bank/, '🪑'], [/tür/, '🚪'],
    [/eimer/, '🪣'], [/gießkanne/, '🚿'], [/schuh/, '👟'], [/jacke|garderobe/, '🧥'], [/tor\b/, '🥅'], [/zaun/, '🚧'], [/stein/, '🪨'], [/brunnen|teich/, '⛲'],
    [/ofen|herd|küche/, '🍳'], [/haus/, '🏠'],
  ];
  function ortBild(ort) { const o = String(ort || '').toLowerCase(); for (const [re, em] of ORT_BILDER) if (re.test(o)) return em; return '🔍'; }

  function grossbuchstaben(t) { return String(t || '').toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS'); }
  function zufall(seed) { let s = 0; for (let i = 0; i < seed.length; i++) s = (Math.imul(s, 31) + seed.charCodeAt(i)) | 0; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) | 0; return ((s >>> 0) % 10000) / 10000; }; }
  // Liefert { text, spiegel, code } – code: welche Tabelle ausgedruckt werden muss ('zahlen' | 'symbol' | '')
  function kodieren(art, text, seed) {
    text = String(text || '').trim();
    const r = zufall(String(seed || text));
    if (art === 'rueckwaerts') return { text: Array.from(text).reverse().join(''), code: '' };
    if (art === 'salat') return { text: text.split(/\s+/).map(w => { const z = Array.from(w); if (z.length < 3) return w.toUpperCase(); let neu = w, n = 0; while (neu === w && n++ < 8) { for (let i = z.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [z[i], z[j]] = [z[j], z[i]]; } neu = z.join(''); } return neu.toUpperCase(); }).join('  '), code: '' };
    const gross = grossbuchstaben(text);
    if (art === 'zahlen') return { text: gross.split(/\s+/).map(w => Array.from(w).map(c => /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 64) : c).join('-')).join('  /  '), code: 'zahlen' };
    if (art === 'rechnen') return { text: gross.split(/\s+/).map(w => Array.from(w).map(c => { if (!/[A-Z]/.test(c)) return c; const n = c.charCodeAt(0) - 64; if (n < 3) return String(n); const a = 1 + Math.floor(r() * (n - 1)); return a + '+' + (n - a); }).join(' · ')).join('   /   '), code: 'zahlen' };
    if (art === 'symbol') return { text: gross.split(/\s+/).map(w => Array.from(w).map(c => /[A-Z]/.test(c) ? SYMBOLE[c.charCodeAt(0) - 65] : c).join(' ')).join('    '), code: 'symbol' };
    if (art === 'spiegel') return { text, spiegel: true, code: '' };
    return { text, code: '' };
  }

  function art(id) { return ARTEN.find(a => a.id === id) || ARTEN[ARTEN.length - 1]; }
  function motto(id) { return MOTTOS.find(m => m.id === (id || '')) || MOTTOS[0]; }

  return { ARTEN, MOTTOS, SPIELE, AUFGABEN, RAETSEL, STUFEN, SYMBOLE, art, motto, stufeFuerAlter, ortBild, kodieren, grossbuchstaben };
});
