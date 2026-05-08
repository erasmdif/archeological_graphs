const state = {
  records: [],
  sourceName: '',
  charts: {},
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
    'decorTopCategories', 'decorTopGroups', 'decorDonutDescription', 'decorTrendDescription',
    'decorTechOrnDescription', 'decorPositionDescription', 'decorRelatedDescription',
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

  els.decorDonutDescription.textContent = `Distribuzione per ${dimensionLabel(dimension)} sul dataset filtrato. Le categorie meno frequenti vengono raggruppate in “Other”.`;
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

  els.decorTrendDescription.textContent = `Andamento delle principali voci per ${dimensionLabel(dimension)}, raggruppate per ${groupLabel(trendGroup)}.`;
}

function renderTechOrnMatrix(records) {
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const data = matrixData(records, r => r.technique || 'technique ND', r => r.ornament || 'ornament ND', topN, topN);
  renderBubbleMatrix('decorTechOrnChart', data, 'dec_tecn_type', 'dec_ornt', 205);
  els.decorTechOrnDescription.textContent = 'Matrice a bolle: asse X = tecnica, asse Y = ornato; la dimensione indica il numero di occorrenze.';
}

function renderDecorationPositionMatrix(records) {
  const topN = clamp(Number(els.decorTopCategories.value) || 12, 3, 30);
  const data = matrixData(records, r => r.decoration || 'decoration ND', r => r.position || 'position ND', topN, 18);
  renderBubbleMatrix('decorPositionChart', data, 'decoration', 'position', 160);
  els.decorPositionDescription.textContent = 'Matrice a bolle: ogni punto mostra quante volte una decorazione completa compare in una posizione dell’oggetto.';
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
    els.decorRelatedDescription.textContent = `Il dataset non contiene un campo leggibile per ${related === 'material' ? 'material_class' : 'morphological_class'}.`;
    return;
  }

  const data = matrixData(rowsWithRelated, r => getDimensionValue(r, dimension), yAccessor, topN, 18);
  renderBubbleMatrix('decorRelatedChart', data, dimensionLabel(dimension), related === 'material' ? 'material_class' : 'morphological_class', 288);
  els.decorRelatedDescription.textContent = `Correlazione tra ${dimensionLabel(dimension)} e ${related === 'material' ? 'classe di materiale' : 'classe morfologica'}.`;
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
