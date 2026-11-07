const key = (x, y) => x + ',' + y;

export const TECHNICAL_DECK_LEVELS = ['Z+2', 'Z+1', 'Z-1', 'Z-2'];

/**
 * Build non-interactive technical decks from the exact set of Z0 Hull tiles.
 * The 2x2 central shaft is a void, not a buildable or damageable tile.
 */
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
          footprint: [...footprint],
          shaft: shaft.map((point) => ({ ...point })),
          tiles,
        },
      ];
    })
  );
}
