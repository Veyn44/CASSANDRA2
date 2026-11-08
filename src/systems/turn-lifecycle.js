import { advanceEnvironment } from './section-manager.js';

function sectionSignature(section) {
  return section.tiles
    .map((point) => point.x + ',' + point.y)
    .sort()
    .join('|');
}

const BOUNDARY_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function inspectBoundaryWalls(state, section) {
  const walls = new Map();
  for (const point of section.tiles) {
    for (const [dx, dy] of BOUNDARY_DIRS) {
      const x = point.x + dx,
        y = point.y + dy,
        tile = state.map.tiles[x + ',' + y];
      if (!tile?.wall && !tile?.aluminiumWall) continue;
      const integrity = tile.aluminiumWall
        ? (tile.aluminiumWallIntegrity ?? 100)
        : (tile.wallIntegrity ?? 100);
      walls.set(x + ',' + y, {
        x,
        y,
        kind: tile.aluminiumWall ? 'ALUMINIUM WALL' : 'TITANIUM WALL',
        integrity,
      });
    }
  }
  return [...walls.values()];
}

function environmentDiagnostics(state, sections, previousState, nextState) {
  return sections.map((section) => {
    const signature = sectionSignature(section),
      previous = previousState[signature] ?? {},
      saved = nextState[signature] ?? {};
    const formatState = (state) =>
      [
        state.environment ?? 'UNSET',
        state.pressure ?? 'UNSET',
        state.temperature == null ? 'N/A' : state.temperature + ' C',
      ].join(' / ');
    const boundaryWalls = inspectBoundaryWalls(state, section),
      damagedBoundaryWalls = boundaryWalls.filter((wall) => wall.integrity < 100);
    const cautious = section.cautiousWalls.map(
      (wall) => wall.kind + ' ' + wall.x + ',' + wall.y + ' ' + wall.integrity + '%'
    );
    const critical = section.criticalWalls.map(
      (wall) => wall.kind + ' ' + wall.x + ',' + wall.y + ' ' + wall.integrity + '%'
    );
    return {
      section: section.id,
      tiles: section.tileCount,
      panelActive: Boolean(section.hasActivePanel),
      openBoundaries: section.openBoundaries.length,
      boundaryWallCount: boundaryWalls.length,
      damagedBoundaryWalls: damagedBoundaryWalls.length,
      damagedBoundaryWallDetails: damagedBoundaryWalls
        .map((wall) => wall.kind + ' ' + wall.x + ',' + wall.y + ' ' + wall.integrity + '%')
        .join('; ') || '-',
      cautiousWalls: cautious.length,
      cautiousWallDetails: cautious.join('; ') || '-',
      criticalWalls: critical.length,
      criticalWallDetails: critical.join('; ') || '-',
      detected: formatState(section),
      previousSaved: formatState(previous),
      newlySaved: formatState(saved),
    };
  });
}

export function endTurn(s) {
  s.turn++;
  if ((s.turn - 1) % 2 === 0) s.day++;
  const previousEnvironmentState = { ...(s.environmentState ?? {}) };
  const environment = advanceEnvironment(s);
  const diagnostics = environmentDiagnostics(
    s,
    environment.sections,
    previousEnvironmentState,
    s.environmentState ?? {}
  );
  if (typeof console !== 'undefined' && typeof console.table === 'function') {
    console.groupCollapsed?.('[CASSANDRA] ENVIRONMENT TICK · TURN ' + s.turn);
    console.table(diagnostics);
    console.groupEnd?.();
  }
  s.pawn.op = s.pawn.maxOP;
  const report = diagnostics
    .filter((item) => item.damagedBoundaryWalls > 0 || item.cautiousWalls > 0 || item.criticalWalls > 0 || item.openBoundaries > 0)
    .map(
      (item) =>
        item.section +
        ': ' +
        item.detected +
        ' · PANEL ' +
        (item.panelActive ? 'ACTIVE' : 'INACTIVE') +
        ' · BOUNDARY WALLS [' +
        item.damagedBoundaryWallDetails +
        '] · CAUTIOUS [' +
        item.cautiousWallDetails +
        '] · CRITICAL [' +
        item.criticalWallDetails +
        '] · OPEN ' +
        item.openBoundaries
    )
    .join(' || ');
  return {
    message:
      'TURN ADVANCED · ENVIRONMENT UPDATED · OPERATIONAL POINTS RESTORED' +
      (report ? ' · ENV DIAG: ' + report : ' · ENV DIAG: NO DAMAGED BOUNDARIES DETECTED'),
  };
}
