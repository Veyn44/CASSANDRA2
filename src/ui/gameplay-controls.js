import { endTurn } from '../systems/turn-lifecycle.js';

export function bindGameplayControls({
  $,
  getState,
  categories,
  buildBtn,
  materialBtn,
  noteText,
  refresh,
  gridBtn,
  cancelTool,
}) {
  buildBtn.onclick = () => {
    const state = getState();
    categories.hidden = !categories.hidden;
    state.activeTool = null;
    $('#erase-tool').classList.remove('selected');
    buildBtn.classList.toggle('selected', !categories.hidden);
    noteText(
      categories.hidden ? 'Material selection closed.' : 'Select the construction material.'
    );
    refresh();
  };
  materialBtn.onclick = () => {
    materialBtn.classList.add('active');
    noteText('TITANIUM SELECTED · MATERIAL FOR CONSTRUCTION');
  };
  $('#erase-tool').onclick = () => {
    const state = getState();
    state.activeTool = 'erase';
    categories.hidden = true;
    buildBtn.classList.remove('selected');
    document.querySelectorAll('[data-tool]').forEach((b) => b.classList.remove('active'));
    $('#erase-tool').classList.add('selected');
    noteText(
      'Remove a module or erase a plan; completed Hull / Wall can be marked for demolition.'
    );
    refresh();
  };
  $('#pawn-select').onclick = () => {
    const state = getState();
    state.pawn.selected = true;
    state.selectedObject = null;
    cancelTool();
    noteText('PAWN SELECTED · RIGHT-CLICK A WALKABLE TILE OR CONSTRUCTION PLAN.');
  };
  gridBtn.onclick = () => {
    const state = getState();
    state.map.gridVisible = !state.map.gridVisible;
    refresh();
  };
  $('#next-turn').onclick = () => {
    const state = getState();
    const result = endTurn(state);
    noteText(result.message);
    refresh();
  };
}
