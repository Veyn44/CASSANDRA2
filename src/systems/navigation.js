const key = (x, y) => x + ',' + y;
const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export function isBlocked(s, x, y) {
  const asteroid = s.map.asteroid,
    rock = asteroid?.cellLookup?.[key(x, y)],
    ground = asteroid?.groundLookup?.[key(x, y)];
  if (rock) return true;
  if (ground?.walkable) return false;
  const objects = Object.values(s.map.objects),
    door = objects.some(
      (o) =>
        o.family === 'STR' &&
        o.type !== 'STR0001' &&
        o.built &&
        x >= o.x &&
        y >= o.y &&
        x < o.x + o.w &&
        y < o.y + o.h
    ),
    furniture = objects.some(
      (o) => o.family === 'FUR' && x >= o.x && y >= o.y && x < o.x + o.w && y < o.y + o.h
    );
  const t = s.map.tiles[key(x, y)];
  if (!t?.hull || (t.wall && !door) || t.aluminiumWall) return true;
  if (furniture) return false;
  return objects.some(
    (o) =>
      x >= o.x &&
      y >= o.y &&
      x < o.x + o.w &&
      y < o.y + o.h &&
      o.family !== 'FUR' &&
      !(o.family === 'STR' && o.type !== 'STR0001' && o.built)
  );
}
export function findPath(s, target) {
  const start = { x: s.pawn.x, y: s.pawn.y },
    q = [start],
    came = new Map([[key(start.x, start.y), null]]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i],
      pk = key(p.x, p.y);
    if (p.x === target.x && p.y === target.y) {
      const path = [];
      let k = pk;
      while (k !== null) {
        const [a, b] = k.split(',').map(Number);
        path.push({ x: a, y: b });
        k = came.get(k);
      }
      return path.reverse();
    }
    for (const [dx, dy] of dirs) {
      const x = p.x + dx,
        y = p.y + dy,
        k = key(x, y);
      if (
        x < 0 ||
        y < 0 ||
        x >= s.map.width ||
        y >= s.map.height ||
        came.has(k) ||
        isBlocked(s, x, y)
      )
        continue;
      came.set(k, pk);
      q.push({ x, y });
    }
  }
  return null;
}
export function findWorkPath(s, x, y, w = 1, h = 1) {
  let best = null;
  const candidates = new Set();
  for (let xx = x - 1; xx <= x + w; xx++) {
    candidates.add(key(xx, y - 1));
    candidates.add(key(xx, y + h));
  }
  for (let yy = y; yy < y + h; yy++) {
    candidates.add(key(x - 1, yy));
    candidates.add(key(x + w, yy));
  }
  for (const candidate of candidates) {
    const [xx, yy] = candidate.split(',').map(Number);
    if (xx < 0 || yy < 0 || xx >= s.map.width || yy >= s.map.height || isBlocked(s, xx, yy))
      continue;
    const path = findPath(s, { x: xx, y: yy });
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}
