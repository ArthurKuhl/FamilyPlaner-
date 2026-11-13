// Gartenplaner – Werkzeuge: Leisten, Beet-Editor, Pflanzen-Infos, Fotos, Status
// Teil 3 von 4 des Garten-Skripts (aus garten.html ausgelagert, wird dort in dieser Reihenfolge geladen).
// ==================== TOOLBAR DROPDOWNS ====================
function closeDropdowns() {
  document.querySelectorAll('.dropdown-menu.open').forEach(m=>m.classList.remove('open'));
}
function toggleDropdown(btn) {
  const menu = btn.parentElement.querySelector('.dropdown-menu');
  const isOpen = menu.classList.contains('open');
  closeDropdowns();
  if (isOpen) return;
  // Position per JS berechnen (statt CSS position:absolute), damit das Menü nicht vom
  // overflow-x:auto der Werkzeugleiste abgeschnitten wird (das erzwingt laut CSS-Spec
  // automatisch auch overflow-y:auto und würde das nach unten aufklappende Menü clippen).
  menu.classList.add('open');
  const rect = btn.getBoundingClientRect();
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.left = rect.left + 'px';
  // Nach dem Einblenden ggf. korrigieren, falls das Menü rechts oder unten über den
  // sichtbaren Bereich hinausragen würde.
  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth - 8) {
      menu.style.left = Math.max(8, window.innerWidth - menuRect.width - 8) + 'px';
    }
    if (menuRect.bottom > window.innerHeight - 8) {
      menu.style.top = Math.max(8, rect.top - menuRect.height - 6) + 'px';
    }
  });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.tool-dropdown')) closeDropdowns();
});

// ==================== TASTATURKÜRZEL ====================
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (isTyping) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) {
    e.preventDefault();
    redo();
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (activePlantBedId) {
      e.preventDefault();
      removePlant();
    } else if (selectedBed) {
      e.preventDefault();
      deleteSelected();
    }
  }
  if (e.key === 'Escape') {
    if (freehandDrawing) { cancelFreehand(); return; }
    closeDropdowns();
    document.querySelectorAll('.modal-bg').forEach(m => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; });
  }
});

// ---------- Bereiche: Liste, Vorschau, Ranzoomen ----------
function oeffneZonenListe() {
  renderZonenListe();
  document.getElementById('modalZonen').style.display = 'flex';
}
function starteZoneZeichnen() {
  document.getElementById('modalZonen').style.display = 'none';
  setMode('zone');
  showTempStatus('📌 Rechteck über den gewünschten Bereich ziehen, dann Namen eingeben', 5);
}
function renderZonenListe() {
  const zonen = getCurrentZones();
  const grid = document.getElementById('zonenGrid');
  document.getElementById('zonenLeer').style.display = zonen.length ? 'none' : '';
  grid.innerHTML = zonen.map(z => `
    <div style="background:var(--white);border-radius:var(--radius-md);box-shadow:var(--shadow-soft);overflow:hidden;cursor:pointer;" onclick="zoneAnzeigen(${z.id})">
      <canvas class="zone-vorschau-canvas" data-zone-id="${z.id}" width="130" height="90" style="width:100%;height:90px;display:block;background:#e7e0cc;"></canvas>
      <div style="padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:4px;">
        <span style="font-size:0.72rem;font-weight:700;color:var(--soil);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(z.name)}</span>
        <span style="display:flex;gap:6px;flex-shrink:0;">
          <button type="button" onclick="event.stopPropagation();zoneBearbeiten(${z.id})" style="background:none;border:none;color:var(--bark);font-size:0.85rem;cursor:pointer;padding:0;" title="Bereich bearbeiten">✏️</button>
          <button type="button" onclick="event.stopPropagation();zoneLoeschen(${z.id})" style="background:none;border:none;color:#c0392b;font-size:0.85rem;cursor:pointer;padding:0;" title="Bereich löschen">🗑</button>
        </span>
      </div>
    </div>
  `).join('');
  requestAnimationFrame(zeichneZonenVorschauen);
}
function zeichneZonenVorschauen() {
  getCurrentZones().forEach(z => {
    const mini = document.querySelector('.zone-vorschau-canvas[data-zone-id="' + z.id + '"]');
    if (!mini) return;
    const mctx = mini.getContext('2d');
    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.fillStyle = '#e7e0cc';
    mctx.fillRect(0, 0, mini.width, mini.height);
    if (bgImageEl && bgImageLoadedFor === currentGardenId) {
      const skalX = bgImageEl.naturalWidth / canvas.width;
      const skalY = bgImageEl.naturalHeight / canvas.height;
      try {
        mctx.drawImage(bgImageEl, z.x * skalX, z.y * skalY, z.w * skalX, z.h * skalY, 0, 0, mini.width, mini.height);
      } catch (e) {}
    }
    const skal = Math.min(mini.width / z.w, mini.height / z.h);
    const offX = (mini.width - z.w * skal) / 2, offY = (mini.height - z.h * skal) / 2;
    getCurrentBeds().forEach(bed => {
      const bw = (bed.w || (bed.rx ? bed.rx * 2 : 40)), bh = (bed.h || (bed.ry ? bed.ry * 2 : 40));
      const bx = bed.x - bw / 2, by = bed.y - bh / 2;
      if (bx + bw < z.x || bx > z.x + z.w || by + bh < z.y || by > z.y + z.h) return;
      mctx.fillStyle = bed.color || '#7a9e72';
      mctx.globalAlpha = 0.85;
      mctx.fillRect(offX + (bx - z.x) * skal, offY + (by - z.y) * skal, bw * skal, bh * skal);
      mctx.globalAlpha = 1;
    });
  });
}
function zoneAnzeigen(zoneId) {
  const zone = getCurrentZones().find(z => z.id === zoneId);
  if (!zone) return;
  document.getElementById('modalZonen').style.display = 'none';
  gartenAnsichtSetzen('karte');
  const padding = 40;
  const neuerZoom = Math.min(wrap.clientWidth / (zone.w + padding * 2), wrap.clientHeight / (zone.h + padding * 2), 4);
  gartenZoomSetzen(neuerZoom);
  requestAnimationFrame(() => {
    const zentrumX = zone.x + zone.w / 2, zentrumY = zone.y + zone.h / 2;
    wrap.scrollLeft = Math.max(0, zentrumX * gartenZoom - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, zentrumY * gartenZoom - wrap.clientHeight / 2);
  });
  showTempStatus('📌 Zu „' + zone.name + '" gezoomt', 3);
}
function zoneZurueckZurUebersicht() {
  gartenZoomEinpassen();
  wrap.scrollLeft = 0; wrap.scrollTop = 0;
}
function zoneBearbeiten(zoneId) {
  const zone = getCurrentZones().find(z => z.id === zoneId);
  if (!zone) return;
  const neuerName = prompt('Name des Bereichs:', zone.name);
  if (neuerName !== null && neuerName.trim() && neuerName.trim() !== zone.name) {
    pushUndo();
    zone.name = neuerName.trim();
    saveData();
    renderZonenListe();
  }
  if (confirm('Soll auch die Größe/Position von „' + zone.name + '" neu gezeichnet werden? (Rechteck auf der Karte neu ziehen)')) {
    zoneNeuZeichnenId = zoneId;
    document.getElementById('modalZonen').style.display = 'none';
    setMode('zone');
    showTempStatus('📌 Neues Rechteck für „' + zone.name + '" ziehen', 5);
  }
}
function zoneLoeschen(zoneId) {
  const zonen = getCurrentZones();
  const zone = zonen.find(z => z.id === zoneId);
  if (!zone) return;
  if (!confirm('Bereich „' + zone.name + '" wirklich löschen? (Beete darin bleiben erhalten)')) return;
  pushUndo();
  gardens[currentGardenId].zones = zonen.filter(z => z.id !== zoneId);
  saveData();
  draw();
  renderZonenListe();
}
// Auf dem Handy liegt die Liste unter der Karte – zum Zeichnen schaltet die App vorübergehend
// auf „nur Karte“ und danach zurück (ohne die gespeicherte Ansicht zu ändern).
const ZEICHEN_MODI = ['circle','rect','tri','lshape','freehand','zone','freitree','messen','tuffform','giessen','tierort'];
const TIPP_MODI = ['messen', 'giessen', 'tierort']; // Antippen = Aktion, Wischen = Karte verschieben
let zeichenVorherAnsicht = null;
function zeichenVollbild(an) {
  if (an) {
    if (zeichenVorherAnsicht !== null || window.innerWidth >= 900 || gartenAnsichtModus === 'karte') return;
    zeichenVorherAnsicht = gartenAnsichtModus;
    gartenAnsichtModus = 'karte'; applyGartenAnsichtModus();
    setTimeout(() => { try { document.getElementById('canvasWrap').scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }, 60);
  } else if (zeichenVorherAnsicht !== null) {
    gartenAnsichtModus = zeichenVorherAnsicht; zeichenVorherAnsicht = null; applyGartenAnsichtModus();
  }
}
function zeichenHinweisZeigen(m) {
  let el = document.getElementById('zeichenHinweis');
  const texte = { circle: 'Tippe auf die Karte, um den Kreis zu platzieren', rect: 'Tippe auf die Karte, um das Rechteck zu platzieren', tri: 'Tippe auf die Karte, um das Dreieck zu platzieren',
    lshape: 'Tippe auf die Karte, um die L-Form zu platzieren', freehand: 'Tippe nacheinander die Eckpunkte – zum Schließen auf den roten Startpunkt', zone: 'Rechteck für den Bereich über die Karte ziehen', freitree: 'Tippe auf die Karte, um die Pflanze frei zu platzieren' };
  texte.messen = ''; texte.tuffform = ''; texte.giessen = ''; texte.tierort = '';
  if (!(m in texte)) { if (el) el.style.display = 'none'; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'zeichenHinweis';
    el.style.cssText = 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;z-index:90;background:rgba(58,46,31,0.94);padding:8px 12px;border-radius:12px;box-shadow:0 3px 12px rgba(0,0,0,0.35);max-width:92%';
    document.getElementById('canvasWrap').appendChild(el);
  }
  const knopf = 'class="tool-btn" style="padding:5px 10px;font-size:0.72rem;white-space:nowrap"';
  if (m === 'messen') el.innerHTML = `<span class="zh-text" style="color:#fff;font-size:0.75rem"></span><button ${knopf} onclick="setMode('select')">✓ Fertig</button>`;
  else if (m === 'tuffform') el.innerHTML = `<span class="zh-text" style="color:#fff;font-size:0.75rem"></span><button ${knopf} onclick="tuffFormPunktZurueck()">↩ Punkt</button><button ${knopf} onclick="tuffFormFertig()">✓ Fertig</button><button class="tool-btn danger" style="padding:5px 10px;font-size:0.72rem" onclick="tuffFormAbbrechen()">✕</button>`;
  else if (m === 'giessen') el.innerHTML = `<span class="zh-text${giessKinderModus ? ' zh-kinder' : ''}" style="color:#fff;font-size:0.75rem"></span><button ${knopf} onclick="giessKinderUmschalten()" title="Kinder-Ansicht: große Symbole und Sterne">${giessKinderModus ? '👤 Normal' : '🧒 Kinder'}</button><button ${knopf} onclick="setMode('select')">✓</button>`;
  else if (m === 'tierort') el.innerHTML = `<span class="zh-text" style="color:#fff;font-size:0.75rem"></span><button class="tool-btn danger" style="padding:5px 10px;font-size:0.72rem" onclick="tierOrtAbbrechen()">✕</button>`;
  else el.innerHTML = `<span class="zh-text" style="color:#fff;font-size:0.75rem">✏️ ${texte[m]}</span><button class="tool-btn danger" style="padding:5px 10px;font-size:0.72rem" onclick="setMode('select')">✕ Abbrechen</button>`;
  el.style.display = 'flex';
  if (m === 'messen') messHinweis(); else if (m === 'tuffform') tuffFormHinweis(); else if (m === 'giessen') giessHinweis(); else if (m === 'tierort') tierOrtHinweis();
}
function setMode(m) {
  if (mode==='freehand' && m!=='freehand' && freehandDrawing) cancelFreehand();
  if (mode==='messen' && m!=='messen') { messPunkte = []; messMaus = null; }
  if (mode==='tuffform' && m!=='tuffform') { tuffFormZiel = null; tuffFormPunkte = []; }
  if (mode==='giessen' && m!=='giessen') giessRundeListe = [];
  if (mode==='tierort' && m!=='tierort' && (tierOrtZweck === 'modal' || tierOrtZweck === 'notiz')) { document.getElementById(tierOrtZweck === 'modal' ? 'beobModal' : 'notizModal').style.display = 'flex'; tierOrtZweck = null; }
  if (mode==='giessen' && m!=='giessen') giessKinderModus = false;
  else if (m!=='tierort') tierOrtZweck = null;
  mode=m;
  document.getElementById('messBtn')?.classList.toggle('widget-aktiv', m === 'messen');
  document.getElementById('giessBtn')?.classList.toggle('widget-aktiv', m === 'giessen');
  document.getElementById('tierBtn')?.classList.toggle('widget-aktiv', m === 'tierort');
  zeichenVollbild(ZEICHEN_MODI.includes(m));
  try { zeichenHinweisZeigen(m); } catch (e) {}
  hoverConflictBedId=null;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  const map={circle:'btnCircle',rect:'btnRect',tri:'btnTri',lshape:'btnLshape',freehand:'btnFreehand',select:'btnSelect',plant:'btnPlant'};
  if(map[m]) document.getElementById(map[m])?.classList.add('active');
  wrap.className='canvas-wrap mode-'+m;
  const labels={circle:'Kreis zeichnen',rect:'Rechteck zeichnen',tri:'Dreieck zeichnen',lshape:'L-Form zeichnen',freehand:'Freiform: Punkte anklicken, am Startpunkt schließen',select:'Auswählen / Verschieben',plant:`Pflanze setzen: ${selectedPlantSym}`,messen:'📏 Abstand messen',giessen:'💧 Gießrunde',tierort:'📍 Markierung setzen',tuffform:'🌷 Form des Tuffs zeichnen',freitree:`🌳 Frei platzieren: ${selectedPlantSym} – auf die Fläche tippen (außerhalb eines Beets)`,zone:'📌 Bereich: Rechteck über die Karte ziehen'};
  document.getElementById('statusMsg').textContent=labels[m]||m;
  document.getElementById('sb1').textContent='Modus: '+(labels[m]||m);
  document.getElementById('plantModeControls').style.display = (m==='plant') ? 'flex' : 'none';
  updateShapeControls();
  draw();
  setTimeout(positioniereZoomWidget, 40);
}
let statusMsgTimer=null;
// ---------- LÖSCH-TOAST MIT RÜCKGÄNGIG (eigene Funktion, da showTempStatus() oben
// im Beetplaner-Werkzeug für etwas anderes verwendet wird – den aktuellen Zeichenmodus) ----------
function zeigeLoeschToast(text, rueckgaengigFn, sekunden) {
  let el = document.getElementById('__loeschToast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__loeschToast';
    document.body.appendChild(el);
  }
  el.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translate(-50%,0);' +
    'background:#2a2016;color:#bcd196;padding:10px 18px;border-radius:22px;' +
    'font-size:0.85rem;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
    'opacity:1;pointer-events:auto;transition:opacity .2s, transform .2s;z-index:9999;' +
    'width:max-content;max-width:88vw;text-align:center;font-family:Inter,system-ui,sans-serif;' +
    'display:flex;align-items:center;gap:12px;';
  el.innerHTML = '';
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  el.appendChild(textSpan);
  const btn = document.createElement('button');
  btn.textContent = 'Rückgängig';
  btn.style.cssText = 'background:none;border:none;color:#e8c98a;font-weight:700;font-size:0.85rem;cursor:pointer;padding:2px 4px;flex-shrink:0;text-decoration:underline;';
  btn.addEventListener('click', () => {
    clearTimeout(el._timeout);
    try { rueckgaengigFn(); } catch (e) { console.warn('zeigeLoeschToast: Rückgängig-Aktion fehlgeschlagen', e); }
    el.style.opacity = '0'; el.style.pointerEvents = 'none';
    el.style.transform = 'translate(-50%,20px)';
  });
  el.appendChild(btn);
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.opacity = '0'; el.style.pointerEvents = 'none';
    el.style.transform = 'translate(-50%,20px)';
  }, (sekunden || 6) * 1000);
}

  function __pullToRefreshModalOffen() {
    return !!document.querySelector('.modal-bg.zeigen') ||
      Array.from(document.querySelectorAll('.modal-bg')).some(el => el.style.display === 'flex' || el.style.display === 'block');
  }
  // ---------- PULL-TO-REFRESH (von oben nach unten wischen) ----------
  (function () {
    let startY = 0, ziehend = false, ausgeloest = false;
    const SCHWELLE = 130;
    let indikator = null;
    function indikatorZeigen(strecke) {
      if (!indikator) {
        indikator = document.createElement('div');
        indikator.id = '__pullToRefreshIndikator';
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
      indikator.textContent = anteil >= 1 ? '↻' : '↓';
    }
    function indikatorAusblenden() { if (indikator) indikator.style.opacity = '0'; }
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY > 0 || e.touches.length !== 1 || __pullToRefreshModalOffen()) { ziehend = false; return; }
      // Nicht in der Gartenkarte (dort verschiebt Wischen die Karte) und nicht in Bereichen,
      // die selbst nach oben gescrollt sind – sonst lädt die Seite neu und der Zoom ist weg.
      for (let el = e.target; el && el !== document.body; el = el.parentElement) {
        if (el.id === 'canvasWrap' || el.scrollTop > 0) { ziehend = false; return; }
      }
      startY = e.touches[0].clientY; ziehend = true; ausgeloest = false;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!ziehend) return;
      const strecke = e.touches[0].clientY - startY;
      if (strecke <= 0) { indikatorAusblenden(); return; }
      if (window.scrollY > 0 || __pullToRefreshModalOffen()) { ziehend = false; indikatorAusblenden(); return; }
      indikatorZeigen(strecke);
      if (strecke >= SCHWELLE) ausgeloest = true;
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (ziehend && ausgeloest) {
        if (indikator) { indikator.textContent = '↻'; indikator.style.opacity = '1'; }
        location.reload();
      } else { indikatorAusblenden(); }
      ziehend = false;
    }, { passive: true });
  })();

// Kurzmeldung unten am Bildschirm (die alte Statusanzeige in der Kopfzeile ist ausgeblendet).
// Optional mit Knopf: showTempStatus('Text', 6, { label: '→ Vorratskammer', aktion: () => … })
function showTempStatus(text, seconds, knopf) {
  let toast = document.getElementById('gartenToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gartenToast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = text;
  toast.appendChild(span);
  if (knopf && typeof knopf.aktion === 'function') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = knopf.label || 'OK';
    b.addEventListener('click', () => { toast.classList.remove('zeigen'); try { knopf.aktion(); } catch (e) { console.warn(e); } });
    toast.appendChild(b);
  }
  toast.style.pointerEvents = knopf ? 'auto' : 'none';
  toast.classList.add('zeigen');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('zeigen'), (seconds || 3) * 1000 + (knopf ? 2000 : 0));
  const el = document.getElementById('statusMsg');
  if (!el) return;
  el.textContent = text;
  if (statusMsgTimer) clearTimeout(statusMsgTimer);
  statusMsgTimer = setTimeout(() => {
    const labels={circle:'Kreis zeichnen',rect:'Rechteck zeichnen',tri:'Dreieck zeichnen',lshape:'L-Form zeichnen',freehand:'Freiform: Punkte anklicken, am Startpunkt schließen',select:'Auswählen / Verschieben',plant:`Pflanze setzen: ${selectedPlantSym}`,messen:'📏 Abstand messen',giessen:'💧 Gießrunde',tierort:'📍 Markierung setzen',tuffform:'🌷 Form des Tuffs zeichnen',freitree:`🌳 Frei platzieren: ${selectedPlantSym}`};
    el.textContent = labels[mode]||'';
  }, (seconds||5)*1000);
}

function updateShapeControls() {
  const shape=document.getElementById('newShape').value;
  document.getElementById('rowW').style.display=(shape==='circle'||shape==='rect'||shape==='tri'||shape==='lshape')?'':'none';
  document.getElementById('rowH').style.display=(shape==='circle'||shape==='rect'||shape==='tri'||shape==='lshape')?'':'none';
  document.getElementById('rowWLabel').textContent = shape==='circle' ? 'Breite (⌀)' : 'Breite';
  document.getElementById('rowHLabel').textContent = shape==='circle' ? 'Höhe (⌀)' : 'Höhe';
  document.getElementById('rowApex').style.display=shape==='tri'?'':'none';
  document.getElementById('rowCutW').style.display=shape==='lshape'?'':'none';
  document.getElementById('rowCutH').style.display=shape==='lshape'?'':'none';
  document.getElementById('rowFreehandHint').style.display=shape==='freehand'?'':'none';
}

const STRUKTUR_PRESETS = {
  beet: { farbe: '#7a9e72', icon: '🌱', label: 'Beet', platzhalter: 'z.B. Tomaten-Beet' },
  weg: { farbe: '#7d7466', icon: '🚶', label: 'Weg', platzhalter: 'z.B. Gartenweg' },
  mauer: { farbe: '#5c4f3f', icon: '🧱', label: 'Mauer', platzhalter: 'z.B. Gartenmauer' },
  gebaeude: { farbe: '#7a3a12', icon: '🏠', label: 'Gebäude', platzhalter: 'z.B. Gartenhaus' },
  terrasse: { farbe: '#a07850', icon: '🪵', label: 'Terrasse', platzhalter: 'z.B. Holzterrasse' },
  pflaster: { farbe: '#9a948a', icon: '🔲', label: 'Pflaster/Platten', platzhalter: 'z.B. Hofeinfahrt' },
  kies: { farbe: '#b8ab92', icon: '🪨', label: 'Kiesfläche', platzhalter: 'z.B. Kiesbeet' },
  rasen: { farbe: '#7fa35a', icon: '🌱', label: 'Rasen', platzhalter: 'z.B. Spielwiese' },
  hecke: { farbe: '#3f6b35', icon: '🌳', label: 'Hecke', platzhalter: 'z.B. Hainbuchenhecke' },
  zaun: { farbe: '#b08a55', icon: '🪜', label: 'Zaun', platzhalter: 'z.B. Zaun hinten' },
  wasser: { farbe: '#5b8fb5', icon: '💧', label: 'Teich/Wasser', platzhalter: 'z.B. Gartenteich' },
  sonstiges: { farbe: '#4a545e', icon: '⬛', label: 'Sonstiges', platzhalter: 'z.B. Spielturm' },
};
function applyElementTypPreset() {
  const typ = document.getElementById('newElementTyp').value;
  const preset = STRUKTUR_PRESETS[typ];
  if (!preset) return;
  document.getElementById('newName').placeholder = preset.platzhalter;
  bedColor = preset.farbe;
  document.querySelectorAll('#colorPicker .color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === preset.farbe);
  });
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));
  el.classList.add('selected'); bedColor=el.dataset.color;
}

// ==================== BED EDITOR ====================
function switchBedEditorTab(name) {
  document.getElementById('bedTabEigenschaften').style.display = name === 'eigenschaften' ? '' : 'none';
  document.getElementById('bedTabUebersicht').style.display = name === 'uebersicht' ? '' : 'none';
  document.getElementById('btnBedTabEigenschaften').classList.toggle('active', name === 'eigenschaften');
  document.getElementById('btnBedTabUebersicht').classList.toggle('active', name === 'uebersicht');
  document.getElementById('btnBedTabEigenschaften').setAttribute('aria-selected', name === 'eigenschaften');
  document.getElementById('btnBedTabUebersicht').setAttribute('aria-selected', name === 'uebersicht');
}
function renderBedPlantAddSuggestions(filter) {
  const box = document.getElementById('bedPlantAddSuggestions');
  if (!box) return;
  filter = (filter || '').trim().toLowerCase();
  if (!filter) { box.innerHTML = ''; return; }
  const treffer = PLANTS.filter(p => p.name.toLowerCase().includes(filter)).slice(0, 12);
  if (!treffer.length) { box.innerHTML = '<div class="empty-state" style="font-size:0.72rem">Keine Treffer.</div>'; return; }
  box.innerHTML = treffer.map((p, i) =>
    `<div class="bed-item" onclick="fuegePflanzeUeberSucheHinzu(${i})">
      <span style="font-size:1rem">${p.sym}</span>
      <span style="flex:1">${escapeHtml(p.name)}</span>
      <span style="color:var(--moss);font-weight:600;">＋</span>
    </div>`
  ).join('');
  window._bedPlantAddTreffer = treffer;
}
function fuegePflanzeUeberSucheHinzu(i) {
  const treffer = window._bedPlantAddTreffer;
  if (!treffer || !treffer[i] || !selectedBed) return;
  const p = treffer[i];
  const bed = selectedBed;
  if (!bed.plants) bed.plants = [];
  // Einfache Rasterplatzierung im Beet, damit mehrfach hinzugefügte Pflanzen nicht exakt übereinanderliegen
  const halbW = bed.shape === 'circle' ? (bed.rx ?? 60) : (bed.w || 120) / 2;
  const halbH = bed.shape === 'circle' ? (bed.ry ?? 60) : (bed.h || 80) / 2;
  const spaltenBreite = 32;
  const spalten = Math.max(1, Math.floor((halbW * 2 * 0.8) / spaltenBreite));
  const index = bed.plants.length;
  const spalte = index % spalten;
  const zeile = Math.floor(index / spalten);
  const rx = -halbW * 0.8 + spalte * spaltenBreite;
  const ry = -halbH * 0.8 + zeile * spaltenBreite;
  pushUndo();
  bed.plants.push({ sym: p.sym, name: p.name, variety: '', rx, ry, notes: '', date: '', location: '', pest: '', solution: '' });
  saveData(); draw(); updateStatus();
  const newIdx = bed.plants.length - 1;
  renderBedPlantList(bed, document.getElementById('bedPlantSearch')?.value || '');
  document.getElementById('bedPlantAddSearch').value = '';
  document.getElementById('bedPlantAddSuggestions').innerHTML = '';
  const mischConflict = plantHasConflict(bed, newIdx);
  const rotConflict = getFruchtfolgeWarning(bed, p.name);
  if (mischConflict && rotConflict) {
    showTempStatus(`✓ ${p.name} hinzugefügt – ⚠ Mischkultur-Konflikt UND Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} hier.`, 8);
  } else if (mischConflict) {
    showTempStatus(`✓ ${p.name} hinzugefügt – ⚠ Mischkultur-Konflikt mit Nachbarn im Beet.`, 6);
  } else if (rotConflict) {
    showTempStatus(`✓ ${p.name} hinzugefügt – ⚠ Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} hier – Fruchtfolge-Pause empfohlen.`, 7);
  } else {
    showTempStatus(`✓ ${p.name} zum Beet hinzugefügt.`, 3);
  }
}
window.switchBedEditorTab = switchBedEditorTab;
window.renderBedPlantAddSuggestions = renderBedPlantAddSuggestions;
window.fuegePflanzeUeberSucheHinzu = fuegePflanzeUeberSucheHinzu;

function showBedEditor(bed) {
  document.getElementById('selectedBedEditor').style.display='block';
  aktualisiereBedLockButton(bed);
  const istStruktur = bed.kind === 'struktur';
  const preset = STRUKTUR_PRESETS[bed.strukturTyp] || null;
  document.getElementById('editorTitel').textContent = istStruktur ? `✏️ ${preset ? preset.icon + ' ' + preset.label : 'Element'} bearbeiten` : '✏️ Beet bearbeiten';
  document.getElementById('editPlantSection').style.display = istStruktur ? 'none' : '';
  document.getElementById('editFruchtfolgeSection').style.display = istStruktur ? 'none' : '';
  document.getElementById('editDensityRow').style.display = istStruktur ? 'none' : '';
  document.getElementById('bedEditorTabs').style.display = istStruktur ? 'none' : '';
  document.getElementById('bedPlantAddSearch').value = '';
  document.getElementById('bedPlantAddSuggestions').innerHTML = '';
  switchBedEditorTab('eigenschaften');
  document.getElementById('btnDeleteSelected').textContent = istStruktur ? '🗑 Element löschen' : '🗑 Beet löschen';
  document.getElementById('editName').value=bed.name||'';
  const typRow = document.getElementById('editStrukturTypRow');
  typRow.style.display = istStruktur ? '' : 'none';
  if (istStruktur) document.getElementById('editStrukturTyp').innerHTML = Object.entries(STRUKTUR_PRESETS).filter(([k]) => k !== 'beet')
    .map(([k, v]) => `<option value="${k}"${bed.strukturTyp === k ? ' selected' : ''}>${v.icon} ${escapeHtml(v.label)}</option>`).join('');
  renderBeetFotoEditor(bed);
  document.getElementById('editRot').value=bed.rotation||0;
  document.getElementById('rotVal').textContent=(bed.rotation||0)+'°';
  if (bed.shape==='circle') {
    document.getElementById('editW').value=(bed.rx ?? bed.r ?? 60)*2;
    document.getElementById('editH').value=(bed.ry ?? bed.r ?? 60)*2;
  } else {
    document.getElementById('editW').value=bed.w||120;
    document.getElementById('editH').value=bed.h||80;
  }
  document.getElementById('editApex').value=Math.round((bed.apexOffset||0)*100);
  document.getElementById('editCutW').value=bed.cutW||60;
  document.getElementById('editCutH').value=bed.cutH||40;
  document.getElementById('editWLabel').innerHTML = (bed.shape==='circle' ? 'Breite (⌀)' : 'Breite') + ' <span id="editWReal" style="font-weight:400;opacity:0.7"></span>';
  document.getElementById('editHLabel').innerHTML = (bed.shape==='circle' ? 'Höhe (⌀)' : 'Höhe') + ' <span id="editHReal" style="font-weight:400;opacity:0.7"></span>';
  document.getElementById('editWRow').style.display=(bed.shape==='freehand')?'none':'';
  document.getElementById('editHRow').style.display=(bed.shape==='freehand')?'none':'';
  document.getElementById('editApexRow').style.display=bed.shape==='tri'?'':'none';
  document.getElementById('editCutWRow').style.display=bed.shape==='lshape'?'':'none';
  document.getElementById('editCutHRow').style.display=bed.shape==='lshape'?'':'none';
  const freehandNote = document.getElementById('editFreehandNote');
  if (freehandNote) freehandNote.style.display = bed.shape==='freehand' ? '' : 'none';
  document.querySelectorAll('#editColorPicker .color-swatch').forEach(s=>s.classList.toggle('selected', s.dataset.color===bed.color));
  document.getElementById('editColorCustom').value = bed.color || '#7a9e72';
  renderBedArea(bed);
  try { renderBedLage(bed); } catch (e) { console.warn('Lage', e); }
  renderFruchtfolge(bed);
  const searchEl = document.getElementById('bedPlantSearch');
  if (searchEl) searchEl.value = '';
  renderBedPlantList(bed, '');
  document.getElementById('bedPhotoDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('bedPhotoNote').value = '';
  renderBedPhotoLog(bed);
  aktualisiereRealMasseAnzeige();
}
function strukturTypAendern(typ) {
  if (!selectedBed || selectedBed.kind !== 'struktur' || !STRUKTUR_PRESETS[typ]) return;
  pushUndo();
  const altPreset = STRUKTUR_PRESETS[selectedBed.strukturTyp];
  // Farbe mitwechseln, solange noch die Standardfarbe des alten Typs gesetzt war
  if (!altPreset || selectedBed.color === altPreset.farbe) selectedBed.color = STRUKTUR_PRESETS[typ].farbe;
  selectedBed.strukturTyp = typ;
  showBedEditor(selectedBed); draw(); renderBedList(); saveData();
}
function setzeRechtwinkligesDreieck() {
  if (!selectedBed || selectedBed.shape!=='tri') return;
  pushUndo();
  const seite = Math.max(selectedBed.w||120, selectedBed.h||80);
  selectedBed.w = seite; selectedBed.h = seite; selectedBed.apexOffset = -1;
  showBedEditor(selectedBed);
  draw(); renderBedList(); saveData();
}
function aktualisiereRealMasseAnzeige() {
  const zuMeter = (px) => (px / 100).toFixed(1) + ' m';
  const wEl = document.getElementById('editWReal');
  const hEl = document.getElementById('editHReal');
  const apexEl = document.getElementById('editApexReal');
  if (wEl) wEl.textContent = '(≈ ' + zuMeter(parseInt(document.getElementById('editW').value, 10)) + ')';
  if (hEl) hEl.textContent = '(≈ ' + zuMeter(parseInt(document.getElementById('editH').value, 10)) + ')';
  if (apexEl) apexEl.textContent = document.getElementById('editApex').value + '%';
}
function setSelectedBedColor(color, el) {
  if (!selectedBed) return;
  pushUndo();
  selectedBed.color = color;
  document.querySelectorAll('#editColorPicker .color-swatch').forEach(s=>s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  document.getElementById('editColorCustom').value = color;
  draw(); renderBedList(); saveData();
}
function hideBedEditor() { document.getElementById('selectedBedEditor').style.display='none'; }
function aktualisiereBedLockButton(bed) {
  const btn = document.getElementById('btnBedLockToggle');
  if (!btn) return;
  const gesperrt = !!bed.locked;
  btn.textContent = gesperrt ? '🔓 Fixierung lösen' : '📌 Auf der Karte fixieren';
  btn.style.background = gesperrt ? '#f0f8ec' : 'var(--white)';
  btn.style.borderColor = gesperrt ? '#4a6f5c' : 'var(--parchment)';
  btn.style.color = gesperrt ? '#2c2415' : 'var(--bark)';
  btn.title = gesperrt
    ? 'Beet ist fixiert – kann auf der Karte nicht versehentlich verschoben werden'
    : 'Verhindert, dass dieses Beet beim Scrollen/Antippen versehentlich verschoben wird';
}
function toggleSelectedBedLock() {
  if (!selectedBed) return;
  pushUndo();
  selectedBed.locked = !selectedBed.locked;
  aktualisiereBedLockButton(selectedBed);
  saveData(); draw(); renderBedList();
}

// ==================== MEHRFACHAUSWAHL ====================
function toggleBedSelection(bed) {
  const idx = selectedBeds.indexOf(bed);
  if (idx >= 0) {
    selectedBeds.splice(idx,1);
  } else {
    selectedBeds.push(bed);
  }
  if (selectedBeds.length === 0) {
    selectedBed = null; hideBedEditor(); hideBulkBar();
  } else if (selectedBeds.length === 1) {
    selectedBed = selectedBeds[0]; showBedEditor(selectedBed); hideBulkBar();
  } else {
    selectedBed = bed; hideBedEditor(); showBulkBar();
  }
}
function showBulkBar() {
  document.getElementById('bulkActionBar').style.display='block';
  document.getElementById('bulkCount').textContent = selectedBeds.length;
}
function hideBulkBar() {
  document.getElementById('bulkActionBar').style.display='none';
}
function clearBedSelection() {
  selectedBeds=[]; selectedBed=null; hideBedEditor(); hideBulkBar(); draw(); renderBedList();
}
function deleteSelectedBeds() {
  if (!selectedBeds.length) return;
  if (!confirm(`${selectedBeds.length} Beete wirklich löschen?`)) return;
  pushUndo();
  setCurrentBeds(getCurrentBeds().filter(b=>!selectedBeds.includes(b)));
  selectedBeds=[]; selectedBed=null; hideBedEditor(); hideBulkBar();
  draw(); renderBedList(); saveData(); updateStatus();
}
function updateSelectedBed() {
  if(!selectedBed) return;
  selectedBed.name=document.getElementById('editName').value;
  selectedBed.rotation=parseInt(document.getElementById('editRot').value)||0;
  const w=parseInt(document.getElementById('editW').value)||120;
  const h=parseInt(document.getElementById('editH').value)||80;
  if (selectedBed.shape==='circle') {
    selectedBed.rx=w/2; selectedBed.ry=h/2;
    delete selectedBed.r;
  } else {
    selectedBed.w=w; selectedBed.h=h;
  }
  if (selectedBed.shape==='tri') {
    selectedBed.apexOffset=(parseInt(document.getElementById('editApex').value)||0)/100;
  }
  if (selectedBed.shape==='lshape') {
    const cutW=parseInt(document.getElementById('editCutW').value)||60;
    const cutH=parseInt(document.getElementById('editCutH').value)||40;
    selectedBed.cutW=Math.min(cutW, selectedBed.w-10);
    selectedBed.cutH=Math.min(cutH, selectedBed.h-10);
  }
  document.getElementById('rotVal').textContent=selectedBed.rotation+'°';
  aktualisiereRealMasseAnzeige();
  draw(); renderBedList(); saveData();
  renderBedArea(selectedBed);
}
function deleteSelected() {
  if(!selectedBed) return;
  if(!confirm(`Beet "${selectedBed.name||'Unbenannt'}" wirklich löschen?`)) return;
  pushUndo();
  setCurrentBeds(getCurrentBeds().filter(b=>b!==selectedBed));
  selectedBeds=[]; selectedBed=null; hideBedEditor(); hideBulkBar(); draw(); renderBedList(); saveData(); updateStatus();
}
function duplicateBed() {
  if(!selectedBed) return;
  pushUndo();
  const clone = JSON.parse(JSON.stringify(selectedBed));
  clone.id = Date.now() + Math.floor(Math.random()*1000);
  clone.x += 30; clone.y += 30;
  clone.name = (selectedBed.name || 'Beet') + ' (Kopie)';
  getCurrentBeds().push(clone);
  selectedBed = clone; selectedBeds=[clone];
  showBedEditor(clone); hideBulkBar();
  draw(); renderBedList(); saveData(); updateStatus();
}
function clearAll() {
  if(!confirm('Alle Beete in diesem Garten löschen?')) return;
  pushUndo();
  setCurrentBeds([]); selectedBeds=[]; selectedBed=null; hideBedEditor(); hideBulkBar(); draw(); renderBedList(); saveData(); updateStatus();
}

// ==================== BED LIST ====================
let bedSortMode = 'created';
function setBedSort(v) { bedSortMode = v; renderBedList(); }
function bedArea(bed) {
  return bedAreaPx2(bed);
}
function sortedBedsWithIndex(beds) {
  const withIdx = beds.map((bed, i) => ({ bed, i }));
  switch (bedSortMode) {
    case 'name':
      withIdx.sort((a, b) => (a.bed.name || '').localeCompare(b.bed.name || '', 'de'));
      break;
    case 'plants':
      withIdx.sort((a, b) => (b.bed.plants || []).length - (a.bed.plants || []).length);
      break;
    case 'area':
      withIdx.sort((a, b) => bedArea(b.bed) - bedArea(a.bed));
      break;
    case 'conflicts':
      withIdx.sort((a, b) => getBedConflicts(b.bed).length - getBedConflicts(a.bed).length);
      break;
    default:
      // 'created': neueste zuerst (Einfügereihenfolge umgekehrt)
      withIdx.reverse();
  }
  return withIdx;
}
// ==================== BEET-FOTO (ein Bild vom ganzen Beet) ====================
// Gleicher Aufbau wie bei Pflanzenfotos (bed.fotos), daher funktionieren 👪 Familie / 🔒 Nur ich,
// Malstil und Cloud-Upload automatisch mit. Neue Fotos kommen dazu (max. 10) – das neueste ist das Titelbild,
// ältere bleiben für den Vorher/Nachher-Vergleich.
let beetFotoBedId = null;
function beetFotoBeet() { return getCurrentBeds().find(b => b.id === beetFotoBedId) || null; }
function beetFotoOeffnen(bedId) {
  beetFotoBedId = bedId;
  beetFotoModalRendern();
  document.getElementById('beetFotoModal').style.display = 'flex';
}
function beetFotoModalSchliessen() {
  document.getElementById('beetFotoModal').style.display = 'none';
  beetFotoBedId = null;
}
function beetFotoModalRendern() {
  const bed = beetFotoBeet();
  if (!bed) return;
  ppFotosMigrieren(bed);
  const foto = ppFotoTitelbild(bed);
  document.getElementById('beetFotoTitel').textContent = '📷 ' + (bed.name || 'Beet');
  document.getElementById('beetFotoVorschau').innerHTML = foto
    ? `<img src="${escapeHtml(fotoQuelle(foto))}" alt="" onclick="fotoLightboxOeffnen(this.src)" style="width:100%;max-height:50vh;object-fit:cover;border-radius:var(--radius-md);display:block;cursor:zoom-in;border:3px solid ${bed.color || '#7a9e72'}">`
    : `<div style="padding:28px 12px;text-align:center;border:2px dashed var(--parchment);border-radius:var(--radius-md);color:var(--bark);font-size:0.8rem">Noch kein Foto vom Beet.<br>Ein Bild vom ganzen Beet hilft, es in der Liste schneller wiederzuerkennen.</div>`;
  const knopf = (text, aktion, extra) => `<button type="button" class="btn-secondary" style="width:auto;flex:1 1 auto;margin:0;${extra || ''}" onclick="${aktion}">${text}</button>`;
  const knoepfe = [knopf('📷 ' + (foto ? 'Neues Foto' : 'Foto hinzufügen'), "document.getElementById('beetFotoInput').click()")];
  if (vergleichMoeglich(bed)) knoepfe.push(knopf('↔️ Vorher/Nachher (' + vergleichFotosVon(bed).length + ')', 'vergleichOeffnen(beetFotoBeet(), (beetFotoBeet() || {}).name)'));
  let info = '';
  if (foto) {
    if (window.Malfilter && (foto.data || foto.photo)) knoepfe.push(knopf('🎨 Malstil', 'beetFotoMalen()'));
    if (window.FotoSpeicher && window.FotoSpeicher.verfuegbar()) {
      knoepfe.push(knopf(foto.geteilt === false ? '🔒 Nur ich' : '👪 Familie', 'beetFotoTeilen()'));
      info = foto.geteilt === false ? '🔒 Nur auf diesem Gerät sichtbar – antippen, um es mit der Familie zu teilen.'
        : (foto.url ? '👪 Für die ganze Familie sichtbar.' : '👪 Wird mit der Familie geteilt (Upload ausstehend).');
    }
    knoepfe.push(knopf('🗑 Entfernen', 'beetFotoEntfernen()', 'color:#c05030;border-color:#c05030'));
    if (foto.datum) info = 'Aufgenommen am ' + new Date(foto.datum + 'T00:00').toLocaleDateString('de-DE') + (info ? ' · ' + info : '');
  }
  document.getElementById('beetFotoKnoepfe').innerHTML = knoepfe.join('');
  document.getElementById('beetFotoInfo').textContent = info;
}
function handleBeetFoto(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  const bed = beetFotoBeet();
  if (!file || !bed) return;
  const modal = document.getElementById('beetFotoModal');
  const speichern = (quelle, geteilt) => {
    const img = new Image();
    img.onerror = () => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); beetFotoOeffnen(bed.id); };
    img.onload = () => {
      const maxW = 640; // etwas breiter als Pflanzenfotos – ganze Beete sind meist Querformat
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = img.width * scale; c.height = img.height * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      pushUndo();
      ppFotosMigrieren(bed);
      bed.fotos.push({ id: fotoNeueId(), data: c.toDataURL('image/jpeg', 0.72), datum: new Date().toISOString().slice(0, 10), geteilt: geteilt !== false });
      delete bed.fotoTitelbildId;
      while (bed.fotos.length > 10) fotoCloudLoeschen(bed.fotos.shift());
      saveData();
      beetFotoAnsichtenAktualisieren();
      beetFotoOeffnen(bed.id);
      familienFotosHochladen();
      showTempStatus('📷 Beet-Foto gespeichert', 3);
    };
    img.src = quelle;
  };
  const reader = new FileReader();
  reader.onerror = () => showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5);
  reader.onload = (ev) => {
    if (!window.Malfilter) { speichern(ev.target.result, true); return; }
    modal.style.display = 'none'; // Malstil-Dialog nicht hinter dem Fenster verstecken
    window.Malfilter.dialog(ev.target.result, { titel: '📷 Foto vom Beet', mitStil: true, teilen: true })
      .then((erg) => { if (erg) speichern(erg.bild, erg.geteilt); else beetFotoOeffnen(bed.id); })
      .catch(() => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); beetFotoOeffnen(bed.id); });
  };
  reader.readAsDataURL(file);
}
function beetFotoMalen() {
  const bed = beetFotoBeet();
  if (!bed) return;
  document.getElementById('beetFotoModal').style.display = 'none';
  fotoMalstilAnwenden(bed, () => { beetFotoAnsichtenAktualisieren(); beetFotoOeffnen(bed.id); });
}
function beetFotoTeilen() {
  const bed = beetFotoBeet();
  if (!bed) return;
  fotoTeilenUmschalten(bed, () => { beetFotoModalRendern(); beetFotoAnsichtenAktualisieren(); });
}
function beetFotoEntfernen() {
  const bed = beetFotoBeet();
  if (!bed || !confirm('Aktuelles Foto von „' + (bed.name || 'Beet') + '“ entfernen?')) return;
  pushUndo();
  ppFotosMigrieren(bed);
  const aktuell = ppFotoTitelbild(bed);
  const i = aktuell ? bed.fotos.indexOf(aktuell) : -1;
  if (i !== -1) fotoCloudLoeschen(bed.fotos.splice(i, 1)[0]);
  delete bed.fotoTitelbildId;
  saveData();
  beetFotoModalRendern();
  beetFotoAnsichtenAktualisieren();
}
function beetFotoAnsichtenAktualisieren() {
  const liste = document.getElementById('vollbildListeWrap');
  if (liste && liste.classList.contains('aktiv')) renderVollbildListe();
  if (selectedBed) renderBeetFotoEditor(selectedBed);
}
function renderBeetFotoEditor(bed) {
  const row = document.getElementById('editBeetFotoRow');
  const btn = document.getElementById('btnEditBeetFoto');
  if (!row || !btn) return;
  if (!bed || bed.kind === 'struktur') { row.style.display = 'none'; return; }
  row.style.display = '';
  const foto = ppFotoTitelbild(bed);
  btn.innerHTML = foto
    ? `<img src="${escapeHtml(fotoQuelle(foto))}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${bed.color || '#7a9e72'}"><span>Foto ansehen / ändern${foto.geteilt === false ? ' · 🔒 nur ich' : ''}</span>`
    : `<span style="font-size:1.3rem">📷</span><span>Foto vom ganzen Beet hinzufügen</span>`;
}

// ==================== BEET-HINWEISE ====================
// Wertet die Pflanzen eines Beets gemeinsam aus: Mischkultur, Nährstoffbedarf, Fruchtfolge,
// Gehölze/wuchernde Pflanzen und Platzbedarf. Nutzt nur vorhandene Tabellen
// (COMPANIONS, PFLANZEN_BEDINGUNGEN, SPACING, FAMILIES), nichts wird gespeichert.
const BEET_WUCHERND = {
  'Minze': ['warn', 'bildet lange Ausläufer und überwuchert Nachbarn – am besten mit Wurzelsperre oder im eingegrabenen Topf'],
  'Topinambur': ['warn', 'wuchert über Knollen, jede vergessene Knolle treibt neu aus – eigene Ecke oder Wurzelsperre einplanen'],
  'Schlehe': ['warn', 'bildet viele Wurzelausläufer – im Beet kaum zu bändigen'],
  'Brombeere': ['warn', 'treibt Ausläufer und wurzelt an den Rutenspitzen ein – Rankgerüst und Abstand einplanen'],
  'Himbeere': ['info', 'wandert mit Ausläufern – eine Rhizomsperre hält sie an ihrem Platz'],
  'Zitronenmelisse': ['info', 'sät sich stark selbst aus – Blütenstände vor der Samenreife abschneiden'],
  'Borretsch': ['info', 'sät sich reichlich selbst aus – Sämlinge im Frühjahr ausdünnen'],
};
function zahlDe(n) { return (Math.round(n * 10) / 10).toLocaleString('de-DE'); }
function beetIstGehoelz(name) { return isPerennial(name) && (SPACING[name] || 0) >= 200; }
function beetHinweise(bed) {
  if (!bed || bed.kind === 'struktur') return [];
  const plants = (bed.plants || []).filter(p => (p.name || '').trim());
  if (!plants.length) return [];
  const e = escapeHtml;
  const warn = [], info = [], gut = [];
  const namen = [...new Set(plants.map(p => p.name.trim()))];

  // 1. Mischkultur: schlechte Nachbarn
  const schlecht = new Set();
  getBedConflicts(bed).forEach(([i, j]) => {
    schlecht.add([bed.plants[i].name.trim(), bed.plants[j].name.trim()].sort((a, b) => a.localeCompare(b, 'de')).join('|'));
  });
  schlecht.forEach(k => {
    const [a, b] = k.split('|');
    warn.push({ icon: '🚫', text: `<b>${e(a)}</b> und <b>${e(b)}</b> vertragen sich nicht – möglichst in verschiedene Beete oder weit auseinander setzen.` });
  });

  // 2. Fruchtfolge (eine Meldung pro Pflanzenfamilie)
  const famGesehen = new Set();
  plants.forEach(p => {
    const w = getFruchtfolgeWarning(bed, p.name);
    if (w && !famGesehen.has(w.fam)) {
      famGesehen.add(w.fam);
      warn.push({ icon: '🔄', text: `Fruchtfolge: <b>${e(w.fam)}</b> (${e(p.name.trim())}) stand ${w.yearsAgo === 1 ? 'letztes Jahr' : 'vor ' + w.yearsAgo + ' Jahren'} schon hier – besser 3–4 Jahre Pause.` });
    }
  });

  // 3. Bäume/große Sträucher im Beet
  namen.filter(beetIstGehoelz).forEach(n => {
    warn.push({ icon: '🌳', text: `<b>${e(n)}</b> wird ein großes Gehölz (ca. ${zahlDe(SPACING[n] / 100)} m Pflanzabstand) – beschattet und durchwurzelt das Beet. Besser frei stehend setzen (🌳 Frei platzieren).` });
  });

  // 4. Wuchernde Pflanzen
  namen.filter(n => BEET_WUCHERND[n] && !beetIstGehoelz(n)).forEach(n => {
    const [art, text] = BEET_WUCHERND[n];
    (art === 'warn' ? warn : info).push({ icon: '🌿', text: `<b>${e(n)}</b> ${text}.` });
  });

  // 5. Nährstoffbedarf (Stark-/Mittel-/Schwachzehrer, Gehölze ausgenommen)
  const zehrer = { S: [], M: [], W: [] }, anzahl = { S: 0, M: 0, W: 0 };
  plants.forEach(p => {
    const n = p.name.trim();
    if (beetIstGehoelz(n)) return;
    const b = pflanzenBedingungenFinden(n);
    if (!b || !anzahl.hasOwnProperty(b[2])) return;
    anzahl[b[2]]++;
    if (!zehrer[b[2]].includes(n)) zehrer[b[2]].push(n);
  });
  const bekannt = anzahl.S + anzahl.M + anzahl.W;
  if (bekannt) {
    const anteil = anzahl.S / bekannt;
    if ((anzahl.S >= 3 && anteil >= 0.5) || (anzahl.S >= 2 && anteil >= 0.66)) {
      warn.push({ icon: '🍽️', text: `Viele Starkzehrer (${zehrer.S.map(e).join(', ')}) – der Boden wird stark ausgelaugt. Reichlich Kompost geben und nächstes Jahr hier Mittel- oder Schwachzehrer anbauen.` });
    } else if (anzahl.S && anzahl.W) {
      info.push({ icon: '🥄', text: `Stark- und Schwachzehrer gemischt – Kompost/Dünger gezielt an ${zehrer.S.map(e).join(', ')} geben statt flächig.` });
    }
    const teile = [];
    if (anzahl.S) teile.push(`🍽️ ${anzahl.S}× Stark`);
    if (anzahl.M) teile.push(`🥣 ${anzahl.M}× Mittel`);
    if (anzahl.W) teile.push(`🥄 ${anzahl.W}× Schwach`);
    info.push({ icon: '🌱', text: 'Nährstoffbedarf: ' + teile.join(' · ') });
  }

  // 6. Mehrjährige zwischen Einjährigen
  const mehrj = namen.filter(n => isPerennial(n) && !beetIstGehoelz(n) && !BEET_WUCHERND[n]);
  if (mehrj.length && namen.some(n => !isPerennial(n))) {
    info.push({ icon: '🔁', text: `Mehrjährig: ${mehrj.map(e).join(', ')} – bleibt stehen, beim Umgraben und in der Fruchtfolge mit einplanen.` });
  }

  // 7. Platzbedarf (Pflanzabstand² je Pflanze gegen die Beetfläche)
  const flaeche = bedAreaPx2(bed) * getScale() * getScale() / 10000;
  let bedarf = 0, gezaehlt = 0;
  plants.forEach(p => {
    const n = p.name.trim(), abstand = SPACING[n];
    if (!abstand || beetIstGehoelz(n)) return;
    bedarf += (abstand / 100) * (abstand / 100);
    gezaehlt++;
  });
  if (flaeche > 0 && gezaehlt) {
    if (bedarf > flaeche * 1.2) {
      warn.push({ icon: '📏', text: `Eng bepflanzt: die Pflanzen brauchen ca. ${zahlDe(bedarf)} m², das Beet hat ${zahlDe(flaeche)} m². Mehr Abstand beugt Pilzkrankheiten vor.` });
    } else if (bedarf < flaeche * 0.5 && flaeche - bedarf >= 0.5) {
      info.push({ icon: '📏', text: `Noch Platz: ca. ${zahlDe(flaeche - bedarf)} m² von ${zahlDe(flaeche)} m² sind frei.` });
    }
  }

  // 8. Gute Nachbarn im Beet
  const gutePaare = [];
  for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
    const a = namen[i], b = namen[j], ca = COMPANIONS[a], cb = COMPANIONS[b];
    if ((ca && ca.good.includes(b)) || (cb && cb.good.includes(a))) gutePaare.push(`${e(a)} + ${e(b)}`);
  }
  if (gutePaare.length) gut.push({ icon: '🤝', text: 'Gute Nachbarn: ' + gutePaare.slice(0, 4).join(', ') + (gutePaare.length > 4 ? ` und ${gutePaare.length - 4} weitere` : '') });

  // 9. Vorschläge: was würde gut dazupassen (gut mit möglichst vielen, mit keinem schlecht)
  const kandidaten = new Set(Object.keys(COMPANIONS));
  namen.forEach(n => ((COMPANIONS[n] || {}).good || []).forEach(k => kandidaten.add(k)));
  const passend = [];
  kandidaten.forEach(k => {
    if (namen.includes(k) || k === 'Kräuter' || k === 'Blume' || beetIstGehoelz(k) || !PLANTS.some(p => p.name === k)) return;
    if (plantWouldConflict(bed, k) || getFruchtfolgeWarning(bed, k)) return;
    const famK = getFamily(k); // gleiche Pflanzenfamilie wie schon im Beet (z.B. Kohl zu Kohl) ist kein guter Mischkultur-Tipp
    if (famK && famK !== 'verschiedene' && namen.some(n => getFamily(n) === famK)) return;
    const ck = COMPANIONS[k];
    const freunde = namen.filter(n => (ck && ck.good.includes(n)) || (COMPANIONS[n] && COMPANIONS[n].good.includes(k))).length;
    if (freunde) passend.push([k, freunde]);
  });
  passend.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
  if (passend.length) {
    info.push({ icon: '💡', text: 'Würde gut dazupassen: ' + passend.slice(0, 4).map(([n]) => { const p = PLANTS.find(x => x.name === n); return (p ? p.sym + ' ' : '') + e(n); }).join(', ') });
  }

  return warn.map(h => Object.assign(h, { art: 'warn' }))
    .concat(gut.map(h => Object.assign(h, { art: 'gut' })), info.map(h => Object.assign(h, { art: 'info' })));
}
function beetHinweiseZeilenHtml(hinweise) {
  return hinweise.map(h => `<div class="beet-hinweis ${h.art}"><span class="bh-icon">${h.icon}</span><span>${h.text}</span></div>`).join('');
}
// Listenansicht: aufklappbar; mit Warnungen standardmäßig offen, sonst zu
const vlistHinweiseUmgeschaltet = new Set();
function vlistHinweiseUmschalten(key) {
  if (vlistHinweiseUmgeschaltet.has(key)) vlistHinweiseUmgeschaltet.delete(key); else vlistHinweiseUmgeschaltet.add(key);
  renderVollbildListe();
}
function beetHinweiseBlockHtml(hinweise, key) {
  if (!hinweise.length) return '';
  const warnAnzahl = hinweise.filter(h => h.art === 'warn').length;
  const offen = (warnAnzahl > 0) !== vlistHinweiseUmgeschaltet.has(String(key));
  const titel = warnAnzahl ? `⚠️ ${warnAnzahl} ${warnAnzahl === 1 ? 'Hinweis' : 'Hinweise'} zum Beet` : `💡 Tipps zum Beet (${hinweise.length})`;
  return `<div class="beet-hinweise">
    <button type="button" class="beet-hinweise-kopf" data-hinweise-key="${escapeHtml(String(key))}" aria-expanded="${offen}">${titel}<span class="vlist-pfeil">${offen ? '▾' : '▸'}</span></button>
    ${offen ? beetHinweiseZeilenHtml(hinweise) : ''}
  </div>`;
}
// Beet-Editor (Seitenleiste, Tab „Übersicht“): immer vollständig
function renderBeetHinweiseSidebar(bed) {
  const box = document.getElementById('bedHinweiseBox');
  if (!box) return;
  if (!bed || bed.kind === 'struktur') { box.innerHTML = ''; return; }
  const hinweise = beetHinweise(bed);
  box.innerHTML = hinweise.length
    ? `<div class="beet-hinweise" style="margin:0">${beetHinweiseZeilenHtml(hinweise)}</div>`
    : '<div style="font-size:0.74rem;color:var(--bark)">Sobald Pflanzen im Beet stehen, erscheinen hier Hinweise zu Nachbarschaft, Nährstoffen und Platz.</div>';
}

// ==================== ANSICHTS-UMSCHALTUNG (Karte+Liste / nur Liste / nur Karte) ====================
let gartenAnsichtModus = 'standard';
try { gartenAnsichtModus = localStorage.getItem('garten_ansichtModus') || 'standard'; } catch (e) {}
function gartenAnsichtSetzen(modus) {
  gartenAnsichtModus = modus;
  try { localStorage.setItem('garten_ansichtModus', modus); } catch (e) {}
  applyGartenAnsichtModus();
}
function applyGartenAnsichtModus() {
  const main = document.querySelector('.main');
  const vlist = document.getElementById('vollbildListeWrap');
  if (!main || !vlist) return;
  document.querySelectorAll('.ansicht-umschalt-btn').forEach(b => b.classList.toggle('active', b.dataset.modus === gartenAnsichtModus));
  if (gartenAnsichtModus === 'liste') {
    main.classList.add('modus-versteckt');
    main.classList.remove('modus-nur-karte');
    vlist.classList.add('aktiv');
    renderVollbildListe();
  } else {
    main.classList.remove('modus-versteckt');
    vlist.classList.remove('aktiv');
    main.classList.toggle('modus-nur-karte', gartenAnsichtModus === 'karte');
    resizeCanvas();
    setTimeout(positioniereZoomWidget, 30);
  }
}
// ==================== BEETÜBERSICHT (Listenansicht) ====================
// Sortierung (nach Beet / nach Pflanze / zu tun) und zugeklappte Beete werden pro Gerät gemerkt.
const VLIST_SORT_KEY = 'garten_vlistSortierung';
const VLIST_ZU_KEY = 'garten_vlistZugeklappt';
let vlistSort = (() => { try { return localStorage.getItem(VLIST_SORT_KEY) || 'beet'; } catch (e) { return 'beet'; } })();
let vlistZu = (() => { try { return JSON.parse(localStorage.getItem(VLIST_ZU_KEY) || '{}') || {}; } catch (e) { return {}; } })();
const vlistOffeneGruppen = new Set(); // aufgeklappte ×N-Gruppen (nur für diese Sitzung)
function vlistSortSetzen(s) {
  vlistSort = s; try { localStorage.setItem(VLIST_SORT_KEY, s); } catch (e) {}
  renderVollbildListe();
}
function vlistBeetUmschalten(key) {
  if (vlistZu[key]) delete vlistZu[key]; else vlistZu[key] = true;
  try { localStorage.setItem(VLIST_ZU_KEY, JSON.stringify(vlistZu)); } catch (e) {}
  renderVollbildListe();
}
function vlistGruppeUmschalten(key) {
  if (vlistOffeneGruppen.has(key)) vlistOffeneGruppen.delete(key); else vlistOffeneGruppen.add(key);
  renderVollbildListe();
}
// Status-Hinweise einer Pflanze. bed/pIdx nur bei Beet-Pflanzen (Gießen, Düngen, Mischkultur).
// Liefert [{icon, text, prio}] – prio 1 = dringend (heute), 2 = Hinweis.
function vlistStatus(p, bed, pIdx) {
  const name = (p.name || '').trim();
  const out = [];
  const monat = new Date().getMonth() + 1;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const info = CARE_INFO[name];
  let gepflanzt = p.date ? new Date(p.date + 'T00:00:00') : null;
  if (gepflanzt && isNaN(gepflanzt.getTime())) gepflanzt = null;
  const alter = gepflanzt ? daysBetween(gepflanzt, heute) : null;
  if (bed && info && alter !== null && alter >= 0) {
    const basis = `${bed.id}_${pIdx}`;
    if (info.waterDays > 0 && giessFaelligkeit(p, info.waterDays, alter).dueToday && !isCareTaskDone(basis + '_water'))
      out.push({ icon: '💧', text: 'Heute gießen', prio: 1, art: 'water' });
    if (info.fertilizeDays > 0 && alter % info.fertilizeDays <= 1 && !isCareTaskDone(basis + '_fertilize'))
      out.push({ icon: '🌿', text: 'Düngen fällig', prio: 1, art: 'fertilize' });
    if (info.harvestDays > 0 && info.harvestDays - alter <= 0 && !isCareTaskDone(basis + '_harvest'))
      out.push({ icon: '🧺', text: 'Erntereif', prio: 1, art: 'harvest' });
  }
  // Mehrjährige/Gehölze ohne Tageszähler: typische Erntemonate
  if (!out.some(s => s.art === 'harvest') && (!info || !(info.harvestDays > 0)) && isInHarvestWindow(HARVEST_WINDOW[name], monat))
    out.push({ icon: '🧺', text: 'Erntezeit (' + monthRange(HARVEST_WINDOW[name]) + ')', prio: 2, art: 'harvest' });
  const schnittKey = pflanzenSchluesselFinden(name, RUECKSCHNITT);
  if (schnittKey && isInHarvestWindow(RUECKSCHNITT[schnittKey].monate, monat))
    out.push({ icon: '✂️', text: 'Rückschnitt jetzt (' + monthRange(RUECKSCHNITT[schnittKey].monate) + ')', prio: 2, art: 'schnitt' });
  if (bed && plantHasConflict(bed, pIdx))
    out.push({ icon: '⚠️', text: 'Verträgt sich nicht mit einem Nachbarn im Beet', prio: 2, art: 'konflikt' });
  if (isFrostTender(name) && getUpcomingFrostWarning() && (!gepflanzt || gepflanzt <= heute))
    out.push({ icon: '❄️', text: 'Frost angesagt – frostempfindlich', prio: 1, art: 'frost' });
  return out;
}
function vlistStatusHtml(liste) {
  // gleiche Symbole nur einmal zeigen (bei zusammengefassten Gruppen)
  const gesehen = new Set();
  return liste.filter(s => !gesehen.has(s.icon) && gesehen.add(s.icon))
    .map(s => `<span class="vlist-status${s.prio === 1 ? ' dringend' : ''}" title="${escapeHtml(s.text)}">${s.icon}</span>`).join('');
}
function vlistBildHtml(p, gross) {
  const f = ppFotoTitelbild(p);
  const cls = 'vlist-bild' + (gross ? ' gross' : '');
  return f ? `<span class="${cls}"><img src="${escapeHtml(fotoQuelle(f))}" alt="" loading="lazy"></span>`
           : `<span class="${cls}">${p.sym || '🌱'}</span>`;
}
function vlistDatum(d) {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return isNaN(x.getTime()) ? '' : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
// Eine anklickbare Pflanzenzeile. ziel: {bedIdx, plantIdx} oder {freiIdx}
function vlistZeileHtml(p, ziel, status, zusatz) {
  const attrs = ziel.freiIdx !== undefined ? `data-frei-idx="${ziel.freiIdx}"` : `data-bed-idx="${ziel.bedIdx}" data-plant-idx="${ziel.plantIdx}"`;
  const sorte = p.variety || p.sorte;
  const ernten = (p.harvests || []).length;
  return `<button type="button" class="vlist-plant-zeile" ${attrs}>
      ${vlistBildHtml(p)}
      <span class="vlist-name">${escapeHtml(p.name || 'Unbenannt')}${sorte ? ' <span class="vlist-sorte">(' + escapeHtml(sorte) + ')</span>' : ''}
        ${zusatz ? `<span class="vlist-zusatz">${zusatz}</span>` : ''}</span>
      ${p.bewertung ? `<span class="vlist-sterne">${'★'.repeat(Math.round(p.bewertung))}</span>` : ''}
      ${meilensteinIconFuer(ernten) ? `<span title="${ernten}× geerntet">${meilensteinIconFuer(ernten)}</span>` : ''}
      <span class="vlist-status-reihe">${vlistStatusHtml(status)}</span>
    </button>`;
}
// Fasst gleiche Pflanzen (Name + Sorte) zusammen. eintraege: [{p, ziel, status, zusatz}]
function vlistGruppiertHtml(eintraege, gruppenPrefix) {
  const gruppen = [];
  const map = {};
  eintraege.forEach(e => {
    const k = ((e.p.name || '') + '|' + (e.p.variety || e.p.sorte || '') + '|' + (e.gruppeExtra || '')).toLowerCase();
    if (!map[k]) { map[k] = { key: gruppenPrefix + ':' + k, liste: [] }; gruppen.push(map[k]); }
    map[k].liste.push(e);
  });
  return gruppen.map(g => {
    if (g.liste.length === 1) { const e = g.liste[0]; return vlistZeileHtml(e.p, e.ziel, e.status, e.zusatz); }
    const e0 = g.liste[0];
    const offen = vlistOffeneGruppen.has(g.key);
    const alleStatus = g.liste.flatMap(e => e.status);
    const sorte = e0.p.variety || e0.p.sorte;
    const kopf = `<button type="button" class="vlist-plant-zeile vlist-gruppe-kopf" data-gruppe="${escapeHtml(g.key)}" aria-expanded="${offen}">
        ${vlistBildHtml(e0.p)}
        <span class="vlist-name">${escapeHtml(e0.p.name || 'Unbenannt')}${sorte ? ' <span class="vlist-sorte">(' + escapeHtml(sorte) + ')</span>' : ''}
          <span class="vlist-anzahl">×${g.liste.length}</span>
          ${(() => { const z = [...new Set(g.liste.map(e => e.zusatz).filter(Boolean))]; return z.length ? `<span class="vlist-zusatz">${z.join(' · ')}</span>` : ''; })()}</span>
        <span class="vlist-status-reihe">${vlistStatusHtml(alleStatus)}</span>
        <span class="vlist-pfeil">${offen ? '▾' : '▸'}</span>
      </button>`;
    if (!offen) return kopf;
    return kopf + '<div class="vlist-gruppe-inhalt">' + g.liste.map((e, n) =>
      vlistZeileHtml(e.p, e.ziel, e.status, e.zusatz || (vlistDatum(e.p.date) ? '🗓 ' + vlistDatum(e.p.date) : '#' + (n + 1)))).join('') + '</div>';
  }).join('');
}
function vlistBeetZusammenfassung(eintraege) {
  const zaehle = art => eintraege.filter(e => e.status.some(s => s.art === art && s.prio === 1)).length;
  const teile = [];
  const w = zaehle('water'), h = zaehle('harvest'), d = zaehle('fertilize'), f = zaehle('frost');
  if (w) teile.push('💧 ' + w + '× gießen');
  if (h) teile.push('🧺 ' + h + '× ernten');
  if (d) teile.push('🌿 ' + d + '× düngen');
  if (f) teile.push('❄️ Frost');
  return teile.length ? teile.join(' · ') : '<span style="opacity:0.7">✓ nichts fällig</span>';
}
const VLIST_FREI_GRUPPEN = [['Obst', '🌳 Obstbäume'], ['Beeren', '🫐 Beerensträucher'], ['Blumen', '🌸 Zierpflanzen'], ['', '🌿 Sonstige']];
function renderVollbildListe() {
  const box = document.getElementById('vollbildListeWrap');
  if (!box) return;
  const beds = getCurrentBeds();
  const frei = getCurrentFreiPflanzen();
  const bedsMitPflanzen = sortedBedsWithIndex(beds).filter(({ bed }) => bed.kind !== 'struktur' && (bed.plants || []).length);
  const beetEintraege = [];
  bedsMitPflanzen.forEach(({ bed, i }) => (bed.plants || []).forEach((p, pi) =>
    beetEintraege.push({ p, bed, ziel: { bedIdx: i, plantIdx: pi }, status: vlistStatus(p, bed, pi), beetName: bed.name || 'Beet ' + (i + 1) })));
  const freiEintraege = frei.map((fp, i) => ({ p: fp, ziel: { freiIdx: i }, status: vlistStatus(fp, null, null), beetName: '🌳 freistehend' }));

  const chip = (k, label) => `<button type="button" class="saat-chip${vlistSort === k ? ' an' : ''}" data-vlist-sort="${k}">${label}</button>`;
  let html = `<div class="vlist-steuerung">${chip('beet', '📍 Nach Beet')}${chip('pflanze', '🔤 Nach Pflanze')}${chip('todo', '✅ Zu tun')}</div>`;

  if (vlistSort === 'pflanze') {
    const alle = beetEintraege.map(e => Object.assign({}, e, { zusatz: escapeHtml(e.beetName) }))
      .concat(freiEintraege.map(e => Object.assign({}, e, { zusatz: 'freistehend' })));
    alle.sort((a, b) => (a.p.name || '').localeCompare(b.p.name || '', 'de'));
    html += alle.length ? `<div class="vlist-beet vlist-karte">${vlistGruppiertHtml(alle, 'pfl')}</div>`
                        : '<div class="empty-state">Noch keine Pflanzen.</div>';
  } else if (vlistSort === 'todo') {
    const offen = beetEintraege.concat(freiEintraege).filter(e => e.status.length)
      .map(e => Object.assign({}, e, { gruppeExtra: e.beetName, zusatz: escapeHtml(e.beetName) + ' · ' + e.status.map(s => escapeHtml(s.text)).join(' · ') }));
    offen.sort((a, b) => Math.min(...a.status.map(s => s.prio)) - Math.min(...b.status.map(s => s.prio)) || (a.p.name || '').localeCompare(b.p.name || '', 'de'));
    html += offen.length ? `<div class="vlist-beet vlist-karte">${vlistGruppiertHtml(offen, 'todo')}</div>`
                         : '<div class="empty-state">🎉 Gerade ist nichts zu tun.</div>';
  } else {
    if (!bedsMitPflanzen.length) html += '<div class="empty-state">Noch keine Pflanzen in einem Beet.</div>';
    html += bedsMitPflanzen.map(({ bed, i }) => {
      const key = bed.id || ('idx' + i);
      const zu = !!vlistZu[key];
      const eintraege = beetEintraege.filter(e => e.bed === bed);
      const hinweise = beetHinweise(bed);
      const warnAnzahl = hinweise.filter(h => h.art === 'warn').length;
      const farbe = bed.color || '#7a9e72';
      const foto = ppFotoTitelbild(bed);
      return `<div class="vlist-karte vlist-beet-karte" style="border-left-color:${farbe}">
        <div class="vlist-beet-kopf-zeile">
          <button type="button" class="vlist-beet-foto${foto ? '' : ' leer'}" style="--bf:${farbe}" data-beet-foto="${escapeHtml(String(bed.id))}" title="${foto ? 'Beet-Foto ansehen oder ändern' : 'Foto vom Beet hinzufügen'}" aria-label="Beet-Foto">${foto ? `<img src="${escapeHtml(fotoQuelle(foto))}" alt="" loading="lazy">` : '📷'}</button>
          <button type="button" class="vlist-beet-kopf" data-beet-key="${escapeHtml(key)}" aria-expanded="${!zu}">
            <span class="vlist-beet-titel">${escapeHtml(bed.name || 'Beet ' + (i + 1))}
              <span class="vlist-beet-info">${eintraege.length} 🌱 · ${vlistBeetZusammenfassung(eintraege)}${warnAnzahl ? ` · <span class="vlist-hinweis-zahl">⚠️ ${warnAnzahl}</span>` : ''}</span></span>
            <span class="vlist-pfeil">${zu ? '▸' : '▾'}</span>
          </button>
        </div>
        ${zu ? '' : `<div class="vlist-beet-inhalt">${beetHinweiseBlockHtml(hinweise, key)}${vlistGruppiertHtml(eintraege, 'b' + key)}</div>`}
      </div>`;
    }).join('');
    // Freistehende Pflanzen: nach Art gruppiert, zweispaltig
    html += '<div class="sidebar-title" style="margin:18px 0 10px">🌳 Freistehende Pflanzen</div>';
    if (!freiEintraege.length) {
      html += '<div class="empty-state">Keine freistehenden Bäume/Sträucher.</div>';
    } else {
      const catVon = e => (PLANTS.find(x => x.name === (e.p.name || '').trim()) || {}).cat || '';
      VLIST_FREI_GRUPPEN.forEach(([cat, titel]) => {
        const teil = freiEintraege.filter(e => { const c = catVon(e); return cat ? c === cat : !VLIST_FREI_GRUPPEN.some(([k]) => k && k === c); });
        if (!teil.length) return;
        // gleiche Pflanzen zusammenfassen
        const gruppen = []; const map = {};
        teil.forEach(e => { const k = ((e.p.name || '') + '|' + (e.p.sorte || '')).toLowerCase(); if (!map[k]) { map[k] = []; gruppen.push(map[k]); } map[k].push(e); });
        html += `<div class="vlist-frei-titel">${titel}</div><div class="vlist-frei-raster">` + gruppen.map(g => {
          const e0 = g[0];
          const gKey = 'frei:' + ((e0.p.name || '') + '|' + (e0.p.sorte || '')).toLowerCase();
          const offen = g.length > 1 && vlistOffeneGruppen.has(gKey);
          const attr = g.length > 1 ? `data-gruppe="${escapeHtml(gKey)}"` : `data-frei-idx="${e0.ziel.freiIdx}"`;
          const karte = `<button type="button" class="vlist-frei-karte" ${attr}>
              ${vlistBildHtml(e0.p, true)}
              <span class="vlist-frei-text"><span class="vlist-name">${escapeHtml(e0.p.name || 'Unbenannt')}${g.length > 1 ? ` <span class="vlist-anzahl">×${g.length}</span>` : ''}</span>
                ${e0.p.sorte ? `<span class="vlist-sorte">${escapeHtml(e0.p.sorte)}</span>` : ''}
                <span class="vlist-status-reihe">${vlistStatusHtml(g.flatMap(e => e.status))}</span></span>
            </button>`;
          if (!offen) return karte;
          return karte + `<div class="vlist-frei-auf">` + g.map((e, n) => vlistZeileHtml(e.p, e.ziel, e.status, '#' + (n + 1))).join('') + '</div>';
        }).join('') + '</div>';
      });
    }
  }
  box.innerHTML = html;
  // Direkt nach dem Einfügen ins DOM angehängt (nicht delegiert) – jeder Button bekommt
  // seinen Listener im selben Moment, in dem er erzeugt wird.
  box.querySelectorAll('[data-vlist-sort]').forEach(btn => btn.addEventListener('click', () => vlistSortSetzen(btn.dataset.vlistSort)));
  box.querySelectorAll('[data-beet-key]').forEach(btn => btn.addEventListener('click', () => vlistBeetUmschalten(btn.dataset.beetKey)));
  box.querySelectorAll('[data-gruppe]').forEach(btn => btn.addEventListener('click', () => vlistGruppeUmschalten(btn.dataset.gruppe)));
  box.querySelectorAll('[data-hinweise-key]').forEach(btn => btn.addEventListener('click', () => vlistHinweiseUmschalten(btn.dataset.hinweiseKey)));
  box.querySelectorAll('[data-beet-foto]').forEach(btn => btn.addEventListener('click', () => {
    const bed = getCurrentBeds().find(b => String(b.id) === btn.dataset.beetFoto);
    if (bed) beetFotoOeffnen(bed.id);
  }));
  box.querySelectorAll('[data-plant-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bed = getCurrentBeds()[parseInt(btn.dataset.bedIdx, 10)];
      if (bed) openPlantPanel(bed, parseInt(btn.dataset.plantIdx, 10));
    });
  });
  box.querySelectorAll('[data-frei-idx]').forEach(btn => {
    btn.addEventListener('click', () => openFreiPflanzePanelByIdx(parseInt(btn.dataset.freiIdx, 10)));
  });
}

function renderBedList() {
  renderFreiPflanzenList();
  const list=document.getElementById('bedList');
  const beds=getCurrentBeds();
  if(!beds.length){list.innerHTML='<div class="empty-state">Noch keine Beete. Zeichne eins!</div>';return;}
  list.innerHTML=sortedBedsWithIndex(beds).map(({bed,i})=>{
    const istStruktur = bed.kind === 'struktur';
    const preset = STRUKTUR_PRESETS[bed.strukturTyp] || null;
    const icon = istStruktur ? (preset ? preset.icon : '⬛') : null;
    return `
    <div class="bed-item ${selectedBeds.includes(bed)?'active':''}" style="border-left-color:${bed.color||'#7a9e72'}" tabindex="0" role="button" aria-label="${istStruktur?'Element':'Beet'} ${bed.name||i+1} auswählen" onclick="selectBedFromList(${i}, event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectBedFromList(${i}, event);}">
      <div class="bed-color-dot" style="background:${bed.color}"></div>
      ${icon ? `<span style="margin-right:2px">${icon}</span>` : ''}
      <span>${bed.name||(istStruktur?'Element ':'Beet ')+(i+1)}</span>
      ${!istStruktur && getBedConflicts(bed).length ? '<span title="Mischkultur-Konflikt" style="color:#c05030;margin-left:4px">⚠️</span>' : ''}
      ${!istStruktur && bedHasFruchtfolgeConflict(bed) ? '<span title="Fruchtfolge-Warnung" style="color:#a8621a;margin-left:4px">🔄⚠️</span>' : ''}
      ${!istStruktur ? `<span style="font-size:0.63rem;color:var(--bark);margin-left:auto;margin-right:4px">${(bed.plants||[]).length}🌱</span>` : ''}
      <button class="bed-item-del" aria-label="${istStruktur?'Element':'Beet'} ${bed.name||i+1} löschen" title="Löschen" onclick="deleteBedIdx(event,${i})">✕</button>
    </div>`;
  }).join('');
}
function springeZuBeet(bed) {
  const ZIEL_ZOOM = 1.5; // fester, gut lesbarer Zoom beim Springen aus der Liste
  gartenZoomSetzen(ZIEL_ZOOM);
  setTimeout(() => {
    const wrap = document.getElementById('canvasWrap');
    if (!wrap) return;
    const zielX = bed.x * gartenZoom - wrap.clientWidth / 2;
    const zielY = bed.y * gartenZoom - wrap.clientHeight / 2;
    wrap.scrollTo({ left: Math.max(0, zielX), top: Math.max(0, zielY), behavior: 'smooth' });
  }, 50);
}
function selectBedFromList(i, e){
  const bed = getCurrentBeds()[i];
  if (e && e.shiftKey) { toggleBedSelection(bed); draw(); renderBedList(); switchTab('beds'); return; }
  selectedBed=bed; selectedBeds=[bed]; showBedEditor(bed); hideBulkBar(); draw(); switchTab('beds'); renderBedList();
  springeZuBeet(bed);
}
function deleteBedIdx(e,i){
  e.stopPropagation();
  const bed=getCurrentBeds()[i];
  if(!confirm(`Beet "${bed.name||'Unbenannt'}" wirklich löschen?`)) return;
  pushUndo();
  getCurrentBeds().splice(i,1);if(selectedBed&&!getCurrentBeds().includes(selectedBed)){selectedBed=null;hideBedEditor();}draw();renderBedList();saveData();updateStatus();
}

// ==================== FREISTEHENDE PFLANZEN (Bäume/Sträucher ohne eigenes Beet) ====================
function renderFreiPflanzenList() {
  const list = document.getElementById('freiPflanzenList');
  if (!list) return;
  const liste = getCurrentFreiPflanzen();
  if (!liste.length) { list.innerHTML = '<div class="empty-state">Keine freistehenden Bäume/Sträucher.</div>'; return; }
  list.innerHTML = liste.map((fp, i) => `
    <div class="bed-item" tabindex="0" role="button" aria-label="${escapeHtml(fp.name||'Pflanze')} bearbeiten" onclick="openFreiPflanzePanelByIdx(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openFreiPflanzePanelByIdx(${i});}">
      <span style="font-size:1.1rem">${fp.sym||'🌳'}</span>
      <span>${escapeHtml(fp.name||'Unbenannt')}${fp.sorte?' ('+escapeHtml(fp.sorte)+')':''}</span>
      <button class="bed-item-del" aria-label="${escapeHtml(fp.name||'Pflanze')} löschen" title="Entfernen" onclick="deleteFreiPflanzeIdx(event,${i})">✕</button>
    </div>`).join('');
}
function openFreiPflanzePanelByIdx(i) { openFreiPflanzePanel(getCurrentFreiPflanzen()[i]); }
function deleteFreiPflanzeIdx(e, i) {
  e.stopPropagation();
  const fp = getCurrentFreiPflanzen()[i];
  if (!confirm(`"${fp.name||'Diese Pflanze'}" wirklich entfernen?`)) return;
  pushUndo();
  getCurrentFreiPflanzen().splice(i, 1);
  saveData(); draw(); renderFreiPflanzenList();
}
// Setzt aktives Pinch-Zoom auf 100% zurück, bevor eine Vollbild-Ansicht geöffnet wird.
// Neuere Chrome-Versionen ignorieren "user-scalable=no" im Viewport-Meta-Tag bewusst
// (Barrierefreiheit) – ein bereits eingezoomter Garten würde sonst auch die Ansicht
// mit-vergrößert zeigen. Trick: das Meta-Tag kurz neu setzen erzwingt bei den meisten
// mobilen Browsern einen Zoom-Reset auf den Ausgangswert.
function ppZoomZuruecksetzen() {
  try {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const original = meta.getAttribute('content');
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    setTimeout(() => { if (meta) meta.setAttribute('content', original); }, 80);
  } catch (e) {}
}
function openFreiPflanzePanel(fp) {
  ppZoomZuruecksetzen();
  activeFreiPflanzeId = fp.id;
  springeZuBeet(fp);
  aktualisiereFpLockButton(fp);
  document.getElementById('freiPflanzeTitel').innerHTML = escapeHtml((fp.sym||'🌳') + ' ' + (fp.name || 'Baum/Strauch')) + (isPerennial(fp.name)?' <button type="button" class="pp-lebenszyklus-badge" onclick="togglePerennialInfo(event)" title="Mehr erfahren" aria-label="Info: mehrjährig">🔄</button>':'');
  document.getElementById('fpName').value = fp.name || '';
  document.getElementById('fpSorte').value = fp.sorte || '';
  document.getElementById('fpDatum').value = fp.datum || '';
  document.getElementById('fpNotiz').value = fp.notiz || '';
  document.getElementById('fpStandort').value = fp.standort || '';
  gruppeFelderFuellen(fp, 'fp');
  kroneFeldFuellen(fp);
  renderStandortReihe('fpStandortReihe', 'fpStandort', fpAutoSave);
  const dl = document.getElementById('fpNameVorschlaege');
  dl.innerHTML = PLANTS.filter(p => isPerennial(p.name)).map(p => `<option value="${escapeHtml(p.name)}">`).join('');
  buildSymptomDropdown('fpSymptomSel');
  document.getElementById('fpSymptomSel').value = '';
  document.getElementById('fpSymptomResult').innerHTML = '';
  buildPestDropdown('fpPest');
  document.getElementById('fpPest').value = '';
  document.getElementById('fpPestResult').innerHTML = '';
  populateHarvestMethodSelect();
  renderFreiPflanzePhoto(fp);
  renderSowingHint(fp.name || '', 'fpSowingHint');
  renderRueckschnittHint(fp.name || '', 'fpRueckschnittHint');
  renderBedingungenHint(fp.name || '', 'fpBedingungenHint');
  renderPflanzenBeobachtungen(fp.name || '', 'fpBeobBox');
  document.getElementById('fpHarvestDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('fpHarvestAmount').value = '';
  document.getElementById('fpHarvestMethod').value = '';
  document.getElementById('fpHarvestNote').value = '';
  renderFreiPflanzeHarvestLog(fp);
  switchFPTab('info');
  const fpListe = getCurrentFreiPflanzen();
  const fpIdx = fpListe.findIndex(x => x.id === fp.id);
  document.getElementById('fpPosition').textContent = fpListe.length > 1 ? (fpIdx + 1) + ' von ' + fpListe.length : '';
  document.getElementById('freiPflanzePanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function fpZuNachbarPflanze(richtung) {
  const liste = getCurrentFreiPflanzen();
  if (liste.length < 2) return;
  const aktuellerIdx = liste.findIndex(x => x.id === activeFreiPflanzeId);
  if (aktuellerIdx === -1) return;
  const naechsterIdx = (aktuellerIdx + richtung + liste.length) % liste.length;
  openFreiPflanzePanel(liste[naechsterIdx]);
}
(function fpSwipeEinrichten() {
  const panel = document.getElementById('freiPflanzePanel');
  let startX = 0, startY = 0, aktiv = false;
  panel.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('.pp-tabs, textarea, input, select')) { aktiv = false; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; aktiv = true;
  }, { passive: true });
  panel.addEventListener('touchend', (e) => {
    if (!aktiv) return;
    aktiv = false;
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;
    if (Math.abs(deltaX) < 90 || Math.abs(deltaX) < Math.abs(deltaY) * 2) return;
    const richtung = deltaX < 0 ? 1 : -1;
    const hinweis = document.getElementById(richtung === 1 ? 'fpSwipeRechts' : 'fpSwipeLinks');
    hinweis.classList.add('zeigen');
    setTimeout(() => hinweis.classList.remove('zeigen'), 220);
    fpZuNachbarPflanze(richtung);
  }, { passive: true });
})();
function fpSchliessen() {
  document.getElementById('freiPflanzePanel').classList.remove('open');
  document.body.style.overflow = '';
  hidePerennialInfo();
}
function switchFPTab(name) {
  document.querySelectorAll('#freiPflanzePanel .pp-tab').forEach((t,i)=>{const names=['info','symptoms','pests','harvest','preserve','bewertung'];t.classList.toggle('active',names[i]===name);});
  document.querySelectorAll('#freiPflanzePanel .pp-tab-content').forEach(el=>{el.classList.toggle('active',el.id==='fpt-'+name);});
  const panel = document.getElementById('freiPflanzePanel');
  if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
  if (name==='bewertung') gbRender('fp');
  if (name==='preserve') {
    const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
    if (fp) renderPreservePlantTab(fp.name || '', 'fpPreserveResult');
  }
}
function aktualisiereFpLockButton(fp) {
  const btn = document.getElementById('btnFpLockToggle');
  if (!btn) return;
  const gesperrt = !!fp.locked;
  btn.textContent = gesperrt ? '🔓 Fixierung lösen' : '📌 Auf der Karte fixieren';
  btn.style.background = gesperrt ? '#f0f8ec' : 'var(--white)';
  btn.style.borderColor = gesperrt ? '#4a6f5c' : 'var(--parchment)';
  btn.style.color = gesperrt ? '#2c2415' : 'var(--bark)';
  btn.title = gesperrt
    ? 'Pflanze ist fixiert – kann auf der Karte nicht versehentlich verschoben werden'
    : 'Verhindert, dass diese Pflanze beim Scrollen/Antippen versehentlich verschoben wird';
}
function toggleFreiPflanzeLock() {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  pushUndo();
  fp.locked = !fp.locked;
  aktualisiereFpLockButton(fp);
  saveData(); draw(); renderFreiPflanzenList();
}
function fpAutoSave() {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  const name = document.getElementById('fpName').value.trim();
  const match = PLANTS.find(p => p.name.toLowerCase() === name.toLowerCase());
  fp.name = name;
  fp.sym = match ? match.sym : (fp.sym || '🌳');
  fp.sorte = document.getElementById('fpSorte').value.trim();
  fp.datum = document.getElementById('fpDatum').value;
  fp.notiz = document.getElementById('fpNotiz').value.trim();
  fp.standort = document.getElementById('fpStandort').value;
  gruppeFelderLesen(fp, 'fp');
  const kd = parseInt(document.getElementById('fpKroneD').value, 10);
  if (kd >= 20) fp.kroneD = Math.min(3000, kd); else delete fp.kroneD;
  kroneFeldFuellen(fp);
  saveData(); draw(); renderFreiPflanzenList();
  document.getElementById('freiPflanzeTitel').innerHTML = escapeHtml((fp.sym||'🌳') + ' ' + (fp.name || 'Baum/Strauch')) + (isPerennial(fp.name)?' <button type="button" class="pp-lebenszyklus-badge" onclick="togglePerennialInfo(event)" title="Mehr erfahren" aria-label="Info: mehrjährig">🔄</button>':'');
  renderSowingHint(fp.name || '', 'fpSowingHint');
  renderRueckschnittHint(fp.name || '', 'fpRueckschnittHint');
  renderBedingungenHint(fp.name || '', 'fpBedingungenHint');
  renderPflanzenBeobachtungen(fp.name || '', 'fpBeobBox');
  if (document.getElementById('fpt-preserve')?.classList.contains('active')) renderPreservePlantTab(fp.name || '', 'fpPreserveResult');
}
function renderFreiPflanzePhoto(fp) {
  ppFotosMigrieren(fp);
  const header = document.getElementById('freiPflanzePanelHeader');
  const entfernenBtn = document.getElementById('btnFpFotoEntfernen');
  const malenBtn = document.getElementById('btnFpFotoMalen');
  const teilenBtn = document.getElementById('btnFpFotoTeilen');
  const input = document.getElementById('fpPhotoInput');
  const platzhalter = document.getElementById('fpHeaderPlaceholder');
  if (input) input.value = '';
  const titelbild = ppFotoTitelbild(fp);
  if (titelbild) {
    header.style.backgroundImage = 'url("' + fotoQuelle(titelbild) + '")';
    fotoTeilenKnopfAktualisieren(teilenBtn, titelbild);
    entfernenBtn.style.display = '';
    if (malenBtn) malenBtn.style.display = window.Malfilter ? '' : 'none';
    if (platzhalter) platzhalter.textContent = '';
  } else {
    header.style.backgroundImage = '';
    entfernenBtn.style.display = 'none';
    if (malenBtn) malenBtn.style.display = 'none';
    if (teilenBtn) teilenBtn.style.display = 'none';
    if (platzhalter) platzhalter.textContent = fp.sym || '🌳';
  }
  const galerie = document.getElementById('fpFotoGalerie');
  galerie.innerHTML = '';
  fp.fotos.forEach((f, i) => {
    if (!fotoQuelle(f)) return; // z.B. "🔒 Nur ich"-Foto eines anderen Familienmitglieds
    const thumb = document.createElement('div');
    thumb.className = 'pp-foto-thumb' + (titelbild && f.id === titelbild.id ? ' aktuell' : '') + (f.geteilt === false ? ' privat' : '');
    thumb.innerHTML = '<img src="' + fotoQuelle(f) + '" alt="" loading="lazy">' +
      (f.datum ? '<span class="pp-foto-datum">' + new Date(f.datum).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'2-digit'}) + '</span>' : '') +
      '<button type="button" class="pp-foto-thumb-titel" title="Als Titelbild festlegen" aria-label="Als Titelbild festlegen">📌</button>' +
      '<button type="button" class="pp-foto-thumb-del" title="Dieses Foto löschen" aria-label="Foto löschen">✕</button>';
    thumb.querySelector('img').addEventListener('click', () => fotoLightboxOeffnen(fotoQuelle(f)));
    thumb.querySelector('.pp-foto-thumb-titel').addEventListener('click', (e) => {
      e.stopPropagation();
      fp.fotoTitelbildId = f.id;
      saveData();
      renderFreiPflanzePhoto(fp);
    });
    thumb.querySelector('.pp-foto-thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      pushUndo();
      fotoCloudLoeschen(fp.fotos.splice(i, 1)[0]);
      if (fp.fotoTitelbildId === f.id) delete fp.fotoTitelbildId;
      saveData();
      renderFreiPflanzePhoto(fp);
    });
    galerie.appendChild(thumb);
  });
  const addTile = document.createElement('div');
  addTile.className = 'pp-foto-add';
  addTile.textContent = '📷';
  addTile.title = 'Foto hinzufügen';
  addTile.addEventListener('click', () => input.click());
  galerie.appendChild(addTile);
  const vkF = vergleichKachel(fp, fp.name || 'Baum/Strauch'); if (vkF) galerie.appendChild(vkF);
}
function handleFreiPflanzePhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !activeFreiPflanzeId) return;
  const reader = new FileReader();
  reader.onerror = () => showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5);
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 5);
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
      if (!fp) return;
      pushUndo();
      ppFotosMigrieren(fp);
      const neuesFoto = { id: fotoNeueId(), data: dataUrl, datum: new Date().toISOString().slice(0,10), geteilt: img._geteilt !== false };
      fp.fotos.push(neuesFoto);
      while (fp.fotos.length > PP_MAX_FOTOS) fotoCloudLoeschen(fp.fotos.shift());
      fp.fotoTitelbildId = neuesFoto.id;
      ppFotoInSammelalbumEintragen(fp.name, dataUrl);
      saveData();
      renderFreiPflanzePhoto(fp);
      familienFotosHochladen();
    };
    malfilterVorschalten(ev.target.result, (quelle, geteilt) => { img._geteilt = geteilt; img.src = quelle; });
  };
  reader.readAsDataURL(file);
}
function removeFreiPflanzePhoto() {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  pushUndo();
  ppFotosMigrieren(fp);
  const titelbild = ppFotoTitelbild(fp);
  if (titelbild) {
    fotoCloudLoeschen(titelbild);
    fp.fotos = fp.fotos.filter(f => f.id !== titelbild.id);
    if (fp.fotoTitelbildId === titelbild.id) delete fp.fotoTitelbildId;
  }
  saveData();
  renderFreiPflanzePhoto(fp);
}
function addFreiPflanzeHarvest() {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  const date = document.getElementById('fpHarvestDate').value;
  const amount = parseFloat(document.getElementById('fpHarvestAmount').value);
  const unit = document.getElementById('fpHarvestUnit').value;
  const method = document.getElementById('fpHarvestMethod').value;
  const note = document.getElementById('fpHarvestNote').value;
  if (!date || isNaN(amount) || amount <= 0) {
    showTempStatus('⚠ Bitte Datum und eine Menge größer 0 eingeben.', 5);
    return;
  }
  pushUndo();
  if (!fp.harvests) fp.harvests = [];
  fp.harvests.push({ date, amount, unit, method, note });
  fp.harvests.sort((a,b) => a.date < b.date ? 1 : -1);
  saveData();
  document.getElementById('fpHarvestAmount').value = '';
  document.getElementById('fpHarvestMethod').value = '';
  document.getElementById('fpHarvestNote').value = '';
  renderFreiPflanzeHarvestLog(fp);
  const ernteName = (fp.name || '').trim() || 'Ernte';
  showTempStatus(`🧺 Ernte eingetragen: ${amount} ${unit}`, 5, { label: '→ Vorratskammer', aktion: () => ernteInVorratskammer(ernteName, amount, unit, date) });
}
function deleteFreiPflanzeHarvestEntry(hIdx) {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp || !fp.harvests) return;
  pushUndo();
  fp.harvests.splice(hIdx, 1);
  saveData();
  renderFreiPflanzeHarvestLog(fp);
}
function renderFreiPflanzeHarvestLog(fp) {
  const totalBox = document.getElementById('fpHarvestTotal');
  const logBox = document.getElementById('fpHarvestLog');
  if (!totalBox || !logBox) return;
  const harvests = (fp && fp.harvests) || [];
  const tabBadge = document.getElementById('fpTabHarvest');
  if (tabBadge) tabBadge.innerHTML = '🧺 Ernte' + (harvests.length ? '<span class="pp-tab-badge"></span>' : '');
  renderErnteErinnerungBox('fpErnteErinnerungBox', fp && fp.name, fp && fp.datum);
  if (!harvests.length) {
    totalBox.textContent = '';
    logBox.innerHTML = '<div class="empty-state">Noch keine Ernte eingetragen.</div>';
    return;
  }
  const totals = {};
  harvests.forEach(h => {
    const n = normalizeHarvestUnit(h.unit, parseFloat(h.amount)||0);
    totals[n.unit] = (totals[n.unit]||0) + n.amount;
  });
  totalBox.innerHTML = '🧺 Gesamt: ' + Object.entries(totals).map(([u,n]) => `${n % 1 === 0 ? n : n.toFixed(2)} ${u}`).join(' · ');
  logBox.innerHTML = harvests.map((h, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin-bottom:4px;border-radius:7px;background:var(--cream)">
      <span style="font-size:0.76rem;color:var(--bark);min-width:70px">${escapeHtml(h.date)}</span>
      <span style="flex:1;font-size:0.8rem"><strong>${h.amount} ${escapeHtml(h.unit)}</strong>${h.method ? ' · '+escapeHtml(harvestUseLabel(h.method)||h.method) : ''}${h.note ? ' · '+escapeHtml(h.note) : ''}</span>
      <button onclick="deleteFreiPflanzeHarvestEntry(${i})" style="background:none;border:none;color:#c05030;cursor:pointer;font-size:0.85rem;opacity:0.6" title="Löschen">🗑</button>
    </div>`).join('');
}
function fpLoeschen() {
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  if (!confirm(`"${fp.name||'Diese Pflanze'}" wirklich entfernen?`)) return;
  pushUndo();
  const liste = getCurrentFreiPflanzen();
  const idx = liste.findIndex(x => x.id === activeFreiPflanzeId);
  if (idx >= 0) liste.splice(idx, 1);
  saveData(); draw(); renderFreiPflanzenList();
  fpSchliessen();
}


// ==================== PLANT CATALOGUE ====================
// ==================== ZULETZT VERWENDETE PFLANZEN ====================
let recentPlants = [];
try { recentPlants = JSON.parse(localStorage.getItem('gartenplaner_recentPlants') || '[]') || []; } catch(e) { recentPlants = []; }
let customPlants = [];
try { customPlants = JSON.parse(localStorage.getItem('gartenplaner_customPlants') || '[]') || []; } catch(e) { customPlants = []; }
function saveCustomPlants() { try { localStorage.setItem('gartenplaner_customPlants', JSON.stringify(customPlants)); } catch(e) {} }
function addCustomPlant() {
  const name = prompt('Name der Pflanze (auch seltene/exotische Sorten):');
  if (!name || !name.trim()) return;
  const trimmedName = name.trim();
  const sym = (prompt('Symbol/Emoji dafür (optional):', '🌱') || '🌱').trim() || '🌱';
  const existiertSchon = customPlants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase()) || PLANTS.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (!existiertSchon) {
    customPlants.push({ sym, name: trimmedName, cat: 'Eigene' });
    saveCustomPlants();
  }
  selectPlantType(sym, trimmedName, null);
  buildPlantGrid(document.getElementById('plantSearch') ? document.getElementById('plantSearch').value : '');
}
function addRecentPlant(sym, name) {
  recentPlants = recentPlants.filter(p => p.name !== name);
  recentPlants.unshift({ sym, name });
  recentPlants = recentPlants.slice(0, 8);
  try { localStorage.setItem('gartenplaner_recentPlants', JSON.stringify(recentPlants)); } catch(e) {}
}
function buildPlantGrid(filter) {
  filter = (filter || '').trim().toLowerCase();
  const onlyPerennial = document.getElementById('perennialFilter')?.checked;
  const cats = ['Gemüse','Kräuter','Beeren','Obst','Blumen'];
  let html = '';
  if (!filter && !onlyPerennial && recentPlants.length) {
    html += `<div style="font-size:0.72rem;font-weight:600;color:var(--bark);margin:0 0 4px">⭐ Zuletzt verwendet</div>`;
    html += `<div class="plant-grid">${recentPlants.map(p=>`
      <div class="plant-sym ${p.sym===selectedPlantSym && p.name===selectedPlantName?'active':''}" onclick="selectPlantType('${p.sym}',${jsAttrStr(p.name)},this)">
        <span class="sym">${p.sym}</span><span>${p.name}${isPerennial(p.name)?' <span title="Mehrjährig – bleibt über Jahre im Beet" style="opacity:0.6">🔄</span>':''}</span>
      </div>`).join('')}</div>`;
  }
  for (const cat of cats) {
    const items = PLANTS.filter(p => p.cat === cat && (!filter || p.name.toLowerCase().includes(filter)) && (!onlyPerennial || p.perennial));
    if (!items.length) continue;
    html += `<div style="font-size:0.72rem;font-weight:600;color:var(--bark);margin:8px 0 4px">${cat}</div>`;
    html += `<div class="plant-grid">${items.map(p=>`
      <div class="plant-sym ${p.sym===selectedPlantSym && p.name===selectedPlantName?'active':''}" onclick="selectPlantType('${p.sym}',${jsAttrStr(p.name)},this)">
        <span class="sym">${p.sym}</span><span>${p.name}${p.perennial?' <span title="Mehrjährig – bleibt über Jahre im Beet" style="opacity:0.6">🔄</span>':''}</span>
      </div>`).join('')}</div>`;
  }
  const standardNamen = new Set(PLANTS.map(p => p.name.toLowerCase()));
  const eigeneTreffer = customPlants.filter(p => !standardNamen.has(p.name.toLowerCase()) && !onlyPerennial && (!filter || p.name.toLowerCase().includes(filter)));
  if (eigeneTreffer.length || !filter) {
    html += `<div style="font-size:0.72rem;font-weight:600;color:var(--bark);margin:8px 0 4px">✨ Eigene Pflanzen</div>`;
    html += `<div class="plant-grid">${eigeneTreffer.map(p=>`
      <div class="plant-sym ${p.sym===selectedPlantSym && p.name===selectedPlantName?'active':''}" onclick="selectPlantType('${p.sym}',${jsAttrStr(p.name)},this)">
        <span class="sym">${p.sym}</span><span>${p.name}</span>
      </div>`).join('')}
      <div class="plant-sym" style="border-style:dashed;opacity:0.85" onclick="addCustomPlant()">
        <span class="sym">➕</span><span>Eigene/exotische Pflanze</span>
      </div></div>`;
  }
  document.getElementById('plantCatalog').innerHTML = html || '<div class="empty-state">Keine Treffer.</div>';
  const densSel=document.getElementById('densityPlantSel');
  if(densSel) densSel.innerHTML='<option value="">– Pflanze wählen –</option>'+PLANTS.map(p=>`<option value="${p.name}">${p.sym} ${p.name}</option>`).join('')+customPlants.filter(p=>!standardNamen.has(p.name.toLowerCase())).map(p=>`<option value="${p.name}">${p.sym} ${p.name}</option>`).join('');
}
function selectPlantType(sym,name,el){
  selectedPlantSym=sym;selectedPlantName=name;
  addRecentPlant(sym,name);
  const search=document.getElementById('plantSearch');
  buildPlantGrid(search?search.value:'');
  switchTab('beds');
  if (isPerennial(name)) {
    setMode('freitree');
    showTempStatus(`🌳 ${name} ausgewählt – jetzt frei im Garten platzieren (oder oben auf "🌱 Pflanzenmodus" tippen, um stattdessen in ein Beet zu setzen)`, 5);
  } else {
    setMode('plant');
    showTempStatus(`🌱 ${name} ausgewählt – jetzt auf ein Beet tippen zum Pflanzen`, 4);
  }
}

// ==================== SYMPTOM & PEST DROPDOWNS ====================
function buildSymptomDropdown(selectId) {
  selectId = selectId || 'symptomSel';
  const sel=document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML='<option value="">– Was beobachtest du? –</option>'+SYMPTOMS.map((s,i)=>`<option value="${i}">${s.label}</option>`).join('');
}
function showSymptom(selectId, resultId) {
  selectId = selectId || 'symptomSel'; resultId = resultId || 'symptomResult';
  const i=document.getElementById(selectId).value;
  const res=document.getElementById(resultId);
  if(i===''){res.innerHTML='';return;}
  const s=SYMPTOMS[i];
  res.innerHTML=`<div class="symptom-card">
    <div class="sc-title">🍂 ${s.label}</div>
    <div class="sc-cause"><strong>Ursache:</strong> ${s.cause}</div>
    <div class="sc-fix"><strong>Was tun:</strong> ${s.fix}</div>
  </div>`;
}
function buildPestDropdown(selectId) {
  selectId = selectId || 'ppPest';
  const sel=document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML='<option value="">– Was ist befallen? –</option>'+PESTS.map((p,i)=>`<option value="${i}">${p.label}</option>`).join('');
}
function showPest(selectId, resultId) {
  selectId = selectId || 'ppPest'; resultId = resultId || 'pestResult';
  const i=document.getElementById(selectId).value;
  const res=document.getElementById(resultId);
  if(i===''){res.innerHTML='';return;}
  const p=PESTS[i];
  res.innerHTML=`<div class="pest-card">
    <div class="pc-title">🐛 ${p.label}</div>
    <div class="pc-fix"><strong>Maßnahmen:</strong><ul style="margin-top:4px;padding-left:16px">${p.fix.map(f=>`<li style="margin-bottom:2px">${f}</li>`).join('')}</ul></div>
  </div>`;
}

// ==================== PLANT PANEL ====================
// ---------- MEILENSTEINE (Ernten pro Pflanze) ----------
const MEILENSTEIN_STUFEN = [5, 10, 20, 50, 100];
const MEILENSTEIN_ICONS = { 5: '🥉', 10: '🥈', 20: '🥇', 50: '🏆', 100: '👑' };
function meilensteinIconFuer(anzahl) {
  let icon = null;
  MEILENSTEIN_STUFEN.forEach(stufe => { if (anzahl >= stufe) icon = MEILENSTEIN_ICONS[stufe]; });
  return icon;
}
function meilensteinFeiern(titel, text) {
  document.getElementById('meilensteinTitel').textContent = titel;
  document.getElementById('meilensteinText').textContent = text;
  document.getElementById('modalMeilenstein').style.display = 'flex';
}
function pruefePflanzenMeilenstein(plant) {
  if (!plant.meilensteineErnte) plant.meilensteineErnte = [];
  const anzahl = (plant.harvests || []).length;
  MEILENSTEIN_STUFEN.forEach(stufe => {
    if (anzahl >= stufe && !plant.meilensteineErnte.includes(stufe)) {
      plant.meilensteineErnte.push(stufe);
      meilensteinFeiern(MEILENSTEIN_ICONS[stufe] + ' Meilenstein erreicht!', (plant.name || 'Diese Pflanze') + ' schon ' + stufe + '× geerntet!');
    }
  });
}
let ppAktuelleBewertung = 0;
function renderPpSterneEingabe() {
  // Kurzanzeige im Info-Tab; bewertet wird im Tab "⭐ Bewertung"
  const box = document.getElementById('ppSterneEingabe');
  if (!box) return;
  const akt = gbAktuellePflanze('pp');
  const wert = akt ? (akt.plant.bewertung || 0) : 0;
  box.innerHTML = `<button type="button" onclick="switchPPTab('bewertung')" style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;">
    <span>${gbSterneHtml(wert, '1.3rem')}</span><span style="font-size:0.75rem;color:var(--moss);font-weight:700;">${wert ? gbText(wert) + ' · ' : ''}Bewerten →</span></button>`;
}
function openPlantPanel(bed,idx) {
  ppZoomZuruecksetzen();
  activePlantBedId={bedId:bed.id,idx};
  const plant=bed.plants[idx];
  document.getElementById('ppTitle').innerHTML=escapeHtml(plant.sym+' '+(plant.name||'Pflanze'))+(isPerennial(plant.name)?' <button type="button" class="pp-lebenszyklus-badge" onclick="togglePerennialInfo(event)" title="Mehr erfahren" aria-label="Info: mehrjährig">🔄</button>':'')+(meilensteinIconFuer((plant.harvests||[]).length)?' <span title="'+(plant.harvests||[]).length+'× geerntet">'+meilensteinIconFuer((plant.harvests||[]).length)+'</span>':'');
  document.getElementById('ppName').value=plant.name||'';
  document.getElementById('ppVariety').value=plant.variety||'';
  document.getElementById('ppNotes').value=plant.notes||'';
  document.getElementById('ppDate').value=plant.date||'';
  gruppeFelderFuellen(plant, 'pp');
  setTimeout(renderPflanzErinnerung, 0);
  document.getElementById('ppLocation').value=plant.location||'';
  renderStandortReihe('ppStandortReihe', 'ppLocation', savePlantInfo);
  ppAktuelleBewertung = plant.bewertung || 0;
  renderPpSterneEingabe();
  document.getElementById('symptomSel').value='';
  document.getElementById('symptomResult').innerHTML='';
  document.getElementById('ppPest').value='';
  document.getElementById('pestResult').innerHTML='';
  renderPlantPhoto(plant);
  renderNeighbors(bed,idx);
  renderSowingHint(plant.name||'');
  renderRueckschnittHint(plant.name||'', 'rueckschnittHint');
  renderBedingungenHint(plant.name||'', 'bedingungenHint');
  renderPflanzenBeobachtungen(plant.name||'', 'ppBeobBox');
  renderGiessInfo(plant);
  renderVarietyDatalist(plant.name||'');
  document.getElementById('ppHarvestDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('ppHarvestAmount').value = '';
  document.getElementById('ppHarvestMethod').value = '';
  document.getElementById('ppHarvestNote').value = '';
  renderHarvestLog(bed, idx);
  switchPPTab('info');
  document.getElementById('ppPosition').textContent = bed.plants.length > 1 ? (idx + 1) + ' von ' + bed.plants.length + ' in „' + (bed.name||'Beet') + '"' : '';
  document.getElementById('plantPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function ppZuNachbarPflanze(richtung) {
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  if (!bed || bed.plants.length < 2) return;
  const naechsterIdx = (activePlantBedId.idx + richtung + bed.plants.length) % bed.plants.length;
  openPlantPanel(bed, naechsterIdx);
}
(function ppSwipeEinrichten() {
  const panel = document.getElementById('plantPanel');
  let startX = 0, startY = 0, aktiv = false;
  panel.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('.pp-tabs, textarea, input, select')) { aktiv = false; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; aktiv = true;
  }, { passive: true });
  panel.addEventListener('touchend', (e) => {
    if (!aktiv) return;
    aktiv = false;
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;
    if (Math.abs(deltaX) < 90 || Math.abs(deltaX) < Math.abs(deltaY) * 2) return;
    const richtung = deltaX < 0 ? 1 : -1;
    const hinweis = document.getElementById(richtung === 1 ? 'ppSwipeRechts' : 'ppSwipeLinks');
    hinweis.classList.add('zeigen');
    setTimeout(() => hinweis.classList.remove('zeigen'), 220);
    ppZuNachbarPflanze(richtung);
  }, { passive: true });
})();
const PP_MAX_FOTOS = 5;
function fotoNeueId() { return 'foto_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
function ppFotosMigrieren(obj) {
  if (!Array.isArray(obj.fotos)) obj.fotos = [];
  if (obj.photo) {
    obj.fotos.push({ id: fotoNeueId(), data: obj.photo, datum: obj.date || obj.datum || '' });
    delete obj.photo;
  }
  // Ältere Fotos ohne eigene ID nachträglich versehen (falls aus einer Zwischenversion vorhanden)
  obj.fotos.forEach(f => { if (!f.id) f.id = fotoNeueId(); });
}
// Liefert das aktuell als Titelbild festgelegte Foto – oder, falls keins explizit gesetzt
// wurde (bzw. das gesetzte gelöscht wurde), das zuletzt hinzugefügte.
function ppFotoTitelbild(obj) {
  // Nur Fotos, die auf diesem Gerät anzeigbar sind (lokal vorhanden oder als 👪-Familienfoto in der Cloud)
  const sichtbar = (obj.fotos || []).filter(f => f && (f.data || f.url));
  if (!sichtbar.length) return null;
  if (obj.fotoTitelbildId) {
    const treffer = sichtbar.find(f => f.id === obj.fotoTitelbildId);
    if (treffer) return treffer;
  }
  return sichtbar[sichtbar.length - 1];
}
function fotoLightboxOeffnen(dataUrl) {
  document.getElementById('fotoLightboxImg').src = dataUrl;
  document.getElementById('fotoLightbox').classList.add('zeigen');
}
function fotoLightboxSchliessen() {
  document.getElementById('fotoLightbox').classList.remove('zeigen');
}
function renderPlantPhoto(plant) {
  ppFotosMigrieren(plant);
  const header = document.getElementById('plantPanelHeader');
  const entfernenBtn = document.getElementById('btnPpFotoEntfernen');
  const malenBtn = document.getElementById('btnPpFotoMalen');
  const teilenBtn = document.getElementById('btnPpFotoTeilen');
  const input = document.getElementById('ppPhotoInput');
  const platzhalter = document.getElementById('ppHeaderPlaceholder');
  if (input) input.value = '';
  const titelbild = ppFotoTitelbild(plant);
  if (titelbild) {
    header.style.backgroundImage = 'url("' + fotoQuelle(titelbild) + '")';
    fotoTeilenKnopfAktualisieren(teilenBtn, titelbild);
    entfernenBtn.style.display = '';
    if (malenBtn) malenBtn.style.display = window.Malfilter ? '' : 'none';
    platzhalter.textContent = '';
  } else {
    header.style.backgroundImage = '';
    entfernenBtn.style.display = 'none';
    if (malenBtn) malenBtn.style.display = 'none';
    if (teilenBtn) teilenBtn.style.display = 'none';
    platzhalter.textContent = plant.sym || '🌿';
  }
  const galerie = document.getElementById('ppFotoGalerie');
  galerie.innerHTML = '';
  plant.fotos.forEach((f, i) => {
    if (!fotoQuelle(f)) return; // z.B. "🔒 Nur ich"-Foto eines anderen Familienmitglieds
    const thumb = document.createElement('div');
    thumb.className = 'pp-foto-thumb' + (titelbild && f.id === titelbild.id ? ' aktuell' : '') + (f.geteilt === false ? ' privat' : '');
    thumb.innerHTML = '<img src="' + fotoQuelle(f) + '" alt="" loading="lazy">' +
      (f.datum ? '<span class="pp-foto-datum">' + new Date(f.datum).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'2-digit'}) + '</span>' : '') +
      '<button type="button" class="pp-foto-thumb-titel" title="Als Titelbild festlegen" aria-label="Als Titelbild festlegen">📌</button>' +
      '<button type="button" class="pp-foto-thumb-del" title="Dieses Foto löschen" aria-label="Foto löschen">✕</button>';
    thumb.querySelector('img').addEventListener('click', () => fotoLightboxOeffnen(fotoQuelle(f)));
    thumb.querySelector('.pp-foto-thumb-titel').addEventListener('click', (e) => {
      e.stopPropagation();
      plant.fotoTitelbildId = f.id;
      saveData();
      renderPlantPhoto(plant);
    });
    thumb.querySelector('.pp-foto-thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      pushUndo();
      fotoCloudLoeschen(plant.fotos.splice(i, 1)[0]);
      if (plant.fotoTitelbildId === f.id) delete plant.fotoTitelbildId;
      saveData();
      renderPlantPhoto(plant);
    });
    galerie.appendChild(thumb);
  });
  const addTile = document.createElement('div');
  addTile.className = 'pp-foto-add';
  addTile.textContent = '📷';
  addTile.title = 'Foto hinzufügen';
  addTile.addEventListener('click', () => input.click());
  galerie.appendChild(addTile);
  const vkP = vergleichKachel(plant, plant.name || 'Pflanze'); if (vkP) galerie.appendChild(vkP);
}
function handlePlantPhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !activePlantBedId) return;
  const reader = new FileReader();
  reader.onerror = () => showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5);
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 5);
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const bed = getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
      if (!bed) return;
      const plant = bed.plants[activePlantBedId.idx];
      if (!plant) return;
      pushUndo();
      ppFotosMigrieren(plant);
      const neuesFoto = { id: fotoNeueId(), data: dataUrl, datum: new Date().toISOString().slice(0,10), geteilt: img._geteilt !== false };
      plant.fotos.push(neuesFoto);
      while (plant.fotos.length > PP_MAX_FOTOS) fotoCloudLoeschen(plant.fotos.shift());
      plant.fotoTitelbildId = neuesFoto.id;
      ppFotoInSammelalbumEintragen(plant.name, dataUrl);
      saveData();
      renderPlantPhoto(plant);
      familienFotosHochladen();
    };
    malfilterVorschalten(ev.target.result, (quelle, geteilt) => { img._geteilt = geteilt; img.src = quelle; });
  };
  reader.readAsDataURL(file);
}
function removePlantPhoto() {
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
  if (!bed) return;
  const plant = bed.plants[activePlantBedId.idx];
  if (!plant) return;
  pushUndo();
  ppFotosMigrieren(plant);
  const titelbild = ppFotoTitelbild(plant);
  if (titelbild) {
    fotoCloudLoeschen(titelbild);
    plant.fotos = plant.fotos.filter(f => f.id !== titelbild.id);
    if (plant.fotoTitelbildId === titelbild.id) delete plant.fotoTitelbildId;
  }
  saveData();
  renderPlantPhoto(plant);
}
function closePlantPanel(){document.getElementById('plantPanel').classList.remove('open');document.body.style.overflow='';selectedPlantOnCanvas=null;draw();hidePerennialInfo();}
document.getElementById('btnPpFotoOeffnen').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('ppPhotoInput').click(); });
document.getElementById('btnPpFotoEntfernen').addEventListener('click', (e) => { e.stopPropagation(); removePlantPhoto(); });
document.getElementById('btnFpFotoOeffnen').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('fpPhotoInput').click(); });
document.getElementById('btnFpFotoEntfernen').addEventListener('click', (e) => { e.stopPropagation(); removeFreiPflanzePhoto(); });

// ==================== MALSTIL FÜR PFLANZENFOTOS ====================
// Beim Hochladen: erst den Malstil-Dialog zeigen (Original/Bleistift/Buntstift/Aquarell/Pastell).
// "Abbrechen" verwirft das Foto. Ohne malfilter.js wird das Foto direkt übernommen.
function malfilterVorschalten(dataUrl, weiter) {
  if (!window.Malfilter) { weiter(dataUrl, true); return; }
  window.Malfilter.dialog(dataUrl, { titel: '📷 Foto hinzufügen', mitStil: true, teilen: true })
    .then((ergebnis) => { if (ergebnis) weiter(ergebnis.bild, ergebnis.geteilt); })
    .catch(() => showTempStatus('⚠ Datei ist kein gültiges Bild.', 5));
}
// Nachträglich: das aktuelle Titelbild in einen Malstil umwandeln.
// Das Original wird im Feld "photo" des Foto-Eintrags aufbewahrt – Felder namens "photo"
// werden NICHT synchronisiert (siehe entferneFotosTief in sync.js), belasten also das
// Cloud-Dokument nicht. Darüber lässt sich jederzeit zurück zum Original wechseln,
// und neue Stile werden immer auf das Original angewendet (kein "Filter auf Filter").
function fotoMalstilAnwenden(obj, rendern) {
  if (!obj || !window.Malfilter) return;
  ppFotosMigrieren(obj);
  const foto = ppFotoTitelbild(obj);
  if (!foto) return;
  if (!foto.photo && !foto.data) { showTempStatus('ℹ️ Malstil geht nur auf dem Gerät, auf dem das Foto aufgenommen wurde.', 5); return; }
  const quelle = foto.photo || foto.data;
  window.Malfilter.dialog(quelle, { titel: '🎨 Foto als Malerei', mitStil: true,
      hinweis: foto.photo ? 'Das Original bleibt erhalten – „Original“ stellt es wieder her.' : 'Das Original wird aufbewahrt und lässt sich jederzeit wiederherstellen.' })
    .then((erg) => {
      if (!erg) return;
      if (erg.stil === 'original') {
        if (!foto.photo) return; // war schon das Original
        pushUndo();
        foto.data = foto.photo; delete foto.photo;
        if (foto.geteilt !== false) { fotoCloudLoeschen(foto); delete foto.url; delete foto.pfad; foto.neuerName = true; }
        saveData(); rendern(obj); familienFotosHochladen();
        showTempStatus('↺ Originalfoto wiederhergestellt', 3);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 480 / img.width);
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        pushUndo();
        if (!foto.photo) foto.photo = foto.data;
        foto.data = c.toDataURL('image/jpeg', 0.72);
        if (foto.geteilt !== false) { fotoCloudLoeschen(foto); delete foto.url; delete foto.pfad; foto.neuerName = true; }
        try { saveData(); } catch (err) { showTempStatus('⚠ Speichern fehlgeschlagen (Speicher voll?).', 5); return; }
        rendern(obj);
        familienFotosHochladen();
        showTempStatus('🎨 Malstil übernommen', 3);
      };
      img.src = erg.bild;
    })
    .catch(() => showTempStatus('⚠ Foto konnte nicht bearbeitet werden.', 5));
}
// ==================== FAMILIENFOTOS (👪 Familie / 🔒 Nur ich) ====================
// 👪-Fotos liegen als Datei in Firebase Storage (fotospeicher.js); im synchronisierten
// Eintrag steht nur url/pfad – so bleibt das Garten-Dokument klein (1-MB-Grenze).
// 🔒-Fotos bleiben nur auf diesem Gerät. Ältere Fotos ohne Angabe gelten als 👪 Familie.
function fotoQuelle(f) { return (f && (f.data || f.url)) || ''; }
function fotoCloudLoeschen(f) {
  if (!f || !f.pfad || !window.FotoSpeicher) return;
  // Kopien (z.B. „Für nächstes Jahr übernehmen“, „Element duplizieren“) teilen sich dieselbe Datei –
  // nur löschen, wenn kein anderer Eintrag sie mehr verwendet.
  const nochVerwendet = alleFotoListenObjekte().some(o => o.fotos.some(x => x !== f && x.pfad === f.pfad));
  if (!nochVerwendet) window.FotoSpeicher.loeschen(f.pfad);
}
function fotoTeilenKnopfAktualisieren(btn, foto) {
  if (!btn) return;
  const cloud = !!(window.FotoSpeicher && window.FotoSpeicher.verfuegbar());
  btn.style.display = cloud ? '' : 'none';
  const privat = foto.geteilt === false;
  btn.textContent = privat ? '🔒' : '👪';
  btn.title = privat ? 'Nur auf diesem Gerät – antippen, um es mit der Familie zu teilen'
    : (foto.url ? 'Für die Familie sichtbar – antippen für „Nur ich“' : 'Wird mit der Familie geteilt (Upload ausstehend) – antippen für „Nur ich“');
}
// Alle Pflanzen- und Baumfotos (aller Gärten) durchgehen, die noch hochgeladen werden müssen
function alleFotoListenObjekte() {
  const liste = [];
  Object.values(gardens || {}).forEach(g => {
    (g.beds || []).forEach(b => {
      if (Array.isArray(b.fotos)) liste.push(b); // Beet-Foto
      (b.plants || []).forEach(p => { if (Array.isArray(p.fotos)) liste.push(p); });
    });
    (g.freiPflanzen || []).forEach(fp => { if (Array.isArray(fp.fotos)) liste.push(fp); });
    (g.beobachtungen || []).forEach(b => { if (Array.isArray(b.fotos)) liste.push(b); });
    Object.values(g.tierAlbum || {}).forEach(e => { if (e && Array.isArray(e.fotos)) liste.push(e); });
  });
  return liste;
}
let familienFotoUploadLaeuft = false;
async function familienFotosHochladen() {
  if (familienFotoUploadLaeuft || !window.FotoSpeicher || !window.FotoSpeicher.verfuegbar() || !navigator.onLine) return;
  familienFotoUploadLaeuft = true;
  let geaendert = false, fehler = false;
  try {
    for (const obj of alleFotoListenObjekte()) {
      for (const f of obj.fotos) {
        if (f.geteilt === false || f.url || !f.data) continue;
        try {
          const erg = await window.FotoSpeicher.hochladen(f.id, f.data, !!f.neuerName);
          if (!obj.fotos.includes(f) || f.geteilt === false) { window.FotoSpeicher.loeschen(erg.pfad); continue; } // inzwischen gelöscht/umgestellt
          f.url = erg.url; f.pfad = erg.pfad; f.geteilt = true; delete f.neuerName;
          geaendert = true;
        } catch (e) { console.warn('Familienfoto-Upload fehlgeschlagen', e); fehler = true; break; }
      }
      if (fehler) break;
    }
  } finally {
    familienFotoUploadLaeuft = false;
    if (geaendert) {
      saveData();
      if (activePlantBedId) { const b = getCurrentBeds().find(x => x.id === activePlantBedId.bedId); const p = b && b.plants[activePlantBedId.idx]; if (p && document.getElementById('plantPanel').classList.contains('open')) renderPlantPhoto(p); }
      const fp = activeFreiPflanzeId && getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
      if (fp) renderFreiPflanzePhoto(fp);
      beetFotoAnsichtenAktualisieren();
      if (document.getElementById('beetFotoModal').style.display === 'flex') beetFotoModalRendern();
    }
  }
}
function fotoTeilenUmschalten(obj, rendern) {
  if (!obj) return;
  const foto = ppFotoTitelbild(obj);
  if (!foto) return;
  if (foto.geteilt === false) {
    foto.geteilt = true;
    saveData(); rendern(obj);
    showTempStatus('👪 Wird mit der Familie geteilt …', 3);
    familienFotosHochladen();
    return;
  }
  if (!foto.data) { showTempStatus('ℹ️ „Nur ich“ geht nur auf dem Gerät, auf dem das Foto aufgenommen wurde.', 5); return; }
  fotoCloudLoeschen(foto);
  foto.geteilt = false; delete foto.url; delete foto.pfad;
  saveData(); rendern(obj);
  showTempStatus('🔒 Nur noch auf diesem Gerät sichtbar', 3);
}
document.getElementById('btnPpFotoTeilen').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  fotoTeilenUmschalten(bed && bed.plants[activePlantBedId.idx], renderPlantPhoto);
});
document.getElementById('btnFpFotoTeilen').addEventListener('click', (e) => {
  e.stopPropagation();
  fotoTeilenUmschalten(getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId), renderFreiPflanzePhoto);
});
// Ausstehende Uploads nachholen: kurz nach dem Start und sobald wieder Internet da ist
setTimeout(familienFotosHochladen, 4000);
window.addEventListener('online', () => setTimeout(familienFotosHochladen, 1500));

document.getElementById('btnPpFotoMalen').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  const plant = bed && bed.plants[activePlantBedId.idx];
  fotoMalstilAnwenden(plant, renderPlantPhoto);
});
document.getElementById('btnFpFotoMalen').addEventListener('click', (e) => {
  e.stopPropagation();
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  fotoMalstilAnwenden(fp, renderFreiPflanzePhoto);
});
document.getElementById('plantPanelHeader').addEventListener('click', (e) => {
  if (e.target.closest('.pp-header-actions, .pp-foto-galerie, .pp-lebenszyklus-badge, .close-btn')) return;
  if (e.target.closest('#ppTitle')) { const f = document.getElementById('ppName'); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus(); f.select(); return; }
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b => b.id === activePlantBedId.bedId);
  const plant = bed && bed.plants[activePlantBedId.idx];
  if (!plant) return;
  const titelbild = ppFotoTitelbild(plant);
  if (titelbild) fotoLightboxOeffnen(fotoQuelle(titelbild));
});
document.getElementById('freiPflanzePanelHeader').addEventListener('click', (e) => {
  if (e.target.closest('.pp-header-actions, .pp-foto-galerie, .pp-lebenszyklus-badge, .close-btn')) return;
  if (e.target.closest('#freiPflanzeTitel')) { const f = document.getElementById('fpName'); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus(); f.select(); return; }
  const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId);
  if (!fp) return;
  const titelbild = ppFotoTitelbild(fp);
  if (titelbild) fotoLightboxOeffnen(fotoQuelle(titelbild));
});
function togglePerennialInfo(e) {
  e.stopPropagation();
  let pop = document.getElementById('perennialInfoPopover');
  if (pop) { hidePerennialInfo(); return; }
  pop = document.createElement('div');
  pop.id = 'perennialInfoPopover';
  pop.className = 'pp-lebenszyklus-popover';
  pop.innerHTML = '🔄 <strong>Mehrjährig</strong> – wird einmal gepflanzt und bleibt über Jahre im Beet. Beste Pflanzzeit für Gehölze &amp; Sträucher meist Herbst oder zeitiges Frühjahr (frostfrei).';
  document.body.appendChild(pop);
  const rect = e.currentTarget.getBoundingClientRect();
  pop.style.top = (rect.bottom + 8) + 'px';
  pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  setTimeout(() => document.addEventListener('click', hidePerennialInfo), 0);
}
function hidePerennialInfo() {
  const pop = document.getElementById('perennialInfoPopover');
  if (pop) pop.remove();
  document.removeEventListener('click', hidePerennialInfo);
}
function normalizeHarvestUnit(unit, amount) {
  if (unit === 'g') return { unit: 'kg', amount: amount / 1000 };
  return { unit: unit || 'Stück', amount };
}

// ==================== ERNTEBUCH (gartenweite Auswertung) ====================
let harvestJournalYear = 'all';
function getAllHarvestEntries() {
  const beds = getCurrentBeds();
  const entries = [];
  beds.forEach(bed => {
    (bed.plants || []).forEach((p, pIdx) => {
      const name = (p.name || '').trim() || 'Unbenannt';
      const plant = PLANTS.find(pl => pl.name === name);
      const sym = p.sym || (plant ? plant.sym : '🧺');
      (p.harvests || []).forEach((h, hIdx) => {
        entries.push({ date: h.date, amount: parseFloat(h.amount) || 0, unit: h.unit, method: h.method || '', note: h.note, plant: name, sym, bed: bed.name || 'Beet', bedId: bed.id, plantIdx: pIdx, hIdx });
      });
    });
  });
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  return entries;
}
function csvEscape(val) {
  const s = String(val === undefined || val === null ? '' : val);
  if (/[";\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}
function exportHarvestJournalCSV() {
  const entries = getAllHarvestEntries();
  const shown = harvestJournalYear === 'all' ? entries : entries.filter(e => (e.date||'').slice(0,4) === harvestJournalYear);
  if (!shown.length) {
    alert('Keine Ernteeinträge für diesen Zeitraum vorhanden.');
    return;
  }
  const sorted = shown.slice().sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const gardenName = gardens[currentGardenId]?.name || 'Mein Garten';
  const header = ['Datum','Pflanze','Beet','Menge','Einheit','Verwendung','Notiz'];
  let csv = '\uFEFF' + header.join(';') + '\r\n'; // BOM für korrekte Umlaute in Excel
  sorted.forEach(e => {
    csv += [e.date||'', e.plant||'', e.bed||'', e.amount, e.unit||'', harvestUseLabel(e.method)||'', e.note||''].map(csvEscape).join(';') + '\r\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const yearLabel = harvestJournalYear === 'all' ? 'alle-jahre' : harvestJournalYear;
  a.download = `erntebuch-${gardenName.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${yearLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showTempStatus(`Erntebuch exportiert (${sorted.length} Einträge)`, 3);
}
function openHarvestJournal() {
  const entries = getAllHarvestEntries();
  const years = [...new Set(entries.map(e => (e.date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  harvestJournalYear = years.length ? years[0] : 'all';
  renderHarvestJournal(entries, years);
  document.getElementById('harvestJournalModal').style.display = 'flex';
}
function setHarvestJournalYear(y) {
  harvestJournalYear = y;
  renderHarvestJournal(getAllHarvestEntries());
}
function renderHarvestJournal(entries, years) {
  entries = entries || getAllHarvestEntries();
  years = years || [...new Set(entries.map(e => (e.date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a);
  const yearsBox = document.getElementById('harvestJournalYears');
  const box = document.getElementById('harvestJournalContent');

  if (!entries.length) {
    yearsBox.innerHTML = '';
    box.innerHTML = '<div class="empty-state">Noch keine Ernten eingetragen. Öffne eine Pflanze im Gartenplaner und trage im Tab „Ernte" deine erste Ernte ein.</div>';
    return;
  }

  yearsBox.innerHTML = years.map(y => `<button class="nav-btn${harvestJournalYear===y?' active':''}" style="padding:5px 12px;font-size:0.72rem" onclick="setHarvestJournalYear('${y}')">${y}</button>`).join('')
    + `<button class="nav-btn${harvestJournalYear==='all'?' active':''}" style="padding:5px 12px;font-size:0.72rem" onclick="setHarvestJournalYear('all')">Alle Jahre</button>`;

  const shown = harvestJournalYear === 'all' ? entries : entries.filter(e => (e.date||'').slice(0,4) === harvestJournalYear);

  // Jahresvergleich (kg) über alle Jahre
  const kgByYear = {};
  entries.forEach(e => {
    const y = (e.date||'').slice(0,4);
    if (!y) return;
    const n = normalizeHarvestUnit(e.unit, e.amount);
    if (n.unit === 'kg') kgByYear[y] = (kgByYear[y]||0) + n.amount;
  });
  let html = '';
  if (years.length > 1 && Object.keys(kgByYear).length > 1) {
    const maxKg = Math.max(...Object.values(kgByYear));
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Jahresvergleich (kg)</div>`;
    html += years.slice().reverse().map(y => {
      const kg = kgByYear[y] || 0;
      const pct = maxKg > 0 ? (kg/maxKg)*100 : 0;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:38px;font-size:0.72rem;color:var(--bark)">${y}</span>
        <div style="flex:1;height:10px;border-radius:6px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--moss)"></div></div>
        <span style="width:56px;text-align:right;font-size:0.72rem;color:var(--bark)">${kg%1===0?kg:kg.toFixed(1)} kg</span>
      </div>`;
    }).join('');
  }

  // Summe & Top-Pflanzen für gewählten Zeitraum
  const totals = {};
  const byPlant = {};
  shown.forEach(e => {
    const n = normalizeHarvestUnit(e.unit, e.amount);
    totals[n.unit] = (totals[n.unit]||0) + n.amount;
    byPlant[e.plant] = byPlant[e.plant] || { sym: e.sym, units: {} };
    byPlant[e.plant].units[n.unit] = (byPlant[e.plant].units[n.unit]||0) + n.amount;
  });
  const totalUnits = Object.keys(totals);
  html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">🧺 Summe ${harvestJournalYear==='all'?'(alle Jahre)':harvestJournalYear}</div>`;
  html += `<div style="font-size:0.9rem;color:var(--moss);font-weight:700;margin-bottom:10px">${totalUnits.length ? totalUnits.map(u=>`${totals[u]%1===0?totals[u]:totals[u].toFixed(2)} ${u}`).join(' · ') : '–'}</div>`;

  const topPlants = Object.entries(byPlant).sort((a,b) => (b[1].units.kg||0) - (a[1].units.kg||0)).slice(0,8);
  if (topPlants.length) {
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Nach Pflanze</div>`;
    html += topPlants.map(([name, d]) => {
      const label = Object.entries(d.units).map(([u,n])=>`${n%1===0?n:n.toFixed(2)} ${u}`).join(', ');
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.78rem"><span>${d.sym}</span><span style="flex:1">${escapeHtml(name)}</span><span style="color:var(--bark)">${label}</span></div>`;
    }).join('');
  }

  // Verwertungsstatistik: wie oft welche Verwendung angegeben wurde
  const byMethod = {};
  shown.forEach(e => { if (e.method) byMethod[e.method] = (byMethod[e.method]||0) + 1; });
  const methodEntries = Object.entries(byMethod).sort((a,b) => b[1]-a[1]);
  if (methodEntries.length) {
    const maxCount = Math.max(...methodEntries.map(e=>e[1]));
    html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">🥫 Verwertung</div>`;
    html += methodEntries.map(([key, count]) => {
      const opt = HARVEST_USE_OPTIONS.find(o=>o.key===key);
      const label = opt ? `${opt.icon} ${opt.label}` : key;
      const pct = (count/maxCount)*100;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:130px;font-size:0.72rem;color:var(--bark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}</span>
        <div style="flex:1;height:8px;border-radius:5px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--moss)"></div></div>
        <span style="width:26px;text-align:right;font-size:0.7rem;color:var(--bark)">${count}×</span>
      </div>`;
    }).join('');
  }

  html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">Chronologisch</div>`;
  html += shown.map(e => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin-bottom:4px;border-radius:7px;background:var(--cream)">
      <span style="font-size:1rem">${e.sym}</span>
      <span style="font-size:0.74rem;color:var(--bark);min-width:70px">${escapeHtml(e.date||'')}</span>
      <span style="flex:1;font-size:0.78rem"><strong>${escapeHtml(e.plant)}</strong> · ${escapeHtml(e.bed)} — ${e.amount} ${escapeHtml(e.unit)}${e.method?' · '+escapeHtml(harvestUseLabel(e.method)||e.method):''}${e.note?' · '+escapeHtml(e.note):''}</span>
      <button onclick="addHarvestToPantry('${e.bedId}',${e.plantIdx},${e.hIdx})" style="background:none;border:none;color:var(--moss);cursor:pointer;font-size:0.9rem;opacity:0.75;flex-shrink:0" title="In die Vorratskammer übernehmen">🥫</button>
    </div>`).join('') || '<div class="empty-state">Keine Einträge in diesem Zeitraum.</div>';

  box.innerHTML = html;
}
// Ernte direkt in den Eingang der Vorratskammer legen (dort wird sie einsortiert) – gleicher Weg wie beim Einkauf
// extra (optional): { methode: 'Eingekocht' | 'Eingefroren' | ..., verfall: 'JJJJ-MM-TT', notiz, ernteDatum, still }
function ernteInVorratskammer(name, amount, unit, date, extra) {
  extra = extra || {};
  try {
    const eingang = JSON.parse(localStorage.getItem('vorratskammer_eingang') || '[]');
    const eintrag = { id: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name,
      menge: (String(amount == null ? '' : amount) + ' ' + (unit || '')).trim(), einkaufKategorie: 'obst_gemuese',
      // Eingangsdatum = heute: der Eingang räumt Einträge nach 30 Tagen selbst weg – eine ältere Ernte wäre sonst sofort verschwunden
      datum: new Date().toISOString().slice(0, 10), quelle: 'garten' };
    if (date) eintrag.ernteDatum = date;
    if (extra.methode) eintrag.methode = extra.methode;
    if (extra.verfall) eintrag.verfall = extra.verfall;
    if (extra.notiz) eintrag.notiz = extra.notiz;
    eingang.push(eintrag);
    localStorage.setItem('vorratskammer_eingang', JSON.stringify(eingang));
    if (window._vorratSync) window._vorratSync.melde();
    if (!extra.still) showTempStatus('📥 „' + name + '“ liegt jetzt im Eingang der Vorratskammer', 5, { label: 'Öffnen', aktion: zurVorratskammer });
    return true;
  } catch (e) { if (!extra.still) showTempStatus('⚠ Konnte nicht an die Vorratskammer übergeben werden.', 5); return false; }
}
function zurVorratskammer() {
  if (window.parent && window.parent !== window) {
    try { window.parent.postMessage({ type: 'navigiere', modul: 'vorratskammer' }, window.location.origin); } catch (e) {}
  } else {
    window.location.href = 'vorratskammer.html';
  }
}
function addHarvestEntry() {
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
  if (!bed) return;
  const plant = bed.plants[activePlantBedId.idx];
  if (!plant) return;
  const date = document.getElementById('ppHarvestDate').value;
  const amount = parseFloat(document.getElementById('ppHarvestAmount').value);
  const unit = document.getElementById('ppHarvestUnit').value;
  const method = document.getElementById('ppHarvestMethod').value;
  const note = document.getElementById('ppHarvestNote').value;
  if (!date || isNaN(amount) || amount <= 0) {
    showTempStatus('⚠ Bitte Datum und eine Menge größer 0 eingeben.', 5);
    return;
  }
  pushUndo();
  if (!plant.harvests) plant.harvests = [];
  plant.harvests.push({ date, amount, unit, method, note });
  plant.harvests.sort((a,b) => a.date < b.date ? 1 : -1);
  pruefePflanzenMeilenstein(plant);
  saveData();
  document.getElementById('ppHarvestAmount').value = '';
  document.getElementById('ppHarvestMethod').value = '';
  document.getElementById('ppHarvestNote').value = '';
  renderHarvestLog(bed, activePlantBedId.idx);
  const ernteName = (plant.name || '').trim() || 'Ernte';
  showTempStatus(`🧺 Ernte eingetragen: ${amount} ${unit}`, 5, { label: '→ Vorratskammer', aktion: () => ernteInVorratskammer(ernteName, amount, unit, date) });
}
function deleteHarvestEntry(hIdx) {
  if (!activePlantBedId) return;
  const bed = getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
  if (!bed) return;
  const plant = bed.plants[activePlantBedId.idx];
  if (!plant || !plant.harvests) return;
  pushUndo();
  plant.harvests.splice(hIdx, 1);
  saveData();
  renderHarvestLog(bed, activePlantBedId.idx);
}
function renderHarvestLog(bed, idx) {
  const totalBox = document.getElementById('harvestTotal');
  const logBox = document.getElementById('harvestLog');
  if (!totalBox || !logBox) return;
  const plant = bed.plants[idx];
  const harvests = (plant && plant.harvests) || [];
  const tabBadge = document.getElementById('ppTabHarvest');
  if (tabBadge) tabBadge.innerHTML = '🧺 Ernte' + (harvests.length ? '<span class="pp-tab-badge"></span>' : '');
  renderErnteErinnerungBox('ppErnteErinnerungBox', plant && plant.name, plant && plant.date);
  if (!harvests.length) {
    totalBox.textContent = '';
    logBox.innerHTML = '<div class="empty-state">Noch keine Ernte eingetragen.</div>';
    return;
  }
  const totals = {};
  harvests.forEach(h => {
    const n = normalizeHarvestUnit(h.unit, parseFloat(h.amount)||0);
    totals[n.unit] = (totals[n.unit]||0) + n.amount;
  });
  totalBox.innerHTML = '🧺 Gesamt: ' + Object.entries(totals).map(([u,n]) => `${n % 1 === 0 ? n : n.toFixed(2)} ${u}`).join(' · ');
  logBox.innerHTML = harvests.map((h, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin-bottom:4px;border-radius:7px;background:var(--cream)">
      <span style="font-size:0.76rem;color:var(--bark);min-width:70px">${escapeHtml(h.date)}</span>
      <span style="flex:1;font-size:0.8rem"><strong>${h.amount} ${escapeHtml(h.unit)}</strong>${h.method ? ' · '+escapeHtml(harvestUseLabel(h.method)||h.method) : ''}${h.note ? ' · '+escapeHtml(h.note) : ''}</span>
      <button onclick="addHarvestToPantry('${bed.id}',${idx},${i})" style="background:none;border:none;color:var(--moss);cursor:pointer;font-size:0.9rem;opacity:0.7" title="In die Vorratskammer übernehmen">🥫</button>
      <button onclick="deleteHarvestEntry(${i})" style="background:none;border:none;color:#c05030;cursor:pointer;font-size:0.85rem;opacity:0.6" title="Löschen">🗑</button>
    </div>`).join('');
}
function savePlantInfo(){
  if(!activePlantBedId) return;
  const bed=getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
  if(!bed) return;
  const plant=bed.plants[activePlantBedId.idx];
  if(!plant) return;
  plant.name=document.getElementById('ppName').value;
  plant.variety=document.getElementById('ppVariety').value;
  plant.notes=document.getElementById('ppNotes').value;
  const altesDatum = plant.date;
  plant.date=document.getElementById('ppDate').value;
  plant.location=document.getElementById('ppLocation').value;
  gruppeFelderLesen(plant, 'pp');
  // Verknüpfte Pflanz-Erinnerung mitführen: Datum/Name geändert → Termin anpassen; Datum weg oder vergangen → entfernen
  if (plant.pflanzTerminId) {
    if (plant.date && plant.date >= pflanzIsoHeute()) pflanzTerminSetzen(plant, bed, true);
    else if (plant.date !== altesDatum) pflanzTerminEntfernen(plant);
  }
  saveData(); draw();
  renderPflanzErinnerung(); renderBeetErinnerungKnopf();
  renderNeighbors(bed,activePlantBedId.idx);
  renderSowingHint(plant.name||'');
  renderRueckschnittHint(plant.name||'', 'rueckschnittHint');
  renderBedingungenHint(plant.name||'', 'bedingungenHint');
  renderPflanzenBeobachtungen(plant.name||'', 'ppBeobBox');
  renderGiessInfo(plant);
  renderVarietyDatalist(plant.name||'');
  if (document.getElementById('ppt-preserve')?.classList.contains('active')) renderPreservePlantTab(plant.name||'');
  if (selectedBed===bed) renderBedPlantList(bed, document.getElementById('bedPlantSearch')?.value||'');
}
function renderNeighbors(bed,idx){
  const box=document.getElementById('neighborsResult');
  if(!box) return;
  const plant=bed.plants[idx];
  const name=(plant.name||'').trim();
  const others=bed.plants.filter((p,i)=>i!==idx);
  if(!name){
    box.innerHTML='<div class="empty-state">Bitte zuerst einen Pflanzennamen eintragen (Tab "Info"), um Mischkultur-Hinweise zu sehen.</div>';
    return;
  }
  if(!others.length){
    box.innerHTML='<div class="empty-state">Noch keine weiteren Pflanzen in diesem Beet.</div>';
    return;
  }
  const data=COMPANIONS[name];
  const rows=others.map(o=>{
    const on=(o.name||'').trim();
    if(!on) return {sym:o.sym,name:'(unbenannt)',status:'neutral'};
    const cd=COMPANIONS[on];
    const isBad=(data&&data.bad.includes(on))||(cd&&cd.bad.includes(name));
    const isGood=(data&&data.good.includes(on))||(cd&&cd.good.includes(name));
    return {sym:o.sym,name:on,status:isBad?'bad':isGood?'good':'neutral'};
  });
  const labelMap={good:'✅ Gute Nachbarschaft',bad:'⚠️ Schlechte Nachbarschaft',neutral:'➖ Neutral'};
  const colorMap={good:'var(--moss)',bad:'#c0633a',neutral:'var(--bark)'};
  box.innerHTML=rows.map(r=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 9px;margin-bottom:6px;border-radius:7px;background:var(--cream);border-left:3px solid ${colorMap[r.status]}">
      <span style="font-size:1.1rem">${r.sym}</span>
      <span style="flex:1;font-size:0.8rem">${r.name}</span>
      <span style="font-size:0.7rem;font-weight:600;color:${colorMap[r.status]}">${labelMap[r.status]}</span>
    </div>`).join('');
  if(!data){
    box.innerHTML+='<div class="empty-state" style="margin-top:6px">Für diese Pflanzenart liegen noch keine Mischkultur-Daten vor.</div>';
  }
}
function removePlant(){
  if(!activePlantBedId) return;
  const bed=getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
  if(!bed) return;
  const plantVorschau=bed.plants[activePlantBedId.idx];
  if (!confirm(`"${plantVorschau?.name||'Diese Pflanze'}" wirklich entfernen?`)) return;
  pushUndo();
  const plant=bed.plants[activePlantBedId.idx];
  if (plant) {
    if (!bed.history) bed.history = [];
    bed.history.push({ name: plant.name, variety: plant.variety, date: plant.date, removedAt: new Date().toISOString().slice(0,10) });
  }
  bed.plants.splice(activePlantBedId.idx,1);
  activePlantBedId=null;selectedPlantOnCanvas=null;
  closePlantPanel();draw();saveData();updateStatus();
  if (selectedBed===bed) { renderFruchtfolge(bed); renderBedPlantList(bed, document.getElementById('bedPlantSearch')?.value||''); }
}
function renderPreservePlantTab(plantName, targetId) {
  targetId = targetId || 'preservePlantResult';
  const box = document.getElementById(targetId);
  if (!box) return;
  const name = (plantName||'').trim();
  if (!name) {
    box.innerHTML = '<div class="empty-state">Bitte zuerst einen Pflanzennamen eintragen (Tab "Info").</div>';
    return;
  }
  const plantDef = PLANTS.find(p => p.name === name);
  if (plantDef && plantDef.cat === 'Blumen') {
    box.innerHTML = '<div class="empty-state">Für Zierpflanzen sind keine Verwertungs-Hinweise hinterlegt.</div>';
    return;
  }
  const info = getPreservationInfo(name);
  let html = '';
  if (!info) {
    html = '<div class="empty-state">Für diese Pflanze liegen keine spezifischen Hinweise vor – grundsätzlich eignen sich meist Einkochen, Einfrieren oder Trocknen.</div>';
  } else {
    if (info.note) html += `<div class="symptom-card" style="margin-bottom:10px">${escapeHtml(info.note)}</div>`;
    if (info.methods.length) {
      html += info.methods.map(k => {
        const m = METHOD_INFO[k];
        if (!m) return '';
        return `<div style="padding:8px 10px;margin-bottom:6px;border-radius:8px;background:var(--cream);border-left:3px solid var(--moss)">
          <div style="font-size:0.8rem;font-weight:600;color:var(--soil)">${m.icon} ${escapeHtml(m.label)}</div>
          <div style="font-size:0.75rem;color:var(--bark);margin-top:2px">${escapeHtml(m.tip)}</div>
        </div>`;
      }).join('');
    } else if (!info.note) {
      html = '<div class="empty-state">Für diese Pflanze sind noch keine Verwertungs-Hinweise hinterlegt.</div>';
    }
  }
  html += `<div style="text-align:right;margin-top:6px"><button class="nav-btn" style="padding:4px 10px;font-size:0.7rem" onclick="openPreserveForPlant(${jsAttrStr(name)})">🥫 Im Verwertungs-Bereich ansehen</button></div>`;
  box.innerHTML = html;
}
function openPreserveForPlant(plantName) {
  showView('preserve');
  setTimeout(() => {
    const input = document.getElementById('preserveSearch');
    if (input) { input.value = plantName; filterPreserveList(plantName); }
  }, 60);
}
function switchPPTab(name){
  document.querySelectorAll('#plantPanel .pp-tab').forEach((t,i)=>{const names=['info','neighbors','symptoms','pests','harvest','preserve','bewertung'];t.classList.toggle('active',names[i]===name);});
  document.querySelectorAll('#plantPanel .pp-tab-content').forEach(el=>{el.classList.toggle('active',el.id==='ppt-'+name);});
  const panel = document.getElementById('plantPanel');
  if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
  if (name==='bewertung') gbRender('pp');
  if (name==='preserve' && activePlantBedId) {
    const bed = getCurrentBeds().find(b=>b.id===activePlantBedId.bedId);
    const plant = bed && bed.plants[activePlantBedId.idx];
    if (plant) renderPreservePlantTab(plant.name);
  }
}

// ==================== TABS ====================
function switchTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>{const names=['beds','new','plants','settings'];const on=names[i]===name;t.classList.toggle('active',on);t.setAttribute('aria-selected',on?'true':'false');});
  document.querySelectorAll('.tab-content').forEach(el=>{el.classList.toggle('active',el.id==='tab-'+name);});
  if (name==='settings') refreshSettingsUI();
}

// ==================== STATUS ====================
function updateStatus(){
  const beds=getCurrentBeds();
  const zahl = pflanzenZaehlen();
  document.getElementById('sb2').textContent='Beete: '+beds.filter(b=>b.kind!=='struktur').length;
  document.getElementById('sb3').textContent='Pflanzen: '+zahl.stueck+(zahl.zwiebeln?' (🌷 '+zahl.zwiebeln+')':'');
  document.getElementById('sb3').title = zahl.zwiebeln ? `${zahl.stueck} Pflanzen, davon ${zahl.zwiebeln} Zwiebeln/Knollen` : `${zahl.stueck} Pflanzen`;
  if (bluehMonat) try { bluehLeisteRendern(); } catch (e) {}
  document.getElementById('sb4').textContent=gardens[currentGardenId]?.name||'';
}

// ==================== ROBUSTHEIT: GLOBALES FEHLER-NETZ ====================
let lastErrorNotice = 0;
window.addEventListener('error', (e) => {
  const details = (e.error && e.error.message) || e.message || 'Unbekannter Fehler';
  const ort = e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '';
  console.error('Gartenplaner-Fehler:', e.error || e.message, ort);
  const now = Date.now();
  if (now - lastErrorNotice > 15000) {
    lastErrorNotice = now;
    showTempStatus('⚠ Fehler: ' + details.slice(0, 90) + ' – Daten wurden zuletzt automatisch gespeichert.', 10);
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Gartenplaner-Fehler (Promise):', e.reason);
  const now = Date.now();
  if (now - lastErrorNotice > 15000) {
    lastErrorNotice = now;
    const msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    showTempStatus('⚠ Fehler (async): ' + msg.slice(0, 90), 10);
  }
});

// ==================== BACKUP-ERINNERUNG ====================
const BACKUP_REMIND_DAYS = 14;
const BACKUP_SNOOZE_DAYS = 7;
function checkBackupReminder() {
  const totalBeds = Object.values(gardens).reduce((s, g) => s + (g.beds ? g.beds.length : 0), 0);
  if (totalBeds === 0) return; // nichts zu sichern
  let lastExport = 0, snoozeUntil = 0;
  try { lastExport = parseInt(localStorage.getItem('gartenplaner_lastExport') || '0', 10); } catch(e) {}
  try { snoozeUntil = parseInt(localStorage.getItem('gartenplaner_backupSnooze') || '0', 10); } catch(e) {}
  const now = Date.now();
  if (now < snoozeUntil) return;
  const daysSince = lastExport ? Math.floor((now - lastExport) / 86400000) : null;
  if (daysSince !== null && daysSince < BACKUP_REMIND_DAYS) return;
  const text = daysSince === null
    ? 'Du hast noch kein Foto-Backup exportiert. Alle anderen Gartendaten synchronisieren sich automatisch mit der Cloud – deine Fotos im Tagebuch liegen aber ausschließlich in diesem Browser.'
    : `Du hast seit ${daysSince} Tagen kein Backup mehr exportiert. Deine Fotos im Garten-Tagebuch liegen ausschließlich in diesem Browser (werden bewusst nicht mit der Cloud synchronisiert).`;
  document.getElementById('backupBannerText').textContent = text;
  document.getElementById('backupBanner').style.display = 'flex';
}
function dismissBackupBanner(exported) {
  document.getElementById('backupBanner').style.display = 'none';
  if (!exported) {
    try { localStorage.setItem('gartenplaner_backupSnooze', String(Date.now() + BACKUP_SNOOZE_DAYS * 86400000)); } catch(e) {}
  }
}

