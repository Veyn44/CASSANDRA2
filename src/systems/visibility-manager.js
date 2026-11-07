const key = (x, y) => x + ',' + y;
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Visibility is player knowledge only. It never changes or removes world cells.
export function getSurfaceCells(body) {
  const surface = [];
  for (const cell of body.solidCells ?? body.cells.filter((cell) => cell.kind === 'solid')) {
    const isSurface = DIRECTIONS.some(
      ([dx, dy]) => !body.outerLookup[key(cell.x + dx, cell.y + dy)]
    );
    if (isSurface) surface.push({ x: cell.x, y: cell.y });
  }
  return surface;
}

export function createVisibility(body, { revealAll = false } = {}) {
  const visible = {};
  const initial = revealAll ? body.cells : getSurfaceCells(body);
  for (const cell of initial) visible[key(cell.x, cell.y)] = true;
  return { visible };
}

export function revealCells(visibility, cells) {
  for (const cell of cells) visibility.visible[key(cell.x, cell.y)] = true;
  return visibility;
}

export function isCellVisible(visibility, x, y) {
  return visibility.visible[key(x, y)] === true;
}
