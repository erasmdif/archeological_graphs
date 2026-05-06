const catalogState = {
  datasets: { material: null, morphology: null, category: null, combo: null },
  activeType: 'material',
  mode: 'single',
  charts: {},
};

const META = {
  material: { label: 'Material class', colorStart: 182 },
  morphology: { label: 'Morphological class', colorStart: 278 },
  category: { label: 'Category object', colorStart: 228 },
  combo: { label: 'Morphology × Material', colorStart: 318 },
};

const EXPECTED_COLUMNS = {
  material: ['n_impasto_coarse_ware','n_impasto_semifine_ware','n_impasto_fine_ware','n_red_and_black','n_wash_slipped_red','n_wash_slipped_black','n_etrusco_padana_type','n_black_gloss_attic_ware','n_glossy_surfaced_ware','n_glossy_surfaced_decoration','n_fired_clay','n_bronze','n_iron','n_lithic','n_glass_paste'],
  morphology: ['n_basin','n_beaker','n_biconical_pot','n_mug','n_jug','n_bowl','n_bowl_baking_pan','n_bowl_lid','n_bowl_patera','n_mortar','n_cup','n_cup_lid','n_cup_stepped_rim','n_jar','n_big_jar','n_shoulder','n_carinated_wall','n_wall','n_decorated_wall','n_handle','n_handle_u_shaped','n_lug_handle','n_vassel','n_amphora','n_rondella','n_strainer','n_bobbin','n_spindle_whorl','n_loom_weight','n_decorated_fired_clay_element','n_fired_clay_element','n_oven','n_hearth','n_wattle_impression','n_fibula_core','n_fibula','n_pin','n_needle','n_ring','n_nail','n_rod','n_bar','n_hook','n_ingot','n_projectile','n_stud','n_iron_object','n_slag','n_slag_bearing_smithy','n_casting_mould','n_blade','n_blade_flake','n_arrowhead','n_grinding_stone','n_stone_object','n_rose_quartz','n_glass_bead','n_spheric_object'],
  category: ['n_open_shape','n_closed_shape','n_handle','n_rondella','n_bobbin','n_spindle_whorl','n_loom_weight','n_fired_clay_element','n_bronze_object','n_bronze_ornament','n_iron_object','n_iron_ornament','n_clay_casting_mould','n_melting_slag','n_stone_casting_mould','n_flint','n_stone_object','n_strainer','n_grinding_stone','n_glass_bead'],
  combo: [],
};

const els = {};

window.addEventListener('DOMContentLoaded', () => {
  [
    'loadCatalogDemo', 'loadCatalogFiles', 'catalogMaterialFile', 'catalogMorphologyFile', 'catalogCategoryFile', 'catalogComboFile',
    'catalogDataset', 'catalogLevel', 'catalogItem', 'catalogItemA', 'catalogItemB', 'catalogBreakdown',
    'catalogTopCategories', 'catalogTopChildren', 'catalogNarrative',
    'kpiTotal', 'kpiDiversity', 'kpiDominant', 'kpiCoherence', 'catalogTableBody',
    'catalogCompareSection', 'catalogSingleTop', 'catalogSingleCharts', 'catalogSingleTable',
    'compareSummaryA', 'compareSummaryB'
  ].forEach(id => { els[id] = document.getElementById(id); });

  initChartDefaults();
  bindEvents();
  renderEmpty();
});

function bindEvents() {
  els.loadCatalogDemo.addEventListener('click', loadDemo);
  els.loadCatalogFiles.addEventListener('click', loadFiles);
  document.querySelectorAll('[data-catalog-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      catalogState.mode = btn.dataset.catalogMode;
      document.querySelectorAll('[data-catalog-mode]').forEach(b => b.classList.toggle('active', b === btn));
      updateModeVisibility();
      renderCatalog();
    });
  });
  ['catalogDataset', 'catalogLevel', 'catalogBreakdown', 'catalogTopCategories', 'catalogTopChildren'].forEach(id => {
    els[id].addEventListener('change', () => {
      if (id === 'catalogDataset') catalogState.activeType = els.catalogDataset.value;
      if (id === 'catalogDataset' || id === 'catalogLevel') populateCatalogItems();
      renderCatalog();
    });
  });
  ['catalogItem', 'catalogItemA', 'catalogItemB'].forEach(id => els[id].addEventListener('change', renderCatalog));
}

function updateModeVisibility() {
  const compare = catalogState.mode === 'compare';
  els.catalogCompareSection.classList.toggle('catalog-hidden', !compare);
  els.catalogSingleTop.classList.toggle('catalog-hidden', compare);
  els.catalogSingleCharts.classList.toggle('catalog-hidden', compare);
  els.catalogSingleTable.classList.toggle('catalog-hidden', compare);
}

function initChartDefaults() {
  if (!window.Chart) return;
  const centerTextPlugin = {
    id: 'catalogCenterText',
    afterDraw(chart, args, opts) {
      if (chart.config.type !== 'doughnut' || !opts?.text) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const { ctx } = chart;
      const x = meta.data[0].x;
      const y = meta.data[0].y;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#223048';
      ctx.font = '700 24px Inter, sans-serif';
      ctx.fillText(opts.text, x, y - 2);
      ctx.fillStyle = '#7a889e';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(opts.subtext || '', x, y + 17);
      ctx.restore();
    }
  };
  Chart.register(centerTextPlugin);
  Chart.defaults.color = '#56657d';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.borderColor = 'rgba(94,118,158,0.10)';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255,255,255,0.96)';
  Chart.defaults.plugins.tooltip.titleColor = '#223048';
  Chart.defaults.plugins.tooltip.bodyColor = '#45556e';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(94,118,158,0.14)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
}

function renderEmpty() {
  ['catalogDonut','compareDonutA','compareDonutB'].forEach(id => resetChart(id, 'doughnut', {
    labels: ['Carica dati'], datasets: [{ data: [1], backgroundColor: ['rgba(107,138,253,0.18)'], borderColor: ['white'], borderWidth: 4 }]
  }, { ...baseOptions(), cutout: '68%', plugins: { ...baseOptions().plugins, catalogCenterText: { text: '0', subtext: 'oggetti' } } }));
  ['catalogStacked','catalogScatter','compareStackedA','compareStackedB'].forEach(id => resetChart(id, id.includes('Scatter') ? 'bubble' : 'bar', { labels: [], datasets: [] }, baseOptions()));
}

async function loadDemo() {
  try {
    const [morphology, material, category, combo] = await Promise.all([
      fetchJson('data/morpho.geojson'),
      fetchJson('data/m_class.geojson'),
      fetchJson('data/category_obj.geojson'),
      fetchJson('data/material_morph_combo.geojson'),
    ]);
    catalogState.datasets.morphology = normalizeDataset(morphology, 'morphology', 'morpho.geojson');
    catalogState.datasets.material = normalizeDataset(material, 'material', 'm_class.geojson');
    catalogState.datasets.category = normalizeDataset(category, 'category', 'category_obj.geojson');
    catalogState.datasets.combo = normalizeDataset(combo, 'combo', 'material_morph_combo.geojson');
    catalogState.activeType = 'material';
    els.catalogDataset.value = 'material';
    populateCatalogItems();
    renderCatalog();
  } catch (error) {
    alert(`Errore nel caricamento demo: ${error.message}`);
  }
}

async function loadFiles() {
  try {
    const files = {
      material: els.catalogMaterialFile.files?.[0],
      morphology: els.catalogMorphologyFile.files?.[0],
      category: els.catalogCategoryFile.files?.[0],
      combo: els.catalogComboFile.files?.[0],
    };
    if (!files.material && !files.morphology && !files.category && !files.combo) return alert('Seleziona almeno un file.');
    for (const [type, file] of Object.entries(files)) {
      if (file) catalogState.datasets[type] = normalizeDataset(await parseFile(file), type, file.name);
    }
    if (!catalogState.datasets[catalogState.activeType]) catalogState.activeType = Object.keys(files).find(k => files[k]) || 'material';
    els.catalogDataset.value = catalogState.activeType;
    populateCatalogItems();
    renderCatalog();
  } catch (error) {
    alert(`Errore nel caricamento: ${error.message}`);
  }
}

function populateCatalogItems() {
  const ds = getDataset();
  [els.catalogItem, els.catalogItemA, els.catalogItemB].forEach(el => { if (el) el.innerHTML = ''; });
  if (!ds) return;
  const level = els.catalogLevel.value;
  const groups = aggregate(ds.records, level, ds.categories).sort((a, b) => b.total - a.total || naturalSort(a.label, b.label));
  groups.forEach((group, idx) => {
    [els.catalogItem, els.catalogItemA, els.catalogItemB].forEach((el, panelIdx) => {
      if (!el) return;
      const opt = document.createElement('option');
      opt.value = group.key;
      opt.textContent = `${group.label} (${group.total})`;
      el.appendChild(opt);
      if (panelIdx === 2 && idx === Math.min(1, groups.length - 1)) opt.selected = true;
    });
  });
}

function renderCatalog() {
  const ds = getDataset();
  if (!ds) return renderEmpty();
  updateModeVisibility();
  if (catalogState.mode === 'compare') return renderCompare(ds);
  renderSingle(ds);
}

function renderSingle(ds) {
  const level = els.catalogLevel.value;
  const selectedKey = els.catalogItem.value;
  const topCatN = clamp(parseInt(els.catalogTopCategories.value, 10) || 8, 3, 20);
  const topChildN = clamp(parseInt(els.catalogTopChildren.value, 10) || 24, 3, 80);
  const allGroups = aggregate(ds.records, level, ds.categories).sort((a, b) => b.total - a.total);
  const selected = allGroups.find(g => g.key === selectedKey) || allGroups[0];
  if (!selected) return renderEmpty();
  if (els.catalogItem.value !== selected.key) els.catalogItem.value = selected.key;
  const topCats = topCategories([selected], ds.categories, topCatN);
  const donutRows = topCats.map(cat => [cat, selected.counts[cat] || 0]).filter(([, v]) => v > 0);
  const other = ds.categories.filter(cat => !topCats.includes(cat)).reduce((sum, cat) => sum + (selected.counts[cat] || 0), 0);
  if (other > 0) donutRows.push(['__other', other]);
  renderDonut('catalogDonut', ds, selected, donutRows);
  renderInternalCharts('catalogStacked', 'catalogScatter', ds, selected, topCats, topChildN);
  renderKpis(ds, selected);
}

function renderCompare(ds) {
  const level = els.catalogLevel.value;
  const topCatN = clamp(parseInt(els.catalogTopCategories.value, 10) || 8, 3, 14);
  const topChildN = clamp(parseInt(els.catalogTopChildren.value, 10) || 12, 3, 30);
  const groups = aggregate(ds.records, level, ds.categories).sort((a, b) => b.total - a.total);
  const a = groups.find(g => g.key === els.catalogItemA.value) || groups[0];
  const b = groups.find(g => g.key === els.catalogItemB.value) || groups[1] || groups[0];
  if (!a || !b) return renderEmpty();
  renderComparePanel('A', a, ds, topCatN, topChildN);
  renderComparePanel('B', b, ds, topCatN, topChildN);
}

function renderComparePanel(which, selected, ds, topCatN, topChildN) {
  const topCats = topCategories([selected], ds.categories, topCatN);
  const rows = topCats.map(cat => [cat, selected.counts[cat] || 0]).filter(([, v]) => v > 0);
  renderDonut(`compareDonut${which}`, ds, selected, rows);
  renderInternalBarsOnly(`compareStacked${which}`, ds, selected, topCats, topChildN);
  const dom = dominant(selected, ds);
  const diversity = ds.categories.filter(cat => (selected.counts[cat] || 0) > 0).length;
  const absent = ds.categories.length - diversity;
  els[`compareSummary${which}`].innerHTML = `
    <table class="compare-mini-table"><tbody>
      <tr><th>Record</th><td>${escapeHtml(selected.label)}</td></tr>
      <tr><th>Totale</th><td>${selected.total}</td></tr>
      <tr><th>Diversità</th><td>${diversity}</td></tr>
      <tr><th>Assenti</th><td>${absent}</td></tr>
      <tr><th>Dominante</th><td>${escapeHtml(dom.label)} (${(dom.share*100).toFixed(1)}%)</td></tr>
    </tbody></table>`;
}

function renderDonut(canvasId, ds, selected, rows) {
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  const colors = palette(rows.length, META[ds.type].colorStart);
  resetChart(canvasId, 'doughnut', {
    labels: rows.map(([cat]) => cat === '__other' ? 'Other' : ds.labels[cat]),
    datasets: [{ data: rows.map(([, value]) => value), backgroundColor: colors, borderColor: 'rgba(255,255,255,0.95)', borderWidth: 4, spacing: 3, borderRadius: 6, hoverOffset: 12 }]
  }, { ...baseOptions(), cutout: '68%', plugins: { ...baseOptions().plugins, catalogCenterText: { text: String(total), subtext: 'oggetti' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} (${percent(ctx.raw, total).toFixed(1)}%)` } } } });
}

function renderInternalCharts(barId, scatterId, ds, selected, categories, topChildN) {
  const breakdown = resolveBreakdown(els.catalogLevel.value, els.catalogBreakdown.value);
  const children = renderInternalBarsOnly(barId, ds, selected, categories, topChildN, breakdown);
  const bubbleData = children.map(child => {
    const top = dominant(child, ds);
    return { x: child.total, y: top.share * 100, r: Math.max(5, Math.min(18, 4 + Math.sqrt(child.records.length))), _label: child.label, _dominant: top.label };
  });
  resetChart(scatterId, 'bubble', { datasets: [{ label: 'Unità interne', data: bubbleData, backgroundColor: 'rgba(107,138,253,0.32)', borderColor: 'rgba(107,138,253,0.92)', borderWidth: 1.5 }] }, {
    ...baseOptions(), scales: { x: { beginAtZero: true, title: { display: true, text: 'Totale oggetti', color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } }, y: { beginAtZero: true, max: 100, title: { display: true, text: 'Quota classe dominante', color: '#62738c' }, ticks: { callback: v => `${v}%` }, grid: { color: 'rgba(94,118,158,0.08)' } } },
    plugins: { ...baseOptions().plugins, tooltip: { callbacks: { label: ctx => `${ctx.raw._label}: ${ctx.raw.x} ogg.; dominante ${ctx.raw._dominant} (${ctx.raw.y.toFixed(1)}%)` } } }
  });
  renderTable(ds, children);
  updateNarrative(ds, selected, children, breakdown);
}

function renderInternalBarsOnly(barId, ds, selected, categories, topChildN, breakdown = resolveBreakdown(els.catalogLevel.value, els.catalogBreakdown.value)) {
  const children = aggregate(selected.records, breakdown, categories).filter(g => g.total > 0).sort((a, b) => b.total - a.total).slice(0, topChildN);
  const colors = Object.fromEntries(categories.map((cat, i) => [cat, palette(categories.length, META[ds.type].colorStart)[i]]));
  const datasets = categories.map(cat => ({ label: ds.labels[cat], data: children.map(child => percent(child.counts[cat] || 0, child.total)), backgroundColor: colors[cat], borderColor: colors[cat], borderRadius: 8, borderSkipped: false, barThickness: 16 }));
  resetChart(barId, 'bar', { labels: children.map(child => compact(child.label, 22)), datasets }, {
    ...baseOptions(), scales: { x: { stacked: true, ticks: { color: '#62738c', maxRotation: 44 }, grid: { display: false } }, y: { stacked: true, beginAtZero: true, max: 100, ticks: { color: '#62738c', callback: v => `${v}%` }, grid: { color: 'rgba(94,118,158,0.08)' } } },
    plugins: { ...baseOptions().plugins, tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` } } }
  });
  return children;
}

function renderKpis(ds, selected) {
  const total = selected.total;
  const diversity = ds.categories.filter(cat => (selected.counts[cat] || 0) > 0).length;
  const dom = dominant(selected, ds);
  const breakdown = resolveBreakdown(els.catalogLevel.value, els.catalogBreakdown.value);
  const childGroups = aggregate(selected.records, breakdown, ds.categories).filter(g => g.total > 0);
  const coherence = childGroups.length ? childGroups.reduce((sum, child) => sum + dominant(child, ds).share, 0) / childGroups.length : dom.share;
  els.kpiTotal.textContent = total;
  els.kpiDiversity.textContent = diversity;
  els.kpiDominant.textContent = dom.label === '—' ? '—' : `${dom.label} (${(dom.share * 100).toFixed(1)}%)`;
  els.kpiCoherence.textContent = Number.isFinite(coherence) ? `${(coherence * 100).toFixed(1)}%` : '—';
}

function updateNarrative(ds, selected, children, breakdown) {
  const levelText = els.catalogLevel.selectedOptions[0]?.textContent || els.catalogLevel.value;
  const breakdownText = breakdown === 'su' ? 'US' : breakdown === 'evidence' ? 'evidence' : breakdown === 'site' ? 'siti' : breakdown;
  const dom = dominant(selected, ds);
  const variable = children.filter(child => dominant(child, ds).cat !== dom.cat).length;
  const coherentText = children.length <= 1 ? 'Non ci sono abbastanza unità interne per stimare la coerenza.' : variable === 0 ? 'Le unità interne condividono la stessa classe dominante: distribuzione molto coerente.' : `${variable} unità interne hanno una classe dominante diversa: possibile distribuzione localizzata o non uniforme.`;
  els.catalogNarrative.textContent = `${levelText}: ${selected.label}. Dataset: ${ds.label}. Breakdown interno per ${breakdownText}. Classe dominante: ${dom.label}. ${coherentText}`;
}

function renderTable(ds, children) {
  if (!children.length) return els.catalogTableBody.innerHTML = '<tr><td colspan="5">Nessuna unità interna disponibile per il record selezionato.</td></tr>';
  els.catalogTableBody.innerHTML = children.map(child => {
    const dom = dominant(child, ds);
    const diversity = ds.categories.filter(cat => (child.counts[cat] || 0) > 0).length;
    return `<tr><td>${escapeHtml(child.label)}</td><td>${child.total}</td><td>${diversity}</td><td>${escapeHtml(dom.label)}</td><td>${(dom.share * 100).toFixed(1)}%</td></tr>`;
  }).join('');
}

function resolveBreakdown(level, requested) {
  if (requested && requested !== 'auto') return requested;
  if (level === 'su') return 'su';
  if (level === 'evidence') return 'su';
  if (level === 'site') return 'evidence';
  if (level === 'construction_type') return 'site';
  return 'su';
}

function aggregate(records, groupBy, categories) {
  const map = new Map();
  records.forEach(record => {
    const group = groupFor(record, groupBy);
    if (!map.has(group.key)) map.set(group.key, { key: group.key, label: group.label, sortValue: group.sortValue, records: [], counts: Object.fromEntries(categories.map(cat => [cat, 0])), total: 0 });
    const target = map.get(group.key);
    target.records.push(record);
    categories.forEach(cat => { const v = record.counts[cat] || 0; target.counts[cat] += v; target.total += v; });
  });
  return [...map.values()];
}

function groupFor(record, groupBy) {
  if (groupBy === 'su') { const id = record.id_su || record.su_fid || 'ND'; return { key: `su:${id}`, label: usDisplayName(record), sortValue: Number(id) || id }; }
  if (groupBy === 'evidence') return groupObject('evidence', record.evidence_id_old_str || record.id_evd);
  if (groupBy === 'site') return groupObject('site', record.site_code);
  if (groupBy === 'construction_type') return groupObject('construction_type', record.construction_type);
  return groupObject(groupBy, record[groupBy]);
}
function groupObject(kind, value) { const clean = hasValue(value) ? String(value).trim() : `${kind} ND`; const isNd = clean === '-' || clean.replace(/[-\s]/g, '') === '' || clean.toLowerCase().includes('nd'); const label = isNd ? `${kind} ND` : clean; return { key: `${kind}:${label}`, label, sortValue: label }; }
function topCategories(groups, categories, limit) { return categories.map(cat => [cat, groups.reduce((sum, group) => sum + (group.counts[cat] || 0), 0)]).filter(([, total]) => total > 0).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([cat]) => cat); }
function dominant(group, ds) { if (!group || group.total <= 0) return { cat: null, label: '—', value: 0, share: 0 }; const [cat, value] = Object.entries(group.counts).sort((a, b) => b[1] - a[1])[0] || [null, 0]; return { cat, value, label: cat ? ds.labels[cat] : '—', share: value / group.total }; }

function comboJsonObject(props) {
  const raw = props?.combo_counts_json || props?.combo_json || props?.counts_json || props?.combo_counts;
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function normalizeDataset(input, type, sourceName = 'dataset') {
  const features = input?.type === 'FeatureCollection'
    ? input.features
    : Array.isArray(input)
      ? input.map(row => ({ type: 'Feature', properties: row, geometry: row.geometry || null }))
      : input?.features || [];
  if (!features.length) throw new Error('Nessun record leggibile nel file.');
  const keys = new Set();
  features.forEach(feature => Object.keys(feature.properties || {}).forEach(key => keys.add(key)));
  const fields = [...keys];
  const jsonComboKeys = new Set();
  if (type === 'combo') features.forEach(feature => Object.keys(comboJsonObject(feature.properties || {})).forEach(key => jsonComboKeys.add(key)));
  const expected = EXPECTED_COLUMNS[type] || [];
  const existingExpected = expected.filter(k => keys.has(k));
  const nFields = fields.filter(key => key.startsWith('n_')).sort((a, b) => a.localeCompare(b, 'en'));
  const numericFields = fields
    .filter(key => !META_FIELD_NAMES.has(key.toLowerCase()))
    .filter(key => features.some(feature => isNumericLike((feature.properties || {})[key])))
    .sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
  const categories = jsonComboKeys.size ? [...jsonComboKeys].sort((a, b) => a.localeCompare(b, 'en')) : (existingExpected.length ? expected : (nFields.length ? nFields : numericFields));
  if (!categories.length) throw new Error('Nessuna colonna numerica utilizzabile come categoria.');
  const records = features.map((feature, index) => {
    const props = feature.properties || {};
    const comboJson = comboJsonObject(props);
    const counts = Object.fromEntries(categories.map(cat => [cat, toNumber(props[cat] ?? comboJson[cat])]));
    return {
      uid: `${type}-${props.id_su ?? props.su_fid ?? index}`,
      id_su: valueOrBlank(props.id_su || props.su_id || props.id_us || props.us_id || (index + 1)),
      su_fid: valueOrBlank(props.su_fid || props.fid || props.id_su || props.su_id || props.id_us || (index + 1)),
      su_dscu: valueOrBlank(props.su_dscu || props.us_name || props.name_us || props.nome_us),
      id_evd: valueOrBlank(props.id_evd || props.evidence_id || props.id_evidence),
      evidence_id_old_str: valueOrBlank(props.evidence_id_old_str || props.id_old_str || props.evidence_name || props.evidence_code),
      construction_type: valueOrBlank(props.construction_type || props.construction || props.ctype),
      site_code: valueOrBlank(props.site_code || props.site || props.site_id || props.codice_sito),
      municipality: valueOrBlank(props.municipality || props.comune),
      locality: valueOrBlank(props.locality || props.localita || props['località']),
      address: valueOrBlank(props.address || props.indirizzo),
      site_group: valueOrBlank(props.site_group || props.site_label),
      counts,
      raw: props
    };
  });
  return { type, sourceName, label: META[type].label, records, categories, labels: Object.fromEntries(categories.map(cat => [cat, labelFromCategory(cat)])) };
}

function isNumericLike(value) { if (value === null || value === undefined || value === '') return false; const n = Number(String(value).replace(',', '.')); return Number.isFinite(n); }

function resetChart(id, type, data, options) { const canvas = document.getElementById(id); if (!canvas || !window.Chart) return; if (catalogState.charts[id]) catalogState.charts[id].destroy(); catalogState.charts[id] = new Chart(canvas, { type, data, options }); }
function baseOptions() { return { responsive: true, maintainAspectRatio: false, animation: { duration: 600, easing: 'easeOutQuart' }, plugins: { legend: { display: false } } }; }
function palette(n, hueStart = 180) { return Array.from({ length: Math.max(n, 1) }, (_, i) => { const hue = (hueStart + i * 31) % 360; return `hsla(${hue}, 88%, 68%, 0.9)`; }); }
function getDataset() { return catalogState.datasets[catalogState.activeType]; }
function fetchJson(url) { return fetch(url).then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }); }
function parseFile(file) { const ext = file.name.split('.').pop().toLowerCase(); return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => { try { const text = reader.result; if (ext === 'csv') resolve(Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true }).data); else resolve(JSON.parse(text)); } catch (error) { reject(error); } }; reader.readAsText(file); }); }
function labelFromCategory(cat) { return cat.replace(/^n_/, '').replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase()); }
function valueOrBlank(value) { if (value === null || value === undefined) return ''; return String(value).trim(); }
function hasValue(value) { return value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim().toLowerCase() !== 'null'; }
function toNumber(value) { if (value === null || value === undefined || value === '') return 0; const n = Number(String(value).replace(',', '.')); return Number.isFinite(n) ? n : 0; }
function percent(value, total) { return total > 0 ? (value || 0) / total * 100 : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function compact(value, max = 32) { const s = String(value || 'ND'); return s.length > max ? `${s.slice(0, max - 1)}…` : s; }
function naturalSort(a, b) { const na = Number(a), nb = Number(b); if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb; return String(a).localeCompare(String(b), 'it', { numeric: true, sensitivity: 'base' }); }
function usDisplayName(record) { const name = hasValue(record.su_dscu) ? record.su_dscu : `US ${record.id_su || record.su_fid || '?'}`; const site = hasValue(record.site_code) ? ` - ${record.site_code}` : ''; const id = record.id_su || record.su_fid || '?'; return `${name}${site} (id ${id})`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch])); }const META_FIELD_NAMES = new Set(['fid','id','id_su','su_fid','su_dscu','id_evd','evidence_id_old_str','id_old_str','construction_type','site_code','municipality','locality','address','site_group','geometry','geom']);

