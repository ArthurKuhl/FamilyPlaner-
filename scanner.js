// ============================================================================
// 📷 BARCODE-SCANNER (Einkauf, Vorratskammer)
// Nutzt die eingebaute Barcode-Erkennung des Browsers (Chrome/Android, Edge, Safari ab iOS 17)
// und schlägt das Produkt in der freien Datenbank Open Food Facts nach.
// Ohne Barcode-Erkennung (z.B. Firefox) kann die Nummer unter dem Strichcode eingetippt werden.
//
//   PlanerScanner.scannen().then(produkt => { if (produkt) … produkt.name, produkt.menge, produkt.code })
// ============================================================================
window.PlanerScanner = (function () {
  'use strict';
  const FORMATE = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

  function kannErkennen() { return 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  async function produktNachschlagen(code) {
    const url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) +
      '.json?fields=product_name,product_name_de,generic_name_de,brands,quantity,image_front_small_url';
    const res = await fetch(url);
    if (!res.ok && res.status !== 404) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || data.status !== 1 || !data.product) return { code, name: '', menge: '', marke: '', bild: '', gefunden: false };
    const p = data.product;
    const marke = (p.brands || '').split(',')[0].trim();
    let name = (p.product_name_de || p.product_name || p.generic_name_de || '').trim();
    if (marke && name && name.toLowerCase().indexOf(marke.toLowerCase()) === -1) name = marke + ' ' + name;
    return { code, name: name || marke, menge: (p.quantity || '').trim(), marke, bild: p.image_front_small_url || '', gefunden: !!(name || marke) };
  }

  function stil() {
    if (document.getElementById('planerScannerStil')) return;
    const st = document.createElement('style');
    st.id = 'planerScannerStil';
    st.textContent = `
      .scanner-bg { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; font-family: Inter, system-ui, sans-serif; color: #f0e8d8; }
      .scanner-rahmen { position: relative; width: min(420px, 100%); aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: #111; }
      .scanner-rahmen video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .scanner-linie { position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; background: #e8603c; box-shadow: 0 0 10px #e8603c; animation: scannerLinie 1.6s ease-in-out infinite alternate; }
      @keyframes scannerLinie { from { top: 30%; } to { top: 70%; } }
      .scanner-text { margin: 14px 0 10px; font-size: 0.9rem; text-align: center; max-width: 420px; line-height: 1.45; }
      .scanner-manuell { display: flex; gap: 8px; width: min(420px, 100%); }
      .scanner-manuell input { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 12px; border: none; font-size: 1rem; letter-spacing: 0.06em; }
      .scanner-manuell button, .scanner-zu { padding: 10px 14px; border-radius: 12px; border: none; background: #c46b41; color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
      .scanner-zu { margin-top: 14px; background: transparent; border: 1px solid #f0e8d8; color: #f0e8d8; }`;
    document.head.appendChild(st);
  }

  function scannen() {
    stil();
    return new Promise((fertig) => {
      let stream = null, timer = null, beendet = false, erkenner = null;
      const bg = document.createElement('div');
      bg.className = 'scanner-bg';
      const mitKamera = kannErkennen();
      bg.innerHTML =
        (mitKamera ? '<div class="scanner-rahmen"><video playsinline muted></video><div class="scanner-linie"></div></div>' : '') +
        '<div class="scanner-text">' + (mitKamera
          ? '📷 Strichcode in den Rahmen halten …'
          : '📷 Dieser Browser kann keine Strichcodes lesen (in der Chrome-App geht es).<br>Tippe stattdessen die Nummer unter dem Strichcode ein:') + '</div>' +
        '<div class="scanner-manuell"><input type="text" inputmode="numeric" placeholder="z.B. 4006040010309" aria-label="Strichcode-Nummer"><button type="button">Suchen</button></div>' +
        '<button type="button" class="scanner-zu">Abbrechen</button>';
      document.body.appendChild(bg);
      const textEl = bg.querySelector('.scanner-text');
      const eingabe = bg.querySelector('.scanner-manuell input');

      function aufraeumen() {
        beendet = true;
        clearInterval(timer);
        if (stream) stream.getTracks().forEach(t => t.stop());
        bg.remove();
      }
      async function codeGefunden(code) {
        if (beendet) return;
        clearInterval(timer);
        textEl.textContent = '🔎 ' + code + ' – suche Produkt …';
        try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
        try {
          const produkt = await produktNachschlagen(code);
          aufraeumen();
          fertig(produkt);
        } catch (e) {
          aufraeumen();
          fertig({ code, name: '', menge: '', marke: '', bild: '', gefunden: false, fehler: 'offline' });
        }
      }
      bg.querySelector('.scanner-zu').addEventListener('click', () => { aufraeumen(); fertig(null); });
      bg.querySelector('.scanner-manuell button').addEventListener('click', () => {
        const code = eingabe.value.replace(/\D/g, '');
        if (code.length >= 8) codeGefunden(code); else eingabe.focus();
      });
      eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') bg.querySelector('.scanner-manuell button').click(); });
      if (!mitKamera) { setTimeout(() => eingabe.focus(), 50); return; }

      (async () => {
        try {
          let formate = FORMATE;
          try { const moeglich = await window.BarcodeDetector.getSupportedFormats(); formate = FORMATE.filter(f => moeglich.includes(f)); } catch (e) {}
          erkenner = new window.BarcodeDetector({ formats: formate.length ? formate : FORMATE });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          if (beendet) { stream.getTracks().forEach(t => t.stop()); return; }
          const video = bg.querySelector('video');
          video.srcObject = stream;
          await video.play();
          timer = setInterval(async () => {
            if (beendet || video.readyState < 2) return;
            try {
              const treffer = await erkenner.detect(video);
              if (treffer && treffer.length && treffer[0].rawValue) codeGefunden(treffer[0].rawValue);
            } catch (e) {}
          }, 250);
        } catch (e) {
          textEl.innerHTML = '⚠ Kamera nicht verfügbar (' + String(e && e.name || e).replace(/[<>]/g, '') + ').<br>Nummer unter dem Strichcode eintippen:';
          const r = bg.querySelector('.scanner-rahmen'); if (r) r.remove();
          eingabe.focus();
        }
      })();
    });
  }

  return { scannen, produktNachschlagen, kannErkennen };
})();
