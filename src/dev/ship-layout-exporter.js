export function exportShipLayout(state, noteText) {
  const sortedTiles = Object.entries(state.map.tiles)
    .map(([position, tile]) => {
      const [x, y] = position.split(',').map(Number);
      return { x, y, tile };
    })
    .filter(({ tile }) => tile && (tile.hull || tile.wall || tile.aluminiumWall))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const point = ({ x, y }) => ({ x, y });
  const hullFloor = sortedTiles.filter(({ tile }) => tile.hull).map(point);
  const hullWalls = sortedTiles.filter(({ tile }) => tile.wall).map(point);
  const aluminiumWalls = sortedTiles.filter(({ tile }) => tile.aluminiumWall).map(point);
  const objects = Object.values(state.map.objects ?? {})
    .map((object) => ({
      id: object.id,
      type: object.type,
      family: object.family ?? null,
      x: object.x,
      y: object.y,
      w: object.w,
      h: object.h,
      rotation: object.rotation ?? 0,
      built: object.built !== false,
      materialFamily: object.materialFamily ?? null,
    }))
    .sort(
      (a, b) =>
        a.y - b.y ||
        a.x - b.x ||
        String(a.type).localeCompare(String(b.type)) ||
        String(a.id).localeCompare(String(b.id))
    );
  const layout = {
    format: 'cassandra-ship-layout',
    version: 2,
    map: { width: state.map.width, height: state.map.height },
    construction: { hullFloor, hullWalls, aluminiumWalls },
    objects: objects,
  };
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cassandra_ship_layout.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  noteText(
    'SHIP LAYOUT EXPORTED · ' +
      hullFloor.length +
      ' HULL · ' +
      hullWalls.length +
      ' HULL WALLS · ' +
      aluminiumWalls.length +
      ' ALUMINIUM WALLS · ' +
      objects.length +
      ' OBJECTS'
  );
}
