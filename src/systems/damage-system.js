const key = (x, y) => x + ',' + y;
export function applyDamageAt(s, x, y) {
  const k = key(x, y),
    tile = s.map.tiles[k];
  const door = Object.values(s.map.objects).find(
    (o) =>
      o.family === 'STR' &&
      o.built !== false &&
      ['STR0002', 'STR0003', 'STR0004', 'STR0005'].includes(o.type) &&
      x >= o.x &&
      y >= o.y &&
      x < o.x + o.w &&
      y < o.y + o.h
  );
  let target = null,
    label = '',
    field = 'integrity';
  if (door) {
    target = door;
    label = door.type === 'STR0002' || door.type === 'STR0003' ? 'TITANIUM DOOR' : 'ALUMINIUM DOOR';
  } else if (tile?.aluminiumWall) {
    target = tile;
    field = 'aluminiumWallIntegrity';
    label = 'ALUMINIUM WALL';
  } else if (tile?.wall) {
    target = tile;
    field = 'wallIntegrity';
    label = 'HULL WALL';
  } else if (tile?.hull) {
    target = tile;
    label = 'HULL FLOOR';
  }
  if (!target) return { ok: false, message: 'NO DAMAGEABLE CONSTRUCTION ON THIS TILE' };
  const damage = 1 + Math.floor(Math.random() * 25),
    before = target[field] ?? 100,
    after = Math.max(25, before - damage);
  target[field] = after;
  return {
    ok: true,
    damage,
    before,
    after,
    label,
    message: label + ' DAMAGED · -' + damage + '% · ' + after + '% INTEGRITY',
  };
}
