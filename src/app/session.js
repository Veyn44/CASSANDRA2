import { createSectionsPanel } from '../ui/sections-panel.js';
import { createInitialState } from '../systems/state-factory.js';
import { createRenderer } from '../core/renderer.js';
import { bindInput } from '../core/input.js';
import { bindDevPanel } from '../ui/dev-panel.js';

export function startGameSession(mode, { $, canvas, refresh, noteText }) {
  const dev = mode === 'dev';
  const state = createInitialState({ mode });
  state.paused = false;

  const renderer = createRenderer(canvas, state);
  let sectionsPanel = null;

  const disposeInput = bindInput(
    canvas,
    state,
    renderer,
    refresh,
    () => {
      state.activeTool = null;
      document
        .querySelectorAll('[data-tool]')
        .forEach((button) => button.classList.remove('active'));
      $('#erase-tool').classList.remove('selected');
      refresh();
    },
    noteText,
    (panel) => sectionsPanel?.selectPanel(panel.id)
  );

  const devPanel = dev ? bindDevPanel(state, refresh, noteText) : null;
  sectionsPanel = createSectionsPanel($('#sections-panel'), state, (message) => {
    noteText(message);
    refresh();
  });

  $('#dev-tools-wrap').hidden = !dev;
  $('#dev-indicator').hidden = !dev;
  $('#dev-tools-menu').hidden = true;
  $('#ast-gen-panel').hidden = true;
  $('#dev-creator-toggle').textContent = 'DEV CREATOR';
  $('#damage-simulator-toggle').textContent = 'DAMAGE SIMULATOR: OFF';
  $('#pause-menu').hidden = true;
  $('#leave-confirm').hidden = true;
  $('#main-menu').hidden = true;
  $('#game-shell').hidden = false;

  requestAnimationFrame(() => {
    renderer.resize();
    refresh();
  });

  function dispose() {
    disposeInput();
    devPanel?.close();
    $('#ast-gen-panel').hidden = true;
    $('#generate-asteroid').onclick = null;
    $('#generate-next-asteroid').onclick = null;
    sectionsPanel?.close();
  }

  return { dev, state, renderer, devPanel, sectionsPanel, dispose };
}
