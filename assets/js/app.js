const state = {
  datasets: { material: null, morphology: null, category: null, combo: null },
  activeType: 'material',
  chartMode: 'donut',
  excludedCategories: new Set(),
  categorySearch: '',
  pendingPrecomputedFile: null,
  pendingPrecomputedImport: null,
  charts: {},
  map: null,
  mapLayer: null,
  baseControl: null,
  baseLayers: {},
  customLayerIndex: 1,
  renderedMapItems: [],
  hoverTooltip: null,
};

const TYPE_META = {
  material: { label: 'Material class', vocType: 'voc_material_class', objectField: 'material_class', colorStart: 182 },
  morphology: { label: 'Morphological class', vocType: 'voc_morph_obj', objectField: 'morphological_class', colorStart: 278 },
  category: { label: 'Category object', vocType: 'voc_category_obj', objectField: 'category_obj', colorStart: 228 },
  combo: { label: 'Morphology × Material', vocType: null, objectField: null, colorStart: 318 },
};

const EXPECTED_COLUMNS = {
  material: ['n_impasto_coarse_ware','n_impasto_semifine_ware','n_impasto_fine_ware','n_red_and_black','n_wash_slipped_red','n_wash_slipped_black','n_etrusco_padana_type','n_black_gloss_attic_ware','n_glossy_surfaced_ware','n_glossy_surfaced_decoration','n_fired_clay','n_bronze','n_iron','n_lithic','n_glass_paste'],
  morphology: ['n_basin','n_beaker','n_biconical_pot','n_mug','n_jug','n_bowl','n_bowl_baking_pan','n_bowl_lid','n_bowl_patera','n_mortar','n_cup','n_cup_lid','n_cup_stepped_rim','n_jar','n_big_jar','n_shoulder','n_carinated_wall','n_wall','n_decorated_wall','n_handle','n_handle_u_shaped','n_lug_handle','n_vassel','n_amphora','n_rondella','n_strainer','n_bobbin','n_spindle_whorl','n_loom_weight','n_decorated_fired_clay_element','n_fired_clay_element','n_oven','n_hearth','n_wattle_impression','n_fibula_core','n_fibula','n_pin','n_needle','n_ring','n_nail','n_rod','n_bar','n_hook','n_ingot','n_projectile','n_stud','n_iron_object','n_slag','n_slag_bearing_smithy','n_casting_mould','n_blade','n_blade_flake','n_arrowhead','n_grinding_stone','n_stone_object','n_rose_quartz','n_glass_bead','n_spheric_object'],
  category: ['n_open_shape','n_closed_shape','n_handle','n_rondella','n_bobbin','n_spindle_whorl','n_loom_weight','n_fired_clay_element','n_bronze_object','n_bronze_ornament','n_iron_object','n_iron_ornament','n_clay_casting_mould','n_melting_slag','n_stone_casting_mould','n_flint','n_stone_object','n_strainer','n_grinding_stone','n_glass_bead'],
  combo: [],
};

const ND = {
  evidence: 'evidence ND',
  site: 'site ND',
  construction_type: 'construction_type ND',
  municipality: 'municipality ND',
  locality: 'locality ND',
  site_group: 'site group ND',
  su: 'US ND',
};


const FIELD_MAPPING_DEFS = [
  { target: 'id_su', label: 'Identificativo univoco US', candidates: ['id_su', 'su_id', 'id_us', 'us_id', 'us', 'unit_id'] },
  { target: 'su_dscu', label: 'Nome / descrizione US', candidates: ['su_dscu', 'us_name', 'name_us', 'nome_us', 'description_us', 'us_label'] },
  { target: 'id_evd', label: 'Identificativo evidence', candidates: ['id_evd', 'evidence_id', 'id_evidence', 'evd_id'] },
  { target: 'evidence_id_old_str', label: 'Nome / codice evidence', candidates: ['evidence_id_old_str', 'id_old_str', 'evidence_name', 'evd_name', 'evidence_code'] },
  { target: 'construction_type_id', label: 'ID construction type', candidates: ['construction_type_id', 'id_construction_type'] },
  { target: 'construction_type', label: 'Construction type', candidates: ['construction_type', 'construction', 'type_construction', 'ctype'] },
  { target: 'site_code', label: 'Codice sito', candidates: ['site_code', 'site', 'cod_site', 'site_id', 'codice_sito'] },
  { target: 'municipality', label: 'Municipality', candidates: ['municipality', 'comune', 'municipio'] },
  { target: 'locality', label: 'Locality', candidates: ['locality', 'localita', 'località', 'place'] },
  { target: 'address', label: 'Address', candidates: ['address', 'indirizzo'] },
  { target: 'site_group', label: 'Campo gruppo sito', candidates: ['site_group', 'site_label', 'site_full_name'] },
];

const META_FIELD_NAMES = new Set([
  'fid', 'id', 'id_su', 'su_fid', 'su_dscu', 'id_evd', 'evidence_id_old_str', 'id_old_str',
  'construction_type_id', 'construction_type', 'site_code', 'municipality', 'locality',
  'address', 'site_group', 'geometry', 'geom', 'evidence_geom', 'site_geom'
]);

const els = {};

window.addEventListener('DOMContentLoaded', () => {
  cacheEls();
  initChartsDefaults();
  initMap();
  bindEvents();
  updateDataStatus();
  renderEmptyState();
});

function cacheEls() {
  [
    'dataStatus', 'precomputedType', 'precomputedFile', 'precomputedDropzone', 'precomputedFileName', 'loadPrecomputedBtn', 'loadSampleBtn', 'fieldMappingPanel', 'fieldMappingGrid', 'applyFieldMappingBtn',
    'rawSu', 'rawObjects', 'rawVoc', 'rawEvidence', 'rawSites', 'buildRawBtn', 'downloadDataBtn',
    'datasetSelect', 'groupBySelect', 'topGroups', 'valueMode', 'mapGroupSelect', 'mapMetricSelect', 'mapDisplaySelect', 'mapPickDepth', 'mapInfoPanel',
    'categorySearch', 'selectAllCategories', 'excludeZeroCategories', 'categoryLegend',
    'chartTitle', 'chartDescription', 'chartHowTo', 'chartModeSwitcher',
    'customTileUrl', 'addCustomTileBtn', 'mapLog', 'mapLogCounter', 'mapLogBody', 'mapLegend'
  ].forEach(id => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.loadPrecomputedBtn.addEventListener('click', loadPrecomputedFromInput);
  els.loadSampleBtn.addEventListener('click', loadSampleData);
  els.buildRawBtn.addEventListener('click', buildFromRawInputs);
  els.downloadDataBtn.addEventListener('click', downloadActiveDataset);
  els.applyFieldMappingBtn.addEventListener('click', applyPendingFieldMapping);

  bindDropzone();

  ['datasetSelect', 'groupBySelect', 'topGroups', 'valueMode', 'mapGroupSelect', 'mapMetricSelect', 'mapDisplaySelect', 'mapPickDepth'].forEach(id => {
    els[id].addEventListener('change', () => {
      if (id === 'datasetSelect') {
        state.activeType = els.datasetSelect.value;
        state.excludedCategories.clear();
        populateCategoryControls();
        populateMapMetricOptions();
      }
      updateAllViews();
    });
  });

  els.categorySearch.addEventListener('input', () => {
    state.categorySearch = els.categorySearch.value.trim().toLowerCase();
    populateCategoryControls();
  });

  els.selectAllCategories.addEventListener('click', () => {
    state.excludedCategories.clear();
    populateCategoryControls();
    updateAllViews();
  });

  els.excludeZeroCategories.addEventListener('click', () => {
    const ds = getActiveDataset();
    if (!ds) return;
    const totals = categoryTotals(ds.records, ds.categories);
    ds.categories.forEach(cat => {
      if ((totals[cat] || 0) === 0) state.excludedCategories.add(cat);
    });
    populateCategoryControls();
    updateAllViews();
  });

  els.mapLog.querySelector('.map-log-head').addEventListener('click', () => {
    els.mapLog.classList.toggle('collapsed');
  });

  els.addCustomTileBtn.addEventListener('click', addCustomTileLayer);

  els.chartModeSwitcher.querySelectorAll('[data-chart-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.chartMode = btn.dataset.chartMode;
      els.chartModeSwitcher.querySelectorAll('[data-chart-mode]').forEach(b => b.classList.toggle('active', b === btn));
      updateAllViews();
    });
  });
}

function bindDropzone() {
  els.precomputedDropzone.addEventListener('click', () => els.precomputedFile.click());
  els.precomputedFile.addEventListener('change', () => {
    const file = els.precomputedFile.files?.[0] || null;
    state.pendingPrecomputedFile = file;
    els.precomputedFileName.textContent = file ? file.name : 'Nessun file selezionato';
  });
  ['dragenter', 'dragover'].forEach(eventName => {
    els.precomputedDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.precomputedDropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach(eventName => {
    els.precomputedDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (eventName !== 'drop') els.precomputedDropzone.classList.remove('dragover');
    });
  });
  els.precomputedDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0] || null;
    els.precomputedDropzone.classList.remove('dragover');
    if (!file) return;
    state.pendingPrecomputedFile = file;
    els.precomputedFileName.textContent = file.name;
  });
}

function initChartsDefaults() {
  if (!window.Chart) return;
  const centerTextPlugin = {
    id: 'centerTextPlugin',
    afterDraw(chart, args, pluginOptions) {
      if (chart.config.type !== 'doughnut' || !pluginOptions?.text) return;
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const x = meta.data[0].x;
      const y = meta.data[0].y;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#223048';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(pluginOptions.text, x, y - 4);
      if (pluginOptions.subtext) {
        ctx.fillStyle = '#7a889e';
        ctx.font = '500 12px Inter, sans-serif';
        ctx.fillText(pluginOptions.subtext, x, y + 18);
      }
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
  Chart.defaults.plugins.tooltip.padding = 12;
}

function renderEmptyState() {
  resetChart('mainChart', 'doughnut', {
    labels: ['Carica dati'],
    datasets: [{ data: [1], backgroundColor: ['rgba(107,138,253,0.18)'], borderColor: ['rgba(107,138,253,0.14)'], hoverOffset: 0 }]
  }, {
    ...baseChartOptions(),
    cutout: '68%',
    plugins: { ...baseChartOptions().plugins, centerTextPlugin: { text: '0', subtext: 'Nessun dato' } }
  });
}

async function loadPrecomputedFromInput() {
  const file = state.pendingPrecomputedFile || els.precomputedFile.files?.[0];
  if (!file) return notify('Seleziona o trascina prima un file.', 'error');
  try {
    const type = els.precomputedType.value;
    const parsed = await parseFile(file);
    const prepared = preparePrecomputedImport(parsed, type, file.name);
    const needsMapping = prepared.missingDefaults.includes('id_su') || prepared.missingDefaults.includes('evidence_id_old_str') || prepared.missingDefaults.includes('site_code') || prepared.missingDefaults.includes('su_dscu');
    if (needsMapping) {
      state.pendingPrecomputedImport = prepared;
      renderFieldMappingPanel(prepared);
      notify('File letto. Completa la mappatura dei campi e poi applicala.', 'info');
      return;
    }
    finalizePrecomputedImport(prepared, prepared.mapping);
  } catch (error) {
    console.error(error);
    notify(`Errore nel caricamento: ${error.message}`, 'error');
  }
}

function finalizePrecomputedImport(prepared, mapping) {
  const dataset = normalizePrecomputed(prepared.input, prepared.type, prepared.sourceName, mapping);
  state.datasets[prepared.type] = dataset;
  state.activeType = prepared.type;
  els.datasetSelect.value = prepared.type;
  state.pendingPrecomputedImport = null;
  els.fieldMappingPanel.classList.add('hidden');
  afterDatasetLoaded();
}

function applyPendingFieldMapping() {
  const prepared = state.pendingPrecomputedImport;
  if (!prepared) return;
  const mapping = {};
  els.fieldMappingGrid.querySelectorAll('select[data-target-field]').forEach(select => {
    mapping[select.dataset.targetField] = select.value || '';
  });
  finalizePrecomputedImport(prepared, mapping);
}

function renderFieldMappingPanel(prepared) {
  els.fieldMappingGrid.innerHTML = '';
  const fields = ['', ...prepared.fields];
  FIELD_MAPPING_DEFS.forEach(def => {
    const label = document.createElement('label');
    label.innerHTML = `${def.label}<select data-target-field="${def.target}"></select>`;
    const select = label.querySelector('select');
    fields.forEach(field => {
      const opt = document.createElement('option');
      opt.value = field;
      opt.textContent = field || 'Non presente / ND';
      select.appendChild(opt);
    });
    select.value = prepared.mapping[def.target] || '';
    els.fieldMappingGrid.appendChild(label);
  });
  els.fieldMappingPanel.classList.remove('hidden');
}

async function loadSampleData() {
  try {
    const [morpho, material, category, combo] = await Promise.all([
      fetchJson('data/morpho.geojson'),
      fetchJson('data/m_class.geojson'),
      fetchJson('data/category_obj.geojson'),
      fetchJson('data/material_morph_combo.geojson'),
    ]);
    state.datasets.morphology = normalizePrecomputed(morpho, 'morphology', 'morpho.geojson');
    state.datasets.material = normalizePrecomputed(material, 'material', 'm_class.geojson');
    state.datasets.category = normalizePrecomputed(category, 'category', 'category_obj.geojson');
    state.datasets.combo = normalizePrecomputed(combo, 'combo', 'material_morph_combo.geojson');
    state.activeType = 'material';
    els.datasetSelect.value = 'material';
    afterDatasetLoaded();
  } catch (error) {
    console.error(error);
    notify('Impossibile caricare i dati demo. Se apri il file direttamente dal filesystem, avvia un piccolo server locale oppure carica manualmente i file.', 'error');
  }
}

async function buildFromRawInputs() {
  try {
    const required = [
      ['su', els.rawSu.files?.[0]],
      ['object_minv', els.rawObjects.files?.[0]],
      ['voc', els.rawVoc.files?.[0]],
      ['evidence', els.rawEvidence.files?.[0]],
      ['sites', els.rawSites.files?.[0]],
    ];
    const missing = required.filter(([, file]) => !file).map(([name]) => name);
    if (missing.length) return notify(`Mancano tabelle raw: ${missing.join(', ')}.`, 'error');

    const [suRaw, objectRaw, vocRaw, evidenceRaw, sitesRaw] = await Promise.all(required.map(([, file]) => parseFile(file)));
    const raw = {
      su: toRows(suRaw),
      objects: toRows(objectRaw),
      voc: toRows(vocRaw),
      evidence: toFeatureRows(evidenceRaw),
      sites: toFeatureRows(sitesRaw),
    };

    state.datasets.material = reconstructDatasetFromRaw(raw, 'material');
    state.datasets.morphology = reconstructDatasetFromRaw(raw, 'morphology');
    state.datasets.category = reconstructDatasetFromRaw(raw, 'category');
    state.datasets.combo = reconstructDatasetFromRaw(raw, 'combo');
    state.activeType = 'material';
    els.datasetSelect.value = 'material';
    afterDatasetLoaded();
  } catch (error) {
    console.error(error);
    notify(`Errore nella ricostruzione raw: ${error.message}`, 'error');
  }
}

function afterDatasetLoaded() {
  ensureActiveDatasetAvailable();
  updateDatasetSelectAvailability();
  state.excludedCategories.clear();
  populateCategoryControls();
  populateMapMetricOptions();
  updateDataStatus();
  updateAllViews();
}

function updateAllViews() {
  const ds = getActiveDataset();
  if (!ds) return renderEmptyState();
  populateMapMetricOptions(false);
  populateCategoryControls();
  updateMainChart(ds);
  updateMap(ds);
  updateDataStatus();
}

function getActiveDataset() { return state.datasets[state.activeType]; }

function ensureActiveDatasetAvailable() {
  if (!state.datasets[state.activeType]) {
    const first = Object.keys(state.datasets).find(key => state.datasets[key]);
    if (first) state.activeType = first;
  }
  els.datasetSelect.value = state.activeType;
}

function updateDatasetSelectAvailability() {
  [...els.datasetSelect.options].forEach(opt => { opt.disabled = !state.datasets[opt.value]; });
}

function updateDataStatus() {
  const chunks = Object.entries(state.datasets)
    .filter(([, ds]) => ds)
    .map(([type, ds]) => `${TYPE_META[type].label}: ${ds.records.length} record · ${ds.categories.length} valori`);
  els.dataStatus.textContent = chunks.length ? chunks.join('  •  ') : 'Nessun dataset caricato';
  els.dataStatus.style.background = 'rgba(56, 216, 199, 0.08)';
  els.dataStatus.style.borderColor = 'rgba(56, 216, 199, 0.22)';
  els.dataStatus.style.color = '#186e78';
}

function notify(message, level = 'info') {
  els.dataStatus.textContent = message;
  if (level === 'error') {
    els.dataStatus.style.background = 'rgba(224, 91, 116, 0.10)';
    els.dataStatus.style.borderColor = 'rgba(224, 91, 116, 0.18)';
    els.dataStatus.style.color = '#8f203f';
  }
}

function populateCategoryControls() {
  const ds = getActiveDataset();
  els.categoryLegend.innerHTML = '';
  if (!ds) return;
  const categories = ds.categories.filter(cat => {
    if (!state.categorySearch) return true;
    return `${ds.labels[cat]} ${cat}`.toLowerCase().includes(state.categorySearch);
  });
  const totals = categoryTotals(ds.records, ds.categories);
  const colors = categoryColors(ds, ds.categories);

  categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = `legend-item ${state.excludedCategories.has(cat) ? 'excluded' : ''}`;
    item.innerHTML = `
      <span class="legend-swatch" style="background:${colors[cat]}"></span>
      <div class="legend-label">
        <strong>${escapeHtml(ds.labels[cat])}</strong>
        <span>${totals[cat] || 0} oggetti · ${cat}</span>
      </div>
      <button class="legend-toggle" type="button">${state.excludedCategories.has(cat) ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>'}</button>
    `;
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.excludedCategories.has(cat)) state.excludedCategories.delete(cat);
      else state.excludedCategories.add(cat);
      updateAllViews();
    });
    els.categoryLegend.appendChild(item);
  });
}

function updateMainChart(ds) {
  const categories = activeCategories(ds);
  const groupBy = els.groupBySelect.value;
  const topN = clamp(parseInt(els.topGroups.value, 10) || 18, 5, 100);
  const valueMode = els.valueMode.value;
  const groups = aggregateRecords(ds.records, groupBy, categories);
  const topGroups = groups.slice().sort((a, b) => b.total - a.total).slice(0, topN);

  if (!categories.length) {
    renderEmptyState();
    els.chartTitle.textContent = 'Nessun valore attivo';
    els.chartDescription.textContent = 'Tutti i parametri risultano esclusi. Riattiva almeno un valore dalla legenda.';
    return;
  }

  if (state.chartMode === 'donut') renderDonut(ds, categories);
  if (state.chartMode === 'bar') renderBar(ds, topGroups, categories, valueMode);
  if (state.chartMode === 'scatter') renderScatter(ds, groups, categories, groupBy);
  if (state.chartMode === 'trend') renderTrend(ds, groups, categories, groupBy);
  updateChartText(ds, groups, topGroups, categories, groupBy, valueMode);
}

function updateChartText(ds, groups, topGroups, categories, groupBy, valueMode) {
  const groupLabel = els.groupBySelect.selectedOptions[0]?.textContent || groupBy;
  const total = groups.reduce((sum, g) => sum + g.total, 0);
  const descriptions = {
    donut: {
      title: 'Distribuzione complessiva',
      desc: `Mostra il peso relativo delle categorie selezionate sull’intero dataset ${ds.label.toLowerCase()}. Totale oggetti conteggiati: ${total}.`,
      how: 'Il grafico donut evidenzia la composizione complessiva. Le sezioni più grandi rappresentano classi più frequenti. Usa la legenda laterale per escludere valori e rifinire il confronto.'
    },
    bar: {
      title: 'Confronto tra gruppi',
      desc: `Confronto dei primi ${topGroups.length} gruppi per ${groupLabel}. Le barre sono ${valueMode === 'share' ? 'espresse in percentuale per gruppo' : 'conteggi assoluti'} e mostrano le categorie più informative.`,
      how: 'Ogni barra è un gruppo (US, evidence, sito ecc.). Le porzioni colorate indicano le categorie selezionate. Se scegli “percentuali”, ogni barra viene letta come composizione interna del gruppo.'
    },
    scatter: {
      title: 'Dispersione e diversità',
      desc: state.datasets[ds.type === 'material' ? 'morphology' : 'material']
        ? `Ogni punto rappresenta un gruppo per ${groupLabel}: asse X = ${ds.label.toLowerCase()}, asse Y = ${ds.type === 'material' ? 'morfologie' : 'materiali'}.`
        : `Ogni punto rappresenta un gruppo per ${groupLabel}: asse X = totale oggetti, asse Y = numero di categorie attive presenti nel gruppo.`,
      how: 'Punti più in alto o più a destra indicano gruppi più ricchi o più diversificati. La dimensione della bolla aumenta con il numero di record che compongono il gruppo.'
    },
    trend: {
      title: 'Andamento ordinato',
      desc: `Sequenza dei gruppi ordinati per ${groupLabel}. La linea principale mostra il totale, mentre la seconda linea segue la categoria più rilevante nel dataset attivo.`,
      how: 'È utile per leggere concentrazioni, picchi e cambiamenti progressivi lungo l’ordinamento naturale del gruppo. Se il raggruppamento è numerico, l’ordine segue il valore; altrimenti segue un ordine alfabetico/naturale.'
    }
  };

  const content = descriptions[state.chartMode];
  els.chartTitle.textContent = content.title;
  els.chartDescription.textContent = content.desc;
  els.chartHowTo.textContent = content.how;
}

function renderDonut(ds, categories) {
  const totals = Object.entries(categoryTotals(ds.records, categories)).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const folded = foldRows(totals, 14);
  const colorsMap = categoryColors(ds, categories);
  const labels = folded.map(([cat]) => cat === '__other' ? 'Other' : ds.labels[cat]);
  const data = folded.map(([, value]) => value);
  const colors = folded.map(([cat]) => cat === '__other' ? 'rgba(180,190,210,0.75)' : colorsMap[cat]);
  const total = data.reduce((a, b) => a + b, 0);

  resetChart('mainChart', 'doughnut', {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: 'rgba(255,255,255,0.9)',
      borderWidth: 4,
      hoverOffset: 14,
      spacing: 3,
      borderRadius: 6,
    }]
  }, {
    ...baseChartOptions(),
    cutout: '68%',
    plugins: {
      ...baseChartOptions().plugins,
      centerTextPlugin: { text: String(total), subtext: 'oggetti totali' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} (${percentage(ctx.raw, total).toFixed(1)}%)`
        }
      }
    }
  });
}

function renderBar(ds, groups, categories, valueMode) {
  const topCats = topCategoriesByTotal(groups, categories, 10);
  const colors = categoryColors(ds, topCats);
  const labels = groups.map(g => compactLabel(g.label, 26));
  const datasets = topCats.map(cat => ({
    label: ds.labels[cat],
    data: groups.map(g => valueMode === 'share' ? percentage(g.counts[cat], g.total) : (g.counts[cat] || 0)),
    backgroundColor: colors[cat],
    borderColor: colors[cat],
    borderRadius: 9,
    borderSkipped: false,
    borderWidth: 1,
    barThickness: 22,
  }));

  resetChart('mainChart', 'bar', { labels, datasets }, {
    ...baseChartOptions(),
    scales: {
      x: { stacked: true, ticks: { color: '#62738c', maxRotation: 42, minRotation: 0 }, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, ticks: { color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } },
    },
    plugins: {
      ...baseChartOptions().plugins,
      tooltip: { mode: 'index', intersect: false }
    }
  });
}

function renderScatter(ds, groups, categories, groupBy) {
  const otherType = ds.type === 'material' ? 'morphology' : ds.type === 'morphology' ? 'material' : null;
  const other = otherType ? state.datasets[otherType] : null;
  let data = [];
  let xTitle = ds.label;
  let yTitle = 'Diversità valori';
  if (other) {
    const otherGroups = new Map(aggregateRecords(other.records, groupBy, activeCategories(other)).map(g => [g.key, g]));
    yTitle = other.label;
    data = groups.map(g => ({ x: g.total, y: otherGroups.get(g.key)?.total || 0, r: Math.max(5, Math.min(18, 4 + Math.sqrt(g.records.length))), _label: g.label }));
  } else {
    data = groups.map(g => ({ x: g.total, y: categories.filter(cat => (g.counts[cat] || 0) > 0).length, r: Math.max(5, Math.min(18, 4 + Math.sqrt(g.records.length))), _label: g.label }));
  }
  const gradient = bubbleGradient();

  resetChart('mainChart', 'bubble', {
    datasets: [{
      label: 'Gruppi',
      data,
      backgroundColor: gradient.fill,
      borderColor: gradient.stroke,
      borderWidth: 1.5,
      hoverBorderWidth: 2,
    }]
  }, {
    ...baseChartOptions(),
    scales: {
      x: { beginAtZero: true, title: { display: true, text: xTitle, color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } },
      y: { beginAtZero: true, title: { display: true, text: yTitle, color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } },
    },
    plugins: {
      ...baseChartOptions().plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw._label}: x=${ctx.raw.x}, y=${ctx.raw.y}`
        }
      }
    }
  });
}

function renderTrend(ds, groups, categories) {
  const ordered = groups.slice().sort((a, b) => naturalSort(a.sortValue, b.sortValue));
  const topCategory = topCategoriesByTotal(ordered, categories, 1)[0];
  const labels = ordered.map(g => compactLabel(g.label, 28));
  const totalGradient = lineGradient('mainChart', 'rgba(56,216,199,0.25)', 'rgba(56,216,199,0.00)');

  const datasets = [{
    label: 'Totale oggetti',
    data: ordered.map(g => g.total),
    borderColor: '#2fc5b6',
    backgroundColor: totalGradient,
    fill: true,
    tension: 0.35,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: '#2fc5b6'
  }];
  if (topCategory) {
    datasets.push({
      label: ds.labels[topCategory],
      data: ordered.map(g => g.counts[topCategory] || 0),
      borderColor: '#9778ff',
      backgroundColor: 'rgba(151,120,255,0.0)',
      fill: false,
      tension: 0.32,
      pointRadius: 2.4,
      pointHoverRadius: 4,
      pointBackgroundColor: '#9778ff'
    });
  }

  resetChart('mainChart', 'line', { labels, datasets }, {
    ...baseChartOptions(),
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { color: '#62738c', autoSkip: true, maxTicksLimit: 18 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } },
    }
  });
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: { legend: { display: false } },
  };
}

function resetChart(canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(canvas, { type, data, options });
}

function activeCategories(ds = getActiveDataset()) {
  if (!ds) return [];
  return ds.categories.filter(cat => !state.excludedCategories.has(cat));
}

function aggregateRecords(records, groupBy, categories) {
  const map = new Map();
  records.forEach(record => {
    const group = getGroup(record, groupBy);
    if (!map.has(group.key)) {
      map.set(group.key, {
        key: group.key,
        label: group.label,
        sortValue: group.sortValue,
        records: [],
        counts: Object.fromEntries(categories.map(c => [c, 0])),
        total: 0,
        geometries: [],
        evidenceGeometries: [],
        siteGeometries: [],
        hasEvidence: false,
        hasSite: false,
      });
    }
    const target = map.get(group.key);
    target.records.push(record);
    if (record.geometry) target.geometries.push(record.geometry);
    if (record.evidenceGeometry) target.evidenceGeometries.push(record.evidenceGeometry);
    if (record.siteGeometry) target.siteGeometries.push(record.siteGeometry);
    target.hasEvidence ||= hasValue(record.evidence_id_old_str) || hasValue(record.id_evd);
    target.hasSite ||= hasValue(record.site_code) || hasInformativeSiteGroup(record.site_group);
    categories.forEach(cat => {
      const value = record.counts[cat] || 0;
      target.counts[cat] += value;
      target.total += value;
    });
  });
  return [...map.values()];
}

function getGroup(record, groupBy) {
  if (groupBy === 'su') {
    const id = hasValue(record.id_su) ? record.id_su : record.su_fid;
    const label = hasValue(id) ? usDisplayName(record) : ND.su;
    return { key: hasValue(id) ? `su:${id}` : 'su:ND', label, sortValue: toNumber(id) || label };
  }
  if (groupBy === 'evidence') return groupObject('evidence', record.evidence_id_old_str || record.id_evd, record.evidence_id_old_str || record.id_evd);
  if (groupBy === 'site') return groupObject('site', record.site_code, record.site_code);
  if (groupBy === 'construction_type') return groupObject('construction_type', record.construction_type, record.construction_type);
  if (groupBy === 'municipality') return groupObject('municipality', record.municipality, record.municipality);
  if (groupBy === 'locality') return groupObject('locality', record.locality, record.locality);
  if (groupBy === 'site_group') return groupObject('site_group', hasInformativeSiteGroup(record.site_group) ? record.site_group : '', record.site_group);
  return groupObject(groupBy, record[groupBy], record[groupBy]);
}

function groupObject(kind, value, sortValue) {
  const clean = hasValue(value) ? String(value).trim() : ND[kind] || `${kind} ND`;
  const isNd = clean === '-' || clean.replace(/[-\s]/g, '') === '' || clean.toLowerCase().includes('nd');
  const label = isNd ? (ND[kind] || `${kind} ND`) : clean;
  return { key: `${kind}:${label}`, label, sortValue: sortValue || label };
}

function categoryTotals(records, categories) {
  const totals = Object.fromEntries(categories.map(c => [c, 0]));
  records.forEach(record => categories.forEach(cat => { totals[cat] += record.counts?.[cat] || 0; }));
  return totals;
}

function topCategoriesByTotal(groups, categories, limit = 8) {
  return categories.map(cat => [cat, groups.reduce((sum, g) => sum + (g.counts[cat] || 0), 0)])
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat]) => cat);
}

function foldRows(rows, limit = 12) {
  if (rows.length <= limit) return rows;
  const kept = rows.slice(0, limit - 1);
  const other = rows.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
  if (other > 0) kept.push(['__other', other]);
  return kept;
}

function categoryColors(ds, categories) {
  const paletteColors = palette(categories.length, TYPE_META[ds.type].colorStart);
  return Object.fromEntries(categories.map((cat, i) => [cat, paletteColors[i]]));
}

function palette(n, hueStart = 180) {
  return Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const hue = (hueStart + i * 31) % 360;
    return `hsla(${hue}, 88%, 68%, 0.9)`;
  });
}

function bubbleGradient() {
  return { fill: 'rgba(107,138,253,0.35)', stroke: 'rgba(107,138,253,0.9)' };
}

function lineGradient(canvasId, from, to) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas?.getContext('2d');
  if (!ctx) return from;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 500);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  return gradient;
}

function initMap() {
  if (!window.L) return;
  state.map = L.map('map', { preferCanvas: true, zoomControl: true }).setView([41.95, 12.7], 7);
  state.baseLayers = {
    'CartoDB Positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }),
    'OSM Standard': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors' }),
    'CartoDB Dark Matter': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }),
    'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, attribution: 'Tiles &copy; Esri and partners' }),
  };
  state.baseLayers['CartoDB Positron'].addTo(state.map);
  state.baseControl = L.control.layers(state.baseLayers, {}, { collapsed: true }).addTo(state.map);
  state.mapLayer = L.layerGroup().addTo(state.map);
  state.map.on('click', handleMapClick);
  state.map.on('mousemove', handleMapMouseMove);
}

function addCustomTileLayer() {
  const url = els.customTileUrl.value.trim();
  if (!url) return;
  const name = `Custom XYZ ${state.customLayerIndex++}`;
  const layer = L.tileLayer(url, { maxZoom: 22, attribution: 'Custom XYZ' });
  state.baseLayers[name] = layer;
  state.baseControl.addBaseLayer(layer, name);
  layer.addTo(state.map);
}


function populateMapMetricOptions(reset = true) {
  const ds = getActiveDataset();
  if (!ds) return;
  const previous = selectedMapMetrics();
  els.mapMetricSelect.innerHTML = '<option value="total">Totale oggetti</option><option value="dominant_share">Quota categoria dominante</option>';
  activeCategories(ds).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = ds.labels[cat];
    els.mapMetricSelect.appendChild(opt);
  });
  if (!reset && previous.length) {
    [...els.mapMetricSelect.options].forEach(opt => { opt.selected = previous.includes(opt.value); });
  }
  if (![...els.mapMetricSelect.selectedOptions].length) {
    const total = [...els.mapMetricSelect.options].find(opt => opt.value === 'total');
    if (total) total.selected = true;
  }
}

function selectedMapMetrics() {
  if (!els.mapMetricSelect) return ['total'];
  const vals = [...els.mapMetricSelect.selectedOptions].map(opt => opt.value);
  return vals.length ? vals : ['total'];
}

function updateMap(ds) {
  if (!state.map || !state.mapLayer) return;
  const categories = activeCategories(ds);
  const mapGroup = els.mapGroupSelect.value;
  const metrics = selectedMapMetrics();
  const displayMode = els.mapDisplaySelect.value;
  const groups = aggregateRecords(ds.records, mapGroup, categories);
  const { polygonFeatures, bubblePoints, siteFeatures, excluded } = buildMapRenderable(groups, mapGroup, metrics, ds, displayMode);

  state.mapLayer.clearLayers();
  state.renderedMapItems = [];
  const boundsList = [];

  const allValues = [...polygonFeatures.map(f => f.properties.__value), ...bubblePoints.map(p => p.value), ...siteFeatures.map(f => f.properties.__value)].filter(Number.isFinite);
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;

  if (siteFeatures.length) {
    const siteLayer = L.geoJSON({ type: 'FeatureCollection', features: siteFeatures }, {
      style: feature => ({
        color: colorForValue(feature.properties.__value, min, max, true),
        weight: 2.1,
        dashArray: '7 6',
        fillOpacity: 0,
        opacity: 0.88,
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.__label, { sticky: true, direction: 'top' });
        layer.on('click', () => renderMapSidebar(feature.properties, ds));
      }
    });
    siteLayer.eachLayer(layer => boundsList.push(layer.getBounds?.()));
    state.mapLayer.addLayer(siteLayer);
  }

  if (polygonFeatures.length) {
    const ordered = polygonFeatures.slice().sort((a, b) => polygonAreaApprox(b.geometry) - polygonAreaApprox(a.geometry));
    const polygonLayer = L.geoJSON({ type: 'FeatureCollection', features: ordered }, {
      style: feature => ({
        color: colorForValue(feature.properties.__value, min, max, true),
        weight: 1.6,
        fillColor: colorForValue(feature.properties.__value, min, max, false),
        fillOpacity: 0.42,
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.__label, { sticky: true, direction: 'top' });
        layer.on('mouseover', () => layer.setStyle({ weight: 2.6, fillOpacity: 0.62 }));
        layer.on('mouseout', () => polygonLayer.resetStyle(layer));
        layer.on('click', () => renderMapSidebar(feature.properties, ds));
      }
    });
    polygonLayer.eachLayer(layer => boundsList.push(layer.getBounds?.()));
    state.mapLayer.addLayer(polygonLayer);
    ordered.forEach(feature => state.renderedMapItems.push({ type: 'polygon', feature, area: polygonAreaApprox(feature.geometry) }));
  }

  if (bubblePoints.length) {
    const bubbleLayer = L.layerGroup();
    bubblePoints.forEach(point => {
      const marker = L.circleMarker(point.latlng, {
        radius: bubbleRadius(point.value, min, max),
        color: colorForValue(point.value, min, max, true),
        fillColor: colorForValue(point.value, min, max, false),
        fillOpacity: 0.58,
        weight: 1.8,
      });
      marker.bindTooltip(point.properties.__label, { sticky: true, direction: 'top' });
      marker.on('click', () => renderMapSidebar(point.properties, ds));
      bubbleLayer.addLayer(marker);
      boundsList.push(L.latLngBounds([point.latlng, point.latlng]));
      state.renderedMapItems.push({ type: 'bubble', point, latlng: point.latlng, feature: { properties: point.properties } });
    });
    state.mapLayer.addLayer(bubbleLayer);
  }

  if (!polygonFeatures.length && !bubblePoints.length && !siteFeatures.length) {
    els.mapLegend.innerHTML = '<span>Nessuna geometria visualizzabile con i filtri correnti.</span>';
    updateMapLog(excluded);
    return;
  }

  updateMapLegend(min, max, metrics, ds, displayMode, mapGroup);
  updateMapLog(excluded);
  fitBoundsFromList(boundsList);
}

function buildMapRenderable(groups, mapGroup, metrics, ds, displayMode) {
  const polygonFeatures = [];
  const bubblePoints = [];
  const excluded = [];
  const useBubbles = displayMode === 'bubbles' || (displayMode === 'auto' && mapGroup !== 'su');
  const usePolygons = displayMode === 'polygons' || (displayMode === 'auto' && mapGroup === 'su');

  groups.forEach(group => {
    const geometries = geometryListForGroup(group, mapGroup);
    const reasons = [];
    if (!geometries.length) reasons.push('geometria assente');
    if (mapGroup === 'site' && !group.hasSite) reasons.push('site assente/ND');
    if (mapGroup === 'evidence' && !group.hasEvidence) reasons.push('evidence assente/ND');

    const value = mapMetricValue(group, metrics, ds);
    if (metrics.includes('total') && group.total <= 0) reasons.push('conteggio totale pari a 0');

    if (reasons.length) {
      excluded.push({ label: group.label, records: group.records, reasons });
      return;
    }

    const properties = mapProperties(group, value, metrics, ds);

    if (usePolygons) geometries.forEach(geometry => polygonFeatures.push({ type: 'Feature', geometry, properties }));
    if (useBubbles) {
      const latlng = centerFromGeometries(geometries);
      if (!latlng) excluded.push({ label: group.label, records: group.records, reasons: ['centroide non calcolabile'] });
      else bubblePoints.push({ latlng, value, properties });
    }
  });

  return { polygonFeatures, bubblePoints, siteFeatures: buildSiteOutlineFeatures(groups, metrics, ds), excluded };
}

function mapProperties(group, value, metrics, ds) {
  return {
    __label: group.label,
    __total: group.total,
    __value: value,
    __metrics: metrics,
    __metric: metrics.join(','),
    __records: group.records.length,
    __top: topCounts(group.counts, ds, 8),
    __absent: absentCounts(group.counts, ds),
    __recordsDetail: group.records,
    __site: dominantField(group.records, 'site_code', 'site ND'),
    __evidence: dominantField(group.records, 'evidence_id_old_str', 'evidence ND'),
    __construction: dominantField(group.records, 'construction_type', 'construction_type ND'),
  };
}

function buildSiteOutlineFeatures(groups, metrics, ds) {
  const bySite = new Map();
  groups.forEach(group => {
    group.records.forEach(record => {
      if (!record.siteGeometry || !hasValue(record.site_code)) return;
      const key = record.site_code;
      if (!bySite.has(key)) {
        bySite.set(key, {
          label: record.site_code,
          records: [],
          counts: Object.fromEntries(ds.categories.map(c => [c, 0])),
          geometries: [],
          total: 0,
        });
      }
      const target = bySite.get(key);
      target.records.push(record);
      target.geometries.push(record.siteGeometry);
      ds.categories.forEach(cat => {
        const v = record.counts[cat] || 0;
        target.counts[cat] += v;
        target.total += v;
      });
    });
  });
  const features = [];
  bySite.forEach(site => {
    const value = mapMetricValue(site, metrics, ds);
    dedupeGeometries(site.geometries).forEach(geometry => {
      features.push({ type: 'Feature', geometry, properties: mapProperties(site, value, metrics, ds) });
    });
  });
  return features;
}

function geometryListForGroup(group, mapGroup) {
  const list = mapGroup === 'site' ? group.siteGeometries : mapGroup === 'evidence' ? group.evidenceGeometries : group.geometries;
  return dedupeGeometries(list);
}

function dedupeGeometries(list) {
  const seen = new Set();
  const out = [];
  list.forEach(g => {
    const key = JSON.stringify(g);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(g);
    }
  });
  return out;
}

function centerFromGeometries(geometries) {
  try {
    const featureCollection = { type: 'FeatureCollection', features: geometries.map(g => ({ type: 'Feature', geometry: g, properties: {} })) };
    const temp = L.geoJSON(featureCollection);
    const bounds = temp.getBounds();
    if (!bounds.isValid()) return null;
    return bounds.getCenter();
  } catch (_) {
    return null;
  }
}

function fitBoundsFromList(boundsList) {
  const valid = boundsList.filter(b => b && typeof b.isValid === 'function' && b.isValid());
  if (!valid.length) return;
  let merged = valid[0];
  valid.slice(1).forEach(b => { merged = merged.extend(b); });
  try { state.map.fitBounds(merged, { padding: [24, 24], maxZoom: 16 }); } catch (_) {}
}

function mapMetricValue(group, metrics, ds) {
  const active = Array.isArray(metrics) ? metrics : [metrics];
  if (active.includes('dominant_share')) {
    if (!group.total) return 0;
    const top = topCounts(group.counts, ds, 1)[0];
    return top ? top.value / group.total : 0;
  }
  if (active.includes('total')) return group.total;
  return active.reduce((sum, metric) => sum + (group.counts?.[metric] || 0), 0);
}

function mapMetricLabel(metrics, ds) {
  const active = Array.isArray(metrics) ? metrics : [metrics];
  if (active.includes('total')) return 'totale oggetti';
  if (active.includes('dominant_share')) return 'quota dominante';
  return active.map(m => ds.labels[m] || m).join(' + ');
}

function updateMapLegend(min, max, metrics, ds, displayMode, mapGroup) {
  const metricLabel = mapMetricLabel(metrics, ds);
  const labels = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const v = min + (max - min) * t;
    const display = metrics.includes('dominant_share') ? `${Math.round(v * 100)}%` : Math.round(v * 100) / 100;
    return `<span class="legend-ramp"><i class="legend-box" style="background:${colorForValue(v, min, max, false)}"></i>${display}</span>`;
  }).join('');
  const modeText = displayMode === 'bubbles' || (displayMode === 'auto' && mapGroup !== 'su') ? 'bolle / distribuzione' : 'poligoni';
  els.mapLegend.innerHTML = `<strong>${modeText}</strong> · ${metricLabel} ${labels}`;
}

function renderMapSidebar(p, ds) {
  if (!els.mapInfoPanel) return;
  const metricLabel = mapMetricLabel(p.__metrics || [p.__metric], ds);
  const metricValue = (p.__metrics || []).includes('dominant_share') ? `${Math.round(p.__value * 100)}%` : p.__value;
  const topRows = (p.__top || []).map(item => `<li><span>${escapeHtml(item.label)}</span><strong>${item.value} · ${percent(item.value, p.__total).toFixed(1)}%</strong></li>`).join('');
  const absent = (p.__absent || []).map(item => `<span class="absent-pill">${escapeHtml(item.label)}</span>`).join('') || '<span class="muted-small">Nessuna classe completamente assente.</span>';
  const usRows = buildUsDetailRows(p.__recordsDetail || [], ds);
  els.mapInfoPanel.innerHTML = `
    <div class="map-info-head">
      <span class="mini-label">Selezione mappa</span>
      <h3>${escapeHtml(p.__label)}</h3>
      <p><strong>Evidence:</strong> ${escapeHtml(p.__evidence || 'evidence ND')}<br><strong>Sito:</strong> ${escapeHtml(p.__site || 'site ND')}<br><strong>Construction type:</strong> ${escapeHtml(p.__construction || 'construction_type ND')}</p>
    </div>
    <div class="map-info-kpis">
      <div><strong>${p.__total}</strong><span>totale oggetti</span></div>
      <div><strong>${metricValue}</strong><span>${escapeHtml(metricLabel)}</span></div>
      <div><strong>${p.__records}</strong><span>record / US</span></div>
    </div>
    <div class="map-info-section">
      <h4>Classi rappresentate</h4>
      <ul class="map-top-list">${topRows || '<li>Nessun valore positivo.</li>'}</ul>
    </div>
    <div class="map-info-section">
      <h4>Classi mai rappresentate</h4>
      <div class="absent-list">${absent}</div>
    </div>
    ${usRows}
  `;
}

function buildUsDetailRows(records, ds) {
  if (!records || records.length <= 1) return '';
  const cats = ds.categories;
  const head = ['US', 'Totale', ...cats.map(cat => ds.labels[cat])].map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const rows = records.slice().sort((a,b) => naturalSort(a.id_su || a.su_fid, b.id_su || b.su_fid)).map(record => {
    const total = cats.reduce((sum, cat) => sum + (record.counts[cat] || 0), 0);
    const cells = cats.map(cat => {
      const v = record.counts[cat] || 0;
      return `<td>${v}<span class="cell-pct">${total ? percent(v,total).toFixed(1) : '0.0'}%</span></td>`;
    }).join('');
    return `<tr><td>${escapeHtml(usDisplayName(record))}</td><td>${total}</td>${cells}</tr>`;
  }).join('');
  return `<div class="map-info-section"><h4>Dettaglio per US</h4><div class="map-table-wrap"><table class="map-detail-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function updateMapLog(excluded) {
  const totalRecords = excluded.reduce((sum, item) => sum + item.records.length, 0);
  els.mapLogCounter.textContent = `${totalRecords} record esclusi`;
  if (!excluded.length) {
    els.mapLogBody.innerHTML = '<p>Nessun record escluso dalla visualizzazione cartografica.</p>';
    return;
  }
  els.mapLogBody.innerHTML = excluded.map(item => {
    const sample = item.records.slice(0, 24).map(r => escapeHtml(usDisplayName(r))).join(', ');
    const more = item.records.length > 24 ? ` … +${item.records.length - 24}` : '';
    return `<details><summary>${escapeHtml(item.label)} · ${item.records.length} record · ${escapeHtml(item.reasons.join(', '))}</summary><p>${sample}${more}</p></details>`;
  }).join('');
}

function handleMapClick(e) {
  const ds = getActiveDataset();
  if (!ds || !state.renderedMapItems.length) return;
  const candidates = findMapCandidates(e.latlng);
  if (!candidates.length) return;
  const depth = clamp(parseInt(els.mapPickDepth?.value, 10) || 0, 0, candidates.length - 1);
  const selected = candidates[depth];
  renderMapSidebar(selected.properties, ds);
  if (candidates.length > 1) {
    const links = candidates.map((c, i) => `<button type="button" class="popup-choice" data-idx="${i}">${i+1}. ${escapeHtml(c.properties.__label)}</button>`).join('');
    const popup = L.popup().setLatLng(e.latlng).setContent(`<div class="disamb-popup"><strong>${candidates.length} geometrie sovrapposte</strong>${links}</div>`).openOn(state.map);
    setTimeout(() => {
      document.querySelectorAll('.popup-choice').forEach(btn => btn.addEventListener('click', () => {
        const item = candidates[Number(btn.dataset.idx)];
        renderMapSidebar(item.properties, ds);
        state.map.closePopup();
      }));
    }, 0);
  }
}

function handleMapMouseMove(e) {
  const candidates = findMapCandidates(e.latlng);
  if (!candidates.length) {
    if (state.hoverTooltip) { state.map.closeTooltip(state.hoverTooltip); state.hoverTooltip = null; }
    return;
  }
  const item = candidates[0];
  if (!state.hoverTooltip) state.hoverTooltip = L.tooltip({ sticky: true, direction: 'top', opacity: 0.92 });
  state.hoverTooltip.setLatLng(e.latlng).setContent(item.properties.__label).addTo(state.map);
}

function findMapCandidates(latlng) {
  const pt = [latlng.lng, latlng.lat];
  const mapPoint = state.map.latLngToLayerPoint(latlng);
  return state.renderedMapItems.filter(item => {
    if (item.type === 'polygon') return pointInGeometry(pt, item.feature.geometry);
    if (item.type === 'bubble') return state.map.latLngToLayerPoint(item.latlng).distanceTo(mapPoint) < 18;
    return false;
  }).sort((a,b) => (a.area || Infinity) - (b.area || Infinity));
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  const coords = geometry.coordinates;
  if (geometry.type === 'Polygon') return pointInPolygon(point, coords);
  if (geometry.type === 'MultiPolygon') return coords.some(poly => pointInPolygon(point, poly));
  return false;
}

function pointInPolygon(point, rings) {
  if (!rings || !rings.length) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i=1; i<rings.length; i++) if (pointInRing(point, rings[i])) return false;
  return true;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonAreaApprox(geometry) {
  if (!geometry) return Infinity;
  const coords = [];
  collectCoordinates(geometry.coordinates, coords);
  if (!coords.length) return Infinity;
  const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function collectCoordinates(coords, out) {
  if (!Array.isArray(coords) || !coords.length) return;
  if (typeof coords[0] === 'number') out.push(coords);
  else coords.forEach(c => collectCoordinates(c, out));
}

function absentCounts(counts, ds) {
  return ds.categories.filter(cat => (counts[cat] || 0) === 0).map(cat => ({ cat, label: ds.labels[cat] || labelFromCategory(cat) }));
}

function dominantField(records, field, fallback) {
  const counts = new Map();
  records.forEach(r => {
    const value = hasValue(r[field]) ? r[field] : fallback;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || fallback;
}

function colorForValue(value, min, max, stroke = false) {
  if (!Number.isFinite(value)) return stroke ? '#95a3b8' : 'rgba(149,163,184,0.4)';
  const t = max === min ? 0.75 : clamp((value - min) / (max - min), 0, 1);
  const hue = 188 + (322 - 188) * t;
  const sat = 78;
  const light = stroke ? 42 + (12 * t) : 74 - (18 * t);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function bubbleRadius(value, min, max) {
  if (!Number.isFinite(value)) return 8;
  const t = max === min ? 0.75 : clamp((value - min) / (max - min), 0, 1);
  return 8 + t * 18;
}

function topCounts(counts, ds, limit = 5) {
  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat, value]) => ({ cat, value, label: ds.labels[cat] || labelFromCategory(cat) }));
}

function downloadActiveDataset() {
  const ds = getActiveDataset();
  if (!ds) return;
  const fc = {
    type: 'FeatureCollection',
    name: `${ds.type}_aggregated_export`,
    features: ds.records.map(record => ({
      type: 'Feature',
      geometry: record.geometry,
      properties: {
        id_su: record.id_su,
        su_fid: record.su_fid,
        su_dscu: record.su_dscu,
        id_evd: record.id_evd,
        evidence_id_old_str: record.evidence_id_old_str,
        construction_type_id: record.construction_type_id,
        construction_type: record.construction_type,
        site_code: record.site_code,
        municipality: record.municipality,
        locality: record.locality,
        address: record.address,
        site_group: record.site_group,
        ...record.counts,
      }
    }))
  };
  const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ds.type}_aggregated.geojson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fetchJson(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        const text = reader.result;
        if (ext === 'csv') {
          const parsed = Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true });
          resolve(parsed.data);
        } else {
          resolve(JSON.parse(text));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function toRows(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (input.type === 'FeatureCollection') return input.features.map(f => ({ ...f.properties, geometry: f.geometry }));
  if (input.type === 'Feature') return [{ ...input.properties, geometry: input.geometry }];
  if (Array.isArray(input.rows)) return input.rows;
  if (Array.isArray(input.data)) return input.data;
  return [];
}

function toFeatureRows(input) {
  return toRows(input).map(row => ({
    ...row,
    geometry: typeof row.geometry === 'string' ? safeJson(row.geometry) : row.geometry,
  }));
}

function safeJson(value) {
  try { return JSON.parse(value); } catch (_) { return null; }
}

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

function normalizeGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates || !hasNonEmptyCoordinates(geometry.coordinates)) return null;
  const first = firstCoordinate(geometry.coordinates);
  if (!first) return null;
  const x = Number(first[0]);
  const y = Number(first[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // Leaflet legge i GeoJSON in EPSG:4326. Gli output QGIS/GeoPackage allegati
  // hanno coordinate metriche Web Mercator (EPSG:3857), perciò vengono convertiti.
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return geometry;
  if (Math.abs(x) <= 20037508.342789244 && Math.abs(y) <= 20037508.342789244) {
    return mapGeometryCoordinates(geometry, mercatorToLonLat);
  }

  return null;
}

function hasNonEmptyCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return false;
  if (typeof coords[0] === 'number') return coords.length >= 2;
  return coords.some(hasNonEmptyCoordinates);
}

function firstCoordinate(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  if (typeof coords[0] === 'number') return coords;
  for (const child of coords) {
    const found = firstCoordinate(child);
    if (found) return found;
  }
  return null;
}

function mapGeometryCoordinates(geometry, transform) {
  return {
    ...geometry,
    coordinates: mapCoordinates(geometry.coordinates, transform),
  };
}

function mapCoordinates(coords, transform) {
  if (!Array.isArray(coords) || coords.length === 0) return coords;
  if (typeof coords[0] === 'number') return transform(coords);
  return coords.map(child => mapCoordinates(child, transform));
}

function mercatorToLonLat(coord) {
  const r = 6378137;
  const lon = (coord[0] / r) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(coord[1] / r)) - Math.PI / 2) * 180 / Math.PI;
  return [lon, lat, ...coord.slice(2)];
}

function preparePrecomputedImport(input, type, sourceName = 'dataset') {
  const features = featuresFromInput(input);
  if (!features.length) throw new Error('Il file non contiene record leggibili.');
  const fields = collectPropertyFields(features);
  const mapping = defaultFieldMapping(fields);
  const missingDefaults = FIELD_MAPPING_DEFS
    .filter(def => ['id_su', 'su_dscu', 'evidence_id_old_str', 'site_code'].includes(def.target) && !mapping[def.target])
    .map(def => def.target);
  return { input, type, sourceName, features, fields, mapping, missingDefaults };
}

function featuresFromInput(input) {
  if (input?.type === 'FeatureCollection') return input.features || [];
  if (input?.type === 'Feature') return [input];
  if (Array.isArray(input)) return input.map(row => ({ type: 'Feature', properties: row, geometry: row.geometry || null }));
  if (Array.isArray(input?.features)) return input.features;
  return [];
}

function collectPropertyFields(features) {
  const set = new Set();
  features.forEach(feature => Object.keys(feature.properties || {}).forEach(key => set.add(key)));
  return [...set].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}

function defaultFieldMapping(fields) {
  const lower = new Map(fields.map(field => [field.toLowerCase(), field]));
  const mapping = {};
  FIELD_MAPPING_DEFS.forEach(def => {
    const found = def.candidates.map(c => lower.get(c.toLowerCase())).find(Boolean);
    mapping[def.target] = found || '';
  });
  return mapping;
}

function propByMapping(props, mapping, target, fallback = '') {
  const src = mapping?.[target];
  if (src && Object.prototype.hasOwnProperty.call(props, src)) return props[src];
  const def = FIELD_MAPPING_DEFS.find(d => d.target === target);
  const lower = new Map(Object.keys(props || {}).map(key => [key.toLowerCase(), key]));
  const found = def?.candidates.map(c => lower.get(c.toLowerCase())).find(Boolean);
  return found ? props[found] : fallback;
}

function inferCategoryFields(features, type) {
  const fields = collectPropertyFields(features);
  const jsonComboKeys = new Set();
  if (type === 'combo') {
    features.forEach(feature => Object.keys(comboJsonObject(feature.properties || {})).forEach(key => jsonComboKeys.add(key)));
    if (jsonComboKeys.size) return [...jsonComboKeys].sort((a, b) => a.localeCompare(b, 'en'));
  }
  const expected = EXPECTED_COLUMNS[type] || [];
  const existingExpected = expected.filter(field => fields.includes(field));
  if (existingExpected.length > 0) return expected;

  const nFields = fields.filter(field => field.startsWith('n_')).sort((a, b) => a.localeCompare(b, 'en'));
  if (nFields.length) return nFields;

  return fields
    .filter(field => !META_FIELD_NAMES.has(field.toLowerCase()))
    .filter(field => features.some(feature => isNumericLike((feature.properties || {})[field])))
    .sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}

function isNumericLike(value) {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n);
}

function normalizePrecomputed(input, type, sourceName = 'dataset', mapping = null) {
  const features = featuresFromInput(input);
  if (!features.length) throw new Error('Il file non contiene record leggibili.');
  const effectiveMapping = mapping || defaultFieldMapping(collectPropertyFields(features));
  const categories = inferCategoryFields(features, type);
  if (!categories.length) throw new Error('Non trovo campi numerici utilizzabili come categorie.');

  const records = features.map((feature, index) => {
    const props = feature.properties || {};
    const comboJson = comboJsonObject(props);
    const counts = Object.fromEntries(categories.map(cat => [cat, toNumber(props[cat] ?? comboJson[cat])]));
    const geometry = normalizeGeometry(feature.geometry || (typeof props.geometry === 'string' ? safeJson(props.geometry) : props.geometry) || null);
    const evGeom = normalizeGeometry(typeof props.evidence_geom === 'string' ? safeJson(props.evidence_geom) : props.evidence_geom);
    const siteGeom = normalizeGeometry(typeof props.site_geom === 'string' ? safeJson(props.site_geom) : props.site_geom);
    const idSu = valueOrBlank(propByMapping(props, effectiveMapping, 'id_su')) || String(index + 1);
    const suFid = valueOrBlank(props.su_fid || props.fid || idSu);
    const suName = valueOrBlank(propByMapping(props, effectiveMapping, 'su_dscu'));
    const siteCode = valueOrBlank(propByMapping(props, effectiveMapping, 'site_code'));
    const evidenceName = valueOrBlank(propByMapping(props, effectiveMapping, 'evidence_id_old_str'));
    const municipality = valueOrBlank(propByMapping(props, effectiveMapping, 'municipality'));
    const locality = valueOrBlank(propByMapping(props, effectiveMapping, 'locality'));
    const address = valueOrBlank(propByMapping(props, effectiveMapping, 'address'));
    const siteGroup = cleanSiteGroup(propByMapping(props, effectiveMapping, 'site_group'), { site_code: siteCode, municipality, locality, address });
    return {
      uid: `${type}-${idSu}-${index}`,
      id_su: idSu,
      su_fid: suFid,
      su_dscu: suName,
      id_evd: valueOrBlank(propByMapping(props, effectiveMapping, 'id_evd')),
      evidence_id_old_str: evidenceName,
      construction_type_id: valueOrBlank(propByMapping(props, effectiveMapping, 'construction_type_id')),
      construction_type: valueOrBlank(propByMapping(props, effectiveMapping, 'construction_type')),
      site_code: siteCode,
      municipality,
      locality,
      address,
      site_group: siteGroup,
      geometry,
      evidenceGeometry: evGeom || geometry,
      siteGeometry: siteGeom || geometry,
      counts,
      raw: props,
    };
  });

  return {
    type,
    label: TYPE_META[type].label,
    sourceName,
    records,
    categories,
    labels: Object.fromEntries(categories.map(cat => [cat, labelFromCategory(cat)])),
  };
}

function reconstructDatasetFromRaw(raw, type) {
  if (type === 'combo') return reconstructComboDatasetFromRaw(raw);
  const meta = TYPE_META[type];
  const vocById = new Map(raw.voc.map(row => [asKey(row.id), row]));
  const vocValues = raw.voc.filter(row => asKey(row.voc_type) === meta.vocType);
  const categories = vocValues.map(row => `n_${slugify(row.liv_1_en || row.liv_1 || row.id)}`);
  const labels = {};
  const categoryByVocId = new Map();

  vocValues.forEach((row, i) => {
    const cat = categories[i];
    labels[cat] = valueOrBlank(row.liv_1_en || row.liv_1 || row.id);
    categoryByVocId.set(asKey(row.id), cat);
  });

  const objectsBySu = new Map();
  raw.objects.forEach(obj => {
    const suKey = asKey(obj.id_su);
    if (!objectsBySu.has(suKey)) objectsBySu.set(suKey, []);
    objectsBySu.get(suKey).push(obj);
  });

  const evidenceById = new Map(raw.evidence.map(row => [asKey(row.id_evd), row]));
  const siteById = new Map(raw.sites.map(row => [asKey(row.id_site), row]));
  const siteByCode = new Map(raw.sites.map(row => [asKey(row.site_code), row]));

  const records = raw.su.map((su, index) => {
    const counts = Object.fromEntries(categories.map(c => [c, 0]));
    const linkedObjects = objectsBySu.get(asKey(su.id_su)) || [];
    linkedObjects.forEach(obj => {
      const cat = categoryByVocId.get(asKey(obj[meta.objectField]));
      if (cat) counts[cat] += 1;
    });

    const ev = evidenceById.get(asKey(su.id_evd)) || {};
    const site = siteById.get(asKey(ev.id_site)) || siteByCode.get(asKey(su.site_code)) || {};
    const constructionVoc = vocById.get(asKey(ev.construction_type));
    const municipalityVoc = vocById.get(asKey(site.municipality));
    const localityVoc = vocById.get(asKey(site.locality));
    const municipality = valueOrBlank(municipalityVoc?.liv_1_en || municipalityVoc?.liv_1 || site.municipality);
    const locality = valueOrBlank(localityVoc?.liv_1_en || localityVoc?.liv_1 || site.locality);

    return {
      uid: `${type}-${su.id_su ?? index}`,
      id_su: valueOrBlank(su.id_su),
      su_fid: valueOrBlank(su.fid || su.su_fid),
      su_dscu: valueOrBlank(su.su_dscu),
      id_evd: valueOrBlank(su.id_evd || ev.id_evd),
      evidence_id_old_str: valueOrBlank(ev.id_old_str || ev.evidence_id_old_str),
      construction_type_id: valueOrBlank(ev.construction_type),
      construction_type: valueOrBlank(constructionVoc?.liv_1_en || constructionVoc?.liv_1 || ev.construction_type),
      site_code: valueOrBlank(site.site_code),
      municipality,
      locality,
      address: valueOrBlank(site.address),
      site_group: cleanSiteGroup(null, { site_code: site.site_code, municipality, locality, address: site.address }),
      geometry: normalizeGeometry(ev.geometry || site.geometry || su.geometry || null),
      evidenceGeometry: normalizeGeometry(ev.geometry || null),
      siteGeometry: normalizeGeometry(site.geometry || null),
      counts,
      raw: { su, evidence: ev, site }
    };
  });

  return { type, label: meta.label, sourceName: 'raw tables', records, categories, labels };
}


function reconstructComboDatasetFromRaw(raw) {
  const vocById = new Map(raw.voc.map(row => [asKey(row.id), row]));
  const morphVoc = new Map(raw.voc.filter(row => asKey(row.voc_type) === 'voc_morph_obj').map(row => [asKey(row.id), row]));
  const materialVoc = new Map(raw.voc.filter(row => asKey(row.voc_type) === 'voc_material_class').map(row => [asKey(row.id), row]));
  const comboByKey = new Map();

  raw.objects.forEach(obj => {
    const morph = morphVoc.get(asKey(obj.morphological_class));
    const material = materialVoc.get(asKey(obj.material_class));
    if (!morph || !material) return;
    const morphLabel = valueOrBlank(morph.liv_1_en || morph.liv_1 || morph.id);
    const materialLabel = valueOrBlank(material.liv_1_en || material.liv_1 || material.id);
    const cat = `n_${slugify(morphLabel)}_${slugify(materialLabel)}`;
    if (!comboByKey.has(cat)) comboByKey.set(cat, { cat, morphId: asKey(obj.morphological_class), materialId: asKey(obj.material_class), label: `${morphLabel} · ${materialLabel}` });
  });

  const combos = [...comboByKey.values()].sort((a, b) => a.cat.localeCompare(b.cat, 'en'));
  const categories = combos.map(c => c.cat);
  const labels = Object.fromEntries(combos.map(c => [c.cat, c.label]));
  const categoryByPair = new Map(combos.map(c => [`${c.morphId}|${c.materialId}`, c.cat]));

  const objectsBySu = new Map();
  raw.objects.forEach(obj => {
    const suKey = asKey(obj.id_su);
    if (!objectsBySu.has(suKey)) objectsBySu.set(suKey, []);
    objectsBySu.get(suKey).push(obj);
  });

  const evidenceById = new Map(raw.evidence.map(row => [asKey(row.id_evd), row]));
  const siteById = new Map(raw.sites.map(row => [asKey(row.id_site), row]));
  const siteByCode = new Map(raw.sites.map(row => [asKey(row.site_code), row]));

  const records = raw.su.map((su, index) => {
    const counts = Object.fromEntries(categories.map(c => [c, 0]));
    const linkedObjects = objectsBySu.get(asKey(su.id_su)) || [];
    linkedObjects.forEach(obj => {
      const cat = categoryByPair.get(`${asKey(obj.morphological_class)}|${asKey(obj.material_class)}`);
      if (cat) counts[cat] += 1;
    });

    const ev = evidenceById.get(asKey(su.id_evd)) || {};
    const site = siteById.get(asKey(ev.id_site)) || siteByCode.get(asKey(su.site_code)) || {};
    const constructionVoc = vocById.get(asKey(ev.construction_type));
    const municipalityVoc = vocById.get(asKey(site.municipality));
    const localityVoc = vocById.get(asKey(site.locality));
    const municipality = valueOrBlank(municipalityVoc?.liv_1_en || municipalityVoc?.liv_1 || site.municipality);
    const locality = valueOrBlank(localityVoc?.liv_1_en || localityVoc?.liv_1 || site.locality);

    return {
      uid: `combo-${su.id_su ?? index}`,
      id_su: valueOrBlank(su.id_su),
      su_fid: valueOrBlank(su.fid || su.su_fid),
      su_dscu: valueOrBlank(su.su_dscu),
      id_evd: valueOrBlank(su.id_evd || ev.id_evd),
      evidence_id_old_str: valueOrBlank(ev.id_old_str || ev.evidence_id_old_str),
      construction_type_id: valueOrBlank(ev.construction_type),
      construction_type: valueOrBlank(constructionVoc?.liv_1_en || constructionVoc?.liv_1 || ev.construction_type),
      site_code: valueOrBlank(site.site_code),
      municipality,
      locality,
      address: valueOrBlank(site.address),
      site_group: cleanSiteGroup(null, { site_code: site.site_code, municipality, locality, address: site.address }),
      geometry: normalizeGeometry(ev.geometry || site.geometry || su.geometry || null),
      evidenceGeometry: normalizeGeometry(ev.geometry || null),
      siteGeometry: normalizeGeometry(site.geometry || null),
      counts,
      raw: { su, evidence: ev, site }
    };
  });

  return { type: 'combo', label: TYPE_META.combo.label, sourceName: 'raw tables', records, categories, labels };
}

function labelFromCategory(cat) {
  return cat.replace(/^n_/, '').replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
}

function slugify(value) {
  return String(value || 'nd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'nd';
}

function cleanSiteGroup(siteGroup, props = {}) {
  const direct = valueOrBlank(siteGroup);
  if (hasInformativeSiteGroup(direct)) return direct;
  const parts = [props.site_code, props.municipality, props.locality, props.address].map(valueOrBlank).filter(Boolean);
  return parts.length ? parts.join(' - ') : '';
}

function hasInformativeSiteGroup(value) {
  if (!hasValue(value)) return false;
  const clean = String(value).replace(/[-\s]/g, '');
  return clean.length > 0 && clean.toLowerCase() !== 'nd';
}

function valueOrBlank(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim().toLowerCase() !== 'null';
}

function asKey(value) { return value === null || value === undefined ? '' : String(value).trim(); }
function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function percentage(value, total) { return total > 0 ? ((value || 0) / total * 100) : 0; }
function percent(value, total) { return percentage(value, total); }
function usDisplayName(record) {
  const name = hasValue(record.su_dscu) ? record.su_dscu : `US ${record.id_su || record.su_fid || '?'}`;
  const site = hasValue(record.site_code) ? ` - ${record.site_code}` : '';
  const id = record.id_su || record.su_fid || '?';
  return `${name}${site} (id ${id})`;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function compactLabel(value, max = 34) {
  const s = String(value || 'ND');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
function naturalSort(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b), 'it', { numeric: true, sensitivity: 'base' });
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch]));
}
