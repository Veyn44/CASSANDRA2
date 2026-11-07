export function bindMenuControls({ $, startGame }) {
  $('#new-game').onclick = () => startGame('normal');
  $('#dev-new-game').onclick = () => startGame('dev');
  $('#open-options').onclick = () => ($('#options-panel').hidden = false);
  $('#options-back').onclick = () => ($('#options-panel').hidden = true);

  $('#modules-tab').onclick = () => {
    const drawer = $('#module-drawer');
    drawer.hidden = !drawer.hidden;
    $('#modules-tab').classList.toggle('selected', !drawer.hidden);
    $('#build-categories').hidden = true;
    $('#build-menu-toggle').classList.remove('selected');
  };

  $('#close-module-drawer').onclick = () => {
    $('#module-drawer').hidden = true;
    $('#modules-tab').classList.remove('selected');
  };
}
