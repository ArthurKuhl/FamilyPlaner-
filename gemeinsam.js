// gemeinsam.js
// Gemeinsame Helferfunktionen, die von mehreren Modulen genutzt werden.
//
// Hintergrund: mehrfach traten Fehler auf ("X is not defined"), weil verschiedene
// Module unterschiedliche Namen für dieselbe Grundfunktion erwarteten (z.B. eine
// Datei rief showTempStatus() auf, obwohl nur eine andere Datei diese Funktion
// überhaupt definierte). Diese Datei ist ab jetzt die eine verlässliche Quelle für
// die immer wiederkehrenden Helfer. Einfach vor dem eigenen <script>-Block einbinden:
//   <script src="gemeinsam.js"></script>
//
// Ausnahme: garten.html bindet diese Datei bewusst NICHT ein. Diese Datei ist historisch
// gewachsen und nutzt für jeden Datenbereich eigene, spezialisierte Lade-/Speicherfunktionen
// (z.B. loadPantry/savePantry, saveCustomPlants, savePilzLog) statt der generischen
// laden()/speichern() hier – das bewusst beizubehalten ist risikoärmer, als es
// nachträglich zu vereinheitlichen.

// ---------- LOKALER SPEICHER ----------
function laden(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const geparst = JSON.parse(raw);
    // Schutz: ein früherer Sync-Fehler konnte hier den Text "null" ablegen, was ohne
    // diese Prüfung fälschlich als gültiger (leerer) Wert statt als "nichts vorhanden" gelten würde.
    return (geparst === null || geparst === undefined) ? fallback : geparst;
  } catch (e) {
    console.warn('laden(): Fehler beim Lesen von', key, e);
    return fallback;
  }
}

function speichern(key, wert) {
  try {
    localStorage.setItem(key, JSON.stringify(wert));
  } catch (e) {
    console.warn('speichern(): Fehler beim Schreiben von', key, e);
    alert('Speichern fehlgeschlagen – ist der Speicher voll?');
  }
  if (window._sync) window._sync.melde();
}

// ---------- TEXT / IDs ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function neueId(prefix) {
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ---------- DATUM ----------
function heuteISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function ausISO(iso) {
  return new Date(iso + 'T00:00:00');
}

// ---------- KURZE STATUSMELDUNG (TOAST) ----------
// Erzeugt/nutzt ein #tempStatus-Element und blendet eine Nachricht kurz ein. Legt das
// Element bei Bedarf selbst an (inkl. Stil), damit jedes Modul das ohne eigene
// HTML-/CSS-Vorarbeit einfach aufrufen kann.
function showTempStatus(text, sekunden) {
  let el = document.getElementById('tempStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tempStatus';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translate(-50%,0);' +
    'background:#2a2016;color:#bcd196;padding:10px 18px;border-radius:22px;' +
    'font-size:0.85rem;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
    'opacity:1;pointer-events:none;transition:opacity .2s, transform .2s;z-index:9999;' +
    'max-width:88vw;text-align:center;font-family:Inter,system-ui,sans-serif;';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%,20px)';
  }, (sekunden || 2.5) * 1000);
}
