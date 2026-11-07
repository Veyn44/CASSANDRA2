import {
  detectSections,
  getSectionInfo,
  getVacuumInfo,
  completeSectionScan,
} from '../systems/section-manager.js';
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export function createSectionsPanel(root, s, onChange) {
  let open = false,
    report = null;
  s.sectionsUi ??= { selectedPanelId: null, selectedSectionId: null };
  function selectSection(id) {
    s.sectionsUi.selectedSectionId = id;
    s.sectionsUi.selectedPanelId =
      detectSections(s).panels.find((p) => p.sectionId === id)?.id ?? null;
    report = null;
    render();
  }
  function selectPanel(id) {
    const data = detectSections(s),
      panel = data.panels.find((v) => v.id === id);
    s.sectionsUi.selectedPanelId = id;
    s.sectionsUi.selectedSectionId = panel?.sectionId ?? null;
    report = null;
    render();
  }
  function render() {
    if (!open) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    const data = detectSections(s),
      selected = data.byId[s.sectionsUi.selectedSectionId] ?? null;
    const info = selected ? getSectionInfo(selected) : getVacuumInfo(),
      panels = data.panels;
    const allTiles = Object.entries(s.map.tiles)
      .filter(([, tile]) => tile?.hull)
      .map(([tileKey]) => tileKey.split(',').map(Number));
    const minX = allTiles.length ? Math.max(0, Math.min(...allTiles.map((p) => p[0])) - 2) : 0;
    const maxX = allTiles.length
      ? Math.min(s.map.width - 1, Math.max(...allTiles.map((p) => p[0])) + 2)
      : 0;
    const minY = allTiles.length ? Math.max(0, Math.min(...allTiles.map((p) => p[1])) - 2) : 0;
    const maxY = allTiles.length
      ? Math.min(s.map.height - 1, Math.max(...allTiles.map((p) => p[1])) + 2)
      : 0;
    const width = Math.max(1, maxX - minX + 1),
      height = Math.max(1, maxY - minY + 1),
      grid = [];
    const vacuumSelected = s.sectionsUi.selectedSectionId == null;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const tileKey = x + ',' + y,
          id = data.tileToSection[tileKey],
          tile = s.map.tiles[tileKey];
        const panel = panels.find((p) => p.x === x && p.y === y);
        if (!tile?.hull) {
          const selectedVacuum = vacuumSelected && data.vacuumSet.has(tileKey);
          if (data.vacuumSet.has(tileKey))
            grid.push(
              '<button class="section-map-cell vacuum-cell ' +
                (selectedVacuum ? 'vacuum-selected' : '') +
                '" data-vacuum="1" title="VACUUM"></button>'
            );
          else
            grid.push(
              '<div class="section-map-cell unclassified-cell" title="UNCLASSIFIED SPACE"></div>'
            );
          continue;
        }
        const externalEdge = DIRS.some(([dx, dy]) => !s.map.tiles[x + dx + ',' + (y + dy)]?.hull);
        const edgeClass = vacuumSelected && externalEdge ? ' external-boundary-selected' : '';
        if (tile.wall || tile.aluminiumWall) {
          grid.push(
            '<div class="section-map-cell boundary-cell ' +
              (tile.aluminiumWall ? 'aluminium-boundary' : 'hull-boundary') +
              edgeClass +
              '" title="' +
              (tile.aluminiumWall ? 'ALUMINIUM WALL' : 'HULL WALL') +
              '"></div>'
          );
          continue;
        }
        const cls =
          id === s.sectionsUi.selectedSectionId ? 'selected' : id ? 'section-cell' : 'unassigned';
        grid.push(
          '<button class="section-map-cell ' +
            cls +
            edgeClass +
            '" data-section="' +
            esc(id ?? '') +
            '" title="' +
            esc(id ?? 'UNASSIGNED') +
            '">' +
            (panel ? '⌖' : '') +
            '</button>'
        );
      }
    const existingOrder = s.sectionsUi.panelOrder ?? [];
    const order = [
      ...existingOrder.filter((id) => panels.some((p) => p.id === id)),
      ...panels.map((p) => p.id).filter((id) => !existingOrder.includes(id)),
    ];
    s.sectionsUi.panelOrder = order;
    const orderedPanels = [...panels].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const panelRows = orderedPanels
      .map(
        (p, i) =>
          '<div class="section-panel-row ' +
          (p.id === s.sectionsUi.selectedPanelId ? 'active' : '') +
          '"><button class="section-panel-select" data-panel="' +
          esc(p.id) +
          '"><span>' +
          String(i + 1).padStart(2, '0') +
          '</span><b>' +
          esc(p.name) +
          '</b><small>' +
          esc(p.sectionId ?? 'NO SECTION') +
          ' · ' +
          esc(p.status) +
          (p.reason ? ' · ' + esc(p.reason) : '') +
          '</small></button><div class="section-panel-actions"><button data-rename="' +
          esc(p.id) +
          '" title="Rename">✎</button><button data-up="' +
          esc(p.id) +
          '" title="Move up">↑</button><button data-down="' +
          esc(p.id) +
          '" title="Move down">↓</button></div></div>'
      )
      .join('');
    const reportHtml = report
      ? '<div class="scan-report"><h3>COMPLETE SCAN REPORT</h3><p>FLOOR TILES · ' +
        report.floors.length +
        ' / BOUNDARIES · ' +
        report.walls.length +
        '</p><div class="scan-list">' +
        report.floors
          .map(
            (v) =>
              '<p><span>' +
              v.type +
              ' · ' +
              v.x +
              ', ' +
              v.y +
              '</span><b>' +
              v.integrity +
              '%</b></p>'
          )
          .join('') +
        report.walls
          .map(
            (v) =>
              '<p><span>' +
              v.type +
              ' · ' +
              v.x +
              ', ' +
              v.y +
              '</span><b>' +
              v.integrity +
              '%</b></p>'
          )
          .join('') +
        '</div></div>'
      : '';
    const weight = info.weight == null ? 'NOT DEFINED' : info.weight.toLocaleString('en-US');
    const temperature = info.temperature == null ? 'UNMAINTAINED' : info.temperature + ' °C';
    root.innerHTML =
      '<div class="sections-window"><header class="sections-header"><div><small>CASSANDRA · COMMAND SYSTEM</small><h2>SECTION CONTROL</h2></div><button data-close aria-label="Close">×</button></header><div class="sections-layout"><aside class="sections-panel-list"><h3>CONTROL PANELS</h3>' +
      (panelRows || '<p class="sections-empty">NO CONTROL PANELS INSTALLED</p>') +
      '</aside><section class="sections-blueprint"><h3>SHIP BLUEPRINT</h3><div class="section-map" style="grid-template-columns:repeat(' +
      width +
      ',minmax(5px,1fr));grid-template-rows:repeat(' +
      height +
      ',minmax(5px,1fr))">' +
      grid.join('') +
      '</div><p class="blueprint-legend"><i></i> SELECTED SECTION <span>·</span> CLICK SPACE FOR VACUUM</p></section><aside class="sections-info"><h3>SECTION INFO</h3><div class="section-info-card"><small>' +
      esc(info.type === 'VACUUM' ? 'EXTERNAL ENVIRONMENT' : info.id) +
      '</small><h2>' +
      esc(info.name) +
      '</h2><span class="section-status ' +
      (info.airtightness === 'STABLE' || info.type === 'VACUUM'
        ? 'sealed'
        : info.airtightness === 'CAUTIOUS'
          ? 'unsealed'
          : 'unsealed') +
      '">' +
      esc(info.airtightness ?? 'VACUUM') +
      '</span><dl><dt>WEIGHT</dt><dd>' +
      weight +
      '</dd><dt>ATMOSPHERE</dt><dd>' +
      esc(info.atmosphere) +
      '</dd><dt>PRESSURE</dt><dd>' +
      esc(info.pressure) +
      '</dd><dt>TEMPERATURE</dt><dd>' +
      temperature +
      '</dd><dt>ENVIRONMENT</dt><dd>' +
      esc(info.environment) +
      '</dd>' +
      (info.activeTiles != null ? '<dt>ACTIVE TILES</dt><dd>' + info.activeTiles + '</dd>' : '') +
      (info.airtightness ? '<dt>AIRTIGHTNESS</dt><dd>' + esc(info.airtightness) + '</dd>' : '') +
      (info.cautiousWalls
        ? '<dt>CAUTIOUS BOUNDARIES</dt><dd>' + info.cautiousWalls + '</dd>'
        : '') +
      (info.criticalWalls
        ? '<dt>CRITICAL BOUNDARIES</dt><dd>' + info.criticalWalls + '</dd>'
        : '') +
      '</dl></div>' +
      (selected
        ? '<div class="section-actions"><h3>AVAILABLE ACTIONS</h3><button data-scan>COMPLETE SCAN <b>2 AP</b></button></div>'
        : '') +
      reportHtml +
      '</aside></div><footer class="sections-footer"><span>LOCAL CONTROL · ' +
      panels.length +
      ' PANEL(S)</span><span>OPERATIONAL POINTS · ' +
      s.pawn.op +
      ' / ' +
      s.pawn.maxOP +
      '</span></footer></div>';
    root.querySelector('[data-close]').onclick = () => {
      open = false;
      render();
    };
    root
      .querySelectorAll('[data-section]')
      .forEach((b) => (b.onclick = () => selectSection(b.dataset.section || null)));
    root.querySelectorAll('[data-vacuum]').forEach(
      (b) =>
        (b.onclick = () => {
          s.sectionsUi.selectedSectionId = null;
          s.sectionsUi.selectedPanelId = null;
          report = null;
          render();
        })
    );
    root
      .querySelectorAll('[data-panel]')
      .forEach((b) => (b.onclick = () => selectPanel(b.dataset.panel)));
    root.querySelectorAll('[data-rename]').forEach(
      (b) =>
        (b.onclick = () => {
          const panel = detectSections(s).panels.find((v) => v.id === b.dataset.rename);
          if (!panel) return;
          const value = prompt('SECTION NAME', panel.name);
          if (value?.trim()) {
            const obj = s.map.objects[panel.id];
            obj.sectionName = value.trim().slice(0, 32);
            render();
          }
        })
    );
    root.querySelectorAll('[data-up],[data-down]').forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.up ?? b.dataset.down,
            arr = s.sectionsUi.panelOrder;
          const i = arr.indexOf(id),
            j = i + (b.dataset.up ? -1 : 1);
          if (i < 0 || j < 0 || j >= arr.length) return;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          render();
        })
    );
    const scan = root.querySelector('[data-scan]');
    if (scan)
      scan.onclick = () => {
        const result = completeSectionScan(s, selected);
        if (result.ok) report = result;
        onChange(result.message);
        render();
      };
  }
  return {
    open() {
      open = true;
      render();
    },
    close() {
      open = false;
      render();
    },
    toggle() {
      open = !open;
      render();
    },
    selectPanel(id) {
      selectPanel(id);
      open = true;
      render();
    },
    refresh: render,
    get isOpen() {
      return open;
    },
  };
}
