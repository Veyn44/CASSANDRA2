import { createGameConfig } from '../core/game-config.js';
import { advanceEnvironment } from './section-manager.js';
import {
  createTechnicalDecks,
  DECK_ENVIRONMENT_TAGS,
  DECK_LEVELS,
} from './technical-deck-generator.js';
import { syncAccessShaftPressureLocks } from './access-shaft-system.js';
const key = (x, y) => x + ',' + y;
export function createInitialState({ mode = 'normal' } = {}) {
  const tiles = {};
  const hullRows = { 64: [64] };
  const hullWallRows = {};
  const aluminiumWallRows = {};
  const positions = (rows) =>
    new Set(Object.entries(rows).flatMap(([y, xs]) => xs.map((x) => key(x, Number(y)))));
  const hullSet = positions(hullRows),
    hullWallSet = positions(hullWallRows),
    aluminiumWallSet = positions(aluminiumWallRows);
  for (const k of hullSet) {
    const isHullWall = hullWallSet.has(k),
      isAluminiumWall = aluminiumWallSet.has(k);
    tiles[k] = {
      hull: true,
      integrity: 100,
      wall: isHullWall,
      wallIntegrity: isHullWall ? 100 : null,
      aluminiumWall: isAluminiumWall,
      aluminiumWallIntegrity: isAluminiumWall ? 100 : null,
    };
  }
  const gameConfig = createGameConfig(mode);
  const objects = {};
  const technicalDecks = createTechnicalDecks(tiles);
  const shaftCells = technicalDecks['Z+2']?.shaft ?? [];
  const state = {
    turn: 1,
    day: 1,
    gameConfig,
    controlNetwork: {
      central: {
        role: 'BRIDGE_CONSOLE',
        scope: 'ALL_SECTIONS',
        remoteAccessRequiresIntactIntegrityPath: true,
        integrityPathSimulation: 'NOT_IMPLEMENTED',
      },
      local: { scope: 'ONE_SECTION', worksIndependently: true },
    },
    devMode: gameConfig.unlimitedResources,
    resources: { titanium: 100, water: 20, ice: 0, oxygen: 100, hydrogen: 20 },
    activeTool: null,
    selectedPrefab: null,
    selectedObject: null,
    selectedMaterial: 'titanium',
    devCreator: false,
    damageSimulator: { active: false },
    rotation: 0,
    nextObjectId: 1,
    hoverTile: null,
    activeDeck: 'Z0',
    technicalDecks,
    deckEnvironmentTags: { ...DECK_ENVIRONMENT_TAGS },
    accessShaft: {
      decks: Object.fromEntries(
        DECK_LEVELS.map((level) => [
          level,
          { manualLock: false, autoLock: false, lockReason: null },
        ])
      ),
      x: shaftCells.length ? Math.min(...shaftCells.map((p) => p.x)) : 0,
      y: shaftCells.length ? Math.min(...shaftCells.map((p) => p.y)) : 0,
      w: 1,
      h: 1,
      cells: shaftCells.map((p) => ({ ...p })),
      locked: false,
      autoLocked: false,
      lockReason: null,
    },
    map: {
      width: 256,
      height: 128,
      tileSize: 28,
      gridVisible: true,
      tiles,
      plans: {},
      objects,
      core: { x: 64, y: 64 },
      anchor: { x: 192, y: 64 },
      asteroid: null,
      asteroidVisibility: null,
    },
    pawn: {
      id: 'researcher-01',
      name: 'Researcher',
      color: '#d76b73',
      deck: 'Z0',
      facing: 0,
      x: 70,
      y: 64,
      level: 1,
      maxOP: 12,
      op: 12,
      selected: true,
      health: 100,
      moving: false,
    },
    camera: { x: 73, y: 64, zoom: 1 },
    selection: 'researcher-01',
  };
  advanceEnvironment(state, { initial: true });
  syncAccessShaftPressureLocks(state);
  return state;
}
