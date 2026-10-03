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
      const [terminDoc, gesundheitDoc] = await Promise.all([
        familieRef.collection('daten').doc('termine').get(),
        familieRef.collection('daten').doc('gesundheit').get(),
      ]);
      const tw = (terminDoc.exists && terminDoc.data().werte) || {};
      const gw = (gesundheitDoc.exists && gesundheitDoc.data().werte) || {};
      const daten = {
        termine: tw.termine_events_v1 || [],
        medikamente: gw.gesundheit_medikamente || [],
        medErledigt: gw.gesundheit_medErledigt || {},
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

// Für Tests
exports._intern = { terminAmTag, faelligeErinnerungen, lokaleZeit };
