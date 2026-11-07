import { updateSidebar } from './sidebar.js';
import { connectedHullCount, shipHullTileCount } from '../systems/hull-system.js';
import { getBuildable } from '../systems/prefab-manager.js';

const $ = (selector) => document.querySelector(selector);

export function renderHud(state, renderer, sectionsPanel, gridBtn) {
  renderer.draw();
  updateSidebar(state);
  $('#tile-count').textContent = Object.values(state.map.tiles).filter((t) => t.hull).length;
  $('#planned-count').textContent = Object.keys(state.map.plans).length;
  $('#titanium-count').textContent = state.gameConfig.unlimitedResources
    ? '∞'
    : state.resources.titanium;
  $('#titanium-stock').textContent = state.gameConfig.unlimitedResources
    ? 'Unlimited · Developer Mode'
    : state.resources.titanium + ' units available';
  $('#connected-count').textContent = connectedHullCount(state) + ' tiles';
  $('#ship-hull-count').textContent = shipHullTileCount(state) + ' tiles';
  sectionsPanel?.refresh();
  $('#pawn-ap').textContent = state.pawn.op + ' / ' + state.pawn.maxOP;
  $('#pawn-position').textContent = state.pawn.x + ', ' + state.pawn.y;
  $('#mode-label').textContent = state.activeTool
    ? state.activeTool === 'prefab'
      ? 'PLACE MODULE · ' +
        (getBuildable(state.selectedPrefab)?.legacyId ?? state.selectedPrefab).toUpperCase()
      : 'BUILD MODE · ' + state.activeTool.toUpperCase()
    : 'SELECT / COMMAND MODE';
  $('#next-turn').classList.toggle('turn-ready', state.pawn.op === 0);
  $('#next-turn').classList.toggle('turn-pending', state.pawn.op > 0);
  gridBtn.textContent = state.map.gridVisible ? 'GRID: ON' : 'GRID: OFF';
  gridBtn.setAttribute('aria-pressed', String(state.map.gridVisible));
}
