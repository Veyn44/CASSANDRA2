import { detectSections } from './section-manager.js';
import { MODULES, getModule } from '../data/modules/modules.js';
import { STRUCTURES, getStructure } from '../data/structures/structures.js';
import { FURNITURE, getFurniture } from '../data/furniture/furniture.js';

export const PREFABS = [...MODULES, ...STRUCTURES, ...FURNITURE];
export const getBuildable = (id) => getModule(id) ?? getStructure(id) ?? getFurniture(id);
export function rotateTool(s, step) {
  s.rotation = (s.rotation + step + 4) % 4;
}
export function prefabSize(item, rotation) {
  return rotation % 2 ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
}

function rectanglesTouch(a, b) {
  const horizontalOverlap = a.x < b.x + b.w && a.x + a.w > b.x;
  const verticalOverlap = a.y < b.y + b.h && a.y + a.h > b.y;
  return (
    (horizontalOverlap && (a.y + a.h === b.y || b.y + b.h === a.y)) ||
    (verticalOverlap && (a.x + a.w === b.x || b.x + b.w === a.x))
  );
}

function findDoorWallAttachment(tiles, x, y, w, h) {
  const attached = new Set();
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      if (tiles[xx + ',' + yy]?.wall) attached.add(xx + ',' + yy);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const wx = xx + dx,
          wy = yy + dy;
        if (tiles[wx + ',' + wy]?.wall) attached.add(wx + ',' + wy);
      }
    }
  return [...attached].map((value) => {
    const [wx, wy] = value.split(',').map(Number);
    return { x: wx, y: wy };
  });
}

export function validatePrefabPlacement(s, id, x, y, rotation = s.rotation) {
  const item = getBuildable(id);
  if (!item) return { valid: false, message: 'UNKNOWN BUILD ITEM' };
  const { w, h } = prefabSize(item, rotation);
  const objects = Object.values(s.map.objects);
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const tx = x + xx,
        ty = y + yy,
        k = tx + ',' + ty;
      if (tx < 0 || ty < 0 || tx >= 128 || ty >= s.map.height)
        return {
          valid: false,
          message: tx >= 128 ? 'SHIP CONSTRUCTION IS LIMITED TO THE LEFT SECTOR' : 'OUT OF MAP',
        };
      const tile = s.map.tiles[k];
      const occupyingObjects = objects.filter(
        (o) => tx >= o.x && ty >= o.y && tx < o.x + o.w && ty < o.y + o.h
      );
      if (occupyingObjects.some((o) => !(item.outer && o.type === 'STR0001')))
        return { valid: false, message: 'TILE BLOCKED' };
      if (item.placement === 'control-panel') {
        const panelDirections = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0],
          ],
          direction = panelDirections[rotation % 4];
        const adjacentAluminium = Boolean(
          s.map.tiles[tx + direction[0] + ',' + (ty + direction[1])]?.aluminiumWall
        );
        if (!tile?.hull || tile.wall || tile.aluminiumWall)
          return { valid: false, message: 'CONTROL PANEL REQUIRES AN OPEN HULL TILE' };
        if (!adjacentAluminium)
          return { valid: false, message: 'CONTROL PANEL MUST BE ADJACENT TO AN ALUMINIUM WALL' };
        const detected = detectSections(s),
          sectionId = detected.tileToSection[tx + ',' + ty];
        if (sectionId && detected.byId[sectionId]?.tileCount > 64)
          return {
            valid: false,
            message: 'SECTION EXCEEDS CONTROL PANEL CAPACITY · MAX 64 FLOOR TILES',
          };
        if (
          sectionId &&
          objects.some(
            (o) => o.type === 'MOD0014' && detected.tileToSection[o.x + ',' + o.y] === sectionId
          )
        )
          return { valid: false, message: 'THIS SECTION ALREADY HAS A CONTROL PANEL' };
      } else if (item.placement === 'wall-opening') {
        if (!tile?.hull) return { valid: false, message: 'DOORS REQUIRE A HULL TILE' };
      } else if (item.placement === 'external-frame' || item.outer) {
        if (tile?.hull || tile?.wall)
          return { valid: false, message: 'EXTERNAL EQUIPMENT MUST BE OUTSIDE THE HULL' };
        if (item.placement === 'external-frame') {
          const adjacentHull = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => s.map.tiles[tx + dx + ',' + (ty + dy)]?.hull);
          const adjacentFrame = objects.some(
            (o) => o.type === 'STR0001' && rectanglesTouch({ x: tx, y: ty, w: 1, h: 1 }, o)
          );
          if (!adjacentHull && !adjacentFrame)
            return { valid: false, message: 'EXTERNAL FRAME MUST TOUCH HULL OR ANOTHER FRAME' };
        }
      } else if (item.placement === 'wall-mounted') {
        if (!tile?.hull || !tile?.wall)
          return { valid: false, message: 'WALL LIGHT REQUIRES A WALL TILE' };
      } else if (!tile?.hull || tile?.wall)
        return { valid: false, message: 'HULL REQUIRED · PLACE ON AN OPEN HULL TILE' };
    }
  if (item.outer) {
    const hasFrameUnderModule = objects.some(
      (o) => o.type === 'STR0001' && x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y
    );
    if (!hasFrameUnderModule)
      return {
        valid: false,
        message: 'OUTER MODULE REQUIRES AN EXTERNAL FRAME UNDER ITS FOOTPRINT',
      };
  }
  return { valid: true, message: item.name + ' READY', w, h };
}

export function placePrefab(s, id, x, y) {
  const item = getBuildable(id),
    check = validatePrefabPlacement(s, id, x, y);
  if (!check.valid) return { message: check.message };
  const idValue = 'build-' + s.nextObjectId++;
  const built = Boolean(s.devCreator);
  s.map.objects[idValue] = {
    id: idValue,
    type: item.id,
    family: item.id.slice(0, 3),
    x,
    y,
    w: check.w,
    h: check.h,
    rotation: s.rotation,
    built,
    materialFamily: item.defaultMaterialFamily ?? 'titanium',
    integrity: 100,
    ...(item.id === 'MOD0014' ? { sectionName: 'SECTION' } : {}),
    ...(item.placement === 'wall-opening'
      ? { wallAttachment: findDoorWallAttachment(s.map.tiles, x, y, check.w, check.h) }
      : {}),
  };
  return {
    message: built
      ? item.name + ' BUILT · DEV CREATOR'
      : item.name + ' BLUEPRINT PLACED · 1 TITANIUM · 1 AP',
    objectId: idValue,
  };
}
