const state = {
  records: [],
  sourceName: '',
  charts: {},
  decorChartMode: 'donut',
  descriptions: {},
};

const els = {};

window.addEventListener('DOMContentLoaded', () => {
  cacheEls();
  initChartDefaults();
  bindEvents();
  populateChronologyOptions([]);
  renderEmpty();
});

function cacheEls() {
  [
    'decorStatus', 'decorFile', 'loadDecorFile', 'loadDecorDemo',
    'decorDimension', 'decorTrendGroup', 'decorRelatedDimension', 'decorChronoMode', 'decorChronoFilter', 'decorChronoStrict',
    'decorTopCategories', 'decorTopGroups', 'decorChartModeSwitcher', 'decorActiveTitle', 'decorActiveDescription',
    'downloadDecorPng', 'downloadDecorCsv', 'downloadDecorGeojson', 'downloadDecorZip',
    'decorSummaryStats', 'decorTableWrap'
  ].forEach(id => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.loadDecorDemo.addEventListener('click', loadDemo);
  els.loadDecorFile.addEventListener('click', loadFile);
  ['decorDimension', 'decorTrendGroup', 'decorRelatedDimension', 'decorChronoMode', 'decorChronoFilter', 'decorChronoStrict', 'decorTopCategories', 'decorTopGroups'].forEach(id => {
    els[id].addEventListener('change', updateAll);
    els[id].addEventListener('input', updateAll);
  });
  if (els.decorChartModeSwitcher) {
    els.decorChartModeSwitcher.querySelectorAll('[data-decor-chart-mode]').forEach(btn => {
      btn.addEventListener('click', () => setDecorChartMode(btn.dataset.decorChartMode));
    });
  }
  if (els.downloadDecorPng) els.downloadDecorPng.addEventListener('click', () => downloadDecorExport('png'));
  if (els.downloadDecorCsv) els.downloadDecorCsv.addEventListener('click', () => downloadDecorExport('csv'));
  if (els.downloadDecorGeojson) els.downloadDecorGeojson.addEventListener('click', () => downloadDecorExport('geojson'));
  if (els.downloadDecorZip) els.downloadDecorZip.addEventListener('click', () => downloadDecorExport('zip'));
}

function initChartDefaults() {
  if (!window.Chart) return;
  const centerTextPlugin = {
    id: 'decorCenterText',
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
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(opts.text, x, y - 3);
      ctx.fillStyle = '#7a889e';
      ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(opts.subtext || 'decorazioni', x, y + 18);
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

function renderEmpty() {
  resetChart('decorDonutChart', 'doughnut', {
    labels: ['Carica dati'],
    datasets: [{ data: [1], backgroundColor: ['rgba(107,138,253,0.16)'], borderColor: ['rgba(255,255,255,0.9)'], borderWidth: 4 }]
  }, { ...baseChartOptions(), cutout: '68%', plugins: { decorCenterText: { text: '0', subtext: 'record' } } });
  ['decorTrendChart', 'decorTechOrnChart', 'decorPositionChart', 'decorRelatedChart'].forEach(id => resetChart(id, 'bar', { labels: [], datasets: [] }, baseChartOptions()));
  els.decorTableWrap.innerHTML = '<p class="muted">Nessun dataset caricato.</p>';
}

async function loadDemo() {
  try {
    const data = await fetchJson('data/decorations.geojson');
    state.records = normalizeDecorations(data, 'decorations.geojson');
    state.sourceName = 'decorations.geojson';
    afterLoad();
  } catch (error) {
    console.error(error);
    setStatus('Impossibile caricare data/decorations.geojson. Avvia un server locale o carica manualmente il file.', true);
  }
}

async function loadFile() {
  const file = els.decorFile.files?.[0];
  if (!file) return setStatus('Seleziona prima un file GeoJSON/JSON/CSV.', true);
  try {
    const data = await parseFile(file);
    state.records = normalizeDecorations(data, file.name);
    state.sourceName = file.name;
    afterLoad();
  } catch (error) {
    console.error(error);
    setStatus(`Errore nel caricamento: ${error.message}`, true);
  }
}

function afterLoad() {
  populateChronologyOptions(state.records);
  setStatus(`${state.sourceName}: ${state.records.length} righe decorazione`, false);
  updateAll();
}

function updateAll() {
  if (!state.records.length) return renderEmpty();
  const filtered = filterByChronology(state.records);
  renderDonut(filtered);
  renderTrend(filtered);
  renderTechOrnMatrix(filtered);
  renderDecorationPositionMatrix(filtered);
  renderRelatedMatrix(filtered);
  renderTable(filtered);
  updateDecorActiveInfo();
  setTimeout(() => { const chart = state.charts[activeDecorCanvasId()]; if (chart && typeof chart.resize === 'function') chart.resize(); }, 0);
  const modeText = els.decorChronoMode.selectedOptions[0]?.textContent || '';
  els.decorSummaryStats.textContent = `${filtered.length} / ${state.records.length} record · ${modeText}`;
}

function renderDonut(records) {
  const dimension = els.decorDimension.value;
  const rows = aggregateDimension(records, dimension).sort((a, b) => b.value - a.value);
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const folded = foldRows(rows, topN);
  const total = folded.reduce((sum, row) => sum + row.value, 0);
  const labels = folded.map(row => row.label);
  const data = folded.map(row => row.value);
  const colors = palette(folded.length, dimension === 'technique' ? 210 : dimension === 'ornament' ? 315 : 170);

  resetChart('decorDonutChart', 'doughnut', {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: 'rgba(255,255,255,0.92)',
      borderWidth: 4,
      hoverOffset: 12,
      spacing: 3,
      borderRadius: 6,
    }]
  }, {
    ...baseChartOptions(),
    cutout: '68%',
    plugins: {
      decorCenterText: { text: String(total), subtext: 'occorrenze' },
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} (${percentage(ctx.raw, total).toFixed(1)}%)` } }
    }
  });

  state.descriptions.donut = { title: 'Distribuzione percentuale', text: `Distribuzione per ${dimensionLabel(dimension)} sul dataset filtrato. Le categorie meno frequenti vengono raggruppate in “Other”.` };
}

function renderTrend(records) {
  const dimension = els.decorDimension.value;
  const trendGroup = els.decorTrendGroup.value;
  const topCats = aggregateDimension(records, dimension).sort((a, b) => b.value - a.value).slice(0, 7).map(row => row.key);
  const topGroups = clamp(Number(els.decorTopGroups.value) || 28, 5, 100);
  const groups = aggregateByGroup(records, trendGroup, dimension, topCats)
    .sort((a, b) => b.total - a.total)
    .slice(0, topGroups)
    .sort((a, b) => naturalSort(a.sortValue, b.sortValue));
  const colors = palette(topCats.length, 245);

  const datasets = topCats.map((cat, i) => ({
    label: cat,
    data: groups.map(group => group.counts[cat] || 0),
    borderColor: colors[i],
    backgroundColor: colors[i].replace('0.9', '0.18'),
    tension: 0.32,
    pointRadius: 2.5,
    pointHoverRadius: 5,
  }));

  resetChart('decorTrendChart', 'line', {
    labels: groups.map(g => compactLabel(g.label, 28)),
    datasets
  }, {
    ...baseChartOptions(),
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { color: '#62738c', autoSkip: true, maxTicksLimit: 18 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } }
    },
    plugins: { tooltip: { mode: 'index', intersect: false } }
  });

  state.descriptions.trend = { title: 'Tendenza per contesto', text: `Andamento delle principali voci per ${dimensionLabel(dimension)}, raggruppate per ${groupLabel(trendGroup)}.` };
}

function renderTechOrnMatrix(records) {
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const data = matrixData(records, r => r.technique || 'technique ND', r => r.ornament || 'ornament ND', topN, topN);
  renderBubbleMatrix('decorTechOrnChart', data, 'dec_tecn_type', 'dec_ornt', 205);
  state.descriptions.techorn = { title: 'dec_tecn_type × dec_ornt', text: 'Matrice a bolle: asse X = tecnica, asse Y = ornato; la dimensione indica il numero di occorrenze.' };
}

function renderDecorationPositionMatrix(records) {
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const data = matrixData(records, r => r.decoration || 'decoration ND', r => r.position || 'position ND', topN, 18);
  renderBubbleMatrix('decorPositionChart', data, 'decoration', 'position', 160);
  state.descriptions.position = { title: 'decoration × position', text: 'Matrice a bolle: ogni punto mostra quante volte una decorazione completa compare in una posizione dell’oggetto.' };
}

function renderRelatedMatrix(records) {
  const dimension = els.decorDimension.value;
  const related = els.decorRelatedDimension.value;
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const yAccessor = related === 'material' ? r => r.material || '' : r => r.morphology || '';
  const rowsWithRelated = records.filter(r => clean(yAccessor(r)));

  if (!rowsWithRelated.length) {
    resetChart('decorRelatedChart', 'bar', {
      labels: ['Campo non presente'],
      datasets: [{ label: 'Nessun dato', data: [0], backgroundColor: ['rgba(224,91,116,0.18)'] }]
    }, baseChartOptions());
    state.descriptions.related = { title: 'Decoration × material/morphological class', text: `Il dataset non contiene un campo leggibile per ${related === 'material' ? 'material_class' : 'morphological_class'}.` };
    return;
  }

  const data = matrixData(rowsWithRelated, r => getDimensionValue(r, dimension), yAccessor, topN, 18);
  renderBubbleMatrix('decorRelatedChart', data, dimensionLabel(dimension), related === 'material' ? 'material_class' : 'morphological_class', 288);
  state.descriptions.related = { title: 'Decoration × material/morphological class', text: `Correlazione tra ${dimensionLabel(dimension)} e ${related === 'material' ? 'classe di materiale' : 'classe morfologica'}.` };
}

function renderBubbleMatrix(canvasId, matrix, xTitle, yTitle, hueStart) {
  const colors = palette(1, hueStart);
  const max = Math.max(1, ...matrix.points.map(p => p.v));
  resetChart(canvasId, 'bubble', {
    datasets: [{
      label: 'Occorrenze',
      data: matrix.points.map(p => ({ x: p.x, y: p.y, r: 4 + Math.sqrt(p.v / max) * 18, _value: p.v })),
      backgroundColor: colors[0].replace('0.9', '0.42'),
      borderColor: colors[0],
      borderWidth: 1.4,
    }]
  }, {
    ...baseChartOptions(),
    scales: {
      x: { type: 'category', labels: matrix.xLabels, title: { display: true, text: xTitle, color: '#62738c' }, ticks: { color: '#62738c', maxRotation: 60, minRotation: 25 }, grid: { display: false } },
      y: { type: 'category', labels: matrix.yLabels, title: { display: true, text: yTitle, color: '#62738c' }, ticks: { color: '#62738c' }, grid: { color: 'rgba(94,118,158,0.08)' } },
    },
    plugins: { tooltip: { callbacks: { label: ctx => `${ctx.raw.x} × ${ctx.raw.y}: ${ctx.raw._value}` } } }
  });
}

function renderTable(records) {
  const dimension = els.decorDimension.value;
  const rows = aggregateDimension(records, dimension).sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!rows.length) {
    els.decorTableWrap.innerHTML = '<p class="muted">Nessun record compatibile con i filtri correnti.</p>';
    return;
  }
  const tableRows = rows.slice(0, 80).map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(row.label)}</td>
      <td>${row.value}</td>
      <td>${percentage(row.value, total).toFixed(1)}%</td>
    </tr>
  `).join('');
  els.decorTableWrap.innerHTML = `
    <table class="decor-summary-table">
      <thead><tr><th>#</th><th>${escapeHtml(dimensionLabel(dimension))}</th><th>n</th><th>%</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

function aggregateDimension(records, dimension) {
  const map = new Map();
  records.forEach(record => {
    const key = getDimensionValue(record, dimension);
    if (!map.has(key)) map.set(key, { key, label: key, value: 0, records: 0 });
    const row = map.get(key);
    row.value += record.weight;
    row.records += 1;
  });
  return [...map.values()];
}

function aggregateByGroup(records, groupBy, dimension, categories) {
  const map = new Map();
  records.forEach(record => {
    const groups = getGroupValues(record, groupBy);
    groups.forEach(group => {
      if (!map.has(group.key)) {
        map.set(group.key, { key: group.key, label: group.label, sortValue: group.sortValue, counts: Object.fromEntries(categories.map(c => [c, 0])), total: 0 });
      }
      const target = map.get(group.key);
      const cat = getDimensionValue(record, dimension);
      if (categories.includes(cat)) {
        target.counts[cat] += record.weight;
        target.total += record.weight;
      }
    });
  });
  return [...map.values()].filter(g => g.total > 0);
}

function matrixData(records, xAccessor, yAccessor, maxX = 14, maxY = 14) {
  const xTotals = new Map();
  const yTotals = new Map();
  const pairs = new Map();
  records.forEach(record => {
    const xs = splitMultiValue(xAccessor(record));
    const ys = splitMultiValue(yAccessor(record));
    xs.forEach(x => xTotals.set(x, (xTotals.get(x) || 0) + record.weight));
    ys.forEach(y => yTotals.set(y, (yTotals.get(y) || 0) + record.weight));
    xs.forEach(x => ys.forEach(y => {
      const key = `${x}|||${y}`;
      pairs.set(key, (pairs.get(key) || 0) + record.weight);
    }));
  });
  const xLabels = [...xTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxX).map(([k]) => k);
  const yLabels = [...yTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxY).map(([k]) => k);
  const points = [];
  xLabels.forEach(x => yLabels.forEach(y => {
    const v = pairs.get(`${x}|||${y}`) || 0;
    if (v > 0) points.push({ x, y, v });
  }));
  return { xLabels, yLabels, points };
}

function getDimensionValue(record, dimension) {
  if (dimension === 'technique') return record.technique || 'technique ND';
  if (dimension === 'ornament') return record.ornament || 'ornament ND';
  return record.decoration || 'decoration ND';
}

function getGroupValues(record, groupBy) {
  if (groupBy === 'su') return [{ key: `su:${record.id_su || record.su_fid || 'ND'}`, label: record.su_label, sortValue: record.id_su || record.su_label }];
  if (groupBy === 'evidence') return [{ key: `ev:${record.evidence_label}`, label: record.evidence_label, sortValue: record.evidence_label }];
  if (groupBy === 'site') return [{ key: `site:${record.site_label}`, label: record.site_label, sortValue: record.site_label }];
  if (groupBy === 'evidence_type') return [{ key: `etype:${record.evidence_type || 'evidence_type ND'}`, label: record.evidence_type || 'evidence_type ND', sortValue: record.evidence_type || 'ND' }];
  if (groupBy === 'chrono') {
    const parsed = parseChronology(record.chrono_gen);
    const values = els.decorChronoStrict.checked ? parsed.singleValues : parsed.values;
    if (!values.length) return [{ key: 'chrono:ND', label: 'chrono ND', sortValue: 999 }];
    return values.map(v => ({ key: `chrono:${v}`, label: String(v), sortValue: Number(v) }));
  }
  return [{ key: 'all', label: 'All records', sortValue: 'all' }];
}

function filterByChronology(records) {
  const mode = els.decorChronoMode.value;
  const selected = [...els.decorChronoFilter.selectedOptions].map(opt => Number(opt.value));
  const strict = els.decorChronoStrict.checked;
  if (mode === 'all_records') return records.slice();
  return records.filter(record => {
    const parsed = parseChronology(record.chrono_gen);
    if (!parsed.values.length) return false;
    if (mode === 'all_chronologies') return true;
    if (!selected.length) return true;
    const values = strict ? parsed.singleValues : parsed.values;
    return selected.some(value => values.includes(value));
  });
}

function populateChronologyOptions(records) {
  const values = new Set([10, 9, 8, 7, 6, 5, 4]);
  records.forEach(record => parseChronology(record.chrono_gen).values.forEach(v => values.add(v)));
  const sorted = [...values].filter(v => Number.isFinite(v)).sort((a, b) => b - a);
  els.decorChronoFilter.innerHTML = sorted.map(v => `<option value="${v}">${v}</option>`).join('');
}

function parseChronology(raw) {
  const text = String(raw ?? '').replace(/BCE|CE|a\.C\.|d\.C\./gi, '').trim();
  const result = { values: [], singleValues: [], hasChronology: false };
  if (!text) return result;
  const values = new Set();
  const singles = new Set();
  text.split(';').map(s => s.trim()).filter(Boolean).forEach(token => {
    const nums = [...token.matchAll(/\d+/g)].map(m => Number(m[0])).filter(Number.isFinite);
    if (!nums.length) return;
    result.hasChronology = true;
    if (token.includes('-') && nums.length >= 2) {
      const start = nums[0];
      const end = nums[1];
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let v = min; v <= max; v++) values.add(v);
    } else {
      nums.forEach(v => { values.add(v); singles.add(v); });
    }
  });
  result.values = [...values].sort((a, b) => b - a);
  result.singleValues = [...singles].sort((a, b) => b - a);
  return result;
}

function normalizeDecorations(input, sourceName) {
  const rows = toFeatureRows(input);
  return rows.map((row, index) => {
    const p = row.properties || row;
    const technique = clean(p.dec_tecn_type_en || p.dec_tecn_type || p.dec_tecn_type_it || p.dec_tecn_type_id || 'technique ND');
    const ornament = clean(p.dec_ornt_en || p.dec_ornt || p.dec_ornt_it || p.dec_ornt_id || 'ornament ND');
    const decoration = clean(p.decoration_en || p.decoration || p.decoration_key || `${technique} · ${ornament}`);
    const siteOfficial = clean(p.id_site_fdm || p.site_official_id || p.site_code || 'site ND');
    const suName = clean(p.su_dscu || p.id_su || p.su_fid || 'US ND');
    const idSu = clean(p.id_su || p.su_fid || '');
    const suLabel = siteOfficial && siteOfficial !== 'site ND' ? `${suName} (${siteOfficial})` : suName;
    const evidenceLabel = clean(p.evidence_id_old_str || p.id_old_str || p.id_evd || 'evidence ND');
    const siteLabel = clean(p.id_site_fdm || p.site_code || 'site ND');
    return {
      uid: `${sourceName}-${index}`,
      decoration,
      technique,
      ornament,
      id_obj: clean(p.id_obj || p.id_obj_fdm || ''),
      id_su: idSu,
      su_fid: clean(p.su_fid || ''),
      su_label: suLabel,
      evidence_label: evidenceLabel,
      site_label: siteLabel,
      evidence_type: clean(p.evidence_type || p.evidence_type_en || p.evidence_type_id || ''),
      construction_type: clean(p.construction_type || ''),
      chrono_gen: clean(p.chrono_gen || p.chrono_gen_norm || ''),
      position: clean(p.positions_en || p.position_en || p.position || p.positions_it || p.position_ids || ''),
      material: clean(p.material_class_en || p.material_class || p.material || p.material_class_label || ''),
      morphology: clean(p.morphological_class_en || p.morphological_class || p.morphology || p.morphological_class_label || ''),
      weight: Math.max(1, toNumber(p.qt_dec_total || p.n_obj_dec_links || 1)),
      geometry: row.geometry || null,
      raw: p,
    };
  });
}

function splitMultiValue(value) {
  const parts = String(value || '').split(/;|\||,/).map(s => s.trim()).filter(Boolean);
  return parts.length ? [...new Set(parts)] : ['ND'];
}

function toFeatureRows(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(row => ({ properties: row }));
  if (input.type === 'FeatureCollection') return input.features || [];
  if (input.type === 'Feature') return [input];
  if (Array.isArray(input.rows)) return input.rows.map(row => ({ properties: row }));
  if (Array.isArray(input.data)) return input.data.map(row => ({ properties: row }));
  return [];
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
      } catch (error) { reject(error); }
    };
    reader.readAsText(file);
  });
}


function setDecorChartMode(mode) {
  state.decorChartMode = mode || 'donut';
  document.querySelectorAll('[data-decor-chart-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.decorChartMode === state.decorChartMode));
  document.querySelectorAll('[data-decor-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.decorPane === state.decorChartMode));
  updateDecorActiveInfo();
  setTimeout(() => {
    const chart = state.charts[activeDecorCanvasId()];
    if (chart && typeof chart.resize === 'function') chart.resize();
  }, 0);
}

function updateDecorActiveInfo() {
  const info = state.descriptions[state.decorChartMode] || { title: 'Grafico decorations', text: 'Carica i dati per iniziare.' };
  if (els.decorActiveTitle) els.decorActiveTitle.textContent = info.title;
  if (els.decorActiveDescription) els.decorActiveDescription.textContent = info.text;
}

function activeDecorCanvasId() {
  return ({ donut: 'decorDonutChart', trend: 'decorTrendChart', techorn: 'decorTechOrnChart', position: 'decorPositionChart', related: 'decorRelatedChart' })[state.decorChartMode] || 'decorDonutChart';
}

async function downloadDecorExport(format) {
  const pack = buildDecorExportPackage();
  if (!pack) return setStatus('Nessun dato esportabile.', true);
  const base = makeSafeFilename(`decorations_${pack.mode}_${pack.chronoLabel}`);
  if (format === 'png') {
    const blob = await chartToPngBlob(activeDecorCanvasId());
    if (blob) downloadBlob(blob, `${base}.png`);
    return;
  }
  if (format === 'csv') {
    downloadBlob(new Blob([toCsv(pack.rows)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
    return;
  }
  if (format === 'geojson') {
    downloadBlob(new Blob([JSON.stringify(pack.geojson, null, 2)], { type: 'application/geo+json' }), `${base}.geojson`);
    return;
  }
  if (format === 'zip') {
    if (!window.JSZip) return setStatus('JSZip non disponibile: impossibile creare lo ZIP.', true);
    const zip = new JSZip();
    const png = await chartToPngBlob(activeDecorCanvasId());
    if (png) zip.file(`${base}.png`, png);
    zip.file(`${base}.csv`, toCsv(pack.rows));
    zip.file(`${base}.geojson`, JSON.stringify(pack.geojson, null, 2));
    zip.file(`${base}_metadata.json`, JSON.stringify(pack.metadata, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${base}.zip`);
  }
}

function buildDecorExportPackage() {
  if (!state.records.length) return null;
  const filtered = filterByChronology(state.records);
  const mode = state.decorChartMode;
  const dimension = els.decorDimension.value;
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  let rows = [];
  if (mode === 'donut') {
    const totalRows = aggregateDimension(filtered, dimension).sort((a,b) => b.value - a.value);
    const total = totalRows.reduce((s,r) => s + r.value, 0);
    rows = totalRows.map(r => ({ dimension: dimensionLabel(dimension), key: r.key, label: r.label, count: r.value, percent: total ? r.value / total * 100 : 0 }));
  } else if (mode === 'trend') {
    const topCats = aggregateDimension(filtered, dimension).sort((a,b) => b.value - a.value).slice(0, 7).map(r => r.key);
    rows = aggregateByGroup(filtered, els.decorTrendGroup.value, dimension, topCats).map(g => {
      const row = { group_key: g.key, group_label: g.label, total: g.total };
      topCats.forEach(cat => { row[cat] = g.counts[cat] || 0; row[`${cat}_percent`] = g.total ? (g.counts[cat] || 0) / g.total * 100 : 0; });
      return row;
    });
  } else if (mode === 'techorn') {
    rows = matrixData(filtered, r => r.technique || 'technique ND', r => r.ornament || 'ornament ND', topN, topN).points.map(p => ({ dec_tecn_type: p.x, dec_ornt: p.y, count: p.v }));
  } else if (mode === 'position') {
    rows = matrixData(filtered, r => r.decoration || 'decoration ND', r => r.position || 'position ND', topN, 18).points.map(p => ({ decoration: p.x, position: p.y, count: p.v }));
  } else if (mode === 'related') {
    const related = els.decorRelatedDimension.value;
    const yAccessor = related === 'material' ? r => r.material || '' : r => r.morphology || '';
    rows = matrixData(filtered.filter(r => clean(yAccessor(r))), r => getDimensionValue(r, dimension), yAccessor, topN, 18).points.map(p => ({ decorative_value: p.x, related_value: p.y, related_dimension: related, count: p.v }));
  }
  const geojson = {
    type: 'FeatureCollection',
    name: 'decorations_export',
    features: filtered.map((record, i) => ({
      type: 'Feature',
      geometry: record.geometry || null,
      properties: {
        uid: record.uid,
        decoration: record.decoration,
        dec_tecn_type: record.technique,
        dec_ornt: record.ornament,
        position: record.position,
        material_class: record.material,
        morphological_class: record.morphology,
        id_obj: record.id_obj,
        id_su: record.id_su,
        us_label: record.su_label,
        evidence: record.evidence_label,
        site: record.site_label,
        evidence_type: record.evidence_type,
        construction_type: record.construction_type,
        chrono_gen: record.chrono_gen,
        weight: record.weight,
      }
    }))
  };
  return { mode, rows, geojson, chronoLabel: decorChronologyExportLabel(), metadata: { exported_at: new Date().toISOString(), source: state.sourceName, mode, dimension, chronology_filter: decorChronologyExportLabel(), records_after_filters: filtered.length } };
}

function decorChronologyExportLabel() {
  const mode = els.decorChronoMode.value;
  if (mode === 'all_records') return 'tutti_record';
  if (mode === 'all_chronologies') return 'tutte_cronologie';
  const selected = [...els.decorChronoFilter.selectedOptions].map(opt => opt.value);
  return selected.length ? `chrono_${selected.join('_')}${els.decorChronoStrict.checked ? '_strict' : ''}` : 'chrono_selected_all';
}

async function chartToPngBlob(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const scale = 2;
  const out = document.createElement('canvas');
  out.width = Math.max(1, canvas.width * scale);
  out.height = Math.max(1, canvas.height * scale);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return new Promise(resolve => out.toBlob(resolve, 'image/png', 1));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const cols = [];
  rows.forEach(row => Object.keys(row).forEach(key => { if (!cols.includes(key)) cols.push(key); }));
  const esc = value => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(row => cols.map(col => esc(row[col])).join(','))].join('\n');
}

function makeSafeFilename(value) {
  return String(value || 'export').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 150) || 'export';
}

function fetchJson(url) {
  return fetch(url).then(resp => {
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  });
}

function resetChart(canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(canvas, { type, data, options });
}

function baseChartOptions() {
  return { responsive: true, maintainAspectRatio: false, animation: { duration: 600, easing: 'easeOutQuart' }, plugins: { legend: { display: false } } };
}

function foldRows(rows, limit) {
  if (rows.length <= limit) return rows;
  const kept = rows.slice(0, limit - 1);
  const other = rows.slice(limit - 1).reduce((sum, row) => sum + row.value, 0);
  if (other > 0) kept.push({ key: '__other', label: 'Other', value: other, records: 0 });
  return kept;
}

function palette(n, hueStart = 180) {
  return Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const hue = (hueStart + i * 37) % 360;
    return `hsla(${hue}, 88%, 68%, 0.9)`;
  });
}

function dimensionLabel(value) {
  if (value === 'technique') return 'dec_tecn_type';
  if (value === 'ornament') return 'dec_ornt';
  return 'decorazione completa';
}

function groupLabel(value) {
  return ({ su: 'US', evidence: 'evidence', site: 'sito', evidence_type: 'evidence type', chrono: 'cronologia' })[value] || value;
}

function setStatus(message, isError) {
  els.decorStatus.textContent = message;
  els.decorStatus.style.background = isError ? 'rgba(224, 91, 116, 0.10)' : 'rgba(56, 216, 199, 0.08)';
  els.decorStatus.style.borderColor = isError ? 'rgba(224, 91, 116, 0.18)' : 'rgba(56, 216, 199, 0.22)';
  els.decorStatus.style.color = isError ? '#8f203f' : '#186e78';
}

function clean(value) { return value === null || value === undefined ? '' : String(value).trim(); }
function toNumber(value) { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; }
function percentage(value, total) { return total > 0 ? value / total * 100 : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function compactLabel(value, max = 34) { const s = String(value || 'ND'); return s.length > max ? `${s.slice(0, max - 1)}…` : s; }
function naturalSort(a, b) { const na = Number(a), nb = Number(b); if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb; return String(a).localeCompare(String(b), 'it', { numeric: true, sensitivity: 'base' }); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch])); }
