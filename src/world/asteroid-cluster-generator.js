import { generateCosmicBody } from '../systems/cosmic-body-generator.js';
import { createVisibility } from '../systems/visibility-manager.js';
const key = (x, y) => x + ',' + y;
function seededRandom(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function bodyCellsFitCircle(cells, dx, dy, cx, cy, radius) {
  return cells.every((cell) => Math.hypot(cell.x + dx - cx, cell.y + dy - cy) <= radius);
}
function bodyCellsSeparated(cells, placed) {
  const occupied = new Set();
  for (const body of placed) for (const cell of body.cells) occupied.add(key(cell.x, cell.y));
  for (const cell of cells) {
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++)
        if (occupied.has(key(cell.x + ox, cell.y + oy))) return false;
  }
  return true;
}
export function generateAsteroidForState(s, params = {}) {
  const total = Math.max(1, Math.min(8, Math.floor(Number(params.bodyCount) || 1))),
    seed = Number(params.seed) >>> 0,
    anchor = s.map.anchor ?? { x: 192, y: 64 },
    majorW = Math.max(3, Math.floor(params.width || 70)),
    majorH = Math.max(3, Math.floor(params.height || 28)),
    rng = seededRandom(seed ^ 0x71a57),
    cavityTotal = Math.max(0, Math.min(20, Math.floor(params.cavityCount || 0))),
    percent = Math.max(0, Math.min(30, Number(params.cavitySizePercent) || 0));
  const major = generateCosmicBody({
    seed,
    x: 0,
    y: 0,
    width: majorW,
    height: majorH,
    bodyCount: 1,
    cavitySizePercent: percent,
    cavityCount: Math.floor(cavityTotal / total) + (cavityTotal % total > 0 ? 1 : 0),
    interior: 'mixed',
    roundness: 0.82,
    irregularity: 0.12,
  });
  const majorSolid = major.solidCells.length;
  if (!majorSolid) throw new Error('MAJOR BODY GENERATION FAILED');
  const radius = Math.min(62, Math.ceil(Math.max(majorW, majorH) * 0.5 * 1.25));
  const bodies = [
    {
      id: 'MAJOR-01',
      role: 'major',
      width: majorW,
      height: majorH,
      cells: major.cells,
      solidCells: major.solidCells,
      cavityTileCount: major.cavityTileCount,
      cavityGroupCount: major.cavityGroupCount,
      seed,
    },
  ];
  const placed = [
    {
      cells: major.cells.map((c) => ({
        ...c,
        x: c.x + anchor.x - Math.floor(majorW / 2),
        y: c.y + anchor.y - Math.floor(majorH / 2),
      })),
    },
  ];
  const majorDX = anchor.x - Math.floor(majorW / 2),
    majorDY = anchor.y - Math.floor(majorH / 2);
  for (let i = 0; i < major.cells.length; i++) {
    major.cells[i].x += majorDX;
    major.cells[i].y += majorDY;
    major.cells[i].bodyId = 'MAJOR-01';
    major.cells[i].bodyRole = 'major';
  }
  const minorCount = total - 1,
    minorBaseScale = minorCount ? Math.min(0.34, 0.34 / Math.sqrt(minorCount)) : 0;
  for (let i = 0; i < minorCount; i++) {
    const scale = minorBaseScale * (0.55 + rng() * 0.25),
      mw = Math.max(3, Math.floor(majorW * scale)),
      mh = Math.max(3, Math.floor(majorH * scale));
    const cavitiesForBody = Math.floor(cavityTotal / total) + (i + 1 < cavityTotal % total ? 1 : 0);
    const generated = generateCosmicBody({
      seed: (seed + (i + 1) * 7919) >>> 0,
      x: 0,
      y: 0,
      width: mw,
      height: mh,
      bodyCount: 1,
      cavitySizePercent: percent,
      cavityCount: cavitiesForBody,
      interior: 'mixed',
      roundness: 0.82,
      irregularity: 0.12,
    });
    const candidates = [];
    for (let attempt = 0; attempt < 900; attempt++) {
      const angle = rng() * Math.PI * 2,
        radial = Math.sqrt(rng()) * Math.max(1, radius - Math.max(mw, mh) * 0.5 - 1);
      const dx = Math.round(anchor.x + Math.cos(angle) * radial - Math.floor(mw / 2)),
        dy = Math.round(anchor.y + Math.sin(angle) * radial - Math.floor(mh / 2));
      if (!bodyCellsFitCircle(generated.cells, dx, dy, anchor.x, anchor.y, radius)) continue;
      const candidate = generated.cells.map((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      if (!bodyCellsSeparated(candidate, placed)) continue;
      candidates.push({ dx, dy, candidate });
      break;
    }
    if (!candidates.length)
      throw new Error(
        'NOT ENOUGH ROOM INSIDE GENERATION RADIUS FOR ' +
          minorCount +
          ' MINOR BODIES. REDUCE BODY COUNT OR SIZE.'
      );
    const placement = candidates[0],
      id = 'MINOR-' + String(i + 1).padStart(2, '0');
    for (const cell of generated.cells) {
      cell.x += placement.dx;
      cell.y += placement.dy;
      cell.bodyId = id;
      cell.bodyRole = 'minor';
    }
    bodies.push({
      id,
      role: 'minor',
      width: mw,
      height: mh,
      cells: generated.cells,
      solidCells: generated.solidCells,
      cavityTileCount: generated.cavityTileCount,
      cavityGroupCount: generated.cavityGroupCount,
      seed: generated.seed,
    });
    placed.push({ cells: placement.candidate });
  }
  const allCells = bodies.flatMap((body) => body.cells),
    solidCells = allCells.filter((c) => c.kind === 'solid'),
    cavityCells = allCells.filter((c) => c.kind === 'cavity');
  if (solidCells.filter((c) => c.bodyRole === 'major').length / solidCells.length < 0.5)
    throw new Error('MAJOR BODY MUST CONTAIN AT LEAST 50% OF ALL ROCK TILES.');
  const body = {
    id: 'CLUSTER-' + String(seed).padStart(4, '0'),
    seed,
    x: anchor.x,
    y: anchor.y,
    width: majorW,
    height: majorH,
    bodies,
    cells: allCells,
    solidCells,
    occupiedTileCount: solidCells.length,
    cavityTileCount: cavityCells.length,
    cavityGroupCount: new Set(cavityCells.map((c) => c.cavityGroup)).size,
    bodyCount: total,
    majorBody: bodies[0],
    generationArea: { x: anchor.x, y: anchor.y, radius },
    outerLookup: Object.fromEntries(allCells.map((c) => [key(c.x, c.y), true])),
    cellLookup: Object.fromEntries(solidCells.map((c) => [key(c.x, c.y), c])),
    groundLookup: Object.fromEntries(cavityCells.map((c) => [key(c.x, c.y), c])),
    cavities: cavityCells.map((c) => ({
      x: c.x,
      y: c.y,
      type: 'ground',
      group: c.cavityGroup,
      bodyId: c.bodyId,
      walkable: true,
      fogExempt: true,
    })),
  };
  s.map.asteroid = body;
  s.map.asteroidVisibility = createVisibility(body, { revealAll: s.gameConfig.devToolsEnabled });
  return body;
}
