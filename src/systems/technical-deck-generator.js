const key = (x, y) => x + ',' + y;

export const TECHNICAL_DECK_LEVELS = ['Z+2', 'Z+1', 'Z-1', 'Z-2'];
export const DECK_ENVIRONMENT_TAGS = Object.freeze({
  'Z+2': 'DESTRUCTIBLE',
  'Z+1': 'INDESTRUCTIBLE',
  Z0: 'DESTRUCTIBLE',
  'Z-1': 'INDESTRUCTIBLE',
  'Z-2': 'DESTRUCTIBLE',
});
export const DECK_LEVELS = ['Z+2', 'Z+1', 'Z0', 'Z-1', 'Z-2'];

/** Build derived technical decks from the exact set of Z0 Hull tiles. */
export function createTechnicalDecks(zeroLevelTiles) {
  const footprint = Object.entries(zeroLevelTiles)
    .filter(([, tile]) => tile?.hull)
    .map(([position]) => position)
    .sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number);
      const [bx, by] = b.split(',').map(Number);
      return ay - by || ax - bx;
    });
  if (!footprint.length) return {};

  const points = footprint.map((position) => position.split(',').map(Number));
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const shaftX = Math.floor((minX + maxX - 1) / 2);
  const shaftY = Math.floor((minY + maxY - 1) / 2);
  const footprintSet = new Set(footprint);
  const shaft = [];
  for (let y = shaftY; y < shaftY + 2; y++)
    for (let x = shaftX; x < shaftX + 2; x++)
      if (footprintSet.has(key(x, y))) shaft.push({ x, y });

  return Object.fromEntries(
    TECHNICAL_DECK_LEVELS.map((level) => {
      const shaftSet = new Set(shaft.map(({ x, y }) => key(x, y)));
      const tiles = {};
      for (const position of footprint) {
        if (shaftSet.has(position)) continue;
        tiles[position] = {
          type: 'SHIP_HULL',
          material: 'SHIP_HULL',
          buildable: false,
          demolishable: false,
          repairable: false,
          undamageable: true,
        };
      }
      return [
        level,
        {
          level,
          source: 'Z0',
          environmentTag: DECK_ENVIRONMENT_TAGS[level],
          footprint: [...footprint],
          shaft: shaft.map((point) => ({ ...point })),
          tiles,
        },
      ];
    })
  );
}

/**
 * Rebuild derived decks and keep their shared 2x2 shaft opening synchronized.
 * Existing manual and pressure locks are retained across Hull footprint edits.
 */
export function syncTechnicalDecksState(state) {
  state.technicalDecks = createTechnicalDecks(state.map.tiles);
  const shaft = state.technicalDecks['Z+2']?.shaft ?? [];
  state.accessShaft.cells = shaft.map(({ x, y }) => ({ x, y }));
  state.accessShaft.w = 2;
  state.accessShaft.h = 2;
  if (shaft.length) {
    state.accessShaft.x = Math.min(...shaft.map(({ x }) => x));
    state.accessShaft.y = Math.min(...shaft.map(({ y }) => y));
  }
  state.accessShaft.decks ??= {};
  for (const level of DECK_LEVELS)
    state.accessShaft.decks[level] ??= { manualLock: false, autoLock: false, lockReason: null };
  return state.technicalDecks;
}
