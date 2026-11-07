export function bindSectionsControls({ $, getState, getSectionsPanel }) {
  $('#sections-toggle').onclick = () => {
    const state = getState();
    if (!state || state.paused) return;
    getSectionsPanel()?.toggle();
  };
}
