import { PREFABS, getBuildable } from '../systems/prefab-manager.js';

const $ = (selector) => document.querySelector(selector);

const CATALOG_CATEGORIES = [
  ['structure', 'STRUCTURE'],
  ['access', 'ACCESS'],
  ['core-systems', 'CORE SYSTEMS'],
  ['power', 'POWER'],
  ['material-processing', 'MATERIAL PROCESSING'],
  ['crew-medical', 'CREW & MEDICAL'],
  ['furniture', 'FURNITURE'],
];

export function renderBuildCatalog(state, activeCategory, setActiveCategory, refresh, noteText) {
  $('#catalog-categories').innerHTML = CATALOG_CATEGORIES.map(
    ([id, label]) =>
      '<button class="catalog-category ' +
      (activeCategory === id ? 'active' : '') +
      '" data-category="' +
      id +
      '">' +
      label +
      '</button>'
  ).join('');
  document.querySelectorAll('[data-category]').forEach(
    (btn) =>
      (btn.onclick = () => {
        setActiveCategory(btn.dataset.category);
        refresh();
      })
  );
  const visibleItems = PREFABS.filter((p) => p.category === activeCategory);
  const tileTools =
    activeCategory === 'structure'
      ? '<button class="prefab-option ' +
        (state.activeTool === 'hull' ? 'active' : '') +
        '" data-tool="hull">Hull Floor<small>Tile construction · 1 titanium · 1 AP</small></button><button class="prefab-option ' +
        (state.activeTool === 'wall' ? 'active' : '') +
        '" data-tool="wall">Hull Wall<small>Requires completed Hull · 1 titanium · 1 AP</small></button>' +
        (state.devMode
          ? '<button class="prefab-option ' +
            (state.activeTool === 'aluminiumWall' ? 'active' : '') +
            '" data-tool="aluminiumWall">Aluminium Wall<small>DEV TEST · place on open Hull tile</small></button>'
          : '')
      : '';
  $('#prefab-list').innerHTML =
    tileTools +
      visibleItems
        .map(
          (p) =>
            '<button class="prefab-option ' +
            (state.selectedPrefab === p.id && state.activeTool === 'prefab' ? 'active' : '') +
            '" data-prefab="' +
            p.id +
            '">' +
            p.name +
            '<small>' +
            p.w +
            ' × ' +
            p.h +
            ' · ' +
            p.description +
            '</small></button>'
        )
        .join('') ||
    tileTools ||
    '<p class="catalog-empty">NO ITEMS IN THIS SECTION YET</p>';
  document.querySelectorAll('#prefab-list [data-tool]').forEach(
    (btn) =>
      (btn.onclick = () => {
        state.activeTool = btn.dataset.tool;
        state.selectedObject = null;
        state.pawn.selected = false;
        noteText(
          state.activeTool === 'hull'
            ? 'Place Hull plans anywhere in the ship sector. Construction requires connection to the existing ship.'
            : 'Wall plans require completed Hull.'
        );
        refresh();
      })
  );
  document.querySelectorAll('[data-prefab]').forEach(
    (btn) =>
      (btn.onclick = () => {
        state.selectedPrefab = btn.dataset.prefab;
        state.activeTool = 'prefab';
        state.selectedObject = null;
        state.pawn.selected = false;
        state.rotation = 0;
        noteText(
          state.devCreator
            ? 'DEV CREATOR · DIRECT PLACEMENT · Q / E TO ROTATE'
            : 'BLUEPRINT PREVIEW · MOVE CURSOR · Q / E TO ROTATE · CLICK TO PLACE'
        );
        refresh();
      })
  );
  const details = $('#object-details');
  if (state.selectedObject && state.map.objects[state.selectedObject]) {
    const selected = state.map.objects[state.selectedObject],
      p = getBuildable(selected.type);
    details.hidden = false;
    details.className = 'object-details';
    details.innerHTML =
      '<h4>' +
      p.name +
      '</h4><p>' +
      p.description +
      '</p><p class="prefab-footprint">FOOTPRINT · ' +
      selected.w +
      ' × ' +
      selected.h +
      '</p><p>STATUS · ' +
      p.function +
      '</p>';
  } else details.hidden = true;
}
