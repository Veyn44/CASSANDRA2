export const ASTEROID_CELL_KINDS = Object.freeze({
  ROCK: 'solid',
  NATURAL_CAVITY: 'cavity',
  EXCAVATED_FLOOR: 'floor',
});
const key = (x, y) => x + ',' + y;
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function createRandom(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ ((t >>> 14) >>> 0)) >>> 0) / 4294967296;
  };
}
function smoothNoise(random, width, height, scale = 5) {
  const cols = Math.max(2, Math.ceil(width / scale) + 1),
    rows = Math.max(2, Math.ceil(height / scale) + 1),
    grid = Array.from({ length: rows }, () => Array.from({ length: cols }, random));
  return (x, y) => {
    const gx = x / scale,
      gy = y / scale,
      ix = Math.floor(gx),
      iy = Math.floor(gy),
      fx = gx - ix,
      fy = gy - iy,
      sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy),
      a = grid[iy][ix] * (1 - sx) + grid[iy][ix + 1] * sx,
      b = grid[iy + 1][ix] * (1 - sx) + grid[iy + 1][ix + 1] * sx;
    return a * (1 - sy) + b * sy;
  };
}
function makePart({ seed, x, y, width, height, roundness, irregularity, index }) {
  const random = createRandom(seed),
    noise = smoothNoise(
      random,
      width,
      height,
      Math.max(3, Math.min(9, Math.min(width, height) / 3))
    ),
    cells = [],
    cx = (width - 1) / 2,
    cy = (height - 1) / 2,
    rx = Math.max(1, width * 0.5),
    ry = Math.max(1, height * 0.5),
    elongation = Math.max(0.45, Math.min(1.8, width / height / 2.5 + 0.6)),
    threshold = Math.max(0.35, Math.min(0.98, roundness));
  for (let yy = 0; yy < height; yy++)
    for (let xx = 0; xx < width; xx++) {
      const nx = (xx - cx) / rx,
        ny = (yy - cy) / ry,
        radial = Math.sqrt(nx * nx * elongation + (ny * ny) / elongation),
        edge = (noise(xx, yy) - 0.5) * 2 * irregularity;
      if (radial <= threshold + edge)
        cells.push({
          x: x + xx,
          y: y + yy,
          materialId: 'MAT0001',
          kind: ASTEROID_CELL_KINDS.ROCK,
          part: index,
        });
    }
  return cells;
}
function carveCavities(parts, target, count, random) {
  const all = parts.flatMap((p) => p.cells),
    solidLookup = new Set(all.map((c) => key(c.x, c.y))),
    interiors = parts.map((part) =>
      part.cells.filter((c) =>
        DIRECTIONS.every(([dx, dy]) => solidLookup.has(key(c.x + dx, c.y + dy)))
      )
    );
  const validParts = interiors
    .map((cells, index) => ({ index, cells }))
    .filter((p) => p.cells.length > 0);
  if (!target || !count || !validParts.length) return [];
  const cavityTotal = Math.min(count, target),
    allocations = Array.from(
      { length: cavityTotal },
      (_, i) => Math.floor(target / cavityTotal) + (i < target % cavityTotal ? 1 : 0)
    ),
    assignments = Array.from({ length: cavityTotal }, (_, i) => validParts[i % validParts.length]),
    used = new Set(),
    groupOwner = new Map(),
    carved = [];
  for (let group = 0; group < cavityTotal; group++) {
    const pool = assignments[group].cells.filter(
      (c) =>
        !used.has(key(c.x, c.y)) &&
        !DIRECTIONS.some(([dx, dy]) => used.has(key(c.x + dx, c.y + dy)))
    );
    if (!pool.length) continue;
    const center = pool[Math.floor(random() * pool.length)],
      wanted = allocations[group],
      groupCells = [center],
      frontier = new Map();
    used.add(key(center.x, center.y));
    groupOwner.set(key(center.x, center.y), group);
    function addNeighbors(cell) {
      for (const [dx, dy] of DIRECTIONS) {
        const nx = cell.x + dx,
          ny = cell.y + dy,
          k = key(nx, ny);
        if (used.has(k) || frontier.has(k)) continue;
        const touchesOtherGroup = DIRECTIONS.some(([ax, ay]) => {
          const owner = groupOwner.get(key(nx + ax, ny + ay));
          return owner !== undefined && owner !== group;
        });
        if (touchesOtherGroup) continue;
        const next = pool.find((c) => c.x === nx && c.y === ny);
        if (next) frontier.set(k, next);
      }
    }
    addNeighbors(center);
    while (groupCells.length < wanted && frontier.size) {
      const candidates = [...frontier.values()]
        .map((c) => ({
          c,
          score:
            Math.pow((c.x - center.x) / Math.max(2, Math.sqrt(wanted) * 0.85), 2) +
            Math.pow((c.y - center.y) / Math.max(2, Math.sqrt(wanted) * 0.72), 2) +
            random() * 0.28,
        }))
        .sort((a, b) => a.score - b.score);
      const next = candidates[0].c,
        k = key(next.x, next.y);
      frontier.delete(k);
      used.add(k);
      groupOwner.set(k, group);
      groupCells.push(next);
      addNeighbors(next);
    }
    for (const cell of groupCells) {
      cell.kind = ASTEROID_CELL_KINDS.NATURAL_CAVITY;
      cell.materialId = null;
      cell.cavityGroup = group;
      cell.tileType = 'asteroid-ground';
      cell.ground = true;
      cell.walkable = true;
      cell.fogExempt = true;
      carved.push(cell);
    }
  }
  return carved;
}
export function generateCosmicBody({
  seed = 1,
  x = 0,
  y = 0,
  width = 70,
  height = 28,
  roundness = 0.82,
  irregularity = 0.18,
  interior = 'mixed',
  cavityDensity = 0.035,
  cavitySizePercent,
  vacancyPercent,
  cavityCount = 1,
  bodyCount = 1,
  gap = 4,
} = {}) {
  const w = Math.max(3, Math.floor(width)),
    h = Math.max(3, Math.floor(height)),
    count = Math.max(1, Math.min(8, Math.floor(bodyCount))),
    spacing = Math.max(2, Math.floor(gap)),
    partWidth = Math.max(3, Math.floor((w - (count - 1) * spacing) / count)),
    actualWidth = partWidth * count + spacing * (count - 1),
    parts = [],
    cells = [];
  for (let i = 0; i < count; i++) {
    const px = x + i * (partWidth + spacing),
      part = makePart({
        seed: (Number(seed) + i * 7919) >>> 0,
        x: px,
        y,
        width: partWidth,
        height: h,
        roundness,
        irregularity,
        index: i,
      });
    parts.push({ id: 'PART' + (i + 1), x: px, y, width: partWidth, height: h, cells: part });
    cells.push(...part);
  }
  const separationCells = [];
  for (let i = 0; i < count - 1; i++) {
    const gapX = x + (i + 1) * partWidth + i * spacing;
    for (let gy = 0; gy < h; gy++)
      for (let gx = 0; gx < spacing; gx++)
        separationCells.push({
          x: gapX + gx,
          y: y + gy,
          kind: ASTEROID_CELL_KINDS.NATURAL_CAVITY,
          cavityType: 'separation',
          ground: false,
          walkable: false,
        });
  }
  const random = createRandom((Number(seed) ^ 0xa53c9e1) >>> 0),
    percent = Math.max(
      0,
      Math.min(30, Number(cavitySizePercent ?? vacancyPercent ?? cavityDensity * 100))
    ),
    target =
      interior === 'solid'
        ? 0
        : Math.min(Math.floor(cells.length * 0.3), Math.round((cells.length * percent) / 100)),
    cavities = carveCavities(
      parts,
      target,
      Math.max(0, Math.min(20, Math.floor(cavityCount))),
      random
    ),
    solidCells = cells.filter((c) => c.kind === ASTEROID_CELL_KINDS.ROCK),
    cellLookup = Object.fromEntries(solidCells.map((c) => [key(c.x, c.y), c])),
    body = {
      id: 'AST' + String(Number(seed) >>> 0).padStart(4, '0'),
      seed: Number(seed) >>> 0,
      x,
      y,
      width: actualWidth,
      height: h,
      requestedWidth: w,
      parts,
      cells,
      separationCells,
      outerLookup: Object.fromEntries(cells.map((c) => [key(c.x, c.y), true])),
      cellLookup,
      cavities: cavities.map((c) => ({
        x: c.x,
        y: c.y,
        type: 'ground',
        group: c.cavityGroup,
        walkable: true,
        fogExempt: true,
      })),
      solidCells,
      occupiedTileCount: solidCells.length,
      cavityTileCount: cavities.length,
      cavityGroupCount: new Set(cavities.map((c) => c.cavityGroup)).size,
      bodyCount: count,
    };
  return body;
}
