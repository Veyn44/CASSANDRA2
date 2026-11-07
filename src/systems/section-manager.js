const key = (x, y) => x + ',' + y;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const SCAN_DIRS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const PRESSURE_STATES = ['VACUUM', 'LOW', 'OPTIMAL', 'HIGH', 'EXTREME'];
const DOOR_TYPES = new Set(['STR0002', 'STR0003', 'STR0004', 'STR0005']);
const signature = (tiles) =>
  tiles
    .map((p) => key(p.x, p.y))
    .sort()
    .join('|');
function doorAt(s, x, y) {
  return (
    Object.values(s.map.objects).find(
      (o) =>
        DOOR_TYPES.has(o.type) &&
        o.built !== false &&
        x >= o.x &&
        y >= o.y &&
        x < o.x + o.w &&
        y < o.y + o.h
    ) ?? null
  );
}
function isFloor(s, x, y, tile = s.map.tiles[key(x, y)]) {
  return Boolean(tile?.hull && !tile.wall && !tile.aluminiumWall && !doorAt(s, x, y));
}
function wallIntegrity(tile) {
  return tile?.aluminiumWall
    ? (tile.aluminiumWallIntegrity ?? 100)
    : tile?.wall
      ? (tile.wallIntegrity ?? 100)
      : null;
}
function isWall(tile) {
  return Boolean(tile?.wall || tile?.aluminiumWall);
}
function doorIntegrity(door) {
  return door?.integrity ?? 100;
}
function lowerPressureOnce(pressure) {
  const index = PRESSURE_STATES.indexOf(pressure ?? 'OPTIMAL');
  return PRESSURE_STATES[Math.max(0, index < 0 ? 1 : index - 1)];
}
function vacuumArea(s) {
  const hull = Object.entries(s.map.tiles)
    .filter(([, t]) => t?.hull)
    .map(([k]) => k.split(',').map(Number));
  if (!hull.length) return new Set();
  const minX = Math.max(0, Math.min(...hull.map((p) => p[0])) - 2),
    maxX = Math.min(s.map.width - 1, Math.max(...hull.map((p) => p[0])) + 2);
  const minY = Math.max(0, Math.min(...hull.map((p) => p[1])) - 2),
    maxY = Math.min(s.map.height - 1, Math.max(...hull.map((p) => p[1])) + 2);
  const set = new Set(),
    q = [];
  for (let x = minX; x <= maxX; x++) q.push({ x, y: minY }, { x, y: maxY });
  for (let y = minY + 1; y < maxY; y++) q.push({ x: minX, y }, { x: maxX, y });
  for (let i = 0; i < q.length; i++) {
    const p = q[i],
      k = key(p.x, p.y);
    if (set.has(k) || s.map.tiles[k]?.hull) continue;
    set.add(k);
    for (const [dx, dy] of DIRS) {
      const x = p.x + dx,
        y = p.y + dy,
        nk = key(x, y);
      if (
        x >= minX &&
        x <= maxX &&
        y >= minY &&
        y <= maxY &&
        !set.has(nk) &&
        !s.map.tiles[nk]?.hull
      )
        q.push({ x, y });
    }
  }
  return set;
}
function panelObjects(s) {
  return Object.values(s.map.objects).filter((o) => o.type === 'MOD0014' && o.built !== false);
}
function panelStatus(section, panels) {
  const sorted = [...panels];
  return sorted.map((p, i) => ({
    id: p.id,
    name: p.sectionName ?? section?.name ?? 'UNASSIGNED',
    x: p.x,
    y: p.y,
    rotation: p.rotation ?? 0,
    sectionId: section?.id ?? null,
    active: Boolean(section && section.tileCount <= 64 && i === 0 && !section.critical),
    status: !section
      ? 'INACTIVE'
      : section.tileCount > 64
        ? 'INACTIVE'
        : i > 0
          ? 'INACTIVE'
          : section.critical
            ? 'INACTIVE'
            : 'ACTIVE',
    reason: !section
      ? 'NO SECTION'
      : section.tileCount > 64
        ? 'CAPACITY EXCEEDED'
        : i > 0
          ? 'DUPLICATE PANEL'
          : section.critical
            ? 'SECTION LOCKED'
            : '',
  }));
}
export function detectSections(s, { useSnapshot = true } = {}) {
  const tileToSection = {},
    byId = {},
    sections = [],
    seen = new Set();
  const floors = Object.entries(s.map.tiles).filter(([k, t]) => {
    const [x, y] = k.split(',').map(Number);
    return isFloor(s, x, y, t);
  });
  for (const [k] of floors) {
    if (seen.has(k)) continue;
    const [sx, sy] = k.split(',').map(Number),
      q = [{ x: sx, y: sy }],
      tiles = [];
    seen.add(k);
    for (let i = 0; i < q.length; i++) {
      const p = q[i];
      tiles.push(p);
      for (const [dx, dy] of DIRS) {
        const x = p.x + dx,
          y = p.y + dy,
          nk = key(x, y);
        if (!seen.has(nk) && isFloor(s, x, y)) {
          seen.add(nk);
          q.push({ x, y });
        }
      }
    }
    const id = 'SECTION-' + String(sections.length + 1).padStart(2, '0'),
      section = {
        id,
        name: 'SECTION ' + String(sections.length + 1).padStart(2, '0'),
        tiles,
        tileCount: tiles.length,
        panels: [],
        airtight: true,
        airtightness: 'STABLE',
        cautiousWalls: [],
        criticalWalls: [],
        openBoundaries: [],
        atmosphere: 'NONE',
        pressure: 'VACUUM',
        temperature: null,
        environment: 'UNMANAGED',
        critical: false,
        locked: false,
      };
    for (const p of tiles) tileToSection[key(p.x, p.y)] = id;
    sections.push(section);
    byId[id] = section;
  }
  const vacuumSet = vacuumArea(s);
  for (const section of sections) {
    const own = new Set(section.tiles.map((p) => key(p.x, p.y))),
      boundary = new Map();
    for (const p of section.tiles)
      for (const [dx, dy] of DIRS) {
        const x = p.x + dx,
          y = p.y + dy,
          k = key(x, y);
        if (own.has(k)) continue;
        const tile = s.map.tiles[k],
          door = doorAt(s, x, y);
        if (isWall(tile)) {
          boundary.set(k, {
            x,
            y,
            tile,
            integrity: wallIntegrity(tile),
            kind: tile.aluminiumWall ? 'ALUMINIUM WALL' : 'TITANIUM WALL',
          });
        } else if (door) {
          const boundaryKey = 'DOOR:' + door.id;
          boundary.set(boundaryKey, {
            x: door.x,
            y: door.y,
            door,
            integrity: doorIntegrity(door),
            kind:
              door.type === 'STR0002' || door.type === 'STR0003'
                ? 'TITANIUM DOOR'
                : 'ALUMINIUM DOOR',
          });
        } else section.openBoundaries.push({ x, y, door: null });
      }
    for (const item of boundary.values()) {
      if (item.door && item.door.closed === false)
        section.openBoundaries.push({ x: item.x, y: item.y, door: item.door });
      else if (item.integrity < 50) section.criticalWalls.push(item);
      else if (item.integrity < 75) section.cautiousWalls.push(item);
    }
    section.critical =
      section.criticalWalls.length > 0 || section.openBoundaries.length > 0 || section.locked;
    section.cautious = !section.critical && section.cautiousWalls.length > 0;
    section.airtight = !section.critical && !section.cautious;
    section.airtightness = section.critical ? 'CRITICAL' : section.cautious ? 'CAUTIOUS' : 'STABLE';
  }
  const result = { sections, byId, tileToSection, panels: [], vacuumSet };
  const bySectionPanels = new Map();
  for (const panel of panelObjects(s)) {
    const id = tileToSection[key(panel.x, panel.y)] ?? null,
      section = id ? byId[id] : null;
    if (section) {
      section.panels.push(panel);
      if (panel.sectionName) section.name = panel.sectionName;
    }
    const arr = bySectionPanels.get(id) ?? [];
    arr.push(panel);
    bySectionPanels.set(id, arr);
  }
  for (const section of sections) {
    section.panels = panelStatus(section, bySectionPanels.get(section.id) ?? []);
    result.panels.push(...section.panels);
  }
  for (const panel of bySectionPanels.get(null) ?? [])
    result.panels.push(...panelStatus(null, [panel]));
  for (const section of sections) {
    const active = section.panels.some((p) => p.active);
    section.hasActivePanel = active;
    if (section.critical) {
      section.atmosphere = 'NONE';
      section.pressure = 'VACUUM';
      section.temperature = -270;
      section.environment = 'CRITICAL';
      section.locked = true;
    } else if (section.cautious) {
      section.atmosphere = active ? 'NOT OPTIMAL' : 'NONE';
      section.pressure = active ? 'LOW' : 'VACUUM';
      section.environment = 'CAUTIOUS';
    } else if (active) {
      section.atmosphere = 'OPTIMAL';
      section.pressure = 'OPTIMAL';
      section.temperature = 24;
      section.environment = 'HABITABLE';
    } else {
      section.atmosphere = 'NONE';
      section.pressure = 'VACUUM';
      section.temperature = null;
      section.environment = 'UNMANAGED';
    }
    const saved = useSnapshot ? s.environmentState?.[signature(section.tiles)] : null;
    if (saved) {
      section.airtightness = saved.airtightness ?? section.airtightness;
      section.critical = saved.environment === 'CRITICAL';
      section.cautious = saved.environment === 'CAUTIOUS';
      section.locked = Boolean(saved.locked);
      section.atmosphere = saved.atmosphere ?? section.atmosphere;
      section.pressure = saved.pressure ?? section.pressure;
      section.temperature = saved.temperature;
      section.environment = saved.environment ?? section.environment;
      section.cautiousWallCount = saved.cautiousWalls ?? section.cautiousWalls.length;
      section.criticalWallCount = saved.criticalWalls ?? section.criticalWalls.length;
      section.panels = panelStatus(section, bySectionPanels.get(section.id) ?? []);
    } else {
      section.cautiousWallCount = section.cautiousWalls.length;
      section.criticalWallCount = section.criticalWalls.length;
    }
  }
  result.panels = [
    ...sections.flatMap((section) => section.panels),
    ...(bySectionPanels.get(null) ?? []).flatMap((panel) => panelStatus(null, [panel])),
  ];
  return result;
}
function boundaryLeakCounts(s, data, section) {
  let vacuumTiles = 0,
    internalTiles = 0;
  for (const item of section.cautiousWalls) {
    const x = item.x,
      y = item.y;
    const adjacentSections = new Set(),
      touchesVacuum = DIRS.some(([ax, ay]) => data.vacuumSet.has(key(x + ax, y + ay)));
    for (const [ax, ay] of DIRS) {
      const id = data.tileToSection[key(x + ax, y + ay)];
      if (id && id !== section.id) adjacentSections.add(id);
    }
    if (touchesVacuum || [...adjacentSections].some((id) => data.byId[id]?.pressure === 'VACUUM'))
      vacuumTiles++;
    else if (adjacentSections.size) internalTiles++;
  }
  return { vacuumTiles, internalTiles };
}
function isAluminiumDoor(object) {
  return object?.type === 'STR0004' || object?.type === 'STR0005';
}
function degradeIntegrity(target) {
  const damage = 2 + Math.floor(Math.random() * 9);
  target.integrity = Math.max(25, (target.integrity ?? 100) - damage);
}
function degradeAluminiumInsideSection(s, data, section) {
  const floorKeys = new Set(section.tiles.map((p) => key(p.x, p.y)));
  for (const object of Object.values(s.map.objects)) {
    if (
      object.built === false ||
      object.materialFamily !== 'aluminium' ||
      DOOR_TYPES.has(object.type)
    )
      continue;
    let inside = false;
    for (let y = object.y; y < object.y + object.h && !inside; y++)
      for (let x = object.x; x < object.x + object.w; x++) {
        if (floorKeys.has(key(x, y))) {
          inside = true;
          break;
        }
      }
    if (!inside) continue;
    degradeIntegrity(object);
  }
}
function degradeExposedAluminium(s, data) {
  // Aluminium boundary walls and doors lose airtightness when they border LOW pressure or vacuum.
  const affectedSections = new Set(
    data.sections
      .filter((section) => section.pressure === 'LOW' || section.pressure === 'VACUUM')
      .map((section) => section.id)
  );
  const shouldDegradeAt = (x, y) =>
    DIRS.some(([dx, dy]) => {
      const nx = x + dx,
        ny = y + dy;
      return (
        data.vacuumSet.has(key(nx, ny)) || affectedSections.has(data.tileToSection[key(nx, ny)])
      );
    });
  for (const [position, tile] of Object.entries(s.map.tiles)) {
    if (!tile?.aluminiumWall) continue;
    const [x, y] = position.split(',').map(Number);
    if (shouldDegradeAt(x, y))
      degradeIntegrity({
        get integrity() {
          return tile.aluminiumWallIntegrity ?? 100;
        },
        set integrity(value) {
          tile.aluminiumWallIntegrity = value;
        },
      });
  }
  for (const door of Object.values(s.map.objects)) {
    if (!isAluminiumDoor(door) || door.built === false) continue;
    let exposed = false;
    for (let y = door.y; y < door.y + door.h && !exposed; y++)
      for (let x = door.x; x < door.x + door.w && !exposed; x++) exposed = shouldDegradeAt(x, y);
    if (exposed) degradeIntegrity(door);
  }
}
function closeSectionDoors(s, section) {
  const cells = new Set(section.tiles.map((p) => key(p.x, p.y)));
  for (const door of Object.values(s.map.objects)) {
    if (!DOOR_TYPES.has(door.type) || door.built === false) continue;
    let touches = false;
    for (let y = door.y; y < door.y + door.h; y++)
      for (let x = door.x; x < door.x + door.w; x++)
        for (const [dx, dy] of DIRS) if (cells.has(key(x + dx, y + dy))) touches = true;
    if (touches) {
      door.closed = true;
      door.locked = true;
    }
  }
}
function unlockSectionDoors(s, section) {
  const cells = new Set(section.tiles.map((p) => key(p.x, p.y)));
  for (const door of Object.values(s.map.objects)) {
    if (!DOOR_TYPES.has(door.type) || door.built === false) continue;
    let touches = false;
    for (let y = door.y; y < door.y + door.h; y++)
      for (let x = door.x; x < door.x + door.w; x++)
        for (const [dx, dy] of DIRS) if (cells.has(key(x + dx, y + dy))) touches = true;
    if (touches) door.locked = false;
  }
}
export function advanceEnvironment(s, { initial = false } = {}) {
  s.environmentState ??= {};
  const before = detectSections(s, { useSnapshot: false });
  // Boundary aluminium loses airtightness against LOW pressure as well as vacuum.
  if (!initial) degradeExposedAluminium(s, before);
  const data = detectSections(s, { useSnapshot: false }),
    nextState = {};
  for (const section of data.sections) {
    const sig = signature(section.tiles),
      prior = s.environmentState[sig] ?? {},
      counts = boundaryLeakCounts(s, data, section);
    if (section.critical) {
      section.atmosphere = 'NONE';
      section.pressure = 'VACUUM';
      section.temperature = -270;
      section.environment = 'CRITICAL';
      section.locked = true;
      closeSectionDoors(s, section);
    } else if (section.cautious) {
      section.atmosphere = section.hasActivePanel ? 'NOT OPTIMAL' : 'NONE';
      section.pressure = section.hasActivePanel
        ? prior.environment === 'CAUTIOUS'
          ? (prior.pressure ?? 'LOW')
          : lowerPressureOnce(prior.pressure)
        : 'VACUUM';
      section.environment = 'CAUTIOUS';
      const base = Number.isFinite(prior.temperature)
        ? prior.temperature
        : section.hasActivePanel
          ? 24
          : null;
      section.temperature =
        base == null
          ? null
          : Math.max(-270, base - 29 * counts.vacuumTiles - 1.2 * counts.internalTiles);
      degradeAluminiumInsideSection(s, data, section);
    } else if (section.hasActivePanel) {
      section.atmosphere = 'OPTIMAL';
      section.pressure = 'OPTIMAL';
      section.temperature = 24;
      section.environment = 'HABITABLE';
      section.locked = false;
      unlockSectionDoors(s, section);
    } else {
      section.atmosphere = 'NONE';
      section.pressure = 'VACUUM';
      section.temperature = null;
      section.environment = 'UNMANAGED';
    }
    nextState[sig] = {
      temperature: section.temperature,
      atmosphere: section.atmosphere,
      pressure: section.pressure,
      environment: section.environment,
      locked: section.locked,
      airtightness: section.airtightness,
      cautiousWalls: section.cautiousWalls.length,
      criticalWalls: section.criticalWalls.length,
    };
  }
  s.environmentState = nextState;
  s.environmentSnapshot = {
    turn: s.turn,
    sections: data.sections.map((section) => ({
      id: section.id,
      weight: section.tileCount,
      atmosphere: section.atmosphere,
      pressure: section.pressure,
      temperature: section.temperature,
      airtightness: section.airtightness,
      environment: section.environment,
    })),
  };
  return data;
}
export function getVacuumInfo() {
  return {
    type: 'VACUUM',
    name: 'VACUUM SECTION',
    weight: 1000000,
    atmosphere: 'NONE',
    pressure: 'VACUUM',
    temperature: -270,
    environment: 'VACUUM',
    boundary: 'EXTERNAL',
    airtightness: 'N/A',
  };
}
export function getSectionInfo(section) {
  if (!section) return null;
  return {
    type: 'SECTION',
    id: section.id,
    name: section.name,
    weight: section.tileCount,
    atmosphere: section.atmosphere,
    pressure: section.pressure,
    temperature: section.temperature,
    environment: section.environment,
    airtightness: section.airtightness,
    cautiousWalls: section.cautiousWallCount ?? section.cautiousWalls.length,
    criticalWalls: section.criticalWallCount ?? section.criticalWalls.length,
    activeTiles: section.tileCount,
    controlPanel: section.panels.map((p) => ({ id: p.id, status: p.status, reason: p.reason })),
  };
}
export function completeSectionScan(s, section) {
  if (!section) return { ok: false, message: 'NO SECTION SELECTED' };
  if (s.pawn.op < 2) return { ok: false, message: 'NOT ENOUGH AP · 2 AP REQUIRED' };
  const floors = section.tiles.map((p) => {
      const tile = s.map.tiles[key(p.x, p.y)];
      return { type: 'HULL FLOOR', x: p.x, y: p.y, integrity: tile.integrity ?? 100 };
    }),
    walls = new Map();
  for (const p of section.tiles)
    for (const [dx, dy] of SCAN_DIRS) {
      const x = p.x + dx,
        y = p.y + dy,
        tile = s.map.tiles[key(x, y)];
      if (!tile || (!tile.wall && !tile.aluminiumWall)) continue;
      const k = key(x, y);
      if (!walls.has(k))
        walls.set(k, {
          type: tile.aluminiumWall ? 'ALUMINIUM WALL' : 'TITANIUM WALL',
          x,
          y,
          integrity: wallIntegrity(tile),
        });
    }
  for (const object of Object.values(s.map.objects))
    if (
      DOOR_TYPES.has(object.type) &&
      object.built !== false &&
      section.tiles.some(
        (p) =>
          p.x >= object.x - 1 &&
          p.x <= object.x + object.w &&
          p.y >= object.y - 1 &&
          p.y <= object.y + object.h
      )
    )
      walls.set('DOOR:' + object.id, {
        type:
          object.type === 'STR0002' || object.type === 'STR0003'
            ? 'TITANIUM DOOR'
            : 'ALUMINIUM DOOR',
        x: object.x,
        y: object.y,
        integrity: doorIntegrity(object),
      });
  s.pawn.op -= 2;
  return {
    ok: true,
    apSpent: 2,
    sectionId: section.id,
    floors,
    walls: [...walls.values()],
    message: 'COMPLETE SCAN FINISHED · 2 AP SPENT',
  };
}
export function pressureStates() {
  return [...PRESSURE_STATES];
}
