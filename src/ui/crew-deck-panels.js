const DECKS = [
  { id: 'Z+2', label: 'Z +2' },
  { id: 'Z+1', label: 'Z +1' },
  { id: 'Z0', label: 'Z 0' },
  { id: 'Z-1', label: 'Z -1' },
  { id: 'Z-2', label: 'Z -2' },
];
const PAWN_COLOR = '#d76b73';

function deckFootprint(state, deckId) {
  if (deckId === 'Z0') {
    return Object.entries(state.map.tiles)
      .filter(([, tile]) => tile?.hull)
      .map(([position]) => position);
  }
  const deck = state.technicalDecks?.[deckId];
  return deck ? deck.footprint : [];
}

function renderMiniMap(state, deckId, color) {
  const deck = deckId === 'Z0' ? null : state.technicalDecks?.[deckId];
  const footprint = deckFootprint(state, deckId);
  if (!footprint.length) return '<div class="deck-mini-map empty">NO HULL DATA</div>';
  const points = footprint.map((key) => key.split(',').map(Number));
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const shaft = new Set((deck?.shaft ?? []).map(({ x, y }) => x + ',' + y));
  const pawn = state.pawn;
  const pawnHere = (pawn.deck ?? 'Z0') === deckId;
  const cells = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = x + ',' + y;
      const inFootprint = footprint.includes(key);
      const isPawn = pawnHere && pawn.x === x && pawn.y === y && inFootprint && !shaft.has(key);
      cells.push(
        '<span class="deck-mini-cell ' +
          (inFootprint ? (shaft.has(key) ? 'shaft' : 'hull') : 'void') +
          (isPawn ? ' has-pawn' : '') +
          '"' +
          (isPawn ? ' style="--pawn-color:' + color + '"' : '') +
          '></span>'
      );
    }
  }
  return '<div class="deck-mini-map" style="grid-template-columns:repeat(' +
    (maxX - minX + 1) +
    ',minmax(0,1fr));grid-template-rows:repeat(' +
    (maxY - minY + 1) +
    ',minmax(0,1fr))">' +
    cells.join('') +
    '</div>';
}

export function createCrewDeckPanels(state, refresh, note) {
  const deckRoot = document.querySelector('#deck-list');
  const crewRoot = document.querySelector('#crew-list');
  const color = state.pawn.color ?? PAWN_COLOR;

  function render() {
    if (!deckRoot || !crewRoot) return;
    deckRoot.innerHTML = DECKS.map(({ id, label }) =>
      '<div class="deck-row ' +
      (state.activeDeck === id ? 'active' : '') +
      '"><button class="deck-select" data-deck="' +
      id +
      '" aria-label="Show deck ' +
      label +
      '"><span class="deck-label">' +
      label +
      '</span>' +
      renderMiniMap(state, id, color) +
      '</button><div class="deck-pawn-indicators" aria-label="Pawns on ' +
      label +
      '">' +
      ((state.pawn.deck ?? 'Z0') === id
        ? '<i style="--pawn-color:' + color + '" title="' + state.pawn.name + '"></i>'
        : '<span class="no-pawns">—</span>') +
      '</div></div>'
    ).join('');

    const pawn = state.pawn;
    crewRoot.innerHTML =
      '<button class="crew-card ' +
      (pawn.selected ? 'active' : '') +
      '" id="crew-researcher" type="button">' +
      '<span class="crew-portrait" aria-hidden="true"><b>R</b></span>' +
      '<span class="crew-details"><strong>' +
      pawn.name +
      '</strong><small>HUMAN · LEVEL ' +
      String(pawn.level).padStart(2, '0') +
      '</small><span class="crew-stats"><i>HP <b>' +
      pawn.health +
      '%</b></i><i>AP <b>' +
      pawn.op +
      ' / ' +
      pawn.maxOP +
      '</b></i></span></span><i class="crew-color" style="--pawn-color:' +
      color +
      '"></i></button>';

    deckRoot.querySelectorAll('[data-deck]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextDeck = button.dataset.deck;
        if (!DECKS.some((deck) => deck.id === nextDeck)) return;
        state.activeDeck = nextDeck;
        state.activeTool = null;
        state.selectedObject = null;
        refresh();
        note('DECK VIEW · ' + nextDeck);
      });
    });
    crewRoot.querySelector('#crew-researcher')?.addEventListener('click', () => {
      state.pawn.selected = true;
      state.selectedObject = null;
      state.selection = state.pawn.id;
      refresh();
      note('CREW SELECTED · ' + state.pawn.name.toUpperCase());
    });
  }

  render();
  return { refresh: render, dispose() {
    if (deckRoot) deckRoot.innerHTML = '';
    if (crewRoot) crewRoot.innerHTML = '';
  } };
}

export function bindCrewDeckPanels(state, refresh, note) {
  return createCrewDeckPanels(state, refresh, note);
}
