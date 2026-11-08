import { connectedHullSet } from './hull-system.js';
import { getBuildable } from './prefab-manager.js';
import { syncTechnicalDecksState } from './technical-deck-generator.js';
const key = (x, y) => x + ',' + y;
function syncTechnicalDecks(s) {
  syncTechnicalDecksState(s);
}
const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export function completePlanAction(s, x, y) {
  const k = key(x, y),
    plan = s.map.plans[k],
    tile = s.map.tiles[k];
  if (!plan) return { ok: false, message: 'NO CONSTRUCTION PLAN HERE' };
  if (s.pawn.op < 1) return { ok: false, message: 'NOT ENOUGH AP · 1 AP REQUIRED' };
  if (plan.type === 'demolishAluminiumWall') {
    if (!tile?.aluminiumWall) return { ok: false, message: 'NO ALUMINIUM WALL TO DEMOLISH' };
    tile.aluminiumWall = false;
    tile.aluminiumWallIntegrity = null;
    s.pawn.op--;
    delete s.map.plans[k];
    return { ok: true, message: 'ALUMINIUM WALL REMOVED · 1 AP SPENT' };
  }
  if (plan.type === 'demolishModule') {
    const obj = s.map.objects[plan.objectId];
    if (!obj || s.pawn.op < 1) return { ok: false, message: 'MODULE DECONSTRUCTION UNAVAILABLE' };
    delete s.map.objects[obj.id];
    delete s.map.plans[k];
    s.pawn.op--;
    return { ok: true, message: 'MODULE DISMANTLED · 1 AP SPENT' };
  }
  if (
    plan.type === 'hull' &&
    (tile?.hull || !dirs.some(([dx, dy]) => connectedHullSet(s).has(key(x + dx, y + dy))))
  )
    return { ok: false, message: 'HULL PLAN NOT CONNECTED TO SHIP' };
  if (plan.type === 'wall' && (!tile?.hull || tile.wall))
    return { ok: false, message: 'WALL REQUIRES COMPLETED HULL' };
  if (plan.type === 'aluminiumWall' && (!tile?.hull || tile.aluminiumWall))
    return { ok: false, message: 'ALUMINIUM WALL REQUIRES AN OPEN HULL TILE' };
  if (plan.type === 'demolishWall' && (!tile?.hull || !tile.wall))
    return { ok: false, message: 'NO WALL TO DEMOLISH' };
  if (
    plan.type === 'demolishHull' &&
    (!tile?.hull ||
      tile.wall ||
      Object.values(s.map.objects).some(
        (o) => x >= o.x && y >= o.y && x < o.x + o.w && y < o.y + o.h
      ))
  )
    return { ok: false, message: 'REMOVE WALL OR MODULE BEFORE HULL' };
  const cost = ['hull', 'wall'].includes(plan.type);
  if (cost && !s.gameConfig.freeConstruction && s.resources.titanium < 1)
    return { ok: false, message: 'INSUFFICIENT TITANIUM' };
  if (cost && !s.gameConfig.freeConstruction) s.resources.titanium--;
  if (plan.type === 'hull')
    s.map.tiles[k] = {
      hull: true,
      integrity: 100,
      wall: false,
      wallIntegrity: null,
      aluminiumWall: false,
      aluminiumWallIntegrity: null,
    };
  else if (plan.type === 'wall') {
    tile.wall = true;
    tile.wallIntegrity = 100;
  } else if (plan.type === 'aluminiumWall') {
    tile.aluminiumWall = true;
    tile.aluminiumWallIntegrity = 100;
  } else if (plan.type === 'demolishWall') {
    tile.wall = false;
    tile.wallIntegrity = null;
  } else if (plan.type === 'demolishHull') delete s.map.tiles[k];
  if (plan.type === 'hull' || plan.type === 'demolishHull') syncTechnicalDecks(s);
  s.pawn.op--;
  delete s.map.plans[k];
  return {
    ok: true,
    message: 'CONSTRUCTION COMPLETE · ' + plan.type.toUpperCase() + ' · 1 AP SPENT',
  };
}
export function completeModuleAction(s, id) {
  const o = s.map.objects[id];
  if (!o || o.built) return { ok: false, message: 'NO MODULE BLUEPRINT HERE' };
  if (s.pawn.op < 1) return { ok: false, message: 'NOT ENOUGH AP · 1 AP REQUIRED' };
  if (!s.gameConfig.freeConstruction && s.resources.titanium < 1)
    return { ok: false, message: 'INSUFFICIENT TITANIUM' };
  if (!s.gameConfig.freeConstruction) s.resources.titanium--;
  o.built = true;
  s.pawn.op--;
  return {
    ok: true,
    message:
      'BUILD ITEM CONSTRUCTED · ' +
      (getBuildable(o.type)?.legacyId ?? o.type).toUpperCase() +
      ' · 1 AP SPENT',
  };
}
