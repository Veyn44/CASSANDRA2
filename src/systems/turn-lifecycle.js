import { advanceEnvironment } from './section-manager.js';

function sectionSignature(section) {
  return section.tiles
    .map((point) => point.x + ',' + point.y)
    .sort()
    .join('|');
}

function environmentDiagnostics(sections, previousState, nextState) {
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
    .filter((item) => item.cautiousWalls > 0 || item.criticalWalls > 0 || item.openBoundaries > 0)
    .map(
      (item) =>
        item.section +
        ': ' +
        item.detected +
        ' · PANEL ' +
        (item.panelActive ? 'ACTIVE' : 'INACTIVE') +
        ' · CAUTIOUS [' +
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
