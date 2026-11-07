export function updateSidebar(s) {
  document.querySelector('#turn-label').textContent =
    'DAY ' + String(s.day).padStart(2, '0') + ' · TURN ' + String(s.turn).padStart(2, '0');
}
