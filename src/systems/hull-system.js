const key = (x, y) => x + ',' + y;
const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export function connectedHullSet(s) {
  const seen = new Set(),
    q = [],
    core = s.map.core,
    rx = core.x - 1,
    ry = core.y - 1;
  for (let x = rx - 1; x <= rx + 2; x++)
    for (const y of [ry - 1, ry + 2]) {
      const k = key(x, y);
      if (s.map.tiles[k]?.hull && !seen.has(k)) {
        seen.add(k);
        q.push({ x, y });
      }
    }
  for (let y = ry; y < ry + 2; y++)
    for (const x of [rx - 1, rx + 2]) {
      const k = key(x, y);
      if (s.map.tiles[k]?.hull && !seen.has(k)) {
        seen.add(k);
        q.push({ x, y });
      }
    }
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const [dx, dy] of dirs) {
      const x = p.x + dx,
        y = p.y + dy,
        k = key(x, y),
        t = s.map.tiles[k];
      if (t?.hull && !seen.has(k)) {
        seen.add(k);
        q.push({ x, y });
      }
    }
  }
  return seen;
}
export function connectedHullCount(s) {
  return connectedHullSet(s).size;
}
export function shipHullTileCount(s) {
  return Object.values(s.map.tiles).filter((tile) => tile?.hull).length;
}
