export function createSessionLifecycle({
  $,
  getState,
  setState,
  setRenderer,
  setDevPanel,
  setSectionsPanel,
  getSectionsPanel,
  getSessionCleanup,
  setSessionCleanup,
}) {
  function pause() {
    const state = getState();
    if (!state || $('#game-shell').hidden) return;
    getSectionsPanel()?.close();
    state.paused = true;
    $('#pause-menu').hidden = false;
    $('#dev-tools-menu').hidden = true;
    $('#module-drawer').hidden = true;
    $('#ast-gen-panel').hidden = true;
  }

  function resume() {
    const state = getState();
    if (!state) return;
    state.paused = false;
    $('#pause-menu').hidden = true;
  }

  function askLeave() {
    $('#pause-menu').hidden = true;
    $('#leave-confirm').hidden = false;
  }

  function returnToMenu() {
    const state = getState();
    getSessionCleanup()?.();
    setSessionCleanup(null);
    if (state) state.paused = true;
    $('#leave-confirm').hidden = true;
    $('#game-shell').hidden = true;
    $('#main-menu').hidden = false;
    $('#options-panel').hidden = true;
    setState(null);
    setRenderer(null);
    setDevPanel(null);
    setSectionsPanel(null);
  }

  return { pause, resume, askLeave, returnToMenu };
}
