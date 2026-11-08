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


const DECK_LEVELS = ['Z+2', 'Z+1', 'Z0', 'Z-1', 'Z-2'];
const shaftCells = (s) => new Set((s.accessShaft?.cells ?? []).map(({ x, y }) => key(x, y)));
function isBlockedOnDeck(s, deckId, x, y) {
  const k = key(x, y);
  if (deckId === 'Z0') return isBlocked(s, x, y);
  const deck = s.technicalDecks?.[deckId];
  if (!deck) return true;
  if (shaftCells(s).has(k)) return false;
  return !deck.tiles?.[k];
}
function reconstructDeckPath(came, endKey) {
  const path = []; let cursor = endKey;
  while (cursor !== null) { const [deck, x, y] = cursor.split('|'); path.push({ deck, x: Number(x), y: Number(y) }); cursor = came.get(cursor); }
  return path.reverse();
}
export function findDeckPath(s, target, targetDeck = s.activeDeck) {
  if (!s.devMode) return null;
  const startDeck = s.pawn.deck ?? 'Z0';
  if (!DECK_LEVELS.includes(targetDeck) || (targetDeck !== 'Z0' && !s.technicalDecks?.[targetDeck])) return null;
  if (s.accessShaft?.locked && startDeck !== targetDeck) return null;
  const encode = (p) => p.deck + '|' + p.x + '|' + p.y;
  const start = { deck: startDeck, x: s.pawn.x, y: s.pawn.y }, startKey = encode(start), q = [start], came = new Map([[startKey, null]]), shaft = shaftCells(s);
  for (let i = 0; i < q.length; i++) {
    const p = q[i], pk = encode(p);
    if (p.deck === targetDeck && p.x === target.x && p.y === target.y) return reconstructDeckPath(came, pk);
    const next = dirs.map(([dx, dy]) => ({ deck: p.deck, x: p.x + dx, y: p.y + dy }));
    if (shaft.has(key(p.x, p.y)) && !s.accessShaft?.locked) { const n = DECK_LEVELS.indexOf(p.deck); if (n > 0) next.push({ deck: DECK_LEVELS[n - 1], x: p.x, y: p.y }); if (n >= 0 && n < DECK_LEVELS.length - 1) next.push({ deck: DECK_LEVELS[n + 1], x: p.x, y: p.y }); }
    for (const point of next) { const nk = encode(point); if (came.has(nk) || point.x < 0 || point.y < 0 || point.x >= s.map.width || point.y >= s.map.height || isBlockedOnDeck(s, point.deck, point.x, point.y)) continue; came.set(nk, pk); q.push(point); }
  }
  return null;
}
