// Gartenplaner – Karte: Zeichnen, Zoom, Ebenen, Kronen, Gießrunde, Tiere, Notizen, Eingabe
// Teil 2 von 4 des Garten-Skripts (aus garten.html ausgelagert, wird dort in dieser Reihenfolge geladen).
// ==================== CANVAS ====================
const canvas = document.getElementById('gardenCanvas');
let ctx = canvas.getContext('2d');
const hauptCtx = ctx;
const wrap = document.getElementById('canvasWrap');
// ==================== SCHARFE DARSTELLUNG BEIM REINZOOMEN ====================
// Der Haupt-Canvas hat 1 Pixel pro cm und wird per CSS vergrößert – beim starken Reinzoomen wird
// das unscharf. Darum liegt darüber ein zweiter Canvas, der nur den sichtbaren Ausschnitt (plus Rand)
// in voller Bildschirmauflösung zeichnet. Er liegt im Scroll-Inhalt und wandert beim Wischen mit;
// erst wenn der Rand erreicht ist, wird neu gezeichnet. Klicks/Touches gehen weiter an den Haupt-Canvas.
const scharfCanvas = document.createElement('canvas');
scharfCanvas.id = 'gardenCanvasScharf';
scharfCanvas.setAttribute('aria-hidden', 'true');
scharfCanvas.style.cssText = 'position:absolute;pointer-events:none;display:none;left:0;top:0;z-index:1;';
canvas.insertAdjacentElement('afterend', scharfCanvas);
const scharfCtx = scharfCanvas.getContext('2d');
let scharfFaktor = 1, scharfBereich = null;
(function () { // Schatten-Werte sind Gerätepixel – mit dem Maßstab mitwachsen lassen
  const proto = CanvasRenderingContext2D.prototype;
  ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY'].forEach(k => {
    const d = Object.getOwnPropertyDescriptor(proto, k);
    if (!d || !d.set) return;
    Object.defineProperty(scharfCtx, k, { get() { return d.get.call(this) / scharfFaktor; }, set(v) { d.set.call(this, v * scharfFaktor); }, configurable: true });
  });
})();
function scharfAus() {
  scharfBereich = null;
  scharfCanvas.style.display = 'none';
  canvas.style.opacity = '';
}
function scharfZeichnen() {
  const z = gartenZoom || 1, dpr = window.devicePixelRatio || 1;
  const vw = wrap.clientWidth, vh = wrap.clientHeight;
  if (!vw || !vh || z * dpr <= 1.25 || !canvas.width) { scharfAus(); return; }
  const ox = canvas.offsetLeft, oy = canvas.offsetTop;
  // sichtbarer Ausschnitt in Garten-Koordinaten (cm), mit 35 % Rand auf jeder Seite
  const sx = (wrap.scrollLeft - ox) / z, sy = (wrap.scrollTop - oy) / z, sw = vw / z, sh = vh / z;
  const rand = 0.35;
  const x0 = Math.max(0, sx - sw * rand), y0 = Math.max(0, sy - sh * rand);
  const x1 = Math.min(canvas.width, sx + sw * (1 + rand)), y1 = Math.min(canvas.height, sy + sh * (1 + rand));
  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0) { scharfAus(); return; }
  let f = dpr;
  const MAX_PIXEL = 9e6;
  const px = bw * z * bh * z * f * f;
  if (px > MAX_PIXEL) f *= Math.sqrt(MAX_PIXEL / px);
  const pw = Math.max(1, Math.round(bw * z * f)), ph = Math.max(1, Math.round(bh * z * f));
  if (scharfCanvas.width !== pw) scharfCanvas.width = pw;
  if (scharfCanvas.height !== ph) scharfCanvas.height = ph;
  scharfCanvas.style.left = Math.round(ox + x0 * z) + 'px';
  scharfCanvas.style.top = Math.round(oy + y0 * z) + 'px';
  scharfCanvas.style.width = (pw / f) + 'px';
  scharfCanvas.style.height = (ph / f) + 'px';
  const k = pw / bw;
  scharfFaktor = k;
  scharfCtx.setTransform(1, 0, 0, 1, 0, 0);
  scharfCtx.clearRect(0, 0, pw, ph);
  scharfCtx.setTransform(k, 0, 0, ph / bh, -x0 * k, -y0 * (ph / bh));
  ctx = scharfCtx;
  try { drawSzene(); } catch (e) { console.warn('Scharf zeichnen fehlgeschlagen', e); }
  finally { ctx = hauptCtx; }
  scharfBereich = { x0, y0, x1, y1, z };
  scharfCanvas.style.display = 'block';
  canvas.style.opacity = '0';
}
let scharfScrollRaf = 0;
wrap.addEventListener('scroll', () => {
  if (!scharfBereich || scharfScrollRaf) return;
  scharfScrollRaf = requestAnimationFrame(() => {
    scharfScrollRaf = 0;
    const b = scharfBereich, z = gartenZoom || 1;
    if (!b) return;
    const sx = (wrap.scrollLeft - canvas.offsetLeft) / z, sy = (wrap.scrollTop - canvas.offsetTop) / z;
    const sw = wrap.clientWidth / z, sh = wrap.clientHeight / z, m = 0.08;
    const drin = (sx >= b.x0 - 1 || b.x0 <= 0) && (sy >= b.y0 - 1 || b.y0 <= 0) &&
      (sx + sw <= b.x1 + 1 || b.x1 >= canvas.width) && (sy + sh <= b.y1 + 1 || b.y1 >= canvas.height);
    const nahAmRand = (b.x0 > 0 && sx - b.x0 < sw * m) || (b.y0 > 0 && sy - b.y0 < sh * m) ||
      (b.x1 < canvas.width && b.x1 - (sx + sw) < sw * m) || (b.y1 < canvas.height && b.y1 - (sy + sh) < sh * m);
    if (!drin || nahAmRand) scharfZeichnen();
  });
}, { passive: true });

// Feste Regel ab jetzt: 1 Canvas-Einheit (Pixel im internen Zeichenpuffer) = 1 echter cm.
// Die Canvas-Puffergröße richtet sich damit direkt nach der hinterlegten Gartengröße in Metern
// (statt wie vorher nach der Bildschirmgröße) – dadurch bleiben Beete real-proportional zueinander
// und zur Gartengröße, unabhängig vom Gerät. "Zoom" ist rein die CSS-Anzeigegröße obendrauf.
let gartenZoom = 1;
function aktuelleGartengroesseCm() {
  const size = getGardenSizeM();
  if (size && size.w > 0 && size.h > 0) return { w: Math.round(size.w * 100), h: Math.round(size.h * 100) };
  return { w: 1000, h: 800 }; // Standardgröße (10 × 8 m), solange noch keine Gartengröße hinterlegt ist
}
// Hat man selbst gezoomt (＋/－, Sprung zu Beet/Zone), bleibt dieser Zoom erhalten – auch wenn
// Android beim Verschieben der Karte die Fenstergröße minimal ändert (Adress-/Navigationsleiste).
let gartenZoomManuell = false, gartenZoomWrapBreite = 0;
function resizeCanvas(erzwingen) {
  const groesse = aktuelleGartengroesseCm();
  const geaendert = canvas.width !== groesse.w || canvas.height !== groesse.h;
  if (geaendert) { canvas.width = groesse.w; canvas.height = groesse.h; }
  gartenZoomEinpassen(erzwingen || geaendert);
  draw();
}
function wendeZoomAn() {
  canvas.style.width = Math.round(canvas.width * gartenZoom) + 'px';
  canvas.style.height = Math.round(canvas.height * gartenZoom) + 'px';
  if (scharfBereich && scharfBereich.z !== gartenZoom) scharfAus(); // bis zum Neuzeichnen das (unscharfe) Hauptbild zeigen
  const prozentText = Math.round(gartenZoom * 100) + '%';
  const anzeige = document.getElementById('gartenZoomWert');
  if (anzeige) anzeige.textContent = prozentText;
  const widgetAnzeige = document.getElementById('gartenZoomWidgetWert');
  if (widgetAnzeige) widgetAnzeige.textContent = prozentText;
  clearTimeout(wendeZoomAn._t); wendeZoomAn._t = setTimeout(() => { try { draw(); } catch (e) {} }, 60); // Schilder an Zoom anpassen
}
// Das Zoom-Widget schwebt fest über der sichtbaren Garten-Fläche (position:fixed), damit
// es beim Verschieben/Scrollen im gezoomten Garten nicht mit aus dem Bild wandert.
// Seine Position wird anhand der tatsächlichen Bildschirmposition von #canvasWrap berechnet.
function positioniereZoomWidget() {
  try { nordWidgetAktualisieren(); } catch (e) {}
  try { bluehLeistePositionieren(); } catch (e) {}
  try { kartenLeistenPositionieren(); } catch (e) {}
  const widget = document.getElementById('gartenZoomWidget');
  const wrap = document.getElementById('canvasWrap');
  if (!widget || !wrap) return;
  const sichtbar = document.getElementById('view-garden')?.classList.contains('active');
  if (!sichtbar) { widget.style.display = 'none'; return; }
  const rect = wrap.getBoundingClientRect();
  widget.style.display = 'flex';
  widget.style.top = Math.round(rect.top + 12) + 'px';
  widget.style.left = Math.round(rect.left + 12) + 'px';
  const frei = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0) - 24;
  widget.style.maxHeight = Math.max(120, frei) + 'px';
  widget.style.overflowY = 'auto';
}
window.addEventListener('resize', positioniereZoomWidget);
window.addEventListener('orientationchange', () => setTimeout(positioniereZoomWidget, 200));
function gartenZoomSetzen(neuerZoom, automatisch) {
  gartenZoom = Math.min(4, Math.max(0.1, neuerZoom));
  if (!automatisch) gartenZoomManuell = true;
  wendeZoomAn();
}
function gartenZoomAnpassen(faktor) { gartenZoomSetzen(gartenZoom * faktor); }
// erzwingen=false: nur einpassen, solange nicht selbst gezoomt wurde
function gartenZoomEinpassen(erzwingen = true) {
  if (!wrap.clientWidth || !canvas.width) return;
  if (!erzwingen && gartenZoomManuell) { wendeZoomAn(); return; }
  gartenZoomManuell = false;
  gartenZoomWrapBreite = wrap.clientWidth;
  gartenZoomSetzen(wrap.clientWidth / canvas.width, true);
}
// Nur auf echte Breitenänderungen reagieren – reine Höhenänderungen (Leisten ein-/ausblenden
// beim Wischen) lösen sonst ständig ein Zurückspringen auf „ganzer Garten“ aus.
window.addEventListener('resize', () => {
  if (Math.abs(wrap.clientWidth - gartenZoomWrapBreite) < 4) return;
  gartenZoomEinpassen(false);
});
window.addEventListener('orientationchange', () => setTimeout(() => gartenZoomEinpassen(true), 250));

function drawZones() {
  ctx.save();
  ctx.strokeStyle = '#b5842e';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.font = 'bold 15px Inter, sans-serif';
  getCurrentZones().forEach(z => {
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    const labelText = z.name;
    const metrics = ctx.measureText(labelText);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(58,46,31,0.82)';
    ctx.fillRect(z.x + 4, z.y + 4, metrics.width + 12, 22);
    ctx.fillStyle = '#f4ead0';
    ctx.fillText(labelText, z.x + 10, z.y + 20);
    ctx.setLineDash([10, 6]);
  });
  if (zoneDrawing && zoneDrawStart && zoneDrawCur) {
    const x = Math.min(zoneDrawStart.x, zoneDrawCur.x), y = Math.min(zoneDrawStart.y, zoneDrawCur.y);
    const w = Math.abs(zoneDrawCur.x - zoneDrawStart.x), h = Math.abs(zoneDrawCur.y - zoneDrawStart.y);
    ctx.strokeStyle = '#c46b41';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}
function draw() {
  drawSzene();
  scharfZeichnen();
}
function drawSzene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (ebene('hintergrund')) drawBgImage();
  drawGardenBoundary();
  drawZones();
  symbolBuendelBerechnen();
  for (const bed of getCurrentBeds()) drawBed(bed, selectedBeds.includes(bed));
  if (bluehMonat) { // Blüh-Zeitleiste: alles außer den Pflanzen etwas zurücknehmen
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    for (const bed of getCurrentBeds()) drawBed(bed, false, true);
  }
  for (const fp of getCurrentFreiPflanzen()) drawFreiPflanze(fp);
  zeichneSymbolBuendel();
  zeichneTuffFormVorschau();
  zeichneMessung();
  zeichneFruchtfolgeAmpel();
  zeichneGiftMarker();
  zeichneNotizPins();
  zeichneTierMarker();
  zeichneGiessRunde();
  if (freehandDrawing && freehandPoints.length) {
    ctx.save();
    ctx.strokeStyle = '#4f6f45'; ctx.lineWidth = 2; ctx.setLineDash([5,4]);
    ctx.beginPath();
    ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y);
    for (let k=1;k<freehandPoints.length;k++) ctx.lineTo(freehandPoints[k].x, freehandPoints[k].y);
    ctx.lineTo(freehandMouseX, freehandMouseY);
    ctx.stroke();
    ctx.setLineDash([]);
    freehandPoints.forEach((p,i)=>{
      ctx.beginPath();
      ctx.fillStyle = i===0 ? '#c0392b' : '#4f6f45';
      ctx.arc(p.x, p.y, i===0?7:4.5, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.restore();
  }
  if (dragPlant && dragPlant.moved) {
    if (dragPlant.targetBed) {
      const t = dragPlant.targetBed;
      ctx.save();
      ctx.strokeStyle = '#2e6ea6'; ctx.lineWidth = 2.5; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.arc(t.x, t.y, getBedRadius(t)+6, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dragPlant.plant.sym, dragPlant.curX, dragPlant.curY);
    ctx.restore();
  }
  if (dragFreiPflanze) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dragFreiPflanze.item.sym || '🌳', dragFreiPflanze.curX, dragFreiPflanze.curY);
    ctx.restore();
  }
}
// ==================== SYMBOLGRÖSSEN, PFLANZGRUPPEN (TUFFS) & BÜNDEL ====================
// Symbole richten sich nach dem echten Pflanzabstand (in cm, wie der ganze Plan) – mit Unter- und
// Obergrenze. Beim Herauszoomen wachsen sie bis zu einer Mindestgröße am Bildschirm mit; was sich
// dann überlappt, wird zu einem Bündel „×n“ zusammengefasst (Antippen → Auswahlliste).
const EMOJI_FONT = '"Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",serif';
const SYMBOL_MIN_PX = { beet: 13, frei: 22 };
function zoomFaktor() { return Math.max(0.1, gartenZoom || 1); }
function pflanzAbstandCm(name) {
  const n = (name || '').trim();
  return SPACING[n] || (typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[n] && STAUDEN_INFO[n].abstand) || 0;
}
function istGruppe(p) { return !!p && (parseInt(p.anzahl, 10) || 1) > 1; }
function gruppenRadius(p) {
  if (hatTuffForm(p)) return Math.max(12, ...p.form.map(q => Math.hypot(q.x, q.y)));
  if (p.gruppenR > 0) return p.gruppenR;
  const s = pflanzAbstandCm(p.name) || 15;
  return Math.max(12, Math.round(s * 0.6 * Math.sqrt(parseInt(p.anzahl, 10) || 1)));
}
function beetSymbolCm(p) { // Schriftgröße des Emojis im Beet
  const s = pflanzAbstandCm(p.name) || 30;
  return Math.max(Math.min(24, Math.max(9, s * 0.6)), SYMBOL_MIN_PX.beet / zoomFaktor());
}
function freiSymbolCm(fp) { // Durchmesser des Kreises einer Einzelpflanze
  const s = pflanzAbstandCm(fp.name) || 400;
  return Math.max(Math.min(36, Math.max(16, s * 0.4)), SYMBOL_MIN_PX.frei / zoomFaktor());
}
function symbolRadius(p, frei) {
  if (istGruppe(p)) return Math.max(gruppenRadius(p), SYMBOL_MIN_PX.beet * 0.6 / zoomFaktor());
  return frei ? freiSymbolCm(p) / 2 : beetSymbolCm(p) * 0.6;
}
function trefferRadius(p, frei) { return Math.max(symbolRadius(p, frei) * 1.15, 10 / zoomFaktor()); }
function istZwiebelPflanze(name) {
  const n = (name || '').trim();
  return !!(typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[n] && STAUDEN_INFO[n].zwiebel) ||
    ['Tulpe', 'Narzisse', 'Krokus', 'Schneeglöckchen', 'Hyazinthe', 'Traubenhyazinthe', 'Zierlauch', 'Blaustern', 'Winterling', 'Märzenbecher', 'Kaiserkrone', 'Schachbrettblume'].includes(n);
}
function zeichnePflanzGruppe(cx, cy, p, ausgewaehlt) {
  const r = gruppenRadius(p), z = zoomFaktor(), anzahl = parseInt(p.anzahl, 10) || 1, n = Math.min(anzahl, 80);
  const si = (typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[(p.name || '').trim()]) || {};
  const blueht = bluehStatus(p.name);
  const farbe = blueht ? bluehFarbe(p.name) : (/^#[0-9a-f]{6}$/i.test(si.farbe || '') ? si.farbe : '#8fae6a');
  const form = hatTuffForm(p) ? p.form : null;
  ctx.save();
  ctx.beginPath();
  if (form) { form.forEach((q, i) => i ? ctx.lineTo(cx + q.x, cy + q.y) : ctx.moveTo(cx + q.x, cy + q.y)); ctx.closePath(); }
  else ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = farbe + (blueht ? '88' : '44'); ctx.fill();
  ctx.setLineDash([4 / z, 3 / z]); ctx.lineWidth = (ausgewaehlt ? 2.5 : 1.4) / z;
  ctx.strokeStyle = ausgewaehlt ? '#c0633a' : farbeMischen(farbe, -0.35); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2c2415'; // deckend – sonst übernehmen Farb-Emojis die Transparenz der Fläche
  const s = pflanzAbstandCm(p.name) || 15, f = Math.min(s * 0.8, r * 0.9);
  if (f * z >= 10 && form) { // eigene Form: Pflanzen gleichmäßig in der Fläche verteilt
    const pts = tuffStreuPunkte(form, n);
    const fs = pts.length > 1 ? Math.min(s * 0.8, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) * 0.95) : f;
    ctx.font = Math.max(fs, 4) + 'px ' + EMOJI_FONT;
    pts.forEach(q => ctx.fillText(p.sym || '🌱', cx + q.x, cy + q.y));
  } else if (f * z >= 10) { // nah genug: jede Pflanze einzeln, im Sonnenblumen-Muster verteilt
    ctx.font = f + 'px ' + EMOJI_FONT;
    for (let i = 0; i < n; i++) {
      const rr = Math.max(0, r - f * 0.45) * Math.sqrt((i + 0.5) / n), w = i * 2.39996;
      ctx.fillText(p.sym || '🌱', cx + rr * Math.cos(w), cy + rr * Math.sin(w));
    }
  } else {
    ctx.font = Math.max(13 / z, Math.min(r * 0.9, 26 / z)) + 'px ' + EMOJI_FONT;
    ctx.fillText(p.sym || '🌱', cx, cy);
  }
  if (form) {
    const maxX = Math.max(...form.map(q => q.x)), minY = Math.min(...form.map(q => q.y));
    zaehlerZeichnen('×' + anzahl, cx + maxX * 0.85, cy + minY * 0.85, 'rgba(44,36,21,0.85)');
  } else zaehlerZeichnen('×' + anzahl, cx + r * 0.72, cy - r * 0.72, 'rgba(44,36,21,0.85)');
  ctx.restore();
}
function zaehlerZeichnen(text, x, y, hg) {
  const z = zoomFaktor();
  ctx.save();
  ctx.font = '700 ' + (10 / z) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const bw = ctx.measureText(text).width + 8 / z, bh = 14 / z;
  ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(text, x, y + 0.5 / z);
  ctx.restore();
}
let symbolBuendel = [], buendelVersteckt = new Set(), aktuellesBuendel = null;
function symbolBuendelBerechnen() {
  symbolBuendel = []; buendelVersteckt = new Set();
  const z = zoomFaktor(), items = [];
  const clusterR = (p, frei) => istGruppe(p) ? SYMBOL_MIN_PX.beet * 0.6 / z : symbolRadius(p, frei);
  if (!ebene('pflanzen')) return;
  getCurrentBeds().forEach(bed => (bed.plants || []).forEach((p, idx) => {
    if (selectedPlantOnCanvas && selectedPlantOnCanvas.bedId === bed.id && selectedPlantOnCanvas.idx === idx) return;
    items.push({ typ: 'pflanze', bed, idx, p, x: bed.x + rotX(p.rx, p.ry, bed.rotation || 0), y: bed.y + rotY(p.rx, p.ry, bed.rotation || 0), r: clusterR(p, false), tr: trefferRadius(p, false) });
  }));
  getCurrentFreiPflanzen().forEach(fp => {
    if (dragFreiPflanze && dragFreiPflanze.item === fp) return;
    items.push({ typ: 'fp', item: fp, p: fp, x: fp.x, y: fp.y, r: clusterR(fp, true), tr: trefferRadius(fp, true) });
  });
  const benutzt = new Array(items.length).fill(false);
  for (let i = 0; i < items.length; i++) {
    if (benutzt[i]) continue;
    benutzt[i] = true;
    const gruppe = [items[i]];
    let weiter = true;
    while (weiter) {
      weiter = false;
      for (let j = 0; j < items.length; j++) {
        if (benutzt[j]) continue;
        const b = items[j];
        if (gruppe.some(a => Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.85)) { gruppe.push(b); benutzt[j] = true; weiter = true; }
      }
    }
    if (gruppe.length < 2) continue;
    const x = gruppe.reduce((s, m) => s + m.x, 0) / gruppe.length, y = gruppe.reduce((s, m) => s + m.y, 0) / gruppe.length;
    symbolBuendel.push({ x, y, items: gruppe });
    gruppe.forEach(m => buendelVersteckt.add(m.p));
  }
}
function zeichneSymbolBuendel() {
  const z = zoomFaktor();
  symbolBuendel.forEach(b => {
    const R = 17 / z;
    const bluehend = bluehMonat ? b.items.find(m => kalTrifft(m.p.name, bluehMonat)) : null;
    if (bluehend) bluehHalo(b.x, b.y, R, bluehend.p.name);
    ctx.save();
    if (bluehMonat && !bluehend) ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,253,248,0.95)'; ctx.fill();
    ctx.setLineDash([3 / z, 2 / z]); ctx.lineWidth = 1.6 / z; ctx.strokeStyle = 'rgba(74,111,90,0.9)'; ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2c2415';
    const syms = [...new Set(b.items.map(m => m.p.sym || '🌱'))];
    if (syms.length === 1) { ctx.font = (19 / z) + 'px ' + EMOJI_FONT; ctx.fillText(syms[0], b.x, b.y); }
    else { ctx.font = (14 / z) + 'px ' + EMOJI_FONT; ctx.fillText(syms[0], b.x - 5 / z, b.y - 4 / z); ctx.fillText(syms[1], b.x + 5 / z, b.y + 5 / z); }
    ctx.restore();
    zaehlerZeichnen('×' + b.items.length, b.x + R * 0.8, b.y - R * 0.8, '#c46b41');
  });
}
function buendelTreffer(x, y) {
  const z = zoomFaktor();
  for (let i = symbolBuendel.length - 1; i >= 0; i--) {
    const b = symbolBuendel[i];
    if (Math.hypot(x - b.x, y - b.y) < 20 / z || b.items.some(m => Math.hypot(x - m.x, y - m.y) < m.tr)) return b;
  }
  return null;
}
function buendelAuswahlZeigen(b) {
  aktuellesBuendel = b;
  document.getElementById('buendelListe').innerHTML = b.items.map((m, i) => {
    const p = m.p, anzahl = istGruppe(p) ? (parseInt(p.anzahl, 10) + '× ') : '';
    const sorte = p.variety || p.sorte;
    const ort = m.typ === 'fp' ? 'Einzelpflanze' : 'in „' + (m.bed.name || 'Beet') + '“';
    return `<button type="button" class="buendel-eintrag" onclick="buendelWaehlen(${i})"><span class="be-sym">${escapeHtml(p.sym || '🌱')}</span><span><b>${escapeHtml(anzahl + (p.name || 'Pflanze'))}</b>${sorte ? ' <span class="be-sorte">' + escapeHtml(sorte) + '</span>' : ''}<br><small>${escapeHtml(ort)}</small></span></button>`;
  }).join('');
  document.getElementById('buendelTitel').textContent = '🔎 ' + b.items.length + ' Pflanzen an dieser Stelle';
  document.getElementById('buendelModal').style.display = 'flex';
}
function buendelSchliessen() { document.getElementById('buendelModal').style.display = 'none'; }
function buendelWaehlen(i) {
  const m = aktuellesBuendel && aktuellesBuendel.items[i];
  buendelSchliessen();
  if (!m) return;
  if (m.typ === 'fp') { openFreiPflanzePanel(m.item); draw(); return; }
  selectedPlantOnCanvas = { bedId: m.bed.id, idx: m.idx };
  openPlantPanel(m.bed, m.idx); draw();
}
function buendelHineinzoomen() {
  const b = aktuellesBuendel; buendelSchliessen();
  if (!b) return;
  gartenZoomSetzen(Math.min(4, gartenZoom * 2.5));
  requestAnimationFrame(() => {
    wrap.scrollLeft = Math.max(0, b.x * gartenZoom - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, b.y * gartenZoom - wrap.clientHeight / 2);
  });
}
// Anzahl/Gruppe in den Pflanzen-Panels (pre = 'pp' für Beetpflanzen, 'fp' für Einzelpflanzen)
function gruppeFelderLesen(p, pre) {
  const n = parseInt(document.getElementById(pre + 'Anzahl').value, 10);
  const d = parseInt(document.getElementById(pre + 'GruppeD').value, 10);
  if (n > 1) { p.anzahl = Math.min(500, n); if (d >= 10) p.gruppenR = Math.round(d / 2); else delete p.gruppenR; }
  else { delete p.anzahl; delete p.gruppenR; }
  gruppeHinweisZeigen(p, pre);
}
function gruppeFelderFuellen(p, pre) {
  document.getElementById(pre + 'Anzahl').value = istGruppe(p) ? p.anzahl : '';
  document.getElementById(pre + 'GruppeD').value = istGruppe(p) && p.gruppenR ? p.gruppenR * 2 : '';
  gruppeHinweisZeigen(p, pre);
}
function gruppeHinweisZeigen(p, pre) {
  const el = document.getElementById(pre + 'GruppeHinweis'), dEl = document.getElementById(pre + 'GruppeD');
  if (!el || !dEl) return;
  const gr = istGruppe(p);
  dEl.disabled = !gr || hatTuffForm(p);
  const kn = document.getElementById(pre + 'TuffKnoepfe');
  if (kn) { kn.style.display = gr ? 'flex' : 'none'; kn.querySelector('.tuff-rund').style.display = hatTuffForm(p) ? '' : 'none'; }
  dEl.placeholder = gr ? String(Math.round(gruppenRadius(Object.assign({}, p, { gruppenR: 0 })) * 2)) : '–';
  const abstand = pflanzAbstandCm(p.name);
  el.textContent = gr
    ? `Wird als Tuff mit ${p.anzahl} Pflanzen gezeichnet` + (hatTuffForm(p) ? ' – in deiner gezeichneten Form.' : p.gruppenR ? '.' : (abstand ? ` – Fläche automatisch aus dem Pflanzabstand (${abstand} cm). Für Bänder oder Streifen: „Form zeichnen“.` : '.'))
    : (istZwiebelPflanze(p.name) ? '🌷 Zwiebeln setzt man meist in Gruppen – z. B. 15 eintragen, dann wird daraus ein Tuff.' : 'Mehrere gleiche Pflanzen an einer Stelle? Anzahl eintragen – dann wird daraus eine Gruppe.');
}
// ==================== EBENEN (pro Gerät) ====================
const EBENEN = [
  ['hintergrund', '🗺️', 'Luftbild / Hintergrund'], ['strukturen', '🏠', 'Strukturen (Haus, Wege, Zaun …)'], ['beete', '🟫', 'Beete'],
  ['pflanzen', '🌱', 'Pflanzen'], ['kronen', '🌳', 'Kronenkreise der Bäume'], ['beschriftung', '🏷️', 'Beschriftungen'],
  ['tiere', '🐾', 'Tiere & Nistplätze'], ['notizen', '📝', 'Notizen & Erinnerungen'], ['fruchtfolge', '🔄', 'Fruchtfolge-Ampel an den Beeten'],
  ['giftig', '⚠️', 'Giftig für Kinder markieren'],
];
const EBENEN_STANDARD_AUS = ['giftig']; // diese Ebenen sind erst nach dem Einschalten sichtbar
let ebenenAus = {};
try { ebenenAus = JSON.parse(localStorage.getItem('garten_ebenen') || '{}') || {}; } catch (e) { ebenenAus = {}; }
function ebene(k) { return EBENEN_STANDARD_AUS.includes(k) ? ebenenAus[k] === false : !ebenenAus[k]; }
function bettSichtbar(bed) { return ebene(bed.kind === 'struktur' ? 'strukturen' : 'beete'); }
function ebeneUmschalten(k, an) {
  if (EBENEN_STANDARD_AUS.includes(k)) { if (an) ebenenAus[k] = false; else delete ebenenAus[k]; }
  else if (an) delete ebenenAus[k]; else ebenenAus[k] = true;
  try { localStorage.setItem('garten_ebenen', JSON.stringify(ebenenAus)); } catch (e) {}
  ebenenMenuRendern(); draw();
}
function ebenenMenuRendern() {
  const m = document.getElementById('ebenenMenu');
  if (m) m.querySelector('.em-liste').innerHTML = EBENEN.map(([k, ic, txt]) =>
    `<label class="em-zeile"><input type="checkbox" ${ebene(k) ? 'checked' : ''} onchange="ebeneUmschalten('${k}', this.checked)"><span>${ic}</span><span>${txt}</span></label>`).join('');
  const btn = document.getElementById('ebenenBtn');
  if (btn) btn.classList.toggle('widget-hinweis', Object.values(ebenenAus).some(v => v === true));
}
function ebenenMenuUmschalten(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('ebenenMenu'), w = document.getElementById('gartenZoomWidget');
  if (m.style.display === 'block') { m.style.display = 'none'; return; }
  ebenenMenuRendern();
  const r = w.getBoundingClientRect();
  m.style.left = Math.round(r.right + 8) + 'px';
  m.style.top = Math.round(r.top) + 'px';
  m.style.display = 'block';
}
document.addEventListener('click', e => {
  const m = document.getElementById('ebenenMenu');
  if (m && m.style.display === 'block' && !m.contains(e.target) && e.target.id !== 'ebenenBtn') m.style.display = 'none';
});
function ebenenAlleAn() { ebenenAus = {}; EBENEN_STANDARD_AUS.forEach(k => { ebenenAus[k] = false; }); try { localStorage.setItem('garten_ebenen', JSON.stringify(ebenenAus)); } catch (e) {} ebenenMenuRendern(); draw(); }

// Trifft (x, y) diese Pflanze? Berücksichtigt Ebenen, Gruppengröße und eigene Tuff-Formen.
function pflanzeTrifft(p, bed, x, y) {
  if (!ebene('pflanzen')) return false;
  const rot = bed ? (bed.rotation || 0) : 0;
  const cx = bed ? bed.x + rotX(p.rx, p.ry, rot) : p.x, cy = bed ? bed.y + rotY(p.rx, p.ry, rot) : p.y;
  const dx = x - cx, dy = y - cy;
  if (istGruppe(p) && hatTuffForm(p)) {
    const a = -rot * Math.PI / 180;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return punktInPolygon(lx, ly, p.form) || Math.hypot(dx, dy) < 10 / zoomFaktor();
  }
  return Math.hypot(dx, dy) < trefferRadius(p, !bed);
}
function punktInPolygon(x, y, pts) {
  let drin = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

// ==================== TUFFS IN FREIER FORM ====================
function hatTuffForm(p) { return !!(p && Array.isArray(p.form) && p.form.length >= 3); }
const tuffStreuCache = new Map();
function tuffStreuPunkte(form, n) {
  const key = n + '|' + form.map(q => Math.round(q.x) + ',' + Math.round(q.y)).join(';');
  if (tuffStreuCache.has(key)) return tuffStreuCache.get(key);
  let flaeche = 0;
  for (let i = 0, j = form.length - 1; i < form.length; j = i++) flaeche += (form[j].x + form[i].x) * (form[j].y - form[i].y);
  flaeche = Math.abs(flaeche / 2) || 1;
  const xs = form.map(q => q.x), ys = form.map(q => q.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  let d = Math.sqrt(flaeche / n) * 1.05, pts = [];
  for (let versuch = 0; versuch < 8; versuch++) {
    pts = [];
    const dy = d * 0.866;
    for (let row = 0, y = minY + dy / 2; y < maxY; y += dy, row++)
      for (let x = minX + (row % 2 ? d : d / 2); x < maxX; x += d)
        if (punktInPolygon(x, y, form)) pts.push({ x, y });
    if (pts.length >= n || pts.length > 400) break;
    d *= 0.9;
  }
  if (!pts.length) pts = [{ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }];
  let erg = pts;
  if (pts.length > n) { const schritt = pts.length / n; erg = []; for (let i = 0; i < n; i++) erg.push(pts[Math.floor(i * schritt)]); }
  if (tuffStreuCache.size > 200) tuffStreuCache.clear();
  tuffStreuCache.set(key, erg);
  return erg;
}
let tuffFormZiel = null, tuffFormPunkte = [];
function tuffFormStarten(typ) {
  let ziel = null;
  if (typ === 'pp') {
    const ab = activePlantBedId, bed = ab && getCurrentBeds().find(b => b.id === ab.bedId), p = bed && bed.plants[ab.idx];
    if (p) ziel = { bed, p };
  } else {
    const fp = getCurrentFreiPflanzen().find(f => f.id === activeFreiPflanzeId);
    if (fp) ziel = { bed: null, p: fp };
  }
  if (!ziel) return;
  if (!istGruppe(ziel.p)) { showTempStatus('Erst bei „Anzahl“ mindestens 2 eintragen – dann ist es ein Tuff.', 4); return; }
  tuffFormZiel = ziel; tuffFormPunkte = [];
  if (typ === 'pp') closePlantPanel(); else fpSchliessen();
  setMode('tuffform');
}
function tuffFormPunktZurueck() { tuffFormPunkte.pop(); tuffFormHinweis(); draw(); }
function tuffFormFertig() {
  const z = tuffFormZiel;
  if (!z || tuffFormPunkte.length < 3) { showTempStatus('Mindestens 3 Punkte antippen.', 3); return; }
  pushUndo();
  let pts;
  if (z.bed) {
    const a = -(z.bed.rotation || 0) * Math.PI / 180;
    pts = tuffFormPunkte.map(q => { const dx = q.x - z.bed.x, dy = q.y - z.bed.y; return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) }; });
  } else pts = tuffFormPunkte.map(q => ({ x: q.x, y: q.y }));
  const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length, cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
  if (z.bed) { z.p.rx = Math.round(cx); z.p.ry = Math.round(cy); } else { z.p.x = Math.round(cx); z.p.y = Math.round(cy); }
  z.p.form = pts.map(q => ({ x: Math.round(q.x - cx), y: Math.round(q.y - cy) }));
  delete z.p.gruppenR;
  tuffFormZiel = null; tuffFormPunkte = [];
  saveData();
  setMode('select');
  showTempStatus('🌷 Form gespeichert – der Tuff füllt jetzt die gezeichnete Fläche.', 4);
}
function tuffFormAbbrechen() { tuffFormZiel = null; tuffFormPunkte = []; setMode('select'); }
function tuffFormRund(typ) {
  const p = typ === 'pp'
    ? (activePlantBedId && (getCurrentBeds().find(b => b.id === activePlantBedId.bedId) || {}).plants?.[activePlantBedId.idx])
    : getCurrentFreiPflanzen().find(f => f.id === activeFreiPflanzeId);
  if (!p) return;
  pushUndo(); delete p.form; saveData(); draw(); gruppeHinweisZeigen(p, typ);
}
function tuffFormHinweis() {
  const el = document.getElementById('zeichenHinweis');
  const t = el && el.querySelector('.zh-text');
  if (t && mode === 'tuffform') t.textContent = tuffFormPunkte.length < 3
    ? `🌷 Eckpunkte der Fläche antippen (${tuffFormPunkte.length}/3+)`
    : `🌷 ${tuffFormPunkte.length} Punkte – weiter antippen oder „Fertig“`;
}
function zeichneTuffFormVorschau() {
  if (mode !== 'tuffform' || !tuffFormPunkte.length) return;
  const z = zoomFaktor();
  ctx.save();
  ctx.beginPath(); tuffFormPunkte.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
  if (tuffFormPunkte.length > 2) { ctx.closePath(); ctx.fillStyle = 'rgba(232,80,138,0.18)'; ctx.fill(); }
  ctx.setLineDash([6 / z, 4 / z]); ctx.lineWidth = 2 / z; ctx.strokeStyle = '#c0397a'; ctx.stroke(); ctx.setLineDash([]);
  tuffFormPunkte.forEach(q => { ctx.beginPath(); ctx.arc(q.x, q.y, 5 / z, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2 / z; ctx.strokeStyle = '#c0397a'; ctx.stroke(); });
  ctx.restore();
}

// ==================== GLEICHE PFLANZEN ZU TUFFS ZUSAMMENFASSEN ====================
function tuffKandidaten(bed) {
  const pl = (bed && bed.plants) || [], benutzt = new Set(), gruppen = [];
  const schluessel = p => (p.name || '').trim() + '|' + (p.variety || '').trim();
  for (let i = 0; i < pl.length; i++) {
    if (benutzt.has(i)) continue;
    benutzt.add(i);
    const g = [i], s = pflanzAbstandCm(pl[i].name) || 20;
    let weiter = true;
    while (weiter) {
      weiter = false;
      for (let j = 0; j < pl.length; j++) {
        if (benutzt.has(j) || schluessel(pl[j]) !== schluessel(pl[i])) continue;
        const nah = g.some(k => {
          const a = pl[k], b = pl[j];
          const extra = (istGruppe(a) ? gruppenRadius(a) : 0) + (istGruppe(b) ? gruppenRadius(b) : 0);
          return Math.hypot(a.rx - b.rx, a.ry - b.ry) <= Math.max(s * 2.5, 25) + extra;
        });
        if (nah) { g.push(j); benutzt.add(j); weiter = true; }
      }
    }
    if (g.length > 1) gruppen.push(g);
  }
  return gruppen;
}
function tuffsZusammenfassen(bed) {
  if (!bed) return;
  const gruppen = tuffKandidaten(bed);
  if (!gruppen.length) { showTempStatus('Keine eng stehenden gleichen Pflanzen gefunden.', 3); return; }
  pushUndo();
  const pl = bed.plants, weg = new Set(), neu = [];
  let einzel = 0;
  gruppen.forEach(g => {
    const glieder = g.map(i => pl[i]), anzahl = glieder.reduce((s, p) => s + (parseInt(p.anzahl, 10) || 1), 0);
    const cx = glieder.reduce((s, p) => s + p.rx * (parseInt(p.anzahl, 10) || 1), 0) / anzahl;
    const cy = glieder.reduce((s, p) => s + p.ry * (parseInt(p.anzahl, 10) || 1), 0) / anzahl;
    const s = pflanzAbstandCm(glieder[0].name) || 20;
    const ausdehnung = Math.max(...glieder.map(p => Math.hypot(p.rx - cx, p.ry - cy) + (istGruppe(p) ? gruppenRadius(p) : s / 2)));
    const basis = Object.assign({}, glieder[0], { rx: Math.round(cx), ry: Math.round(cy), anzahl });
    delete basis.form; delete basis.gruppenR;
    const auto = gruppenRadius(basis);
    if (ausdehnung > auto * 1.1) basis.gruppenR = Math.round(ausdehnung);
    const notizen = [...new Set(glieder.map(p => (p.notes || '').trim()).filter(Boolean))];
    if (notizen.length) basis.notes = notizen.join('\n');
    const ernten = glieder.flatMap(p => p.harvests || []);
    if (ernten.length) basis.harvests = ernten;
    g.forEach(i => weg.add(i));
    einzel += g.length;
    neu.push(basis);
  });
  bed.plants = pl.filter((_, i) => !weg.has(i)).concat(neu);
  selectedPlantOnCanvas = null;
  saveData(); draw(); updateStatus();
  renderBedPlantList(bed, document.getElementById('bedPlantSearch')?.value || '');
  zeigeLoeschToast(`🌷 ${einzel} Pflanzen zu ${neu.length} ${neu.length === 1 ? 'Tuff' : 'Tuffs'} zusammengefasst`, () => { undo(); }, 6);
}

// ==================== MASSBAND ====================
let messPunkte = [], messMaus = null, messStart = null;
function messenUmschalten() { setMode(mode === 'messen' ? 'select' : 'messen'); }
function messText(cm) { return cm < 100 ? Math.round(cm) + ' cm' : (cm / 100).toFixed(2).replace('.', ',') + ' m'; }
function messHinweis() {
  const el = document.getElementById('zeichenHinweis'), t = el && el.querySelector('.zh-text');
  if (!t || mode !== 'messen') return;
  if (messPunkte.length === 2) t.textContent = '📏 Abstand: ' + messText(Math.hypot(messPunkte[1].x - messPunkte[0].x, messPunkte[1].y - messPunkte[0].y)) + ' – neu antippen für die nächste Messung';
  else t.textContent = messPunkte.length ? '📏 Jetzt den zweiten Punkt antippen' : '📏 Zwei Punkte antippen – der Abstand wird angezeigt';
}
function messTipp(x, y) {
  if (messPunkte.length >= 2) messPunkte = [];
  messPunkte.push({ x, y });
  messHinweis(); draw();
}
function zeichneMessung() {
  if (mode !== 'messen' || !messPunkte.length) return;
  const z = zoomFaktor(), a = messPunkte[0], b = messPunkte[1] || messMaus;
  ctx.save();
  if (b) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineWidth = 5 / z; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
    ctx.setLineDash([8 / z, 5 / z]); ctx.lineWidth = 2.4 / z; ctx.strokeStyle = '#c0392b'; ctx.stroke(); ctx.setLineDash([]);
  }
  [a, messPunkte[1]].filter(Boolean).forEach(q => {
    ctx.beginPath(); ctx.arc(q.x, q.y, 6 / z, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 2.4 / z; ctx.strokeStyle = '#c0392b'; ctx.stroke();
  });
  if (b) {
    const txt = messText(Math.hypot(b.x - a.x, b.y - a.y)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.font = '700 ' + (13 / z) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 14 / z, h = 22 / z;
    ctx.fillStyle = 'rgba(42,32,22,0.92)'; ctx.beginPath(); ctx.roundRect(mx - w / 2, my - h / 2 - 14 / z, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, mx, my - 14 / z + 0.5 / z);
  }
  ctx.restore();
}

// ==================== ZWEI-FINGER-ZOOM & STRG+MAUSRAD ====================
let pinch = null;
function zoomUmPunkt(neuerZoom, clientX, clientY, wx, wy) {
  const wr = wrap.getBoundingClientRect();
  gartenZoomSetzen(neuerZoom);
  const cr = canvas.getBoundingClientRect();
  const offL = cr.left - wr.left + wrap.scrollLeft, offT = cr.top - wr.top + wrap.scrollTop;
  wrap.scrollLeft = offL + wx * gartenZoom - (clientX - wr.left);
  wrap.scrollTop = offT + wy * gartenZoom - (clientY - wr.top);
}
function pinchDaten(e) {
  const [a, b] = e.touches;
  return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2 };
}
wrap.addEventListener('touchstart', e => {
  if (e.touches.length < 2) return;
  e.preventDefault(); e.stopPropagation();
  if (!pinch) {
    // eine laufende Ein-Finger-Aktion (Verschieben, Tipp) sauber beenden
    festTipp = null;
    if (touchAktionAktiv) { try { onUp(e); } catch (err) {} touchAktionAktiv = false; }
    hidePlantTooltip();
  }
  const d = pinchDaten(e), cr = canvas.getBoundingClientRect();
  pinch = { d0: Math.max(10, d.d), z0: gartenZoom, wx: (d.mx - cr.left) / gartenZoom, wy: (d.my - cr.top) / gartenZoom };
}, { passive: false, capture: true });
wrap.addEventListener('touchmove', e => {
  if (!pinch) return;
  e.preventDefault(); e.stopPropagation();
  if (e.touches.length < 2) return;
  const d = pinchDaten(e);
  zoomUmPunkt(pinch.z0 * d.d / pinch.d0, d.mx, d.my, pinch.wx, pinch.wy);
}, { passive: false, capture: true });
['touchend', 'touchcancel'].forEach(typ => wrap.addEventListener(typ, e => {
  if (!pinch) return;
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  if (e.touches.length === 0) pinch = null;
}, { passive: false, capture: true }));
wrap.addEventListener('wheel', e => {
  if (!e.ctrlKey) return; // Trackpad-Pinch bzw. Strg+Mausrad
  e.preventDefault();
  const cr = canvas.getBoundingClientRect();
  zoomUmPunkt(gartenZoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY, (e.clientX - cr.left) / gartenZoom, (e.clientY - cr.top) / gartenZoom);
}, { passive: false });

// ==================== BLÜH-ZEITLEISTE ====================
let bluehMonat = null;
const BLUEH_MONATE = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const BLUEH_MONATE_LANG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
function bluehtIm(name, m) {
  const b = typeof BLUETEZEIT !== 'undefined' && BLUETEZEIT[(name || '').trim()];
  if (!b) return false;
  return b[0] <= b[1] ? (m >= b[0] && m <= b[1]) : (m >= b[0] || m <= b[1]);
}
function bluehFarbe(name) {
  if (kalArt === 'ernte') return '#f08c28';
  const n = (name || '').trim(), si = typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[n];
  const f = (si && si.farbe) || (typeof BLUEH_FARBEN !== 'undefined' && BLUEH_FARBEN[n]) || '#e86aa0';
  return /^#[0-9a-f]{6}$/i.test(f) ? f : '#e86aa0';
}
// null = Zeitleiste aus; true/false = blüht im gewählten Monat
function bluehStatus(name) { return bluehMonat ? kalTrifft(name, bluehMonat) : null; }
function bluehHalo(cx, cy, r, name) {
  const z = zoomFaktor(), R = Math.max(r * 1.7, 16 / z), f = bluehFarbe(name);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  const weiss = f.toLowerCase() === '#ffffff';
  g.addColorStop(0, (weiss ? '#fff8d0' : f) + 'ee'); g.addColorStop(0.55, (weiss ? '#fff3b0' : f) + '88'); g.addColorStop(1, f + '00');
  ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  if (weiss) { ctx.lineWidth = 1.5 / z; ctx.strokeStyle = 'rgba(200,160,40,0.7)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function gartenPflanzenListe() {
  const liste = [];
  getCurrentBeds().forEach(b => (b.plants || []).forEach(p => liste.push(p)));
  getCurrentFreiPflanzen().forEach(fp => liste.push(fp));
  return liste;
}
function bluehUmschalten() {
  if (bluehMonat) { bluehModusAus(); return; }
  if (zeitreiseJahre !== null) zeitreiseAus();
  if (mode === 'giessen') setMode('select');
  bluehMonat = new Date().getMonth() + 1;
  if (kalArt === 'blueh' && (bluehMonat < 2 || bluehMonat > 10)) bluehMonat = 3; // im Winter mit dem Frühling starten
  document.getElementById('bluehLeiste').style.display = 'block';
  document.getElementById('bluehBtn')?.classList.add('widget-aktiv');
  bluehLeisteRendern(); positioniereZoomWidget(); draw();
}
function bluehModusAus() {
  bluehMonat = null;
  document.getElementById('bluehLeiste').style.display = 'none';
  document.getElementById('bluehBtn')?.classList.remove('widget-aktiv');
  draw();
}
function bluehMonatSetzen(m) { bluehMonat = m; bluehLeisteRendern(); draw(); }
function bluehLeisteRendern() {
  const pflanzen = gartenPflanzenListe();
  const stueck = p => parseInt(p.anzahl, 10) || 1;
  const ernte = kalArt === 'ernte', wort = ernte ? 'erntereife' : 'blühende';
  const proMonat = BLUEH_MONATE.map((_, i) => pflanzen.filter(p => kalTrifft(p.name, i + 1)).reduce((s, p) => s + stueck(p), 0));
  const max = Math.max(1, ...proMonat);
  document.getElementById('bluehMonate').innerHTML = BLUEH_MONATE.map((k, i) => {
    const n = proMonat[i], leer = !n && (ernte ? i >= 5 && i <= 9 : i >= 1 && i <= 9);
    return `<button type="button" class="bl-m${bluehMonat === i + 1 ? ' aktiv' : ''}${leer ? ' leer' : ''}" onclick="bluehMonatSetzen(${i + 1})" title="${BLUEH_MONATE_LANG[i]}: ${n} ${wort} Pflanzen"><span class="bl-saeule"><span class="bl-balken" style="height:${Math.round(n / max * 100)}%"></span></span><span class="bl-k">${k}</span></button>`;
  }).join('');
  document.getElementById('bluehMonatName').textContent = BLUEH_MONATE_LANG[bluehMonat - 1];
  document.getElementById('bluehLeiste').classList.toggle('ernte', ernte);
  document.getElementById('kalArtBlueh').classList.toggle('an', !ernte);
  document.getElementById('kalArtErnte').classList.toggle('an', ernte);
  const bluehend = {};
  pflanzen.filter(p => kalTrifft(p.name, bluehMonat)).forEach(p => { const n = (p.name || '').trim(); bluehend[n] = (bluehend[n] || 0) + stueck(p); });
  const namen = Object.keys(bluehend);
  let html = namen.length
    ? (ernte ? '<b>Erntereif:</b> ' : '<b>Blüht:</b> ') + namen.map(n => escapeHtml(n) + (bluehend[n] > 1 ? ' <span class="bl-n">×' + bluehend[n] + '</span>' : '')).join(', ')
    : (ernte ? '<b>In diesem Monat gibt es nichts zu ernten.</b>' : '<b>Hier blüht noch nichts.</b>');
  if (!ernte && namen.length < 2 && bluehMonat >= 2 && bluehMonat <= 10 && typeof STAUDEN !== 'undefined') {
    const vorhanden = new Set(pflanzen.map(p => (p.name || '').trim()));
    const ideen = STAUDEN.filter(s => s.heimisch && bluehtIm(s.name, bluehMonat) && !vorhanden.has(s.name)).slice(0, 4).map(s => s.sym + ' ' + s.name);
    if (ideen.length) html += '<br><span class="bl-idee">💡 Lücke für Bienen & Hummeln – passt z. B.: ' + escapeHtml(ideen.join(', ')) + '</span>';
  }
  document.getElementById('bluehText').innerHTML = html;
}
function bluehLeistePositionieren() { ['bluehLeiste', 'zeitLeiste'].forEach(leistePositionieren); }
function leistePositionieren(id) {
  const el = document.getElementById(id);
  if (!el || el.style.display === 'none') return;
  const sichtbar = document.getElementById('view-garden')?.classList.contains('active');
  if (!sichtbar) { el.style.visibility = 'hidden'; return; }
  const r = wrap.getBoundingClientRect();
  el.style.visibility = 'visible';
  el.style.left = Math.round(r.left + 8) + 'px';
  el.style.width = Math.round(Math.min(560, r.width - 16)) + 'px';
  el.style.top = 'auto';
  el.style.bottom = Math.round(window.innerHeight - r.bottom + 10) + 'px';
}

// Hinweis- und Steuerleisten unten über der Karte: fest am Bildschirm statt in der scrollenden Karte,
// sonst wandern sie beim Verschieben des gezoomten Gartens aus dem Bild.
function kartenLeistenPositionieren() {
  const r = wrap.getBoundingClientRect();
  ['zeichenHinweis', 'freehandControls', 'plantModeControls'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // feste Breite um die Mitte, damit die Leiste am Rand nicht zusammengequetscht wird
    const breite = Math.min(r.width - 16, 520);
    el.style.position = 'fixed';
    el.style.transform = 'none';
    el.style.left = Math.round(r.left + (r.width - breite) / 2) + 'px';
    el.style.width = Math.round(breite) + 'px';
    el.style.maxWidth = 'none';
    el.style.boxSizing = 'border-box';
    el.style.justifyContent = 'center';
    el.style.bottom = Math.round(window.innerHeight - r.bottom + 14) + 'px';
  });
}
// ==================== ZÄHLER ====================
function pflanzenZaehlen() {
  let stueck = 0, zwiebeln = 0;
  gartenPflanzenListe().forEach(p => { const n = parseInt(p.anzahl, 10) || 1; stueck += n; if (istZwiebelPflanze(p.name)) zwiebeln += n; });
  return { stueck, zwiebeln };
}

// ==================== KALENDER-ART: BLÜTE ODER ERNTE ====================
let kalArt = 'blueh';
const kalSchluesselCache = new Map();
function erntetIm(name, m) {
  const n = (name || '').trim();
  if (!n || typeof HARVEST_WINDOW === 'undefined') return false;
  if (!kalSchluesselCache.has(n)) kalSchluesselCache.set(n, pflanzenSchluesselFinden(n, HARVEST_WINDOW));
  const k = kalSchluesselCache.get(n);
  return k ? isInHarvestWindow(HARVEST_WINDOW[k], m) : false;
}
function kalTrifft(name, m) { return kalArt === 'ernte' ? erntetIm(name, m) : bluehtIm(name, m); }
function kalArtSetzen(art) {
  kalArt = art;
  if (art === 'ernte' && bluehMonat) bluehMonat = new Date().getMonth() + 1;
  bluehLeisteRendern(); draw();
}

// ==================== KINDERSICHER: GIFTIGE PFLANZEN ====================
// stufe 2 = sehr giftig, 1 = giftig/reizend. Bewusst vorsichtig formuliert – Richtwerte, keine Vollständigkeit.
const GIFTIG_KINDER = [
  [/eibe|taxus/, 2, 'Fast alle Teile sehr giftig, auch die Samen im roten Fruchtfleisch'],
  [/goldregen/, 2, 'Samen und Hülsen sehr giftig – sehen aus wie Erbsenschoten'],
  [/eisenhut/, 2, 'Eine der giftigsten heimischen Pflanzen – schon Hautkontakt kann reizen'],
  [/fingerhut|digitalis/, 2, 'Alle Teile sehr giftig (Herzgift)'],
  [/herbstzeitlose/, 2, 'Alle Teile sehr giftig'],
  [/seidelbast/, 2, 'Rote Beeren sehr giftig'],
  [/oleander/, 2, 'Alle Teile sehr giftig'],
  [/engelstrompete|brugmansia|stechapfel|tollkirsche/, 2, 'Alle Teile sehr giftig'],
  [/rizinus|wunderbaum/, 2, 'Samen sehr giftig'],
  [/maiglöckchen/, 2, 'Alle Teile giftig, besonders die roten Beeren'],
  [/pfaffenhütchen|euonymus/, 2, 'Bunte Früchte sehr giftig'],
  [/thuja|lebensbaum/, 2, 'Zweige und Zapfen giftig'],
  [/aronstab/, 2, 'Rote Beeren giftig, Saft reizt'],
  [/riesen-?bärenklau|herkulesstaude/, 2, 'Saft + Sonne = schwere Hautverbrennungen'],
  [/kirschlorbeer/, 1, 'Blätter und Kerne giftig'],
  [/liguster/, 1, 'Schwarze Beeren giftig'],
  [/efeu/, 1, 'Beeren und Blätter giftig'],
  [/buchs/, 1, 'Alle Teile giftig'],
  [/rhododendron|azalee/, 1, 'Blätter und Blüten giftig'],
  [/stechpalme|ilex/, 1, 'Rote Beeren giftig'],
  [/blauregen|wisteria/, 1, 'Samen und Hülsen giftig'],
  [/lupine/, 1, 'Samen giftig (Zierlupinen)'],
  [/akelei/, 1, 'Alle Teile giftig'],
  [/rittersporn/, 1, 'Alle Teile giftig'],
  [/christrose|nieswurz|helleborus|lenzrose/, 1, 'Alle Teile giftig'],
  [/schwertlilie|iris/, 1, 'Wurzelstock und Samen giftig'],
  [/narzisse|osterglocke/, 1, 'Zwiebeln und Blätter giftig – Zwiebeln nicht mit Küchenzwiebeln verwechseln'],
  [/hyazinthe/, 1, 'Zwiebeln giftig, Saft reizt die Haut'],
  [/tulpe/, 1, 'Zwiebeln leicht giftig, Saft kann die Haut reizen'],
  [/schneeglöckchen|märzenbecher|kaiserkrone/, 1, 'Zwiebeln giftig'],
  [/wolfsmilch|euphorbia/, 1, 'Milchsaft reizt Haut und Augen'],
  [/tränendes herz/, 1, 'Alle Teile giftig'],
  [/pfingstrose/, 1, 'Leicht giftig, vor allem Samen'],
  [/hortensie/, 1, 'Leicht giftig'],
  [/schneebeere|knallerbse/, 1, 'Weiße Beeren leicht giftig'],
  [/waldrebe|clematis|anemone|windröschen|küchenschelle|trollblume|hahnenfuß|sumpfdotter/, 1, 'Saft reizt Haut und Schleimhäute'],
  [/^(busch|stangen|feuer|dicke |puff)?bohnen?$|^bohnen$/, 1, 'Rohe Bohnen und Samen giftig – nur gekocht essen'],
  [/kartoffel/, 1, 'Grüne Knollen, Keime, Blätter und Beeren giftig'],
  [/^tomate|^tomatillo/, 1, 'Blätter und unreife grüne Früchte leicht giftig'],
  [/aubergine/, 1, 'Blätter und rohe unreife Früchte leicht giftig'],
  [/physalis|andenbeere/, 1, 'Nur reife Früchte essbar, Blätter und grüne Beeren giftig'],
  [/holunder/, 1, 'Rohe, unreife Beeren und Blätter giftig – nur gekocht essen'],
  [/eberesche|vogelbeere/, 1, 'Rohe Beeren in größeren Mengen unverträglich'],
];
const giftCache = new Map();
function giftInfo(name) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return null;
  if (giftCache.has(n)) return giftCache.get(n);
  const t = GIFTIG_KINDER.find(([re]) => re.test(n));
  const info = t ? { stufe: t[1], text: t[2] } : null;
  giftCache.set(n, info);
  return info;
}
function giftHinweisHtml(name) {
  const g = giftInfo(name);
  if (!g) return '';
  return `<div class="gift-hinweis${g.stufe === 2 ? ' stark' : ''}">⚠️ <b>${g.stufe === 2 ? 'Sehr giftig' : 'Giftig'} für Kinder:</b> ${escapeHtml(g.text)}</div>`;
}
// Positionen aller sichtbaren Pflanzen in Garten-Koordinaten
function pflanzenPositionen() {
  const out = [];
  if (!ebene('pflanzen')) return out;
  getCurrentBeds().forEach(bed => {
    if (!bettSichtbar(bed)) return;
    const rot = bed.rotation || 0;
    (bed.plants || []).forEach((p, idx) => out.push({ p, bed, idx, x: bed.x + rotX(p.rx, p.ry, rot), y: bed.y + rotY(p.rx, p.ry, rot), r: symbolRadius(p, false) }));
  });
  getCurrentFreiPflanzen().forEach(fp => out.push({ p: fp, bed: null, x: fp.x, y: fp.y, r: symbolRadius(fp, true) }));
  return out;
}
function zeichneGiftMarker() {
  if (!ebene('giftig')) return;
  const z = zoomFaktor();
  ctx.save();
  pflanzenPositionen().forEach(e => {
    const g = giftInfo(e.p.name);
    if (!g) return;
    const r = Math.min(e.r, 80) + 3 / z;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    if (g.stufe === 1) ctx.setLineDash([5 / z, 4 / z]);
    ctx.lineWidth = (g.stufe === 2 ? 3 : 2) / z; ctx.strokeStyle = g.stufe === 2 ? '#c0392b' : '#e67e22'; ctx.stroke(); ctx.setLineDash([]);
    const bx = e.x + r * 0.72, by = e.y - r * 0.72, br = 8 / z;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = g.stufe === 2 ? '#c0392b' : '#e67e22'; ctx.fill();
    ctx.font = (10 / z) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText('!', bx, by + 0.5 / z);
  });
  ctx.restore();
}

// ==================== KRONEN: WACHSTUM & ZEITREISE ====================
let zeitreiseJahre = null; // null = aus, sonst 0…20
function istBaumartig(fp, info) {
  return info.quelle === 'saeule' || (info.d || 0) >= 300 || ['🌳', '🌲', '🌴'].includes(fp.sym) || /baum|walnuss|linde|eiche|buche|ahorn|birke/i.test(fp.name || '');
}
// Liefert die Kronen-Durchmesser (wie gezeichnet): jetzt bzw. in „plus“ Jahren, und ausgewachsen.
function kronenWachstum(fp, plus) {
  const info = kronenDurchmesser(fp);
  if (!info.zeigen) return null;
  const auto = info.eigen ? kronenDurchmesser(Object.assign({}, fp, { kroneD: 0 })) : info;
  const autoEnd = auto.zeigen ? auto.d * 0.85 : 0;
  const end = info.eigen ? Math.max(info.d, autoEnd) : info.d * 0.85;
  const J = info.quelle === 'saeule' || auto.quelle === 'saeule' ? 5 : end >= 600 ? 15 : end >= 300 ? 10 : 5;
  const f = a => Math.min(1, 0.2 + 0.8 * Math.max(0, a) / J);
  let alter = null;
  if (fp.datum) { const d = new Date(fp.datum + 'T00:00:00'); if (!isNaN(d.getTime())) alter = Math.max(0, (Date.now() - d.getTime()) / (365.25 * 86400000)); }
  let jetzt, rest;
  if (info.eigen) {
    jetzt = info.d;
    const a0 = alter != null ? alter : J * Math.max(0, (jetzt / end - 0.2) / 0.8);
    rest = Math.max(2, J - a0);
  } else if (alter == null) { jetzt = end; rest = 1; }
  else { jetzt = end * f(alter); rest = Math.max(1, J - alter); }
  const t = plus || 0;
  const d = jetzt >= end ? jetzt : jetzt + (end - jetzt) * Math.min(1, t / rest);
  return { d, jetzt, end, wachsend: jetzt < end * 0.95, ohneDatum: alter == null && !info.eigen, info };
}
function zeitreiseUmschalten() {
  if (zeitreiseJahre !== null) { zeitreiseAus(); return; }
  if (bluehMonat) bluehModusAus();
  zeitreiseJahre = 5;
  document.getElementById('zeitLeiste').style.display = 'block';
  document.getElementById('zeitBtn')?.classList.add('widget-aktiv');
  document.getElementById('zeitRegler').value = 5;
  zeitLeisteRendern(); positioniereZoomWidget(); draw();
}
function zeitreiseAus() {
  zeitreiseJahre = null;
  document.getElementById('zeitLeiste').style.display = 'none';
  document.getElementById('zeitBtn')?.classList.remove('widget-aktiv');
  draw();
}
function zeitreiseSetzen(j) { zeitreiseJahre = j; zeitLeisteRendern(); draw(); }
function zeitLeisteRendern() {
  const j = zeitreiseJahre || 0, jahr = new Date().getFullYear() + j;
  document.getElementById('zeitName').textContent = j === 0 ? 'Heute' : `in ${j} Jahr${j > 1 ? 'en' : ''} (${jahr})`;
  const zeilen = [], ohne = [], konflikte = [];
  getCurrentFreiPflanzen().forEach(fp => {
    const w = kronenWachstum(fp, j);
    if (!w || istGruppe(fp)) return;
    if (w.ohneDatum) ohne.push(fp.name || 'Baum');
    else if (w.wachsend) zeilen.push(`${fp.sym || '🌳'} ${escapeHtml(fp.name || 'Baum')}: ${messText(w.jetzt)} → <b>${messText(w.d)}</b>`);
    kronenKonflikte(fp, j).forEach(k => konflikte.push(`${fp.sym || '🌳'} ${escapeHtml(k.text)}`));
  });
  let html = zeilen.length ? zeilen.join(' · ') : (ohne.length ? '' : 'Keine wachsenden Bäume gefunden.');
  if (konflikte.length) html += `<br><span class="zeit-warn">⚠️ ${[...new Set(konflikte)].slice(0, 3).join('<br>⚠️ ')}</span>`;
  if (ohne.length) html += `<br><span class="bl-n">${ohne.length} × ohne Pflanzdatum (${escapeHtml([...new Set(ohne)].slice(0, 3).join(', '))}) – wird ausgewachsen gezeigt. Datum im Pflanzen-Info eintragen.</span>`;
  document.getElementById('zeitText').innerHTML = html;
}

// ==================== ABSTANDS-WARNUNG ====================
// Richtwerte innerorts nach dem Nachbarrechtsgesetz Baden-Württemberg (vereinfacht).
function grenzRichtwert(fp, info, end) {
  if (info.quelle === 'saeule' || end <= 300) return 100;
  if (end <= 800) return 150;
  return 600;
}
function abstandPunktRechteck(px, py, b) {
  const a = -(b.rotation || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const ox = (px - b.x) * c - (py - b.y) * s, oy = (px - b.x) * s + (py - b.y) * c;
  const dx = Math.max(0, Math.abs(ox) - (b.w || 100) / 2), dy = Math.max(0, Math.abs(oy) - (b.h || 100) / 2);
  return Math.hypot(dx, dy);
}
// plus = null → ausgewachsene Krone („später“), sonst Krone in „plus“ Jahren
function kronenKonflikte(fp, plus) {
  const w = kronenWachstum(fp, plus == null ? 99 : plus);
  if (!w || istGruppe(fp)) return [];
  const r = w.d / 2, out = [], spaeter = plus == null && w.wachsend ? ' (ausgewachsen)' : '';
  getCurrentFreiPflanzen().forEach(o => {
    if (o === fp || istGruppe(o)) return;
    const wo = kronenWachstum(o, plus == null ? 99 : plus);
    if (!wo) return;
    const dist = Math.hypot(o.x - fp.x, o.y - fp.y);
    if (dist < (r + wo.d / 2) * 0.75) out.push({ art: 'krone', text: `Krone überschneidet sich mit ${o.name || 'Nachbarbaum'}${spaeter}` });
  });
  getCurrentBeds().forEach(b => {
    if (b.kind !== 'struktur' || b.strukturTyp !== 'gebaeude') return;
    const dist = b.shape === 'circle' ? Math.max(0, Math.hypot(fp.x - b.x, fp.y - b.y) - Math.max(b.rx || 60, b.ry || 60)) : abstandPunktRechteck(fp.x, fp.y, b);
    if (dist < r * 0.9) out.push({ art: 'gebaeude', text: `Krone reicht bis an ${b.name || 'das Gebäude'}${spaeter} – nur ${messText(dist)} Abstand` });
  });
  const size = getGardenSizeM();
  if (size && istBaumartig(fp, w.info)) {
    const W = size.w * 100, H = size.h * 100;
    const dmin = Math.min(fp.x, fp.y, W - fp.x, H - fp.y);
    const soll = grenzRichtwert(fp, w.info, w.end);
    if (dmin >= 0 && dmin < soll) out.push({ art: 'grenze', text: `Nur ${messText(dmin)} bis zur Grundstücksgrenze – Richtwert in BW (innerorts) ca. ${zahlDe(soll / 100)} m` });
    else if (dmin >= 0 && dmin < r) out.push({ art: 'grenze', text: `Krone ragt${spaeter} ca. ${messText(r - dmin)} über die Grundstücksgrenze` });
  }
  return out;
}
function kronenWarnungZeigen(fp) {
  const k = kronenKonflikte(fp, null);
  if (k.length) showTempStatus('⚠️ ' + k[0].text + (k.length > 1 ? ` (+${k.length - 1} weitere)` : ''), 7);
}

// ==================== GIESSRUNDE ====================
let giessRundeListe = [], giessRundeInfo = null;
const giessVorherFrei = new Map();
function giessFreiInfo(fp) {
  const info = typeof CARE_INFO !== 'undefined' && CARE_INFO[lexKatalogName((fp.name || '').trim())];
  if (!info || !info.waterDays) return null;
  const m = new Date().getMonth() + 1;
  if (m < 4 || m > 9) return null; // Gehölze außerhalb der Saison nicht in die Runde
  let alter = null;
  if (fp.datum) { const d = new Date(fp.datum + 'T00:00:00'); if (!isNaN(d.getTime())) alter = daysBetween(d, new Date(new Date().setHours(0, 0, 0, 0))); }
  if (alter != null && alter > 730) return null; // eingewachsene Gehölze brauchen meist kein Gießen mehr
  if (alter == null && !fp.lastWatered) return null;
  return giessFaelligkeit(fp, info.waterDays, alter || 0);
}
async function giessRundeUmschalten() {
  if (mode === 'giessen') { setMode('select'); return; }
  if (bluehMonat) bluehModusAus();
  if (zeitreiseJahre !== null) zeitreiseAus();
  let daten = null;
  try { daten = await computeCarePlanData(); } catch (e) { daten = null; }
  const liste = [];
  ((daten && daten.items) || []).forEach(it => {
    if (it.kind !== 'water' || it.dueInDays !== 0 || it.skip) return;
    const t = careIdTeile(it.id);
    const bed = getCurrentBeds().find(b => String(b.id) === t.bedId);
    const p = bed && bed.plants && bed.plants[t.idx];
    if (p) liste.push({ typ: 'beet', id: it.id, bed, idx: t.idx, p });
  });
  getCurrentFreiPflanzen().forEach(fp => {
    const g = giessFreiInfo(fp);
    if (g && g.dueToday) liste.push({ typ: 'frei', fp, p: fp });
  });
  giessRundeListe = liste;
  giessRundeInfo = { regen: daten && daten.recentRain >= 8 ? daten.recentRain : 0, heiss: !!(daten && daten.hotDry) };
  setMode('giessen');
}
function giessErledigt(e) { return e.typ === 'beet' ? isCareTaskDone(e.id) : e.fp.lastWatered === heuteISO(); }
function giessPos(e) {
  if (e.typ === 'frei') return { x: e.fp.x, y: e.fp.y, r: symbolRadius(e.fp, true) };
  const rot = e.bed.rotation || 0;
  return { x: e.bed.x + rotX(e.p.rx, e.p.ry, rot), y: e.bed.y + rotY(e.p.rx, e.p.ry, rot), r: symbolRadius(e.p, false) };
}
// Kinder-Modus der Gießrunde: große Symbole, kein Text, Sterne für die Kinderecke
let giessKinderModus = false, giessKind = null;
function giessKinderUmschalten() {
  giessKinderModus = !giessKinderModus;
  if (giessKinderModus && !giessKind) { const k = gartenKinder(); if (k.length === 1) giessKind = k[0]; }
  zeichenHinweisZeigen('giessen'); draw();
}
function giessKindWaehlen(id) { giessKind = giessKind === id ? null : id; giessHinweis(); }
function giessHinweis() {
  const el = document.getElementById('zeichenHinweis'), t = el && el.querySelector('.zh-text');
  if (!t || mode !== 'giessen') return;
  const n = giessRundeListe.length, fertig = giessRundeListe.filter(giessErledigt).length;
  if (giessKinderModus) {
    const tropfen = n ? giessRundeListe.map(e => giessErledigt(e) ? '💧' : '⚪').join('') : '😊';
    const kinder = gartenKinder();
    t.innerHTML = `<span class="gk-tropfen">${tropfen}</span>` + (kinder.length ? `<span class="gk-kinder">${kinder.map(id => {
      const p = gartenPersonInfo(id) || { label: id }, an = giessKind === id;
      return `<button type="button" class="gk-kind${an ? ' an' : ''}" style="--kf:${escapeHtml(p.farbe || '#c99a3a')}" onclick="giessKindWaehlen(${jsAttrStr(id).replace(/"/g, '&quot;')})">${escapeHtml((p.label || id).slice(0, 10))}${an ? ' ⭐' : ''}</button>`;
    }).join('')}</span>` : '');
    return;
  }
  if (!n) t.textContent = giessRundeInfo && giessRundeInfo.regen ? `🌧 ${Math.round(giessRundeInfo.regen)} mm Regen – heute muss nichts gegossen werden` : '💧 Heute ist nichts zum Gießen fällig 🎉';
  else if (fertig === n) t.textContent = `💧 Alle ${n} gegossen – fertig! 🎉`;
  else t.textContent = `💧 Gießrunde: ${fertig} von ${n} erledigt${giessRundeInfo && giessRundeInfo.heiss ? ' · ☀️ heiß' : ''} – Pflanze antippen zum Abhaken`;
}
function giessTipp(x, y) {
  const z = zoomFaktor();
  let best = null, bestD = Infinity;
  giessRundeListe.forEach(e => {
    const q = giessPos(e), d = Math.hypot(q.x - x, q.y - y);
    if (d <= Math.max(q.r * 1.3, (giessKinderModus ? 40 : 24) / z) && d < bestD) { best = e; bestD = d; }
  });
  if (!best) return;
  if (best.typ === 'beet') toggleCareTaskDone(best.id);
  else {
    const fp = best.fp;
    if (fp.lastWatered === heuteISO()) { const v = giessVorherFrei.get(fp); if (v) fp.lastWatered = v; else delete fp.lastWatered; giessVorherFrei.delete(fp); }
    else { giessVorherFrei.set(fp, fp.lastWatered || null); fp.lastWatered = heuteISO(); }
    saveData();
  }
  const jetzt = giessErledigt(best);
  if (giessKinderModus && giessKind) {
    const schluessel = best.typ === 'beet' ? best.id : 'frei_' + best.fp.id;
    kinderSternSetzen(giessKind, 'st_garten_giess_' + schluessel + '_' + heuteISO(), '💧 ' + (best.p.name || 'Pflanze') + ' gegossen', jetzt);
    if (jetzt) showTempStatus('⭐ Super, ' + ((gartenPersonInfo(giessKind) || {}).label || '') + '!', 2);
  }
  giessHinweis(); draw();
  const n = giessRundeListe.length;
  if (jetzt && n && giessRundeListe.every(giessErledigt)) showTempStatus(giessKinderModus ? '🎉⭐ Alles gegossen – toll gemacht!' : '🎉 Gießrunde geschafft!', 3);
}
function zeichneGiessRunde() {
  if (mode !== 'giessen') return;
  const z = zoomFaktor(), kind = giessKinderModus;
  ctx.save();
  ctx.fillStyle = kind ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  giessRundeListe.forEach(e => {
    const q = giessPos(e), fertig = giessErledigt(e);
    const r = kind ? Math.max(Math.min(q.r, 60) + 6 / z, 34 / z) : Math.max(Math.min(q.r, 60) + 4 / z, 16 / z);
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fertig ? 'rgba(76,150,80,0.28)' : 'rgba(70,140,210,0.25)'; ctx.fill();
    ctx.lineWidth = (kind ? 5 : 3) / z; ctx.strokeStyle = fertig ? '#3f8a47' : '#2f78c4'; ctx.stroke();
    const fs = kind ? 34 / z : (q.r * 1.1 > 14 / z ? Math.min(28, q.r * 1.1) : 14 / z);
    ctx.font = fs + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(e.p.sym || '🌱', q.x, q.y);
    const bx = q.x + r * 0.75, by = q.y - r * 0.75, br = (kind ? 15 : 9) / z;
    if (kind) {
      ctx.font = (kind ? 24 : 12) / z + 'px ' + EMOJI_FONT;
      ctx.fillText(fertig ? '⭐' : '💧', bx, by);
    } else {
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = fertig ? '#3f8a47' : '#2f78c4'; ctx.fill();
      ctx.font = '700 ' + (11 / z) + 'px Inter, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(fertig ? '✓' : '💧', bx, by + 0.5 / z);
    }
  });
  ctx.restore();
}

// ==================== ＋ SCHNELL-EINTRAG (auch per Sprache, aus „＋ Schnell festhalten“) ====================
// Versteht kurze Sätze wie „2 Kilo Tomaten geerntet“, „Igel am Komposthaufen gesehen“, „Tomaten gegossen“.
// Es wird nie still gespeichert: ein kleines Fenster zeigt, was erkannt wurde, und fragt nach.
let schnellGartenAktion = null;
function schnellNorm(t) { return String(t || '').toLowerCase().replace(/[.,!?;:]+$/g, '').trim(); }
function schnellZahl(t) {
  const W = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, zwölf: 12, zwanzig: 20, halbes: 0.5, halbe: 0.5, anderthalb: 1.5 };
  const m = /(\d+(?:[.,]\d+)?)/.exec(t);
  if (m) return parseFloat(m[1].replace(',', '.'));
  for (const w of Object.keys(W)) if (new RegExp('(^|\\s)' + w + '(\\s|$)').test(t)) return W[w];
  return null;
}
function schnellEinheit(t) {
  if (/\b(kilo|kilogramm|kg)\b/.test(t)) return 'kg';
  if (/\b(gramm|g)\b/.test(t)) return 'g';
  if (/\b(bund|bündel)\b/.test(t)) return 'Bund';
  if (/\b(liter|l)\b/.test(t)) return 'Liter';
  return 'Stück';
}
// Alle Pflanzen im aktuellen Garten mit Fundort – passend zu einem Text („tomaten“ → Tomate)
function schnellPflanzenFinden(t) {
  const treffer = [];
  const passt = (name) => {
    const n = schnellNorm(name);
    if (!n || n.length < 3) return false;
    const stamm = n.replace(/(en|n|e|s)$/, '');
    return t.includes(n) || (stamm.length >= 4 && new RegExp('(^|\\s)' + stamm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*').test(t));
  };
  getCurrentBeds().forEach(bed => (bed.plants || []).forEach((p, idx) => { if (bed.kind !== 'struktur' && passt(p.name)) treffer.push({ p, bed, idx }); }));
  getCurrentFreiPflanzen().forEach(fp => { if (passt(fp.name)) treffer.push({ p: fp, bed: null }); });
  if (!treffer.length) getCurrentBeds().forEach(bed => { if (bed.kind !== 'struktur' && bed.name && passt(bed.name)) (bed.plants || []).forEach((p, idx) => treffer.push({ p, bed, idx, perBeet: true })); });
  return treffer;
}
function schnellGartenVerstehen(text) {
  const t = schnellNorm(text);
  if (!t) return null;
  // 🧺 Ernte
  if (/geerntet|\bernte\b|gepflückt|gesammelt/.test(t)) {
    const pfl = schnellPflanzenFinden(t);
    const menge = schnellZahl(t);
    if (pfl.length) return { art: 'ernte', ziel: pfl[0], menge: menge || 1, einheit: menge ? schnellEinheit(t) : 'Stück', text };
  }
  // 💧 Gießen
  if (/gegossen|gewässert|bewässert/.test(t)) {
    const alles = /\b(alles|alle|garten|überall)\b/.test(t);
    const pfl = alles ? [] : schnellPflanzenFinden(t);
    if (alles || pfl.length) return { art: 'giessen', ziele: pfl, alles, text };
  }
  // 🐾 Tier
  const woerter = t.split(/\s+/);
  let tier = null;
  for (let i = 0; i < woerter.length && !tier; i++) for (let l = 3; l >= 1 && !tier; l--) {
    const stueck = woerter.slice(i, i + l).join(' ');
    if (stueck.length >= 3) tier = beobTierErkennen(stueck) || (stueck.length >= 5 ? beobTierErkennen(stueck.replace(/(en|n|s)$/, '')) : null);
  }
  if (tier || /gesehen|beobachtet|entdeckt|gehört|nistkasten|brüte|überwinter/.test(t)) {
    const pfl = schnellPflanzenFinden(t);
    const art = /nistkasten|nisthilfe|brütet|nest/.test(t) ? 'nistkasten' : /winter|überwinter/.test(t) ? 'winter' : /bau|höhle|loch/.test(t) ? 'bau' : pfl.length ? 'nektar' : 'sonst';
    return { art: 'tier', tier, tierName: tier ? '' : text.replace(/\s*(gesehen|beobachtet|entdeckt|gehört).*$/i, '').trim(), pflanze: pfl.length ? pfl[0].p.name : '', beobArt: art, text };
  }
  return { art: 'notiz', text };
}
function schnellGartenZeigen(text) {
  const a = schnellGartenVerstehen(text);
  if (!a) return;
  schnellGartenAktion = a;
  const wo = (z) => z.bed ? (z.bed.name || 'Beet') : 'frei stehend';
  let html = '', knopf = '✓ Eintragen';
  if (a.art === 'ernte') html = `<div class="sg-art">🧺 Ernte</div><div class="sg-was"><b>${zahlDe(a.menge)} ${escapeHtml(a.einheit)}</b> ${escapeHtml(a.ziel.p.name)} <span class="sg-wo">· ${escapeHtml(wo(a.ziel))} · heute</span></div>`;
  else if (a.art === 'giessen') {
    const n = a.alles ? giessHeuteFaellig().length : a.ziele.length;
    html = `<div class="sg-art">💧 Gegossen</div><div class="sg-was">${a.alles ? `Alles, was heute fällig ist (${n} Pflanzen)` : escapeHtml([...new Set(a.ziele.map(z => z.p.name))].join(', ')) + ` <span class="sg-wo">· ${n} Pflanze${n === 1 ? '' : 'n'}</span>`}</div>`;
  } else if (a.art === 'tier') { html = `<div class="sg-art">🐾 Tier-Beobachtung</div><div class="sg-was">${a.tier ? a.tier.icon + ' <b>' + escapeHtml(a.tier.name) + '</b>' : '<b>' + escapeHtml(a.tierName || '?') + '</b>'}${a.pflanze ? ' an ' + escapeHtml(a.pflanze) : ''} <span class="sg-wo">· heute</span></div>`; knopf = 'Weiter →'; }
  else { html = `<div class="sg-art">📝 Notiz</div><div class="sg-was">„${escapeHtml(a.text)}“</div><div class="sg-wo" style="margin-top:4px">Danach auf der Karte antippen, wo sie hingehört.</div>`; knopf = '📍 Ort wählen'; }
  document.getElementById('sgInhalt').innerHTML = `<div class="sg-gehoert">🎤 „${escapeHtml(text)}“</div>` + html;
  document.getElementById('sgOk').textContent = knopf;
  document.getElementById('sgNotiz').style.display = a.art === 'notiz' ? 'none' : '';
  document.getElementById('schnellGartenModal').style.display = 'flex';
}
function giessHeuteFaellig() {
  const out = [];
  getCurrentBeds().forEach(bed => (bed.plants || []).forEach((p, idx) => {
    const info = CARE_INFO[lexKatalogName((p.name || '').trim())];
    if (!info || !info.waterDays) return;
    const d = p.date ? new Date(p.date + 'T00:00:00') : null;
    const alter = d && !isNaN(d.getTime()) ? daysBetween(d, new Date(new Date().setHours(0, 0, 0, 0))) : null;
    if (alter === null && !p.lastWatered) return;
    if (giessFaelligkeit(p, info.waterDays, alter || 0).dueToday) out.push({ p, bed, idx });
  }));
  return out;
}
function schnellGartenSchliessen() { document.getElementById('schnellGartenModal').style.display = 'none'; }
function schnellGartenAlsNotiz() {
  const a = schnellGartenAktion;
  if (a) schnellGartenAktion = { art: 'notiz', text: a.text };
  schnellGartenAusfuehren();
}
function schnellGartenAusfuehren() {
  const a = schnellGartenAktion;
  schnellGartenSchliessen();
  if (!a) return;
  if (a.art === 'ernte') {
    pushUndo();
    const p = a.ziel.p;
    if (!p.harvests) p.harvests = [];
    p.harvests.push({ date: heuteISO(), amount: a.menge, unit: a.einheit, method: '', note: '' });
    p.harvests.sort((x, y) => x.date < y.date ? 1 : -1);
    try { pruefePflanzenMeilenstein(p); } catch (e) {}
    saveData();
    showTempStatus(`🧺 ${zahlDe(a.menge)} ${a.einheit} ${p.name} eingetragen`, 4);
  } else if (a.art === 'giessen') {
    const ziele = a.alles ? giessHeuteFaellig() : a.ziele;
    ziele.forEach(z => {
      if (z.bed) { const id = z.bed.id + '_' + z.idx + '_water'; if (!isCareTaskDone(id)) toggleCareTaskDone(id); else z.p.lastWatered = heuteISO(); }
      else z.p.lastWatered = heuteISO();
    });
    saveData();
    showTempStatus(`💧 ${ziele.length} Pflanze${ziele.length === 1 ? '' : 'n'} als gegossen eingetragen`, 4);
  } else if (a.art === 'tier') {
    beobachtungNeu({ tierId: a.tier ? a.tier.id : null, tierName: a.tier ? '' : a.tierName, pflanze: a.pflanze, art: a.beobArt });
  } else {
    showView('garden');
    setTimeout(() => { notizVorgabeText = a.text; tierOrtZweck = 'notizNeu'; setMode('tierort'); }, 150);
  }
}
let notizVorgabeText = '';
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !e.data || e.data.type !== 'shortcutAktion' || e.data.aktion !== 'notiz') return;
  const id = String(e.data.text || '');
  setTimeout(() => { try { notizZeigen(id); setTimeout(() => notizBearbeiten(id), 700); } catch (err) {} }, 200);
});
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !e.data || e.data.type !== 'shortcutAktion' || e.data.aktion !== 'neu') return;
  const text = String(e.data.text || '').trim();
  setTimeout(() => {
    try { if (text) schnellGartenZeigen(text); else { showView('garden'); tierAufKarteStarten(); } } catch (err) { console.warn('Schnell-Eintrag Garten', err); }
  }, 200);
});

// ==================== MARKIERUNG SETZEN: TIER ODER NOTIZ ====================
let markierPos = null;
function markierWahlZeigen(pos, vorschlag) {
  markierPos = { pos, vorschlag };
  document.getElementById('markierWahl').style.display = 'flex';
}
function markierWahlSchliessen() { document.getElementById('markierWahl').style.display = 'none'; markierPos = null; }
function markierWahl(art) {
  const m = markierPos;
  markierWahlSchliessen();
  if (!m) return;
  if (art === 'tier') beobachtungNeu(Object.assign({ pos: m.pos }, m.vorschlag || {}));
  else notizNeu(m.pos);
}

// ==================== 📝 NOTIZ-PINS MIT ERINNERUNG ====================
// gardens[id].notizPins = [{ id, x, y, icon, text, datum ('JJJJ-MM-TT'|''), jaehrlich, erledigt, erledigtJahr }]
const NOTIZ_ICONS = ['📝', '🌷', '💧', '✂️', '🌱', '⚠️', '🔧', '🐛', '⭐', '🪣'];
let notizEditId = null, notizEditIcon = '📝', notizEditPos = null;
function notizPins() {
  const g = gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.notizPins)) g.notizPins = [];
  return g.notizPins;
}
function notizFaellig(n) {
  if (!n || !n.datum) return false;
  const heute = heuteISO();
  if (n.jaehrlich) {
    const j = heute.slice(0, 4);
    return heute >= j + n.datum.slice(4) && String(n.erledigtJahr || '') !== j;
  }
  return heute >= n.datum && !n.erledigt;
}
function notizTerminText(n) {
  if (!n.datum) return '';
  const d = new Date(n.datum + 'T12:00');
  return n.jaehrlich ? 'jedes Jahr am ' + d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function notizNeu(pos) {
  notizEditId = null;
  notizFormFuellen({ icon: '📝', text: notizVorgabeText || '', datum: '', jaehrlich: false, x: pos.x, y: pos.y });
  notizVorgabeText = '';
}
function notizBearbeiten(id) {
  const n = notizPins().find(x => x.id === id);
  if (!n) return;
  notizEditId = id;
  notizFormFuellen(n);
}
function notizFormFuellen(n) {
  notizEditIcon = n.icon || '📝';
  notizEditPos = { x: n.x, y: n.y };
  document.getElementById('notizTitel').textContent = notizEditId ? '📝 Notiz bearbeiten' : '📝 Notiz an dieser Stelle';
  document.getElementById('notizText').value = n.text || '';
  document.getElementById('notizDatum').value = n.datum || '';
  document.getElementById('notizJaehrlich').checked = !!n.jaehrlich;
  notizIconsRendern();
  document.getElementById('notizLoeschen').style.display = notizEditId ? '' : 'none';
  document.getElementById('notizErledigt').style.display = notizEditId && notizFaellig(n) ? '' : 'none';
  document.getElementById('notizModal').style.display = 'flex';
  setTimeout(() => { try { if (!notizEditId) document.getElementById('notizText').focus(); } catch (e) {} }, 80);
}
function notizIconsRendern() {
  document.getElementById('notizIcons').innerHTML = NOTIZ_ICONS.map(i => `<button type="button" class="saat-chip${i === notizEditIcon ? ' an' : ''}" onclick="notizEditIcon='${i}';notizIconsRendern()">${i}</button>`).join('');
}
function notizSchliessen() { document.getElementById('notizModal').style.display = 'none'; }
function notizSpeichern() {
  const text = document.getElementById('notizText').value.trim();
  if (!text) { showTempStatus('Bitte kurz eintragen, worum es geht.', 3); document.getElementById('notizText').focus(); return; }
  const daten = { icon: notizEditIcon, text, datum: document.getElementById('notizDatum').value || '', jaehrlich: document.getElementById('notizJaehrlich').checked, x: Math.round(notizEditPos.x), y: Math.round(notizEditPos.y) };
  const liste = notizPins();
  if (notizEditId) {
    const n = liste.find(x => x.id === notizEditId);
    if (!n) return;
    if (n.datum !== daten.datum || n.jaehrlich !== daten.jaehrlich) { delete n.erledigt; delete n.erledigtJahr; }
    Object.assign(n, daten);
  } else liste.push(Object.assign({ id: 'pin_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }, daten));
  saveData(); notizSchliessen(); draw();
  showTempStatus(daten.datum ? `📝 Gespeichert – Erinnerung ${notizTerminText(daten)} unter „Heute“` : '📝 Notiz gespeichert', 4);
  notizAnsichtenAktualisieren();
}
function notizLoeschen() {
  const liste = notizPins(), i = liste.findIndex(x => x.id === notizEditId);
  if (i === -1) return;
  const weg = liste.splice(i, 1)[0];
  saveData(); notizSchliessen(); draw(); notizAnsichtenAktualisieren();
  showTempStatus('🗑 Notiz gelöscht', 6, { label: 'Rückgängig', aktion: () => { liste.splice(i, 0, weg); saveData(); draw(); notizAnsichtenAktualisieren(); } });
}
function notizAlsErledigt(id) {
  const n = notizPins().find(x => x.id === (id || notizEditId));
  if (!n) return;
  if (n.jaehrlich) n.erledigtJahr = heuteISO().slice(0, 4); else n.erledigt = true;
  saveData(); notizSchliessen(); draw(); notizAnsichtenAktualisieren();
  showTempStatus('✓ Erledigt' + (n.jaehrlich ? ' – nächstes Jahr wird wieder erinnert' : ''), 4, { label: 'Rückgängig', aktion: () => { delete n.erledigt; delete n.erledigtJahr; saveData(); draw(); notizAnsichtenAktualisieren(); } });
}
function notizAnsichtenAktualisieren() {
  try { if (document.getElementById('view-home')?.classList.contains('active')) renderHomeOverview(); } catch (e) {}
}
function notizOrtWaehlen() {
  notizSchliessen();
  if (!document.getElementById('view-garden')?.classList.contains('active')) showView('garden');
  tierOrtZweck = 'notiz';
  setMode('tierort');
}
function notizZeigen(id) {
  const n = notizPins().find(x => x.id === id);
  if (!n) return;
  notizSchliessen();
  showView('garden');
  setTimeout(() => springeZuBeet(n), 120);
}
function notizHeuteHtml() {
  const liste = notizPins().filter(notizFaellig);
  if (!liste.length) return '';
  const id = x => jsAttrStr(x.id).replace(/"/g, '&quot;');
  return `<div class="heute-box"><div class="heute-titel">📝 Erinnerungen im Garten <span class="heute-zahl">${liste.length}</span></div>${liste.map(n => `
    <div class="heute-aufgabe"><span class="heute-icon">${escapeHtml(n.icon || '📝')}</span>
      <span class="heute-text"><span>${escapeHtml(n.text)}</span><span class="heute-unter">${escapeHtml(notizTerminText(n))}</span></span>
      <button type="button" class="heute-knopf" onclick="notizZeigen(${id(n)})">🗺️ Wo?</button>
      <button type="button" class="heute-mini" onclick="notizAlsErledigt(${id(n)})" title="Erledigt">✓</button></div>`).join('')}</div>`;
}
function notizPinListe() { return ebene('notizen') ? notizPins() : []; }
function notizKopf(n) { const z = zoomFaktor(); return { x: n.x, y: n.y - 20 / z, r: 13 / z }; }
function notizTreffer(x, y) {
  const liste = notizPinListe();
  for (let i = liste.length - 1; i >= 0; i--) {
    const k = notizKopf(liste[i]);
    if (Math.hypot(k.x - x, k.y - y) <= k.r * 1.3 || Math.hypot(liste[i].x - x, liste[i].y - y) <= k.r * 0.6) return liste[i];
  }
  return null;
}
function zeichneNotizPins() {
  const liste = notizPinListe();
  if (!liste.length) return;
  const z = zoomFaktor();
  ctx.save();
  liste.forEach(n => {
    const faellig = notizFaellig(n), k = notizKopf(n), farbe = faellig ? '#e67e22' : '#5b8bb5';
    ctx.globalAlpha = (bluehMonat || mode === 'giessen' || zeitreiseJahre !== null) ? 0.35 : (n.erledigt ? 0.55 : 1);
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5;
    ctx.beginPath(); ctx.moveTo(n.x, n.y);
    ctx.lineTo(k.x - k.r * 0.6, k.y + k.r * 0.7); ctx.lineTo(k.x + k.r * 0.6, k.y + k.r * 0.7); ctx.closePath();
    ctx.fillStyle = farbe; ctx.fill();
    ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fillStyle = farbe; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath(); ctx.arc(k.x, k.y, k.r * 0.78, 0, Math.PI * 2); ctx.fillStyle = '#fffaf0'; ctx.fill();
    ctx.font = (14 / z) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(n.icon || '📝', k.x, k.y + 1 / z);
    if (faellig) { ctx.beginPath(); ctx.arc(k.x + k.r * 0.8, k.y - k.r * 0.8, 4.5 / z, 0, Math.PI * 2); ctx.fillStyle = '#c0392b'; ctx.fill(); }
    if (ebene('beschriftung') && z >= 0.6) {
      const t = n.text.length > 22 ? n.text.slice(0, 21) + '…' : n.text;
      ctx.font = '600 ' + (10 / z) + 'px Inter, sans-serif';
      const w = ctx.measureText(t).width + 10 / z, ty = k.y - k.r - 9 / z;
      ctx.fillStyle = 'rgba(42,32,22,0.82)'; ctx.beginPath(); ctx.roundRect(k.x - w / 2, ty - 7 / z, w, 14 / z, 7 / z); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(t, k.x, ty + 0.5 / z);
    }
  });
  ctx.restore();
}

// ==================== 🌷 ZWIEBEL-GEDÄCHTNIS ====================
// Zwiebeln „ziehen ein“: nach der Blüte ist oberirdisch nichts mehr zu sehen – die Karte zeigt sie dann
// blass mit gestricheltem Rand, und beim Pflanzen an dieser Stelle gibt es eine Warnung.
function zwiebelRuht(name) {
  if (!istZwiebelPflanze(name)) return false;
  const b = typeof BLUETEZEIT !== 'undefined' && BLUETEZEIT[(name || '').trim()];
  const m = new Date().getMonth() + 1;
  if (!b) return m >= 7 || m <= 1;
  const von = ((b[0] - 3 + 12) % 12) + 1, bis = (b[1] % 12) + 1; // ca. 2 Monate vor bis 1 Monat nach der Blüte sichtbar
  const sichtbar = von <= bis ? (m >= von && m <= bis) : (m >= von || m <= bis);
  return !sichtbar;
}
function zwiebelWarnung(x, y, ausser, neuerName) {
  const treffer = [];
  getCurrentBeds().forEach(bed => {
    const rot = bed.rotation || 0;
    (bed.plants || []).forEach(p => {
      if (p === ausser || !istZwiebelPflanze(p.name)) return;
      if (neuerName && (p.name || '').trim() === neuerName.trim()) return;
      const cx = bed.x + rotX(p.rx, p.ry, rot), cy = bed.y + rotY(p.rx, p.ry, rot);
      const r = (istGruppe(p) ? gruppenRadius(p) : Math.max(8, pflanzAbstandCm(p.name) / 2)) + 8;
      if (Math.hypot(x - cx, y - cy) <= r || pflanzeTrifft(p, bed, x, y)) treffer.push(p);
    });
  });
  getCurrentFreiPflanzen().forEach(p => {
    if (p === ausser || !istZwiebelPflanze(p.name) || (neuerName && (p.name || '').trim() === neuerName.trim())) return;
    const r = (istGruppe(p) ? gruppenRadius(p) : Math.max(8, pflanzAbstandCm(p.name) / 2)) + 8;
    if (Math.hypot(x - p.x, y - p.y) <= r) treffer.push(p);
  });
  if (!treffer.length) return '';
  const teile = treffer.map(p => { const n = parseInt(p.anzahl, 10) || 1; return (n > 1 ? n + ' ' : '') + (p.name || 'Zwiebel'); });
  const ruht = treffer.some(p => zwiebelRuht(p.name));
  return `🌷 Achtung: Hier liegen Zwiebeln (${[...new Set(teile)].join(', ')})${ruht ? ' – gerade eingezogen, also nicht zu sehen' : ''}. Vorsichtig graben!`;
}

// ==================== 🔄 FRUCHTFOLGE-AMPEL AUF DER KARTE ====================
function fruchtfolgeStatus(bed) {
  if (bed.kind === 'struktur') return null;
  const einj = (bed.plants || []).filter(p => !isPerennial(p.name) && getFamily(p.name));
  const hist = (bed.history || []).filter(e => !isPerennial(e.name) && getFamily(e.name));
  if (!einj.length && !hist.length) return null;
  if (einj.length && bedHasFruchtfolgeConflict(bed)) return 'rot';
  if (einj.length && hist.length) return 'gruen';
  if (!einj.length && hist.length) return 'idee';
  return null;
}
function fruchtfolgeEcke(bed) {
  let lx, ly;
  if (bed.shape === 'circle') { lx = (bed.rx ?? bed.r ?? 60) * 0.71; ly = -(bed.ry ?? bed.r ?? 60) * 0.71; }
  else if (bed.shape === 'freehand' && Array.isArray(bed.points) && bed.points.length) { lx = Math.max(...bed.points.map(p => p.x)); ly = Math.min(...bed.points.map(p => p.y)); }
  else { lx = (bed.w || 100) / 2; ly = -(bed.h || 100) / 2; }
  const rot = bed.rotation || 0;
  return { x: bed.x + rotX(lx, ly, rot), y: bed.y + rotY(lx, ly, rot) };
}
const FF_FARBE = { rot: '#c0392b', gruen: '#3f8a47', idee: '#5b8bb5' };
function zeichneFruchtfolgeAmpel() {
  if (!ebene('fruchtfolge') || !ebene('beete') || bluehMonat || mode === 'giessen' || zeitreiseJahre !== null) return;
  const z = zoomFaktor(), r = 9 / z;
  ctx.save();
  getCurrentBeds().forEach(bed => {
    const s = fruchtfolgeStatus(bed);
    if (!s || !bettSichtbar(bed)) return;
    const e = fruchtfolgeEcke(bed);
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fillStyle = FF_FARBE[s]; ctx.fill(); ctx.lineWidth = 2 / z; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.font = '700 ' + (10 / z) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(s === 'rot' ? '!' : s === 'gruen' ? '✓' : '?', e.x, e.y + 0.5 / z);
  });
  ctx.restore();
}
function fruchtfolgeTreffer(x, y) {
  if (!ebene('fruchtfolge') || !ebene('beete') || bluehMonat || zeitreiseJahre !== null) return null;
  const R = 13 / zoomFaktor();
  const beete = getCurrentBeds();
  for (let i = beete.length - 1; i >= 0; i--) {
    const s = fruchtfolgeStatus(beete[i]);
    if (!s || !bettSichtbar(beete[i])) continue;
    const e = fruchtfolgeEcke(beete[i]);
    if (Math.hypot(e.x - x, e.y - y) <= R) return beete[i];
  }
  return null;
}
function fruchtfolgeVorschlaege(bed) {
  const jahr = new Date().getFullYear();
  const kuerzlich = new Set();
  (bed.history || []).forEach(e => { if (!isPerennial(e.name) && jahr - getYearOf(e) <= FRUCHTFOLGE_WARNING_YEARS) { const f = getFamily(e.name); if (f) kuerzlich.add(f); } });
  (bed.plants || []).forEach(p => { if (!isPerennial(p.name)) { const f = getFamily(p.name); if (f) kuerzlich.add(f); } });
  const gesehen = new Set(), out = [];
  PLANTS.forEach(p => {
    if (p.perennial || out.length >= 6) return;
    const f = getFamily(p.name);
    if (!f || kuerzlich.has(f) || gesehen.has(f)) return;
    gesehen.add(f); out.push(p);
  });
  return { kuerzlich: [...kuerzlich], vorschlaege: out };
}
function fruchtfolgeErklaeren(bed) {
  const s = fruchtfolgeStatus(bed);
  const jahr = new Date().getFullYear();
  let html = '';
  if (s === 'rot') {
    const fams = new Set((bed.plants || []).filter(p => !isPerennial(p.name)).map(p => getFamily(p.name)).filter(Boolean));
    fams.forEach(fam => {
      const p = (bed.plants || []).find(pl => getFamily(pl.name) === fam);
      const w = p && getFruchtfolgeWarning(bed, p.name);
      if (w) html += `<div class="ff-zeile rot">⚠️ <b>${escapeHtml(p.name)}</b> (${escapeHtml(fam)}): Diese Familie stand ${w.yearsAgo === 1 ? 'letztes Jahr' : 'vor ' + w.yearsAgo + ' Jahren'} schon hier. Gleiche Familien laugen den Boden einseitig aus und Krankheiten/Schädlinge bleiben im Boden – besser 3–4 Jahre Pause.</div>`;
    });
  } else if (s === 'gruen') html += `<div class="ff-zeile gruen">✓ Passt: Keine der Pflanzen hier gehört zu einer Familie, die in den letzten ${FRUCHTFOLGE_WARNING_YEARS} Jahren in diesem Beet stand.</div>`;
  else html += `<div class="ff-zeile">Das Beet ist gerade frei von einjährigen Kulturen. Für die nächste Pflanzung:</div>`;
  const hist = {};
  (bed.history || []).forEach(e => { const y = getYearOf(e); if (jahr - y <= FRUCHTFOLGE_WARNING_YEARS && !isPerennial(e.name)) (hist[y] = hist[y] || new Set()).add(e.name); });
  const jahre = Object.keys(hist).sort((a, b) => b - a);
  if (jahre.length) html += `<div class="ff-hist">${jahre.map(y => `<div><b>${y}:</b> ${escapeHtml([...hist[y]].join(', '))}</div>`).join('')}</div>`;
  const v = fruchtfolgeVorschlaege(bed);
  if (v.vorschlaege.length && s !== 'gruen') html += `<div class="ff-titel">💡 Passt als Nächstes</div><div class="ff-chips">${v.vorschlaege.map(p => `<span class="bed-chip">${p.sym} ${escapeHtml(p.name)} <span class="ff-fam">${escapeHtml(getFamily(p.name))}</span></span>`).join('')}</div>`;
  document.getElementById('ffTitel').textContent = '🔄 Fruchtfolge · ' + (bed.name || 'Beet');
  document.getElementById('ffInhalt').innerHTML = html;
  document.getElementById('ffModal').style.display = 'flex';
}

// ==================== ↔️ VORHER / NACHHER ====================
let vergleichFotos = [];
function vergleichFotosVon(obj) {
  return (obj.fotos || []).filter(f => fotoQuelle(f)).map((f, i) => ({ f, i })).sort((a, b) => String(a.f.datum || '').localeCompare(String(b.f.datum || '')) || a.i - b.i).map(x => x.f);
}
function vergleichMoeglich(obj) { return vergleichFotosVon(obj).length >= 2; }
function vergleichOeffnen(obj, titel) {
  vergleichFotos = vergleichFotosVon(obj);
  if (vergleichFotos.length < 2) { showTempStatus('Für den Vergleich braucht es mindestens 2 Fotos.', 3); return; }
  const opt = (f, i) => `<option value="${i}">${f.datum ? new Date(f.datum + (f.datum.length === 10 ? 'T12:00' : '')).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Foto ' + (i + 1)}</option>`;
  const html = vergleichFotos.map(opt).join('');
  document.getElementById('vgVorher').innerHTML = html;
  document.getElementById('vgNachher').innerHTML = html;
  document.getElementById('vgVorher').value = '0';
  document.getElementById('vgNachher').value = String(vergleichFotos.length - 1);
  document.getElementById('vergleichTitel').textContent = '↔️ ' + (titel || 'Vorher / Nachher');
  document.getElementById('vgRegler').value = 50;
  document.getElementById('vergleichModal').style.display = 'flex';
  vergleichRendern();
}
function vergleichRendern() {
  const a = vergleichFotos[+document.getElementById('vgVorher').value], b = vergleichFotos[+document.getElementById('vgNachher').value];
  if (!a || !b) return;
  document.getElementById('vgVor').src = fotoQuelle(a);
  document.getElementById('vgNach').src = fotoQuelle(b);
  const s = document.getElementById('vgVorher'), t = document.getElementById('vgNachher');
  document.getElementById('vgTagL').textContent = s.options[s.selectedIndex].text;
  document.getElementById('vgTagR').textContent = t.options[t.selectedIndex].text;
  vergleichRegler();
}
function vergleichRegler() {
  const v = +document.getElementById('vgRegler').value;
  document.getElementById('vgVorWrap').style.clipPath = `inset(0 ${100 - v}% 0 0)`;
  document.getElementById('vgLinie').style.left = v + '%';
}
function vergleichSchliessen() { document.getElementById('vergleichModal').style.display = 'none'; }
(function () {
  const bild = document.getElementById('vgBild');
  if (!bild) return;
  const setzen = (e) => {
    const r = bild.getBoundingClientRect(), p = (e.touches ? e.touches[0] : e);
    document.getElementById('vgRegler').value = Math.max(0, Math.min(100, (p.clientX - r.left) / r.width * 100));
    vergleichRegler();
  };
  let aktiv = false;
  bild.addEventListener('pointerdown', e => { aktiv = true; setzen(e); try { bild.setPointerCapture(e.pointerId); } catch (x) {} });
  bild.addEventListener('pointermove', e => { if (aktiv) setzen(e); });
  bild.addEventListener('pointerup', () => { aktiv = false; });
  bild.addEventListener('pointercancel', () => { aktiv = false; });
})();
function vergleichKachel(obj, titel) {
  if (!vergleichMoeglich(obj)) return null;
  const k = document.createElement('div');
  k.className = 'pp-foto-add pp-foto-vergleich';
  k.textContent = '↔️';
  k.title = 'Vorher / Nachher vergleichen';
  k.addEventListener('click', () => vergleichOeffnen(obj, titel));
  return k;
}

// ==================== TIERE AUF DER KARTE ====================
let tierOrtZweck = null; // 'neu' | 'modal'
let beobEditPos = null;
const TIER_ART_FARBE = { nistkasten: '#8a5a2b', bau: '#5a4632', winter: '#4a86c5', wohnt: '#8a5a2b', eier: '#c9a227', raupe: '#6a9a3a' };
function tierMarkerListe() {
  if (!ebene('tiere')) return [];
  return gartenBeobachtungen().filter(b => b.pos && isFinite(b.pos.x) && isFinite(b.pos.y));
}
function tierMarkerRadius() { return 15 / zoomFaktor(); }
function tierMarkerTreffer(x, y) {
  const R = tierMarkerRadius() * 1.15, liste = tierMarkerListe();
  for (let i = liste.length - 1; i >= 0; i--) if (Math.hypot(liste[i].pos.x - x, liste[i].pos.y - y) <= R) return liste[i];
  return null;
}
function zeichneTierMarker() {
  const liste = tierMarkerListe();
  if (!liste.length) return;
  const z = zoomFaktor(), R = tierMarkerRadius(), heute = Date.now();
  ctx.save();
  liste.forEach(b => {
    const dauerhaft = ['nistkasten', 'bau', 'winter', 'wohnt'].includes(b.art);
    const alt = !dauerhaft && (heute - new Date(b.datum + 'T12:00').getTime()) > 365 * 86400000;
    ctx.globalAlpha = (bluehMonat || mode === 'giessen' || zeitreiseJahre !== null) ? 0.35 : alt ? 0.6 : 1;
    const { x, y } = b.pos, farbe = TIER_ART_FARBE[b.art] || '#4f7d3a';
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = '#fffaf0'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.4 / z; ctx.strokeStyle = farbe; ctx.stroke();
    ctx.font = (17 / z) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(beobTierIcon(b), x, y + 1 / z);
    const bx = x + R * 0.78, by = y + R * 0.78, br = 8 / z;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.2 / z; ctx.strokeStyle = farbe; ctx.stroke();
    ctx.font = (10 / z) + 'px ' + EMOJI_FONT; ctx.fillText(beobArt(b.art).icon, bx, by + 0.5 / z);
    if ((b.anzahl || 1) > 1) {
      const t = '×' + b.anzahl; ctx.font = '700 ' + (9 / z) + 'px Inter, sans-serif';
      const w = ctx.measureText(t).width + 6 / z, ax = x - R * 0.8 - w / 2, ay = y - R * 0.8;
      ctx.fillStyle = farbe; ctx.beginPath(); ctx.roundRect(ax - w / 2 + w / 2 - w / 2, ay - 6 / z, w, 12 / z, 6 / z); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(t, ax, ay + 0.5 / z);
    }
  });
  ctx.restore();
}
function tierAufKarteStarten() {
  if (mode === 'tierort') { setMode('select'); return; }
  tierOrtZweck = 'neu';
  setMode('tierort');
}
function tierOrtHinweis() {
  const el = document.getElementById('zeichenHinweis'), t = el && el.querySelector('.zh-text');
  if (t && mode === 'tierort') t.textContent = tierOrtZweck === 'modal' ? '🐾 Tippe auf die Stelle, wo das Tier war' : tierOrtZweck === 'notiz' ? '📝 Tippe auf die neue Stelle für die Notiz' : tierOrtZweck === 'notizNeu' ? '📝 Tippe auf die Stelle, zu der die Notiz gehört' : '📍 Tippe auf die Stelle – danach wählst du: Tier oder Notiz';
}
function tierOrtTipp(x, y) {
  const zweck = tierOrtZweck;
  tierOrtZweck = null;
  setMode('select');
  if (zweck === 'modal') {
    beobEditPos = { x: Math.round(x), y: Math.round(y) };
    document.getElementById('beobModal').style.display = 'flex';
    beobOrtRendern();
    return;
  }
  if (zweck === 'notizNeu') { notizNeu({ x: Math.round(x), y: Math.round(y) }); return; }
  if (zweck === 'notiz') {
    notizEditPos = { x: Math.round(x), y: Math.round(y) };
    document.getElementById('notizModal').style.display = 'flex';
    return;
  }
  // Steht dort eine Pflanze? → gleich vorschlagen
  let pflanze = '';
  const fp = hitTestFreiPflanze(x, y);
  if (fp) pflanze = fp.name || '';
  else {
    for (const bed of getCurrentBeds()) for (const p of (bed.plants || [])) if (!pflanze && pflanzeTrifft(p, bed, x, y)) pflanze = p.name || '';
  }
  markierWahlZeigen({ x: Math.round(x), y: Math.round(y) }, { pflanze, art: pflanze ? 'nektar' : 'sonst' });
}
function tierOrtAbbrechen() {
  const zweck = tierOrtZweck;
  tierOrtZweck = null;
  setMode('select');
  if (zweck === 'modal') document.getElementById('beobModal').style.display = 'flex';
  if (zweck === 'notiz') document.getElementById('notizModal').style.display = 'flex';
}
function beobOrtRendern() {
  const box = document.getElementById('beobOrt');
  if (!box) return;
  box.innerHTML = beobEditPos
    ? `<span class="beob-ort-text">📍 Auf der Karte eingetragen</span><button type="button" class="btn-secondary" onclick="beobOrtWaehlen()">Verschieben</button><button type="button" class="btn-secondary" onclick="beobOrtZeigen()">🗺️ Zeigen</button><button type="button" class="btn-secondary" onclick="beobEditPos=null;beobOrtRendern()" aria-label="Ort entfernen">✕</button>`
    : `<span class="beob-ort-text">Noch nicht auf der Karte</span><button type="button" class="btn-secondary" onclick="beobOrtWaehlen()">📍 Auf Karte setzen</button>`;
}
function beobOrtWaehlen() {
  document.getElementById('beobModal').style.display = 'none';
  if (!document.getElementById('view-garden')?.classList.contains('active')) showView('garden');
  tierOrtZweck = 'modal';
  setMode('tierort');
}
function beobOrtZeigen() {
  if (!beobEditPos) return;
  const pos = beobEditPos;
  beobSchliessen();
  if (!document.getElementById('view-garden')?.classList.contains('active')) showView('garden');
  setTimeout(() => springeZuBeet(pos), 80);
}

// ==================== KRONENGRÖSSE ====================
// Eigener Wert (fp.kroneD) > Säulen-/Spindelform (schmal) > Pflanzabstand aus der Datenbank
// (auch für Varianten wie „Birne“, „Säulenbirne“, „Birnenbaum“).
const SAEULEN_RE = /s(ä|ae)ulen|spindel|ballerina|columnar|säule/i;
function kronenDurchmesser(fp) {
  const eigen = parseInt(fp.kroneD, 10);
  if (eigen > 0) return { d: eigen, zeigen: true, eigen: true, quelle: 'eigen' };
  const name = (fp.name || '').trim();
  const saeule = SAEULEN_RE.test(name) || SAEULEN_RE.test(fp.sorte || '');
  let key = SPACING[name] ? name : pflanzenSchluesselFinden(name, SPACING);
  if (!key && saeule) key = pflanzenSchluesselFinden(name.replace(/^s(ä|ae)ulen-?\s*/i, '').replace(/^spindel-?\s*/i, ''), SPACING);
  const abst = key ? SPACING[key] : 0;
  if (saeule && (abst >= 150 || /baum|obst|apfel|birn|kirsch|pflaum|zwetsch/i.test(name))) return { d: 80, zeigen: true, eigen: false, quelle: 'saeule' };
  return { d: abst, zeigen: abst >= 150, eigen: false, quelle: abst ? 'daten' : '' };
}
function kroneFeldFuellen(fp) {
  const inp = document.getElementById('fpKroneD'), hin = document.getElementById('fpKroneHinweis'), zeile = document.getElementById('fpKroneZeile');
  if (!inp) return;
  const k = kronenDurchmesser(Object.assign({}, fp, { kroneD: 0 }));
  if (document.activeElement !== inp) inp.value = fp.kroneD || '';
  inp.placeholder = k.zeigen ? String(Math.round(k.d * 0.85)) : 'z.B. 300';
  const gehoelz = k.zeigen || fp.kroneD || ['🌳', '🌲', '🌴'].includes(fp.sym) || /baum|strauch|hecke/i.test(fp.name || '');
  if (zeile) zeile.style.display = istGruppe(fp) || !gehoelz ? 'none' : '';
  if (hin) hin.textContent = fp.kroneD ? 'Eigener Wert – leer lassen für die automatische Größe.'
    : k.quelle === 'saeule' ? 'Säulenform erkannt → schmale Krone (~70 cm). Für die echte Breite einfach eintragen.'
    : k.zeigen ? 'Automatisch aus der Pflanzendatenbank. Für die echte Breite einfach eintragen.'
    : 'Unbekannte Größe – trag die Kronenbreite ein, dann wird sie auf der Karte gezeigt.';
  const w = kronenWachstum(fp, 0);
  if (hin && w && w.wachsend) hin.textContent += ` Heute ca. ${messText(w.jetzt)}, ausgewachsen ca. ${messText(w.end)}.`;
  if (hin) {
    const k = kronenKonflikte(fp, null);
    hin.innerHTML = escapeHtml(hin.textContent) + k.map(x => '<br><span class="zeit-warn">⚠️ ' + escapeHtml(x.text) + '</span>').join('');
  }
}

function drawFreiPflanze(fp) {
  if (dragFreiPflanze && dragFreiPflanze.item === fp) return; // wird als Drag-Vorschau gezeichnet
  const z = zoomFaktor();
  // Bäume und große Sträucher: Krone in echter Größe (Plan-Ansicht gefüllt, Foto-Ansicht als gestrichelter Kreis)
  const kroneInfo = kronenDurchmesser(fp), kroneCm = kroneInfo.d;
  const wuchs = kroneInfo.zeigen && !istGruppe(fp) ? kronenWachstum(fp, zeitreiseJahre || 0) : null;
  if (wuchs && ebene('kronen') && !bluehMonat) {
    const r = wuchs.d / 2;
    const konflikt = kronenKonflikte(fp, zeitreiseJahre === null ? null : zeitreiseJahre).length > 0;
    ctx.save();
    if (kartenStil() === 'plan') {
      const v = schattenVersatz(12);
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = v.x * z; ctx.shadowOffsetY = v.y * z;
      ctx.globalAlpha = 0.62; // halbtransparent, damit Beschriftungen darunter lesbar bleiben
      ctx.fillStyle = strukturMuster('hecke', '#4f7d3a');
      ctx.beginPath(); ctx.arc(fp.x, fp.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(40,70,30,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(fp.x, fp.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,170,90,0.12)'; ctx.fill();
      ctx.setLineDash([7 / z, 5 / z]); ctx.lineWidth = 2.6 / z; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
      ctx.lineWidth = 1.3 / z; ctx.strokeStyle = 'rgba(47,85,35,0.9)'; ctx.stroke(); ctx.setLineDash([]);
    }
    // ausgewachsene Größe als feiner Ring, solange der Baum noch wächst
    if (wuchs.d < wuchs.end * 0.95) {
      ctx.beginPath(); ctx.arc(fp.x, fp.y, wuchs.end / 2, 0, Math.PI * 2);
      ctx.setLineDash([2 / z, 5 / z]); ctx.lineWidth = 1.6 / z; ctx.strokeStyle = kartenStil() === 'plan' ? 'rgba(40,70,30,0.6)' : 'rgba(255,255,255,0.85)'; ctx.stroke(); ctx.setLineDash([]);
    }
    if (konflikt) {
      ctx.beginPath(); ctx.arc(fp.x, fp.y, r, 0, Math.PI * 2);
      ctx.setLineDash([9 / z, 5 / z]); ctx.lineWidth = 2.6 / z; ctx.strokeStyle = '#e67e22'; ctx.stroke(); ctx.setLineDash([]);
      const by = fp.y - r, br = 9 / z;
      ctx.beginPath(); ctx.arc(fp.x, by, br, 0, Math.PI * 2); ctx.fillStyle = '#e67e22'; ctx.fill();
      ctx.font = '700 ' + (12 / z) + 'px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('!', fp.x, by + 0.5 / z);
    }
    ctx.restore();
  }
  if (buendelVersteckt.has(fp) || !ebene('pflanzen')) return; // steckt in einem Bündel / Ebene aus
  const blueht = bluehStatus(fp.name);
  if (blueht) bluehHalo(fp.x, fp.y, istGruppe(fp) ? Math.min(gruppenRadius(fp), 60) : Math.max(freiSymbolCm(fp) / 2, Math.min(80, (kroneCm || 0) * 0.3)), fp.name);
  ctx.save();
  if (blueht === false) ctx.globalAlpha = 0.3;
  if (istGruppe(fp)) {
    const offen = document.getElementById('freiPflanzePanel')?.classList.contains('open');
    zeichnePflanzGruppe(fp.x, fp.y, fp, offen && fp.id === activeFreiPflanzeId);
  } else {
    const d = freiSymbolCm(fp), k = d / 36;
    ctx.save();
    ctx.beginPath();
    ctx.arc(fp.x, fp.y, d / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,253,248,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,111,90,0.75)';
    ctx.lineWidth = 1.6 * k;
    ctx.setLineDash([3 * k, 2 * k]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = (26 * k) + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2c2415';
    ctx.fillText(fp.sym || '🌳', fp.x, fp.y);
    ctx.restore();
  }
  ctx.restore();
  if (fp.locked) {
    const r = istGruppe(fp) ? gruppenRadius(fp) * 0.72 : freiSymbolCm(fp) * 0.36, k = Math.max(1, 1 / z) * 0.9;
    ctx.save();
    ctx.font = (13 * k) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📌', fp.x + r, fp.y - r);
    ctx.restore();
  }
}

// ==================== ✏️ PLAN-ANSICHT: gezeichnete Oberflächen statt Einfarbflächen ====================
// gardens[id].kartenStil = 'foto' (Luftbild als Hintergrund) | 'plan' (gezeichneter Plan, Foto ausgeblendet)
// Die Muster werden einmal je Typ+Farbe als kleine Kachel gezeichnet und als CanvasPattern wiederverwendet.
function kartenStil() { return (gardens[currentGardenId] && gardens[currentGardenId].kartenStil) || 'foto'; }
function kartenStilSetzen(stil) {
  const g = gardens[currentGardenId]; if (!g) return;
  g.kartenStil = stil; saveData(); draw(); kartenStilKnopfAktualisieren(); try { refreshSettingsUI(); } catch (e) {}
  showTempStatus(stil === 'plan' ? '✏️ Plan-Ansicht – das Foto ist ausgeblendet' : '🗺️ Foto-Ansicht – das Luftbild dient als Vorlage', 3);
}
function kartenStilKnopfAktualisieren() {
  const b = document.getElementById('kartenStilBtn'); if (!b) return;
  const plan = kartenStil() === 'plan';
  b.textContent = plan ? '🗺️' : '✏️';
  b.title = plan ? 'Luftbild als Vorlage zeigen' : 'Gezeichnete Plan-Ansicht';
}
const musterCache = {};
function zufallsFolge(seed) { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function farbeMischen(hex, f) {
  const h = (hex || '#888888').replace('#', ''); const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  const c = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0);
  const z = f >= 0 ? c.map(x => Math.round(x + (255 - x) * f)) : c.map(x => Math.round(x * (1 + f)));
  return '#' + z.map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}
function strukturMuster(typ, farbe) {
  // Im scharfen Modus die Kachel in höherer Auflösung erzeugen (1×, 2×, 4× oder 8×)
  const q = ctx === hauptCtx ? 1 : Math.min(8, Math.pow(2, Math.ceil(Math.log2(Math.max(1, scharfFaktor)))));
  const key = typ + '|' + farbe + '|' + q;
  if (musterCache[key]) return musterCache[key];
  const g = 48;
  const c = document.createElement('canvas'); c.width = g * q; c.height = g * q;
  const m = c.getContext('2d'), r = zufallsFolge(typ.length * 97 + 13);
  m.scale(q, q);
  const hell = farbeMischen(farbe, 0.18), dunkel = farbeMischen(farbe, -0.22);
  m.fillStyle = farbe; m.fillRect(0, 0, g, g);
  if (typ === 'gebaeude') { // Dachziegel
    for (let y = 0; y < g; y += 12) { m.fillStyle = dunkel; m.fillRect(0, y + 10, g, 2);
      for (let x = (y / 12) % 2 ? 6 : 0; x < g + 12; x += 12) { m.fillStyle = hell; m.beginPath(); m.arc(x, y + 10, 6, Math.PI, 0); m.fill(); m.strokeStyle = dunkel; m.lineWidth = 1; m.stroke(); } }
  } else if (typ === 'mauer') { // Ziegel
    m.strokeStyle = hell; m.lineWidth = 1.5;
    for (let y = 0; y < g; y += 12) { m.beginPath(); m.moveTo(0, y); m.lineTo(g, y); m.stroke();
      for (let x = (y / 12) % 2 ? 12 : 0; x < g; x += 24) { m.beginPath(); m.moveTo(x, y); m.lineTo(x, y + 12); m.stroke(); } }
  } else if (typ === 'terrasse') { // Holzdielen
    for (let x = 0; x < g; x += 12) { m.fillStyle = (x / 12) % 2 ? hell : farbe; m.fillRect(x, 0, 11, g); m.fillStyle = dunkel; m.fillRect(x + 11, 0, 1, g);
      m.strokeStyle = farbeMischen(farbe, -0.1); m.lineWidth = 0.7; m.beginPath(); m.moveTo(x + 3, 0); m.bezierCurveTo(x + 6, 16, x + 2, 32, x + 5, g); m.stroke(); }
  } else if (typ === 'sonstiges' || typ === 'pflaster') { // Platten
    m.strokeStyle = dunkel; m.lineWidth = 1.2;
    for (let y = 0; y <= g; y += 24) for (let x = 0; x <= g; x += 24) { m.fillStyle = r() > 0.5 ? hell : farbe; m.fillRect(x + 1, y + 1, 22, 22); m.strokeRect(x + 0.5, y + 0.5, 23, 23); }
  } else if (typ === 'weg' || typ === 'kies') { // Kies
    for (let i = 0; i < 70; i++) { m.fillStyle = r() > 0.5 ? hell : dunkel; m.beginPath(); m.ellipse(r() * g, r() * g, 1.2 + r() * 2, 1 + r() * 1.6, r() * 3, 0, Math.PI * 2); m.fill(); }
  } else if (typ === 'rasen' || typ === 'plangrund') { // Rasen
    for (let i = 0; i < 110; i++) { const x = r() * g, y = r() * g; m.strokeStyle = r() > 0.5 ? hell : dunkel; m.lineWidth = 1; m.beginPath(); m.moveTo(x, y); m.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 3); m.stroke(); }
  } else if (typ === 'hecke') { // Blattwerk
    for (let i = 0; i < 26; i++) { m.fillStyle = r() > 0.4 ? hell : dunkel; m.beginPath(); m.arc(r() * g, r() * g, 4 + r() * 5, 0, Math.PI * 2); m.fill(); }
  } else if (typ === 'wasser') { // Wellen
    m.strokeStyle = hell; m.lineWidth = 1.5;
    for (let y = 6; y < g; y += 12) { m.beginPath(); for (let x = 0; x <= g; x += 4) m.lineTo(x, y + Math.sin((x + y) / 6) * 2); m.stroke(); }
  } else if (typ === 'zaun') { // Latten
    for (let x = 0; x < g; x += 8) { m.fillStyle = hell; m.fillRect(x + 1, 0, 6, g); m.fillStyle = dunkel; m.fillRect(x + 7, 0, 1, g); }
  } else if (typ === 'erde') { // Beet-Erde
    for (let i = 0; i < 60; i++) { m.fillStyle = r() > 0.5 ? hell : dunkel; m.beginPath(); m.arc(r() * g, r() * g, 0.8 + r() * 1.6, 0, Math.PI * 2); m.fill(); }
  }
  const p = ctx.createPattern(c, 'repeat');
  if (q > 1 && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(1 / q));
  musterCache[key] = p;
  return p;
}
// Schatten für Gebäude, Mauern, Hecken und Bäume (Sonne von Süden – mit Nordpfeil, sonst nach rechts unten)
function schattenVersatz(staerke) {
  const n = nordGrad();
  if (n === null) return { x: staerke * 0.6, y: staerke * 0.8 };
  const v = kartenRichtung(0); // Schatten fällt nach Norden
  return { x: v.x * staerke, y: v.y * staerke };
}
function planBeschriftung(text, x, y, icon, struktur) {
  // Lesbare Namensschilder: Schrift wächst beim Herauszoomen mit, damit sie am Handy lesbar bleibt
  const fs = Math.max(11, Math.min(42, 12 / Math.max(0.15, gartenZoom || 1)));
  ctx.save();
  ctx.font = `600 ${fs}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const t = (icon ? icon + ' ' : '') + text;
  const w = ctx.measureText(t).width + fs * 0.9, h = fs * 1.6;
  ctx.fillStyle = struktur ? 'rgba(30,26,20,0.62)' : 'rgba(255,253,246,0.88)';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = struktur ? '#fffaf0' : '#2c2415';
  ctx.fillText(t, x, y + fs * 0.05);
  ctx.restore();
}
function planGrundZeichnen() {
  ctx.save();
  ctx.fillStyle = strukturMuster('plangrund', '#8fb36b');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ==================== 🖼 HINTERGRUND DREHEN, SKALIEREN, VERSCHIEBEN ====================
// gardens[id].bgTrans = { rot (Grad), scale, x, y (Verschiebung in cm) }
function bgTrans() { const g = gardens[currentGardenId] || {}; return Object.assign({ rot: 0, scale: 1, x: 0, y: 0 }, g.bgTrans || {}); }
let bgRotLetzter = null;
function bgTransSetzen(feld, wert) {
  const g = gardens[currentGardenId]; if (!g) return;
  const t = bgTrans();
  const alt = t.rot;
  t[feld] = Number(wert);
  g.bgTrans = t;
  if (feld === 'rot') {
    const delta = t.rot - alt;
    // Nordpfeil hängt am Luftbild – er dreht mit
    if (typeof g.nordGrad === 'number') g.nordGrad = ((g.nordGrad + delta) % 360 + 360) % 360;
    if (document.getElementById('bgMitdrehen') && document.getElementById('bgMitdrehen').checked) objekteDrehen(delta);
    try { nordWidgetAktualisieren(); } catch (e) {}
  }
  bgTransAnzeigen();
  draw();
  clearTimeout(bgTransSetzen._t); bgTransSetzen._t = setTimeout(() => saveData(), 400);
}
function objekteDrehen(delta) {
  const cx = canvas.width / 2, cy = canvas.height / 2, a = delta * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const dreh = o => { const dx = o.x - cx, dy = o.y - cy; o.x = cx + dx * c - dy * s; o.y = cy + dx * s + dy * c; };
  getCurrentBeds().forEach(b => { dreh(b); b.rotation = (((b.rotation || 0) + delta) % 360 + 360) % 360; });
  getCurrentFreiPflanzen().forEach(dreh);
}
function bgTransZuruecksetzen() {
  const g = gardens[currentGardenId]; if (!g) return;
  const alt = bgTrans().rot;
  if (alt) bgTransSetzen('rot', 0);
  delete g.bgTrans; saveData(); bgTransAnzeigen(); draw();
}
function bgTransAnzeigen() {
  const t = bgTrans();
  const set = (id, v, txt) => { const el = document.getElementById(id); if (el) el.value = v; const l = document.getElementById(id + 'Wert'); if (l) l.textContent = txt; };
  set('bgRot', t.rot, (Math.round(t.rot * 10) / 10).toString().replace('.', ',') + '°');
  set('bgScale', t.scale, Math.round(t.scale * 100) + ' %');
  set('bgX', t.x, zahlDe(Math.round(t.x) / 100) + ' m');
  set('bgY', t.y, zahlDe(Math.round(t.y) / 100) + ' m');
  const st = document.getElementById('kartenStilWahl'); if (st) st.value = kartenStil();
}

// ==================== ✏️ FREIFORM-PUNKTE NACHTRÄGLICH VERSCHIEBEN ====================
let dragPunkt = null;
function freiformPunktTreffer(bed, x, y) {
  if (!bed || bed.shape !== 'freehand' || bed.locked || !bed.points) return -1;
  const a = -(bed.rotation || 0) * Math.PI / 180, dx = x - bed.x, dy = y - bed.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  const radius = 14 / Math.max(0.15, gartenZoom || 1);
  let best = -1, bd = radius;
  bed.points.forEach((p, i) => { const d = Math.hypot(p.x - lx, p.y - ly); if (d < bd) { bd = d; best = i; } });
  return best;
}
function freehandPunktZurueck() {
  if (!freehandDrawing || freehandPoints.length <= 1) { cancelFreehand(); return; }
  freehandPoints.pop();
  document.getElementById('freehandPointCount').textContent = String(freehandPoints.length);
  draw();
}

function drawBgImage() {
  if (kartenStil() === 'plan') { planGrundZeichnen(); return; }
  const url = getBgImage();
  if (!url) return;
  if (bgImageLoadedFor !== currentGardenId || !bgImageEl) { loadBgImageEl(url); return; }
  const t = bgTrans();
  ctx.save();
  ctx.globalAlpha = getBgImageOpacity();
  ctx.translate(canvas.width / 2 + t.x, canvas.height / 2 + t.y);
  ctx.rotate(t.rot * Math.PI / 180);
  ctx.scale(t.scale, t.scale);
  ctx.drawImage(bgImageEl, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}
function drawGardenBoundary() {
  const size = getGardenSizeM();
  if (!size) return;
  const cmPerPx = getScale();
  const wPx = (size.w * 100) / cmPerPx;
  const hPx = (size.h * 100) / cmPerPx;
  ctx.save();
  ctx.strokeStyle = '#5a4a32';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(0.5, 0.5, Math.min(wPx, canvas.width-1), Math.min(hPx, canvas.height-1));
  ctx.setLineDash([]);
  ctx.fillStyle = '#5a4a32';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${size.w} × ${size.h} m`, 6, 16);
  ctx.restore();
}

function drawBed(bed, selected, nurPflanzen) {
  const flaecheZeigen = bettSichtbar(bed) && !nurPflanzen;
  const pflanzenZeigen = ebene('pflanzen') && (nurPflanzen || !bluehMonat);
  if (!flaecheZeigen && !pflanzenZeigen) return;
  ctx.save();
  ctx.translate(bed.x, bed.y);
  ctx.rotate((bed.rotation || 0) * Math.PI / 180);
  const plan = kartenStil() === 'plan';
  const typ = bed.kind === 'struktur' ? (bed.strukturTyp || 'sonstiges') : 'beet';
  // Fläche: Struktur mit Muster, Beet in der Plan-Ansicht als Erde mit farbigem Rand
  ctx.fillStyle = typ === 'beet' ? (plan ? strukturMuster('erde', '#6b4f33') : bed.color + 'aa') : strukturMuster(typ, bed.color);
  ctx.strokeStyle = selected ? '#3b2f1e' : (typ === 'beet' ? (plan ? '#8b6a43' : bed.color) : farbeMischen(bed.color, -0.3));
  ctx.lineWidth = selected ? 2.5 : (typ === 'beet' && plan ? 4 : 1.5);
  const mitSchatten = ['gebaeude', 'mauer', 'hecke'].includes(typ);
  if (mitSchatten) { const v = schattenVersatz(typ === 'gebaeude' ? 14 : 6); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = typ === 'gebaeude' ? 14 : 6; ctx.shadowOffsetX = v.x * (gartenZoom || 1); ctx.shadowOffsetY = v.y * (gartenZoom || 1); }
  if (flaecheZeigen) {
  ctx.beginPath();
  if (bed.shape === 'circle') {
    const radX = bed.rx ?? bed.r ?? 60, radY = bed.ry ?? bed.r ?? 60;
    ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2);
  } else if (bed.shape === 'rect') {
    ctx.roundRect(-bed.w/2, -bed.h/2, bed.w, bed.h, 6);
  } else if (bed.shape === 'tri') {
    const w = bed.w, h = bed.h, apex = (bed.apexOffset || 0) * (w/2);
    ctx.moveTo(apex, -h/2); ctx.lineTo(w/2, h/2); ctx.lineTo(-w/2, h/2); ctx.closePath();
  } else if (bed.shape === 'lshape') {
    const w=bed.w, h=bed.h, cw=Math.min(bed.cutW||0,w-1), ch=Math.min(bed.cutH||0,h-1);
    ctx.moveTo(-w/2, -h/2);
    ctx.lineTo(w/2-cw, -h/2);
    ctx.lineTo(w/2-cw, -h/2+ch);
    ctx.lineTo(w/2, -h/2+ch);
    ctx.lineTo(w/2, h/2);
    ctx.lineTo(-w/2, h/2);
    ctx.closePath();
  } else if (bed.shape === 'freehand' && bed.points && bed.points.length) {
    ctx.moveTo(bed.points[0].x, bed.points[0].y);
    for (let k=1;k<bed.points.length;k++) ctx.lineTo(bed.points[k].x, bed.points[k].y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.stroke();
  // Dachfirst bei rechteckigen Gebäuden
  if (typ === 'gebaeude' && bed.shape === 'rect') {
    ctx.save(); ctx.strokeStyle = farbeMischen(bed.color, 0.35); ctx.lineWidth = 3;
    ctx.beginPath(); if (bed.w >= bed.h) { ctx.moveTo(-bed.w / 2 + bed.h / 2, 0); ctx.lineTo(bed.w / 2 - bed.h / 2, 0); } else { ctx.moveTo(0, -bed.h / 2 + bed.w / 2); ctx.lineTo(0, bed.h / 2 - bed.w / 2); }
    ctx.stroke(); ctx.restore();
  }
  // Zaunpfosten
  if (typ === 'zaun' && bed.shape === 'rect') {
    ctx.save(); ctx.fillStyle = farbeMischen(bed.color, -0.4);
    const lang = Math.max(bed.w, bed.h), quer = Math.min(bed.w, bed.h), n = Math.max(2, Math.round(lang / 200));
    for (let i = 0; i <= n; i++) { const p = -lang / 2 + lang * i / n; const q = quer * 1.6; if (bed.w >= bed.h) ctx.fillRect(p - q / 2, -q / 2, q, q); else ctx.fillRect(-q / 2, p - q / 2, q, q); }
    ctx.restore();
  }
  if (bed.name && ebene('beschriftung')) {
    const ty = bed.shape === 'tri' ? bed.h/6 : 0;
    const preset = STRUKTUR_PRESETS[typ] || STRUKTUR_PRESETS.beet;
    if (typ === 'beet' && (bed.plants || []).length) {
      // Beet mit Pflanzen: Schild an den oberen Rand, damit die Pflanzen sichtbar bleiben
      const oben = bed.shape === 'circle' ? -(bed.ry ?? bed.r ?? 60) : -(bed.h || 80) / 2;
      ctx.save(); ctx.rotate(-(bed.rotation || 0) * Math.PI / 180); planBeschriftung(bed.name, 0, oben, '', false); ctx.restore();
    } else {
      ctx.save(); ctx.rotate(-(bed.rotation || 0) * Math.PI / 180); planBeschriftung(bed.name, 0, ty, typ === 'beet' ? '' : preset.icon, bed.kind === 'struktur'); ctx.restore();
    }
  }
  } // Ende flaecheZeigen
  const conflictIdx = pflanzenZeigen ? new Set(getBedConflicts(bed).flat()) : new Set();
  for (const plant of (pflanzenZeigen ? (bed.plants||[]) : [])) {
    const idx = bed.plants.indexOf(plant);
    const isSelected = selectedPlantOnCanvas && selectedPlantOnCanvas.bedId===bed.id && selectedPlantOnCanvas.idx===idx;
    if (!isSelected && buendelVersteckt.has(plant)) continue; // steckt in einem Bündel
    const blueht = bluehStatus(plant.name);
    if (blueht) bluehHalo(plant.rx, plant.ry, istGruppe(plant) ? Math.min(gruppenRadius(plant), 40) : beetSymbolCm(plant) * 0.6, plant.name);
    ctx.save();
    if (blueht === false) ctx.globalAlpha = 0.3;
    if (blueht === null && zwiebelRuht(plant.name)) { // eingezogen: blass mit gestricheltem Erd-Rand
      const rr = istGruppe(plant) ? gruppenRadius(plant) : beetSymbolCm(plant) * 0.6, zz = zoomFaktor();
      if (!hatTuffForm(plant)) { ctx.beginPath(); ctx.arc(plant.rx, plant.ry, rr, 0, Math.PI * 2); ctx.setLineDash([3 / zz, 3 / zz]); ctx.lineWidth = 1.5 / zz; ctx.strokeStyle = 'rgba(110,80,45,0.85)'; ctx.stroke(); ctx.setLineDash([]); }
      ctx.globalAlpha = 0.45;
    }
    let k = 1, ox = 9;
    if (istGruppe(plant)) {
      zeichnePflanzGruppe(plant.rx, plant.ry, plant, isSelected);
      ox = gruppenRadius(plant) * 0.72; k = Math.max(0.6, 1 / zoomFaktor());
    } else {
      const fs = beetSymbolCm(plant); k = fs / 18; ox = 9 * k;
      ctx.font = fs + 'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(plant.sym, plant.rx, plant.ry);
      if (isSelected) {
        ctx.strokeStyle='#c0633a'; ctx.lineWidth=1.5*k;
        ctx.beginPath(); ctx.arc(plant.rx, plant.ry, 13*k, 0, Math.PI*2); ctx.stroke();
      }
    }
    ctx.restore();
    if (conflictIdx.has(idx) && !bluehMonat) {
      ctx.font=(12*k)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#d4880a';
      ctx.beginPath(); ctx.arc(plant.rx+(istGruppe(plant)?-ox:ox), plant.ry-ox, 8*k, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.fillText('!', plant.rx+(istGruppe(plant)?-ox:ox), plant.ry-ox);
    }
  }
  if (selected && flaecheZeigen && bed.shape === 'freehand' && bed.points && !bed.locked) {
    const r = 6 / Math.max(0.15, gartenZoom || 1);
    bed.points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = r / 3; ctx.strokeStyle = '#c0633a'; ctx.stroke(); });
  }
  if (selected) {
    ctx.strokeStyle='#3b2f1e'; ctx.setLineDash([4,3]); ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0, 0, getBedRadius(bed)+8, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (hoverConflictBedId === bed.id) {
    ctx.strokeStyle='#c0392b'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.arc(0, 0, getBedRadius(bed)+5, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (bed.locked && flaecheZeigen) {
    ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📌', getBedRadius(bed) - 2, -getBedRadius(bed) + 10);
  }
  ctx.restore();
}

function getBedRadius(bed) {
  if (bed.shape==='circle') return Math.max(bed.rx ?? bed.r ?? 60, bed.ry ?? bed.r ?? 60);
  if (bed.shape==='rect'||bed.shape==='lshape') return Math.sqrt((bed.w/2)**2+(bed.h/2)**2);
  if (bed.shape==='freehand') return bed.points && bed.points.length ? Math.max(...bed.points.map(p=>Math.hypot(p.x,p.y))) : 40;
  return Math.sqrt((bed.w/2)**2+(bed.h/2)**2);
}

// ==================== INTERACTIONS ====================
let selectedBed = null, selectedPlantOnCanvas = null, activePlantBedId = null;
let selectedBeds = [];
let dragBed = null, dragOffX = 0, dragOffY = 0, groupDragOthers = [];
let dragPlant = null; // {bed, idx, plant, startX, startY, curX, curY, moved}
let mode = 'select', bedColor = '#7a9e72';
let zoneDrawing = false, zoneDrawStart = null, zoneDrawCur = null, zoneNeuZeichnenId = null;
let freehandDrawing = false, freehandPoints = [], freehandMouseX = 0, freehandMouseY = 0;
let hoverConflictBedId = null;
let selectedPlantSym = PLANTS[0].sym, selectedPlantName = PLANTS[0].name;
let dragFreiPflanze = null;
let activeFreiPflanzeId = null;
function hitTestFreiPflanze(x, y) {
  const liste = getCurrentFreiPflanzen();
  for (let i = liste.length - 1; i >= 0; i--) {
    if (pflanzeTrifft(liste[i], null, x, y)) return liste[i];
  }
  return null;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const skalX = canvas.width / rect.width;
  const skalY = canvas.height / rect.height;
  if (e.touches) return { x: (e.touches[0].clientX-rect.left) * skalX, y: (e.touches[0].clientY-rect.top) * skalY };
  return { x: (e.clientX-rect.left) * skalX, y: (e.clientY-rect.top) * skalY };
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseleave', hidePlantTooltip);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('click', ()=>{});
// Ermittelt, ob ein Touch an dieser Canvas-Position eine Zeichnen/Verschieben-Aktion auslösen
// würde. Nur dann wird natives Scrollen blockiert – über leerem Bereich soll der Finger
// stattdessen ganz normal die Fläche scrollen können (wichtig bei gezoomten/großen Gärten).
function ermittleCanvasZiel(x, y) {
  if (['circle','rect','tri','lshape','freehand','freitree','zone','tuffform'].includes(mode)) return true;
  if (TIPP_MODI.includes(mode)) return false; // Wischen verschiebt die Karte, Antippen setzt einen Punkt
  if (mode === 'select' && (buendelTreffer(x, y) || tierMarkerTreffer(x, y) || notizTreffer(x, y) || fruchtfolgeTreffer(x, y))) return false; // Bündel: Wischen scrollt, Antippen öffnet die Auswahl
  const fpHit = hitTestFreiPflanze(x, y);
  if (fpHit && !fpHit.locked) return true;
  const beete = getCurrentBeds();
  for (let i = beete.length - 1; i >= 0; i--) {
    const bed = beete[i];
    if (bed.locked) continue;
    for (let j = (bed.plants||[]).length - 1; j >= 0; j--) {
      const plant = bed.plants[j];
      const rad = (bed.rotation||0) * Math.PI/180;
      const px = bed.x + plant.rx*Math.cos(rad) - plant.ry*Math.sin(rad);
      const py = bed.y + plant.rx*Math.sin(rad) + plant.ry*Math.cos(rad);
      if (pflanzeTrifft(plant, bed, x, y)) return true;
    }
  }
  const bedHit = hitTest(x, y);
  return !!(bedHit && !bedHit.locked);
}
let touchAktionAktiv = false;
canvas.addEventListener('touchstart', e => {
  const p = getPos(e);
  touchAktionAktiv = ermittleCanvasZiel(p.x, p.y);
  if (touchAktionAktiv) e.preventDefault();
  onDown(e);
}, {passive:false});
canvas.addEventListener('touchmove', e => {
  if (!touchAktionAktiv) return; // natives Scrollen zulassen
  e.preventDefault();
  onMove(e);
}, {passive:false});
let festTippBehandelt = false;
canvas.addEventListener('touchend', e => {
  if (touchAktionAktiv) e.preventDefault();
  festTippBehandelt = false;
  onUp(e); hidePlantTooltip();
  // Antippen hat etwas geöffnet (z. B. Bündel-Auswahl) → keinen „Geister-Klick“ hinterherschicken,
  // der das gerade geöffnete Fenster sofort wieder schließen würde
  if (festTippBehandelt && e.cancelable) e.preventDefault();
  touchAktionAktiv = false;
}, {passive:false});

function rotX(rx,ry,deg){const a=deg*Math.PI/180;return rx*Math.cos(a)-ry*Math.sin(a);}
function rotY(rx,ry,deg){const a=deg*Math.PI/180;return rx*Math.sin(a)+ry*Math.cos(a);}

function onDown(e) {
  const {x,y} = getPos(e);
  if (TIPP_MODI.includes(mode)) {
    const pk = (e.touches && e.touches[0]) || e;
    messStart = { cx: pk.clientX, cy: pk.clientY, x, y };
    return;
  }
  if (mode === 'tuffform') { tuffFormPunkte.push({ x, y }); tuffFormHinweis(); draw(); return; }
  if (mode==='zone') {
    zoneDrawing = true;
    zoneDrawStart = {x,y};
    zoneDrawCur = {x,y};
    return;
  }
  if (mode==='freitree') {
    pushUndo();
    const neu = { id: Date.now(), x, y, sym: selectedPlantSym || '🌳', name: selectedPlantName || '', sorte: '', datum: '', notiz: '' };
    getCurrentFreiPflanzen().push(neu);
    saveData(); draw(); renderFreiPflanzenList();
    setMode('select');
    openFreiPflanzePanel(neu);
    showTempStatus('✓ Platziert – Details ergänzen und speichern', 4);
    const zwWarnN = zwiebelWarnung(x, y, neu, neu.name);
    setTimeout(() => { if (zwWarnN) showTempStatus(zwWarnN, 7); else kronenWarnungZeigen(neu); }, 4200);
    return;
  }
  festTipp = null;
  if (mode==='select') {
    // Fixierte Elemente: nicht verschiebbar, aber ein kurzer Tipp öffnet die Infos (siehe onUp)
    const pkt = (e.touches && e.touches[0]) || e;
    const festMerken = (daten) => { festTipp = Object.assign({ cx: pkt.clientX, cy: pkt.clientY, t: Date.now() }, daten); };
    const tierM = tierMarkerTreffer(x, y);
    if (tierM) { festMerken({ typ: 'tier', b: tierM }); return; }
    const pin = notizTreffer(x, y);
    if (pin) { festMerken({ typ: 'notiz', n: pin }); return; }
    const ffBeet = fruchtfolgeTreffer(x, y);
    if (ffBeet) { festMerken({ typ: 'ff', bed: ffBeet }); return; }
    const buendel = buendelTreffer(x, y);
    if (buendel) { festMerken({ typ: 'buendel', b: buendel }); return; }
    const fpFest = hitTestFreiPflanze(x, y);
    if (fpFest && fpFest.locked) { festMerken({ typ: 'fp', item: fpFest }); return; }
    for (let i=getCurrentBeds().length-1;i>=0;i--) {
      const bed=getCurrentBeds()[i];
      if (!bed.locked) continue;
      for (let j=(bed.plants||[]).length-1;j>=0;j--) {
        const pl=bed.plants[j];
        if (pflanzeTrifft(pl, bed, x, y)) { festMerken({ typ: 'pflanze', bed, idx: j }); return; }
      }
    }
    const beetFest = hitTest(x, y);
    if (beetFest && beetFest.locked) festMerken({ typ: 'beet', bed: beetFest });
  }
  if (mode==='select' && selectedBed) {
    const pi = freiformPunktTreffer(selectedBed, x, y);
    if (pi >= 0) { pushUndo(); dragPunkt = { bed: selectedBed, idx: pi }; return; }
  }
  if (mode==='select') {
    const fpHit = hitTestFreiPflanze(x, y);
    if (fpHit && !fpHit.locked) {
      dragFreiPflanze = { item: fpHit, startX: x, startY: y, curX: x, curY: y, moved: false };
      return;
    }
  }
  if (mode==='select') {
    for (let i=getCurrentBeds().length-1;i>=0;i--) {
      const bed=getCurrentBeds()[i];
      if (bed.locked) continue;
      for (let j=(bed.plants||[]).length-1;j>=0;j--) {
        const plant=bed.plants[j];
        const px=bed.x+rotX(plant.rx,plant.ry,bed.rotation||0);
        const py=bed.y+rotY(plant.rx,plant.ry,bed.rotation||0);
        if (pflanzeTrifft(plant, bed, x, y)) {
          dragPlant = { bed, idx:j, plant, startX:x, startY:y, curX:x, curY:y, moved:false };
          return;
        }
      }
    }
    const hit=hitTest(x,y);
    const hitFrei = hit && !hit.locked ? hit : null;
    if (e.shiftKey) {
      if (hitFrei) toggleBedSelection(hitFrei);
      draw(); renderBedList();
      return;
    }
    if (hitFrei) {
      if (!selectedBeds.includes(hitFrei)) selectedBeds=[hitFrei];
      selectedBed=hitFrei; dragBed=hitFrei; dragOffX=x-hitFrei.x; dragOffY=y-hitFrei.y;
      if (selectedBeds.length>1) {
        groupDragOthers = selectedBeds.filter(b=>b!==hitFrei).map(b=>({bed:b, dx:b.x-hitFrei.x, dy:b.y-hitFrei.y}));
        hideBedEditor(); showBulkBar();
      } else {
        groupDragOthers = [];
        showBedEditor(hitFrei); hideBulkBar();
      }
    } else if (!hit) {
      selectedBeds=[]; selectedBed=null; selectedPlantOnCanvas=null; hideBedEditor(); hideBulkBar();
    }
    draw(); renderBedList();
  } else if (['circle','rect','tri','lshape'].includes(mode)) {
    const elementTyp = document.getElementById('newElementTyp')?.value || 'beet';
    const preset = STRUKTUR_PRESETS[elementTyp] || STRUKTUR_PRESETS.beet;
    const name=document.getElementById('newName').value||`${preset.label} ${getCurrentBeds().length+1}`;
    const w=parseInt(document.getElementById('newW').value)||120;
    const h=parseInt(document.getElementById('newH').value)||80;
    const shape=mode;
    const bed={id:Date.now(),shape,x,y,
      rx:shape==='circle'?w/2:undefined, ry:shape==='circle'?h/2:undefined,
      w:shape!=='circle'?w:undefined, h:shape!=='circle'?h:undefined,
      apexOffset:shape==='tri'?(parseInt(document.getElementById('newApex').value)||0)/100:undefined,
      color:bedColor,name,rotation:0,plants:[]};
    if (elementTyp !== 'beet') { bed.kind = 'struktur'; bed.strukturTyp = elementTyp; }
    if (shape==='lshape') {
      const cutW=parseInt(document.getElementById('newCutW').value)||60;
      const cutH=parseInt(document.getElementById('newCutH').value)||40;
      bed.cutW=Math.min(cutW, w-10);
      bed.cutH=Math.min(cutH, h-10);
    }
    pushUndo();
    getCurrentBeds().push(bed);
    selectedBed=bed; selectedBeds=[bed]; showBedEditor(bed); hideBulkBar(); draw(); renderBedList(); saveData(); updateStatus();
    setMode('select');
    showTempStatus(elementTyp === 'beet' ? '✓ Beet angelegt – zum Zeichnen eines weiteren Beets unten „➕ Neu" erneut öffnen' : `✓ ${preset.label} angelegt – zum Zeichnen eines weiteren Elements unten „➕ Neu" erneut öffnen`, 5);
  } else if (mode==='freehand') {
    if (!freehandDrawing) {
      freehandDrawing = true;
      freehandPoints = [{x,y}];
      freehandMouseX = x; freehandMouseY = y;
      document.getElementById('statusMsg').textContent = 'Freiform: Punkt 1 gesetzt – weitere Punkte klicken, am roten Startpunkt schließen';
      document.getElementById('freehandControls').style.display = 'flex';
      document.getElementById('freehandPointCount').textContent = '1';
      const zh = document.getElementById('zeichenHinweis'); if (zh) zh.style.display = 'none';
    } else if (freehandPoints.length>=3 && Math.hypot(x-freehandPoints[0].x, y-freehandPoints[0].y)<14) {
      finishFreehand();
    } else {
      freehandPoints.push({x,y});
      document.getElementById('statusMsg').textContent = `Freiform: ${freehandPoints.length} Punkte – am roten Startpunkt schließen`;
      document.getElementById('freehandPointCount').textContent = String(freehandPoints.length);
    }
    draw();
  } else if (mode==='plant') {
    const hit=hitTest(x,y);
    if (hit && hit.kind==='struktur') {
      showTempStatus('⚠ Pflanzen können nur in Beeten platziert werden, nicht in Strukturen (Weg/Mauer/Gebäude).', 4);
      return;
    }
    if (hit) {
      if (!hit.plants) hit.plants=[];
      const angle=-(hit.rotation||0)*Math.PI/180;
      const dx=x-hit.x, dy=y-hit.y;
      const rx=dx*Math.cos(angle)-dy*Math.sin(angle);
      const ry=dx*Math.sin(angle)+dy*Math.cos(angle);
      pushUndo();
      const zwWarn = zwiebelWarnung(x, y, null, selectedPlantName);
      hit.plants.push({sym:selectedPlantSym,name:selectedPlantName,variety:'',rx,ry,notes:'',date:'',location:'',pest:'',solution:''});
      saveData(); draw(); updateStatus();
      if (zwWarn) { showTempStatus(zwWarn, 7); return; }
      const newIdx=hit.plants.length-1;
      if (selectedBed===hit) renderBedPlantList(hit, document.getElementById('bedPlantSearch')?.value||'');
      const mischConflict = plantHasConflict(hit,newIdx);
      const rotConflict = getFruchtfolgeWarning(hit, selectedPlantName);
      if (mischConflict && rotConflict) {
        showTempStatus(`⚠ ${selectedPlantName}: Mischkultur-Konflikt mit Nachbarn UND Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} in diesem Beet.`, 8);
      } else if (mischConflict) {
        showTempStatus(`⚠ ${selectedPlantName} mag sich nicht mit allen Nachbarn im Beet – siehe ⚠ Symbol`, 6);
      } else if (rotConflict) {
        showTempStatus(`⚠ ${selectedPlantName}: Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} (${rotConflict.year}) in diesem Beet – Fruchtfolge-Pause empfohlen.`, 7);
      } else if (istZwiebelPflanze(selectedPlantName)) {
        showTempStatus(`🌷 Tipp: ${selectedPlantName} antippen und bei „Anzahl“ z. B. 15 eintragen – dann wird daraus ein Tuff.`, 6);
      }
    }
  }
}

function onMove(e) {
  if (mode === 'messen' && messPunkte.length === 1 && !e.touches) { messMaus = getPos(e); draw(); return; }
  if (dragPunkt) {
    const {x,y}=getPos(e);
    const b = dragPunkt.bed, a = -(b.rotation || 0) * Math.PI / 180, dx = x - b.x, dy = y - b.y;
    b.points[dragPunkt.idx] = { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
    draw();
    return;
  }
  if (zoneDrawing) {
    const {x,y}=getPos(e);
    zoneDrawCur = {x,y};
    draw();
    return;
  }
  if (freehandDrawing) {
    const {x,y}=getPos(e);
    freehandMouseX=x; freehandMouseY=y;
    draw();
    return;
  }
  if (dragFreiPflanze) {
    const {x,y}=getPos(e);
    dragFreiPflanze.curX=x; dragFreiPflanze.curY=y;
    if (!dragFreiPflanze.moved && Math.hypot(x-dragFreiPflanze.startX,y-dragFreiPflanze.startY)>6) {
      dragFreiPflanze.moved = true;
      pushUndo();
    }
    if (dragFreiPflanze.moved) { dragFreiPflanze.item.x = x; dragFreiPflanze.item.y = y; }
    draw();
    return;
  }
  if (dragPlant) {
    const {x,y}=getPos(e);
    dragPlant.curX=x; dragPlant.curY=y;
    if (!dragPlant.moved && Math.hypot(x-dragPlant.startX,y-dragPlant.startY)>6) {
      dragPlant.moved = true;
      pushUndo();
      dragPlant.bed.plants.splice(dragPlant.idx,1);
    }
    if (dragPlant.moved) {
      const target = hitTest(x,y);
      dragPlant.targetBed = target;
      draw();
    }
    return;
  }
  if (mode==='select'&&dragBed) {
    const {x,y}=getPos(e);
    dragBed.x=x-dragOffX; dragBed.y=y-dragOffY;
    for (const o of groupDragOthers) { o.bed.x=dragBed.x+o.dx; o.bed.y=dragBed.y+o.dy; }
    draw();
    hidePlantTooltip();
    return;
  }
  if (mode==='select' || mode==='plant') {
    const {x,y}=getPos(e);
    let found=null;
    for (let i=getCurrentBeds().length-1;i>=0;i--) {
      const bed=getCurrentBeds()[i];
      for (let j=(bed.plants||[]).length-1;j>=0;j--) {
        const plant=bed.plants[j];
        const px=bed.x+rotX(plant.rx,plant.ry,bed.rotation||0);
        const py=bed.y+rotY(plant.rx,plant.ry,bed.rotation||0);
        if (pflanzeTrifft(plant, bed, x, y)) { found=plant; break; }
      }
      if (found) break;
    }
    if (found) showPlantTooltip(e, found); else hidePlantTooltip();
    if (mode==='plant') {
      const bedUnder = hitTest(x,y);
      const newHoverId = (bedUnder && plantWouldConflict(bedUnder, selectedPlantName)) ? bedUnder.id : null;
      if (newHoverId !== hoverConflictBedId) { hoverConflictBedId = newHoverId; draw(); }
    }
  } else {
    hidePlantTooltip();
  }
}
function showPlantTooltip(e, plant) {
  const tip = document.getElementById('plantTooltip');
  const wrap = document.getElementById('canvasWrap');
  const rect = wrap.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  const label = (plant.name||'unbenannt') + (plant.variety ? ` (${plant.variety})` : '');
  tip.textContent = `${plant.sym||''} ${label}`;
  tip.style.left = (cx - rect.left + 14) + 'px';
  tip.style.top = (cy - rect.top + 10) + 'px';
  tip.style.display = 'block';
}
function hidePlantTooltip() {
  const tip = document.getElementById('plantTooltip');
  if (tip) tip.style.display = 'none';
  if (hoverConflictBedId !== null) { hoverConflictBedId = null; draw(); }
}
let festTipp = null; // angetipptes fixiertes Element (Freipflanze, Pflanze in fixiertem Beet, fixiertes Beet)
function festTippAuswerten(e) {
  const t = festTipp; festTipp = null;
  if (!t) return false;
  const pkt = (e && e.changedTouches && e.changedTouches[0]) || e || {};
  const bewegt = Math.hypot((pkt.clientX || 0) - t.cx, (pkt.clientY || 0) - t.cy);
  if (bewegt > 12 || Date.now() - t.t > 800) return false; // war Scrollen oder langes Halten, kein Tipp
  festTippBehandelt = true;
  if (t.typ === 'buendel') { buendelAuswahlZeigen(t.b); return true; }
  if (t.typ === 'tier') { beobachtungBearbeiten(t.b.id); return true; }
  if (t.typ === 'notiz') { notizBearbeiten(t.n.id); return true; }
  if (t.typ === 'ff') { fruchtfolgeErklaeren(t.bed); return true; }
  if (t.typ === 'fp') { openFreiPflanzePanel(t.item); draw(); return true; }
  if (t.typ === 'pflanze') { selectedPlantOnCanvas = { bedId: t.bed.id, idx: t.idx }; openPlantPanel(t.bed, t.idx); draw(); return true; }
  if (t.typ === 'beet') { selectedBeds = [t.bed]; selectedBed = t.bed; showBedEditor(t.bed); hideBulkBar(); draw(); renderBedList(); return true; }
  return false;
}
canvas.addEventListener('touchcancel', () => { festTipp = null; });
function onUp(e) {
  if (messStart) {
    const ms = messStart; messStart = null;
    const pk = (e && e.changedTouches && e.changedTouches[0]) || e || {};
    if (TIPP_MODI.includes(mode) && Math.hypot((pk.clientX ?? ms.cx) - ms.cx, (pk.clientY ?? ms.cy) - ms.cy) <= 12) {
      festTippBehandelt = true; // kein Geister-Klick hinterher
      if (mode === 'messen') messTipp(ms.x, ms.y);
      else if (mode === 'giessen') giessTipp(ms.x, ms.y);
      else if (mode === 'tierort') tierOrtTipp(ms.x, ms.y);
    }
    return;
  }
  if (dragPunkt) { dragPunkt = null; saveData(); renderBedList(); return; }
  if (festTippAuswerten(e)) return;
  if (zoneDrawing) {
    zoneDrawing = false;
    const start = zoneDrawStart, cur = zoneDrawCur || zoneDrawStart;
    zoneDrawStart = null; zoneDrawCur = null;
    const x = Math.min(start.x, cur.x), y = Math.min(start.y, cur.y);
    const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y);
    if (w < 30 || h < 30) { showTempStatus('⚠ Bereich zu klein – bitte größer ziehen.', 4); draw(); return; }
    if (zoneNeuZeichnenId) {
      const zone = getCurrentZones().find(z => z.id === zoneNeuZeichnenId);
      zoneNeuZeichnenId = null;
      if (zone) {
        pushUndo();
        zone.x = x; zone.y = y; zone.w = w; zone.h = h;
        saveData();
        draw();
        renderZonenListe();
        setMode('select');
        showTempStatus('✓ Bereich „' + zone.name + '" aktualisiert', 4);
      }
      return;
    }
    const name = prompt('Name für diesen Bereich (z.B. "Garten Nord"):', `Bereich ${getCurrentZones().length + 1}`);
    if (!name || !name.trim()) { draw(); return; }
    pushUndo();
    getCurrentZones().push({ id: Date.now(), name: name.trim(), x, y, w, h });
    saveData();
    draw();
    renderZonenListe();
    setMode('select');
    showTempStatus('✓ Bereich „' + name.trim() + '" angelegt', 4);
    return;
  }
  if (dragFreiPflanze) {
    const dfp = dragFreiPflanze; dragFreiPflanze = null;
    if (!dfp.moved) {
      openFreiPflanzePanel(dfp.item);
      draw();
      return;
    }
    saveData(); draw(); renderFreiPflanzenList();
    showTempStatus('✓ Verschoben', 2);
    const zwWarnF = zwiebelWarnung(dfp.item.x, dfp.item.y, dfp.item, dfp.item.name);
    setTimeout(() => { if (zwWarnF) showTempStatus(zwWarnF, 7); else kronenWarnungZeigen(dfp.item); }, 2100);
    return;
  }
  if (dragPlant) {
    const dp = dragPlant; dragPlant = null;
    if (!dp.moved) {
      // war nur ein Klick, kein Drag -> Panel öffnen
      selectedPlantOnCanvas={bedId:dp.bed.id,idx:dp.idx};
      openPlantPanel(dp.bed, dp.idx);
      draw();
      return;
    }
    const target = dp.targetBed;
    if (target) {
      const angle=-(target.rotation||0)*Math.PI/180;
      const dx=dp.curX-target.x, dy=dp.curY-target.y;
      dp.plant.rx=dx*Math.cos(angle)-dy*Math.sin(angle);
      dp.plant.ry=dx*Math.sin(angle)+dy*Math.cos(angle);
      if (!target.plants) target.plants=[];
      target.plants.push(dp.plant);
      showTempStatus(target===dp.bed ? '✓ Pflanze verschoben' : `✓ Pflanze zu „${target.name||'Beet'}" verschoben`, 3);
      const zwWarnD = zwiebelWarnung(x, y, dp.plant, dp.plant.name);
      if (zwWarnD) setTimeout(() => showTempStatus(zwWarnD, 7), 1600);
      const mischConflict = plantHasConflict(target, target.plants.length-1);
      const rotConflict = target!==dp.bed ? getFruchtfolgeWarning(target, dp.plant.name) : null;
      if (mischConflict && rotConflict) {
        showTempStatus(`⚠ ${dp.plant.name}: Mischkultur-Konflikt UND Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} in „${target.name||'Beet'}".`, 8);
      } else if (mischConflict) {
        showTempStatus(`⚠ ${dp.plant.name} mag sich nicht mit allen Nachbarn im Beet – siehe ⚠ Symbol`, 6);
      } else if (rotConflict) {
        showTempStatus(`⚠ ${dp.plant.name}: Familie ${rotConflict.fam} stand ${rotConflict.yearsAgo===1?'letztes Jahr':`vor ${rotConflict.yearsAgo} Jahren`} (${rotConflict.year}) in „${target.name||'Beet'}" – Fruchtfolge-Pause empfohlen.`, 7);
      }
    } else {
      // außerhalb jedes Beets losgelassen -> zurück an Ursprungsort
      dp.bed.plants.splice(dp.idx,0,dp.plant);
    }
    hoverConflictBedId=null;
    saveData(); draw(); renderBedList(); updateStatus();
    return;
  }
  if(dragBed){dragBed=null;saveData();}
}

function finishFreehand() {
  if (freehandPoints.length < 3) { cancelFreehand(); return; }
  const cx = freehandPoints.reduce((s,p)=>s+p.x,0) / freehandPoints.length;
  const cy = freehandPoints.reduce((s,p)=>s+p.y,0) / freehandPoints.length;
  const elementTyp = document.getElementById('newElementTyp')?.value || 'beet';
  const preset = STRUKTUR_PRESETS[elementTyp] || STRUKTUR_PRESETS.beet;
  const name = document.getElementById('newName').value || `${preset.label} ${getCurrentBeds().length+1}`;
  const bed = {
    id: Date.now(), shape: 'freehand', x: cx, y: cy,
    points: freehandPoints.map(p => ({ x: p.x-cx, y: p.y-cy })),
    color: bedColor, name, rotation: 0, plants: []
  };
  if (elementTyp !== 'beet') { bed.kind = 'struktur'; bed.strukturTyp = elementTyp; }
  pushUndo();
  getCurrentBeds().push(bed);
  freehandDrawing = false; freehandPoints = [];
  document.getElementById('freehandControls').style.display = 'none';
  selectedBed = bed; selectedBeds = [bed];
  setMode('select');
  showBedEditor(bed); hideBulkBar(); draw(); renderBedList(); saveData(); updateStatus();
  showTempStatus(elementTyp === 'beet' ? '✓ Freiform-Beet angelegt' : `✓ Freiform-${preset.label} angelegt`, 3);
}
function cancelFreehand() {
  freehandDrawing = false; freehandPoints = [];
  document.getElementById('freehandControls').style.display = 'none';
  draw();
}
canvas.addEventListener('dblclick', (e) => {
  if (mode==='freehand' && freehandDrawing && freehandPoints.length>=3) { e.preventDefault(); finishFreehand(); }
});

function punktInDreieck(px,py, ax,ay, bx,by, cx,cy) {
  const vorzeichen = (px,py, ax,ay, bx,by) => (px-bx)*(ay-by) - (ax-bx)*(py-by);
  const d1 = vorzeichen(px,py, ax,ay, bx,by);
  const d2 = vorzeichen(px,py, bx,by, cx,cy);
  const d3 = vorzeichen(px,py, cx,cy, ax,ay);
  const hatNeg = (d1<0)||(d2<0)||(d3<0);
  const hatPos = (d1>0)||(d2>0)||(d3>0);
  return !(hatNeg && hatPos);
}
function hitTest(x,y) {
  for (let i=getCurrentBeds().length-1;i>=0;i--) {
    const bed=getCurrentBeds()[i];
    if (!bettSichtbar(bed)) continue; // ausgeblendete Ebene

    const angle=-(bed.rotation||0)*Math.PI/180;
    const dx=x-bed.x, dy=y-bed.y;
    const rx=dx*Math.cos(angle)-dy*Math.sin(angle);
    const ry=dx*Math.sin(angle)+dy*Math.cos(angle);
    if (bed.shape==='circle') {
      const radX = bed.rx ?? bed.r ?? 60, radY = bed.ry ?? bed.r ?? 60;
      if ((rx/radX)**2 + (ry/radY)**2 <= 1) return bed;
    }
    if (bed.shape==='rect'&&Math.abs(rx)<=bed.w/2&&Math.abs(ry)<=bed.h/2) return bed;
    if (bed.shape==='tri') {
      const w=bed.w, h=bed.h, apex=(bed.apexOffset||0)*(w/2);
      if (punktInDreieck(rx,ry, apex,-h/2, w/2,h/2, -w/2,h/2)) return bed;
    }
    if (bed.shape==='lshape'){
      const w=bed.w,h=bed.h,cw=Math.min(bed.cutW||0,w-1),ch=Math.min(bed.cutH||0,h-1);
      const insideOuter = Math.abs(rx)<=w/2 && Math.abs(ry)<=h/2;
      const insideCut = rx>=w/2-cw && rx<=w/2 && ry>=-h/2 && ry<=-h/2+ch;
      if (insideOuter && !insideCut) return bed;
    }
    if (bed.shape==='freehand' && bed.points && bed.points.length>=3 && pointInPolygon(rx,ry,bed.points)) return bed;
  }
  return null;
}

// ==================== MODE ====================
