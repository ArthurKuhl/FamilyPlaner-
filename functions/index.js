// ============================================================
// Familienplaner – Erinnerungen per Push (auch bei geschlossener App)
// Läuft alle 5 Minuten, schaut für jedes angemeldete Gerät nach fälligen
// Erinnerungen (Termine, Medikamente, Wasser) und schickt sie über Firebase
// Cloud Messaging. Jede Erinnerung geht pro Gerät nur einmal raus.
//
// Datenquellen (wie von der App synchronisiert):
//   planerFamilien/{familie}/daten/termine     → werte.termine_events_v1
//   planerFamilien/{familie}/daten/gesundheit  → werte.gesundheit_medikamente, werte.gesundheit_medErledigt
//   planerFamilien/{familie}/geraete/{gerät}   → Token + Einstellungen des Geräts (von der App angelegt)
// ============================================================
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

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

// Findet ein Termin (ggf. wiederkehrend) an diesem Datum statt? Gleiche Regeln wie in termine.html.
function terminAmTag(ev, datumISO) {
  if (!ev || !ev.date) return false;
  const [y, m, d] = ev.date.split('-').map(Number);
  const ziel = Date.UTC(...datumISO.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)));
  const bis = ev.recurrence && ev.recurrence.until ? Date.parse(ev.recurrence.until + 'T00:00:00Z') : null;
  const freq = ev.recurrence ? ev.recurrence.freq : 'keine';
  let aktuell = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2000 && aktuell <= ziel; i++) {
    if (bis !== null && aktuell > bis) return false;
    if (aktuell === ziel) return true;
    const t = new Date(aktuell);
    if (freq === 'taeglich') aktuell = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1);
    else if (freq === 'woechentlich') aktuell = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 7);
    else if (freq === 'monatlich') aktuell = Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    else if (freq === 'jaehrlich') aktuell = Date.UTC(t.getUTCFullYear() + 1, t.getUTCMonth(), t.getUTCDate());
    else return false;
  }
  return false;
}

// Liefert alle jetzt fälligen Erinnerungen für ein Gerät
function faelligeErinnerungen(geraet, daten) {
  const { datum, minuten } = lokaleZeit(geraet.zeitzone);
  const imFenster = (ziel) => ziel !== null && ziel <= minuten && minuten - ziel < FENSTER_MIN;
  const liste = [];

  // Termine: wie in der App zur Startzeit minus "Erinnerung"-Vorlauf
  if (geraet.termine === 'meine' || geraet.termine === 'alle') {
    (daten.termine || []).forEach(ev => {
      if (!ev || ev.allDay || !ev.startTime) return;
      if (geraet.termine === 'meine' && ev.wer !== geraet.person && ev.wer !== 'familie') return;
      if (!terminAmTag(ev, datum)) return;
      const start = hhmmZuMinuten(ev.startTime);
      if (start === null) return;
      const vorlauf = Number(ev.erinnerung) || 0;
      const ziel = start - vorlauf;
      if (!imFenster(ziel)) return;
      liste.push({
        schluessel: `t_${ev.id}_${ziel}`,
        titel: '🗓️ ' + (ev.title || 'Termin'),
        text: (vorlauf ? `in ${vorlauf} Min. (${ev.startTime} Uhr)` : `jetzt (${ev.startTime} Uhr)`) + (ev.location ? ' · ' + ev.location : ''),
        seite: 'termine',
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
        liste.push({ schluessel: `g_${ev.id}`, titel: '📅 Heute: ' + (ev.title || 'Termin'), text: ev.notes ? String(ev.notes).slice(0, 120) : 'Ganztägiger Termin', seite: 'termine' });
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
      if (!letzte || !letzte.datum) return; // ohne bisherige Erledigung gibt es kein Fälligkeitsdatum
      const faelligAm = isoPlusMonate(letzte.datum, WARTUNG_MONATE[w.turnus] || 1);
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
      const leer = { exists: false };
      const [terminDoc, gesundheitDoc, vorratDoc, handwerkDoc] = await Promise.all([
        familieRef.collection('daten').doc('termine').get(),
        familieRef.collection('daten').doc('gesundheit').get(),
        brauchtVorrat ? familieRef.collection('daten').doc('vorratskammer').get() : leer,
        brauchtWartung ? familieRef.collection('daten').doc('handwerk').get() : leer,
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

      for (const geraet of geraete) {
        const faellig = faelligeErinnerungen(geraet.daten, daten);
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

