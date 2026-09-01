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

// ---------- KURZE STATUSMELDUNG (TOAST), optional mit Rückgängig-Aktion ----------
// Erzeugt/nutzt ein #tempStatus-Element und blendet eine Nachricht kurz ein. Legt das
// Element bei Bedarf selbst an (inkl. Stil), damit jedes Modul das ohne eigene
// HTML-/CSS-Vorarbeit einfach aufrufen kann.
//
// Neu: dritter Parameter `optionen.rueckgaengig` – eine Funktion. Ist sie gesetzt,
// zeigt der Toast einen "Rückgängig"-Button, der die Funktion einmalig aufruft.
// So lassen sich Lösch-Aktionen ohne blockierenden confirm()-Dialog anbieten:
//   const geloescht = liste.splice(i, 1)[0];
//   speichern(KEY, liste); render();
//   showTempStatus('Gelöscht: "' + geloescht.titel + '"', 6, {
//     rueckgaengig: () => { liste.splice(i, 0, geloescht); speichern(KEY, liste); render(); }
//   });
function showTempStatus(text, sekunden, optionen) {
  optionen = optionen || {};
  let el = document.getElementById('tempStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tempStatus';
    document.body.appendChild(el);
  }
  el.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translate(-50%,0);' +
    'background:#2a2016;color:#bcd196;padding:10px 18px;border-radius:22px;' +
    'font-size:0.85rem;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
    'opacity:1;pointer-events:' + (optionen.rueckgaengig ? 'auto' : 'none') + ';transition:opacity .2s, transform .2s;z-index:9999;' +
    'max-width:88vw;text-align:center;font-family:Inter,system-ui,sans-serif;' +
    'display:flex;align-items:center;gap:12px;';
  el.innerHTML = '';
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  el.appendChild(textSpan);
  if (typeof optionen.rueckgaengig === 'function') {
    const btn = document.createElement('button');
    btn.textContent = 'Rückgängig';
    btn.style.cssText = 'background:none;border:none;color:#e8c98a;font-weight:700;font-size:0.85rem;cursor:pointer;padding:2px 4px;flex-shrink:0;text-decoration:underline;';
    btn.addEventListener('click', () => {
      clearTimeout(el._timeout);
      try { optionen.rueckgaengig(); } catch (e) { console.warn('showTempStatus: Rückgängig-Aktion fehlgeschlagen', e); }
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,20px)';
    });
    el.appendChild(btn);
  }
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%,20px)';
  }, (sekunden || 2.5) * 1000);
}

// ---------- PULL-TO-REFRESH (von oben nach unten wischen) ----------
// Läuft automatisch in jedem Modul, das gemeinsam.js einbindet: wird oben am
// Seitenanfang (scrollTop === 0) deutlich nach unten gewischt, lädt sich das Modul
// neu (holt dabei auch den neuesten Stand, falls die Cloud-Synchronisierung
// zwischenzeitlich etwas verpasst haben sollte). Zeigt während des Wischens einen
// kleinen Pfeil-Indikator, damit die Geste sichtbares Feedback gibt.
(function () {
  let startY = 0, ziehend = false, ausgeloest = false;
  const SCHWELLE = 130;
  let indikator = null;
  function indikatorZeigen(strecke) {
    if (!indikator) {
      indikator = document.createElement('div');
      indikator.id = '__pullToRefreshIndikator';
      indikator.textContent = '↓';
      indikator.style.cssText =
        'position:fixed;top:8px;left:50%;transform:translate(-50%,-40px) rotate(0deg);' +
        'width:34px;height:34px;border-radius:50%;background:#2a2016;color:#bcd196;' +
        'display:flex;align-items:center;justify-content:center;font-size:1.1rem;' +
        'z-index:9998;transition:opacity .15s;box-shadow:0 3px 10px rgba(0,0,0,0.25);opacity:0;';
      document.body.appendChild(indikator);
    }
    const anteil = Math.min(1, strecke / SCHWELLE);
    indikator.style.opacity = String(anteil);
    indikator.style.transform = 'translate(-50%,' + (-40 + anteil * 56) + 'px) rotate(' + (anteil * 180) + 'deg)';
    if (anteil >= 1) indikator.textContent = '↻';
    else indikator.textContent = '↓';
  }
  function indikatorAusblenden() {
    if (indikator) indikator.style.opacity = '0';
  }
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY > 0 || e.touches.length !== 1) { ziehend = false; return; }
    startY = e.touches[0].clientY;
    ziehend = true;
    ausgeloest = false;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!ziehend) return;
    const strecke = e.touches[0].clientY - startY;
    if (strecke <= 0) { indikatorAusblenden(); return; }
    if (window.scrollY > 0) { ziehend = false; indikatorAusblenden(); return; }
    indikatorZeigen(strecke);
    if (strecke >= SCHWELLE) ausgeloest = true;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (ziehend && ausgeloest) {
      if (indikator) { indikator.textContent = '↻'; indikator.style.opacity = '1'; }
      location.reload();
    } else {
      indikatorAusblenden();
    }
    ziehend = false;
  }, { passive: true });
})();
