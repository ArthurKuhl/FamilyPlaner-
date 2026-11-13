// Gartenplaner – Wissen & Mehr: Saatgut, Vorrat, Shops, Tiere, Lexikon, Verwertung, Sync, Start
// Teil 4 von 4 des Garten-Skripts (aus garten.html ausgelagert, wird dort in dieser Reihenfolge geladen).
// ==================== SAATGUTINVENTAR ====================
let seedInventory = [];
function loadSeedInventory() {
  try { seedInventory = JSON.parse(localStorage.getItem('gartenplaner_seedInventory') || '[]') || []; }
  catch(e) { seedInventory = []; }
}
function saveSeedInventoryData() {
  try { localStorage.setItem('gartenplaner_seedInventory', JSON.stringify(seedInventory)); } catch(e) {}
}
function buildPlantNamesDatalist() {
  const dl = document.getElementById('plantNamesDatalist');
  if (!dl) return;
  dl.innerHTML = PLANTS.map(p => `<option value="${escapeHtml(p.name)}">`).join('');
}
function seedAgeInfo(year) {
  const y = parseInt(year, 10);
  if (!y || isNaN(y)) return { years: null, cls: '' };
  const nowY = new Date().getFullYear();
  const age = nowY - y;
  let cls = 'fresh', label = `${age} Jahr(e) alt`;
  if (age >= 4) cls = 'old';
  else if (age >= 2) cls = 'mid';
  if (age <= 0) label = 'diesjährig';
  return { years: age, cls, label };
}
function openSeedInventory() {
  renderSeedInventory();
  document.getElementById('seedInventoryModal').style.display = 'flex';
}
let seedFilter = 'alle';
function setSeedFilter(f) {
  seedFilter = f;
  ['alle','zuerst'].forEach(k => {
    document.getElementById('seedTab' + k[0].toUpperCase()+k.slice(1)).classList.toggle('active', k===f);
  });
  renderSeedInventory();
}
function renderSeedInventory() {
  const box = document.getElementById('seedInventoryContent');
  if (!seedInventory.length) {
    box.innerHTML = '<div class="empty-state">Noch kein Saatgut erfasst. Füge deinen ersten Eintrag hinzu.</div>';
    return;
  }
  let sorted = seedInventory.slice().sort((a,b) => {
    const ya = parseInt(a.year,10)||9999, yb = parseInt(b.year,10)||9999;
    if (ya !== yb) return ya - yb; // älteste zuerst
    return (a.plant||'').localeCompare(b.plant||'');
  });
  if (seedFilter === 'zuerst') {
    sorted = sorted.filter(e => { const age = seedAgeInfo(e.year); return age.cls === 'mid' || age.cls === 'old'; });
    if (!sorted.length) {
      box.innerHTML = '<div class="empty-state">🎉 Kein alterndes Saatgut – aktuell ist nichts vorrangig zu verbrauchen.</div>';
      return;
    }
  }
  box.innerHTML = sorted.map(e => {
    const age = seedAgeInfo(e.year);
    const borderCls = age.cls === 'old' ? 'seed-old' : (age.cls === 'mid' ? 'seed-mid' : '');
    const badge = age.years !== null ? `<span class="seed-age-badge ${age.cls}">${age.label}</span>` : '';
    return `<div class="seed-entry ${borderCls}">
      <div class="sd-name">${escapeHtml(e.plant)}${e.variety ? ' – ' + escapeHtml(e.variety) : ''}${badge}</div>
      <div class="sd-meta">${[e.amount, e.year ? 'von ' + escapeHtml(String(e.year)) : '', e.source].filter(Boolean).map(escapeHtml).join(' · ')}</div>
      ${e.location ? `<div class="sd-meta">📍 ${escapeHtml(e.location)}</div>` : ''}
      ${e.viability ? `<div class="sd-meta">🌱 ${escapeHtml(e.viability)}</div>` : ''}
      ${e.note ? `<div class="sd-meta">${escapeHtml(e.note)}</div>` : ''}
      <div class="sd-actions">
        <button onclick="openSeedForm('${e.id}')">Bearbeiten</button>
        <button onclick="deleteSeedEntry('${e.id}')">Löschen</button>
      </div>
    </div>`;
  }).join('');
}
function openSeedForm(id, prefillPlant) {
  const entry = id ? seedInventory.find(e => e.id === id) : null;
  document.getElementById('seedFormTitle').textContent = entry ? '🌰 Eintrag bearbeiten' : '🌰 Eintrag hinzufügen';
  document.getElementById('seedFormId').value = id || '';
  document.getElementById('seedFormPlant').value = entry ? entry.plant : (prefillPlant || '');
  document.getElementById('seedFormVariety').value = entry ? (entry.variety||'') : '';
  document.getElementById('seedFormAmount').value = entry ? (entry.amount||'') : '';
  document.getElementById('seedFormYear').value = entry ? (entry.year||'') : (prefillPlant ? String(new Date().getFullYear()) : '');
  document.getElementById('seedFormSource').value = entry ? (entry.source||'') : '';
  document.getElementById('seedFormLocation').value = entry ? (entry.location||'') : '';
  document.getElementById('seedFormViability').value = entry ? (entry.viability||'') : '';
  document.getElementById('seedFormNote').value = entry ? (entry.note||'') : '';
  document.getElementById('seedFormModal').style.display = 'flex';
}
function closeSeedForm() { document.getElementById('seedFormModal').style.display = 'none'; }
function saveSeedForm() {
  const plant = document.getElementById('seedFormPlant').value.trim();
  if (!plant) { document.getElementById('seedFormPlant').focus(); return; }
  const id = document.getElementById('seedFormId').value;
  const data = {
    plant,
    variety: document.getElementById('seedFormVariety').value.trim(),
    amount: document.getElementById('seedFormAmount').value.trim(),
    year: document.getElementById('seedFormYear').value.trim(),
    source: document.getElementById('seedFormSource').value,
    location: document.getElementById('seedFormLocation').value.trim(),
    viability: document.getElementById('seedFormViability').value.trim(),
    note: document.getElementById('seedFormNote').value.trim(),
  };
  if (id) {
    const e = seedInventory.find(e => e.id === id);
    if (e) Object.assign(e, data);
  } else {
    data.id = 'seed_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    seedInventory.push(data);
  }
  saveSeedInventoryData();
  closeSeedForm();
  renderSeedInventory();
  if (document.getElementById('sowingModal').style.display === 'flex') {
    renderSowingCalendar(document.getElementById('sowingSearch')?.value || '');
  }
  const sowingHintBox = document.getElementById('sowingHint');
  if (sowingHintBox && sowingHintBox.style.display === 'block' && selectedPlantOnCanvas) {
    renderSowingHint(selectedPlantOnCanvas.name || '');
  }
}
function deleteSeedEntry(id) {
  const index = seedInventory.findIndex(e => e.id === id);
  if (index === -1) return;
  const entfernt = seedInventory[index];
  seedInventory.splice(index, 1);
  saveSeedInventoryData();
  renderSeedInventory();
  zeigeLoeschToast('Saatgut-Eintrag gelöscht: „' + (entfernt.name || '') + '"', () => {
    seedInventory.splice(index, 0, entfernt);
    saveSeedInventoryData();
    renderSeedInventory();
  });
}

// ==================== WUNSCHLISTE ====================
let wishlist = [];
function loadWishlist() {
  try { wishlist = JSON.parse(localStorage.getItem('gartenplaner_wishlist') || '[]') || []; }
  catch(e) { wishlist = []; }
}
function saveWishlistData() {
  try { localStorage.setItem('gartenplaner_wishlist', JSON.stringify(wishlist)); } catch(e) {}
}
function openWishlist() {
  renderWishlist();
  document.getElementById('wishlistModal').style.display = 'flex';
}
let wishlistFilter = 'offen';
function setWishlistFilter(f) {
  wishlistFilter = f;
  ['Offen','Gekauft','Alle'].forEach(label => {
    document.getElementById('wishTab' + label).classList.toggle('active', label.toLowerCase() === f);
  });
  renderWishlist();
}
function renderWishlist() {
  const box = document.getElementById('wishlistContent');
  let liste = wishlist.slice();
  if (wishlistFilter === 'offen') liste = liste.filter(e => !e.gekauft);
  else if (wishlistFilter === 'gekauft') liste = liste.filter(e => e.gekauft);
  if (!liste.length) {
    box.innerHTML = '<div class="empty-state">' + (wishlistFilter === 'gekauft' ? 'Noch nichts als besorgt markiert.' : 'Noch keine Wünsche erfasst. Füge den ersten hinzu.') + '</div>';
    return;
  }
  const prioReihenfolge = { hoch: 0, mittel: 1, niedrig: 2 };
  liste.sort((a, b) => (prioReihenfolge[a.prioritaet] ?? 1) - (prioReihenfolge[b.prioritaet] ?? 1) || (a.name||'').localeCompare(b.name||''));
  const prioLabel = { hoch: '🔴 Hoch', mittel: '🟡 Mittel', niedrig: '🟢 Niedrig' };
  box.innerHTML = liste.map(e => {
    const links = (e.links || []).filter(l => l.url).map(l =>
      `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="display:inline-block;margin:3px 6px 0 0;padding:3px 10px;border-radius:12px;background:var(--cream);color:var(--moss);font-size:0.72rem;text-decoration:none;border:1px solid var(--moss)">🔗 ${escapeHtml(l.label || 'Link öffnen')}</a>`
    ).join('');
    return `<div class="seed-entry" style="${e.gekauft ? 'opacity:0.6' : ''}">
      <div class="sd-name">${e.gekauft ? '✅ ' : ''}${escapeHtml(e.name)}${e.variety ? ' – ' + escapeHtml(e.variety) : ''}</div>
      <div class="sd-meta">${[prioLabel[e.prioritaet] || '', e.hardy, e.standort, e.preis ? 'ca. ' + escapeHtml(e.preis) : ''].filter(Boolean).map(x => typeof x === 'string' ? x : escapeHtml(x)).join(' · ')}</div>
      ${e.note ? `<div class="sd-meta">${escapeHtml(e.note)}</div>` : ''}
      ${links ? `<div style="margin-top:4px">${links}</div>` : ''}
      <div class="sd-actions">
        <button onclick="wishlistGekauftUmschalten('${e.id}')">${e.gekauft ? 'Als offen markieren' : 'Als besorgt markieren'}</button>
        <button onclick="openWishlistForm('${e.id}')">Bearbeiten</button>
        <button onclick="deleteWishlistEntry('${e.id}')">Löschen</button>
      </div>
    </div>`;
  }).join('');
}
function wishlistGekauftUmschalten(id) {
  const e = wishlist.find(x => x.id === id);
  if (!e) return;
  e.gekauft = !e.gekauft;
  saveWishlistData();
  renderWishlist();
}
let wishlistLinkRows = [];
function renderWishlistLinkRows() {
  const box = document.getElementById('wishFormLinksListe');
  box.innerHTML = wishlistLinkRows.map((l, i) => `
    <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
      <input type="text" placeholder="Name (z.B. Baumschule Meier)" value="${escapeHtml(l.label)}" style="flex:1" oninput="wishlistLinkRows[${i}].label=this.value">
      <input type="url" placeholder="https://..." value="${escapeHtml(l.url)}" style="flex:1.4" oninput="wishlistLinkRows[${i}].url=this.value">
      <button type="button" onclick="wishlistLinkZeileEntfernen(${i})" style="flex:0 0 auto;background:none;border:none;color:var(--terracotta-text);font-size:1rem;cursor:pointer;padding:0 4px">✕</button>
    </div>`).join('');
}
function wishlistLinkZeileHinzufuegen() {
  wishlistLinkRows.push({ label: '', url: '' });
  renderWishlistLinkRows();
}
function wishlistLinkZeileEntfernen(i) {
  wishlistLinkRows.splice(i, 1);
  renderWishlistLinkRows();
}
function openWishlistForm(id) {
  const entry = id ? wishlist.find(e => e.id === id) : null;
  document.getElementById('wishFormTitle').textContent = entry ? '💚 Wunsch bearbeiten' : '💚 Wunsch hinzufügen';
  document.getElementById('wishFormId').value = id || '';
  document.getElementById('wishFormName').value = entry ? entry.name : '';
  document.getElementById('wishFormVariety').value = entry ? (entry.variety||'') : '';
  document.getElementById('wishFormHardy').value = entry ? (entry.hardy||'') : '';
  document.getElementById('wishFormStandort').value = entry ? (entry.standort||'') : '';
  document.getElementById('wishFormPrioritaet').value = entry ? (entry.prioritaet||'mittel') : 'mittel';
  document.getElementById('wishFormPreis').value = entry ? (entry.preis||'') : '';
  document.getElementById('wishFormNote').value = entry ? (entry.note||'') : '';
  document.getElementById('wishFormGekauft').checked = entry ? !!entry.gekauft : false;
  wishlistLinkRows = entry && entry.links && entry.links.length ? entry.links.map(l => ({ label: l.label||'', url: l.url||'' })) : [{ label: '', url: '' }];
  renderWishlistLinkRows();
  document.getElementById('wishlistFormModal').style.display = 'flex';
}
function closeWishlistForm() { document.getElementById('wishlistFormModal').style.display = 'none'; }
function saveWishlistForm() {
  const name = document.getElementById('wishFormName').value.trim();
  if (!name) { document.getElementById('wishFormName').focus(); return; }
  const id = document.getElementById('wishFormId').value;
  const data = {
    name,
    variety: document.getElementById('wishFormVariety').value.trim(),
    hardy: document.getElementById('wishFormHardy').value,
    standort: document.getElementById('wishFormStandort').value,
    prioritaet: document.getElementById('wishFormPrioritaet').value,
    preis: document.getElementById('wishFormPreis').value.trim(),
    note: document.getElementById('wishFormNote').value.trim(),
    gekauft: document.getElementById('wishFormGekauft').checked,
    links: wishlistLinkRows.filter(l => l.label.trim() || l.url.trim()).map(l => ({ label: l.label.trim(), url: l.url.trim() })),
  };
  if (id) {
    const e = wishlist.find(e => e.id === id);
    if (e) Object.assign(e, data);
  } else {
    data.id = 'wish_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    wishlist.push(data);
  }
  saveWishlistData();
  closeWishlistForm();
  renderWishlist();
}
function deleteWishlistEntry(id) {
  const index = wishlist.findIndex(e => e.id === id);
  if (index === -1) return;
  const entfernt = wishlist[index];
  wishlist.splice(index, 1);
  saveWishlistData();
  renderWishlist();
  zeigeLoeschToast('Wunschlisten-Eintrag gelöscht', () => {
    wishlist.splice(index, 0, entfernt);
    saveWishlistData();
    renderWishlist();
  });
}

// ==================== KOSTENÜBERSICHT ====================
let costEntries = [];
let costYear = 'all';
function loadCosts() {
  try { costEntries = JSON.parse(localStorage.getItem('gartenplaner_costs') || '[]') || []; }
  catch(e) { costEntries = []; }
}
// Aggregiert Erntemengen (aktueller Garten) für ein Jahr ('all' = alle Jahre) auf kg,
// nicht-gewichtsbasierte Einheiten (Stück, Bund, Liter) werden separat aufsummiert.
function getHarvestKgForYear(year) {
  const entries = getAllHarvestEntries();
  let kg = 0; const otherUnits = {};
  entries.forEach(e => {
    if (year !== 'all' && (e.date||'').slice(0,4) !== year) return;
    const n = normalizeHarvestUnit(e.unit, e.amount);
    if (n.unit === 'kg') kg += n.amount;
    else otherUnits[n.unit] = (otherUnits[n.unit]||0) + n.amount;
  });
  return { kg, otherUnits };
}
function saveCosts() {
  try { localStorage.setItem('gartenplaner_costs', JSON.stringify(costEntries)); } catch(e) {}
}
function openCostTracker() {
  const years = [...new Set(costEntries.map(e => (e.date||'').slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
  costYear = years.length ? years[0] : 'all';
  renderCostTracker();
  document.getElementById('costModal').style.display = 'flex';
}
function setCostYear(y) { costYear = y; renderCostTracker(); }
function renderCostTracker() {
  const yearsBox = document.getElementById('costYears');
  const box = document.getElementById('costContent');
  if (!costEntries.length) {
    yearsBox.innerHTML = '';
    box.innerHTML = '<div class="empty-state">Noch keine Ausgabe erfasst. Füge deine erste hinzu.</div>';
    return;
  }
  const years = [...new Set(costEntries.map(e => (e.date||'').slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
  yearsBox.innerHTML = years.map(y => `<button class="nav-btn${costYear===y?' active':''}" style="padding:5px 12px;font-size:0.72rem" onclick="setCostYear('${y}')">${y}</button>`).join('')
    + `<button class="nav-btn${costYear==='all'?' active':''}" style="padding:5px 12px;font-size:0.72rem" onclick="setCostYear('all')">Alle Jahre</button>`;

  const shown = (costYear === 'all' ? costEntries : costEntries.filter(e => (e.date||'').slice(0,4) === costYear))
    .slice().sort((a,b) => (a.date < b.date ? 1 : -1));

  const total = shown.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
  const byCat = {};
  shown.forEach(e => { byCat[e.category||'Sonstiges'] = (byCat[e.category||'Sonstiges']||0) + (parseFloat(e.amount)||0); });

  let html = `<div style="font-size:0.9rem;color:var(--moss);font-weight:700;margin-bottom:10px">Summe ${costYear==='all'?'(alle Jahre)':costYear}: ${total.toFixed(2)} €</div>`;

  // ---- Bilanz: Ausgaben vs. Ernte (aktueller Garten) ----
  const harvestInfo = getHarvestKgForYear(costYear);
  const otherUnitsLabel = Object.entries(harvestInfo.otherUnits).map(([u,n]) => `${n%1===0?n:n.toFixed(2)} ${u}`).join(' · ');
  const costPerKg = harvestInfo.kg > 0 ? (total / harvestInfo.kg) : null;
  html += `<div style="background:var(--cream);border-radius:9px;padding:10px 12px;margin-bottom:14px">
    <div style="font-size:0.8rem;font-weight:600;color:var(--soil);margin-bottom:6px">⚖️ Bilanz ${costYear==='all'?'(alle Jahre)':costYear} <span style="font-weight:400;color:var(--bark);font-size:0.66rem">– Ernte aus aktuellem Garten</span></div>
    <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px"><span>🧾 Ausgaben</span><strong>${total.toFixed(2)} €</strong></div>
    <div style="display:flex;justify-content:space-between;font-size:0.78rem"><span>🧺 Ernte</span><strong>${harvestInfo.kg>0 ? (harvestInfo.kg%1===0?harvestInfo.kg:harvestInfo.kg.toFixed(2))+' kg' : (otherUnitsLabel?'–':'–')}${otherUnitsLabel?(harvestInfo.kg>0?' · ':'')+otherUnitsLabel:''}</strong></div>
    ${costPerKg !== null ? `<div style="display:flex;justify-content:space-between;font-size:0.78rem;padding-top:5px;margin-top:4px;border-top:1px solid var(--parchment)"><span>≈ Kosten pro kg Ernte</span><strong style="color:var(--moss)">${costPerKg.toFixed(2)} €/kg</strong></div>` : ''}
    ${(total>0 && harvestInfo.kg===0) ? `<div style="font-size:0.68rem;color:var(--bark);margin-top:4px">Noch keine Ernte in kg für diesen Zeitraum erfasst.</div>` : ''}
  </div>`;

  if (years.length > 1) {
    const costByYear = {}, kgByYear2 = {};
    years.forEach(y => {
      costByYear[y] = costEntries.filter(e => (e.date||'').slice(0,4)===y).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
      kgByYear2[y] = getHarvestKgForYear(y).kg;
    });
    const maxCost = Math.max(...Object.values(costByYear), 0.01);
    const maxKg2 = Math.max(...Object.values(kgByYear2), 0.01);
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Jahresvergleich</div>`;
    html += years.slice().reverse().map(y => `
      <div style="margin-bottom:8px">
        <div style="font-size:0.7rem;color:var(--bark);margin-bottom:2px">${y}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          <span style="width:16px;font-size:0.68rem">🧾</span>
          <div style="flex:1;height:8px;border-radius:5px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${(costByYear[y]/maxCost)*100}%;background:#c0765a"></div></div>
          <span style="width:64px;text-align:right;font-size:0.68rem;color:var(--bark)">${costByYear[y].toFixed(2)} €</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="width:16px;font-size:0.68rem">🧺</span>
          <div style="flex:1;height:8px;border-radius:5px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${(kgByYear2[y]/maxKg2)*100}%;background:var(--moss)"></div></div>
          <span style="width:64px;text-align:right;font-size:0.68rem;color:var(--bark)">${kgByYear2[y]%1===0?kgByYear2[y]:kgByYear2[y].toFixed(1)} kg</span>
        </div>
      </div>`).join('');
  }

  const catEntries = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  if (catEntries.length) {
    const maxVal = Math.max(...catEntries.map(c=>c[1]));
    html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:6px;color:var(--soil)">Nach Kategorie</div>`;
    html += catEntries.map(([cat, val]) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:150px;font-size:0.72rem;color:var(--bark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(cat)}</span>
        <div style="flex:1;height:10px;border-radius:6px;background:var(--parchment);overflow:hidden"><div style="height:100%;width:${maxVal>0?(val/maxVal)*100:0}%;background:var(--moss)"></div></div>
        <span style="width:64px;text-align:right;font-size:0.72rem;color:var(--bark)">${val.toFixed(2)} €</span>
      </div>`).join('');
  }

  html += `<div style="font-size:0.8rem;font-weight:600;margin:14px 0 6px;color:var(--soil)">Einzelposten</div>`;
  html += shown.map(e => `
    <div class="shop-entry">
      <div class="se-name">${escapeHtml(e.item)} <span style="color:var(--moss);font-weight:700">${(parseFloat(e.amount)||0).toFixed(2)} €</span></div>
      <div class="se-meta">${[e.date, e.category].filter(Boolean).map(escapeHtml).join(' · ')}</div>
      ${e.note ? `<div class="se-meta">${escapeHtml(e.note)}</div>` : ''}
      <div class="se-actions">
        <button onclick="openCostForm('${e.id}')">Bearbeiten</button>
        <button onclick="deleteCostEntry('${e.id}')">Löschen</button>
      </div>
    </div>`).join('') || '<div class="empty-state">Keine Einträge in diesem Zeitraum.</div>';

  box.innerHTML = html;
}
function openCostForm(id) {
  const entry = id ? costEntries.find(e => e.id === id) : null;
  document.getElementById('costFormTitle').textContent = entry ? '🧾 Ausgabe bearbeiten' : '🧾 Ausgabe hinzufügen';
  document.getElementById('costFormId').value = id || '';
  document.getElementById('costFormItem').value = entry ? entry.item : '';
  document.getElementById('costFormAmount').value = entry ? entry.amount : '';
  document.getElementById('costFormDate').value = entry ? (entry.date||'') : new Date().toISOString().slice(0,10);
  document.getElementById('costFormCategory').value = entry ? (entry.category||'Saatgut') : 'Saatgut';
  document.getElementById('costFormNote').value = entry ? (entry.note||'') : '';
  document.getElementById('costFormModal').style.display = 'flex';
}
function closeCostForm() { document.getElementById('costFormModal').style.display = 'none'; }
function saveCostForm() {
  const item = document.getElementById('costFormItem').value.trim();
  const amount = parseFloat(document.getElementById('costFormAmount').value);
  if (!item || isNaN(amount) || amount < 0) {
    showTempStatus('⚠ Bitte Bezeichnung und einen gültigen Betrag eingeben.', 5);
    return;
  }
  const id = document.getElementById('costFormId').value;
  const data = {
    item, amount,
    date: document.getElementById('costFormDate').value,
    category: document.getElementById('costFormCategory').value,
    note: document.getElementById('costFormNote').value.trim(),
  };
  if (id) {
    const e = costEntries.find(e => e.id === id);
    if (e) Object.assign(e, data);
  } else {
    data.id = 'cost_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    costEntries.push(data);
  }
  saveCosts();
  closeCostForm();
  renderCostTracker();
}
function deleteCostEntry(id) {
  const index = costEntries.findIndex(e => e.id === id);
  if (index === -1) return;
  const entfernt = costEntries[index];
  costEntries.splice(index, 1);
  saveCosts();
  renderCostTracker();
  zeigeLoeschToast('Ausgabe gelöscht', () => {
    costEntries.splice(index, 0, entfernt);
    saveCosts();
    renderCostTracker();
  });
}

// ==================== VORRATSLISTE ====================
let pantryEntries = [];
let pantryFilter = 'vorhanden';
function loadPantry() {
  try { pantryEntries = JSON.parse(localStorage.getItem('gartenplaner_pantry') || '[]') || []; }
  catch(e) { pantryEntries = []; }
  vorratslisteUmziehen();
}
// Die frühere Garten-Vorratsliste ist in die Vorratskammer umgezogen: noch vorhandene Einträge
// landen einmalig im Eingang der Vorratskammer (dort einsortieren), danach ist die Garten-Liste leer.
function vorratslisteUmziehen() {
  if (!pantryEntries.length) return;
  const offen = pantryEntries.filter(e => !e.consumed && e.item);
  let ok = true;
  offen.forEach(e => {
    const notiz = [e.location ? 'Lagerort: ' + e.location : '', e.note || '', e.date ? 'eingelagert am ' + new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE') : ''].filter(Boolean).join(' · ');
    if (!ernteInVorratskammer(e.item, e.amount || '', '', null, { methode: e.method || '', verfall: e.useBy || '', notiz, still: true })) ok = false;
  });
  if (!ok) return; // bei Fehler lieber nichts löschen
  pantryEntries = [];
  savePantry();
  if (offen.length) {
    setTimeout(() => { if (window._vorratSync) window._vorratSync.melde(); }, 4000);
    setTimeout(() => showTempStatus('🥫 ' + offen.length + ' Vorrat/Vorräte aus dem Garten liegen jetzt im Eingang der Vorratskammer', 7, { label: 'Öffnen', aktion: zurVorratskammer }), 1500);
  }
}
function savePantry() {
  try { localStorage.setItem('gartenplaner_pantry', JSON.stringify(pantryEntries)); } catch(e) {}
}
function openPantry() {
  renderPantry();
  document.getElementById('pantryModal').style.display = 'flex';
}
function setPantryFilter(f) {
  pantryFilter = f;
  ['vorhanden','verbraucht','alle'].forEach(k => {
    document.getElementById('pantryTab' + k[0].toUpperCase()+k.slice(1)).classList.toggle('active', k===f);
  });
  renderPantry();
}
function renderPantry() {
  const box = document.getElementById('pantryContent');
  let shown = pantryEntries.slice();
  if (pantryFilter === 'vorhanden') shown = shown.filter(e => !e.consumed);
  else if (pantryFilter === 'verbraucht') shown = shown.filter(e => e.consumed);
  shown.sort((a,b) => {
    if (!!a.consumed !== !!b.consumed) return a.consumed ? 1 : -1;
    const ua = a.useBy || '9999', ub = b.useBy || '9999';
    if (ua !== ub) return ua < ub ? -1 : 1;
    return (b.date||'') < (a.date||'') ? -1 : 1;
  });
  if (!shown.length) {
    box.innerHTML = `<div class="empty-state">${pantryEntries.length ? 'Keine Einträge in dieser Ansicht.' : 'Noch nichts eingelagert. Füge deinen ersten Vorrat hinzu.'}</div>`;
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  box.innerHTML = shown.map(e => {
    const soonExpiring = !e.consumed && e.useBy && e.useBy <= today;
    return `<div class="shop-entry${e.consumed?' pantry-consumed':''}" ${soonExpiring?'style="border-left-color:var(--warn)"':''}>
      <div class="se-name">${escapeHtml(e.item)} ${e.consumed ? '<span style="font-size:0.68rem;color:var(--bark)">(verbraucht)</span>' : ''}</div>
      <div class="se-meta">${[e.method, e.amount, e.date].filter(Boolean).map(escapeHtml).join(' · ')}</div>
      ${e.useBy ? `<div class="se-meta">${soonExpiring?'⚠️':'⏳'} Haltbar bis ${escapeHtml(e.useBy)}</div>` : ''}
      ${e.location ? `<div class="se-meta">📍 ${escapeHtml(e.location)}</div>` : ''}
      ${e.note ? `<div class="se-meta">${escapeHtml(e.note)}</div>` : ''}
      <div class="se-actions">
        ${!e.consumed ? `<button onclick="togglePantryConsumed('${e.id}')">Als verbraucht markieren</button>` : `<button onclick="togglePantryConsumed('${e.id}')">Zurück auf vorhanden</button>`}
        <button onclick="openPantryForm('${e.id}')">Bearbeiten</button>
        <button onclick="deletePantryEntry('${e.id}')">Löschen</button>
      </div>
    </div>`;
  }).join('');
}
function togglePantryConsumed(id) {
  const e = pantryEntries.find(e => e.id === id);
  if (!e) return;
  e.consumed = !e.consumed;
  savePantry();
  renderPantry();
}
const PANTRY_WARNING_DAYS = 14;
function getExpiringPantryItems() {
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = new Date(today.getTime() + PANTRY_WARNING_DAYS * 86400000);
  return pantryEntries
    .filter(e => !e.consumed && e.useBy)
    .map(e => ({ ...e, useByDate: new Date(e.useBy) }))
    .filter(e => !isNaN(e.useByDate.getTime()) && e.useByDate <= limit)
    .sort((a,b) => a.useByDate - b.useByDate);
}
function getSeedsToSowSoon() {
  const seenPlants = new Set();
  const result = [];
  seedInventory.forEach(entry => {
    const plant = (entry.plant || '').trim();
    if (!plant || seenPlants.has(plant)) return;
    const s = SOWING[plant];
    if (!s) return;
    const urgency = getSowingUrgency([s.vorziehen, s.direktsaat, s.auspflanzen]);
    if (urgency.active || (urgency.soonDays !== null && urgency.soonDays <= SEED_WARNING_DAYS)) {
      seenPlants.add(plant);
      result.push({ plant, active: urgency.active, soonDays: urgency.soonDays });
    }
  });
  return result.sort((a,b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.soonDays ?? 0) - (b.soonDays ?? 0);
  });
}
function openPantryFromHome() {
  showView('home'); // no-op falls schon home, hält Kontext konsistent
  openPantry();
}
function openPantryForm(id, prefill) {
  const entry = id ? pantryEntries.find(e => e.id === id) : null;
  document.getElementById('pantryFormTitle').textContent = entry ? '🥫 Vorrat bearbeiten' : '🥫 Vorrat hinzufügen';
  document.getElementById('pantryFormId').value = id || '';
  document.getElementById('pantryFormItem').value = entry ? entry.item : (prefill ? prefill.item : '');
  document.getElementById('pantryFormMethod').value = entry ? (entry.method||'Eingekocht') : (prefill && prefill.method ? prefill.method : 'Eingekocht');
  document.getElementById('pantryFormAmount').value = entry ? (entry.amount||'') : (prefill ? prefill.amount : '');
  document.getElementById('pantryFormDate').value = entry ? (entry.date||'') : (prefill && prefill.date ? prefill.date : new Date().toISOString().slice(0,10));
  document.getElementById('pantryFormUseBy').value = entry ? (entry.useBy||'') : '';
  document.getElementById('pantryFormLocation').value = entry ? (entry.location||'') : '';
  document.getElementById('pantryFormNote').value = entry ? (entry.note||'') : (prefill ? 'Aus Erntebuch übernommen' : '');
  document.getElementById('pantryFormModal').style.display = 'flex';
  if (prefill) setTimeout(() => document.getElementById('pantryFormMethod').focus(), 50);
}
function addHarvestToPantry(bedId, plantIdx, hIdx) {
  const bed = getCurrentBeds().find(b => b.id === bedId);
  const plant = bed && bed.plants[plantIdx];
  const h = plant && plant.harvests && plant.harvests[hIdx];
  if (!h) { showTempStatus('⚠ Ernte-Eintrag nicht gefunden.', 4); return; }
  const name = (plant.name || '').trim() || 'Unbenannt';
  const amountStr = `${h.amount % 1 === 0 ? h.amount : h.amount} ${h.unit}`;
  const HARVEST_METHOD_TO_PANTRY = {
    einkochen: 'Eingekocht', marmelade: 'Eingekocht', saft: 'Eingekocht', einlegen: 'Eingekocht',
    fermentieren: 'Fermentiert', trocknen: 'Getrocknet', einfrieren: 'Eingefroren',
  };
  const pantryMethod = HARVEST_METHOD_TO_PANTRY[h.method] || null;
  ernteInVorratskammer(name, h.amount, h.unit, h.date, { methode: pantryMethod, notiz: h.note || '' });
}
function closePantryForm() { document.getElementById('pantryFormModal').style.display = 'none'; }
function savePantryForm() {
  const item = document.getElementById('pantryFormItem').value.trim();
  if (!item) { document.getElementById('pantryFormItem').focus(); return; }
  const id = document.getElementById('pantryFormId').value;
  const data = {
    item,
    method: document.getElementById('pantryFormMethod').value,
    amount: document.getElementById('pantryFormAmount').value.trim(),
    date: document.getElementById('pantryFormDate').value,
    useBy: document.getElementById('pantryFormUseBy').value,
    location: document.getElementById('pantryFormLocation').value.trim(),
    note: document.getElementById('pantryFormNote').value.trim(),
  };
  if (id) {
    const e = pantryEntries.find(e => e.id === id);
    if (e) Object.assign(e, data);
  } else {
    data.id = 'pantry_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    data.consumed = false;
    pantryEntries.push(data);
  }
  savePantry();
  closePantryForm();
  renderPantry();
}
function deletePantryEntry(id) {
  const index = pantryEntries.findIndex(e => e.id === id);
  if (index === -1) return;
  const entfernt = pantryEntries[index];
  pantryEntries.splice(index, 1);
  savePantry();
  renderPantry();
  zeigeLoeschToast('Vorrats-Eintrag gelöscht', () => {
    pantryEntries.splice(index, 0, entfernt);
    savePantry();
    renderPantry();
  });
}

// ==================== VIEWS / NAVIGATION ====================
const WISSEN_ANSICHTEN = ['tips', 'tiere', 'preserve'];
function showView(name) {
  if (WISSEN_ANSICHTEN.includes(name)) {
    try { localStorage.setItem('garten_wissenAnsicht', name); } catch (e) {}
    document.querySelectorAll('[data-wissen]').forEach(b => b.classList.toggle('an', b.dataset.wissen === name));
  }
  if (name === 'wissen') name = 'lexikon';
  // Unterseiten leuchten unter ihrem Bereich in der Navigation auf
  const NAV_BEREICH = { tips: 'lexikon', tiere: 'lexikon', preserve: 'lexikon', album: 'planen', shops: 'mehr' };
  const navName = NAV_BEREICH[name] || name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    const active = b.dataset.view === navName;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  // Auf dem Handy die aktive Schaltfläche in der waagerecht scrollbaren Leiste sichtbar halten
  const aktiverNavBtn = document.querySelector('.main-nav .nav-btn.active');
  if (aktiverNavBtn && aktiverNavBtn.parentElement) {
    const leiste = aktiverNavBtn.parentElement;
    leiste.scrollTo({ left: Math.max(0, aktiverNavBtn.offsetLeft - (leiste.clientWidth - aktiverNavBtn.offsetWidth) / 2), behavior: 'smooth' });
  }
  if (name === 'garden') { resizeCanvas(); }
  setTimeout(positioniereZoomWidget, 30);
  const statusMsgEl = document.getElementById('statusMsg');
  if (statusMsgEl) statusMsgEl.style.display = 'none'; // Anzeige auf Arthurs Wunsch dauerhaft entfernt, hatte Kopfzeile durcheinandergebracht
  if (name === 'shops') { renderShops(); }
  if (name === 'tips' && !document.getElementById('tipsWrap').dataset.built) { renderTips(); }
  if (name === 'preserve') { renderPreserveView(); }
  if (name === 'tiere') { renderTiere(); }
  if (name === 'album') { renderAlbum(); }
  if (name === 'home') { renderHomeOverview(); }
  if (name === 'planen' || name === 'lexikon' || name === 'mehr') { hubRendern(name); }
  // Merken, damit ein Neuladen (z.B. durch Pull-to-refresh) in derselben Ansicht landet
  // statt immer wieder auf der Startübersicht.
  try { localStorage.setItem('garten_aktiveAnsicht', name); } catch (e) {}
}
function openCarePlanFromHome() {
  showView('garden');
  setTimeout(() => openCarePlan(), 60);
}

// ==================== 🍳 ERNTE → KOCHEN ====================
// Sucht in den Rezepten des Kochen-Moduls (kochen_rezepte, gleicher Speicher) nach Gerichten mit dem,
// was gerade geerntet wurde, erntereif ist oder Saison hat.
const ERNTE_SUCHWORT = { 'Lauch (Porree)': ['lauch', 'porree'], 'Rote Bete': ['rote bete', 'rote beete', 'randen'], 'Bohnen': ['bohne'], 'Erbsen': ['erbse'],
  'Apfelbaum': ['apfel', 'äpfel'], 'Birnbaum': ['birne'], 'Kirschbaum': ['kirsche'], 'Pflaumenbaum': ['pflaume'], 'Zwetschge': ['zwetsch'], 'Physalis (Andenbeere)': ['physalis'],
  'Studentenblume (Tagetes)': [], 'Kartoffel': ['kartoffel'], 'Süßkartoffel': ['süßkartoffel'], 'Salat': ['salat', 'kopfsalat', 'eisberg'], 'Chili': ['chili', 'peperoni'], 'Kräuter': [] };
function ernteSuchworte(name) {
  const k = lexKatalogName(name);
  if (ERNTE_SUCHWORT[k]) return ERNTE_SUCHWORT[k];
  let w = k.toLowerCase().replace(/\s*\(.*\)$/, '').replace(/n?baum$/, '');
  if (w.length > 5) w = w.replace(/(en|n|e)$/, '');
  return w.length >= 3 ? [w] : [];
}
function kochRezepte() { try { const l = JSON.parse(localStorage.getItem('kochen_rezepte') || '[]'); return Array.isArray(l) ? l.filter(r => r && r.id && r.titel) : []; } catch (e) { return []; } }
function rezepteMit(namenGewichte) { // { 'Zucchini': 3, ... } → [{ r, punkte, mit: [...] }]
  const rezepte = kochRezepte();
  if (!rezepte.length) return [];
  const worte = Object.keys(namenGewichte).map(n => ({ n, w: namenGewichte[n], s: ernteSuchworte(n) })).filter(x => x.s.length);
  return rezepte.map(r => {
    const zut = (r.zutaten || []).map(z => String(z && z.name || '').toLowerCase()).join(' | ') + ' | ' + String(r.titel).toLowerCase();
    const mit = worte.filter(x => x.s.some(s => zut.includes(s)));
    return { r, mit: mit.map(x => lexKatalogName(x.n)), punkte: mit.reduce((a, x) => a + x.w, 0) + (r.bewertung || 0) * 0.1 };
  }).filter(x => x.mit.length).sort((a, b) => b.punkte - a.punkte || a.r.titel.localeCompare(b.r.titel, 'de'));
}
function ernteJetztGewichte() {
  const g = {};
  const add = (n, w) => { if (!n) return; const k = lexKatalogName(n.trim()); g[k] = Math.max(g[k] || 0, w); };
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const grenze = new Date(heute.getTime() - 10 * 86400000).toISOString().slice(0, 10);
  const monat = heute.getMonth() + 1;
  Object.values(gardens || {}).forEach(gd => {
    const alle = [...(gd.beds || []).flatMap(b => b.plants || []), ...(gd.freiPflanzen || [])];
    alle.forEach(p => {
      if ((p.harvests || []).some(h => (h.date || '') >= grenze)) add(p.name, 3);          // frisch geerntet
      else if (isInHarvestWindow(HARVEST_WINDOW[lexKatalogName(p.name || '')], monat)) add(p.name, 1); // hat gerade Saison
    });
  });
  (lastCareItems || []).filter(i => i.kind === 'harvest' && i.urgent).forEach(i => add(i.plant, 2)); // erntereif
  return g;
}
function rezeptImKochenOeffnen(id) {
  try { localStorage.setItem('kochen_rezeptOeffnen', id); } catch (e) {}
  if (window.parent && window.parent !== window) {
    try { window.parent.postMessage({ type: 'navigiere', modul: 'kochen' }, window.location.origin); } catch (e) {}
  } else window.location.href = 'kochen.html';
}
function rezeptZeileHtml(x) {
  const foto = x.r.fotoUrl || x.r.foto || '';
  return `<button type="button" class="koch-zeile" onclick="rezeptImKochenOeffnen('${String(x.r.id).replace(/'/g, '')}')">
    <span class="koch-bild">${foto ? `<img src="${escapeHtml(foto)}" alt="" loading="lazy">` : '🍳'}</span>
    <span class="koch-text"><b>${escapeHtml(x.r.titel)}</b><span>mit ${x.mit.map(escapeHtml).join(', ')}${x.r.zeit ? ' · ⏱ ' + escapeHtml(String(x.r.zeit)) + ' Min.' : ''}</span></span><span class="lex-pfeil">›</span></button>`;
}
function ernteKochenHtml() {
  const vorschlaege = rezepteMit(ernteJetztGewichte()).slice(0, 3);
  if (!vorschlaege.length) return '';
  return `<div class="heute-box"><div class="heute-titel">🍳 Aus deiner Ernte kochen</div>${vorschlaege.map(rezeptZeileHtml).join('')}</div>`;
}

// ==================== 🛒 SAATGUT FEHLT → EINKAUFSLISTE ====================
// Pflanzen, die fürs kommende Jahr vorgemerkt sind oder zuletzt im Garten standen, deren Aussaat
// (Vorziehen/Direktsaat) läuft oder in den nächsten 6 Wochen beginnt – aber ohne Saatgut im Inventar.
const SAAT_FEHLT_TAGE = 42;
const SAAT_HINWEIS_AUS_KEY = 'garten_saatHinweisAus'; // { Pflanze: Jahr } – „nicht mehr erinnern“ für diese Saison
function saatgutFehltBald() {
  const jahr = new Date().getFullYear(), monat = new Date().getMonth() + 1;
  let aus = {}; try { aus = JSON.parse(localStorage.getItem(SAAT_HINWEIS_AUS_KEY) || '{}') || {}; } catch (e) {}
  const vorhanden = new Set((seedInventory || []).map(e => lexKatalogName((e.plant || '').trim())));
  let einkauf = []; try { einkauf = JSON.parse(localStorage.getItem('einkauf_listen') || '[]') || []; } catch (e) {}
  const schonAufListe = n => einkauf.some(l => (l.items || []).some(i => !i.erledigt && (i.name || '').toLowerCase().includes(n.toLowerCase()) && /saat|samen/i.test(i.name || '')));
  const kandidaten = {};
  const ziel = jahresplanZieljahr();
  Object.values(gardens || {}).forEach(g => (g.beds || []).forEach(b => {
    if (b.jahresplan && b.jahresplan.jahr >= jahr) (b.jahresplan.pflanzen || []).forEach(n => { kandidaten[lexKatalogName(n)] = 'vorgemerkt für ' + b.jahresplan.jahr; });
    [...(b.plants || []).map(p => ({ name: p.name, jahr })), ...(b.history || []).map(h => ({ name: h.name, jahr: getYearOf(h) }))]
      .filter(e => e.name && e.jahr >= jahr - 1).forEach(e => { const k = lexKatalogName(e.name); if (!kandidaten[k]) kandidaten[k] = 'habt ihr ' + (e.jahr === jahr ? 'dieses' : 'letztes') + ' Jahr angebaut'; });
  }));
  const out = [];
  Object.entries(kandidaten).forEach(([n, grund]) => {
    const so = SOWING[n];
    if (!so || isPerennial(n) || vorhanden.has(n) || aus[n] === jahr || schonAufListe(n)) return;
    let best = null;
    [['vorziehen', so.vorziehen], ['direktsaat', so.direktsaat]].forEach(([art, roh]) => {
      const r = adjustRange(roh);
      if (!r) return;
      if (isInWindow(r, monat)) { if (!best || best.tage > 0) best = { art, tage: 0, r }; return; }
      const d = daysUntilRangeStart(r);
      if (d !== null && d >= 0 && d <= SAAT_FEHLT_TAGE && (!best || d < best.tage)) best = { art, tage: d, r };
    });
    if (best) out.push({ name: n, sym: (PLANTS.find(p => p.name === n) || {}).sym || '🌱', grund, ...best });
  });
  return out.sort((a, b) => a.tage - b.tage || a.name.localeCompare(b.name, 'de'));
}
function saatgutAufEinkaufsliste(name) {
  try {
    let listen = JSON.parse(localStorage.getItem('einkauf_listen') || '[]') || [];
    if (!listen.length) listen = [{ id: 'l' + Date.now(), name: 'Wocheneinkauf', items: [] }];
    const aktivId = localStorage.getItem('einkauf_aktiveListe');
    const liste = listen.find(l => l.id === aktivId) || listen[0];
    liste.items = liste.items || [];
    liste.items.push({ id: 'i' + Date.now() + Math.random().toString(36).slice(2, 7), name: name + ' Saatgut', menge: '1', einheit: 'Tüte', kategorie: 'sonstiges', erledigt: false, hinzugefuegtVon: gartenIchBin() || null });
    localStorage.setItem('einkauf_listen', JSON.stringify(listen));
    if (window._einkaufSync) window._einkaufSync.melde();
    showTempStatus('🛒 „' + name + ' Saatgut“ steht auf „' + (liste.name || 'Einkaufsliste') + '“', 5);
  } catch (e) { showTempStatus('⚠ Konnte nicht zur Einkaufsliste hinzugefügt werden.', 5); }
  renderHomeOverview();
}
function saatgutHinweisAus(name) {
  let aus = {}; try { aus = JSON.parse(localStorage.getItem(SAAT_HINWEIS_AUS_KEY) || '{}') || {}; } catch (e) {}
  aus[name] = new Date().getFullYear();
  try { localStorage.setItem(SAAT_HINWEIS_AUS_KEY, JSON.stringify(aus)); } catch (e) {}
  renderHomeOverview();
}
function saatgutFehltHtml() {
  const liste = saatgutFehltBald().slice(0, 5);
  if (!liste.length) return '';
  const ART = { vorziehen: 'vorziehen', direktsaat: 'säen' };
  return `<div class="heute-box"><div class="heute-titel">🛒 Saatgut fehlt bald <span class="heute-zahl">nicht im Saatgutinventar</span></div>${liste.map(x => `
    <div class="heute-aufgabe"><span class="heute-icon">${x.sym}</span>
      <span class="heute-text"><span><strong>${escapeHtml(x.name)}</strong> ${ART[x.art]} ${x.tage === 0 ? '<b>jetzt</b>' : 'ab ' + MONTH_NAMES[x.r[0]] + ' (in ' + x.tage + ' Tagen)'}</span><span class="heute-unter">${escapeHtml(x.grund)}</span></span>
      <button type="button" class="heute-knopf" onclick="saatgutAufEinkaufsliste(${jsAttrStr(x.name).replace(/"/g, '&quot;')})">＋ Einkauf</button>
      <button type="button" class="heute-mini" onclick="saatgutHinweisAus(${jsAttrStr(x.name).replace(/"/g, '&quot;')})" title="Für diese Saison nicht mehr erinnern">✕</button></div>`).join('')}
    <div style="text-align:right;margin-top:4px"><button class="nav-btn" style="padding:4px 10px;font-size:0.7rem" onclick="openSeedInventory()">Saatgutinventar öffnen</button></div></div>`;
}

// ==================== 🧒 KINDERECKE ↔ GARTEN ====================
// Ist ein Beet einem Kind zugeteilt (Heute → „👤 wer?“), gibt das Abhaken einen ⭐ in der Kinderecke.
// Umgekehrt meldet die Kinderecke „Gegossen!“ über garten_kinderErledigt – das wird hier als Gießen übernommen.
function gartenKinder() { try { const e = JSON.parse(localStorage.getItem('kinder_einstellungen') || '{}') || {}; return Array.isArray(e.kinder) ? e.kinder : []; } catch (e) { return []; } }
function istKind(id) { return !!id && gartenKinder().includes(id); }
function kinderSternSetzen(personId, sternId, grund, an) {
  let liste = []; try { liste = JSON.parse(localStorage.getItem('kinder_sterne') || '[]') || []; } catch (e) {}
  const i = liste.findIndex(x => x.id === sternId);
  if (an && i === -1) liste.push({ id: sternId, personId, datum: new Date().toISOString(), anzahl: 1, grund });
  else if (!an && i !== -1) liste.splice(i, 1);
  else return;
  try { localStorage.setItem('kinder_sterne', JSON.stringify(liste)); } catch (e) {}
  if (window._kinderSync) window._kinderSync.melde();
}
function kinderErledigtAnwenden() {
  let erl = [], angewendet = [];
  try { erl = JSON.parse(localStorage.getItem('garten_kinderErledigt') || '[]') || []; } catch (e) {}
  try { angewendet = JSON.parse(localStorage.getItem('garten_kinderErledigtAngewendet') || '[]') || []; } catch (e) {}
  const neu = erl.filter(x => x && x.id && !angewendet.includes(x.id));
  if (!neu.length) return false;
  const heute = heuteISO();
  let geaendert = false;
  neu.forEach(x => {
    const g = gardens[x.gartenId] || gardens[currentGardenId];
    const bed = g && (g.beds || []).find(b => b.id === x.bedId);
    angewendet.push(x.id);
    if (!bed) return;
    (bed.plants || []).forEach((p, idx) => {
      const info = CARE_INFO[lexKatalogName((p.name || '').trim())];
      if (!info || !info.waterDays) return;
      if (!p.lastWatered || p.lastWatered < x.datum) { p.lastWatered = x.datum; geaendert = true; }
      if (x.datum === heute) {
        const id = bed.id + '_' + idx + '_water';
        const state = getCareDoneState();
        if (!state.done.includes(id)) state.done.push(id);
        state.wer = state.wer || {}; state.wer[id] = x.kind;
        localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
      }
    });
  });
  try { localStorage.setItem('garten_kinderErledigtAngewendet', JSON.stringify(angewendet.slice(-200))); } catch (e) {}
  if (geaendert) saveData();
  return true;
}
setTimeout(() => { try { if (kinderErledigtAnwenden() && document.getElementById('view-home').classList.contains('active')) renderHomeOverview(); } catch (e) {} }, 1500);

// ==================== „Heute zu erledigen“ (Startseite) ====================
// Gießen und Düngen werden je Beet zu einer Zeile zusammengefasst (ein Haken für alle Pflanzen),
// Ernten bleiben einzeln und haben einen Knopf, der direkt das Ernte-Formular der Pflanze öffnet.
function careIdTeile(id) { // „<bedId>_<pflanzenIndex>_<art>“ – bedId darf selbst Unterstriche enthalten
  const a = id.lastIndexOf('_'), b = id.lastIndexOf('_', a - 1);
  return { bedId: id.slice(0, b), idx: parseInt(id.slice(b + 1, a), 10), art: id.slice(a + 1) };
}
function careTaskSetzen(id, an) {
  if (isCareTaskDone(id) !== an) toggleCareTaskDone(id);
}
// ---- Wer macht's? Personen kommen aus der Familien-Personenliste (planer_personenListe) ----
function gartenPersonen() {
  try { const l = JSON.parse(localStorage.getItem('planer_personenListe') || '[]'); if (Array.isArray(l)) return l.filter(p => p && p.id && p.id !== 'familie'); } catch (e) {}
  return [];
}
function gartenIchBin() {
  try { const p = JSON.parse(localStorage.getItem('planer_push') || '{}').person; if (p) return p; } catch (e) {}
  try { return localStorage.getItem('garten_ichBin') || ''; } catch (e) { return ''; }
}
function gartenPersonInfo(id) { return gartenPersonen().find(p => p.id === id) || null; }
function beetZustaendigSetzen(bedId, personId) {
  const bed = getCurrentBeds().find(b => b.id === bedId);
  if (!bed) return;
  if (personId) bed.zustaendig = personId; else delete bed.zustaendig;
  saveData();
  renderHomeOverview();
}
function heuteGruppeUmschalten(idsText) {
  const ids = idsText.split('|');
  const alleErledigt = ids.every(isCareTaskDone);
  ids.forEach(id => careTaskSetzen(id, !alleErledigt));
  // festhalten, wer abgehakt hat (wird mit careDone an alle Geräte synchronisiert)
  const state = getCareDoneState();
  state.wer = state.wer || {};
  let ich = gartenIchBin();
  if (!alleErledigt && !ich && gartenPersonen().length) {
    // Gerät kennt seine Person noch nicht: einmal fragen
    const liste = gartenPersonen();
    const wahl = prompt('Wer bist du? (für „erledigt von …“)\n' + liste.map((p, i) => (i + 1) + ' = ' + p.label).join('\n'), '1');
    const pp = liste[(parseInt(wahl, 10) || 0) - 1];
    if (pp) { ich = pp.id; try { localStorage.setItem('garten_ichBin', ich); } catch (e) {} }
  }
  ids.forEach(id => { if (!alleErledigt && ich) state.wer[id] = ich; else delete state.wer[id]; });
  localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  // ⭐ für das Kind, dem das Beet zugeteilt ist (bzw. das selbst abhakt)
  const t0 = careIdTeile(ids[0]);
  const bed = getCurrentBeds().find(b => String(b.id) === t0.bedId);
  const kind = bed && istKind(bed.zustaendig) ? bed.zustaendig : (istKind(ich) ? ich : null);
  if (kind && (t0.art === 'water' || t0.art === 'fertilize' || t0.art === 'harvest')) {
    const verb = { water: 'gegossen', fertilize: 'gedüngt', harvest: 'geerntet' }[t0.art];
    const was = t0.art === 'harvest' ? ((bed.plants[t0.idx] || {}).name || 'Pflanze') : (bed.name || 'Beet');
    const sternId = 'st_garten_' + bed.id + '_' + (t0.art === 'harvest' ? t0.idx + '_' : '') + t0.art + '_' + heuteISO();
    kinderSternSetzen(kind, sternId, '🌱 ' + was + ' ' + verb, !alleErledigt);
    if (!alleErledigt) showTempStatus('⭐ Ein Stern für ' + ((gartenPersonInfo(kind) || {}).label || 'die Kinderecke') + '!', 3);
  }
  renderHomeOverview();
}
function heuteErnteEintragen(id) {
  const t = careIdTeile(id);
  showView('garden');
  setTimeout(() => {
    const bed = getCurrentBeds().find(b => String(b.id) === t.bedId);
    if (!bed) return;
    openPlantPanel(bed, t.idx);
    if (typeof switchPPTab === 'function') switchPPTab('harvest');
    setTimeout(() => { const f = document.getElementById('ppHarvestAmount'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } }, 250);
  }, 80);
}
function heuteAufgabenHtml(todayTasks) {
  const ART = { water: { icon: '🚿', verb: 'gießen' }, fertilize: { icon: '🌿', verb: 'düngen' }, harvest: { icon: '🧺', verb: 'ernten' } };
  const gruppen = [], map = {};
  todayTasks.forEach(i => {
    const k = i.kind === 'harvest' ? i.id : i.kind + '|' + i.bed;
    if (!map[k]) { map[k] = { art: i.kind, bed: i.bed, items: [] }; gruppen.push(map[k]); }
    map[k].items.push(i);
  });
  gruppen.forEach(g => { g.erledigt = g.items.every(i => isCareTaskDone(i.id)); });
  gruppen.sort((a, b) => a.erledigt - b.erledigt || ['water', 'fertilize', 'harvest'].indexOf(a.art) - ['water', 'fertilize', 'harvest'].indexOf(b.art));
  const offen = gruppen.filter(g => !g.erledigt).length;
  return `<div class="heute-box">
    <div class="heute-titel">✅ Heute zu erledigen <span class="heute-zahl">${offen ? offen + ' offen' : 'alles erledigt 🎉'}</span></div>
    ${gruppen.map(g => {
      const a = ART[g.art] || { icon: '•', verb: '' };
      const ids = g.items.map(i => i.id).join('|');
      const namen = {};
      g.items.forEach(i => { namen[i.plant] = (namen[i.plant] || 0) + 1; });
      const pflanzen = Object.entries(namen).map(([n, c]) => escapeHtml(n) + (c > 1 ? ' ×' + c : '')).join(', ');
      const titel = g.art === 'harvest' ? `<strong>${escapeHtml(g.items[0].plant)}</strong> ernten` : `<strong>${escapeHtml(g.bed)}</strong> ${a.verb}`;
      const unter = g.art === 'harvest' ? escapeHtml(g.bed) + ' · ' + g.items[0].text.replace(/^🧺\s*/, '') : pflanzen + (g.items.some(i => /Regen|heiß/.test(i.text)) ? ' · ' + g.items.find(i => /Regen|heiß/.test(i.text)).text : '');
      const t0 = careIdTeile(g.items[0].id);
      const bedObj = getCurrentBeds().find(b => String(b.id) === t0.bedId) || {};
      const personen = gartenPersonen();
      const zust = gartenPersonInfo(bedObj.zustaendig);
      const werErledigt = g.erledigt ? gartenPersonInfo(((getCareDoneState().wer) || {})[g.items[0].id]) : null;
      const ich = gartenIchBin();
      const werHtml = g.erledigt
        ? (werErledigt ? ` · von ${escapeHtml(werErledigt.label)}` : '')
        : (personen.length ? `<select class="heute-wer${zust && zust.id === ich ? ' ich' : ''}" onchange="beetZustaendigSetzen('${t0.bedId}', this.value)" title="Wer kümmert sich um dieses Beet?" style="${zust && zust.farbe ? 'border-color:' + zust.farbe : ''}">
            <option value="">👤 wer?</option>${personen.map(p => `<option value="${escapeHtml(p.id)}"${zust && zust.id === p.id ? ' selected' : ''}>${escapeHtml(p.label)}${p.id === ich ? ' (ich)' : ''}${istKind(p.id) ? ' ⭐' : ''}</option>`).join('')}</select>` : '');
      return `<div class="heute-aufgabe${g.erledigt ? ' erledigt' : ''}${zust && zust.id === ich && !g.erledigt ? ' meins' : ''}">
        <button type="button" class="heute-haken${g.erledigt ? ' an' : ''}" onclick="heuteGruppeUmschalten('${ids}')" aria-label="${g.erledigt ? 'Wieder öffnen' : 'Erledigt'}">${g.erledigt ? '✓' : ''}</button>
        <span class="heute-icon">${a.icon}</span>
        <span class="heute-text"><span>${titel}</span><span class="heute-unter">${g.erledigt ? 'erledigt' + werHtml : unter}</span>${g.erledigt ? '' : werHtml}</span>
        ${!g.erledigt && g.art === 'harvest' ? `<button type="button" class="heute-knopf" onclick="heuteErnteEintragen('${g.items[0].id}')">Eintragen</button>` : ''}
        ${!g.erledigt ? `<button type="button" class="heute-mini" onclick="createCareReminderDirekt('${g.items[0].id}')" title="Ins Termine-Modul eintragen">📌</button>` : ''}
      </div>`;
    }).join('')}
    <div style="text-align:right;margin-top:6px"><button class="nav-btn" style="padding:4px 10px;font-size:0.7rem" onclick="openCarePlanFromHome()">Vollständigen Pflegeplan öffnen</button></div>
  </div>`;
}
async function renderHomeOverview() {
  const box = document.getElementById('homeOverview');
  if (!box) return;
  const beds = getCurrentBeds();
  if (!beds.length) {
    box.innerHTML = `<div class="empty-state" style="max-width:480px;margin:0 auto">💡 Lege dein erstes Beet im Gartenplaner an, damit hier dein Tagesüberblick erscheint.</div>`;
    return;
  }
  box.innerHTML = `<div class="empty-state" style="max-width:480px;margin:0 auto">Tagesüberblick wird geladen…</div>`;
  const d = await computeCarePlanData();
  lastCareItems = d.items;
  const todayTasks = d.items.filter(i =>
    (i.kind === 'water' && i.urgent && !i.skip) ||
    (i.kind === 'traenke' && i.urgent) ||
    (i.kind === 'harvest' && i.urgent) ||
    (i.kind === 'fertilize')
  );
  const openTasks = todayTasks.filter(i => !isCareTaskDone(i.id));
  const waterToday = openTasks.filter(i => i.kind === 'water').length;
  const harvestReady = openTasks.filter(i => i.kind === 'harvest').length;
  const fertilizeDue = openTasks.filter(i => i.kind === 'fertilize').length;
  const expiringPantry = getExpiringPantryItems();
  const seedsToSow = getSeedsToSowSoon();
  const stats = [];
  if (d.frostWarn) {
    const isFrost = d.frostWarn.worst.level === 'frost';
    stats.push({ icon: '❄️', label: isFrost ? 'Frost erwartet' : 'Frostgefahr', tone: 'frost', onclick: "showView('garden')" });
  }
  if (d.heatWarn) {
    stats.push({ icon: '🌡️', label: `Hitze ${d.heatWarn.worst.label} (${Math.round(d.heatWarn.worst.tmax)}°C)`, tone: 'heat', onclick: '' });
  }
  if (d.hailWarn) {
    stats.push({ icon: '🧊', label: `Hagelgefahr ${d.hailWarn.worst.label}`, tone: 'hail', onclick: '' });
  }
  if (d.heavyRainWarn) {
    stats.push({ icon: '🌧️', label: `Starkregen ${d.heavyRainWarn.worst.label} (${Math.round(d.heavyRainWarn.worst.sum)}mm)`, tone: 'heavyrain', onclick: '' });
  }
  if (waterToday > 0) stats.push({ icon: '🚿', label: `${waterToday}× heute gießen`, tone: 'water', onclick: '' });
  const traenkenHeute = openTasks.filter(i => i.kind === 'traenke').length;
  if (traenkenHeute > 0) stats.push({ icon: '💦', label: `${traenkenHeute}× Tränke frisch füllen`, tone: 'water', onclick: '' });
  if (harvestReady > 0) stats.push({ icon: '🧺', label: `${harvestReady}× erntereif`, tone: 'harvest', onclick: '' });
  if (fertilizeDue > 0) stats.push({ icon: '🌿', label: `${fertilizeDue}× düngen fällig`, tone: 'fertilize', onclick: '' });
  if (expiringPantry.length > 0) stats.push({ icon: '🥫', label: `${expiringPantry.length}× Vorrat läuft bald ab`, tone: 'pantry', onclick: '' });
  if (seedsToSow.length > 0) stats.push({ icon: '🌰', label: `${seedsToSow.length}× Saatgut aussäbereit`, tone: 'seed', onclick: "openSeedInventory()" });
  if (d.weather && d.weather.current) {
    stats.push({ icon: weatherIcon(d.weather.current.weather_code), label: `${Math.round(d.weather.current.temperature_2m)}°C aktuell`, tone: 'weather', onclick: '' });
  }

  let checklistHtml = '';
  if (todayTasks.length) checklistHtml = heuteAufgabenHtml(todayTasks);

  let pantryHtml = '';
  if (expiringPantry.length) {
    const today = new Date(); today.setHours(0,0,0,0);
    pantryHtml = `<div style="max-width:480px;margin:16px auto 0;text-align:left">
      <div style="font-size:0.78rem;font-weight:600;color:var(--soil);margin-bottom:6px">🥫 Bald ablaufende Vorräte</div>
      ${expiringPantry.map(e => {
        const daysLeft = Math.round((e.useByDate - today) / 86400000);
        const overdue = daysLeft < 0;
        const dueLabel = overdue ? `seit ${Math.abs(daysLeft)} Tag(en) abgelaufen` : (daysLeft === 0 ? 'heute fällig' : `noch ${daysLeft} Tag(en)`);
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;margin-bottom:5px;border-radius:7px;background:${overdue?'#fbe3e3':'#fff8ec'};border-left:3px solid ${overdue?'#c05030':'#d4880a'}">
          <span style="font-size:1rem">🥫</span>
          <span style="flex:1;font-size:0.78rem"><strong>${escapeHtml(e.item)}</strong>${e.amount?' · '+escapeHtml(e.amount):''}</span>
          <span style="font-size:0.7rem;color:${overdue?'#c05030':'var(--bark)'}">${dueLabel}</span>
        </div>`;
      }).join('')}
      <div style="text-align:right;margin-top:4px"><button class="nav-btn" style="padding:4px 10px;font-size:0.7rem" onclick="openPantryFromHome()">Vorratsliste öffnen</button></div>
    </div>`;
  }

  let seedHtml = '';
  if (seedsToSow.length) {
    seedHtml = `<div style="max-width:480px;margin:16px auto 0;text-align:left">
      <div style="font-size:0.78rem;font-weight:600;color:var(--soil);margin-bottom:6px">🌰 Aussaat-Fenster</div>
      ${seedsToSow.map(s => {
        const label = s.active ? 'jetzt im Aussaatfenster' : `Fenster in ${s.soonDays} Tag(en)`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 9px;margin-bottom:5px;border-radius:7px;background:${s.active?'#eaf3e6':'#fff8ec'};border-left:3px solid ${s.active?'var(--moss)':'#d4880a'}">
          <span style="font-size:1rem">🌰</span>
          <span style="flex:1;font-size:0.78rem"><strong>${escapeHtml(s.plant)}</strong></span>
          <span style="font-size:0.7rem;color:${s.active?'var(--moss)':'var(--bark)'}">${label}</span>
        </div>`;
      }).join('')}
      <div style="text-align:right;margin-top:4px"><button class="nav-btn" style="padding:4px 10px;font-size:0.7rem" onclick="openSeedInventory()">Saatgutinventar öffnen</button></div>
    </div>`;
  }

  if (!stats.length && !todayTasks.length && !expiringPantry.length && !seedsToSow.length) {
    const koch = notizHeuteHtml() + winterschutzHtml() + ernteKochenHtml() + saatgutFehltHtml();
    if (koch) { box.innerHTML = koch; return; }
    box.innerHTML = d.weather
      ? `<div class="empty-state" style="max-width:480px;margin:0 auto">✓ Heute nichts Dringendes – schau später wieder vorbei.</div>`
      : `<div class="empty-state" style="max-width:480px;margin:0 auto">💡 Hinterlege deinen Standort (🗺️ Mein Garten → Seitenleiste ⚙️ Optionen → 🌤 Wetter), damit hier auch Gieß- und Frostwarnungen erscheinen.</div>`;
    return;
  }
  const pillsHtml = stats.length ? `<div class="overview-grid">${stats.map(s => `<div class="overview-pill ov-${s.tone}"${s.onclick ? ` onclick="${s.onclick}"` : ''}>${s.icon} <span>${escapeHtml(s.label)}</span></div>`).join('')}</div>` : '';
  box.innerHTML = pillsHtml + notizHeuteHtml() + winterschutzHtml() + checklistHtml + ernteKochenHtml() + saatgutFehltHtml() + pantryHtml + seedHtml;
}

// ==================== SHOPS & DIENSTLEISTER ====================
const SHOP_CATEGORIES = [
  { id: 'gaertnerei', icon: '🌻', label: 'Gärtnereien & Gartencenter' },
  { id: 'hofladen', icon: '🌾', label: 'Hofläden & Bio-Läden' },
  { id: 'saatgut', icon: '🌱', label: 'Samen & Saatgut' },
  { id: 'landschaftsbau', icon: '🏗', label: 'Landschafts- & Gartenbau' },
  { id: 'erde', icon: '🧱', label: 'Erde, Kompost & Substrat' },
  { id: 'werkzeug', icon: '🔧', label: 'Werkzeug & Zubehör' },
];
let shopEntries = [];
function loadShops() {
  try { shopEntries = JSON.parse(localStorage.getItem('gartenplaner_shops') || '[]') || []; }
  catch(e) { shopEntries = []; }
}
function saveShops() {
  try { localStorage.setItem('gartenplaner_shops', JSON.stringify(shopEntries)); } catch(e) {}
}
function normalisiereLink(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}
function renderShops() {
  const box = document.getElementById('shopsWrap');
  let html = `<div class="home-intro" style="margin-bottom:22px"><h2>🏬 Shops &amp; Dienstleister</h2><p>Deine gesammelten Anlaufstellen rund um Garten und Selbstversorgung. Einträge bleiben nur lokal in diesem Browser gespeichert.</p></div>`;
  html += `<div class="shop-category" style="margin-bottom:22px">
    <div class="shop-category-hd"><h3>💰 Geld &amp; Wünsche</h3></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="tool-btn" onclick="openCostTracker()" style="background:var(--moss);color:var(--white)">🧾 Kostenübersicht</button>
      <button class="tool-btn" onclick="openWishlist()" style="background:var(--moss);color:var(--white)">💚 Wunschliste</button>
    </div>
  </div>`;
  for (const cat of SHOP_CATEGORIES) {
    const entries = shopEntries.filter(e => e.cat === cat.id);
    html += `<div class="shop-category">
      <div class="shop-category-hd">
        <h3>${cat.icon} ${escapeHtml(cat.label)}</h3>
        <button class="btn-add-entry" onclick="openShopForm('${cat.id}')">+ Eintrag</button>
      </div>`;
    if (!entries.length) {
      html += `<div class="empty-state">Noch keine Einträge. Füge deinen ersten Tipp in dieser Kategorie hinzu.</div>`;
    } else {
      html += entries.map(e => `
        <div class="shop-entry">
          <div class="se-name">${escapeHtml(e.name)}</div>
          ${e.ort ? `<div class="se-meta">📍 ${escapeHtml(e.ort)}</div>` : ''}
          ${e.link ? `<div class="se-meta">🔗 <a href="${escapeHtml(normalisiereLink(e.link))}" target="_blank" rel="noopener noreferrer" class="se-link">${escapeHtml(e.link)}</a></div>` : ''}
          ${e.notiz ? `<div class="se-meta">${escapeHtml(e.notiz)}</div>` : ''}
          <div class="se-actions">
            <button onclick="openShopForm('${cat.id}','${e.id}')">Bearbeiten</button>
            <button onclick="deleteShopEntry('${e.id}')">Löschen</button>
          </div>
        </div>`).join('');
    }
    html += `</div>`;
  }
  box.innerHTML = html;
}
function openShopForm(catId, entryId) {
  const entry = entryId ? shopEntries.find(e => e.id === entryId) : null;
  document.getElementById('shopFormTitle').textContent = entry ? '🏬 Eintrag bearbeiten' : '🏬 Eintrag hinzufügen';
  document.getElementById('shopFormId').value = entryId || '';
  document.getElementById('shopFormCat').value = catId;
  document.getElementById('shopFormName').value = entry ? entry.name : '';
  document.getElementById('shopFormOrt').value = entry ? (entry.ort||'') : '';
  document.getElementById('shopFormLink').value = entry ? (entry.link||'') : '';
  document.getElementById('shopFormNotiz').value = entry ? (entry.notiz||'') : '';
  document.getElementById('shopFormModal').style.display = 'flex';
}
function closeShopForm() { document.getElementById('shopFormModal').style.display = 'none'; }
function saveShopForm() {
  const name = document.getElementById('shopFormName').value.trim();
  if (!name) { document.getElementById('shopFormName').focus(); return; }
  const id = document.getElementById('shopFormId').value;
  const cat = document.getElementById('shopFormCat').value;
  const ort = document.getElementById('shopFormOrt').value.trim();
  const link = document.getElementById('shopFormLink').value.trim();
  const notiz = document.getElementById('shopFormNotiz').value.trim();
  if (id) {
    const e = shopEntries.find(e => e.id === id);
    if (e) { e.name = name; e.ort = ort; e.link = link; e.notiz = notiz; }
  } else {
    shopEntries.push({ id: 'shop_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), cat, name, ort, link, notiz });
  }
  saveShops();
  closeShopForm();
  renderShops();
}
function deleteShopEntry(id) {
  const index = shopEntries.findIndex(e => e.id === id);
  if (index === -1) return;
  const entfernt = shopEntries[index];
  shopEntries.splice(index, 1);
  saveShops();
  renderShops();
  zeigeLoeschToast('Eintrag gelöscht: „' + (entfernt.name || '') + '"', () => {
    shopEntries.splice(index, 0, entfernt);
    saveShops();
    renderShops();
  });
}

// ==================== TIPPS & TRICKS ====================
// TIPS_TOPICS → pflanzendaten.js
// ==================== TIERE IM GARTEN (Nachschlagewerk für heimische Tiere) ====================
// Statischer Inhalt (nicht synchronisiert). Nur die „Gesehen!“-Einträge werden gespeichert –
// pro Garten in gardens[id].tierSichtungen = { tierId: { anzahl, erst, zuletzt } } und damit
// automatisch mit der Familie synchronisiert.
// TIER_KATEGORIEN → pflanzendaten.js
// TIER_AUFWAND → pflanzendaten.js
// TIER_GANZJAEHRIG → pflanzendaten.js
// TIERE → pflanzendaten.js

// Lebensräume zum Selberbauen; „hilft“ wird aus TIERE[].projekte errechnet
// TIER_PROJEKTE → pflanzendaten.js

// Futterpflanzen nach Jahreszeit
// TIER_PFLANZEN_SAISON → pflanzendaten.js

// TIER_REGELN → pflanzendaten.js

let tierAnsicht = 'tiere';
let tierKategorie = 'alle';
let tierSuche = '';
let tierDetailId = null;

// ✍️ Eigene Tiere (pro Garten, synchronisiert): gardens[id].eigeneTiere = [{ id: 'eig_…', icon, name, latein, kat, kurz, nahrung, wohnung, notiz }]
function eigeneTiere() {
  const g = gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.eigeneTiere)) g.eigeneTiere = [];
  return g.eigeneTiere;
}
function alleTiere() {
  return TIERE.concat(eigeneTiere().filter(t => t && t.name).map(t => ({
    id: t.id, icon: t.icon || '🐾', name: t.name, latein: t.latein || '', kat: TIER_KATEGORIEN[t.kat] ? t.kat : 'saeuger', aufwand: 1, monate: Array.isArray(t.monate) && t.monate.length ? t.monate : [],
    kurz: t.kurz || 'Eigenes Tier', wusstest: '', nahrung: t.nahrung || '', wohnung: t.wohnung || '', notiz: t.notiz || '', pflanzen: [], tun: [], meiden: [], projekte: [], eigen: true,
  })));
}
let eigenesTierBearbeiten = null;
function eigenesTierOeffnen(id, vorname) {
  const t = id ? eigeneTiere().find(x => x.id === id) : null;
  eigenesTierBearbeiten = t ? t.id : null;
  document.getElementById('eigTierTitel').textContent = t ? '✏️ ' + t.name : '＋ Eigenes Tier';
  document.getElementById('eigTierName').value = t ? t.name : (vorname || '');
  document.getElementById('eigTierIcon').value = t ? t.icon || '' : '';
  document.getElementById('eigTierLatein').value = t ? t.latein || '' : '';
  document.getElementById('eigTierKat').innerHTML = Object.entries(TIER_KATEGORIEN).map(([k, v]) => `<option value="${k}"${(t ? t.kat : 'saeuger') === k ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
  document.getElementById('eigTierKurz').value = t ? t.kurz || '' : '';
  document.getElementById('eigTierNahrung').value = t ? t.nahrung || '' : '';
  document.getElementById('eigTierWohnung').value = t ? t.wohnung || '' : '';
  document.getElementById('eigTierNotiz').value = t ? t.notiz || '' : '';
  document.getElementById('eigTierGesehenZeile').style.display = t ? 'none' : '';
  document.getElementById('eigTierGesehen').checked = !t;
  document.getElementById('eigTierLoeschen').style.display = t ? '' : 'none';
  document.getElementById('eigTierModal').style.display = 'flex';
  setTimeout(() => document.getElementById('eigTierName').focus(), 60);
}
function eigenesTierSchliessen() { document.getElementById('eigTierModal').style.display = 'none'; }
function eigenesTierSpeichern() {
  const name = document.getElementById('eigTierName').value.trim();
  if (!name) { document.getElementById('eigTierName').focus(); return; }
  const daten = {
    name, icon: document.getElementById('eigTierIcon').value.trim() || '🐾', latein: document.getElementById('eigTierLatein').value.trim(),
    kat: document.getElementById('eigTierKat').value, kurz: document.getElementById('eigTierKurz').value.trim(),
    nahrung: document.getElementById('eigTierNahrung').value.trim(), wohnung: document.getElementById('eigTierWohnung').value.trim(), notiz: document.getElementById('eigTierNotiz').value.trim(),
  };
  const liste = eigeneTiere();
  let id = eigenesTierBearbeiten;
  if (id) Object.assign(liste.find(x => x.id === id) || {}, daten);
  else {
    const doppelt = alleTiere().find(t => t.name.trim().toLowerCase() === name.toLowerCase());
    if (doppelt && !confirm('„' + doppelt.name + '“ gibt es schon. Trotzdem ein eigenes Tier anlegen?')) return;
    id = 'eig_' + Date.now().toString(36);
    liste.push(Object.assign({ id, angelegt: new Date().toISOString().slice(0, 10) }, daten));
  }
  const gesehen = !eigenesTierBearbeiten && document.getElementById('eigTierGesehen').checked;
  eigenesTierSchliessen();
  tierSuche = ''; 
  if (gesehen) tierGesehen(id); else { saveData(); renderTiere(); showTempStatus('✍️ ' + name + ' gespeichert', 3); }
  if (tierDetailId === id) tierDetailRendern();
}
function eigenesTierLoeschen() {
  const id = eigenesTierBearbeiten; if (!id) return;
  const liste = eigeneTiere(), i = liste.findIndex(x => x.id === id); if (i < 0) return;
  if (!confirm('„' + liste[i].name + '“ löschen? Die Sichtungen dazu werden ebenfalls entfernt.')) return;
  const weg = liste.splice(i, 1)[0], sicht = tierSichtungen(), altSicht = sicht[id];
  delete sicht[id];
  const g = gardens[currentGardenId], altLog = (g && g.tierLog) ? g.tierLog.slice() : null;
  if (altLog) g.tierLog = altLog.filter(x => x.tierId !== id);
  saveData(); eigenesTierSchliessen(); tierDetailSchliessen(); renderTiere();
  showTempStatus('🗑️ ' + weg.name + ' gelöscht', 6, { label: 'Rückgängig', aktion: () => { eigeneTiere().splice(i, 0, weg); if (altSicht) tierSichtungen()[id] = altSicht; if (altLog && gardens[currentGardenId]) gardens[currentGardenId].tierLog = altLog; saveData(); renderTiere(); } });
}

// gardens[id].tierLog = [{ datum, tierId, name, icon, neu, von }] – die letzten Sichtungen (max. 80)
function tierLog() {
  const g = gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.tierLog)) g.tierLog = [];
  if (g.tierLog.length > 80) g.tierLog.splice(0, g.tierLog.length - 80);
  return g.tierLog;
}
function tierSichtungen() {
  const g = gardens[currentGardenId];
  if (!g) return {};
  if (!g.tierSichtungen || typeof g.tierSichtungen !== 'object') g.tierSichtungen = {};
  return g.tierSichtungen;
}
// Welche Pflanzen wachsen schon im aktuellen Garten (Beete + freistehende Pflanzen)?
function tierGartenPflanzenSet() {
  const set = new Set();
  const norm = n => String(n || '').trim().toLowerCase();
  getCurrentBeds().forEach(b => (b.plants || []).forEach(p => set.add(norm(p.name))));
  getCurrentFreiPflanzen().forEach(p => set.add(norm(p.name)));
  return set;
}
function tierPflanzeImGarten(name, set) {
  const n = name.trim().toLowerCase();
  if (set.has(n)) return true;
  const alias = (typeof PFLANZEN_BEDINGUNGEN_ALIAS !== 'undefined') && PFLANZEN_BEDINGUNGEN_ALIAS[n];
  if (alias && set.has(alias.toLowerCase())) return true;
  // „Hagebutten (Hundsrose)“ → „Hundsrose“, „Astern (ungefüllt)“ → „Astern“
  const klammer = name.match(/\(([^)]+)\)/);
  if (klammer && set.has(klammer[1].trim().toLowerCase())) return true;
  const ohne = name.replace(/\s*\([^)]*\)/, '').trim().toLowerCase();
  return ohne !== n && set.has(ohne);
}
function tierPflanzenChips(liste, set) {
  return liste.map(n => {
    const da = tierPflanzeImGarten(n, set);
    const p = PLANTS.find(x => x.name === n);
    return `<span class="tier-chip${da ? ' da' : ''}" title="${da ? 'Wächst schon in deinem Garten' : ''}">${p ? p.sym + ' ' : ''}${escapeHtml(n)}${da ? ' ✓' : ''}</span>`;
  }).join('');
}
function tierMonateHtml(monate) {
  const kuerzel = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const jetzt = new Date().getMonth() + 1;
  return `<div class="tier-monate">${kuerzel.map((k, i) => `<span class="${monate.includes(i + 1) ? 'an' : ''}${i + 1 === jetzt ? ' jetzt' : ''}">${k}</span>`).join('')}</div>`;
}

function renderTiere() {
  albumTiereMigrieren();
  // Namen/Symbole an ältere Sichtungen hängen, damit die Übersicht sie anzeigen kann
  const sichtAlt = tierSichtungen();
  Object.keys(sichtAlt).forEach(id => { if (!sichtAlt[id].name) { const t = alleTiere().find(x => x.id === id); if (t) { sichtAlt[id].name = t.name; sichtAlt[id].icon = t.icon; } } });
  const box = document.getElementById('tiereWrap');
  if (!box) return;
  const sicht = tierSichtungen();
  // Seltene Funde (Stufe 4) zählen nur, wenn sie entdeckt wurden – sonst wäre 100 % kaum erreichbar
  const zielTiere = alleTiere().filter(t => t.aufwand < 4 || sicht[t.id]);
  const entdeckt = zielTiere.filter(t => sicht[t.id] && t.aufwand < 4).length;
  const selten = alleTiere().filter(t => t.aufwand === 4 && sicht[t.id]).length;
  const basis = alleTiere().filter(t => t.aufwand < 4).length;
  const prozent = Math.min(100, Math.round(entdeckt / Math.max(1, basis) * 100));
  const gartenName = (gardens[currentGardenId] && gardens[currentGardenId].name) || 'deinem Garten';
  const reiter = [['tiere', '🔍 Tiere'], ['wer', '🔗 Wer frisst was?'], ['bauen', '🔨 Lebensräume bauen'], ['pflanzen', '🌼 Futterpflanzen'], ['regeln', '✅ Grundregeln']];
  let html = `<div class="home-intro" style="margin-bottom:14px"><h2>🦔 Tiere im Garten</h2>
      <p>Welche Tiere leben bei uns – und was brauchen sie, damit sie in den Garten kommen?</p></div>
    <div class="tier-fortschritt">
      <div class="tier-fortschritt-text">👀 Entdeckt in „${escapeHtml(gartenName)}“: <b>${entdeckt} von ${basis}</b>${selten ? ` · 🔴 ${selten} seltene${selten === 1 ? 'r' : ''} Fund${selten === 1 ? '' : 'e'}` : ''}</div>
      <div class="tier-balken"><span style="width:${prozent}%"></span></div>
    </div>
    <div class="tier-werkzeuge">
      <button type="button" class="btn-secondary" onclick="bestimmOeffnen()">🔎 Hummel bestimmen</button>
      <button type="button" class="btn-secondary" onclick="tierjahrOeffnen()">📅 Euer Tierjahr</button>
    </div>
    <div class="tier-reiter">${reiter.map(([k, t]) => `<button type="button" class="saat-chip${tierAnsicht === k ? ' an' : ''}" onclick="tierAnsichtSetzen('${k}')">${t}</button>`).join('')}</div>`;
  if (tierAnsicht === 'tiere') html += renderTiereListeHtml(sicht);
  else if (tierAnsicht === 'bauen') html += renderTierProjekteHtml();
  else if (tierAnsicht === 'wer') html += renderBeobachtungenHtml();
  else if (tierAnsicht === 'pflanzen') html += renderTierPflanzenHtml();
  else html += renderTierRegelnHtml();
  box.innerHTML = html;
}

// ============================================================
// 🔎 HUMMEL-BESTIMMUNG – kleiner Bestimmungsschlüssel nach Farben (Arbeiterinnen/Königinnen)
// Knoten: { frage, optionen: [{ text, hinweis, farben:[...], weiter | treffer:[ids] }] }
// ============================================================
const HUMMEL_SCHLUESSEL = {
  start: { frage: 'Welche Farbe hat das Hinterende („der Po“)?', optionen: [
    { text: 'Weiß', hinweis: 'weißes oder cremefarbenes Hinterende', farben: ['#222', '#e8c43a', '#f4f1ea'], weiter: 'weiss' },
    { text: 'Rot oder orange', hinweis: 'leuchtend rotes bis orangefarbenes Hinterende', farben: ['#222', '#222', '#d9532b'], weiter: 'rot' },
    { text: 'Ganz braun / fuchsrot', hinweis: 'pelzig braun, kein heller Po', farben: ['#b0703a', '#c98a4b', '#b0703a'], weiter: 'braun' },
    { text: 'Ganz schwarz', hinweis: 'schwarz, evtl. mit farbigen Beinen oder Flügeln', farben: ['#1b1b1b', '#2a2a2a', '#1b1b1b'], weiter: 'schwarz' },
  ] },
  weiss: { frage: 'Wie sieht die Brust (vorderer Teil) aus?', optionen: [
    { text: 'Rotbraun – Hinterleib schwarz', hinweis: 'kein Gelb, nur Rotbraun, Schwarz und Weiß', farben: ['#a0522d', '#222', '#f4f1ea'], treffer: ['baumhummel'] },
    { text: 'Schwarz mit gelben Bändern', hinweis: 'gelb-schwarz geringelt', farben: ['#e8c43a', '#222', '#e8c43a'], weiter: 'baender' },
  ] },
  baender: { frage: 'Wie viele gelbe Bänder zählst du?', optionen: [
    { text: 'Zwei', hinweis: 'eins vorn an der Brust, eins am Hinterleib – kräftige, große Hummel', farben: ['#e8c43a', '#222', '#e8c43a', '#222', '#f4f1ea'], treffer: ['erdhummel'] },
    { text: 'Drei – und ein auffällig langer Kopf', hinweis: 'zwei Bänder an der Brust, eins am Hinterleib', farben: ['#e8c43a', '#222', '#e8c43a', '#e8c43a', '#f4f1ea'], treffer: ['gartenhummel'] },
  ] },
  rot: { frage: 'Hat sie gelbe Bänder?', optionen: [
    { text: 'Nein, sonst ganz schwarz', hinweis: 'samtschwarz, eher groß', farben: ['#222', '#222', '#d9532b'], treffer: ['steinhummel'] },
    { text: 'Ja, gelbe Bänder – eher klein', hinweis: 'gelber Kragen, oft ein gelbes Band, orangeroter Po', farben: ['#e8c43a', '#222', '#e8c43a', '#e08a2e'], treffer: ['wiesenhummel'] },
    { text: 'Gelber Kragen, sonst schwarz', hinweis: 'oft ein Männchen der Steinhummel', farben: ['#e8c43a', '#222', '#d9532b'], treffer: ['steinhummel', 'wiesenhummel'] },
  ] },
  braun: { frage: 'Wie verhält sie sich an der Blüte?', optionen: [
    { text: 'Landet und krabbelt in die Blüte', hinweis: 'ganz normale Hummel', farben: ['#b0703a', '#c98a4b', '#b0703a'], treffer: ['ackerhummel'] },
    { text: 'Steht in der Luft, langer, gerader Rüssel', hinweis: 'sehr flauschig, schwirrt wie ein Kolibri, März–Mai', farben: ['#c98a4b', '#e0b07a', '#c98a4b'], treffer: ['wollschweber'] },
  ] },
  schwarz: { frage: 'Was fällt dir noch auf?', optionen: [
    { text: 'Blau-violett schimmernde Flügel, sehr groß', hinweis: 'brummt laut, oft an Salbei und Blauregen', farben: ['#1b1b1b', '#4b3c8f', '#1b1b1b'], treffer: ['holzbiene'] },
    { text: 'Orange behaarte Hinterbeine, schwirrt vor Blüten', hinweis: 'pfeilschnell, hoher Flugton, Frühling', farben: ['#1b1b1b', '#e08a2e', '#1b1b1b'], treffer: ['pelzbiene'] },
    { text: 'Roter Po ist doch zu sehen', hinweis: 'zurück zu den roten', farben: ['#222', '#222', '#d9532b'], weiter: 'rot' },
  ] },
};
let bestimmPfad = [];
function bestimmOeffnen() { bestimmPfad = []; bestimmRendern('start'); document.getElementById('bestimmModal').style.display = 'flex'; }
function bestimmSchliessen() { document.getElementById('bestimmModal').style.display = 'none'; }
function bestimmZurueck() { bestimmPfad.pop(); const vor = bestimmPfad.length ? bestimmPfad[bestimmPfad.length - 1].ziel : 'start'; bestimmRendern(vor, true); }
function bestimmWahl(knoten, i) {
  const o = HUMMEL_SCHLUESSEL[knoten].optionen[i];
  bestimmPfad.push({ text: o.text, ziel: o.weiter || null, treffer: o.treffer || null });
  if (o.weiter) bestimmRendern(o.weiter); else bestimmTrefferRendern(o.treffer);
}
function bestimmFarbenHtml(farben) { return `<span class="bestimm-farbe">${farben.map(f => `<span style="background:${f}"></span>`).join('')}</span>`; }
function bestimmKopfHtml() {
  return `<h2 style="margin-top:0">🔎 Hummel bestimmen</h2>` +
    (bestimmPfad.length ? `<div class="bestimm-pfad">${bestimmPfad.map(p => escapeHtml(p.text)).join(' → ')}</div>` : '<p class="tier-p" style="margin-top:0">Schau dir die Hummel genau an – am besten, wenn sie gerade an einer Blüte sitzt. Ein Handyfoto hilft!</p>');
}
function bestimmFussHtml() {
  return `<div class="bestimm-knoepfe" style="margin-top:12px">${bestimmPfad.length ? '<button type="button" class="btn-secondary" onclick="bestimmZurueck()">← Zurück</button>' : ''}<button type="button" class="btn-secondary" onclick="bestimmSchliessen()">Schließen</button></div>`;
}
function bestimmRendern(knoten, zurueck) {
  if (zurueck && bestimmPfad.length && !bestimmPfad[bestimmPfad.length - 1].ziel) { bestimmPfad.pop(); }
  const k = HUMMEL_SCHLUESSEL[knoten];
  document.getElementById('bestimmInhalt').innerHTML = bestimmKopfHtml() +
    `<div class="bestimm-frage">${escapeHtml(k.frage)}</div>` +
    k.optionen.map((o, i) => `<button type="button" class="bestimm-option" onclick="bestimmWahl('${knoten}', ${i})">${bestimmFarbenHtml(o.farben)}<span><b>${escapeHtml(o.text)}</b><small>${escapeHtml(o.hinweis)}</small></span></button>`).join('') +
    bestimmFussHtml();
}
function bestimmTrefferRendern(ids) {
  const sicht = tierSichtungen();
  const tiere = ids.map(id => alleTiere().find(t => t.id === id)).filter(Boolean);
  document.getElementById('bestimmInhalt').innerHTML = bestimmKopfHtml() +
    `<div class="bestimm-frage">${tiere.length > 1 ? 'Das könnte es sein:' : 'Das ist wahrscheinlich die …'}</div>` +
    tiere.map(t => `<div class="bestimm-treffer">
      <h3>${tierIconHtml(t).startsWith('<img') ? '' : escapeHtml(t.icon) + ' '}${escapeHtml(t.name)}${sicht[t.id] ? ' 👀' : ''}</h3>
      <div class="tier-meta"><i>${escapeHtml(t.latein || '')}</i></div>
      <p class="tier-p">${escapeHtml(t.kurz)}</p>
      <div class="bestimm-knoepfe">
        <button type="button" class="btn-primary" onclick="bestimmGesehen('${t.id}')">👀 Gesehen!</button>
        <button type="button" class="btn-secondary" onclick="bestimmSchliessen(); tierDetailOeffnen('${t.id}')">📖 Steckbrief</button>
      </div></div>`).join('') +
    `<p class="tier-p" style="font-size:0.8rem;opacity:0.8">Nicht sicher? Dann trag sie einfach als <a href="#" style="color:inherit;font-weight:600;text-decoration:underline" onclick="bestimmGesehen('hummel');return false">„Hummel (Art unbekannt)“</a> ein. Männchen und junge Tiere sehen manchmal anders aus.</p>` +
    bestimmFussHtml();
}
function bestimmGesehen(id) { bestimmSchliessen(); tierGesehen(id); }

// ============================================================
// 📅 EUER TIERJAHR – Erstsichtungen je Jahr (sicht[id].jahre[JJJJ] = { erst, anzahl })
// ============================================================
let tierjahrJahr = null;
function sichtJahre(si) {
  // ältere Einträge ohne Jahresdaten: aus erst/zuletzt ableiten
  if (si.jahre && typeof si.jahre === 'object') return si.jahre;
  const j = {};
  if (si.erst) j[si.erst.slice(0, 4)] = { erst: si.erst, anzahl: si.zuletzt && si.zuletzt.slice(0, 4) === si.erst.slice(0, 4) ? si.anzahl || 1 : 1 };
  if (si.zuletzt && si.zuletzt.slice(0, 4) !== (si.erst || '').slice(0, 4)) j[si.zuletzt.slice(0, 4)] = { erst: si.zuletzt, anzahl: Math.max(1, (si.anzahl || 1) - 1) };
  return j;
}
function tagImJahr(iso) { const d = new Date(iso + 'T12:00'); return Math.round((d - new Date(d.getFullYear(), 0, 1, 12)) / 864e5); }
function tierjahrOeffnen(jahr) {
  tierjahrJahr = jahr || String(new Date().getFullYear());
  tierjahrRendern();
  document.getElementById('tierjahrModal').style.display = 'flex';
}
function tierjahrSchliessen() { document.getElementById('tierjahrModal').style.display = 'none'; }
function tierjahrRendern() {
  const sicht = tierSichtungen();
  const jahr = tierjahrJahr, vorjahr = String(Number(jahr) - 1);
  const jahreSet = new Set([String(new Date().getFullYear())]);
  Object.values(sicht).forEach(si => Object.keys(sichtJahre(si)).forEach(j => jahreSet.add(j)));
  const jahre = [...jahreSet].sort();
  const eintraege = [];
  let sichtungen = 0;
  Object.entries(sicht).forEach(([id, si]) => {
    const j = sichtJahre(si);
    if (!j[jahr]) return;
    const t = alleTiere().find(x => x.id === id) || { id, name: si.name || id, icon: si.icon || '🐾', aufwand: 1 };
    sichtungen += j[jahr].anzahl || 1;
    const vj = j[vorjahr];
    eintraege.push({ t, erst: j[jahr].erst, anzahl: j[jahr].anzahl || 1, neu: si.erst && si.erst.slice(0, 4) === jahr, diff: vj ? tagImJahr(j[jahr].erst) - tagImJahr(vj.erst) : null });
  });
  eintraege.sort((a, b) => a.erst.localeCompare(b.erst));
  const beobJahr = gartenBeobachtungen().filter(b => String(b.datum || '').startsWith(jahr));
  const fotos = beobJahr.reduce((n, b) => n + (b.fotos || []).length, 0);
  const neuArten = eintraege.filter(e => e.neu).length;
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  let html = `<h2 style="margin-top:0">📅 Euer Tierjahr ${escapeHtml(jahr)}</h2>`;
  if (jahre.length > 1) html += `<div class="tj-jahre">${jahre.map(j => `<button type="button" class="saat-chip${j === jahr ? ' an' : ''}" onclick="tierjahrJahr='${j}';tierjahrRendern()">${j}</button>`).join('')}</div>`;
  html += `<div class="tj-zahlen">
      <div class="tj-zahl"><b>${eintraege.length}</b><small>${eintraege.length === 1 ? 'Tierart' : 'Tierarten'}</small></div>
      <div class="tj-zahl"><b>${neuArten}</b><small>zum ersten Mal</small></div>
      <div class="tj-zahl"><b>${sichtungen}</b><small>Sichtungen</small></div>
      <div class="tj-zahl"><b>${beobJahr.length}</b><small>Beobachtungen</small></div>
      <div class="tj-zahl"><b>${fotos}</b><small>Fotos</small></div>
      <div class="tj-zahl"><b>${eintraege.filter(e => e.t.aufwand === 4).length}</b><small>seltene Funde</small></div>
    </div>`;
  if (!eintraege.length) {
    html += `<div class="empty-state">Für ${escapeHtml(jahr)} ist noch nichts eingetragen. Tippt bei einem Tier auf „👀 Gesehen!“ – dann entsteht hier euer Jahres-Zeitstrahl.</div>`;
  } else {
    const erste = eintraege[0];
    html += `<p class="tier-p">🌱 Erste Sichtung des Jahres: <b>${escapeHtml(erste.t.name)}</b> am ${escapeHtml(beobDatumText(erste.erst))}.</p>`;
    let monat = -1;
    eintraege.forEach(e => {
      const m = Number(e.erst.slice(5, 7)) - 1;
      if (m !== monat) { monat = m; html += `<div class="tj-monat">${monate[m]}</div>`; }
      const vgl = e.diff === null ? '' : e.diff === 0 ? '<span class="tj-vergleich">wie im Vorjahr</span>' :
        `<span class="tj-vergleich ${e.diff < 0 ? 'frueh' : 'spaet'}">${Math.abs(e.diff)} ${Math.abs(e.diff) === 1 ? 'Tag' : 'Tage'} ${e.diff < 0 ? 'früher' : 'später'}</span>`;
      html += `<div class="tj-eintrag" onclick="tierjahrSchliessen(); tierDetailOeffnen('${e.t.id}')">
        <span class="tj-bild">${tierIconHtml(e.t)}</span>
        <span class="tj-text"><b>${escapeHtml(e.t.name)}</b>${e.neu ? ' 🎉' : ''}${e.t.aufwand === 4 ? ' 🔴' : ''}<small>zuerst am ${escapeHtml(new Date(e.erst + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }))}${e.anzahl > 1 ? ' · ' + e.anzahl + '× gesehen' : ''}</small></span>${vgl}</div>`;
    });
  }
  html += `<div class="bestimm-knoepfe" style="margin-top:14px"><button type="button" class="btn-secondary" onclick="tierjahrSchliessen()">Schließen</button></div>`;
  document.getElementById('tierjahrInhalt').innerHTML = html;
}

function tierAnsichtSetzen(k) { tierAnsicht = k; renderTiere(); document.getElementById('tiereWrap').scrollTop = 0; }
function tierKategorieSetzen(k) { tierKategorie = k; renderTiere(); }
// Bei der Suche nur die Liste neu zeichnen – sonst schließt sich am Handy die Tastatur
function tierSucheSetzen(v) {
  tierSuche = v;
  const el = document.getElementById('tierListe');
  if (el) el.innerHTML = tierListeInhaltHtml(tierSichtungen());
}

function renderTiereListeHtml(sicht) {
  const kats = [['alle', 'Alle']].concat(Object.entries(TIER_KATEGORIEN), [['selten', '🔴 Seltene Funde'], ['entdeckt', '👀 Entdeckt']]);
  return `<input type="search" id="tierSucheInput" class="tier-suche" placeholder="🔍 Tier oder Pflanze suchen …" value="${escapeHtml(tierSuche)}" oninput="tierSucheSetzen(this.value)">
    <div class="tier-filter">${kats.map(([k, t]) => `<button type="button" class="saat-chip${tierKategorie === k ? ' an' : ''}" onclick="tierKategorieSetzen('${k}')">${t}</button>`).join('')}</div>
    <div id="tierListe">${tierListeInhaltHtml(sicht)}</div>`;
}
let tierListeModus = (() => { try { return localStorage.getItem('garten_tierModus') || 'liste'; } catch (e) { return 'liste'; } })();
function tierListeModusSetzen(m) { tierListeModus = m; try { localStorage.setItem('garten_tierModus', m); } catch (e) {} renderTiere(); }
function tierListeInhaltHtml(sicht) {
  const q = tierSuche.trim().toLowerCase();
  const liste = alleTiere().filter(t => {
    if (tierKategorie === 'entdeckt' && !sicht[t.id]) return false;
    if (tierKategorie === 'selten' && t.aufwand !== 4) return false;
    if (tierKategorie !== 'alle' && tierKategorie !== 'entdeckt' && tierKategorie !== 'selten' && t.kat !== tierKategorie) return false;
    if (!q) return true;
    return [t.name, t.latein, t.kurz, t.nahrung, t.wohnung, t.pflanzen.join(' ')].join(' ').toLowerCase().includes(q);
  });
  const vorname = liste.some(t => t.name.trim().toLowerCase() === q) ? '' : tierSuche.trim();
  const neuKnopf = `<button type="button" class="btn-secondary" style="width:100%;margin-top:12px" onclick='eigenesTierOeffnen(null, ${escapeHtml(JSON.stringify(vorname))})'>＋ ${vorname ? '„' + escapeHtml(vorname) + '“ als eigenes Tier eintragen' : 'Eigenes Tier eintragen'}</button>`;
  if (!liste.length) return `<div class="empty-state">${tierKategorie === 'entdeckt' && !q ? 'Noch keine Tiere entdeckt – öffne ein Tier und tippe auf „👀 Gesehen!“, wenn ihr es im Garten beobachtet habt.' : 'Nicht im Lexikon? Dann trag es einfach selbst ein:'}</div>${neuKnopf}`;
  const modus = `<div class="tier-modus"><button type="button" class="saat-chip${tierListeModus === 'liste' ? ' an' : ''}" onclick="tierListeModusSetzen('liste')">📋 Liste</button><button type="button" class="saat-chip${tierListeModus === 'album' ? ' an' : ''}" onclick="tierListeModusSetzen('album')">🗂️ Sammelkarten</button></div>`;
  if (tierListeModus === 'album') return modus + tierAlbumGridHtml(liste, sicht) + neuKnopf;
  return modus + `<div class="tier-grid">${liste.map(t => {
    const s = sicht[t.id];
    return `<button type="button" class="tier-karte${s ? ' entdeckt' : ''}" onclick="tierDetailOeffnen('${t.id}')">
      <span class="tier-icon">${tierIconHtml(t)}</span>
      <span class="tier-karte-text">
        <span class="tier-name">${escapeHtml(t.name)}${s ? ' <span class="tier-gesehen-mark" title="Schon entdeckt">👀</span>' : ''}</span>
        <span class="tier-kurz">${escapeHtml(t.kurz)}</span>
        <span class="tier-meta">${TIER_KATEGORIEN[t.kat].split(' ')[0]} · ${t.eigen ? '✍️ selbst eingetragen' : TIER_AUFWAND[t.aufwand]}</span>
      </span>
    </button>`;
  }).join('')}</div>${neuKnopf}`;
}


// ==================== NISTKASTEN-SKIZZEN (Sprung zu den Bauplänen im Handwerk-Modul) ====================
const NIST_BAUPLAENE = {
  nist_meise: { name: 'Meisenkasten', fuer: 'Blau- & Kohlmeise · Ø 28 / 32 mm' },
  nist_star: { name: 'Starenkasten', fuer: 'Star · Ø 45 mm' },
  nist_halbhoehle: { name: 'Halbhöhle', fuer: 'Rotkehlchen, Hausrotschwanz' },
  nist_sperling: { name: 'Sperlingshaus', fuer: 'Spatz · 3 Kammern, Ø 32–35 mm' },
  nist_mauersegler: { name: 'Mauerseglerkasten', fuer: 'Mauersegler · hoch am Haus' },
};
function nistSkizzeSvg(id) {
  const H = '#d9b382', K = '#8a6237', L = '#3a2e1f', R = 'stroke="' + K + '" stroke-width="2"';
  const rect = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f || H}" ${R} rx="1.5"/>`;
  let i = '';
  if (id === 'nist_meise') i = rect(37, 8, 26, 86, '#b88a55') + rect(31, 30, 38, 56) + rect(27, 23, 46, 8, K) + `<circle cx="50" cy="48" r="5" fill="${L}"/>`;
  else if (id === 'nist_star') i = rect(36, 4, 28, 92, '#b88a55') + rect(25, 22, 50, 66) + rect(21, 15, 58, 8, K) + `<circle cx="50" cy="40" r="8.5" fill="${L}"/>`;
  else if (id === 'nist_halbhoehle') i = rect(38, 14, 24, 80, '#b88a55') + rect(29, 36, 42, 48) + `<rect x="33" y="40" width="34" height="20" fill="${L}"/>` + rect(29, 60, 42, 24) + rect(25, 29, 50, 8, K);
  else if (id === 'nist_sperling') i = rect(6, 30, 88, 10, '#b88a55') + rect(8, 40, 84, 40) + rect(4, 34, 92, 8, K) + [24, 50, 76].map(x => `<circle cx="${x}" cy="58" r="5.5" fill="${L}"/>`).join('');
  else if (id === 'nist_mauersegler') i = `<path d="M2 26 L98 26" stroke="#9a8b74" stroke-width="5"/>` + rect(10, 40, 80, 30) + rect(10, 33, 80, 8, K) + `<ellipse cx="24" cy="64" rx="8" ry="4" fill="${L}"/>`;
  return `<svg viewBox="0 0 100 100" class="nist-skizze" aria-hidden="true">${i}</svg>`;
}
function nistBauplanOeffnen(id) {
  try { localStorage.setItem('handwerk_bauplanOeffnen', id || 'nist_meise'); } catch (e) {}
  if (window.parent && window.parent !== window) {
    try { window.parent.postMessage({ type: 'navigiere', modul: 'handwerk' }, window.location.origin); } catch (e) {}
  } else {
    window.location.href = 'handwerk.html';
  }
}
function TIER_ID_TIERE(pid) { return alleTiere().filter(t => (t.projekte || []).includes(pid)); }
// Varianten, Material, Skizze, Pflanzen, Pflege & Fehler (z. B. Mini-Wasserstelle)
function renderProjektExtrasHtml(p) {
  let h = (p.varianten || []).map(v => `<div class="ws-variante"><h4>${escapeHtml(v.titel)}</h4><div class="ws-info">${escapeHtml(v.info || '')}</div>
      ${v.material ? `<b style="font-size:0.74rem">🧺 Material</b><ul>${v.material.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}
      <b style="font-size:0.74rem">🛠️ So geht’s</b><ol>${v.schritte.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol></div>`).join('');
  if (p.id === 'miniwasser') h += `<div class="tier-abschnitt-titel">📐 Skizzen für 30 × 50 cm</div><div class="ws-skizzen">
      <div class="ws-skizze"><div class="ws-skizze-titel">A · Tränken-Duo, von oben</div>${wsSkizzeDuo()}</div>
      <div class="ws-skizze"><div class="ws-skizze-titel">B · Mini-Teich, im Querschnitt</div>${wsSkizzeTeich()}</div></div>`;
  if (p.pflanzen) h += `<div class="tier-abschnitt-titel">🌿 Pflanzen für den Mini-Teich</div><table class="ws-tabelle">${p.pflanzen.map(z => `<tr><td>${escapeHtml(z[0])}</td><td>${escapeHtml(z[1])}</td></tr>`).join('')}</table>
      <div class="tier-meta" style="margin-top:4px">Ein bis drei Pflanzen reichen – heimische Arten, im Körbchen, damit sie die Wanne nicht zuwuchern.</div>`;
  if (p.pflege) h += `<div class="tier-abschnitt-titel">📅 Pflege durchs Jahr</div><table class="ws-tabelle">${p.pflege.map(z => `<tr><td>${escapeHtml(z[0])}</td><td>${escapeHtml(z[1])}</td></tr>`).join('')}</table>`;
  if (p.fehler) h += `<div class="tier-abschnitt-titel">⚠️ Typische Fehler</div><ul class="ws-fehler" style="margin:4px 0 0 18px">${p.fehler.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`;
  return h;
}
// Skizze A: Draufsicht 50 × 30 cm (Maßstab 5 px = 1 cm)
function wsSkizzeDuo() {
  return `<svg viewBox="0 0 300 212" role="img" aria-label="Skizze: Insektentränke erhöht und Bodentränke nebeneinander auf 50 mal 30 Zentimetern">
    <rect x="25" y="25" width="250" height="150" rx="6" fill="rgba(127,164,118,0.18)" stroke="currentColor" stroke-dasharray="5 4" stroke-width="1.2"/>
    <g><rect x="45" y="45" width="110" height="110" rx="8" fill="rgba(160,120,80,0.35)" stroke="currentColor" stroke-width="0.8"/>
      <circle cx="100" cy="100" r="62" fill="rgba(91,139,181,0.45)" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="82" cy="88" r="12" fill="#9a8f80"/><circle cx="114" cy="112" r="10" fill="#8b8173"/><circle cx="108" cy="78" r="7" fill="#a59a8b"/>
      <path d="M68 118 L124 70" stroke="#7a5a36" stroke-width="5" stroke-linecap="round"/><circle cx="92" cy="122" r="6" fill="#6f9a5a"/></g>
    <g><circle cx="215" cy="100" r="50" fill="rgba(91,139,181,0.45)" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="215" cy="100" r="14" fill="#9a8f80"/></g>
    <g font-size="10" fill="currentColor" font-family="Inter, sans-serif">
      <text x="150" y="18" text-anchor="middle">50 cm</text>
      <text x="12" y="100" text-anchor="middle" transform="rotate(-90 12 100)">30 cm</text>
      <text x="100" y="192" text-anchor="middle">Insektentränke ⌀ 25 cm</text><text x="100" y="205" text-anchor="middle" font-size="8.5">auf Sockel, 20–40 cm</text>
      <text x="215" y="192" text-anchor="middle">Bodentränke ⌀ 20 cm</text><text x="215" y="205" text-anchor="middle" font-size="8.5">ebenerdig</text>
    </g></svg>`;
}
// Skizze B: Querschnitt der eingegrabenen Wanne
function wsSkizzeTeich() {
  return `<svg viewBox="0 0 300 200" role="img" aria-label="Skizze: eingegrabene Wanne mit Steinstufen, Ast als Ausstieg, Pflanzkorb und Gitter">
    <rect x="0" y="62" width="300" height="138" fill="rgba(140,105,70,0.28)"/>
    <path d="M0 62 H300" stroke="#6f9a5a" stroke-width="4"/>
    <path d="M50 62 L58 168 H242 L250 62" fill="rgba(91,139,181,0.42)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M57 160 H243" stroke="#c9b48a" stroke-width="12"/>
    <rect x="58" y="70" width="184" height="2" fill="rgba(91,139,181,0.9)"/>
    <path d="M52 75 H248" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1"/>
    <g fill="#9a8f80" stroke="currentColor" stroke-width="0.6"><rect x="196" y="128" width="44" height="26" rx="5"/><rect x="206" y="104" width="34" height="24" rx="5"/><rect x="216" y="84" width="24" height="20" rx="5"/></g>
    <path d="M150 116 L262 48" stroke="#7a5a36" stroke-width="6" stroke-linecap="round"/>
    <rect x="78" y="118" width="40" height="36" fill="#6b5a44" stroke="currentColor" stroke-width="0.8"/>
    <path d="M90 118 C88 96 84 78 80 40 M100 118 C100 92 102 70 104 32 M110 118 C112 98 116 80 122 50" stroke="#5f8f4e" stroke-width="3" fill="none"/>
    <g font-size="10" fill="currentColor" font-family="Inter, sans-serif">
      <text x="150" y="14" text-anchor="middle">Wanne ca. 40 × 30 cm, bündig eingegraben</text>
      <text x="270" y="40" text-anchor="end" font-size="8.5">Ast als Rampe</text>
      <text x="245" y="194" text-anchor="end" font-size="8.5">Steinstufen als Ausstieg</text>
      <text x="60" y="194" font-size="8.5">Sand-Kies</text>
      <text x="40" y="112" text-anchor="end" font-size="8.5">Pflanz-</text><text x="40" y="122" text-anchor="end" font-size="8.5">korb</text>
      <text x="150" y="88" text-anchor="middle" font-size="8.5">- - Gitter (bei Kindern)</text>
    </g></svg>`;
}

// ==================== 💦 MEINE WASSERSTELLEN (mit Wasserwechsel im Pflegeplan) ====================
// gardens[id].wasserstellen = [{ id, typ: 'traenke'|'boden'|'teich', name, angelegt, zuletzt }]
const WASSERSTELLEN_TYPEN = {
  traenke: { icon: '🥣', name: 'Insektentränke', intervall: 2, text: 'Wasser wechseln' },
  boden: { icon: '🦔', name: 'Bodentränke', intervall: 2, text: 'Wasser wechseln' },
  teich: { icon: '💧', name: 'Mini-Teich', intervall: 7, text: 'Wasserstand prüfen, mit Regenwasser auffüllen' },
};
function gartenWasserstellen() {
  const g = gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.wasserstellen)) g.wasserstellen = [];
  return g.wasserstellen;
}
function wsTageSeit(iso) { if (!iso) return null; const a = new Date(iso + 'T00:00:00'), h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((h - a) / 864e5); }
// Fälligkeit: Tränken alle 2 Tage (bei Hitze täglich), Mini-Teich wöchentlich (bei Hitze alle 2 Tage, im Winter Ruhe)
function wsFaelligkeit(w, heiss) {
  const typ = WASSERSTELLEN_TYPEN[w.typ] || WASSERSTELLEN_TYPEN.traenke;
  const monat = new Date().getMonth() + 1;
  if (w.typ === 'teich' && (monat >= 11 || monat <= 2)) return null;
  const intervall = heiss ? (w.typ === 'teich' ? 2 : 1) : typ.intervall;
  const seit = wsTageSeit(w.zuletzt || w.angelegt);
  if (seit === null) return { dueToday: true, dueIn: 0, intervall };
  return { dueToday: seit >= intervall, dueIn: Math.max(0, intervall - seit), seit, intervall };
}
function wsHeissJetzt() {
  try { return !!(typeof getUpcomingHeatWarning === 'function' && getUpcomingHeatWarning()); } catch (e) { return false; }
}
function renderMeineWasserstellenHtml() {
  const liste = gartenWasserstellen();
  const heiss = wsHeissJetzt();
  const zeilen = liste.map(w => {
    const typ = WASSERSTELLEN_TYPEN[w.typ] || WASSERSTELLEN_TYPEN.traenke;
    const f = wsFaelligkeit(w, heiss);
    const seit = wsTageSeit(w.zuletzt || w.angelegt);
    const stand = w.zuletzt ? (seit === 0 ? 'heute frisch' : seit === 1 ? 'gestern frisch' : 'zuletzt vor ' + seit + ' Tagen') : 'noch nicht abgehakt';
    const faellig = f && f.dueToday;
    return `<div class="ws-zeile"><span style="font-size:1.2rem">${typ.icon}</span><span class="ws-name">${escapeHtml(w.name || typ.name)}
      <small class="${faellig ? 'faellig' : ''}">${escapeHtml(stand)}${f ? (faellig ? ' · 💧 heute fällig' : ' · nächstes Mal in ' + f.dueIn + ' Tag' + (f.dueIn === 1 ? '' : 'en')) : ' · Winterruhe'}${heiss && f ? ' (Hitze)' : ''}</small></span>
      <button type="button" class="${faellig ? 'haupt' : ''}" onclick="wasserstelleGewechselt('${w.id}')">✓ ${w.typ === 'teich' ? 'Geprüft' : 'Gewechselt'}</button>
      <button type="button" onclick="wasserstelleUmbenennen('${w.id}')" title="Umbenennen" aria-label="Umbenennen">✏️</button>
      <button type="button" onclick="wasserstelleEntfernen('${w.id}')" title="Entfernen" aria-label="Entfernen">🗑</button></div>`;
  }).join('');
  return `<div class="ws-meine"><div class="tier-abschnitt-titel" style="margin-top:0">💦 Meine Wasserstellen</div>
    ${liste.length ? zeilen : '<div class="tier-meta">Trag ein, was du angelegt hast – dann erinnert der Pflegeplan ans frische Wasser (bei Hitze täglich).</div>'}
    <div class="ws-neu">${Object.entries(WASSERSTELLEN_TYPEN).map(([id, t]) => `<button type="button" onclick="wasserstelleNeu('${id}')">＋ ${t.icon} ${escapeHtml(t.name)}</button>`).join('')}</div></div>`;
}
function wsNeuZeichnen() { tierProjektOffen = 'miniwasser'; saveData(); if (typeof renderTiere === 'function') renderTiere(); }
function wasserstelleNeu(typ) {
  const t = WASSERSTELLEN_TYPEN[typ]; if (!t) return;
  const name = prompt('Name der Wasserstelle (z. B. „' + t.name + ' am Beet“):', t.name);
  if (name === null) return;
  gartenWasserstellen().push({ id: 'ws' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), typ, name: name.trim() || t.name, angelegt: heuteISO(), zuletzt: heuteISO() });
  wsNeuZeichnen();
  showTempStatus('💦 ' + (name.trim() || t.name) + ' eingetragen – der Pflegeplan erinnert ans Wasser', 4);
}
function wasserstelleGewechselt(id) {
  const w = gartenWasserstellen().find(x => x.id === id); if (!w) return;
  const vorher = w.zuletzt;
  w.zuletzt = heuteISO();
  wsNeuZeichnen();
  showTempStatus('💧 Frisches Wasser – danke!', 4, { label: 'Rückgängig', aktion: () => { w.zuletzt = vorher; wsNeuZeichnen(); } });
}
function wasserstelleUmbenennen(id) {
  const w = gartenWasserstellen().find(x => x.id === id); if (!w) return;
  const name = prompt('Neuer Name:', w.name || '');
  if (name === null || !name.trim()) return;
  w.name = name.trim(); wsNeuZeichnen();
}
function wasserstelleEntfernen(id) {
  const liste = gartenWasserstellen();
  const i = liste.findIndex(x => x.id === id); if (i === -1) return;
  const weg = liste.splice(i, 1)[0];
  wsNeuZeichnen();
  showTempStatus('🗑 „' + (weg.name || 'Wasserstelle') + '“ entfernt', 5, { label: 'Rückgängig', aktion: () => { liste.splice(i, 0, weg); wsNeuZeichnen(); } });
}
// Pflegeplan-Aufgaben für die Wasserstellen
function wasserstellenPflegeItems(heiss) {
  const items = [];
  gartenWasserstellen().forEach(w => {
    const typ = WASSERSTELLEN_TYPEN[w.typ] || WASSERSTELLEN_TYPEN.traenke;
    const f = wsFaelligkeit(w, heiss);
    if (!f) return;
    const id = 'ws_' + w.id + '_traenke';
    const heuteErledigt = isCareTaskDone(id) && wsTageSeit(w.zuletzt) === 0;
    if (!f.dueToday && !heuteErledigt && f.dueIn > 1) return;
    items.push({ id, bed: 'Wasserstelle', plant: w.name || typ.name, sym: typ.icon, kind: 'traenke', urgent: f.dueToday || heuteErledigt,
      text: (f.dueToday || heuteErledigt) ? '💧 ' + typ.text + (heiss ? ' (Hitze)' : '') : 'morgen wieder', dueInDays: (f.dueToday || heuteErledigt) ? 0 : f.dueIn });
  });
  return items;
}
// Abhaken im Pflegeplan trägt „frisches Wasser“ ein (Rückgängig stellt den alten Stand wieder her)
function wasserstelleBeimAbhaken(id, jetztErledigt) {
  const m = /^ws_(.+)_traenke$/.exec(id); if (!m) return;
  const w = gartenWasserstellen().find(x => x.id === m[1]); if (!w) return;
  const state = getCareDoneState();
  state.wsVorher = state.wsVorher || {};
  if (jetztErledigt) { if (!(id in state.wsVorher)) state.wsVorher[id] = w.zuletzt || null; w.zuletzt = heuteISO(); }
  else if (id in state.wsVorher) { if (state.wsVorher[id]) w.zuletzt = state.wsVorher[id]; else delete w.zuletzt; delete state.wsVorher[id]; }
  localStorage.setItem('gartenplaner_careDone', JSON.stringify(state));
  saveData();
}

function renderBauplaeneHtml(ids) {
  return `<div class="tier-abschnitt-titel">📐 Baupläne zum Nachbauen</div>
    <div class="nist-bp-raster">${ids.map(id => { const b = NIST_BAUPLAENE[id]; return b ? `<button type="button" class="nist-bp-karte" onclick="nistBauplanOeffnen('${id}')">
      ${nistSkizzeSvg(id)}<span class="nist-bp-name">${escapeHtml(b.name)}</span><span class="nist-bp-fuer">${escapeHtml(b.fuer)}</span></button>` : ''; }).join('')}</div>
    <button type="button" class="nist-bp-link" onclick="nistBauplanOeffnen('${ids[0]}')">🔨 Baupläne mit Maßen &amp; Zuschnitt im Handwerk-Modul öffnen ›</button>`;
}

let tierProjektOffen = null; // bleibt nach dem Neuzeichnen aufgeklappt (z. B. nach „＋ Wasserstelle“)
function renderTierProjekteHtml() {
  return `<p class="tier-einleitung">Kleine und große Projekte – viele davon kann man gut zusammen mit Kindern bauen. Unter jedem Projekt steht, welche Tiere davon profitieren.</p>` +
    TIER_PROJEKTE.map(p => {
      const tiere = TIER_ID_TIERE(p.id);
      return `<details class="tier-projekt" id="tierProjekt-${p.id}"${tierProjektOffen === p.id ? ' open' : ''}>
        <summary><span class="tier-projekt-icon">${p.icon}</span><span class="tier-projekt-kopf"><b>${escapeHtml(p.titel)}</b><span class="tier-meta">${TIER_AUFWAND[p.aufwand]} · 📅 ${escapeHtml(p.zeit)}</span></span><span class="vlist-pfeil">▸</span></summary>
        <div class="tier-projekt-inhalt">
          <p>${escapeHtml(p.kurz)}</p>
          ${p.schritte && p.schritte.length ? `<ol>${p.schritte.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}
          ${p.varianten ? renderProjektExtrasHtml(p) : ''}
          ${p.tipp ? `<div class="tier-tipp">💡 ${escapeHtml(p.tipp)}</div>` : ''}
          ${p.bauplaene ? renderBauplaeneHtml(p.bauplaene) : ''}
          ${p.id === 'miniwasser' ? renderMeineWasserstellenHtml() : ''}
          ${tiere.length ? `<div class="tier-abschnitt-titel">Hilft diesen Tieren</div><div class="tier-chips">${tiere.map(t => `<button type="button" class="tier-chip tier-chip-btn" onclick="tierDetailOeffnen('${t.id}')">${t.icon} ${escapeHtml(t.name)}</button>`).join('')}</div>` : ''}
        </div>
      </details>`;
    }).join('');
}

function renderTierPflanzenHtml() {
  const set = tierGartenPflanzenSet();
  return `<p class="tier-einleitung">Damit das ganze Jahr über etwas zu holen ist. Pflanzen mit <span class="tier-chip da" style="display:inline-block">✓</span> wachsen schon in deinem Garten.</p>` +
    TIER_PFLANZEN_SAISON.map(s => `<div class="tier-saison">
      <div class="tier-saison-kopf"><b>${s.titel}</b><span class="tier-meta">${escapeHtml(s.zeit)}</span></div>
      <p>${escapeHtml(s.text)}</p>
      ${s.pflanzen.map(([n, wer]) => {
        const da = tierPflanzeImGarten(n, set);
        const p = PLANTS.find(x => x.name === n);
        return `<div class="tier-pflanze-zeile${da ? ' da' : ''}"><span class="tpz-name">${p ? p.sym + ' ' : ''}${escapeHtml(n)}${da ? ' ✓' : ''}</span><span class="tpz-wer">${escapeHtml(wer)}</span></div>`;
      }).join('')}
    </div>`).join('');
}

function renderTierRegelnHtml() {
  return `<p class="tier-einleitung">Sieben einfache Regeln, mit denen jeder Garten tierfreundlicher wird – ganz ohne großen Aufwand.</p>` +
    TIER_REGELN.map(([icon, t, txt], i) => `<div class="tier-regel"><span class="tier-regel-nr">${icon}</span><div><b>${i + 1}. ${escapeHtml(t)}</b><p>${escapeHtml(txt)}</p></div></div>`).join('');
}

// ---------- Detail-Fenster ----------
function tierDetailOeffnen(id) {
  tierDetailId = id;
  tierDetailRendern();
  const m = document.getElementById('tierDetailModal');
  m.style.display = 'flex';
  const inhalt = m.querySelector('.modal');
  if (inhalt) inhalt.scrollTop = 0;
}
function tierDetailSchliessen() {
  document.getElementById('tierDetailModal').style.display = 'none';
  tierDetailId = null;
}
function tierDetailRendern() {
  const t = alleTiere().find(x => x.id === tierDetailId);
  if (!t) return;
  const set = tierGartenPflanzenSet();
  const s = tierSichtungen()[t.id];
  const projekte = t.projekte.map(pid => TIER_PROJEKTE.find(p => p.id === pid)).filter(Boolean);
  if (t.eigen) {
    const ab = (titel, text) => text ? `<div class="tier-abschnitt-titel">${titel}</div><p class="tier-p">${escapeHtml(text).replace(/\n/g, '<br>')}</p>` : '';
    const datumE = d => new Date(d + 'T00:00').toLocaleDateString('de-DE');
    document.getElementById('tierDetailInhalt').innerHTML = `
      <div class="tier-detail-kopf"><span class="tier-detail-icon">${tierIconHtml(t)}</span>
        <div><h2 style="margin:0">${escapeHtml(t.name)}</h2>${t.latein ? `<div class="tier-meta"><i>${escapeHtml(t.latein)}</i></div>` : ''}
          <div class="tier-meta">${TIER_KATEGORIEN[t.kat]} · ✍️ selbst eingetragen</div></div></div>
      ${t.kurz && t.kurz !== 'Eigenes Tier' ? `<p class="tier-p">${escapeHtml(t.kurz)}</p>` : ''}
      ${tierFotosHtml(t.id)}
      ${ab('🍽️ Was frisst es?', t.nahrung)}${ab('🏠 Wo wohnt es?', t.wohnung)}${ab('📝 Notizen', t.notiz)}
      ${beobTierDetailHtml(t.id)}
      <div class="tier-gesehen-box">
        ${s ? `<div>👀 Schon <b>${s.anzahl}×</b> gesehen · zuerst am ${datumE(s.erst)}${s.zuletzt !== s.erst ? `, zuletzt am ${datumE(s.zuletzt)}` : ''}</div>` : '<div>Habt ihr es im Garten beobachtet?</div>'}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button type="button" class="btn-primary" style="flex:1" onclick="tierGesehen('${t.id}')">👀 Gesehen!</button>
          ${s ? `<button type="button" class="btn-secondary" style="width:auto;margin:0" onclick="tierGesehenZurueck('${t.id}')" title="Letzte Sichtung zurücknehmen">↩</button>` : ''}
        </div>
      </div>
      <button type="button" class="btn-secondary" style="width:100%;margin-top:8px" onclick="eigenesTierOeffnen('${t.id}')">✏️ Bearbeiten</button>`;
    return;
  }
  const liste = (arr) => `<ul class="tier-liste">${arr.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  const datum = d => new Date(d + 'T00:00').toLocaleDateString('de-DE');
  document.getElementById('tierDetailInhalt').innerHTML = `
    <div class="tier-detail-kopf">
      <span class="tier-detail-icon">${tierIconHtml(t)}</span>
      <div><h2 style="margin:0">${escapeHtml(t.name)}</h2>
        <div class="tier-meta"><i>${escapeHtml(t.latein)}</i></div>
        <div class="tier-meta">${TIER_KATEGORIEN[t.kat]} · Ansiedeln: ${TIER_AUFWAND[t.aufwand]}</div></div>
    </div>
    ${tierFotosHtml(t.id)}
    ${t.woranEsHaengt ? `<div class="tier-selten"><b>🔴 Seltener Fund – woran es hängt</b><br>${escapeHtml(t.woranEsHaengt)}</div>` : ''}
    <div class="tier-wusstest"><b>🧒 Wusstest du?</b><br>${escapeHtml(t.wusstest)}</div>
    <div class="tier-abschnitt-titel">📅 Wann zu sehen</div>${tierMonateHtml(t.monate)}
    <div class="tier-abschnitt-titel">🍽️ Was frisst es?</div><p class="tier-p">${escapeHtml(t.nahrung)}</p>
    <div class="tier-abschnitt-titel">🏠 Wo wohnt es?</div><p class="tier-p">${escapeHtml(t.wohnung)}</p>
    ${t.pflanzen.length ? `<div class="tier-abschnitt-titel">🌼 Diese Pflanzen helfen</div><div class="tier-chips">${tierPflanzenChips(t.pflanzen, set)}</div>` : ''}
    <div class="tier-abschnitt-titel">✅ So lockst du es an</div>${liste(t.tun)}
    ${t.meiden.length ? `<div class="tier-abschnitt-titel">⛔ Lieber vermeiden</div>${liste(t.meiden)}` : ''}
    ${projekte.length ? `<div class="tier-abschnitt-titel">🔨 Passende Projekte</div><div class="tier-chips">${projekte.map(p => `<button type="button" class="tier-chip tier-chip-btn" onclick="tierProjektZeigen('${p.id}')">${p.icon} ${escapeHtml(p.titel)}</button>`).join('')}</div>` : ''}
    ${beobTierDetailHtml(t.id)}
    <div class="tier-gesehen-box">
      ${s ? `<div>👀 Schon <b>${s.anzahl}×</b> gesehen · zuerst am ${datum(s.erst)}${s.zuletzt !== s.erst ? `, zuletzt am ${datum(s.zuletzt)}` : ''}</div>` : '<div>Habt ihr es im Garten beobachtet?</div>'}
      <div style="display:flex;gap:6px;margin-top:8px">
        <button type="button" class="btn-primary" style="flex:1" onclick="tierGesehen('${t.id}')">👀 Gesehen!</button>
        ${s ? `<button type="button" class="btn-secondary" style="width:auto;margin:0" onclick="tierGesehenZurueck('${t.id}')" title="Letzte Sichtung zurücknehmen">↩</button>` : ''}
      </div>
    </div>`;
}
function tierProjektZeigen(pid) {
  tierDetailSchliessen();
  tierAnsicht = 'bauen';
  renderTiere();
  const el = document.getElementById('tierProjekt-' + pid);
  if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function tierGesehen(id) {
  const sicht = tierSichtungen();
  const heute = heuteISO();
  const neu = !sicht[id];
  if (neu) sicht[id] = { anzahl: 0, erst: heute, zuletzt: heute };
  // Jahresdaten fürs „Tierjahr“ (ältere Einträge werden einmalig abgeleitet)
  if (!sicht[id].jahre) sicht[id].jahre = neu ? {} : sichtJahre(sicht[id]);
  const jahr = heute.slice(0, 4);
  if (!sicht[id].jahre[jahr]) sicht[id].jahre[jahr] = { erst: heute, anzahl: 0 };
  sicht[id].jahre[jahr].anzahl++;
  sicht[id].anzahl++;
  sicht[id].zuletzt = heute;
  const tt = alleTiere().find(x => x.id === id);
  if (tt) { sicht[id].name = tt.name; sicht[id].icon = tt.icon; }
  // Kurzes Tagebuch der Sichtungen – die Übersicht zeigt daraus die Highlights der Woche
  tierLog().push({ datum: heute, tierId: id, name: tt ? tt.name : '', icon: tt ? tt.icon : '🐾', neu, von: (typeof gartenIchBin === 'function' && gartenIchBin()) || null });
  saveData();
  tierDetailRendern();
  renderTiere();
  const t = alleTiere().find(x => x.id === id);
  showTempStatus(neu ? (t && t.aufwand === 4 ? `🔴✨ Seltener Fund: ${t.name}! Wow!` : `🎉 Neu entdeckt: ${t ? t.name : ''}!`) : '👀 Sichtung eingetragen', 3);
}
function tierGesehenZurueck(id) {
  const sicht = tierSichtungen();
  if (!sicht[id]) return;
  sicht[id].anzahl--;
  const jj = sicht[id].jahre && sicht[id].jahre[heuteISO().slice(0, 4)];
  if (jj) { jj.anzahl--; if (jj.anzahl <= 0) delete sicht[id].jahre[heuteISO().slice(0, 4)]; }
  if (sicht[id].anzahl <= 0) delete sicht[id];
  const log = tierLog();
  for (let i = log.length - 1; i >= 0; i--) if (log[i].tierId === id) { log.splice(i, 1); break; }
  saveData();
  tierDetailRendern();
  renderTiere();
}

// ==================== 🔗 BEOBACHTUNGEN: Welches Tier an welcher Pflanze? ====================
// gardens[id].beobachtungen = [{ id, datum, tierId|null, tierName, pflanze, art, anzahl, notiz, fotos: [] , von }]
// Wird mit dem Garten synchronisiert; Fotos laufen wie Pflanzenfotos über den Familien-Fotospeicher.
const BEOB_ARTEN = [
  { id: 'nektar', icon: '🌸', label: 'Nektar/Pollen' },
  { id: 'raupe', icon: '🐛', label: 'Raupe frisst Blätter' },
  { id: 'eier', icon: '🥚', label: 'Eiablage' },
  { id: 'beeren', icon: '🫐', label: 'frisst Beeren/Früchte' },
  { id: 'samen', icon: '🌾', label: 'frisst Samen' },
  { id: 'wohnt', icon: '🏠', label: 'wohnt/versteckt sich' },
  { id: 'jagt', icon: '🎯', label: 'jagt Schädlinge' },
  { id: 'nistkasten', icon: '🪺', label: 'Nistkasten/Nisthilfe' },
  { id: 'bau', icon: '🕳️', label: 'Höhle/Bau' },
  { id: 'winter', icon: '❄️', label: 'überwintert hier' },
  { id: 'sonst', icon: '✏️', label: 'Sonstiges' },
];
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
let beobAnsicht = 'pflanze';
let beobJahr = new Date().getFullYear();
let beobEditId = null, beobEditArt = 'nektar', beobEditFotos = [];
function beobArt(id) { return BEOB_ARTEN.find(a => a.id === id) || BEOB_ARTEN[BEOB_ARTEN.length - 1]; }
function gartenBeobachtungen() {
  const g = gardens[currentGardenId];
  if (!g) return [];
  if (!Array.isArray(g.beobachtungen)) g.beobachtungen = [];
  return g.beobachtungen;
}
function beobNorm(s) { return String(s || '').trim().toLowerCase(); }
function beobTierInfo(b) { return b.tierId ? alleTiere().find(t => t.id === b.tierId) : null; }
function beobTierLabel(b) { const t = beobTierInfo(b); return t ? t.name : (b.tierName || 'Unbekanntes Tier'); }
function beobTierIcon(b) { const t = beobTierInfo(b); return t ? t.icon : '🔎'; }
function beobTierKey(b) { return b.tierId ? 't:' + b.tierId : 'f:' + beobNorm(b.tierName); }
function beobPflanzeKey(b) { return beobNorm(b.pflanze); }
// Pflanzennamen im aktuellen Garten (Beete + freistehend) – für Vorschläge
function beobGartenPflanzenNamen() {
  const set = new Map();
  getCurrentBeds().forEach(bd => (bd.plants || []).forEach(p => { const n = (p.name || '').trim(); if (n) set.set(beobNorm(n), { name: n, sym: p.sym || '🌱' }); }));
  getCurrentFreiPflanzen().forEach(p => { const n = (p.name || '').trim(); if (n) set.set(beobNorm(n), { name: n, sym: p.sym || '🌳' }); });
  return set;
}
function beobPflanzeSym(name) {
  const g = beobGartenPflanzenNamen().get(beobNorm(name));
  if (g) return g.sym;
  const p = (typeof PLANTS !== 'undefined') && PLANTS.find(x => beobNorm(x.name) === beobNorm(name));
  return p ? p.sym : '🌿';
}
function beobDatumText(iso) { return new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }); }

// ---------- Erfassen / Bearbeiten ----------
function beobachtungNeu(vorgabe) {
  vorgabe = vorgabe || {};
  beobEditId = null;
  beobFormFuellen({ datum: heuteISO(), anzahl: 1, art: vorgabe.art || 'nektar', tierId: vorgabe.tierId || null, tierName: vorgabe.tierName || '', pflanze: vorgabe.pflanze || '', notiz: '', fotos: [], pos: vorgabe.pos || null });
}
function beobachtungBearbeiten(id) {
  const b = gartenBeobachtungen().find(x => x.id === id);
  if (!b) return;
  beobEditId = id;
  beobFormFuellen(b);
}
function beobFormFuellen(b) {
  document.getElementById('beobTitel').textContent = beobEditId ? '✏️ Beobachtung bearbeiten' : '📝 Beobachtung notieren';
  document.getElementById('beobTier').value = b.tierId ? (alleTiere().find(t => t.id === b.tierId) || {}).name || '' : (b.tierName || '');
  document.getElementById('beobPflanze').value = b.pflanze || '';
  document.getElementById('beobDatum').value = b.datum || heuteISO();
  document.getElementById('beobAnzahl').value = b.anzahl || 1;
  document.getElementById('beobNotiz').value = b.notiz || '';
  beobEditArt = b.art || 'nektar';
  beobEditFotos = (b.fotos || []).slice();
  beobEditPos = b.pos ? { x: b.pos.x, y: b.pos.y } : null;
  beobOrtRendern();
  // Vorschläge: alle Tiere der Liste + bisher frei eingetragene; Pflanzen aus dem Garten + bisherige
  const tiere = alleTiere().map(t => t.name).concat(gartenBeobachtungen().filter(x => !x.tierId && x.tierName).map(x => x.tierName));
  document.getElementById('beobTierListe').innerHTML = [...new Set(tiere)].map(n => `<option value="${escapeHtml(n)}">`).join('');
  const pfl = [...beobGartenPflanzenNamen().values()].map(p => p.name).concat(gartenBeobachtungen().map(x => x.pflanze).filter(Boolean));
  document.getElementById('beobPflanzeListe').innerHTML = [...new Set(pfl.map(n => n.trim()))].sort((a, c) => a.localeCompare(c, 'de')).map(n => `<option value="${escapeHtml(n)}">`).join('');
  beobArtenRendern();
  beobFotoRendern();
  beobTierHinweis();
  document.getElementById('beobLoeschen').style.display = beobEditId ? '' : 'none';
  document.getElementById('beobModal').style.display = 'flex';
}
function beobArtenRendern() {
  document.getElementById('beobArten').innerHTML = BEOB_ARTEN.map(a => `<button type="button" class="saat-chip${a.id === beobEditArt ? ' an' : ''}" onclick="beobEditArt='${a.id}';beobArtenRendern()">${a.icon} ${escapeHtml(a.label)}</button>`).join('');
}
function beobTierErkennen(text) {
  const n = beobNorm(text);
  if (!n) return null;
  // genau → „Hummel“ ↔ „Hummeln“ → „Tagpfauenauge-Raupe“ enthält „Tagpfauenauge“
  return alleTiere().find(t => beobNorm(t.name) === n) || alleTiere().find(t => beobNorm(t.name).includes(n) && n.length >= 4) ||
    alleTiere().find(t => beobNorm(t.name).length >= 5 && n.includes(beobNorm(t.name).replace(/(n|en)$/, ''))) || null;
}
function beobTierHinweis() {
  const t = beobTierErkennen(document.getElementById('beobTier').value);
  const box = document.getElementById('beobTierInfo');
  box.innerHTML = t ? `${t.icon} <b>${escapeHtml(t.name)}</b> – zählt auch als „Gesehen“` : (document.getElementById('beobTier').value.trim() ? '🔎 Freier Eintrag (nicht in der Tierliste)' : '');
}
function beobFotoRendern() {
  const box = document.getElementById('beobFotos');
  box.innerHTML = beobEditFotos.map((f, i) => `<span class="beob-foto"><img src="${escapeHtml(fotoQuelle(f))}" alt=""><button type="button" onclick="beobEditFotos.splice(${i},1);beobFotoRendern()" aria-label="Foto entfernen">✕</button></span>`).join('') +
    (beobEditFotos.length < 3 ? `<label class="beob-foto-neu">📷<input type="file" accept="image/*" onchange="beobFotoGewaehlt(event)"></label>` : '');
}
function beobFotoGewaehlt(ev) {
  const datei = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!datei) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280, f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      beobEditFotos.push({ id: fotoNeueId(), data: c.toDataURL('image/jpeg', 0.8), datum: document.getElementById('beobDatum').value || heuteISO() });
      beobFotoRendern();
    };
    img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 4);
    img.src = e.target.result;
  };
  reader.readAsDataURL(datei);
}
function beobSchliessen() { document.getElementById('beobModal').style.display = 'none'; }
function beobSichtungAnpassen(tierId, datum, plus) {
  if (!tierId) return;
  const sicht = tierSichtungen();
  if (plus) {
    if (!sicht[tierId]) sicht[tierId] = { anzahl: 0, erst: datum, zuletzt: datum };
    sicht[tierId].anzahl++;
    if (datum < sicht[tierId].erst) sicht[tierId].erst = datum;
    if (datum > sicht[tierId].zuletzt) sicht[tierId].zuletzt = datum;
  } else if (sicht[tierId]) {
    sicht[tierId].anzahl--;
    if (sicht[tierId].anzahl <= 0) delete sicht[tierId];
  }
}
function beobSpeichern() {
  const tierText = document.getElementById('beobTier').value.trim();
  const pflanze = document.getElementById('beobPflanze').value.trim();
  if (!tierText) { showTempStatus('Bitte eintragen, welches Tier es war.', 3); document.getElementById('beobTier').focus(); return; }
  const t = beobTierErkennen(tierText);
  const datum = document.getElementById('beobDatum').value || heuteISO();
  const liste = gartenBeobachtungen();
  const daten = {
    datum, tierId: t ? t.id : null, tierName: t ? '' : tierText, pflanze, art: beobEditArt,
    anzahl: Math.max(1, Math.round(Number(document.getElementById('beobAnzahl').value) || 1)),
    notiz: document.getElementById('beobNotiz').value.trim(), fotos: beobEditFotos.slice(),
  };
  if (beobEditPos) daten.pos = { x: beobEditPos.x, y: beobEditPos.y };
  let ersteImJahr = false;
  if (beobEditId) {
    const b = liste.find(x => x.id === beobEditId);
    if (!b) return;
    (b.fotos || []).filter(f => !daten.fotos.includes(f)).forEach(fotoCloudLoeschen);
    if (b.tierId !== daten.tierId) { beobSichtungAnpassen(b.tierId, b.datum, false); beobSichtungAnpassen(daten.tierId, datum, true); }
    Object.assign(b, daten);
    if (!beobEditPos) delete b.pos;
  } else {
    const key = daten.tierId ? 't:' + daten.tierId : 'f:' + beobNorm(daten.tierName);
    ersteImJahr = !liste.some(x => beobTierKey(x) === key && String(x.datum).slice(0, 4) === datum.slice(0, 4));
    liste.push(Object.assign({ id: 'beob_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), von: (typeof gartenIchBin === 'function' && gartenIchBin()) || null }, daten));
    beobSichtungAnpassen(daten.tierId, datum, true);
  }
  saveData();
  beobSchliessen();
  if (typeof familienFotosHochladen === 'function') familienFotosHochladen();
  beobAnsichtenAktualisieren();
  const name = t ? t.name : tierText;
  showTempStatus(ersteImJahr ? `🎉 Erste Beobachtung ${datum.slice(0, 4)}: ${name}${pflanze ? ' an ' + pflanze : ''}!` : `📝 ${name}${pflanze ? ' an ' + pflanze : ''} notiert`, 4);
}
function beobLoeschen() {
  const liste = gartenBeobachtungen();
  const i = liste.findIndex(x => x.id === beobEditId);
  if (i === -1) return;
  const weg = liste.splice(i, 1)[0];
  beobSichtungAnpassen(weg.tierId, weg.datum, false);
  saveData();
  beobSchliessen();
  beobAnsichtenAktualisieren();
  showTempStatus('🗑 Beobachtung gelöscht', 6, { label: 'Rückgängig', aktion: () => { liste.splice(i, 0, weg); beobSichtungAnpassen(weg.tierId, weg.datum, true); saveData(); beobAnsichtenAktualisieren(); } });
  // Fotos erst endgültig entfernen, wenn nicht rückgängig gemacht wurde
  setTimeout(() => { if (!liste.includes(weg)) (weg.fotos || []).forEach(fotoCloudLoeschen); }, 9000);
}
// Alles neu zeichnen, was Beobachtungen zeigt
function beobAnsichtenAktualisieren() {
  try { draw(); } catch (e) {}
  const wrap = document.getElementById('tiereWrap');
  if (wrap && wrap.offsetParent) renderTiere();
  if (tierDetailId) tierDetailRendern();
  if (activePlantBedId) { const bd = getCurrentBeds().find(x => x.id === activePlantBedId.bedId); const p = bd && bd.plants[activePlantBedId.idx]; if (p) renderPflanzenBeobachtungen(p.name || '', 'ppBeobBox'); }
  if (activeFreiPflanzeId) { const fp = getCurrentFreiPflanzen().find(x => x.id === activeFreiPflanzeId); if (fp) renderPflanzenBeobachtungen(fp.name || '', 'fpBeobBox'); }
}

// ---------- Auswertung ----------
function beobGruppieren(liste, keyFn) {
  const m = new Map();
  liste.forEach(b => { const k = keyFn(b); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(b); });
  return m;
}
function beobZaehlen(liste) { return liste.reduce((s, b) => s + (b.anzahl || 1), 0); }
function beobArtIcons(liste) { return [...new Set(liste.map(b => beobArt(b.art).icon))].join(''); }
// Pflanzen im Garten → Beobachtungen (für das Pflanzen-Panel)
function renderPflanzenBeobachtungen(name, boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const n = beobNorm(name);
  if (!n) { box.innerHTML = ''; return; }
  const liste = gartenBeobachtungen().filter(b => beobPflanzeKey(b) === n);
  const tiere = [...beobGruppieren(liste, beobTierKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a));
  box.innerHTML = `<div class="beob-pflanze-box"><div class="beob-pflanze-kopf"><b>🦋 Tiere an dieser Pflanze</b>
      <button type="button" onclick="beobachtungNeu({ pflanze: ${escapeHtml(JSON.stringify(name.trim()))} })">＋ Beobachtung</button></div>
    ${tiere.length ? `<div class="tier-chips">${tiere.map(g => `<button type="button" class="tier-chip tier-chip-btn" onclick="${g[0].tierId ? `tierDetailOeffnen('${g[0].tierId}')` : `beobachtungBearbeiten('${g[0].id}')`}">${beobTierIcon(g[0])} ${escapeHtml(beobTierLabel(g[0]))} ${beobArtIcons(g)} <b>${beobZaehlen(g)}×</b></button>`).join('')}</div>`
      : '<div class="tier-meta">Noch nichts beobachtet. Wer trinkt hier Nektar, frisst an den Blättern oder holt sich die Beeren?</div>'}</div>`;
}
function beobJahrListe() { return gartenBeobachtungen().filter(b => String(b.datum).slice(0, 4) === String(beobJahr)); }
function renderBeobachtungenHtml() {
  const alle = gartenBeobachtungen();
  const jahre = [...new Set(alle.map(b => Number(String(b.datum).slice(0, 4))).concat([new Date().getFullYear()]))].sort((a, c) => c - a);
  const liste = beobJahrListe();
  const ansichten = [['pflanze', '🌼 Nach Pflanze'], ['tier', '🐝 Nach Tier'], ['netz', '🕸️ Netz'], ['jahr', '📅 Jahresverlauf'], ['liste', '📋 Alle']];
  let h = `<p class="tier-einleitung">Wer besucht welche Pflanze? Notiert, welche Insekten an welchen Blüten trinken, welche Raupen woran fressen und welche Vögel sich Beeren oder Samen holen.</p>
    <button type="button" class="btn-primary" style="margin-bottom:10px" onclick="beobachtungNeu()">📝 Beobachtung notieren</button>
    <div class="beob-kopfzeile"><div class="tier-filter" style="margin:0;flex:1">${ansichten.map(([k, t]) => `<button type="button" class="saat-chip${beobAnsicht === k ? ' an' : ''}" onclick="beobAnsicht='${k}';renderTiere()">${t}</button>`).join('')}</div>
      <select class="beob-jahr" onchange="beobJahr=Number(this.value);renderTiere()" aria-label="Jahr">${jahre.map(j => `<option value="${j}"${j === beobJahr ? ' selected' : ''}>${j}</option>`).join('')}</select></div>`;
  if (!liste.length) return h + `<div class="empty-state" style="margin-top:10px">🔎 ${beobJahr} noch keine Beobachtungen. Tipp: Bei einer Pflanze im Gartenplan gibt es ganz unten „＋ Beobachtung“.</div>`;
  const nTiere = beobGruppieren(liste, beobTierKey).size, nPflanzen = beobGruppieren(liste, beobPflanzeKey).size;
  h += `<div class="tier-meta" style="margin:8px 0 10px">${liste.length} Beobachtungen · ${nTiere} Tierarten · ${nPflanzen} Pflanzen</div>`;
  if (beobAnsicht === 'pflanze') h += beobNachPflanzeHtml(liste);
  else if (beobAnsicht === 'tier') h += beobNachTierHtml(liste);
  else if (beobAnsicht === 'netz') h += beobNetzHtml(liste);
  else if (beobAnsicht === 'jahr') h += beobJahrHtml(liste);
  else h += beobListeHtml(liste);
  return h;
}
function beobNachPflanzeHtml(liste) {
  const gruppen = [...beobGruppieren(liste.filter(b => b.pflanze), beobPflanzeKey).values()]
    .map(g => ({ g, tiere: [...beobGruppieren(g, beobTierKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a)) }))
    .sort((a, c) => c.tiere.length - a.tiere.length || beobZaehlen(c.g) - beobZaehlen(a.g));
  const ohne = liste.filter(b => !b.pflanze).length;
  return gruppen.map((x, i) => `<div class="beob-karte"><div class="beob-karte-kopf"><span class="beob-sym">${beobPflanzeSym(x.g[0].pflanze)}</span><b>${escapeHtml(x.g[0].pflanze)}</b>
      ${i < 3 && x.tiere.length >= 2 ? `<span class="beob-magnet">🏆 Insektenmagnet${i === 0 ? ' Nr. 1' : ''}</span>` : ''}<span class="tier-meta" style="margin-left:auto">${x.tiere.length} ${x.tiere.length === 1 ? 'Art' : 'Arten'}</span></div>
      <div class="tier-chips">${x.tiere.map(g => `<button type="button" class="tier-chip tier-chip-btn" onclick="${g[0].tierId ? `tierDetailOeffnen('${g[0].tierId}')` : `beobachtungBearbeiten('${g[0].id}')`}">${beobTierIcon(g[0])} ${escapeHtml(beobTierLabel(g[0]))} ${beobArtIcons(g)} <b>${beobZaehlen(g)}×</b></button>`).join('')}</div></div>`).join('') +
    (ohne ? `<div class="tier-meta">+ ${ohne} Beobachtung(en) ohne Pflanze</div>` : '');
}
function beobNachTierHtml(liste) {
  const gruppen = [...beobGruppieren(liste, beobTierKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a));
  return gruppen.map(g => {
    const proArt = [...beobGruppieren(g, b => b.art).entries()];
    return `<div class="beob-karte"><div class="beob-karte-kopf"><span class="beob-sym">${beobTierIcon(g[0])}</span><b>${escapeHtml(beobTierLabel(g[0]))}</b><span class="tier-meta" style="margin-left:auto">${beobZaehlen(g)}× · zuerst ${beobDatumText(g.map(b => b.datum).sort()[0])}</span></div>
      ${proArt.map(([art, bs]) => { const pfl = [...beobGruppieren(bs.filter(b => b.pflanze), beobPflanzeKey).values()];
        return `<div class="beob-art-zeile"><span>${beobArt(art).icon} ${escapeHtml(beobArt(art).label)}</span><span>${pfl.length ? pfl.map(p => `${beobPflanzeSym(p[0].pflanze)} ${escapeHtml(p[0].pflanze)} <b>${beobZaehlen(p)}×</b>`).join(' · ') : '<i>ohne Pflanze</i>'}</span></div>`; }).join('')}
      ${g[0].tierId ? `<button type="button" class="beob-link" onclick="tierDetailOeffnen('${g[0].tierId}')">Steckbrief ›</button>` : ''}</div>`;
  }).join('');
}
// 🕸️ Netz: links Pflanzen, rechts Tiere, Linienstärke = Anzahl
function beobNetzHtml(liste) {
  const mitPflanze = liste.filter(b => b.pflanze);
  if (!mitPflanze.length) return '<div class="empty-state">Für das Netz braucht es Beobachtungen mit Pflanze.</div>';
  const pfl = [...beobGruppieren(mitPflanze, beobPflanzeKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a)).slice(0, 14);
  const tie = [...beobGruppieren(mitPflanze, beobTierKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a)).slice(0, 14);
  const pIdx = new Map(pfl.map((g, i) => [beobPflanzeKey(g[0]), i])), tIdx = new Map(tie.map((g, i) => [beobTierKey(g[0]), i]));
  const Z = 30, H = Math.max(pfl.length, tie.length) * Z + 20, B = 340;
  const yP = i => 20 + i * Z + (Math.max(pfl.length, tie.length) - pfl.length) * Z / 2;
  const yT = i => 20 + i * Z + (Math.max(pfl.length, tie.length) - tie.length) * Z / 2;
  const kanten = new Map();
  mitPflanze.forEach(b => { const p = pIdx.get(beobPflanzeKey(b)), t = tIdx.get(beobTierKey(b)); if (p === undefined || t === undefined) return; const k = p + '|' + t; const e = kanten.get(k) || { p, t, n: 0, art: b.art }; e.n += b.anzahl || 1; kanten.set(k, e); });
  const maxN = Math.max(...[...kanten.values()].map(e => e.n));
  const FARBE = { nektar: '#d9a033', raupe: '#6f9a5a', eier: '#b07ad0', beeren: '#8a4fa8', samen: '#b5894a', wohnt: '#8b7355', jagt: '#c0392b', sonst: '#7d8a99' };
  const linien = [...kanten.values()].map(e => `<path d="M118 ${yP(e.p)} C170 ${yP(e.p)} 170 ${yT(e.t)} 222 ${yT(e.t)}" fill="none" stroke="${FARBE[e.art] || '#888'}" stroke-opacity="0.65" stroke-width="${1.5 + 6 * e.n / maxN}" stroke-linecap="round"><title>${escapeHtml(beobTierLabel(tie[e.t][0]) + ' an ' + pfl[e.p][0].pflanze + ': ' + e.n + '×')}</title></path>`).join('');
  const kurz = s => s.length > 15 ? s.slice(0, 14) + '…' : s;
  const links = pfl.map((g, i) => `<text x="114" y="${yP(i) + 4}" text-anchor="end">${beobPflanzeSym(g[0].pflanze)} ${escapeHtml(kurz(g[0].pflanze))}</text><circle cx="118" cy="${yP(i)}" r="3.5" fill="currentColor"/>`).join('');
  const rechts = tie.map((g, i) => `<circle cx="222" cy="${yT(i)}" r="3.5" fill="currentColor"/><text x="226" y="${yT(i) + 4}">${beobTierIcon(g[0])} ${escapeHtml(kurz(beobTierLabel(g[0])))}</text>`).join('');
  const legende = BEOB_ARTEN.filter(a => [...kanten.values()].some(e => e.art === a.id)).map(a => `<span><i style="background:${FARBE[a.id]}"></i>${a.icon} ${escapeHtml(a.label)}</span>`).join('');
  return `<div class="beob-netz"><svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Netz aus Pflanzen und Tieren">
      <g font-size="10.5" font-family="Inter, sans-serif" fill="currentColor"><text x="114" y="11" text-anchor="end" font-weight="700" font-size="9.5" opacity="0.7">PFLANZEN</text><text x="226" y="11" font-weight="700" font-size="9.5" opacity="0.7">TIERE</text>${linien}${links}${rechts}</g></svg>
    <div class="beob-legende">${legende}</div><div class="tier-meta">Je dicker die Linie, desto öfter beobachtet. Farbe = was das Tier gemacht hat.</div></div>`;
}
// 📅 Jahresverlauf: Pflanzen × Monate
function beobJahrHtml(liste) {
  const mitPflanze = liste.filter(b => b.pflanze);
  const pfl = [...beobGruppieren(mitPflanze, beobPflanzeKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a)).slice(0, 15);
  const proMonat = Array(12).fill(0); liste.forEach(b => { proMonat[Number(String(b.datum).slice(5, 7)) - 1] += b.anzahl || 1; });
  const maxM = Math.max(1, ...pfl.flatMap(g => { const m = Array(12).fill(0); g.forEach(b => { m[Number(String(b.datum).slice(5, 7)) - 1] += b.anzahl || 1; }); return m; }));
  const zelle = n => n ? `<td><span class="beob-punkt" style="width:${6 + 12 * n / maxM}px;height:${6 + 12 * n / maxM}px" title="${n}×"></span></td>` : '<td></td>';
  const zeilen = pfl.map(g => { const m = Array(12).fill(0); g.forEach(b => { m[Number(String(b.datum).slice(5, 7)) - 1] += b.anzahl || 1; });
    return `<tr><th>${beobPflanzeSym(g[0].pflanze)} ${escapeHtml(g[0].pflanze.length > 14 ? g[0].pflanze.slice(0, 13) + '…' : g[0].pflanze)}</th>${m.map(zelle).join('')}</tr>`; }).join('');
  // Lücken in der Saison (März–Oktober) im laufenden oder vergangenen Jahr
  const jetzt = new Date(), bisMonat = beobJahr < jetzt.getFullYear() ? 12 : jetzt.getMonth() + 1;
  const luecken = [3, 4, 5, 6, 7, 8, 9, 10].filter(m => m < bisMonat && !proMonat[m - 1]).map(m => MONATE_KURZ[m - 1]);
  const ersteListe = [...beobGruppieren(liste, beobTierKey).values()].map(g => g.slice().sort((a, c) => String(a.datum).localeCompare(String(c.datum)))[0]).sort((a, c) => String(a.datum).localeCompare(String(c.datum)));
  return `<div class="beob-tabelle-wrap"><table class="beob-tabelle"><thead><tr><th></th>${MONATE_KURZ.map(m => `<th>${m[0]}</th>`).join('')}</tr></thead><tbody>${zeilen}
      <tr class="summe"><th>Alle</th>${proMonat.map(n => `<td>${n || ''}</td>`).join('')}</tr></tbody></table></div>
    ${luecken.length ? `<div class="tier-tipp">💡 In ${luecken.join(', ')} wurde nichts beobachtet. Vielleicht fehlt da etwas Blühendes – früh helfen z. B. Krokus, Weide und Lungenkraut, spät Astern, Fetthenne und Efeu.</div>` : ''}
    <div class="tier-abschnitt-titel">🎉 Erstbeobachtungen ${beobJahr}</div>
    <div class="beob-erste">${ersteListe.map(b => `<div><span>${beobDatumText(b.datum).replace(/ \d{4}$/, '')}</span> ${beobTierIcon(b)} ${escapeHtml(beobTierLabel(b))}${b.pflanze ? ' <i>an ' + escapeHtml(b.pflanze) + '</i>' : ''}</div>`).join('')}</div>`;
}
function beobListeHtml(liste) {
  return liste.slice().sort((a, c) => String(c.datum).localeCompare(String(a.datum))).map(b => {
    const foto = (b.fotos || []).find(f => fotoQuelle(f));
    return `<button type="button" class="beob-zeile" onclick="beobachtungBearbeiten('${b.id}')">
      ${foto ? `<img src="${escapeHtml(fotoQuelle(foto))}" alt="" loading="lazy">` : `<span class="beob-sym">${beobTierIcon(b)}</span>`}
      <span class="beob-zeile-text"><b>${escapeHtml(beobTierLabel(b))}</b>${(b.anzahl || 1) > 1 ? ' ×' + b.anzahl : ''} ${beobArt(b.art).icon}${b.pflanze ? ' an ' + escapeHtml(b.pflanze) : ''}
        <small>${beobDatumText(b.datum)} · ${escapeHtml(beobArt(b.art).label)}${b.notiz ? ' · ' + escapeHtml(b.notiz) : ''}</small></span></button>`;
  }).join('');
}
// Steckbrief: Wo im Garten beobachtet?
// Alle Fotos aus Beobachtungen zu einem Tier, neueste zuerst
function tierFotos(tierId) {
  const fotos = [];
  const album = tierAlbumEintrag(tierId, false);
  if (album) album.fotos.forEach(f => { if (fotoQuelle(f)) fotos.push({ src: fotoQuelle(f), datum: f.datum, eigen: true, id: f.id }); });
  gartenBeobachtungen().filter(b => b.tierId === tierId).sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .forEach(b => (b.fotos || []).forEach(f => { if (fotoQuelle(f)) fotos.push({ src: fotoQuelle(f), datum: b.datum, pflanze: b.pflanze }); }));
  return fotos;
}
function tierFotosHtml(tierId) {
  const fotos = tierFotos(tierId);
  return `<div class="tier-abschnitt-titel">📷 Eure Fotos${fotos.length ? ' (' + fotos.length + ')' : ''}</div>
    <div class="tier-fotos">${fotos.map(f => `<span class="tier-foto-wrap"><button type="button" onclick='fotoLightboxOeffnen(${escapeHtml(JSON.stringify(f.src))})'><img src="${escapeHtml(f.src)}" alt="" loading="lazy"><small>${escapeHtml(beobDatumText(f.datum))}${f.pflanze ? ' · ' + escapeHtml(f.pflanze) : ''}</small></button>${f.eigen ? `<button type="button" class="tier-foto-weg" onclick="tierFotoLoeschen('${tierId}','${f.id}')" aria-label="Foto löschen">✕</button>` : ''}</span>`).join('')}
      <button type="button" class="tier-foto-neu" onclick="tierFotoHinzufuegen('${tierId}')">📷<small>Foto hinzufügen</small></button></div>`;
}
function tierIconHtml(t) {
  const f = tierFotos(t.id)[0];
  return f ? `<img src="${escapeHtml(f.src)}" alt="${escapeHtml(t.name)}" loading="lazy">` : escapeHtml(t.icon);
}
function beobTierDetailHtml(tierId) {
  const liste = gartenBeobachtungen().filter(b => b.tierId === tierId);
  const t = alleTiere().find(x => x.id === tierId);
  const pfl = [...beobGruppieren(liste.filter(b => b.pflanze), beobPflanzeKey).values()].sort((a, c) => beobZaehlen(c) - beobZaehlen(a));
  return `<div class="tier-abschnitt-titel">🔗 In deinem Garten beobachtet</div>
    ${pfl.length ? `<div class="tier-chips">${pfl.map(g => `<span class="tier-chip">${beobPflanzeSym(g[0].pflanze)} ${escapeHtml(g[0].pflanze)} ${beobArtIcons(g)} <b>${beobZaehlen(g)}×</b></span>`).join('')}</div>` : '<div class="tier-meta">Noch keine Beobachtung an einer Pflanze.</div>'}
    <button type="button" class="btn-secondary" style="margin-top:8px;width:100%" onclick="beobachtungNeu({ tierId: '${tierId}', tierName: ${escapeHtml(JSON.stringify(t ? t.name : ''))} })">📝 Beobachtung an einer Pflanze notieren</button>`;
}


// ==================== 📖 PFLANZENLEXIKON & SUCHE ====================
// Eine Seite pro Pflanze, die alles zusammenführt, was die App über sie weiß
// (Steckbrief, Bedingungen, Kalender, Mischkultur, Pflege, Verwertung, Tiere, eigene Sorten, Saatgut, Ernten),
// plus eine Suche über Pflanzen, Funktionen, Tipps, Tiere, Projekte und Probleme.
let lexVerlauf = [];          // Stapel der bisherigen Seiten (für ‹ Zurück)
let lexSeite = { typ: 'liste' };
let lexKat = 'alle';
const LEX_KATS = [['alle', 'Alle'], ['garten', '📍 In meinem Garten'], ['Gemüse', '🥕 Gemüse'], ['Kräuter', '🌿 Kräuter'], ['Beeren', '🫐 Beeren'], ['Obst', '🍎 Obst'], ['Blumen', '🌸 Blumen'], ['stauden', '🌼 Stauden & Wildblumen']];
const LEX_FUNKTIONEN = [
  ['🗓', 'Aussaatkalender', 'aussaat säen vorziehen kalender', () => openSowingCalendar()],
  ['📅', 'Pflegeplan', 'gießen düngen pflege aufgaben', () => openCarePlan()],
  ['🌾', 'Jetzt pflanzen & ernten', 'monat übersicht jetzt', () => openNowOverview()],
  ['🔄', 'Fruchtfolge', 'fruchtfolge historie anbau beet jahre', () => openRotationTimeline()],
  ['🧺', 'Erntebuch', 'ernte erntebuch journal', () => openHarvestJournal()],
  ['🌾', 'Sortendatenbank', 'sorten erfahrungen bewertung', () => openVarietyDB()],
  ['📊', 'Statistik', 'statistik auswertung zahlen', () => openStats()],
  ['🔍', 'Pflanze per Foto bestimmen', 'bestimmen foto plantnet unbekannt', () => pflanzeBestimmenOeffnen(null)],
  ['🌰', 'Saatgutinventar', 'saatgut samen inventar', () => openSeedInventory()],
  ['🥫', 'Vorratskammer', 'vorrat eingekocht eingefroren vorratskammer', () => zurVorratskammer()],
  ['🧩', 'Beet-Vorlagen', 'vorlage vorlagen', () => openTemplateModal()],
  ['🌸', 'Blumen- & Staudenbeete (Vorschläge)', 'blumenbeet staudenbeet stauden blumen schatten halbschatten sonne trocken feucht norden süden pflanzplan', () => openBlumenBeete()],
  ['🥫', 'Verwertung & Haltbarmachen', 'einkochen einfrieren fermentieren trocknen verwertung', () => showView('preserve')],
  ['🦔', 'Tiere im Garten', 'tiere igel vögel bienen insekten naturgarten', () => showView('tiere')],
  ['🔗', 'Wer frisst was? (Beobachtungen)', 'beobachtung beobachten raupe nektar insekten vögel beeren samen wer frisst', () => { showView('tiere'); tierAnsichtSetzen('wer'); }],
  ['💦', 'Mini-Wasserstelle anlegen', 'wasserstelle tränke traenke insektentränke bienentränke vogeltränke miniteich teich wasser wanne', () => { showView('tiere'); tierProjektZeigen('miniwasser'); }],
  ['📖', 'Tipps & Tricks', 'tipps tricks wissen', () => showView('tips')],
  ['📸', 'Fotoalbum', 'foto album bilder', () => showView('album')],
  ['🏬', 'Shops & Dienstleister', 'shop gärtnerei hofladen', () => showView('shops')],
  ['📄', 'Gartenplan als PDF', 'pdf drucken export', () => exportPDF()],
  ['🏷', 'Pflanzschilder drucken', 'schilder etiketten drucken', () => exportLabels()],
  ['⬇', 'Daten exportieren (Sicherung)', 'export sicherung backup json', () => exportData()],
];
function lexNorm(s) { return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
// Alle Vorkommen einer Pflanze in allen Gärten
function lexVorkommen(name) {
  const n = (name || '').trim().toLowerCase(), out = [];
  Object.keys(gardens || {}).forEach(gid => {
    const g = gardens[gid];
    (g.beds || []).filter(b => b.kind !== 'struktur').forEach(bed => (bed.plants || []).forEach(p => {
      if ((p.name || '').trim().toLowerCase() === n) out.push({ p, garten: g.name, ort: bed.name || 'Beet', gid });
    }));
    (g.freiPflanzen || []).forEach(fp => { if ((fp.name || '').trim().toLowerCase() === n) out.push({ p: fp, garten: g.name, ort: 'freistehend', gid }); });
  });
  return out;
}
function lexImGarten() {
  const set = new Set();
  Object.keys(gardens || {}).forEach(gid => {
    const g = gardens[gid];
    (g.beds || []).forEach(bed => (bed.plants || []).forEach(p => p.name && set.add(p.name.trim())));
    (g.freiPflanzen || []).forEach(fp => fp.name && set.add(fp.name.trim()));
  });
  return set;
}
// Alle bekannten Pflanzen: Katalog + eigene + was im Garten steht
function lexAllePflanzen() {
  const map = new Map();
  PLANTS.forEach(p => { if (!/\(allgemein\)$/.test(p.name) && !['Kräuter', 'Blume'].includes(p.name)) map.set(p.name, { name: p.name, sym: p.sym, cat: p.cat }); });
  (typeof customPlants !== 'undefined' ? customPlants : []).forEach(p => { if (!map.has(p.name)) map.set(p.name, { name: p.name, sym: p.sym, cat: 'Eigene' }); });
  lexImGarten().forEach(n => {
    if (map.has(n)) return;
    const k = pflanzenSchluesselFinden(n, Object.fromEntries([...map.keys()].map(x => [x, 1])));
    if (k) return; // z.B. "Birnenbaum" -> schon als "Birnbaum" vorhanden
    const vk = lexVorkommen(n)[0];
    map.set(n, { name: n, sym: (vk && vk.p.sym) || '🌱', cat: 'Eigene' });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
// Findet den Katalognamen zu einer Eingabe ("Birnenbaum" -> "Birnbaum")
function lexKatalogName(name) {
  if (PLANTS.some(p => p.name === name)) return name;
  const k = pflanzenSchluesselFinden(name, Object.fromEntries(PLANTS.map(p => [p.name, 1])));
  return k || name;
}
function lexTabelle(name, tabelle) {
  if (!tabelle) return null;
  if (tabelle[name]) return tabelle[name];
  const k = pflanzenSchluesselFinden(name, tabelle);
  return k ? tabelle[k] : null;
}

// ---------- Öffnen / Navigation ----------
function lexikonOeffnen(pflanze) {
  lexVerlauf = [];
  lexSeite = pflanze ? { typ: 'pflanze', name: lexKatalogName(pflanze) } : { typ: 'liste' };
  const suche = document.getElementById('lexSuche');
  suche.value = '';
  document.getElementById('lexikonModal').style.display = 'flex';
  lexRendern();
  if (!pflanze) setTimeout(() => suche.focus(), 60);
}
function lexikonSchliessen() { document.getElementById('lexikonModal').style.display = 'none'; }
function lexGehe(seite) {
  lexVerlauf.push(lexSeite);
  lexSeite = seite;
  lexRendern();
  const box = document.querySelector('#lexikonModal .lex-scroll');
  if (box) box.scrollTop = 0;
}
function lexZurueck() {
  if (!lexVerlauf.length) { if (lexSeite.typ !== 'liste') { lexSeite = { typ: 'liste' }; lexRendern(); } else lexikonSchliessen(); return; }
  lexSeite = lexVerlauf.pop();
  lexRendern();
}
function lexPflanzeOeffnen(name) { lexGehe({ typ: 'pflanze', name: lexKatalogName(name) }); }
function lexSucheEingabe() {
  const q = document.getElementById('lexSuche').value.trim();
  if (q && lexSeite.typ !== 'suche') { lexVerlauf.push(lexSeite); }
  lexSeite = q ? { typ: 'suche', q } : (lexVerlauf.pop() || { typ: 'liste' });
  lexRendern();
}
// Aktion außerhalb des Lexikons: Lexikon schließen, dann ausführen
function lexAusfuehren(fn) { lexikonSchliessen(); if (document.getElementById('plantPanel').classList.contains('open')) { try { closePlantPanel(); } catch (e) {} } if (typeof fpSchliessen === 'function' && document.getElementById('freiPflanzePanel').classList.contains('open')) { try { fpSchliessen(); } catch (e) {} } setTimeout(fn, 30); }
function lexFunktion(i) { lexAusfuehren(LEX_FUNKTIONEN[i][3]); }
function lexTippOeffnen(ti, si) {
  lexAusfuehren(() => {
    showView('tips');
    setTimeout(() => {
      const el = document.getElementById('acc-' + ti + '-' + si);
      if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 80);
  });
}

function lexRendern() {
  const box = document.getElementById('lexInhalt');
  document.getElementById('lexZurueckBtn').style.visibility = (lexSeite.typ === 'liste' && !lexVerlauf.length) ? 'hidden' : 'visible';
  let html = '';
  if (lexSeite.typ === 'pflanze') html = lexPflanzeHtml(lexSeite.name);
  else if (lexSeite.typ === 'suche') html = lexSucheHtml(lexSeite.q);
  else if (lexSeite.typ === 'info') html = lexSeite.html;
  else html = lexListeHtml();
  box.innerHTML = html;
}

// ---------- Liste A–Z ----------
function lexKatSetzen(k) { lexKat = k; lexRendern(); }
function lexListeHtml() {
  const imGarten = lexImGarten();
  const imGartenKat = new Set([...imGarten].map(n => lexKatalogName(n)));
  let liste = lexAllePflanzen();
  if (lexKat === 'garten') liste = liste.filter(p => imGartenKat.has(p.name) || imGarten.has(p.name));
  else if (lexKat === 'stauden') liste = liste.filter(p => p.staude || (typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[p.name]));
  else if (lexKat !== 'alle') liste = liste.filter(p => p.cat === lexKat);
  let html = `<div class="lex-chips">${LEX_KATS.map(([k, l]) => `<button type="button" class="saat-chip${lexKat === k ? ' an' : ''}" onclick="lexKatSetzen('${k}')">${l}</button>`).join('')}</div>`;
  if (!liste.length) return html + '<div class="empty-state">Keine Pflanzen in dieser Auswahl.</div>';
  let buchstabe = '';
  html += '<div class="lex-liste">' + liste.map(p => {
    const b = p.name.charAt(0).toUpperCase();
    const kopf = b !== buchstabe ? `<div class="lex-buchstabe">${b}</div>` : '';
    buchstabe = b;
    const da = imGartenKat.has(p.name) || imGarten.has(p.name);
    return kopf + `<button type="button" class="lex-zeile" onclick="lexPflanzeOeffnen(${jsAttrStr(p.name)})">
      <span class="lex-sym">${p.sym}</span><span class="lex-zeile-name">${escapeHtml(p.name)}</span>
      ${da ? '<span class="lex-da" title="Steht in deinem Garten">📍</span>' : ''}<span class="lex-pfeil">›</span></button>`;
  }).join('') + '</div>';
  return html;
}

// ---------- Suche ----------
function lexTreffer(text, qn) { return lexNorm(text).includes(qn); }
function lexSucheHtml(q) {
  const qn = lexNorm(q);
  const abschnitt = (titel, zeilen) => zeilen.length ? `<div class="lex-abschnitt">${titel}</div><div class="lex-liste">${zeilen.join('')}</div>` : '';
  const zeile = (sym, titel, sub, onclick) => `<button type="button" class="lex-zeile" onclick="${onclick}"><span class="lex-sym">${sym}</span><span class="lex-zeile-name">${titel}${sub ? `<span class="lex-sub">${sub}</span>` : ''}</span><span class="lex-pfeil">›</span></button>`;
  // Pflanzen: Name, andere Namen, eigene Sorten
  const alle = lexAllePflanzen();
  const gefunden = new Map();
  alle.forEach(p => { if (lexTreffer(p.name, qn)) gefunden.set(p.name, ''); });
  Object.entries(PFLANZEN_BEDINGUNGEN_ALIAS).forEach(([alias, ziel]) => {
    if (lexTreffer(alias, qn)) { const n = lexKatalogName(ziel); if (alle.some(p => p.name === n) && !gefunden.has(n)) gefunden.set(n, 'auch: ' + alias.charAt(0).toUpperCase() + alias.slice(1)); }
  });
  Object.entries(varietyDB || {}).forEach(([pfl, sorten]) => (sorten || []).forEach(s => {
    if (s && lexTreffer(s.name, qn)) { const n = lexKatalogName(pfl); if (!gefunden.has(n)) gefunden.set(n, 'Sorte: ' + s.name); }
  }));
  const pflZeilen = [...gefunden.entries()].map(([n, sub]) => { const p = alle.find(x => x.name === n) || { sym: '🌱' }; return zeile(p.sym, escapeHtml(n), escapeHtml(sub), `lexPflanzeOeffnen(${jsAttrStr(n)})`); });
  // Erwähnt in Pflanzentexten (z.B. "Moorbeet" -> Heidelbeere)
  const erwaehnt = [];
  if (qn.length >= 4) alle.forEach(p => {
    if (gefunden.has(p.name)) return;
    const sb = lexTabelle(p.name, PLANT_STECKBRIEFE), bd = pflanzenBedingungenFinden(p.name);
    const text = (sb ? Object.values(sb).join(' ') : '') + ' ' + (bd ? bd.slice(3).join(' ') : '');
    if (lexTreffer(text, qn)) erwaehnt.push(zeile(p.sym, escapeHtml(p.name), 'im Steckbrief erwähnt', `lexPflanzeOeffnen(${jsAttrStr(p.name)})`));
  });
  const fnZeilen = LEX_FUNKTIONEN.map((f, i) => (lexTreffer(f[1] + ' ' + f[2], qn) ? zeile(f[0], escapeHtml(f[1]), 'Funktion öffnen', `lexFunktion(${i})`) : '')).filter(Boolean);
  const tippZeilen = [];
  TIPS_TOPICS.forEach((t, ti) => t.subs.forEach((s, si) => { if (lexTreffer(s.t + ' ' + s.c, qn)) tippZeilen.push(zeile(t.icon, escapeHtml(s.t), escapeHtml(t.title), `lexTippOeffnen(${ti},${si})`)); }));
  const tierZeilen = alleTiere().filter(t => lexTreffer([t.name, t.latein, t.kurz, (t.pflanzen || []).join(' ')].join(' '), qn))
    .map(t => zeile(t.icon, escapeHtml(t.name), escapeHtml(t.kurz), `lexAusfuehren(()=>tierDetailOeffnen('${t.id}'))`));
  const projZeilen = TIER_PROJEKTE.filter(p => lexTreffer(p.titel + ' ' + p.kurz + ' ' + p.schritte.join(' '), qn))
    .map(p => zeile(p.icon, escapeHtml(p.titel), escapeHtml(p.kurz), `lexAusfuehren(()=>{showView('tiere');tierProjektZeigen('${p.id}')})`));
  const probleme = [];
  SYMPTOMS.forEach((s, i) => { if (lexTreffer(s.label + ' ' + s.cause + ' ' + s.fix, qn)) probleme.push(zeile('🩺', escapeHtml(s.label), 'Symptom', `lexInfo('symptom',${i})`)); });
  PESTS.forEach((s, i) => { if (lexTreffer(s.label + ' ' + s.fix.join(' '), qn)) probleme.push(zeile('🐛', escapeHtml(s.label), 'Schädling', `lexInfo('pest',${i})`)); });
  BLATTPROBLEME.forEach((s, i) => { if (lexTreffer(s.titel + ' ' + s.ursache + ' ' + s.fix, qn)) probleme.push(zeile(s.icon, escapeHtml(s.titel), 'Blattproblem', `lexInfo('blatt',${i})`)); });
  MULCH_ARTEN.forEach((s, i) => { if (lexTreffer(s.name + ' ' + s.geeignet + ' ' + s.hinweis, qn)) probleme.push(zeile('🍂', escapeHtml(s.name), 'Mulch', `lexInfo('mulch',${i})`)); });
  const kraeuter = (typeof HEILKRAEUTER !== 'undefined' ? HEILKRAEUTER : []).map((k, i) => (lexTreffer(k.name, qn) ? zeile(k.icon || '🌿', escapeHtml(k.name), 'Heil- & Wildkraut', `lexInfo('kraut',${i})`) : '')).filter(Boolean);
  const html = abschnitt('🌱 Pflanzen', pflZeilen) + abschnitt('⚙️ Funktionen', fnZeilen) + abschnitt('🩺 Probleme, Schädlinge & Mulch', probleme) +
    abschnitt('💡 Tipps & Tricks', tippZeilen) + abschnitt('🦔 Tiere im Garten', tierZeilen) + abschnitt('🛠️ Naturgarten-Projekte', projZeilen) +
    abschnitt('🌿 Heil- & Wildkräuter', kraeuter) + abschnitt('🔎 Erwähnt bei', erwaehnt);
  return html || `<div class="empty-state">Nichts gefunden zu „${escapeHtml(q)}“.</div>`;
}
function lexInfo(art, i) {
  let html = '';
  const karte = (icon, titel, zeilen) => `<div class="lex-kopf-pflanze"><span class="lex-sym gross">${icon}</span><h2>${escapeHtml(titel)}</h2></div><div class="lex-karte">${zeilen}</div>`;
  if (art === 'symptom') { const s = SYMPTOMS[i]; html = karte('🩺', s.label, `<div class="bed-zeile"><b>Mögliche Ursache:</b> ${escapeHtml(s.cause)}</div><div class="bed-zeile"><b>Was tun:</b> ${escapeHtml(s.fix)}</div>`); }
  if (art === 'pest') { const s = PESTS[i]; html = karte('🐛', s.label, `<b>Was hilft:</b><ul class="lex-ul">${s.fix.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`); }
  if (art === 'blatt') { const s = BLATTPROBLEME[i]; html = karte(s.icon, s.titel, `<div class="bed-zeile"><b>Ursache:</b> ${escapeHtml(s.ursache)}</div><div class="bed-zeile"><b>Was tun:</b> ${escapeHtml(s.fix)}</div>`); }
  if (art === 'mulch') { const s = MULCH_ARTEN[i]; html = karte('🍂', s.name, `<div class="bed-zeile"><b>Geeignet für:</b> ${escapeHtml(s.geeignet)}</div><div class="bed-zeile"><b>Hinweis:</b> ${escapeHtml(s.hinweis)}</div>`); }
  if (art === 'kraut') { const k = HEILKRAEUTER[i]; html = karte(k.icon || '🌿', k.name, Object.entries(k).filter(([key, v]) => !['name', 'icon'].includes(key) && typeof v === 'string').map(([key, v]) => `<div class="bed-zeile"><b>${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))}:</b> ${escapeHtml(v)}</div>`).join('')); }
  lexGehe({ typ: 'info', html });
}

// ---------- Pflanzenseite ----------
function lexJahresbalken(name) {
  const s = lexTabelle(name, SOWING) || {};
  const zeilen = [['🏠 Vorziehen', s.vorziehen, '#7aa6c9'], ['🌍 Direktsaat', s.direktsaat, '#c99a3a'], ['🌱 Auspflanzen', s.auspflanzen, '#6f9e4f'],
    ['🌸 Blüte', typeof BLUETEZEIT !== 'undefined' ? BLUETEZEIT[name] : null, '#d488a0'],
    ['🧺 Ernte', lexTabelle(name, HARVEST_WINDOW), '#c0633a'], ['✂️ Rückschnitt', (lexTabelle(name, RUECKSCHNITT) || {}).monate, '#8b6f47']].filter(z => z[1]);
  if (!zeilen.length) return '';
  const jetzt = new Date().getMonth() + 1;
  const kopf = '<div class="lex-jb-zeile"><span></span>' + 'JFMAMJJASOND'.split('').map((m, i) => `<span class="lex-jb-m${i + 1 === jetzt ? ' jetzt' : ''}">${m}</span>`).join('') + '</div>';
  return `<div class="lex-abschnitt">📅 Im Jahreslauf</div><div class="lex-karte"><div class="lex-jb">${kopf}${zeilen.map(([l, r, f]) =>
    `<div class="lex-jb-zeile"><span class="lex-jb-label">${l}</span>${Array.from({ length: 12 }, (_, i) => `<span class="lex-jb-zelle${i + 1 === jetzt ? ' jetzt' : ''}">${isInHarvestWindow(r, i + 1) ? `<i style="background:${f}"></i>` : ''}</span>`).join('')}</div>`).join('')}</div>
    ${lexTabelle(name, RUECKSCHNITT) ? `<div class="bed-zeile" style="margin-top:6px"><b>✂️ Schnitt-Tipp:</b> ${escapeHtml(lexTabelle(name, RUECKSCHNITT).hinweis)}</div>` : ''}
    <div class="lex-hinweis">Richtwerte für Mitteleuropa · aktueller Monat hervorgehoben</div></div>`;
}
function lexPflanzeHtml(name) {
  const def = PLANTS.find(p => p.name === name) || lexAllePflanzen().find(p => p.name === name) || { name, sym: '🌱', cat: 'Eigene' };
  const fam = FAMILIES[name];
  const chip = t => `<span class="bed-chip">${t}</span>`;
  let h = `<div class="lex-kopf-pflanze"><span class="lex-sym gross">${def.sym || '🌱'}</span><div><h2>${escapeHtml(name)}</h2>
    ${typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[name] && STAUDEN_INFO[name].latein ? `<div class="tier-meta" style="margin:-2px 0 4px"><i>${escapeHtml(STAUDEN_INFO[name].latein)}</i></div>` : ''}
    <div class="bed-chips">${chip(def.cat || 'Eigene')}${def.perennial ? chip('🔄 mehrjährig') : ''}${(() => { const si = typeof STAUDEN_INFO !== 'undefined' && STAUDEN_INFO[name]; if (!si) return ''; return (si.hoehe ? chip('📏 ca. ' + (si.hoehe >= 100 ? (si.hoehe / 100).toString().replace('.', ',') + ' m' : si.hoehe + ' cm') + ' hoch') : '') + (si.heimisch ? chip('🌿 heimisch') : '') + (si.giftig ? chip('☠️ giftig') : ''); })()}${def.frostTender ? chip('❄️ frostempfindlich') : ''}${fam && fam !== 'verschiedene' ? chip('🧬 ' + escapeHtml(fam)) : ''}</div></div></div>`;
  // In deinem Garten
  const vk = lexVorkommen(name).concat(name !== def.name ? [] : []);
  const zusatz = lexImGarten();
  [...zusatz].filter(n => n !== name && lexKatalogName(n) === name).forEach(n => vk.push(...lexVorkommen(n)));
  if (vk.length) {
    const gruppiert = {};
    vk.forEach(v => { const k = (Object.keys(gardens).length > 1 ? v.garten + ' · ' : '') + v.ort; gruppiert[k] = (gruppiert[k] || 0) + 1; });
    const ernten = vk.flatMap(v => v.p.harvests || []);
    const summe = {};
    ernten.forEach(e => { const u = e.unit || 'Stück'; summe[u] = (summe[u] || 0) + (parseFloat(e.amount) || 0); });
    h += `<div class="lex-karte lex-garten">📍 <b>In deinem Garten:</b> ${Object.entries(gruppiert).map(([k, n]) => escapeHtml(k) + (n > 1 ? ' ×' + n : '')).join(' · ')}
      ${ernten.length ? `<div class="bed-zeile">🧺 <b>Bisher geerntet:</b> ${ernten.length}× · ${Object.entries(summe).map(([u, s]) => (Math.round(s * 10) / 10).toString().replace('.', ',') + ' ' + escapeHtml(u)).join(', ')}</div>` : ''}</div>`;
  } else {
    h += `<div class="lex-karte lex-garten" style="opacity:0.85">📍 Steht noch nicht in deinem Garten.</div>`;
  }
  // Bevorzugt
  const bed = pflanzenBedingungenFinden(name);
  if (bed) {
    const [licht, wasser, naehr, boden, klima, vorbeugen] = bed;
    const c = arr => arr ? chip(arr[0] + ' ' + arr[1]) : '';
    h += `<div class="lex-abschnitt">🌱 Bevorzugt</div><div class="lex-karte"><div class="bed-chips">${c(BED_LICHT[licht])}${c(BED_WASSER[wasser])}${c(BED_NAEHR[naehr])}</div>
      <div class="bed-zeile"><b>🪨 Boden:</b> ${escapeHtml(boden)}</div><div class="bed-zeile"><b>🌬️ Klima &amp; Lage:</b> ${escapeHtml(klima)}</div>
      <div class="bed-zeile bed-vorbeugen"><b>🛡️ Gesund halten:</b> ${escapeHtml(vorbeugen)}</div></div>`;
  }
  // Steckbrief
  const sb = lexTabelle(name, PLANT_STECKBRIEFE);
  if (sb) {
    h += `<div class="lex-abschnitt">📋 Steckbrief</div><div class="lex-karte">` +
      [['☀️ Standort', sb.standort], ['🌍 Boden', sb.boden], ['🌱 Aussaat/Pflanzzeit', sb.aussaat], ['🧺 Ernte', sb.ernte], ['🧰 Pflege', sb.pflege]]
        .filter(([, v]) => v && v !== '–').map(([l, v]) => `<div class="bed-zeile"><b>${l}:</b> ${escapeHtml(v)}</div>`).join('') +
      (sb.besonderheit ? `<div class="bed-zeile bed-vorbeugen"><b>💡 Besonderheit:</b> ${escapeHtml(sb.besonderheit)}</div>` : '') + '</div>';
  }
  h += lexJahresbalken(name);
  // Pflege & Abstand
  const care = CARE_INFO[name], abst = SPACING[name];
  const pflege = [];
  if (abst) pflege.push(`📏 Abstand ca. <b>${abst >= 100 ? (abst / 100).toString().replace('.', ',') + ' m' : abst + ' cm'}</b>`);
  if (care && care.waterDays) pflege.push(`💧 gießen etwa alle <b>${care.waterDays} Tage</b>`);
  if (care && care.fertilizeDays) pflege.push(`🌿 düngen etwa alle <b>${care.fertilizeDays} Tage</b>`);
  if (care && care.harvestDays) pflege.push(`🧺 erntereif nach ca. <b>${care.harvestDays} Tagen</b>`);
  if (pflege.length) h += `<div class="lex-abschnitt">🧰 Pflege</div><div class="lex-karte">${pflege.map(p => `<div class="bed-zeile">${p}</div>`).join('')}</div>`;
  // Mischkultur (auch rückwärts: wer nennt diese Pflanze als Nachbarn?)
  const gut = new Set(), schlecht = new Set();
  const eig = COMPANIONS[name];
  if (eig) { eig.good.forEach(x => gut.add(x)); eig.bad.forEach(x => schlecht.add(x)); }
  Object.entries(COMPANIONS).forEach(([k, v]) => { if (v.good.includes(name)) gut.add(k); if (v.bad.includes(name)) schlecht.add(k); });
  schlecht.forEach(x => gut.delete(x));
  const pchip = n => { const p = PLANTS.find(x => x.name === n); return `<button type="button" class="lex-pchip" onclick="lexPflanzeOeffnen(${jsAttrStr(n)})">${p ? p.sym : '🌱'} ${escapeHtml(n)}</button>`; };
  if (gut.size || schlecht.size) {
    h += `<div class="lex-abschnitt">🤝 Mischkultur</div><div class="lex-karte">` +
      (gut.size ? `<div class="bed-zeile"><b>👍 Gute Nachbarn:</b></div><div class="lex-pchips">${[...gut].sort((a, b) => a.localeCompare(b, 'de')).map(pchip).join('')}</div>` : '') +
      (schlecht.size ? `<div class="bed-zeile" style="margin-top:6px"><b>👎 Lieber nicht daneben:</b></div><div class="lex-pchips">${[...schlecht].sort((a, b) => a.localeCompare(b, 'de')).map(pchip).join('')}</div>` : '') + '</div>';
  }
  // Verwertung
  const pres = getPreservationInfo(name);
  if (pres && (pres.methods.length || pres.note)) {
    h += `<div class="lex-abschnitt">🥫 Verwertung</div><div class="lex-karte"><div class="bed-chips">${pres.methods.map(m => METHOD_INFO[m] ? chip(METHOD_INFO[m].icon + ' ' + METHOD_INFO[m].label) : '').join('')}</div>
      ${pres.note ? `<div class="bed-zeile">${escapeHtml(pres.note)}</div>` : ''}
      <button type="button" class="lex-link" onclick="lexAusfuehren(()=>openPreserveForPlant(${jsAttrStr(name).replace(/"/g, '&quot;')}))">Mehr zur Verwertung ›</button></div>`;
  }
  // Tiere, denen die Pflanze hilft
  const tiere = tiereFuerPflanze(name);
  if (tiere.length) h += `<div class="lex-abschnitt">🦔 Hilft diesen Tieren</div><div class="lex-karte"><div class="lex-pchips">${tiere.map(t => `<button type="button" class="lex-pchip" onclick="lexAusfuehren(()=>tierDetailOeffnen('${t.id}'))">${t.icon} ${escapeHtml(t.name)}</button>`).join('')}</div></div>`;
  // Rezepte aus dem Kochen-Modul
  const rez = rezepteMit({ [name]: 1 }).slice(0, 5);
  if (rez.length) h += `<div class="lex-abschnitt">🍳 Rezepte mit ${escapeHtml(name)}</div><div class="lex-karte" style="padding:4px 8px">${rez.map(rezeptZeileHtml).join('')}</div>`;
  // Eigene Sorten & Saatgut
  const sorten = (varietyDB || {})[name] || [];
  const saat = (seedInventory || []).filter(e => (e.plant || '').trim().toLowerCase() === name.toLowerCase());
  h += `<div class="lex-abschnitt">🌾 Deine Sorten &amp; Saatgut</div><div class="lex-karte">` +
    (sorten.length ? sorten.map(s => `<div class="bed-zeile"><b>${escapeHtml(s.name)}</b> ${s.rating ? starString(s.rating) : ''}${s.notes ? ' – ' + escapeHtml(s.notes) : ''}</div>`).join('') : '<div class="bed-zeile" style="opacity:0.8">Noch keine eigenen Sorten-Erfahrungen.</div>') +
    (saat.length ? `<div class="bed-zeile">🌰 <b>Saatgut da:</b> ${saat.map(e => escapeHtml([e.variety, e.amount, e.year].filter(Boolean).join(' · ') || 'ja')).join(' | ')}</div>` : '') +
    `<div class="lex-knoepfe"><button type="button" class="lex-link" onclick="lexAusfuehren(()=>openVarietyDB(${jsAttrStr(name).replace(/"/g, '&quot;')}))">＋ Sorte eintragen</button>
      <button type="button" class="lex-link" onclick="lexAusfuehren(()=>{openSeedInventory();openSeedForm(null,${jsAttrStr(name).replace(/"/g, '&quot;')})})">＋ Saatgut</button></div></div>`;
  if (!bed && !sb && !lexTabelle(name, SOWING) && !care) h += `<div class="lex-hinweis" style="margin-top:10px">Zu dieser Pflanze sind noch keine Detailinfos hinterlegt.</div>`;
  return h;
}


// ==================== 🗺️ JAHRESPLAN: Was kommt nächstes Jahr in welches Beet? ====================
// Vorschläge je Beet nach Fruchtfolge (keine Pflanzenfamilie innerhalb von 3 Jahren erneut) und
// Zehrer-Folge (Stark → Mittel → Schwach → Gründüngung/Kompost → Stark), bevorzugt mit Pflanzen,
// die ihr schon angebaut habt oder als Saatgut da habt. Vorgemerktes landet in bed.jahresplan.
const ZEHRER_NAME = { S: 'Starkzehrer', M: 'Mittelzehrer', W: 'Schwachzehrer' };
const ZEHRER_FOLGE = { S: 'M', M: 'W', W: 'S' };
function jahresplanZieljahr() { const d = new Date(); return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear(); }
function zehrerVon(name) { const b = pflanzenBedingungenFinden(name); return b ? b[2] : null; }
function jahresplanLieblinge() {
  const zaehl = {};
  const add = (n, w) => { if (!n) return; const k = lexKatalogName(n.trim()); zaehl[k] = (zaehl[k] || 0) + w; };
  Object.values(gardens || {}).forEach(g => (g.beds || []).forEach(b => {
    (b.plants || []).forEach(p => add(p.name, 2));
    (b.history || []).forEach(h => add(h.name, 1));
  }));
  (recentPlants || []).forEach(p => add(p.name, 1));
  return zaehl;
}
function jahresplanBeet(bed, ziel, lieblinge, saatSet) {
  const eintraege = [...(bed.history || []).map(h => ({ name: h.name, jahr: getYearOf(h) })),
    ...(bed.plants || []).map(p => ({ name: p.name, jahr: new Date().getFullYear(), aktiv: true }))].filter(e => e.name);
  const einjaehrig = e => !isPerennial(lexKatalogName(e.name));
  const vorjahr = eintraege.filter(e => e.jahr === ziel - 1 && einjaehrig(e));
  const dauer = (bed.plants || []).filter(p => isPerennial(lexKatalogName(p.name || '')));
  // gesperrte Familien (letzte 3 Jahre vor dem Zieljahr)
  const gesperrt = {};
  eintraege.filter(e => einjaehrig(e) && e.jahr >= ziel - FRUCHTFOLGE_WARNING_YEARS && e.jahr < ziel).forEach(e => {
    const f = getFamily(lexKatalogName(e.name));
    if (f && f !== 'verschiedene') gesperrt[f] = Math.max(gesperrt[f] || 0, e.jahr + FRUCHTFOLGE_WARNING_YEARS + 1);
  });
  // vorherrschende Zehrer-Stufe im Vorjahr
  const stufen = {};
  vorjahr.forEach(e => { const z = zehrerVon(lexKatalogName(e.name)); if (z) stufen[z] = (stufen[z] || 0) + 1; });
  const vor = Object.entries(stufen).sort((a, b) => b[1] - a[1])[0];
  const vorStufe = vor ? vor[0] : null;
  const zielStufe = vorStufe ? ZEHRER_FOLGE[vorStufe] : null;
  // Kandidaten: einjähriges Gemüse/Kräuter mit passender Stufe und nicht gesperrter Familie
  const kandidaten = PLANTS.filter(p => (p.cat === 'Gemüse' || p.cat === 'Kräuter') && !p.perennial && !/allgemein|^Kräuter$|^Spargel$|^Artischocke$|^Topinambur$|^Meerkohl$/.test(p.name))
    .map(p => {
      const z = zehrerVon(p.name), fam = getFamily(p.name);
      if (fam && gesperrt[fam]) return null;
      if (zielStufe && z && z !== zielStufe) return null;
      let punkte = (lieblinge[p.name] || 0) * 3 + (saatSet.has(p.name) ? 4 : 0) + (z === zielStufe ? 2 : 0) + (SOWING[p.name] ? 1 : 0);
      return { name: p.name, sym: p.sym, punkte, saat: saatSet.has(p.name), oft: (lieblinge[p.name] || 0) >= 2, z };
    }).filter(Boolean).sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, 'de')).slice(0, 10);
  return { vorjahr, dauer, gesperrt, vorStufe, zielStufe, kandidaten };
}
function jahresplanOeffnen() {
  let m = document.getElementById('jahresplanModal');
  if (!m) {
    m = document.createElement('div');
    m.className = 'modal-bg'; m.id = 'jahresplanModal'; m.style.display = 'none';
    m.innerHTML = '<div class="modal" style="width:min(620px,96vw);max-height:90vh;overflow-y:auto"><div id="jahresplanInhalt"></div><div class="modal-btns" style="margin-top:12px"><button class="btn-cancel" onclick="document.getElementById(\'jahresplanModal\').style.display=\'none\'">Schließen</button></div></div>';
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
    document.body.appendChild(m);
  }
  jahresplanRendern();
  m.style.display = 'flex';
}
function jahresplanUmschalten(bedId, name) {
  const bed = getCurrentBeds().find(b => b.id === bedId);
  if (!bed) return;
  const ziel = jahresplanZieljahr();
  if (!bed.jahresplan || bed.jahresplan.jahr !== ziel) bed.jahresplan = { jahr: ziel, pflanzen: [] };
  const i = bed.jahresplan.pflanzen.indexOf(name);
  if (i === -1) bed.jahresplan.pflanzen.push(name); else bed.jahresplan.pflanzen.splice(i, 1);
  saveData();
  jahresplanRendern();
}
function jahresplanRendern() {
  const box = document.getElementById('jahresplanInhalt');
  if (!box) return;
  const ziel = jahresplanZieljahr();
  const lieblinge = jahresplanLieblinge();
  const saatSet = new Set((seedInventory || []).map(e => lexKatalogName((e.plant || '').trim())));
  const beete = getCurrentBeds().filter(b => b.kind !== 'struktur');
  const vorgemerkt = beete.reduce((n, b) => n + (b.jahresplan && b.jahresplan.jahr === ziel ? b.jahresplan.pflanzen.length : 0), 0);
  let html = `<h2 style="margin-bottom:4px">🗺️ Plan für ${ziel}</h2>
    <p style="font-size:0.78rem;color:var(--bark);margin-bottom:6px">Vorschläge je Beet nach Fruchtfolge (keine Pflanzenfamilie innerhalb von ${FRUCHTFOLGE_WARNING_YEARS} Jahren) und Zehrer-Folge: Stark- → Mittel- → Schwachzehrer → Gründüngung/Kompost. Bevorzugt Pflanzen, die ihr schon angebaut habt oder als Saatgut da habt. Antippen merkt sie vor.</p>
    <div class="jp-summe">${vorgemerkt ? '📌 ' + vorgemerkt + ' Pflanze(n) für ' + ziel + ' vorgemerkt – sie erscheinen auch in der Monatsvorschau (Push).' : 'Noch nichts vorgemerkt.'}</div>`;
  if (!beete.length) html += '<div class="empty-state">Noch keine Beete angelegt.</div>';
  beete.forEach(bed => {
    const a = jahresplanBeet(bed, ziel, lieblinge, saatSet);
    const plan = bed.jahresplan && bed.jahresplan.jahr === ziel ? bed.jahresplan.pflanzen : [];
    const vorNamen = [...new Set(a.vorjahr.map(e => lexKatalogName(e.name)))];
    let info = '';
    if (vorNamen.length) info += `<div class="bed-zeile"><b>${ziel - 1}:</b> ${vorNamen.map(escapeHtml).join(', ')}${a.vorStufe ? ' <span class="jp-tag">' + ZEHRER_NAME[a.vorStufe] + '</span>' : ''}</div>`;
    else info += `<div class="bed-zeile" style="opacity:0.8">Für ${ziel - 1} ist hier nichts eingetragen – freie Wahl.</div>`;
    if (a.zielStufe) info += `<div class="bed-zeile">➡️ <b>${ziel}: ${ZEHRER_NAME[a.zielStufe]}</b>${a.vorStufe === 'W' ? ' – vorher Gründüngung oder kräftig Kompost einarbeiten' : ''}</div>`;
    const sperr = Object.entries(a.gesperrt);
    if (sperr.length) info += `<div class="bed-zeile">⛔ Pause: ${sperr.map(([f, bis]) => escapeHtml(f) + ' (ab ' + bis + ')').join(', ')}</div>`;
    if (a.dauer.length) info += `<div class="bed-zeile">🔄 Bleibt stehen: ${[...new Set(a.dauer.map(p => p.name))].map(escapeHtml).join(', ')}</div>`;
    const nurDauer = a.dauer.length && !(bed.plants || []).some(p => !isPerennial(lexKatalogName(p.name || ''))) && !a.vorjahr.length;
    if (nurDauer && !plan.length) {
      html += `<div class="jp-beet" style="border-left-color:${bed.color || '#7a9e72'}"><div class="jp-kopf">${escapeHtml(bed.name || 'Beet')}</div>
        <div class="bed-zeile">🔄 Dauerkultur (${[...new Set(a.dauer.map(p => p.name))].map(escapeHtml).join(', ')}) – hier ist kein Fruchtwechsel nötig.</div></div>`;
      return;
    }
    const chips = a.kandidaten.map(k => `<button type="button" class="jp-chip${plan.includes(k.name) ? ' an' : ''}" onclick="jahresplanUmschalten('${bed.id}', ${jsAttrStr(k.name).replace(/"/g, '&quot;')})">${k.sym} ${escapeHtml(k.name)}${k.saat ? ' 🌰' : ''}${k.oft ? ' ⭐' : ''}</button>`).join('');
    const extra = plan.filter(n => !a.kandidaten.some(k => k.name === n)).map(n => `<button type="button" class="jp-chip an" onclick="jahresplanUmschalten('${bed.id}', ${jsAttrStr(n).replace(/"/g, '&quot;')})">${escapeHtml(n)}</button>`).join('');
    html += `<div class="jp-beet" style="border-left-color:${bed.color || '#7a9e72'}">
      <div class="jp-kopf">${escapeHtml(bed.name || 'Beet')}${plan.length ? ` <span class="jp-tag an">📌 ${plan.length}</span>` : ''}</div>${info}
      <div class="jp-chips">${chips}${extra}</div></div>`;
  });
  html += `<div class="lex-hinweis">🌰 = Saatgut vorhanden · ⭐ = habt ihr schon öfter angebaut · Zehrer-Stufen und Familien aus dem Pflanzenlexikon</div>`;
  box.innerHTML = html;
}

// ==================== 🧳 URLAUBSVERTRETUNG: Gieß-Anleitung für Nachbarn, Oma & Co. ====================
const URLAUB_KEY = 'garten_urlaub'; // { von, bis, helfer } – nur auf diesem Gerät
const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function isoZuDatum(iso) { return new Date(iso + 'T00:00:00'); }
function datumZuIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function urlaubOeffnen() {
  let m = document.getElementById('urlaubModal');
  if (!m) {
    m = document.createElement('div');
    m.className = 'modal-bg'; m.id = 'urlaubModal'; m.style.display = 'none';
    m.innerHTML = `<div class="modal" style="width:min(600px,96vw);max-height:90vh;overflow-y:auto">
      <h2 style="margin-bottom:4px">🧳 Urlaubsvertretung</h2>
      <p style="font-size:0.78rem;color:var(--bark);margin-bottom:10px">Erstellt eine Gieß-Anleitung für die Zeit, in der ihr weg seid – zum Teilen per WhatsApp oder zum Ausdrucken.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="form-row" style="margin-bottom:0;flex:1;min-width:130px;font-size:0.75rem">Von<input type="date" id="urlaubVon" style="width:100%"></label>
        <label class="form-row" style="margin-bottom:0;flex:1;min-width:130px;font-size:0.75rem">Bis<input type="date" id="urlaubBis" style="width:100%"></label>
        <label class="form-row" style="margin-bottom:0;flex:1 1 100%;font-size:0.75rem">Wer gießt? (optional)<input type="text" id="urlaubHelfer" placeholder="z.B. Familie Müller, Oma" style="width:100%"></label>
      </div>
      <div id="urlaubVorschau" style="margin-top:12px"></div>
      <div class="modal-btns" style="margin-top:12px;flex-wrap:wrap;gap:6px">
        <button class="btn-cancel" onclick="document.getElementById('urlaubModal').style.display='none'">Schließen</button>
        <button class="btn-cancel" onclick="urlaubTeilen()">📤 Als Text teilen</button>
        <button class="btn-primary" onclick="urlaubDrucken()">🖨 Drucken / PDF</button>
      </div></div>`;
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
    document.body.appendChild(m);
    ['urlaubVon', 'urlaubBis', 'urlaubHelfer'].forEach(id => m.querySelector('#' + id).addEventListener('input', () => { urlaubSpeichern(); urlaubVorschauRendern(); }));
  }
  let u = {}; try { u = JSON.parse(localStorage.getItem(URLAUB_KEY) || '{}') || {}; } catch (e) {}
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const vonStd = new Date(heute.getTime() + 7 * 86400000), bisStd = new Date(heute.getTime() + 20 * 86400000);
  document.getElementById('urlaubVon').value = u.von && u.von >= datumZuIso(heute) ? u.von : datumZuIso(vonStd);
  document.getElementById('urlaubBis').value = u.bis && u.bis >= (u.von || '') && u.von >= datumZuIso(heute) ? u.bis : datumZuIso(bisStd);
  document.getElementById('urlaubHelfer').value = u.helfer || '';
  urlaubVorschauRendern();
  m.style.display = 'flex';
}
function urlaubSpeichern() {
  try { localStorage.setItem(URLAUB_KEY, JSON.stringify({ von: document.getElementById('urlaubVon').value, bis: document.getElementById('urlaubBis').value, helfer: document.getElementById('urlaubHelfer').value.trim() })); } catch (e) {}
}
// Berechnet den Plan: Gießtage je Beet, durstige Pflanzen, was geerntet werden darf
function urlaubPlan(vonIso, bisIso) {
  const von = isoZuDatum(vonIso), bis = isoZuDatum(bisIso);
  if (isNaN(von) || isNaN(bis) || bis < von) return null;
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const tage = [];
  for (let d = new Date(von); d <= bis && tage.length < 62; d.setDate(d.getDate() + 1)) tage.push(new Date(d));
  const beete = [];
  getCurrentBeds().filter(b => b.kind !== 'struktur' && (b.plants || []).length).forEach(bed => {
    const mitGiessen = (bed.plants || []).map(p => ({ p, k: lexKatalogName((p.name || '').trim()) })).map(x => Object.assign(x, { info: CARE_INFO[x.k] })).filter(x => x.info && x.info.waterDays > 0);
    if (!mitGiessen.length) return;
    const intervall = Math.min(...mitGiessen.map(x => x.info.waterDays));
    // nächster Gießtag ab heute, dann im Rhythmus weiter
    let naechster = null;
    mitGiessen.forEach(x => {
      const alter = x.p.date ? daysBetween(new Date(x.p.date + 'T00:00:00'), heute) : 0;
      const gf = giessFaelligkeit(x.p, x.info.waterDays, Math.max(0, alter));
      const d = new Date(heute.getTime() + (gf.dueToday && !gf.gegossenHeute ? 0 : gf.dueIn) * 86400000);
      if (!naechster || d < naechster) naechster = d;
    });
    while (naechster < von) naechster = new Date(naechster.getTime() + intervall * 86400000);
    const giessTage = [];
    for (let d = new Date(naechster); d <= bis; d = new Date(d.getTime() + intervall * 86400000)) giessTage.push(datumZuIso(d));
    const durstig = [...new Set(mitGiessen.filter(x => { const b = pflanzenBedingungenFinden(x.k); return (b && b[1] === 'v') || x.info.waterDays <= 2; }).map(x => x.k))];
    beete.push({ name: bed.name || 'Beet', intervall, giessTage, pflanzen: [...new Set(mitGiessen.map(x => x.k))], durstig });
  });
  // Ernte: was in dem Zeitraum reif wird oder Saison hat
  const ernte = new Set();
  getCurrentBeds().forEach(b => (b.plants || []).forEach(p => {
    const k = lexKatalogName((p.name || '').trim()), info = CARE_INFO[k];
    if (info && info.harvestDays > 0 && p.date) {
      const reif = new Date(new Date(p.date + 'T00:00:00').getTime() + info.harvestDays * 86400000);
      if (reif <= bis) ernte.add(k);
    } else if (tage.some(d => isInHarvestWindow(HARVEST_WINDOW[k], d.getMonth() + 1))) ernte.add(k);
  }));
  getCurrentFreiPflanzen().forEach(fp => { const k = lexKatalogName((fp.name || '').trim()); if (tage.some(d => isInHarvestWindow(HARVEST_WINDOW[k], d.getMonth() + 1))) ernte.add(k); });
  const frost = [...new Set(getCurrentBeds().flatMap(b => (b.plants || []).map(p => lexKatalogName((p.name || '').trim()))).filter(isFrostTender))];
  const frostZeit = tage.some(d => [4, 5, 9, 10, 11].includes(d.getMonth() + 1));
  return { tage, beete, ernte: [...ernte].sort((a, b) => a.localeCompare(b, 'de')), frost: frostZeit ? frost : [] };
}
function urlaubTagText(iso) { const d = isoZuDatum(iso); return WOCHENTAG[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
function urlaubVorschauRendern() {
  const box = document.getElementById('urlaubVorschau');
  const plan = urlaubPlan(document.getElementById('urlaubVon').value, document.getElementById('urlaubBis').value);
  if (!plan) { box.innerHTML = '<div class="empty-state">Bitte einen gültigen Zeitraum wählen.</div>'; return; }
  if (!plan.beete.length) { box.innerHTML = '<div class="empty-state">In diesem Garten gibt es keine Beete mit Pflanzen, die gegossen werden müssen.</div>'; return; }
  // Kalender: Tag → Beete
  const proTag = {};
  plan.beete.forEach(b => b.giessTage.forEach(t => { (proTag[t] = proTag[t] || []).push(b.name); }));
  const tageMitGiessen = Object.keys(proTag).sort();
  box.innerHTML = `<div class="lex-abschnitt">📅 Gießtage (${plan.tage.length} Tage weg)</div>
    <div class="lex-karte">${tageMitGiessen.length ? tageMitGiessen.map(t => `<div class="bed-zeile">💧 <b>${urlaubTagText(t)}</b> – ${proTag[t].map(escapeHtml).join(', ')}</div>`).join('') : '<div class="bed-zeile">In diesem Zeitraum ist laut Plan kein Gießen nötig.</div>'}</div>
    <div class="lex-abschnitt">🌱 Die Beete</div>
    <div class="lex-karte">${plan.beete.map(b => `<div class="bed-zeile"><b>${escapeHtml(b.name)}</b> (etwa alle ${b.intervall} Tage): ${b.pflanzen.map(escapeHtml).join(', ')}${b.durstig.length ? `<br><span style="color:#5b8bb5">💦 Besonders durstig: ${b.durstig.map(escapeHtml).join(', ')}</span>` : ''}</div>`).join('')}</div>
    ${plan.ernte.length ? `<div class="lex-abschnitt">🧺 Darf gern geerntet werden</div><div class="lex-karte">${plan.ernte.map(escapeHtml).join(', ')}</div>` : ''}
    <div class="lex-hinweis">Der Plan geht vom normalen Wetter aus: bei Hitze (über 28 °C) lieber täglich, nach kräftigem Regen einmal auslassen.</div>`;
}
function urlaubText() {
  const von = document.getElementById('urlaubVon').value, bis = document.getElementById('urlaubBis').value, helfer = document.getElementById('urlaubHelfer').value.trim();
  const plan = urlaubPlan(von, bis);
  if (!plan) return '';
  const proTag = {};
  plan.beete.forEach(b => b.giessTage.forEach(t => { (proTag[t] = proTag[t] || []).push(b.name); }));
  const z = [];
  z.push('🌱 Gieß-Plan für unseren Garten (' + urlaubTagText(von) + ' – ' + urlaubTagText(bis) + ')');
  if (helfer) z.push('Danke, ' + helfer + '! 💚');
  z.push('');
  z.push('💧 Bitte gießen an diesen Tagen:');
  Object.keys(proTag).sort().forEach(t => z.push('• ' + urlaubTagText(t) + ': ' + proTag[t].join(', ')));
  z.push('');
  z.push('🌱 Was wo steht:');
  plan.beete.forEach(b => z.push('• ' + b.name + ': ' + b.pflanzen.join(', ') + (b.durstig.length ? ' (besonders durstig: ' + b.durstig.join(', ') + ')' : '')));
  z.push('');
  z.push('Tipps: morgens oder abends gießen, direkt an die Wurzel, Blätter (v. a. Tomaten) möglichst trocken lassen. Bei über 28 °C lieber täglich, nach kräftigem Regen einmal auslassen.');
  if (plan.frost.length) z.push('❄️ Falls Frost angesagt ist: ' + plan.frost.join(', ') + ' mit Vlies abdecken.');
  if (plan.ernte.length) z.push('🧺 Gern ernten und mitnehmen: ' + plan.ernte.join(', ') + ' 😊');
  return z.join('\n');
}
function urlaubTeilen() {
  const text = urlaubText();
  if (!text) return;
  if (navigator.share) { navigator.share({ title: 'Gieß-Plan', text }).catch(() => {}); return; }
  try { navigator.clipboard.writeText(text).then(() => showTempStatus('📋 Gieß-Plan kopiert – jetzt z.B. in WhatsApp einfügen', 5)); }
  catch (e) { prompt('Text kopieren:', text); }
}
function urlaubDrucken() {
  const text = urlaubText();
  if (!text) return;
  let karte = '';
  try { karte = document.getElementById('gardenCanvas').toDataURL('image/png'); } catch (e) {}
  const zeilen = text.split('\n').map(l => l.startsWith('•') ? '<li>' + escapeHtml(l.slice(2)) + '</li>' : (l ? '<p>' + escapeHtml(l) + '</p>' : ''));
  const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Gieß-Plan</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#222;line-height:1.5}p:first-child{font-size:1.3em;font-weight:700}li{margin:2px 0}img{max-width:100%;border:1px solid #ccc;border-radius:8px;margin-top:12px}</style></head><body>' +
    zeilen.join('').replace(/(<li>.*?<\/li>)+/g, m => '<ul>' + m + '</ul>') + (karte && karte.length > 2000 ? '<p><b>🗺️ Lageplan:</b></p><img src="' + karte + '">' : '') + '<script>setTimeout(function(){print()},400)<\/script></body></html>';
  const w = window.open('', '_blank');
  if (!w) { showTempStatus('⚠ Bitte Pop-ups erlauben, um zu drucken.', 5); return; }
  w.document.write(html); w.document.close();
}

// Treffer aus der appweiten Suche („🔍 In allen Bereichen suchen“): statt nur irgendwo im Garten
// zu scrollen, öffnet sich die Garten-Suche mit dem Begriff – bei einer Pflanze direkt ihre Lexikon-Seite.
// Aus der Übersicht („Highlights der Woche“): direkt zu den Gartentieren springen
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !e.data || e.data.type !== 'shortcutAktion' || e.data.aktion !== 'tiere') return;
  setTimeout(() => {
    try {
      tierAnsicht = 'tiere'; showView('tiere');
      const id = String(e.data.text || '');
      if (id && alleTiere().some(t => t.id === id)) tierDetailOeffnen(id);
    } catch (err) { console.warn('Tiere aus der Übersicht', err); }
  }, 150);
});
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !e.data || e.data.type !== 'shortcutAktion' || e.data.aktion !== 'suche') return;
  const begriff = String(e.data.text || '').trim();
  if (!begriff) return;
  setTimeout(() => {
    try {
      const n = lexKatalogName(begriff);
      if (PLANTS.some(p => p.name === n) && lexNorm(n).includes(lexNorm(begriff).slice(0, 4))) { lexikonOeffnen(n); return; }
      lexikonOeffnen();
      const f = document.getElementById('lexSuche');
      f.value = begriff;
      lexSucheEingabe();
    } catch (err) { console.warn('Suche aus der Übersicht', err); }
  }, 650);
});

// ==================== BEREICHS-SEITEN: Planen & Ernten · Lexikon · Mehr ====================
function hubKachel(icon, name, text, onclick, badge, extraKlasse) {
  return `<button type="button" class="hub-kachel${extraKlasse ? ' ' + extraKlasse : ''}" onclick="${onclick}">
    ${badge ? `<span class="hub-badge${badge.ruhig ? ' ruhig' : ''}">${badge.text}</span>` : ''}
    <span class="hub-icon">${icon}</span><span class="hub-name">${name}</span><span class="hub-text">${text}</span></button>`;
}
// Aktionen, die die Gartenkarte brauchen (PDF, Vorlagen …): erst zur Karte wechseln
function hubImGarten(fn) { showView('garden'); setTimeout(fn, 120); }
function hubLexikonListe(art) {
  lexikonOeffnen();
  const zeile = (sym, titel, sub, onclick) => `<button type="button" class="lex-zeile" onclick="${onclick}"><span class="lex-sym">${sym}</span><span class="lex-zeile-name">${escapeHtml(titel)}${sub ? `<span class="lex-sub">${escapeHtml(sub)}</span>` : ''}</span><span class="lex-pfeil">›</span></button>`;
  let html = '';
  if (art === 'probleme') {
    html = `<div class="lex-kopf-pflanze"><span class="lex-sym gross">🩺</span><h2>Probleme &amp; Schädlinge</h2></div>` +
      `<div class="lex-abschnitt">🍃 Was sehe ich an der Pflanze?</div><div class="lex-liste">${SYMPTOMS.map((x, i) => zeile('🩺', x.label, '', `lexInfo('symptom',${i})`)).join('')}${BLATTPROBLEME.map((x, i) => zeile(x.icon, x.titel, '', `lexInfo('blatt',${i})`)).join('')}</div>` +
      `<div class="lex-abschnitt">🐛 Schädlinge</div><div class="lex-liste">${PESTS.map((x, i) => zeile('🐛', x.label, '', `lexInfo('pest',${i})`)).join('')}</div>`;
  } else if (art === 'mulch') {
    html = `<div class="lex-kopf-pflanze"><span class="lex-sym gross">🍂</span><h2>Mulch</h2></div><div class="lex-liste">${MULCH_ARTEN.map((x, i) => zeile('🍂', x.name, x.geeignet, `lexInfo('mulch',${i})`)).join('')}</div>`;
  }
  lexVerlauf = [{ typ: 'liste' }];
  lexSeite = { typ: 'info', html };
  lexRendern();
}
function hubRendern(bereich) {
  const box = document.getElementById(bereich === 'planen' ? 'hubPlanen' : bereich === 'lexikon' ? 'hubLexikon' : 'hubMehr');
  if (!box) return;
  const monat = new Date().getMonth() + 1, jahr = String(new Date().getFullYear());
  let html = '';
  if (bereich === 'planen') {
    // kleine Zahlen auf den Kacheln
    let saatJetzt = 0;
    try { Object.values(SOWING).forEach(s => { if (['vorziehen', 'direktsaat', 'auspflanzen'].some(k => isInWindow(s[k], monat))) saatJetzt++; }); } catch (e) {}
    let heute = 0, ernten = 0;
    try {
      getCurrentBeds().filter(b => b.kind !== 'struktur').forEach(bed => (bed.plants || []).forEach((p, i) => { if (vlistStatus(p, bed, i).some(st => st.prio === 1 && st.art !== 'frost')) heute++; }));
      Object.values(gardens).forEach(g => {
        (g.beds || []).forEach(b => (b.plants || []).forEach(p => (p.harvests || []).forEach(h => { if (String(h.date || '').startsWith(jahr)) ernten++; })));
        (g.freiPflanzen || []).forEach(fp => (fp.harvests || []).forEach(h => { if (String(h.date || '').startsWith(jahr)) ernten++; }));
      });
    } catch (e) {}
    html = `<div class="hub-kopf"><h2>📅 Planen &amp; Ernten</h2><p>Was wann zu tun ist – und was dabei herausgekommen ist.</p></div>
      <div class="hub-titel">Planen</div><div class="hub-grid">
        ${hubKachel('🗓', 'Aussaatkalender', 'Wann vorziehen, säen, auspflanzen – mit Jahres- und Monatsansicht', 'openSowingCalendar()', saatJetzt ? { text: saatJetzt + ' jetzt' } : null)}
        ${hubKachel('📅', 'Pflegeplan', 'Gießen, Düngen, Ernten – mit Wetter und Frostwarnung', 'openCarePlan()', heute ? { text: heute + ' heute' } : { text: 'erledigt', ruhig: true })}
        ${hubKachel('🌾', 'Jetzt pflanzen & ernten', 'Was in diesem Monat dran ist', 'openNowOverview()')}
        ${hubKachel('🔄', 'Fruchtfolge', 'Was stand in welchem Beet – Anbau-Historie', 'openRotationTimeline()')}
        ${hubKachel('🗺️', 'Plan für ' + jahresplanZieljahr(), 'Was kommt in welches Beet? Vorschläge nach Fruchtfolge', 'jahresplanOeffnen()', (() => { const n = getCurrentBeds().reduce((s, b) => s + (b.jahresplan && b.jahresplan.jahr === jahresplanZieljahr() ? b.jahresplan.pflanzen.length : 0), 0); return n ? { text: n + ' vorgemerkt', ruhig: true } : ([8, 9, 10, 11, 0, 1, 2].includes(new Date().getMonth()) ? { text: 'jetzt planen' } : null); })())}
      </div>
      <div class="hub-titel">Ernte &amp; Rückblick</div><div class="hub-grid">
        ${hubKachel('🧺', 'Erntebuch', 'Alle Ernten chronologisch, nach Jahr', 'openHarvestJournal()', ernten ? { text: ernten + '× ' + jahr, ruhig: true } : null)}
        ${hubKachel('📊', 'Statistik', 'Beete, Pflanzen, Erträge im Überblick', 'openStats()')}
        ${hubKachel('🌾', 'Sorten-Erfahrungen', 'Welche Sorte hat sich bewährt?', 'openVarietyDB()')}
        ${hubKachel('📸', 'Fotoalbum', 'Dein Foto-Tagebuch aus dem Garten', "showView('album')")}
        ${hubKachel('🧳', 'Urlaubsvertretung', 'Gieß-Plan für Nachbarn oder Oma – teilen oder drucken', 'urlaubOeffnen()')}
      </div>
      <div class="hub-titel">Bestand</div><div class="hub-grid">
        ${hubKachel('🌰', 'Saatgut', 'Was ist an Samen da, wie lange keimfähig', 'openSeedInventory()', seedInventory.length ? { text: String(seedInventory.length), ruhig: true } : null)}
        ${hubKachel('🥫', 'Vorratskammer', 'Eingekochtes, Eingefrorenes & Co. (eigenes Modul)', 'zurVorratskammer()')}
      </div>`;
  } else if (bereich === 'lexikon') {
    html = `<div class="hub-kopf"><h2>📖 Lexikon</h2><p>Nachschlagen statt suchen – alles Wissen an einem Ort.</p></div>
      <button type="button" class="hub-suche" onclick="lexikonOeffnen()">🔍 <span>Pflanze, Thema oder Funktion suchen …</span></button>
      <div class="hub-titel">Pflanzen</div><div class="hub-grid">
        ${hubKachel('🌱', 'Pflanzen A–Z', 'Eine Seite pro Pflanze: Standort, Kalender, Nachbarn, Pflege, Verwertung', 'lexikonOeffnen()', { text: String(PLANTS.length), ruhig: true })}
        ${hubKachel('🩺', 'Probleme & Schädlinge', 'Gelbe Blätter, Läuse, Schnecken – Ursache und was hilft', "hubLexikonListe('probleme')")}
        ${hubKachel('🔍', 'Pflanze bestimmen', 'Unbekannte Pflanze per Foto erkennen (Pl@ntNet)', 'pflanzeBestimmenOeffnen(null)')}
        ${hubKachel('💡', 'Pflanzen-Ideen', 'Was passt für trockene, schattige oder nasse Ecken?', "openVarietyDB();switchVdbTab('ideen')")}
      </div>
      <div class="hub-titel">Garten-Wissen</div><div class="hub-grid">
        ${hubKachel('📖', 'Tipps & Tricks', 'Grundlagen für Naturgarten, Gemüse und Selbstversorgung', "showView('tips')")}
        ${hubKachel('🍂', 'Mulch', 'Welcher Mulch wohin passt', "hubLexikonListe('mulch')")}
        ${hubKachel('🦔', 'Tiere im Garten', 'Igel, Wildbienen, Vögel – und wie man ihnen hilft', "showView('tiere')")}
        ${hubKachel('🛠️', 'Naturgarten-Projekte', 'Nistkästen, Totholz, Insektenhotel & Co. zum Selberbauen', "showView('tiere');tierAnsichtSetzen('bauen')")}
      </div>
      <div class="hub-titel">Sammeln &amp; Verwerten</div><div class="hub-grid">
        ${hubKachel('🥫', 'Verwertung', 'Einkochen, Einfrieren, Fermentieren – welche Methode passt?', "showView('preserve');setPreserveSubTab('methoden')")}
        ${hubKachel('🌿', 'Heil- & Wildkräuter', 'Erkennen, Sammelzeit, Verwendung', "showView('preserve');setPreserveSubTab('heilkraeuter')")}
        ${hubKachel('🍄', 'Pilz-Logbuch', 'Eigene Pilzfunde festhalten', "showView('preserve');setPreserveSubTab('pilze')")}
      </div>`;
  } else {
    html = `<div class="hub-kopf"><h2>⚙️ Mehr</h2><p>Einkaufen, Sichern, Drucken und Einstellungen.</p></div>
      <div class="hub-titel">Einkaufen &amp; Kontakte</div><div class="hub-grid">
        ${hubKachel('🏬', 'Shops & Dienstleister', 'Gärtnereien, Hofläden, Samenquellen, Landschaftsgärtner', "showView('shops')")}
        ${hubKachel('💚', 'Wunschliste', 'Pflanzen und Zubehör, die du noch willst', 'openWishlist()')}
        ${hubKachel('🧾', 'Kosten', 'Was der Garten gekostet hat', 'openCostTracker()')}
      </div>
      <div class="hub-titel">Garten einrichten</div><div class="hub-grid">
        ${hubKachel('🧩', 'Beet-Vorlagen', 'Gespeicherte Beete und Beispielbeete einfügen', 'hubImGarten(openTemplateModal)')}
        ${hubKachel('📌', 'Bereiche', 'Teile des Grundstücks benennen und hineinzoomen', 'hubImGarten(oeffneZonenListe)')}
        ${hubKachel('❓', 'Kurzanleitung', 'So funktioniert der Gartenplaner', 'openHelpModal()')}
      </div>
      <div class="hub-titel">Drucken &amp; Exportieren</div><div class="hub-grid">
        ${hubKachel('📄', 'Gartenplan als PDF', 'Plan mit Legende zum Ausdrucken', 'hubImGarten(exportPDF)')}
        ${hubKachel('📐', 'Maßstabs-PDF', 'PDF im echten Maßstab', 'hubImGarten(openScalePdfModal)')}
        ${hubKachel('🏷', 'Pflanzschilder', 'Schilder für die Beete zum Ausdrucken', 'exportLabels()')}
        ${hubKachel('📅', 'Erntekalender (.ics)', 'Erntetermine für die Kalender-App', 'exportHarvestCalendar()')}
      </div>
      <div class="hub-titel">Daten sichern</div><div class="hub-grid">
        ${hubKachel('💾', 'Jetzt speichern', 'Aktuellen Stand sichern', "saveData();showTempStatus('✓ Gespeichert', 2)")}
        ${hubKachel('⬇', 'Sicherung exportieren', 'Alles als Datei herunterladen', 'exportData()')}
        ${hubKachel('⬆', 'Sicherung laden', 'Eine exportierte Datei wieder einspielen', "document.getElementById('importFile').click()")}
        ${hubKachel('🛟', 'Backup wiederherstellen', 'Auf die automatisch gesicherte ältere Kopie zurückgreifen', 'restoreRollingBackup()')}
        ${hubKachel('🧹', 'Garten leeren', 'Alle Beete im aktuellen Garten löschen', 'hubImGarten(clearAll)', null, 'gefahr')}
      </div>`;
  }
  box.innerHTML = html;
}

function renderTips() {
  const box = document.getElementById('tipsWrap');
  let html = `<div class="home-intro" style="margin-bottom:22px"><h2>📖 Tipps &amp; Tricks</h2><p>Grundlagenwissen für den Einstieg – zum Nachschlagen, nicht zum Auswendiglernen.</p></div>`;
  TIPS_TOPICS.forEach((topic, ti) => {
    html += `<div class="tips-topic">
      <div class="tips-topic-hd"><span class="tt-icon">${topic.icon}</span><h3>${escapeHtml(topic.title)}</h3></div>`;
    topic.subs.forEach((sub, si) => {
      const id = `acc-${ti}-${si}`;
      html += `<div class="accordion-item" id="${id}">
        <div class="accordion-header" onclick="toggleAccordion('${id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${id}')}">
          <span>${escapeHtml(sub.t)}</span><span class="ah-caret">▸</span>
        </div>
        <div class="accordion-body">${escapeHtml(sub.c)}</div>
      </div>`;
    });
    html += `</div>`;
  });
  box.innerHTML = html;
  box.dataset.built = '1';
}

// ==================== NEWSFEED: Garten-Blogs (Plantura + Gern im Garten) ====================
// Nutzt rss2json.com (kostenloser Dienst, wandelt RSS in JSON um, wird per fetch()
// direkt aus dem Browser abgerufen – wie beim Wetter, nur ohne eigenen API-Key).
// Ergebnis wird 3 Std. lokal zwischengespeichert (kein Cloud-Sync, jedes Gerät holt selbst).
// HINWEIS: Der anonyme rss2json-Zugang ist ein geteiltes Kontingent für alle Nutzer weltweit
// und kann daher gelegentlich überlastet sein ("bitte später erneut versuchen"-Meldung).
// Für zuverlässigeren Betrieb: kostenlosen eigenen API-Key auf rss2json.com/docs holen und
// unten bei RSS2JSON_KEY eintragen.
const RSS2JSON_KEY = 'gzgrcvnabxmmjjevo0nlsuucc1bl9qzizlvuzjkq'; // eigener kostenloser Key von rss2json.com
function entitiesDekodieren(str) { if (!str) return str; const ta = document.createElement('textarea'); ta.innerHTML = str; return ta.value; }
const GARTEN_FEED_QUELLEN = {
  plantura: {
    url: 'https://www.plantura.garden/feed',
    cacheKey: 'garten_newsfeedCache',
    label: 'plantura.garden',
    linkZielseite: 'https://www.plantura.garden',
    btnId: 'btnGartenFeedQuellePlantura',
  },
  gig: {
    url: 'https://www.gern-im-garten.de/feed',
    cacheKey: 'garten_newsfeedCacheGig',
    label: 'gern-im-garten.de',
    linkZielseite: 'https://www.gern-im-garten.de',
    btnId: 'btnGartenFeedQuelleGig',
  },
  lubera: {
    url: 'https://kill-the-newsletter.com/feeds/yfx3iz7bpha23aaxuqig.xml',
    cacheKey: 'garten_newsfeedCacheLubera',
    label: 'Lubera Gartenbrief',
    linkZielseite: 'https://www.lubera.com',
    btnId: 'btnGartenFeedQuelleLubera',
  },
  horstmann: {
    url: 'https://kill-the-newsletter.com/feeds/ckyrcj5qka7g8fh3f1lo.xml',
    cacheKey: 'garten_newsfeedCacheHorstmann',
    label: 'Baumschule Horstmann',
    linkZielseite: 'https://www.baumschule-horstmann.de',
    btnId: 'btnGartenFeedQuelleHorstmann',
  },
};
const GARTEN_FEED_QUELLE_KEY = 'garten_newsfeedQuelle';
let gartenFeedQuelle = 'plantura';
try {
  const gespeicherteGartenQuelle = localStorage.getItem(GARTEN_FEED_QUELLE_KEY);
  if (gespeicherteGartenQuelle && GARTEN_FEED_QUELLEN[gespeicherteGartenQuelle]) gartenFeedQuelle = gespeicherteGartenQuelle;
} catch (e) {}

async function ladeGartenFeed(forceRefresh) {
  const el = document.getElementById('gartenFeedInhalt');
  if (!el) return;
  const quelle = GARTEN_FEED_QUELLEN[gartenFeedQuelle];
  el.textContent = 'Lädt…';
  try {
    if (!forceRefresh) {
      const cache = JSON.parse(localStorage.getItem(quelle.cacheKey) || 'null');
      if (cache && cache.items && cache.items.length && (Date.now() - cache.fetchedAt) < 3 * 60 * 60 * 1000) {
        renderGartenFeed(cache.items, quelle);
        return;
      }
    }
  } catch (e) {}
  try {
    let url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(quelle.url) + '&count=5';
    if (RSS2JSON_KEY) url += '&api_key=' + encodeURIComponent(RSS2JSON_KEY);
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Fehler');
    const items = data.items.map(i => {
      let bild = i.thumbnail || (i.enclosure && i.enclosure.link) || i.image;
      if (!bild) {
        const quelle = i.description || i.content || '';
        const treffer = quelle.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (treffer) bild = treffer[1];
      }
      return { title: entitiesDekodieren(i.title), link: i.link, pubDate: i.pubDate, thumbnail: bild };
    });
    try { localStorage.setItem(quelle.cacheKey, JSON.stringify({ items, fetchedAt: Date.now() })); } catch (e) {}
    renderGartenFeed(items, quelle);
  } catch (e) {
    el.innerHTML = `⚠ Beiträge konnten gerade nicht geladen werden (${escapeHtml(String(e.message || e))}). <a href="${quelle.linkZielseite}" target="_blank" rel="noopener">Direkt zum Blog →</a> <button type="button" onclick="ladeGartenFeed(true)" style="margin-left:6px;background:none;border:1px solid var(--sage);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.78rem;">🔄 erneut versuchen</button>`;
  }
}
function renderGartenFeed(items, quelle) {
  const el = document.getElementById('gartenFeedInhalt');
  if (!el) return;
  if (!items || !items.length) { el.textContent = 'Aktuell keine Beiträge verfügbar.'; return; }
  el.innerHTML = items.map(i => {
    const datum = i.pubDate ? new Date(i.pubDate.replace(' ', 'T')).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const bild = i.thumbnail ? `<img src="${i.thumbnail}" alt="" onerror="this.remove()" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : '';
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #eee5d0;">
      ${bild}
      <div style="flex:1;min-width:0;">
        <a href="${i.link}" target="_blank" rel="noopener" style="color:var(--moss);font-weight:600;text-decoration:none;">${escapeHtml(i.title)}</a>
        ${datum ? `<div style="font-size:0.7rem;color:var(--bark);opacity:0.75;margin-top:2px;">${datum}</div>` : ''}
      </div>
    </div>`;
  }).join('') + `<div style="margin-top:8px;font-size:0.68rem;color:var(--bark);opacity:0.7;">Quelle: ${quelle.label} · <button type="button" onclick="ladeGartenFeed(true)" style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;padding:0;font-size:inherit;">aktualisieren</button></div>`;
}
function gartenFeedQuelleAktualisierenButtons() {
  Object.keys(GARTEN_FEED_QUELLEN).forEach(key => {
    const btn = document.getElementById(GARTEN_FEED_QUELLEN[key].btnId);
    if (btn) btn.classList.toggle('active', key === gartenFeedQuelle);
  });
}
function gartenFeedQuelleUmschalten(neueQuelle) {
  if (gartenFeedQuelle === neueQuelle) return;
  gartenFeedQuelle = neueQuelle;
  try { localStorage.setItem(GARTEN_FEED_QUELLE_KEY, neueQuelle); } catch (e) {}
  gartenFeedQuelleAktualisierenButtons();
  ladeGartenFeed();
}

// ==================== Quellen ein-/ausblenden (geräte-lokal) ====================
const GARTEN_FEED_VERSTECKT_KEY = 'garten_versteckteNewsQuellen';
function gartenVersteckteQuellen() {
  try { return JSON.parse(localStorage.getItem(GARTEN_FEED_VERSTECKT_KEY) || '[]'); } catch (e) { return []; }
}
function gartenFeedButtonsSichtbarkeitAnwenden() {
  const versteckt = gartenVersteckteQuellen();
  Object.keys(GARTEN_FEED_QUELLEN).forEach(key => {
    const btn = document.getElementById(GARTEN_FEED_QUELLEN[key].btnId);
    if (btn) btn.style.display = versteckt.includes(key) ? 'none' : '';
    const cb = document.querySelector('[data-gartenquelle="' + key + '"]');
    if (cb) cb.checked = !versteckt.includes(key);
  });
  // Falls die aktuell aktive Quelle versteckt wurde, zur ersten sichtbaren wechseln
  if (versteckt.includes(gartenFeedQuelle)) {
    const sichtbareKeys = Object.keys(GARTEN_FEED_QUELLEN).filter(k => !versteckt.includes(k));
    if (sichtbareKeys.length) {
      gartenFeedQuelle = sichtbareKeys[0];
      try { localStorage.setItem(GARTEN_FEED_QUELLE_KEY, gartenFeedQuelle); } catch (e) {}
      gartenFeedQuelleAktualisierenButtons();
      ladeGartenFeed();
    } else {
      document.getElementById('gartenFeedInhalt').innerHTML = 'Keine Quelle ausgewählt – über ⚙️ oben mindestens eine aktivieren.';
    }
  }
}
function gartenFeedQuelleSichtbarkeitAendern(checkbox) {
  const key = checkbox.dataset.gartenquelle;
  let versteckt = gartenVersteckteQuellen();
  if (checkbox.checked) versteckt = versteckt.filter(k => k !== key);
  else if (!versteckt.includes(key)) versteckt.push(key);
  try { localStorage.setItem(GARTEN_FEED_VERSTECKT_KEY, JSON.stringify(versteckt)); } catch (e) {}
  gartenFeedButtonsSichtbarkeitAnwenden();
}
function toggleGartenFeedEinstellungen() {
  const box = document.getElementById('gartenFeedEinstellungen');
  box.style.display = box.style.display === 'none' ? '' : 'none';
}
window.gartenFeedQuelleSichtbarkeitAendern = gartenFeedQuelleSichtbarkeitAendern;
window.toggleGartenFeedEinstellungen = toggleGartenFeedEinstellungen;
window.ladeGartenFeed = ladeGartenFeed;
window.gartenFeedQuelleUmschalten = gartenFeedQuelleUmschalten;
document.getElementById('btnNews').addEventListener('click', () => {
  document.getElementById('newsModal').style.display = 'flex';
  gartenFeedButtonsSichtbarkeitAnwenden();
  if (!document.getElementById('gartenFeedInhalt').dataset.built) {
    document.getElementById('gartenFeedInhalt').dataset.built = '1';
    ladeGartenFeed();
  }
});
function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ==================== VIEW: VERWERTUNG & HALTBARMACHEN ====================
let preserveFilter = '';
let preserveCat = 'alle';
let preserveSubTab = 'methoden';
function setPreserveSubTab(t) {
  preserveSubTab = t;
  renderPreserveView();
}
function setPreserveCat(c) {
  preserveCat = c;
  ['alle','Gemüse','Kräuter','Beeren','Obst'].forEach(k => {
    const btn = document.getElementById('preserveTab-' + k);
    if (btn) btn.classList.toggle('active', k === c);
  });
  renderPreserveList();
}
function filterPreserveList(v) {
  preserveFilter = (v||'').trim().toLowerCase();
  renderPreserveList();
}
function renderPreserveView() {
  const box = document.getElementById('preserveWrap');
  let html = `<div class="home-intro" style="margin-bottom:22px"><h2>🥫 Verwertung &amp; Haltbarmachen</h2><p>So bleiben Ernteüberschüsse länger genießbar. Erst die Methoden im Überblick, darunter eine durchsuchbare Liste, welche Methode zu welcher Pflanze passt.</p></div>`;
  html += `<div class="pantry-tabs" style="margin-bottom:18px;flex-wrap:wrap">
    <button class="nav-btn${preserveSubTab==='methoden'?' active':''}" onclick="setPreserveSubTab('methoden')">🥫 Methoden</button>
    <button class="nav-btn${preserveSubTab==='heilkraeuter'?' active':''}" onclick="setPreserveSubTab('heilkraeuter')">🌿 Heilkräuter-Lexikon</button>
    <button class="nav-btn${preserveSubTab==='pilze'?' active':''}" onclick="setPreserveSubTab('pilze')">🍄 Pilz-Logbuch</button>
  </div>`;

  if (preserveSubTab === 'methoden') {
    html += `<div class="tips-topic"><div class="tips-topic-hd"><span class="tt-icon">🧑‍🍳</span><h3>Methoden im Überblick</h3></div>`;
    Object.entries(METHOD_INFO).forEach(([key, m], i) => {
      const id = `acc-preserve-${i}`;
      html += `<div class="accordion-item" id="${id}">
        <div class="accordion-header" onclick="toggleAccordion('${id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${id}')}">
          <span>${m.icon} ${escapeHtml(m.label)}</span><span class="ah-caret">▸</span>
        </div>
        <div class="accordion-body">${escapeHtml(m.tip)}</div>
      </div>`;
    });
    html += `</div>`;
    html += `<div class="sidebar-title" style="margin:22px 0 8px">🔍 Welche Methode passt zu meiner Pflanze?</div>
      <input type="text" id="preserveSearch" placeholder="🔍 Pflanze suchen…" oninput="filterPreserveList(this.value)" style="width:100%;max-width:360px;margin-bottom:10px">
      <div class="pantry-tabs" style="margin-bottom:14px;flex-wrap:wrap">
        ${['alle','Gemüse','Kräuter','Beeren','Obst'].map(c => `<button class="nav-btn${preserveCat===c?' active':''}" id="preserveTab-${c}" style="padding:5px 12px;font-size:0.72rem" onclick="setPreserveCat('${c}')">${c==='alle'?'Alle':c}</button>`).join('')}
      </div>
      <div id="preserveList"></div>`;
    box.innerHTML = html;
    renderPreserveList();
  } else if (preserveSubTab === 'heilkraeuter') {
    html += renderHeilkraeuterHtml();
    box.innerHTML = html;
  } else if (preserveSubTab === 'pilze') {
    html += `<div id="pilzLogWrap"></div>`;
    box.innerHTML = html;
    renderPilzLog();
  }
}
function renderPreserveList() {
  const box = document.getElementById('preserveList');
  if (!box) return;
  const items = PLANTS.filter(p => p.cat !== 'Blumen')
    .filter(p => preserveCat === 'alle' || p.cat === preserveCat)
    .filter(p => !preserveFilter || p.name.toLowerCase().includes(preserveFilter));
  if (!items.length) { box.innerHTML = '<div class="empty-state">Keine Treffer.</div>'; return; }
  box.innerHTML = items.map(p => {
    const info = getPreservationInfo(p.name) || { methods: [], note: null };
    const chips = (info.methods||[]).map(k => {
      const m = METHOD_INFO[k];
      return m ? `<span title="${escapeHtml(m.tip)}" style="display:inline-block;background:var(--cream);border-radius:6px;padding:2px 8px;font-size:0.7rem;margin:2px 4px 0 0;cursor:help">${m.icon} ${escapeHtml(m.label)}</span>` : '';
    }).join('');
    return `<div style="padding:8px 10px;margin-bottom:6px;border-radius:8px;background:var(--cream);border-left:3px solid var(--moss)">
      <div style="font-size:0.84rem;font-weight:600;color:var(--soil)">${p.sym} ${escapeHtml(p.name)}</div>
      <div style="margin-top:4px">${chips || '<span style="font-size:0.7rem;color:var(--bark)">Keine gängige Methode hinterlegt</span>'}</div>
      ${info.note ? `<div style="font-size:0.7rem;color:var(--bark);margin-top:4px">${escapeHtml(info.note)}</div>` : ''}
    </div>`;
  }).join('');
}

// ---------- HEILKRÄUTER-LEXIKON (reine Referenz, keine Dosierungsangaben) ----------
// HEILKRAEUTER → pflanzendaten.js
function renderHeilkraeuterHtml() {
  let html = `<div class="disclaimer-box" style="margin-bottom:16px">
    ℹ️ Diese Übersicht dient nur der allgemeinen Orientierung und ersetzt keine botanische Bestimmung, keine ärztliche Beratung und keine Dosierungsempfehlung. Bei Unsicherheit bei der Bestimmung: nicht sammeln bzw. verzehren. Bei bestehenden Erkrankungen, Schwangerschaft, Medikamenteneinnahme oder für Kinder vorab ärztlichen/apothekerlichen Rat einholen.
  </div>`;
  HEILKRAEUTER.forEach((k, i) => {
    const id = `acc-heilkraut-${i}`;
    html += `<div class="accordion-item" id="${id}">
      <div class="accordion-header" onclick="toggleAccordion('${id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${id}')}">
        <span>${k.icon} ${escapeHtml(k.name)}</span><span class="ah-caret">▸</span>
      </div>
      <div class="accordion-body">
        <div style="margin-bottom:6px"><strong>Erkennung:</strong> ${escapeHtml(k.erkennung)}</div>
        <div style="margin-bottom:6px"><strong>Sammelzeit:</strong> ${escapeHtml(k.sammelzeit)}</div>
        <div style="margin-bottom:6px"><strong>Traditionelle Verwendung:</strong> ${escapeHtml(k.verwendung)}</div>
        <div style="background:#fbe8d3;border-radius:8px;padding:8px 10px;color:#8a4a1f;font-size:0.8rem">⚠️ <strong>Verwechslungsgefahr:</strong> ${escapeHtml(k.verwechslung)}</div>
      </div>
    </div>`;
  });
  return html;
}

// ---------- PILZ-LOGBUCH (reines Sammel-Tagebuch, KEINE Bestimmungshilfe) ----------
const KEY_PILZLOG = 'gartenplaner_pilzlog';
let pilzLogEintraege = [];
try { pilzLogEintraege = JSON.parse(localStorage.getItem(KEY_PILZLOG) || '[]') || []; } catch(e) { pilzLogEintraege = []; }
function savePilzLog() { try { localStorage.setItem(KEY_PILZLOG, JSON.stringify(pilzLogEintraege)); } catch(e) {} }
function renderPilzLog() {
  const box = document.getElementById('pilzLogWrap');
  if (!box) return;
  let html = `<div class="disclaimer-box" style="margin-bottom:16px">
    ℹ️ Dieses Logbuch dient ausschließlich zum Festhalten eigener, bereits sicher bestimmter Funde – es liefert bewusst <strong>keine</strong> Bestimmungshilfe und bewertet nicht, ob ein Pilz essbar oder giftig ist. Für die sichere Bestimmung unbekannter Pilze immer einen Pilzsachverständigen vor Ort konsultieren (oft kostenlos über Pilzvereine oder Gesundheitsämter), niemals nach Foto/Beschreibung allein essen.
  </div>
  <button class="btn-add-entry" style="margin-bottom:14px" onclick="pilzFormOeffnen()">＋ Fund eintragen</button>`;
  if (!pilzLogEintraege.length) {
    html += `<div class="empty-state">Noch keine Einträge im Logbuch.</div>`;
  } else {
    const sortiert = pilzLogEintraege.slice().sort((a,b) => (b.datum||'').localeCompare(a.datum||''));
    html += sortiert.map(e => `<div style="display:flex;gap:10px;padding:9px 10px;margin-bottom:8px;border-radius:10px;background:var(--white);box-shadow:var(--shadow-soft);cursor:pointer" onclick="pilzFormOeffnen('${e.id}')">
      ${e.foto ? `<img src="${e.foto}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0">` : `<div style="width:56px;height:56px;border-radius:8px;background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🍄</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.85rem">${escapeHtml(e.name || 'Unbenannter Fund')}</div>
        <div style="font-size:0.72rem;color:var(--bark)">${e.datum ? new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE') : ''}${e.fundort ? ' · ' + escapeHtml(e.fundort) : ''}</div>
        ${e.notiz ? `<div style="font-size:0.72rem;color:var(--bark);opacity:0.8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(e.notiz)}</div>` : ''}
      </div>
    </div>`).join('');
  }
  box.innerHTML = html;
}
let pilzBearbeitenId = null;
let pilzFotoDaten = '';
function pilzFormOeffnen(id) {
  pilzBearbeitenId = id || null;
  const e = id ? pilzLogEintraege.find(x => x.id === id) : null;
  pilzFotoDaten = e ? (e.foto || '') : '';
  const html = `<div class="modal-bg" id="modalPilz" style="display:flex" onclick="if(event.target.id==='modalPilz')this.remove()">
    <div class="modal" style="width:min(400px,94vw);max-height:88vh;overflow-y:auto">
      <h2>${e ? 'Fund bearbeiten' : 'Neuer Fund'}</h2>
      <div class="feld"><label>Name (was du bestimmt hast)</label><input type="text" id="fPilzName" value="${e ? escapeHtml(e.name||'') : ''}" placeholder="z.B. Steinpilz"></div>
      <div class="feld"><label>Fundort</label><input type="text" id="fPilzOrt" value="${e ? escapeHtml(e.fundort||'') : ''}" placeholder="z.B. Waldrand hinterm Garten"></div>
      <div class="feld"><label>Datum</label><input type="date" id="fPilzDatum" value="${e ? (e.datum||'') : new Date().toISOString().slice(0,10)}"></div>
      <div class="feld"><label>Notizen</label><textarea id="fPilzNotiz" placeholder="z.B. bestimmt von Pilzsachverständigem, Begleitbäume, Menge">${e ? escapeHtml(e.notiz||'') : ''}</textarea></div>
      <div class="feld"><label>Foto</label>
        <div id="pilzFotoVorschau" style="margin-bottom:6px">${pilzFotoDaten ? `<img src="${pilzFotoDaten}" style="width:100%;max-width:220px;border-radius:10px;display:block">` : ''}</div>
        <input type="file" accept="image/*" onchange="handlePilzFoto(event)">
      </div>
      <div class="modal-btns">
        <button class="btn-secondary" onclick="document.getElementById('modalPilz').remove()">Abbrechen</button>
        <button class="btn-primary" onclick="pilzSpeichern()">Speichern</button>
      </div>
      ${e ? `<div class="modal-btns" style="margin-top:8px"><button class="btn-danger" style="width:100%" onclick="pilzLoeschen('${e.id}')">Eintrag löschen</button></div>` : ''}
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
function handlePilzFoto(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5);
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 5);
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      pilzFotoDaten = c.toDataURL('image/jpeg', 0.72);
      const vorschau = document.getElementById('pilzFotoVorschau');
      if (vorschau) vorschau.innerHTML = `<img src="${pilzFotoDaten}" style="width:100%;max-width:220px;border-radius:10px;display:block">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function pilzSpeichern() {
  const name = document.getElementById('fPilzName').value.trim();
  if (!name) { alert('Bitte einen Namen eingeben.'); return; }
  const daten = {
    name,
    fundort: document.getElementById('fPilzOrt').value.trim(),
    datum: document.getElementById('fPilzDatum').value,
    notiz: document.getElementById('fPilzNotiz').value.trim(),
    foto: pilzFotoDaten,
  };
  if (pilzBearbeitenId) {
    const e = pilzLogEintraege.find(x => x.id === pilzBearbeitenId);
    Object.assign(e, daten);
  } else {
    pilzLogEintraege.push(Object.assign({ id: 'pilz_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) }, daten));
  }
  savePilzLog();
  const modal = document.getElementById('modalPilz');
  if (modal) modal.remove();
  renderPilzLog();
}
function pilzLoeschen(id) {
  const index = pilzLogEintraege.findIndex(x => x.id === id);
  if (index === -1) return;
  const entfernt = pilzLogEintraege[index];
  pilzLogEintraege.splice(index, 1);
  savePilzLog();
  const modal = document.getElementById('modalPilz');
  if (modal) modal.remove();
  renderPilzLog();
  zeigeLoeschToast('Fund gelöscht', () => {
    pilzLogEintraege.splice(index, 0, entfernt);
    savePilzLog();
    renderPilzLog();
  });
}


// ==================== 🦔📸 TIER-ALBUM: Fotos direkt beim Tier ====================
// gardens[id].tierAlbum = { [tierId]: { fotos: [{ id, data|url, pfad, datum }] } }
// Fotos laufen über den Familien-Fotospeicher (alleFotoListenObjekte) wie Pflanzen- und Beobachtungsfotos.
function tierAlbumEintrag(tierId, anlegen) {
  const g = gardens[currentGardenId];
  if (!g) return null;
  if (!g.tierAlbum) { if (!anlegen) return null; g.tierAlbum = {}; }
  if (!g.tierAlbum[tierId] && anlegen) g.tierAlbum[tierId] = { fotos: [] };
  return g.tierAlbum[tierId] || null;
}
function tierFotoHinzufuegen(tierId) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const datei = inp.files && inp.files[0];
    if (!datei) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const eintrag = tierAlbumEintrag(tierId, true);
        eintrag.fotos.unshift({ id: fotoNeueId(), data: c.toDataURL('image/jpeg', 0.8), datum: heuteISO() });
        if (!tierSichtungen()[tierId]) tierGesehen(tierId); // Foto = gesehen
        else { saveData(); renderTiere(); if (tierDetailId === tierId) tierDetailRendern(); }
        try { if (typeof renderAlbum === 'function') renderAlbum(); } catch (err) {}
        familienFotosHochladen();
        showTempStatus('📸 Foto im Tier-Album gespeichert', 3);
      };
      img.onerror = () => showTempStatus('⚠ Datei ist kein gültiges Bild.', 4);
      img.src = e.target.result;
    };
    reader.readAsDataURL(datei);
  };
  inp.click();
}
function tierFotoLoeschen(tierId, fotoId) {
  const eintrag = tierAlbumEintrag(tierId, false);
  if (!eintrag) return;
  const i = eintrag.fotos.findIndex(f => f.id === fotoId);
  if (i < 0) return;
  const [weg] = eintrag.fotos.splice(i, 1);
  saveData(); renderTiere(); if (tierDetailId === tierId) tierDetailRendern();
  try { renderAlbum(); } catch (e) {}
  showTempStatus('Foto gelöscht', 5, { label: 'Rückgängig', aktion: () => {
    tierAlbumEintrag(tierId, true).fotos.splice(i, 0, weg); saveData(); renderTiere(); if (tierDetailId === tierId) tierDetailRendern(); try { renderAlbum(); } catch (e) {}
  } });
  setTimeout(() => { if (!(tierAlbumEintrag(tierId, false) || { fotos: [] }).fotos.includes(weg)) fotoCloudLoeschen(weg); }, 8000);
}

// Sammelkarten-Ansicht (für „Tiere im Garten“ und das Sammelalbum)
function tierAlbumGridHtml(liste, sicht) {
  return `<div class="album-grid">${liste.map(t => {
    const f = tierFotos(t.id)[0], s = sicht[t.id];
    if (f) return `<div class="album-slot gefuellt" onclick="tierDetailOeffnen('${t.id}')"><img src="${escapeHtml(f.src)}" alt="${escapeHtml(t.name)}" loading="lazy">
      ${tierFotos(t.id).length > 1 ? `<span class="as-badge">${tierFotos(t.id).length}</span>` : ''}<span class="as-label">${escapeHtml(t.name)}</span></div>`;
    return `<div class="album-slot${s ? ' tier-slot-gesehen' : ''}" onclick="tierDetailOeffnen('${t.id}')">
      <span class="as-icon">${escapeHtml(t.icon)}</span><span class="as-name">${escapeHtml(t.name)}</span>
      ${s ? '<span class="tier-slot-mark">👀 gesehen · 📷 fehlt</span>' : ''}</div>`;
  }).join('')}</div>`;
}

// Einmalige Übernahme: Nützlinge & Gartentierwelt aus dem alten Sammelalbum → Tiere im Garten
const ALBUM_TIER_ZUORDNUNG = { 'marienkäfer': 'marienkaefer', 'honigbiene': 'honigbiene', 'hummel': 'hummel', 'florfliege': 'florfliege', 'schwebfliege': 'schwebfliege',
  'ohrwurm': 'ohrwurm', 'laufkäfer': 'laufkaefer', 'regenwurm': 'regenwurm', 'wildbiene': 'sandbiene', 'schmetterling': 'tagpfauenauge', 'igel': 'igel', 'amsel': 'amsel',
  'rotkehlchen': 'rotkehlchen', 'eichhörnchen': 'eichhoernchen', 'zauneidechse': 'eidechse', 'erdkröte': 'amphibien', 'blindschleiche': 'blindschleiche',
  'star': 'star', 'zaunkönig': 'zaunkoenig', 'meise': 'meisen' };
function albumTiereMigrieren() {
  let geaendert = false;
  const altGarten = currentGardenId;
  Object.keys(gardens || {}).forEach(gid => {
    const g = gardens[gid];
    if (!g || !g.album || g.album.tiereUebernommen) return;
    currentGardenId = gid;
    const album = g.album;
    ['nuetzlinge', 'tierwelt'].forEach(seite => {
      const namen = new Set();
      Object.keys(album.entries || {}).forEach(k => { if (k.startsWith(seite + '::')) namen.add(k.slice(seite.length + 2)); });
      (album.custom && album.custom[seite] || []).forEach(e => namen.add(typeof e === 'string' ? e : e.name));
      namen.forEach(name => {
        const key = seite + '::' + name;
        const fotos = (album.entries[key] || []).filter(f => f && f.photo);
        const custom = (album.custom && album.custom[seite] || []).find(e => (typeof e === 'string' ? e : e.name) === name);
        const lname = name.trim().toLowerCase();
        let id = ALBUM_TIER_ZUORDNUNG[lname];
        if (!id) { const t = alleTiere().find(x => x.name.toLowerCase() === lname) || alleTiere().find(x => x.name.toLowerCase().split(/[\s\-&(),]+/).includes(lname)); if (t) id = t.id; }
        if (!id) {
          if (!fotos.length && !custom) return;
          id = 'eig_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
          eigeneTiere().push({ id, name: name.trim(), icon: seite === 'nuetzlinge' ? '🐞' : '🐾', kat: seite === 'nuetzlinge' ? 'insekten' : 'saeuger', latein: '', kurz: '',
            nahrung: '', wohnung: '', notiz: custom && typeof custom === 'object' ? custom.notiz || '' : '', angelegt: heuteISO() });
        }
        if (fotos.length) {
          const eintrag = tierAlbumEintrag(id, true);
          fotos.forEach(f => eintrag.fotos.push({ id: fotoNeueId(), data: f.photo, datum: f.date || heuteISO() }));
          const sicht = tierSichtungen();
          const erst = fotos.map(f => f.date).filter(Boolean).sort()[0] || heuteISO();
          if (!sicht[id]) sicht[id] = { anzahl: fotos.length, erst, zuletzt: fotos.map(f => f.date).filter(Boolean).sort().pop() || erst };
        }
        delete album.entries[key];
      });
      if (album.custom) delete album.custom[seite];
    });
    album.tiereUebernommen = true;
    geaendert = true;
  });
  currentGardenId = altGarten;
  if (geaendert) { try { saveData(); familienFotosHochladen(); } catch (e) {} }
}

// ==================== FOTOALBUM ====================
const ALBUM_SEITEN = [
  { id: 'pflanzen', icon: '🌷', label: 'Pflanzen', dynamic: true },
  { id: 'tiere', icon: '🦔', label: 'Tiere', tiere: true },
  { id: 'schaedlinge', icon: '🐛', label: 'Schädlinge', vorschlaege: ['Blattlaus','Kohlweißling-Raupe','Nacktschnecke','Wühlmaus','Kartoffelkäfer','Spinnmilbe','Dickmaulrüssler','Wollläuse'] },
  { id: 'sonstiges', icon: '✨', label: 'Sonstige Entdeckungen', vorschlaege: [] },
];
let albumAktiveSeite = 'pflanzen';
let albumAktiverSlotKey = null;

function getAlbum() {
  const g = gardens[currentGardenId];
  if (!g) return null;
  if (!g.album) g.album = { entries: {}, custom: {} };
  if (!g.album.entries) g.album.entries = {};
  if (!g.album.custom) g.album.custom = {};
  return g.album;
}
// Verknüpft ein in der Pflanzenansicht hochgeladenes Foto zusätzlich mit dem
// Garten-Sammelalbum, unter der Kategorie "Gesamtpflanze" (die generischste der drei
// Sammelalbum-Rubriken – Blüte/Frucht bleiben eigenständigen Einträgen im Album
// vorbehalten, da sich das aus einem normalen Fortschrittsfoto nicht automatisch ableiten lässt).
function ppFotoInSammelalbumEintragen(plantName, dataUrl) {
  const name = (plantName || '').trim();
  if (!name) return;
  const album = getAlbum();
  if (!album) return;
  const key = `pflanzen::${name}::Gesamtpflanze`;
  if (!album.entries[key]) album.entries[key] = [];
  album.entries[key].unshift({ photo: dataUrl, date: new Date().toISOString().slice(0, 10) });
}
function albumPflanzenListe() {
  const beds = getCurrentBeds();
  const namen = new Set();
  beds.forEach(b => (b.plants || []).forEach(p => { if (p.name) namen.add(p.name.trim()); }));
  getCurrentFreiPflanzen().forEach(fp => { if (fp.name) namen.add(fp.name.trim()); });
  return Array.from(namen).sort((a, b) => a.localeCompare(b, 'de'));
}
function albumSlotsFuerSeite(seiteId) {
  const album = getAlbum();
  if (!album) return [];
  if (seiteId === 'tiere') return []; // eigene Darstellung (Tiere im Garten)
  if (seiteId === 'pflanzen') {
    const teile = ['Gesamtpflanze', 'Blüte', 'Frucht'];
    const slots = [];
    albumPflanzenListe().forEach(name => {
      const plantDef = PLANTS.find(p => p.name === name);
      const icon = plantDef ? plantDef.sym : '🌱';
      teile.forEach(teil => slots.push({ key: `pflanzen::${name}::${teil}`, label: `${name} – ${teil}`, icon, gruppe: name }));
    });
    return slots;
  }
  const seite = ALBUM_SEITEN.find(s => s.id === seiteId);
  if (!seite) return [];
  const eigene = (album.custom[seiteId] || []).map(e => typeof e === 'string' ? { name: e, notiz: '' } : e);
  const vorschlaege = (seite.vorschlaege || []).map(name => ({ name, notiz: '' }));
  return [...vorschlaege, ...eigene].map(e => ({ key: `${seiteId}::${e.name}`, label: e.name, icon: seite.icon, notiz: e.notiz || '' }));
}
function albumSlotHtml(slot, album) {
  const fotos = album.entries[slot.key] || [];
  const keyEsc = slot.key.replace(/'/g, "\\'");
  if (fotos.length) {
    return `<div class="album-slot gefuellt" onclick="openAlbumSlot('${keyEsc}')">
      <img src="${fotos[0].photo}" alt="${escapeHtml(slot.label)}">
      ${fotos.length > 1 ? `<span class="as-badge">${fotos.length}</span>` : ''}
      <span class="as-label">${escapeHtml(slot.label)}</span>
    </div>`;
  }
  return `<div class="album-slot" onclick="openAlbumSlot('${keyEsc}')">
    <span class="as-icon">${slot.icon || '❔'}</span>
    <span class="as-name">${escapeHtml(slot.label)}</span>
  </div>`;
}
function renderAlbum() {
  const box = document.getElementById('albumWrap');
  if (!box) return;
  if (!currentGardenId || !gardens[currentGardenId]) {
    box.innerHTML = '<div class="empty-state">Lege zuerst einen Garten an.</div>';
    return;
  }
  albumTiereMigrieren();
  const album = getAlbum();
  let gesamtSlots = 0, gesamtGefuellt = 0;
  ALBUM_SEITEN.forEach(s => {
    const slots = albumSlotsFuerSeite(s.id);
    gesamtSlots += slots.length;
    gesamtGefuellt += slots.filter(sl => (album.entries[sl.key] || []).length > 0).length;
  });
  // Tiere zählen mit einem Foto als „entdeckt“ (seltene Funde nur, wenn vorhanden)
  const tierSicht = tierSichtungen();
  const albumTiere = alleTiere().filter(t => t.aufwand < 4 || tierFotos(t.id).length || tierSicht[t.id]);
  const tiereMitFoto = albumTiere.filter(t => tierFotos(t.id).length).length;
  gesamtSlots += albumTiere.length; gesamtGefuellt += tiereMitFoto;
  const pct = gesamtSlots ? Math.round(gesamtGefuellt / gesamtSlots * 100) : 0;
  let html = `<div class="album-progress-hd">
    <div class="ap-title">📸 Garten-Sammelalbum</div>
    <div class="album-progress-bar-wrap"><div class="album-progress-bar" style="width:${pct}%"></div></div>
    <div class="ap-count">${gesamtGefuellt} / ${gesamtSlots} Felder entdeckt (${pct}%)</div>
  </div>`;
  html += `<div class="album-seiten-tabs">`;
  ALBUM_SEITEN.forEach(s => {
    html += `<button class="album-seiten-tab${albumAktiveSeite === s.id ? ' active' : ''}" onclick="switchAlbumSeite('${s.id}')">${s.icon} ${escapeHtml(s.label)}</button>`;
  });
  html += `</div>`;
  if (albumAktiveSeite === 'tiere') {
    html += `<div class="album-seiten-sub">${tiereMitFoto} / ${albumTiere.length} Tiere mit Foto · ${albumTiere.filter(t => tierSicht[t.id]).length} gesehen</div>`;
    html += `<div class="tier-werkzeuge" style="margin:4px 0 10px"><button type="button" class="btn-secondary" onclick="showView('tiere')">🦔 Zu „Tiere im Garten“ (Steckbriefe, Bestimmung, Tierjahr) ›</button></div>`;
    const gruppen = {};
    albumTiere.forEach(t => (gruppen[t.kat] = gruppen[t.kat] || []).push(t));
    Object.keys(TIER_KATEGORIEN).forEach(k => {
      if (!gruppen[k]) return;
      html += `<div class="album-gruppe-titel">${escapeHtml(TIER_KATEGORIEN[k])}</div>` + tierAlbumGridHtml(gruppen[k], tierSicht);
    });
    box.innerHTML = html;
    return;
  }
  const slots = albumSlotsFuerSeite(albumAktiveSeite);
  const seiteGefuellt = slots.filter(sl => (album.entries[sl.key] || []).length > 0).length;
  html += `<div class="album-seiten-sub">${seiteGefuellt} / ${slots.length || 0} auf dieser Seite entdeckt</div>`;
  if (albumAktiveSeite === 'pflanzen') {
    if (!slots.length) {
      html += `<div class="empty-state">Noch keine Pflanzen im Gartenplaner angelegt. Sobald du Beete mit Pflanzen anlegst, erscheinen hier automatisch Sammel-Felder dafür.</div>`;
    } else {
      const gruppen = {};
      slots.forEach(sl => { (gruppen[sl.gruppe] = gruppen[sl.gruppe] || []).push(sl); });
      Object.keys(gruppen).forEach(name => {
        html += `<div class="album-gruppe-titel">${escapeHtml(name)}</div><div class="album-grid">`;
        gruppen[name].forEach(sl => { html += albumSlotHtml(sl, album); });
        html += `</div>`;
      });
    }
  } else {
    html += `<div class="album-grid">`;
    slots.forEach(sl => { html += albumSlotHtml(sl, album); });
    html += `<div class="album-slot album-add-feld" onclick="albumEigenesFeldPrompt('${albumAktiveSeite}')"><span class="as-icon">＋</span><span class="as-name">Eigenes Feld</span></div>`;
    html += `</div>`;
  }
  box.innerHTML = html;
}
function switchAlbumSeite(id) { albumAktiveSeite = id; renderAlbum(); }
let albumAktiverSlotSeite = null;
function openAlbumSlot(key) {
  const album = getAlbum();
  if (!album) return;
  albumAktiverSlotKey = key;
  albumAktiverSlotSeite = key.split('::')[0];
  const slot = ALBUM_SEITEN.flatMap(s => albumSlotsFuerSeite(s.id)).find(s => s.key === key);
  document.getElementById('albumDetailTitel').textContent = (slot?.icon || '📸') + ' ' + (slot ? slot.label : key);
  const notizBox = document.getElementById('albumDetailNotiz');
  const istEigenesFeld = albumAktiverSlotSeite !== 'pflanzen' && (album.custom[albumAktiverSlotSeite] || []).some(e => (typeof e === 'string' ? e : e.name) === (slot ? slot.label : ''));
  if (istEigenesFeld) {
    notizBox.style.display = '';
    notizBox.value = slot?.notiz || '';
  } else {
    notizBox.style.display = 'none';
  }
  renderAlbumDetailFotos();
  document.getElementById('modalAlbumDetail').style.display = 'flex';
}
function albumNotizSpeichern() {
  if (!albumAktiverSlotSeite || albumAktiverSlotSeite === 'pflanzen') return;
  const album = getAlbum();
  const name = albumAktiverSlotKey.slice(albumAktiverSlotSeite.length + 2);
  const liste = album.custom[albumAktiverSlotSeite] || [];
  const idx = liste.findIndex(e => (typeof e === 'string' ? e : e.name) === name);
  if (idx === -1) return;
  const neueNotiz = document.getElementById('albumDetailNotiz').value.trim();
  liste[idx] = { name, notiz: neueNotiz };
  saveData();
  showTempStatus('Notiz gespeichert.', 2);
}
function renderAlbumDetailFotos() {
  const album = getAlbum();
  const box = document.getElementById('albumDetailFotos');
  const fotos = album.entries[albumAktiverSlotKey] || [];
  if (!fotos.length) {
    box.innerHTML = `<div class="empty-state" style="padding:10px 0">Noch kein Foto – leg direkt los!</div>`;
  } else {
    box.innerHTML = fotos.map((f, i) => `<div class="album-detail-foto">
      <img src="${f.photo}" onclick="openLightbox('${f.photo.replace(/'/g, "\\'")}')">
      <button class="adf-del" onclick="albumFotoLoeschen(${i})" title="Löschen">✕</button>
      <span class="adf-date">${f.date ? new Date(f.date).toLocaleDateString('de-DE') : ''}</span>
    </div>`).join('');
  }
}
function albumFotoLoeschen(i) {
  const album = getAlbum();
  const fotos = album.entries[albumAktiverSlotKey];
  if (!fotos) return;
  const entfernt = fotos[i];
  const slotKey = albumAktiverSlotKey;
  fotos.splice(i, 1);
  const slotGeloescht = !fotos.length;
  if (slotGeloescht) delete album.entries[slotKey];
  saveData();
  renderAlbumDetailFotos();
  renderAlbum();
  zeigeLoeschToast('Foto gelöscht', () => {
    if (!album.entries[slotKey]) album.entries[slotKey] = [];
    album.entries[slotKey].splice(i, 0, entfernt);
    saveData();
    renderAlbumDetailFotos();
    renderAlbum();
  });
}
function closeAlbumDetail() {
  document.getElementById('modalAlbumDetail').style.display = 'none';
  albumAktiverSlotKey = null;
}
function handleAlbumFotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !albumAktiverSlotKey) return;
  const reader = new FileReader();
  reader.onerror = () => { showTempStatus('⚠ Foto konnte nicht gelesen werden.', 5); document.getElementById('albumFotoInput').value = ''; };
  reader.onload = (ev) => {
    const img = new Image();
    img.onerror = () => { showTempStatus('⚠ Datei ist kein gültiges Bild.', 5); document.getElementById('albumFotoInput').value = ''; };
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.72);
      const album = getAlbum();
      if (!album.entries[albumAktiverSlotKey]) album.entries[albumAktiverSlotKey] = [];
      album.entries[albumAktiverSlotKey].unshift({ photo: dataUrl, date: new Date().toISOString().slice(0, 10) });
      saveData();
      document.getElementById('albumFotoInput').value = '';
      renderAlbumDetailFotos();
      renderAlbum();
      showTempStatus('📸 Foto hinzugefügt!', 3);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
function albumEigenesFeldPrompt(seiteId) {
  const name = prompt('Name für das neue Feld (z.B. eine Tier- oder Pflanzenart):');
  if (!name || !name.trim()) return;
  const notiz = (prompt('Kurze Notiz dazu (optional, z.B. wo/wann meist zu finden):') || '').trim();
  const album = getAlbum();
  if (!album.custom[seiteId]) album.custom[seiteId] = [];
  const vorhanden = album.custom[seiteId].some(e => (typeof e === 'string' ? e : e.name).toLowerCase() === name.trim().toLowerCase());
  if (vorhanden) {
    showTempStatus('Feld gibt es schon.', 3);
    return;
  }
  album.custom[seiteId].push({ name: name.trim(), notiz });
  saveData();
  renderAlbum();
}

// ==================== SYNC: Änderungen an synchronisierten Schlüsseln melden ====================
// Statt jede einzelne Speicherfunktion anzupassen, wird localStorage.setItem zentral
// überwacht: Schreibt eine der 9 synchronisierten Schlüssel, wird die Cloud-Synchronisierung
// angestoßen (leicht verzögert/gesammelt über PlanerSync).
const GARTEN_SYNC_SCHLUESSEL = [
  'gartenplaner_v3', 'gartenplaner_varieties', 'gartenplaner_bedTemplates',
  'gartenplaner_recentPlants', 'gartenplaner_seedInventory', 'gartenplaner_costs',
  'gartenplaner_pantry', 'gartenplaner_shops', 'gartenplaner_careDone', 'gartenplaner_customPlants',
  'gartenplaner_pilzlog', 'gartenplaner_wishlist',
  'garten_pushPlan', // kleiner Auszug für die Push-Hinweise (Frost, Hitze, Monatsvorschau) – liest die Server-Funktion
];

// ==================== PUSH-PLAN für die Server-Erinnerungen ====================
// Der Server (functions/index.js) kennt keine Pflanzendaten. Darum legt die App hier einen kleinen
// Auszug ab: je Garten Standort + frostempfindliche Pflanzen, dazu für die nächsten 12 Monate,
// was vorzuziehen, zu säen, auszupflanzen oder zu schneiden ist (nur Pflanzen, die im Garten
// stehen, als Saatgut da sind oder zuletzt verwendet wurden). Wird bei jeder Änderung neu berechnet.
const GARTEN_PUSHPLAN_KEY = 'garten_pushPlan';
function gartenPushPlanBerechnen() {
  const imGarten = new Set();
  Object.values(gardens || {}).forEach(g => {
    (g.beds || []).filter(b => b.kind !== 'struktur').forEach(b => (b.plants || []).forEach(p => p.name && imGarten.add(p.name.trim())));
    (g.freiPflanzen || []).forEach(fp => fp.name && imGarten.add(fp.name.trim()));
  });
  const relevant = new Set(imGarten);
  (seedInventory || []).forEach(e => e.plant && relevant.add(e.plant.trim()));
  (recentPlants || []).forEach(p => p.name && relevant.add(p.name.trim()));
  Object.values(gardens || {}).forEach(g => (g.beds || []).forEach(b => ((b.jahresplan && b.jahresplan.pflanzen) || []).forEach(n => relevant.add(n))));
  const kat = n => lexKatalogName(n);
  // Gärten mit Wetter-Standort
  const gaerten = Object.keys(gardens || {}).map(gid => {
    const g = gardens[gid];
    if (!g || !g.weatherLoc || typeof g.weatherLoc.lat !== 'number') return null;
    const frost = {};
    let anzahl = 0;
    const pruefe = (p) => {
      anzahl++;
      const n = kat((p.name || '').trim());
      if (!n || !(isFrostTender(n) || WINTERSCHUTZ[n])) return;
      const ws = WINTERSCHUTZ[n];
      if (ws && ws[0] === 'saison' && ((g.winterschutz || {})[winterschutzSaison()] || {})[n]) return; // schon erledigt
      const ab = p.date || null;
      if (!(n in frost) || (frost[n] && (!ab || ab < frost[n]))) frost[n] = ab;
    };
    (g.beds || []).filter(b => b.kind !== 'struktur').forEach(b => (b.plants || []).forEach(pruefe));
    (g.freiPflanzen || []).forEach(pruefe);
    return { name: g.name || 'Garten', lat: Math.round(g.weatherLoc.lat * 100) / 100, lon: Math.round(g.weatherLoc.lon * 100) / 100,
      pflanzen: anzahl, frost: Object.keys(frost).sort((a, b) => a.localeCompare(b, 'de')).map(n => (WINTERSCHUTZ[n] ? { n, ab: frost[n], t: WINTERSCHUTZ[n][2] } : { n, ab: frost[n] })) };
  }).filter(Boolean);
  // Monatsvorschau
  const off = CLIMATE_OFFSET[getClimateZone()] || 0;
  const start = new Date(); start.setDate(1);
  const monate = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const m = d.getMonth() + 1;
    const key = d.getFullYear() + '-' + String(m).padStart(2, '0');
    const eintrag = { vorziehen: [], direktsaat: [], auspflanzen: [], schneiden: [] };
    [...relevant].map(kat).filter((n, idx, arr) => arr.indexOf(n) === idx).sort((a, b) => a.localeCompare(b, 'de')).forEach(n => {
      const so = SOWING[n];
      if (so) ['vorziehen', 'direktsaat', 'auspflanzen'].forEach(ph => {
        if (so[ph] && Math.min(12, Math.max(1, so[ph][0] + off)) === m) eintrag[ph].push(n);
      });
      if (imGarten.has(n) || [...imGarten].some(x => kat(x) === n)) {
        const rk = pflanzenSchluesselFinden(n, RUECKSCHNITT);
        if (rk && RUECKSCHNITT[rk].monate[0] === m) eintrag.schneiden.push(n);
      }
    });
    if (Object.values(eintrag).some(l => l.length)) monate[key] = eintrag;
  }
  // 📝 Notiz-Erinnerungen (alle Gärten) – der Server schickt sie am Erinnerungstag zur Tageszeit des Geräts
  const notizen = [];
  Object.values(gardens || {}).forEach(g => (g.notizPins || []).forEach(n => {
    if (!n || !n.datum || (!n.jaehrlich && n.erledigt)) return;
    notizen.push({ id: n.id, t: ((n.icon || '📝') + ' ' + (n.text || '')).slice(0, 140), d: n.datum, j: n.jaehrlich ? 1 : 0, e: n.erledigtJahr || '', g: g.name || 'Garten' });
  }));
  return { v: 1, gaerten, monate, notizen };
}
let gartenPushPlanTimer = null;
function gartenPushPlanAktualisieren() {
  clearTimeout(gartenPushPlanTimer);
  gartenPushPlanTimer = setTimeout(() => {
    try {
      const neu = JSON.stringify(gartenPushPlanBerechnen());
      if (localStorage.getItem(GARTEN_PUSHPLAN_KEY) !== neu) localStorage.setItem(GARTEN_PUSHPLAN_KEY, neu); // löst den Sync aus
    } catch (e) { console.warn('Push-Plan', e); }
  }, 2500);
}
(function () {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (GARTEN_SYNC_SCHLUESSEL.indexOf(key) !== -1 && window._sync) window._sync.melde();
    // Garten oder Saatgut geändert → Push-Plan neu berechnen (nur geschrieben, wenn er sich wirklich ändert)
    if (key === 'gartenplaner_v3' || key === 'gartenplaner_seedInventory' || key === 'gartenplaner_recentPlants') gartenPushPlanAktualisieren();
  };
})();
gartenPushPlanAktualisieren(); // einmal beim Start (z.B. Monatswechsel)

// ==================== INIT ====================
loadAllData();
loadVarieties();
loadBedTemplates();
loadShops();
loadSeedInventory();
loadWishlist();
loadCosts();
loadPantry();
buildPlantNamesDatalist();
buildPlantGrid();
buildSymptomDropdown();
buildPestDropdown();
populateHarvestMethodSelect();
renderGardenTabs();
renderBedList();
updateStatus();
setMode('select');
updateShapeControls();
resizeCanvas();
updateUndoBtn();
applyBgColor();
{ const loc=getWeatherSettings(); if (loc) fetchWeather(loc, false); }
checkBackupReminder();
renderHomeOverview();

// Zuletzt geöffnete Ansicht wiederherstellen (z.B. nach einem Neuladen durch
// Pull-to-refresh), statt immer wieder auf der Startübersicht zu landen.
try {
  const letzteAnsicht = localStorage.getItem('garten_aktiveAnsicht');
  if (letzteAnsicht && letzteAnsicht !== 'home' && document.getElementById('view-' + letzteAnsicht)) {
    showView(letzteAnsicht);
  }
} catch (e) {}
applyGartenAnsichtModus();

// ==================== HANDY-ZURÜCK-TASTE ABFANGEN ====================
// Ohne eigene Behandlung navigiert der native Zurück-Knopf des Smartphones durch die
// Browser-Historie "hindurch" und die App landet auf einer leeren Zwischenseite (nur
// Hintergrundfarbe). Stattdessen: schließt zuerst jede offene Pflanzenansicht/jedes
// offene Fenster; ist nichts offen, passiert bewusst gar nichts (statt die App zu
// verlassen bzw. leerzuräumen).
function ppSchliesseAlleOffenenUeberlagerungen() {
  let geschlossen = false;
  if (document.getElementById('plantPanel')?.classList.contains('open')) { closePlantPanel(); geschlossen = true; }
  if (document.getElementById('freiPflanzePanel')?.classList.contains('open')) { fpSchliessen(); geschlossen = true; }
  if (document.getElementById('fotoLightbox')?.classList.contains('zeigen')) { fotoLightboxSchliessen(); geschlossen = true; }
  document.querySelectorAll('.modal-bg').forEach(el => {
    if (el.id === 'plantPanel' || el.id === 'freiPflanzePanel') return; // eigene Klasse .plant-panel, oben schon behandelt
    const sichtbar = el.style.display === 'flex' || el.classList.contains('zeigen');
    if (sichtbar) { el.style.display = 'none'; el.classList.remove('zeigen'); geschlossen = true; }
  });
  if (document.querySelector('.dropdown-menu.open')) { closeDropdowns(); geschlossen = true; }
  return geschlossen;
}
try {
  history.pushState({ ppBase: true }, '', location.href);
  window.addEventListener('popstate', function () {
    ppSchliesseAlleOffenenUeberlagerungen();
    // Die Zurück-Navigation "auffangen": neuen Zustand pushen, damit ein weiterer
    // Druck auf Zurück nicht aus der App heraus- bzw. auf eine leere Seite führt.
    history.pushState({ ppBase: true }, '', location.href);
  });
} catch (e) {}

// ==================== SYNC: Cloud-Synchronisierung starten ====================
// Fotos werden bewusst NICHT synchronisiert (Firestore-Größenlimit: 1 MB pro Dokument).
// Sie bleiben lokal auf dem jeweiligen Gerät gespeichert.
if (window.PlanerSync) {
  window._sync = window.PlanerSync.starteSync({
    modul: 'garten',
    keys: GARTEN_SYNC_SCHLUESSEL,
    transform: function (werte) {
      // Alle Garten-Schlüssel ohne Fotos hochladen (Pflanzen, Tagebuch, Gartenfoto, Pilz-Logbuch …)
      return window.PlanerSync.entferneFotosTief(werte);
    },
    vorAnwendungTransform: function (remoteWerte, lokaleWerte) {
      // Eingehende Daten von einem anderen Gerät enthalten nie Fotos (siehe transform oben).
      // Damit dadurch keine lokal gespeicherten Fotos verloren gehen, werden sie hier aus
      // dem aktuellen lokalen Stand wieder eingefügt, bevor sie gespeichert werden.
      Object.keys(remoteWerte).forEach(function (k) {
        if (lokaleWerte[k] !== undefined) remoteWerte[k] = window.PlanerSync.fotosWiederEinfuegen(remoteWerte[k], lokaleWerte[k]);
      });
      return remoteWerte;
    },
    onRemoteChange: function (istErstmaligerAbgleich) {
      // Der Gartenplaner hat viele interne, spezialisierte Render-Funktionen ohne
      // zentrales "renderAlles". Bei echten eingehenden Änderungen wird die Seite deshalb
      // neu geladen – lädt automatisch alle Daten frisch aus localStorage.
      //
      // WICHTIG: Beim ERSTEN Verbindungsaufbau feuert Firestore immer sofort mit dem
      // aktuellen Stand (auch wenn er unverändert ist) – das ist bei Mehrgeräte-Nutzung
      // der Normalfall, nicht die Ausnahme. Ein ungebremster Reload hier würde bei jedem
      // Öffnen, dessen letzte Änderung vom anderen Gerät stammt, eine Lade-Schleife
      // auslösen. Deshalb: pro Browser-Sitzung höchstens EIN automatischer Reload direkt
      // nach dem ersten Abgleich (um trotzdem aktuelle Daten zu zeigen), danach nicht mehr.
      if (istErstmaligerAbgleich) {
        let bereitsNeuGeladen = false;
        try { bereitsNeuGeladen = sessionStorage.getItem('garten_syncReload') === '1'; } catch (e) {}
        if (bereitsNeuGeladen) return;
        try { sessionStorage.setItem('garten_syncReload', '1'); } catch (e) {}
      }
      location.reload();
    },
  });
}

// Eigener Sync-Kanal fürs Termine-Dokument: Termine, die der Garten anlegt (📌 Pflege,
// 🔔 Pflanz-Erinnerungen), landen so in der Cloud – sonst nur auf diesem Gerät und ohne Push.
if (window.PlanerSync) {
  window._termineSync = window.PlanerSync.starteSync({ modul: 'termine', keys: ['termine_events_v1'] });
  // Eingang der Vorratskammer (Ernte → Vorratskammer)
  window._vorratSync = window.PlanerSync.starteSync({ modul: 'vorratskammer', keys: ['vorratskammer_eingang'] });
  window._einkaufSync = window.PlanerSync.starteSync({ modul: 'einkauf', keys: ['einkauf_listen'] }); // „Saatgut fehlt → Einkauf“
  // Kinderecke: Sterne für Garten-Aufgaben + „Gegossen!“ aus der Kinderecke übernehmen
  window._kinderSync = window.PlanerSync.starteSync({ modul: 'kinder', keys: ['kinder_sterne', 'garten_kinderErledigt'], onRemoteChange: () => { if (kinderErledigtAnwenden() && document.getElementById('view-home').classList.contains('active')) renderHomeOverview(); } });
}

// ==================== BARRIEREFREIHEIT: FOKUS-MANAGEMENT FÜR MODALS ====================
(function(){
  let lastFocused = null;
  function getFocusable(modal){
    return modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  }
  document.querySelectorAll('.modal-bg').forEach(modal=>{
    const observer = new MutationObserver(()=>{
      const visible = getComputedStyle(modal).display !== 'none';
      if (visible && !modal.dataset.wasVisible) {
        lastFocused = document.activeElement;
        const f = getFocusable(modal);
        if (f.length) f[0].focus();
        modal.dataset.wasVisible = '1';
      } else if (!visible && modal.dataset.wasVisible) {
        modal.dataset.wasVisible = '';
        if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
  });
})();
