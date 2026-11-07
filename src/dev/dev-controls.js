export function bindDevControls({
  $,
  isDev,
  getState,
  getDevPanel,
  noteText,
  refresh,
  exportShipLayout,
}) {
  $('#dev-tools-button').onclick = () => {
    $('#dev-tools-menu').hidden = !$('#dev-tools-menu').hidden;
    $('#dev-tools-button').setAttribute('aria-expanded', String(!$('#dev-tools-menu').hidden));
  };
  $('#open-ast-gen').onclick = () => {
    $('#dev-tools-menu').hidden = true;
    getDevPanel()?.open();
  };
  $('#close-ast-gen').onclick = () => getDevPanel()?.close();
  $('#dev-export-ship-layout').onclick = () => {
    $('#dev-tools-menu').hidden = true;
    exportShipLayout();
  };
  $('#dev-creator-toggle').onclick = () => {
    const state = getState();
    if (!isDev() || !state) return;
    state.devCreator = !state.devCreator;
    $('#dev-creator-toggle').textContent = state.devCreator ? 'DEV CREATOR: ON' : 'DEV CREATOR';
    noteText(
      state.devCreator
        ? 'DEV CREATOR ENABLED · ITEMS ARE BUILT IMMEDIATELY'
        : 'DEV CREATOR DISABLED · BLUEPRINT CONSTRUCTION'
    );
    refresh();
  };
  $('#damage-simulator-toggle').onclick = () => {
    const state = getState();
    if (!isDev() || !state) return;
    state.damageSimulator.active = !state.damageSimulator.active;
    $('#damage-simulator-toggle').textContent =
      'DAMAGE SIMULATOR: ' + (state.damageSimulator.active ? 'ON' : 'OFF');
    noteText(
      state.damageSimulator.active
        ? 'DAMAGE SIMULATOR ACTIVE · CLICK A HULL / WALL / DOOR TO APPLY 1–25% DAMAGE'
        : 'DAMAGE SIMULATOR DISABLED'
    );
    refresh();
  };
}
