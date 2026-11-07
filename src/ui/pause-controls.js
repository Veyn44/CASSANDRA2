export function bindPauseControls({
  $,
  getState,
  shell,
  options,
  pauseMenu,
  leaveConfirm,
  pause,
  resume,
  askLeave,
  returnToMenu,
}) {
  $('#pause-continue').onclick = resume;
  $('#pause-main-menu').onclick = askLeave;
  $('#confirm-leave-yes').onclick = returnToMenu;
  $('#confirm-leave-no').onclick = () => {
    leaveConfirm.hidden = true;
    pauseMenu.hidden = false;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const state = getState();
      if (!leaveConfirm.hidden) {
        leaveConfirm.hidden = true;
        pauseMenu.hidden = false;
      } else if (!pauseMenu.hidden) resume();
      else if (state && !shell.hidden) pause();
      else if (!options.hidden) options.hidden = true;
    }
  });
}
