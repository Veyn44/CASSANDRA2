import { bindSectionsControls } from './ui/sections-controls.js';
import { bindPauseControls } from './ui/pause-controls.js';
import { bindGameplayControls } from './ui/gameplay-controls.js';
import { renderBuildCatalog } from './ui/build-catalog.js';
import { renderHud } from './ui/hud.js';
import { bindMenuControls } from './ui/menu-controls.js';
import { startGameSession } from './app/session.js';
import { createSessionLifecycle } from './app/session-lifecycle.js';
import { exportShipLayout as exportShipLayoutFile } from './dev/ship-layout-exporter.js';
import { bindDevControls } from './dev/dev-controls.js';
const $ = (selector) => document.querySelector(selector);
const shell = $('#game-shell'),
  options = $('#options-panel'),
  canvas = $('#game-canvas'),
  categories = $('#build-categories'),
  buildBtn = $('#build-menu-toggle'),
  materialBtn = $('#material-titanium'),
  note = $('#construction-note'),
  gridBtn = $('#grid-toggle'),
  pauseMenu = $('#pause-menu'),
  leaveConfirm = $('#leave-confirm');
let dev = false,
  state = null,
  renderer = null,
  devPanel = null,
  sectionsPanel = null,
  crewDeckPanels = null,
  disposeSession = null,
  activeCategory = 'core-systems';
const { pause, resume, askLeave, returnToMenu } = createSessionLifecycle({
  $,
  getState: () => state,
  setState: (value) => (state = value),
  setRenderer: (value) => (renderer = value),
  setDevPanel: (value) => (devPanel = value),
  setSectionsPanel: (value) => (sectionsPanel = value),
  getSectionsPanel: () => sectionsPanel,
  setCrewDeckPanels: (value) => (crewDeckPanels = value),
  getSessionCleanup: () => disposeSession,
  setSessionCleanup: (value) => (disposeSession = value),
});
function noteText(t) {
  note.textContent = t;
}
function refresh() {
  if (!state || !renderer) return;
  renderHud(state, renderer, sectionsPanel, gridBtn);
  crewDeckPanels?.refresh();
  renderBuildCatalog(
    state,
    activeCategory,
    (category) => (activeCategory = category),
    refresh,
    noteText
  );
}
function cancelTool() {
  state.activeTool = null;
  document.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('active'));
  $('#erase-tool').classList.remove('selected');
  refresh();
}
function exportShipLayout() {
  if (!dev || !state) return;
  exportShipLayoutFile(state, noteText);
}

bindMenuControls({ $, startGame: (mode) => start(mode) });

function start(mode = 'normal') {
  const session = startGameSession(mode, { $, canvas, refresh, noteText });
  ({ dev, state, renderer, devPanel, sectionsPanel, crewDeckPanels, dispose: disposeSession } = session);
}
bindSectionsControls({
  $,
  getState: () => state,
  getSectionsPanel: () => sectionsPanel,
});
bindDevControls({
  $,
  isDev: () => dev,
  getState: () => state,
  getDevPanel: () => devPanel,
  noteText,
  refresh,
  exportShipLayout,
});

bindGameplayControls({
  $,
  getState: () => state,
  categories,
  buildBtn,
  materialBtn,
  noteText,
  refresh,
  gridBtn,
  cancelTool,
});

bindPauseControls({
  $,
  getState: () => state,
  shell,
  options,
  pauseMenu,
  leaveConfirm,
  pause,
  resume,
  askLeave,
  returnToMenu,
});
window.addEventListener('resize', () => {
  if (renderer) {
    renderer.resize();
    renderer.draw();
  }
});
