// ============================================================
// Familienplaner – Erinnerungen per Push (auch bei geschlossener App)
// Läuft alle 5 Minuten, schaut für jedes angemeldete Gerät nach fälligen
// Erinnerungen (Termine, Medikamente, Wasser) und schickt sie über Firebase
// Cloud Messaging. Jede Erinnerung geht pro Gerät nur einmal raus.
//
// Außerdem (weiter unten):
//   sonntagsbrief  – sonntags 18 Uhr ein Wochenüberblick aufs Handy
//   kalender       – Termine als Kalender-Abo (ICS) für Google/Apple/Outlook
//   rezeptImport   – liest ein Rezept von einer Webseite (schema.org/Recipe)
//   chatPush       – Benachrichtigung bei neuen Nachrichten im Familien-Chat
//   Garten (in „erinnerungen“): Frost um 18 Uhr, Hitze morgens, Monatsvorschau am 1.
//
// Datenquellen (wie von der App synchronisiert):
//   planerFamilien/{familie}/daten/termine     → werte.termine_events_v1
//   planerFamilien/{familie}/daten/gesundheit  → werte.gesundheit_medikamente, werte.gesundheit_medErledigt
//   planerFamilien/{familie}/daten/garten      → werte.garten_pushPlan (von der Garten-App berechneter Auszug)
//   planerFamilien/{familie}/geraete/{gerät}   → Token + Einstellungen des Geräts (von der App angelegt)
// ============================================================
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const dns = require('node:dns').promises;
const net = require('node:net');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const TerminLogik = require('./terminlogik'); // gleiche Datei wie terminlogik.js in der App

initializeApp();

const FENSTER_MIN = 10; // so lange nach der Zielzeit darf eine Erinnerung noch rausgehen (Lauf alle 5 Min.)

// --- Datum/Zeit in der Zeitzone des Geräts ---
function lokaleZeit(zeitzone) {
  const teile = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zeitzone || 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).forEach(p => { teile[p.type] = p.value; });
  return { datum: `${teile.year}-${teile.month}-${teile.day}`, minuten: Number(teile.hour) * 60 + Number(teile.minute) };
}
function hhmmZuMinuten(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function tageZwischen(vonISO, bisISO) {
  const u = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((u(bisISO) - u(vonISO)) / 86400000);
}
function isoPlusTage(iso, tage) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + tage)).toISOString().slice(0, 10);
}
function isoPlusMonate(iso, monate) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + monate, d)).toISOString().slice(0, 10);
}
const WARTUNG_MONATE = { monatlich: 1, vierteljaehrlich: 3, halbjaehrlich: 6, jaehrlich: 12 };
function minutenZuHHMM(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }

// Beginnt ein Termin (ggf. wiederkehrend, mit Ausnahmen) an diesem Datum? Gleiche Regeln wie in der App (terminlogik.js).
function terminAmTag(ev, datumISO) {
  return TerminLogik.startetAm(ev, datumISO);
}

// Liefert alle jetzt fälligen Erinnerungen für ein Gerät
function faelligeErinnerungen(geraet, daten) {
  const { datum, minuten } = lokaleZeit(geraet.zeitzone);
  const imFenster = (ziel) => ziel !== null && ziel <= minuten && minuten - ziel < FENSTER_MIN;
  const liste = [];

  // Termine: wie in der App zur Startzeit minus "Erinnerung"-Vorlauf
  if (geraet.termine === 'meine' || geraet.termine === 'alle') {
    (daten.termine || []).forEach(ev => {
      if (!ev || !ev.date) return;
      if (geraet.termine === 'meine' && ev.wer !== geraet.person && ev.wer !== 'familie') return;
      // Ganztägige nur mit ausdrücklicher Erinnerung (sonst über „ganztaegig“ unten)
      if ((ev.allDay || !ev.startTime) && !ev.erinnerungVorabend && !(Number(ev.erinnerung) > 0)) return;
      if (!ev.allDay && ev.startTime && !ev.erinnerungVorabend && !(Number(ev.erinnerung) > 0)) {
        // Ohne Vorlauf: zur Startzeit (wie bisher)
        if (!terminAmTag(ev, datum)) return;
        const start = hhmmZuMinuten(ev.startTime);
        if (start === null || !imFenster(start)) return;
        liste.push({ schluessel: `t_${ev.id}_${datum}_${start}`, titel: '🗓️ ' + (ev.title || 'Termin'), text: `jetzt (${ev.startTime} Uhr)` + (ev.location ? ' · ' + ev.location : ''), seite: 'termine' });
        return;
      }
      // Mit Vorlauf – auch über Tagesgrenzen (1 Tag, 2 Tage, 1 Woche) und „am Vorabend“
      TerminLogik.erinnerungenAm(ev, datum).forEach(er => {
        if (!imFenster(er.minuten)) return;
        liste.push({
          schluessel: `t_${ev.id}_${er.vorkommen}_${er.minuten}`,
          titel: '🗓️ ' + (ev.title || 'Termin'),
          text: TerminLogik.vorlaufText(ev, er.tageVorher) + (ev.location ? ' · ' + ev.location : ''),
          seite: 'termine',
        });
      });
    });
  }

  // Medikamente der Person dieses Geräts (nur mit Uhrzeit, noch nicht abgehakt)
  if (geraet.medikamente && geraet.person) {
    (daten.medikamente || []).forEach(m => {
      if (!m || m.person !== geraet.person || !m.zeit || m.terminErinnerungId) return;
      if ((daten.medErledigt || {})[`${datum}|${m.person}|${m.id}`]) return;
      const ziel = hhmmZuMinuten(m.zeit);
      if (!imFenster(ziel)) return;
      liste.push({ schluessel: `m_${m.id}_${ziel}`, titel: '💊 ' + (m.name || 'Medikament'), text: m.hinweis || 'Zeit für dein Medikament/Vitamin.', seite: 'gesundheit' });
    });
  }

  // Wasser: Uhrzeiten werden pro Gerät in der App eingestellt
  if (geraet.wasser && geraet.wasser.aktiv) {
    (geraet.wasser.zeiten || []).forEach(z => {
      const ziel = hhmmZuMinuten(z);
      if (!imFenster(ziel)) return;
      liste.push({ schluessel: `w_${ziel}`, titel: '💧 Zeit zu trinken!', text: 'Erinnerung aus deinem Gesundheit-Tagebuch.', seite: 'gesundheit' });
    });
  }
  // ---- Tages-Erinnerungen (zur eingestellten Morgen-Uhrzeit des Geräts, Standard 08:00) ----
  const tagesZiel = hhmmZuMinuten(geraet.tagesZeit || '08:00');
  const fuerMich = (wer) => geraet.termine === 'alle' || wer === geraet.person || wer === 'familie' || !wer;

  // Ganztägige Termine wie Geburtstage: am Tag morgens, optional zusätzlich am Vorabend um 18 Uhr
  if (geraet.ganztaegig === 'tag' || geraet.ganztaegig === 'vortag') {
    const morgen = isoPlusTage(datum, 1);
    (daten.termine || []).forEach(ev => {
      if (!ev || !ev.allDay || !fuerMich(ev.wer)) return;
      if (terminAmTag(ev, datum) && imFenster(tagesZiel)) {
        liste.push({ schluessel: `g_${ev.id}`, titel: '📅 Heute: ' + (TerminLogik.titelMitAlter(ev, datum) || 'Termin'), text: ev.notes ? String(ev.notes).slice(0, 120) : 'Ganztägiger Termin', seite: 'termine' });
      }
      if (geraet.ganztaegig === 'vortag' && terminAmTag(ev, morgen) && imFenster(18 * 60)) {
        liste.push({ schluessel: `gv_${ev.id}`, titel: '📅 Morgen: ' + (ev.title || 'Termin'), text: 'Kleine Vorab-Erinnerung für morgen.', seite: 'termine' });
      }
    });
  }

  // Vorrat: 3 Tage vorher, 1 Tag vorher und am Tag – zusammengefasst in einer Nachricht
  if (geraet.vorrat && imFenster(tagesZiel)) {
    const bald = [];
    (daten.vorrat || []).forEach(it => {
      const bis = it && (it.verfallsdatum || it.aufbrauchenBis);
      if (!bis || it.bestand === 'leer') return;
      const tage = tageZwischen(datum, bis);
      if (tage === 0 || tage === 1 || tage === 3) bald.push({ name: it.name || 'Artikel', tage });
    });
    if (bald.length) {
      bald.sort((a, b) => a.tage - b.tage);
      const text = bald.map(b => b.name + ' (' + (b.tage === 0 ? 'heute' : b.tage === 1 ? 'morgen' : 'in 3 Tagen') + ')').join(', ');
      liste.push({ schluessel: 'vorrat', titel: '🥫 Bald ablaufend', text: text.slice(0, 180), seite: 'vorratskammer' });
    }
  }

  // Wartung: am Fälligkeitstag und danach wöchentlich, solange nicht erledigt
  if (geraet.wartung && imFenster(tagesZiel)) {
    const faellig = [];
    (daten.wartung || []).forEach(w => {
      if (!w || w.pausiert || w.turnus === 'einmalig') return;
      const erledigt = w.erledigt || [];
      const letzte = erledigt.length ? erledigt[erledigt.length - 1] : null;
      let faelligAm;
      if (w.monat && (w.turnus === 'jaehrlich' || w.turnus === 'halbjaehrlich')) {
        // Saison-Aufgabe: fällig ab dem 1. des Monats (halbjährlich zusätzlich 6 Monate später)
        const monate = w.turnus === 'halbjaehrlich' ? [w.monat, ((w.monat + 5) % 12) + 1] : [w.monat];
        const jahr = Number(datum.slice(0, 4));
        let start = null;
        [jahr - 1, jahr].forEach(j => monate.forEach(m => { const iso = j + '-' + String(m).padStart(2, '0') + '-01'; if (iso <= datum && (!start || iso > start)) start = iso; }));
        if (!start) return;
        const toleranz = isoPlusMonate(start, -1);
        if (letzte && letzte.datum && String(letzte.datum).slice(0, 10) >= toleranz) return; // schon erledigt
        if (!letzte && tageZwischen(start, datum) > 92) return; // neu angelegt: erst ab der nächsten Saison
        faelligAm = start;
      } else {
        if (!letzte || !letzte.datum) return; // ohne bisherige Erledigung gibt es kein Fälligkeitsdatum
        faelligAm = isoPlusMonate(letzte.datum, WARTUNG_MONATE[w.turnus] || 1);
      }
      const ueber = tageZwischen(faelligAm, datum);
      if (ueber < 0 || ueber % 7 !== 0) return;
      let zustaendig = null;
      if (w.zuweisung === 'fest') zustaendig = w.person || null;
      if (w.zuweisung === 'rotation' && (w.rotationPersonen || []).length) zustaendig = w.rotationPersonen[(w.rotationIndex || 0) % w.rotationPersonen.length];
      if (zustaendig && zustaendig !== geraet.person) return;
      faellig.push((w.icon ? w.icon + ' ' : '') + (w.titel || 'Wartung') + (ueber ? ' (seit ' + ueber + ' Tagen)' : ''));
    });
    if (faellig.length) liste.push({ schluessel: 'wartung', titel: '🔁 Wartung fällig', text: faellig.join(', ').slice(0, 180), seite: 'handwerk' });
  }

  return liste.map(e => Object.assign(e, { datum, uhrzeit: minutenZuHHMM(minuten) }));
}

// ============================================================
// 🌱 GARTEN – Frost, Hitze und Monatsvorschau
// Die Garten-App legt einen kleinen „Push-Plan“ ab (werte.garten_pushPlan):
//   { gaerten: [{ name, lat, lon, pflanzen, frost: [{ n: 'Tomate', ab: 'JJJJ-MM-TT'|null }] }],
//     monate: { 'JJJJ-MM': { vorziehen: [], direktsaat: [], auspflanzen: [], schneiden: [] } } }
// Das Wetter kommt von Open-Meteo (kostenlos, ohne Schlüssel) – nur in den Minuten, in denen
// wirklich ein Garten-Hinweis fällig sein kann.
// ============================================================
const FROST_GRENZE = 1;   // °C Tiefstwert in der kommenden Nacht
const HITZE_GRENZE = 30;  // °C Höchstwert heute
const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
function gradText(t) { return (Math.round(t * 10) / 10).toString().replace('.', ',').replace('-', '−') + ' °C'; }
function listeKurz(namen, max) { return namen.slice(0, max).join(', ') + (namen.length > max ? ' …' : ''); }
// Merkt sich das Wetter je Standort für einen Lauf (mehrere Geräte, ein Abruf)
function wetterHolerErzeugen() {
  const cache = new Map();
  return (lat, lon) => {
    const k = lat + ',' + lon;
    if (!cache.has(k)) {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) +
        '&daily=temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=2';
      cache.set(k, fetch(url, { signal: AbortSignal.timeout(8000) })
        .then(a => (a.ok ? a.json() : null))
        .then(j => (j && j.daily && Array.isArray(j.daily.temperature_2m_min) ? { min: j.daily.temperature_2m_min, max: j.daily.temperature_2m_max } : null))
        .catch(err => { console.warn('Wetter', k, err && err.message); return null; }));
    }
    return cache.get(k);
  };
}
// Ist für dieses Gerät gerade ein Garten-Hinweis möglich? (spart Lesen und Wetterabruf)
function gartenFensterOffen(geraet) {
  if (geraet.garten === false) return false;
  const { datum, minuten } = lokaleZeit(geraet.zeitzone);
  const imFenster = (ziel) => ziel !== null && ziel <= minuten && minuten - ziel < FENSTER_MIN;
  const tagesZiel = hhmmZuMinuten(geraet.tagesZeit || '08:00');
  return imFenster(18 * 60) || imFenster(tagesZiel) || (datum.endsWith('-01') && imFenster(tagesZiel));
}
async function gartenErinnerungen(geraet, plan, wetterHolen) {
  if (geraet.garten === false || !plan || !Array.isArray(plan.gaerten)) return [];
  const { datum, minuten } = lokaleZeit(geraet.zeitzone);
  const imFenster = (ziel) => ziel !== null && ziel <= minuten && minuten - ziel < FENSTER_MIN;
  const tagesZiel = hhmmZuMinuten(geraet.tagesZeit || '08:00');
  const mehrere = plan.gaerten.length > 1;
  const liste = [];
  // ❄️ Frost: abends um 18 Uhr, wenn die kommende Nacht frostig wird und Frostempfindliches draußen steht
  if (imFenster(18 * 60)) {
    const morgen = isoPlusTage(datum, 1);
    for (let i = 0; i < plan.gaerten.length; i++) {
      const g = plan.gaerten[i];
      const betroffen = (g.frost || []).filter(f => f && f.n && (!f.ab || f.ab <= morgen)).map(f => f.n);
      if (!betroffen.length) continue;
      const w = await wetterHolen(g.lat, g.lon);
      if (!w || typeof w.min[1] !== 'number') continue;
      const tmin = w.min[1]; // Nacht auf morgen = Tiefstwert des morgigen Tages (fällt meist in die frühen Morgenstunden)
      if (tmin > FROST_GRENZE) continue;
      liste.push({ schluessel: 'gartenFrost_' + i, titel: (tmin <= 0 ? '❄️ Frost heute Nacht' : '❄️ Frostgefahr heute Nacht') + ' (bis ' + gradText(tmin) + ')',
        text: (mehrere ? g.name + ': ' : '') + 'Abdecken oder reinholen: ' + listeKurz(betroffen, 6), seite: 'garten' });
    }
  }
  if (imFenster(tagesZiel)) {
    // ☀️ Hitze: morgens zur Tageszeit des Geräts
    for (let i = 0; i < plan.gaerten.length; i++) {
      const g = plan.gaerten[i];
      if (!g.pflanzen) continue;
      const w = await wetterHolen(g.lat, g.lon);
      if (!w || typeof w.max[0] !== 'number' || w.max[0] < HITZE_GRENZE) continue;
      liste.push({ schluessel: 'gartenHitze_' + i, titel: '☀️ Heute bis ' + gradText(w.max[0]),
        text: (mehrere ? g.name + ': ' : '') + 'Garten früh morgens oder abends gründlich gießen – nicht in der Mittagshitze.', seite: 'garten' });
    }
    // 🌱 Monatsvorschau am 1. des Monats
    if (datum.endsWith('-01') && plan.monate) {
      const mo = plan.monate[datum.slice(0, 7)];
      if (mo) {
        const teile = [];
        if ((mo.vorziehen || []).length) teile.push('🏠 vorziehen: ' + listeKurz(mo.vorziehen, 5));
        if ((mo.direktsaat || []).length) teile.push('🌍 säen: ' + listeKurz(mo.direktsaat, 5));
        if ((mo.auspflanzen || []).length) teile.push('🌱 auspflanzen: ' + listeKurz(mo.auspflanzen, 5));
        if ((mo.schneiden || []).length) teile.push('✂️ schneiden: ' + listeKurz(mo.schneiden, 4));
        if (teile.length) liste.push({ schluessel: 'gartenMonat', titel: '🌱 ' + MONATSNAMEN[Number(datum.slice(5, 7)) - 1] + ' im Garten', text: teile.join('\n').slice(0, 300), seite: 'garten' });
      }
    }
  }
  return liste.map(e => Object.assign(e, { datum, uhrzeit: minutenZuHHMM(minuten) }));
}

exports.erinnerungen = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'Europe/Berlin', region: 'europe-west3', memory: '256MiB', timeoutSeconds: 120 },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const geraeteSnap = await db.collectionGroup('geraete').get();
    if (geraeteSnap.empty) return;

    // Geräte nach Familie gruppieren, damit jede Familie nur einmal gelesen wird
    const proFamilie = new Map();
    geraeteSnap.forEach(doc => {
      const familie = doc.ref.parent.parent;
      if (!familie || familie.parent.id !== 'planerFamilien') return;
      const g = doc.data();
      if (!g || !g.token || !g.aktiv) return;
      if (!proFamilie.has(familie.id)) proFamilie.set(familie.id, { ref: familie, geraete: [] });
      proFamilie.get(familie.id).geraete.push({ ref: doc.ref, id: doc.id, daten: g });
    });

    for (const { ref: familieRef, geraete } of proFamilie.values()) {
      const brauchtVorrat = geraete.some(g => g.daten.vorrat);
      const brauchtWartung = geraete.some(g => g.daten.wartung);
      const brauchtGarten = geraete.some(g => gartenFensterOffen(g.daten)); // Gartendaten nur lesen, wenn ein Hinweis fällig sein kann
      const leer = { exists: false };
      const [terminDoc, gesundheitDoc, vorratDoc, handwerkDoc, gartenDoc] = await Promise.all([
        familieRef.collection('daten').doc('termine').get(),
        familieRef.collection('daten').doc('gesundheit').get(),
        brauchtVorrat ? familieRef.collection('daten').doc('vorratskammer').get() : leer,
        brauchtWartung ? familieRef.collection('daten').doc('handwerk').get() : leer,
        brauchtGarten ? familieRef.collection('daten').doc('garten').get() : leer,
      ]);
      const werteVon = (doc) => (doc.exists && doc.data().werte) || {};
      const tw = werteVon(terminDoc), gw = werteVon(gesundheitDoc);
      const daten = {
        termine: tw.termine_events_v1 || [],
        medikamente: gw.gesundheit_medikamente || [],
        medErledigt: gw.gesundheit_medErledigt || {},
        vorrat: werteVon(vorratDoc).vorratskammer_items || [],
        wartung: werteVon(handwerkDoc).handwerk_wartung || [],
      };
      let gartenPlan = werteVon(gartenDoc).garten_pushPlan || null;
      if (typeof gartenPlan === 'string') { try { gartenPlan = JSON.parse(gartenPlan); } catch (e) { gartenPlan = null; } }
      const wetterHolen = wetterHolerErzeugen();

      for (const geraet of geraete) {
        const faellig = faelligeErinnerungen(geraet.daten, daten);
        if (gartenPlan && gartenFensterOffen(geraet.daten)) {
          try { faellig.push(...await gartenErinnerungen(geraet.daten, gartenPlan, wetterHolen)); }
          catch (err) { console.warn('Garten-Erinnerung', geraet.id, err && err.message); }
        }
        for (const e of faellig) {
          // Merker anlegen – schlägt fehl, wenn diese Erinnerung schon verschickt wurde (keine Dopplungen)
          const merker = familieRef.collection('pushVersand').doc(`${e.datum}_${geraet.id}_${e.schluessel}`.replace(/[^\w.-]/g, '_'));
          try {
            await merker.create({ am: FieldValue.serverTimestamp(), datum: e.datum });
          } catch (err) {
            continue; // existiert schon
          }
          const basis = geraet.daten.appUrl || '';
          try {
            await messaging.send({
              token: geraet.daten.token,
              webpush: {
                headers: { Urgency: 'high', TTL: '1800' },
                data: { titel: e.titel, text: e.text, tag: e.schluessel, link: basis ? basis + '#' + e.seite : '' },
              },
            });
          } catch (err) {
            const code = err && err.code;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              await geraet.ref.delete().catch(() => {}); // Gerät hat sich abgemeldet oder App gelöscht
              break;
            }
            console.warn('Push fehlgeschlagen', geraet.id, code || err);
          }
        }
      }

      // Alte Versand-Merker (älter als 2 Tage) aufräumen
      const grenze = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const alt = await familieRef.collection('pushVersand').where('datum', '<', grenze).limit(200).get();
      if (!alt.empty) {
        const batch = db.batch();
        alt.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }
);

// ============================================================
// 📬 SONNTAGSBRIEF – sonntags um 18 Uhr ein kurzer Überblick über die kommende Woche
// (Termine, Geburtstage, Kochplan, ablaufende Vorräte). Abschaltbar pro Gerät in den
// Push-Einstellungen der App (Feld „sonntagsbrief“ im Geräte-Dokument).
// ============================================================
const WOCHENTAG_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function wochentagVon(iso) { const [y, m, d] = iso.split('-').map(Number); return WOCHENTAG_KURZ[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }
function istGeburtstag(ev) { return /🎂|geburtstag/i.test(ev.title || ''); }

function sonntagsbriefText(geraet, daten) {
  const { datum } = lokaleZeit(geraet.zeitzone);
  const tage = Array.from({ length: 7 }, (_, i) => isoPlusTage(datum, i + 1)); // Mo … So
  const fuerMich = (wer) => geraet.termine !== 'meine' || !geraet.person || !wer || wer === geraet.person || wer === 'familie';
  const termine = [], geburtstage = [];
  tage.forEach(tag => (daten.termine || []).forEach(ev => {
    if (!ev || !terminAmTag(ev, tag)) return;
    if (istGeburtstag(ev)) { geburtstage.push(wochentagVon(tag) + ' ' + TerminLogik.titelMitAlter(ev, tag).replace(/🎂\s*/g, '').trim()); return; }
    if (!fuerMich(ev.wer)) return;
    // Tägliche Serien (z.B. Vitamine) würden die Liste fluten – die gehören nicht in den Wochenüberblick
    if (ev.recurrence && ev.recurrence.freq === 'taeglich') return;
    termine.push({ id: ev.id, text: wochentagVon(tag) + (ev.startTime ? ' ' + ev.startTime : '') + ' ' + (ev.title || 'Termin') });
  }));
  const zeilen = [];
  if (termine.length) zeilen.push('🗓️ ' + termine.length + (termine.length === 1 ? ' Termin: ' : ' Termine: ') + termine.slice(0, 3).map(t => t.text).join(', ') + (termine.length > 3 ? ' …' : ''));
  if (geburtstage.length) zeilen.push('🎂 ' + geburtstage.join(', '));
  const rezeptName = (id) => id === 'reste' ? 'Reste' : ((daten.rezepte || []).find(r => r && r.id === id) || {}).titel;
  const gerichte = tage.map(t => daten.wochenplan && daten.wochenplan[t] ? wochentagVon(t) + ' ' + (rezeptName(daten.wochenplan[t]) || '?') : null).filter(Boolean);
  if (gerichte.length) zeilen.push('🍳 ' + gerichte.slice(0, 3).join(', ') + (gerichte.length > 3 ? ' …' : ''));
  const bald = (daten.vorrat || []).filter(it => {
    const bis = it && (it.verfallsdatum || it.aufbrauchenBis);
    if (!bis || it.bestand === 'leer') return false;
    const t = tageZwischen(datum, bis); return t >= 0 && t <= 7;
  });
  if (bald.length) zeilen.push('🥫 Bald aufbrauchen: ' + bald.slice(0, 3).map(it => it.name).join(', ') + (bald.length > 3 ? ' …' : ''));
  if (!zeilen.length) zeilen.push('Keine Termine eingetragen – eine ruhige Woche! 🌿');
  const [, m, d] = tage[0].split('-');
  return { titel: '📬 Eure Woche ab Mo ' + Number(d) + '.' + Number(m) + '.', text: zeilen.join('\n').slice(0, 400), datum };
}

exports.sonntagsbrief = onSchedule(
  { schedule: '0 18 * * 0', timeZone: 'Europe/Berlin', region: 'europe-west3', memory: '256MiB', timeoutSeconds: 180 },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const geraeteSnap = await db.collectionGroup('geraete').get();
    const proFamilie = new Map();
    geraeteSnap.forEach(doc => {
      const familie = doc.ref.parent.parent;
      if (!familie || familie.parent.id !== 'planerFamilien') return;
      const g = doc.data();
      if (!g || !g.token || !g.aktiv || g.sonntagsbrief === false) return;
      if (!proFamilie.has(familie.id)) proFamilie.set(familie.id, { ref: familie, geraete: [] });
      proFamilie.get(familie.id).geraete.push({ ref: doc.ref, id: doc.id, daten: g });
    });
    for (const { ref: familieRef, geraete } of proFamilie.values()) {
      const [terminDoc, kochenDoc, vorratDoc] = await Promise.all(['termine', 'kochen', 'vorratskammer'].map(d => familieRef.collection('daten').doc(d).get()));
      const werteVon = (doc) => (doc.exists && doc.data().werte) || {};
      const daten = {
        termine: werteVon(terminDoc).termine_events_v1 || [],
        rezepte: werteVon(kochenDoc).kochen_rezepte || [],
        wochenplan: werteVon(kochenDoc).kochen_wochenplan || {},
        vorrat: werteVon(vorratDoc).vorratskammer_items || [],
      };
      for (const geraet of geraete) {
        const brief = sonntagsbriefText(geraet.daten, daten);
        const merker = familieRef.collection('pushVersand').doc(`${brief.datum}_${geraet.id}_sonntagsbrief`.replace(/[^\w.-]/g, '_'));
        try { await merker.create({ am: FieldValue.serverTimestamp(), datum: brief.datum }); } catch (err) { continue; }
        const basis = geraet.daten.appUrl || '';
        try {
          await messaging.send({
            token: geraet.daten.token,
            webpush: { headers: { Urgency: 'normal', TTL: '21600' }, data: { titel: brief.titel, text: brief.text, tag: 'sonntagsbrief', link: basis ? basis + '#home' : '' } },
          });
        } catch (err) {
          const code = err && err.code;
          if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') await geraet.ref.delete().catch(() => {});
          else console.warn('Sonntagsbrief fehlgeschlagen', geraet.id, code || err);
        }
      }
    }
  }
);

// ============================================================
// 📲 KALENDER-ABO – liefert die Termine als .ics, damit Google Kalender, das iPhone
// oder Outlook sie abonnieren können (aktualisiert sich dort selbst, meist alle paar Stunden).
// Aufruf: …/kalender?f=FAMILIENCODE&t=GEHEIMER_SCHLÜSSEL[&p=PERSON]
// Der Schlüssel wird in der App erzeugt (Termine → 📲 Kalender-App) und liegt in
// planerFamilien/{familie}/daten/kalenderabo. „Neuer Link“ in der App macht alte Links ungültig.
// ============================================================
function icsText(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFalten(zeile) { // Zeilen > 75 Bytes umbrechen (RFC 5545)
  const teile = []; let rest = zeile;
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let n = 75; while (Buffer.byteLength(rest.slice(0, n), 'utf8') > 75) n--;
    teile.push(rest.slice(0, n)); rest = ' ' + rest.slice(n);
  }
  teile.push(rest); return teile.join('\r\n');
}
const ICS_FREQ = { taeglich: 'DAILY', woechentlich: 'WEEKLY', monatlich: 'MONTHLY', jaehrlich: 'YEARLY' };
const VTIMEZONE_BERLIN = ['BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
function kalenderIcs(termine, personen, person) {
  const stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const z = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Familienplaner//Kalender-Abo//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsText('Familienplaner' + (person ? ' – ' + ((personen.find(p => p.id === person) || {}).label || person) : '')),
    'X-WR-TIMEZONE:Europe/Berlin', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...VTIMEZONE_BERLIN];
  const tag = (iso) => String(iso).slice(0, 10).replace(/-/g, '');
  const zeit = (hhmm) => (/^\d{1,2}:\d{2}$/.test(hhmm || '') ? hhmm.padStart(5, '0') : '00:00').replace(':', '') + '00';
  const grenze = isoPlusTage(new Date().toISOString().slice(0, 10), -400); // Altes (über ein Jahr) weglassen
  termine.forEach(ev => {
    if (!ev || !ev.id || !/^\d{4}-\d{2}-\d{2}/.test(ev.date || '')) return;
    if (person && ev.wer && ev.wer !== person && ev.wer !== 'familie') return;
    const regel = TerminLogik.icsRegel(ev);
    const serie = !!regel;
    if (!serie && ev.date < grenze) return;
    if (serie && ev.recurrence.until && ev.recurrence.until < grenze) return;
    z.push('BEGIN:VEVENT', 'UID:' + String(ev.id).replace(/[^\w.-]/g, '_') + '@familienplaner', 'DTSTAMP:' + stempel);
    const dauer = TerminLogik.dauerTage(ev);
    if (ev.allDay || !ev.startTime) {
      z.push('DTSTART;VALUE=DATE:' + tag(ev.date), 'DTEND;VALUE=DATE:' + tag(isoPlusTage(ev.date.slice(0, 10), 1 + dauer)));
    } else if (dauer) {
      z.push('DTSTART;TZID=Europe/Berlin:' + tag(ev.date) + 'T' + zeit(ev.startTime), 'DTEND;TZID=Europe/Berlin:' + tag(ev.endDate) + 'T' + zeit(ev.endTime || ev.startTime));
    } else {
      const ende = ev.endTime && ev.endTime > ev.startTime ? ev.endTime : minutenZuHHMM(Math.min(hhmmZuMinuten(ev.startTime) + 60, 23 * 60 + 59));
      z.push('DTSTART;TZID=Europe/Berlin:' + tag(ev.date) + 'T' + zeit(ev.startTime), 'DTEND;TZID=Europe/Berlin:' + tag(ev.date) + 'T' + zeit(ende));
    }
    if (serie) {
      z.push('RRULE:' + regel);
      const ex = (ev.exdates || []).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x));
      if (ex.length) z.push(ev.allDay || !ev.startTime ? 'EXDATE;VALUE=DATE:' + ex.map(tag).join(',') : 'EXDATE;TZID=Europe/Berlin:' + ex.map(x => tag(x) + 'T' + zeit(ev.startTime)).join(','));
    }
    const wer = ev.wer && ev.wer !== 'familie' ? (personen.find(p => p.id === ev.wer) || {}).label : '';
    z.push('SUMMARY:' + icsText((ev.title || 'Termin') + (wer && !person ? ' (' + wer + ')' : '')));
    if (ev.location) z.push('LOCATION:' + icsText(ev.location));
    if (ev.notes) z.push('DESCRIPTION:' + icsText(ev.notes));
    if (ev.erinnerungVorabend && !ev.allDay && ev.startTime) z.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(ev.title || 'Termin'), 'TRIGGER:-PT' + (hhmmZuMinuten(ev.startTime) + 6 * 60) + 'M', 'END:VALARM');
    if (Number(ev.erinnerung) > 0 && !ev.allDay) z.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(ev.title || 'Termin'), 'TRIGGER:-PT' + Number(ev.erinnerung) + 'M', 'END:VALARM');
    z.push('END:VEVENT');
  });
  z.push('END:VCALENDAR');
  return z.map(icsFalten).join('\r\n') + '\r\n';
}

exports.kalender = onRequest({ region: 'europe-west3', memory: '256MiB', invoker: 'public', maxInstances: 5 }, async (req, res) => {
  const familie = String(req.query.f || '').trim(), schluessel = String(req.query.t || '').trim(), person = String(req.query.p || '').trim();
  if (!/^[\w-]{3,64}$/.test(familie) || !/^[\w-]{20,80}$/.test(schluessel)) { res.status(400).send('Ungültiger Link'); return; }
  try {
    const db = getFirestore();
    const familieRef = db.collection('planerFamilien').doc(familie);
    const abo = await familieRef.collection('daten').doc('kalenderabo').get();
    if (!abo.exists || abo.data().token !== schluessel) { res.status(404).send('Kalender nicht gefunden – bitte in der App einen neuen Link erzeugen.'); return; }
    const [terminDoc, personenDoc] = await Promise.all([familieRef.collection('daten').doc('termine').get(), familieRef.collection('daten').doc('personen').get()]);
    const termine = (terminDoc.exists && terminDoc.data().werte && terminDoc.data().werte.termine_events_v1) || [];
    const pw = (personenDoc.exists && personenDoc.data().werte) || {};
    const personen = Array.isArray(pw.planer_personenListe) ? pw.planer_personenListe : [];
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'inline; filename="familienplaner.ics"');
    res.set('Cache-Control', 'private, max-age=900');
    res.status(200).send(kalenderIcs(termine, personen, person));
  } catch (err) {
    console.error('kalender', err);
    res.status(500).send('Fehler beim Erstellen des Kalenders');
  }
});

// ============================================================
// 🔗 REZEPT PER LINK – holt eine Rezeptseite (Chefkoch, Lecker, eigene Blogs …) und liest
// das maschinenlesbare Rezept (schema.org „Recipe“ als JSON-LD) aus. Nur für angemeldete
// App-Geräte (Firebase-Anmeldung wird geprüft) und nur öffentliche Internetadressen.
// ============================================================
function privateAdresse(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateAdresse(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}
async function sicherHolen(adresse) {
  let url = new URL(adresse);
  for (let sprung = 0; sprung < 5; sprung++) {
    if (!/^https?:$/.test(url.protocol)) throw new Error('Nur http/https-Links');
    if (url.port && !['80', '443'].includes(url.port)) throw new Error('Ungewöhnlicher Port');
    const ips = await dns.lookup(url.hostname, { all: true });
    if (!ips.length || ips.some(x => privateAdresse(x.address))) throw new Error('Adresse nicht erlaubt');
    const antwort = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Familienplaner-Rezeptimport/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9' },
    });
    if (antwort.status >= 300 && antwort.status < 400 && antwort.headers.get('location')) { url = new URL(antwort.headers.get('location'), url); continue; }
    if (!antwort.ok) throw new Error('Seite antwortet mit ' + antwort.status);
    // höchstens 3 MB lesen
    const leser = antwort.body.getReader(); const stuecke = []; let groesse = 0;
    for (;;) { const { done, value } = await leser.read(); if (done) break; groesse += value.length; if (groesse > 3 * 1024 * 1024) { leser.cancel(); break; } stuecke.push(value); }
    return { html: Buffer.concat(stuecke).toString('utf8'), url: url.toString() };
  }
  throw new Error('Zu viele Weiterleitungen');
}
function htmlEntitaeten(t) {
  return String(t || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ').trim();
}
function rezeptAusJsonLd(html) {
  const bloecke = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  const istRezept = (o) => o && (o['@type'] === 'Recipe' || (Array.isArray(o['@type']) && o['@type'].includes('Recipe')));
  const suche = (o) => {
    if (!o || typeof o !== 'object') return null;
    if (istRezept(o)) return o;
    if (Array.isArray(o)) { for (const x of o) { const r = suche(x); if (r) return r; } return null; }
    return suche(o['@graph']) || (o.mainEntity && suche(o.mainEntity)) || null;
  };
  for (const b of bloecke) { try { const r = suche(JSON.parse(b.trim())); if (r) return r; } catch (e) { /* kaputtes JSON überspringen */ } }
  return null;
}
function isoDauerMinuten(d) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i.exec(String(d || ''));
  return m ? (Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
}
const EINHEITEN = ['g', 'kg', 'mg', 'ml', 'l', 'cl', 'dl', 'el', 'tl', 'msp', 'msp.', 'prise', 'prisen', 'stk', 'stk.', 'stück', 'becher', 'dose', 'dosen', 'pck', 'pck.', 'päckchen', 'pkt', 'pkt.', 'bund', 'zehe', 'zehen', 'tasse', 'tassen', 'scheibe', 'scheiben', 'tropfen', 'handvoll', 'glas', 'gläser', 'würfel', 'blatt', 'blätter', 'zweig', 'zweige', 'stange', 'stangen', 'kopf', 'köpfe', 'knolle', 'knollen', 'cup', 'cups', 'tbsp', 'tsp', 'oz'];
function zutatZerlegen(text) {
  const t = htmlEntitaeten(text);
  const m = /^((?:ca\.\s*)?[\d½¼¾⅓⅔⅛.,/\s-]*\d[\d½¼¾⅓⅔⅛]*|[½¼¾⅓⅔⅛])\s*(.*)$/.exec(t);
  if (!m) return { menge: '', einheit: '', name: t };
  const rest = m[2].trim();
  const erstes = rest.split(/\s+/)[0] || '';
  if (EINHEITEN.includes(erstes.toLowerCase())) return { menge: m[1].trim(), einheit: erstes, name: rest.slice(erstes.length).trim() || erstes };
  return { menge: m[1].trim(), einheit: '', name: rest };
}
function schritteListe(anl) {
  const aus = [];
  const lauf = (x) => {
    if (!x) return;
    if (typeof x === 'string') { htmlEntitaeten(x).split(/\n{2,}/).forEach(s => s.trim() && aus.push(s.trim())); return; }
    if (Array.isArray(x)) { x.forEach(lauf); return; }
    if (x['@type'] === 'HowToSection') { lauf(x.itemListElement); return; }
    lauf(x.text || x.name);
  };
  lauf(anl);
  if (aus.length === 1 && aus[0].length > 400) return aus[0].split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/).reduce((acc, satz) => { // ein großer Textblock → in Absätze
    if (!acc.length || acc[acc.length - 1].length > 220) acc.push(satz); else acc[acc.length - 1] += ' ' + satz; return acc; }, []);
  return aus;
}

exports.rezeptImport = onRequest({ region: 'europe-west3', memory: '256MiB', invoker: 'public', cors: true, maxInstances: 3, timeoutSeconds: 30 }, async (req, res) => {
  try {
    const kopf = req.get('Authorization') || '';
    if (!kopf.startsWith('Bearer ')) { res.status(401).json({ fehler: 'Nicht angemeldet' }); return; }
    await getAuth().verifyIdToken(kopf.slice(7));
  } catch (err) { res.status(401).json({ fehler: 'Anmeldung ungültig' }); return; }
  const adresse = String((req.method === 'POST' ? (req.body && req.body.url) : req.query.url) || '').trim();
  if (!/^https?:\/\//i.test(adresse) || adresse.length > 2000) { res.status(400).json({ fehler: 'Bitte einen Link mit https:// einfügen.' }); return; }
  try {
    const { html, url } = await sicherHolen(adresse);
    const r = rezeptAusJsonLd(html);
    if (!r) { res.status(422).json({ fehler: 'Auf dieser Seite wurde kein Rezept gefunden. Viele große Rezeptseiten funktionieren, kleine Blogs manchmal nicht.' }); return; }
    const portionen = parseInt(String(Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield || '').match(/\d+/) || '', 10) || 4;
    const zeit = isoDauerMinuten(r.totalTime) || (isoDauerMinuten(r.prepTime) + isoDauerMinuten(r.cookTime)) || 30;
    let bild = r.image; if (Array.isArray(bild)) bild = bild[0]; if (bild && typeof bild === 'object') bild = bild.url;
    const tags = String(Array.isArray(r.keywords) ? r.keywords.join(',') : r.keywords || '').split(',').map(t => t.trim().toLowerCase()).filter(t => t && t.length < 25).slice(0, 5);
    res.json({
      titel: htmlEntitaeten(r.name).slice(0, 120),
      portionen, zeit,
      zutaten: (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : (r.ingredients || [])).map(zutatZerlegen).filter(z => z.name).slice(0, 60),
      schritte: schritteListe(r.recipeInstructions).slice(0, 40),
      beschreibung: htmlEntitaeten(r.description).slice(0, 300),
      tags, bild: typeof bild === 'string' && /^https:\/\//.test(bild) ? bild : '', quelle: url,
    });
  } catch (err) {
    console.warn('rezeptImport', adresse, err && err.message);
    res.status(502).json({ fehler: 'Die Seite konnte nicht gelesen werden (' + ((err && err.message) || 'Fehler') + ').' });
  }
});

// ============================================================
// 💬 FAMILIEN-CHAT: Benachrichtigung an die anderen Geräte der Familie
// Die App ruft das nach dem Senden auf (POST { f: Familie, id: Nachricht }). Die Funktion liest die
// Nachricht selbst aus der Cloud – so kann niemand beliebige Texte verschicken lassen – und
// benachrichtigt jedes Gerät mit Push außer dem Absender (und anderen Geräten derselben Person).
// Ist der Chat verschlüsselt, kennt der Server den Text nicht: dann nur „🔒 Neue Nachricht“.
// ============================================================
function chatVorschau(m) {
  const typ = m.typ || 'text';
  if (typ === 'bild') return '📷 Foto';
  if (typ === 'sprache') return '🎤 Sprachnachricht' + (m.dauer ? ' (' + Math.floor(m.dauer / 60) + ':' + String(m.dauer % 60).padStart(2, '0') + ')' : '');
  if (m.v) return typ === 'karte' ? '📎 Neue Nachricht' : (typ === 'umfrage' ? '📊 Neue Umfrage' : '🔒 Neue Nachricht');
  if (typ === 'umfrage' && m.umfrage) return '📊 Umfrage: ' + String(m.umfrage.frage || '').slice(0, 160);
  if (typ === 'karte' && m.karte) return ({ termin: '🗓️ ', rezept: '🍳 ', wunsch: '🎁 ', einkauf: '🛒 ', ausflug: '🧭 ', standort: '📍 ' }[m.karte.art] || '📎 ') + (m.karte.titel || '') + (m.text ? ' – ' + m.text : '');
  return String(m.text || '').slice(0, 180);
}
exports.chatPush = onRequest({ region: 'europe-west3', memory: '256MiB', invoker: 'public', cors: true, maxInstances: 5, timeoutSeconds: 30 }, async (req, res) => {
  try {
    const kopf = req.get('Authorization') || '';
    if (!kopf.startsWith('Bearer ')) { res.status(401).json({ fehler: 'Nicht angemeldet' }); return; }
    await getAuth().verifyIdToken(kopf.slice(7));
  } catch (err) { res.status(401).json({ fehler: 'Anmeldung ungültig' }); return; }
  const familie = String((req.body && req.body.f) || '').trim(), id = String((req.body && req.body.id) || '').trim();
  if (!/^[\w-]{3,64}$/.test(familie) || !/^[\w-]{5,64}$/.test(id)) { res.status(400).json({ fehler: 'Ungültig' }); return; }
  try {
    const db = getFirestore();
    const familieRef = db.collection('planerFamilien').doc(familie);
    const snap = await familieRef.collection('chat').doc(id).get();
    if (!snap.exists) { res.status(404).json({ fehler: 'Nachricht nicht gefunden' }); return; }
    const m = snap.data();
    // nur frische Nachrichten (verhindert späteres „Nachklingeln“ alter Beiträge)
    const alter = Date.now() - ((m.erstellt && m.erstellt.toMillis) ? m.erstellt.toMillis() : 0);
    if (alter > 6 * 3600 * 1000) { res.json({ ok: true, alt: true }); return; }
    const heute = new Date().toISOString().slice(0, 10);
    try { await familieRef.collection('pushVersand').doc('chat_' + id).create({ am: FieldValue.serverTimestamp(), datum: heute }); }
    catch (err) { res.json({ ok: true, doppelt: true }); return; }
    const geraete = await familieRef.collection('geraete').get();
    const messaging = getMessaging();
    let gesendet = 0;
    for (const doc of geraete.docs) {
      const g = doc.data();
      if (!g || !g.token || !g.aktiv || g.chat === false) continue;
      if (doc.id === m.geraet || (m.von && g.person && g.person === m.von)) continue;
      const basis = g.appUrl || '';
      try {
        await messaging.send({ token: g.token, webpush: { headers: { Urgency: 'high', TTL: '86400' },
          data: { titel: '💬 ' + (m.name || 'Familien-Chat'), text: chatVorschau(m), tag: 'chat', link: basis ? basis.replace(/[?#].*$/, '') + '?bereich=chat' : '' } } });
        gesendet++;
      } catch (err) {
        const code = err && err.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') await doc.ref.delete().catch(() => {});
        else console.warn('Chat-Push fehlgeschlagen', doc.id, code || err);
      }
    }
    res.json({ ok: true, gesendet });
  } catch (err) {
    console.error('chatPush', err);
    res.status(500).json({ fehler: 'Fehler' });
  }
});

// Für Tests (node): reine Hilfsfunktionen
if (process.env.FAMILIENPLANER_TEST) exports._test = { gartenErinnerungen, gartenFensterOffen, chatVorschau, sonntagsbriefText, kalenderIcs, rezeptAusJsonLd, zutatZerlegen, schritteListe, isoDauerMinuten, privateAdresse };
