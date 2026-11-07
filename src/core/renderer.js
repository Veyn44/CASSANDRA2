import { validatePrefabPlacement, prefabSize, getBuildable } from '../systems/prefab-manager.js';
import { isBlocked } from '../systems/navigation.js';
import { isCellVisible } from '../systems/visibility-manager.js';
const C = {
  bg: '#0a1119',
  hull: '#829fa7',
  edge: '#101a20',
  wall: '#89939a',
  dark: '#111a20',
  pawn: '#e35e68',
  plan: '#d8b66d',
  demolish: '#d77c76',
  rock: '#786f66',
  rockEdge: '#c1aa8b',
  floor: '#6b8991',
};
export function createRenderer(canvas, s) {
  const c = canvas.getContext('2d'),
    v = { width: 0, height: 0, dpr: 1 };
  function resize() {
    const a = canvas.getBoundingClientRect();
    v.dpr = Math.min(window.devicePixelRatio || 1, 2);
    v.width = a.width;
    v.height = a.height;
    canvas.width = Math.round(a.width * v.dpr);
    canvas.height = Math.round(a.height * v.dpr);
    c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  }
  function pos(x, y) {
    const z = s.map.tileSize * s.camera.zoom;
    return { x: (x - s.camera.x) * z + v.width / 2, y: (y - s.camera.y) * z + v.height / 2 };
  }
  function draw() {
    const z = s.map.tileSize * s.camera.zoom;
    c.clearRect(0, 0, v.width, v.height);
    c.fillStyle = C.bg;
    c.fillRect(0, 0, v.width, v.height);
    const l = Math.max(0, Math.floor(s.camera.x - v.width / (2 * z)) - 1),
      rr = Math.min(s.map.width, Math.ceil(s.camera.x + v.width / (2 * z)) + 1),
      t = Math.max(0, Math.floor(s.camera.y - v.height / (2 * z)) - 1),
      b = Math.min(s.map.height, Math.ceil(s.camera.y + v.height / (2 * z)) + 1);
    const asteroid = s.map.asteroid,
      visibility = s.map.asteroidVisibility;
    if (asteroid?.generationArea) {
      const a = asteroid.generationArea,
        center = pos(a.x, a.y);
      c.save();
      c.strokeStyle = 'rgba(224,145,75,.48)';
      c.lineWidth = Math.max(1, z * 0.045);
      c.setLineDash([Math.max(3, z * 0.24), Math.max(3, z * 0.18)]);
      c.beginPath();
      c.arc(center.x + z * 0.5, center.y + z * 0.5, a.radius * z, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    if (asteroid) {
      for (const cell of asteroid.cells) {
        if (
          cell.x < l ||
          cell.x >= rr ||
          cell.y < t ||
          cell.y >= b ||
          !isCellVisible(visibility, cell.x, cell.y)
        )
          continue;
        const p = pos(cell.x, cell.y);
        if (cell.kind === 'solid') {
          c.fillStyle = C.rock;
          c.fillRect(p.x, p.y, z, z);
          c.strokeStyle = C.rockEdge;
          c.lineWidth = Math.max(1, z * 0.035);
          c.strokeRect(p.x + 0.5, p.y + 0.5, z - 1, z - 1);
        } else if (cell.kind === 'cavity' || cell.kind === 'floor') {
          c.fillStyle = C.floor;
          c.fillRect(p.x, p.y, z, z);
          c.strokeStyle = '#a9c4c9';
          c.lineWidth = Math.max(1, z * 0.025);
          c.strokeRect(p.x + 0.5, p.y + 0.5, z - 1, z - 1);
          if (cell.kind === 'cavity') {
            c.fillStyle = 'rgba(5,12,18,.22)';
            c.fillRect(p.x + z * 0.18, p.y + z * 0.18, z * 0.64, z * 0.64);
          }
        }
      }
    }
    for (let y = t; y < b; y++)
      for (let x = l; x < rr; x++) {
        const p = pos(x, y),
          k = x + ',' + y,
          tile = s.activeDeck === 'Z0' ? s.map.tiles[k] : s.technicalDecks?.[s.activeDeck]?.tiles[k],
          plan = s.activeDeck === 'Z0' ? s.map.plans[k] : null;
        if (tile?.type === 'SHIP_HULL') {
          c.fillStyle = '#526b78';
          c.fillRect(p.x, p.y, z, z);
          c.strokeStyle = '#9bb9c5';
          c.lineWidth = Math.max(1, z * 0.045);
          c.strokeRect(p.x, p.y, z, z);
          c.fillStyle = 'rgba(220,240,248,.16)';
          c.fillRect(p.x + z * 0.18, p.y + z * 0.18, z * 0.64, z * 0.64);
        } else if (tile?.hull) {
          const integrity = tile.integrity ?? 100;
          c.fillStyle = integrity <= 25 ? '#4b626a' : integrity <= 50 ? '#687f86' : C.hull;
          c.fillRect(p.x, p.y, z, z);
          c.strokeStyle = C.edge;
          c.lineWidth = Math.max(1, z * 0.045);
          c.strokeRect(p.x, p.y, z, z);
          if (integrity <= 50) {
            c.strokeStyle = 'rgba(12,22,28,.75)';
            c.lineWidth = Math.max(1, z * 0.045);
            c.beginPath();
            c.moveTo(p.x + z * 0.18, p.y + z * 0.22);
            c.lineTo(p.x + z * 0.48, p.y + z * 0.53);
            c.lineTo(p.x + z * 0.34, p.y + z * 0.82);
            if (integrity <= 25) {
              c.moveTo(p.x + z * 0.68, p.y + z * 0.14);
              c.lineTo(p.x + z * 0.57, p.y + z * 0.42);
              c.lineTo(p.x + z * 0.84, p.y + z * 0.68);
            }
            c.stroke();
          }
        }
        if (tile?.wall) {
          const integrity = tile.wallIntegrity ?? 100;
          c.fillStyle = integrity <= 25 ? '#272d31' : integrity <= 50 ? '#303940' : C.dark;
          c.fillRect(p.x + z * 0.08, p.y + z * 0.08, z * 0.84, z * 0.84);
          c.strokeStyle = integrity <= 50 ? '#a47b69' : C.wall;
          c.lineWidth = Math.max(1.5, z * 0.075);
          c.strokeRect(p.x + z * 0.08, p.y + z * 0.08, z * 0.84, z * 0.84);
        }
        if (tile?.aluminiumWall) {
          const integrity = tile.aluminiumWallIntegrity ?? 100;
          c.fillStyle = integrity <= 25 ? '#343a3d' : integrity <= 50 ? '#69777b' : '#8fa4aa';
          c.fillRect(p.x + z * 0.16, p.y + z * 0.16, z * 0.68, z * 0.68);
          c.strokeStyle = integrity <= 50 ? '#c38b70' : '#d2e1e5';
          c.lineWidth = Math.max(1.5, z * 0.07);
          c.strokeRect(p.x + z * 0.16, p.y + z * 0.16, z * 0.68, z * 0.68);
        }
        if (plan) {
          c.save();
          c.globalAlpha = 0.62;
          c.fillStyle = plan.type === 'hull' ? C.hull : C.wall;
          c.fillRect(p.x + z * 0.12, p.y + z * 0.12, z * 0.76, z * 0.76);
          c.strokeStyle = plan.type.startsWith('demolish') ? C.demolish : C.plan;
          c.lineWidth = Math.max(2, z * 0.09);
          c.strokeRect(p.x + z * 0.12, p.y + z * 0.12, z * 0.76, z * 0.76);
          c.restore();
        }
        if (s.map.gridVisible) {
          c.strokeStyle = 'rgba(5,12,17,.28)';
          c.lineWidth = 1;
          c.strokeRect(p.x + 0.5, p.y + 0.5, z, z);
        }
      }
    const divider = pos(128, 0);
    c.save();
    c.strokeStyle = 'rgba(224,145,75,.72)';
    c.lineWidth = Math.max(1.5, z * 0.055);
    c.beginPath();
    c.moveTo(divider.x, divider.y);
    const bottom = pos(128, 128);
    c.lineTo(divider.x, bottom.y);
    c.stroke();
    c.restore();
    const anchor = pos(191, 63);
    c.save();
    c.strokeStyle = 'rgba(240,174,103,.9)';
    c.lineWidth = Math.max(1.5, z * 0.055);
    c.setLineDash([Math.max(3, z * 0.18), Math.max(2, z * 0.12)]);
    c.strokeRect(anchor.x, anchor.y, z * 2, z * 2);
    c.restore();
    if (s.activeDeck === 'Z0') for (const o of Object.values(s.map.objects)) {
      const p = pos(o.x, o.y),
        w = o.w * z,
        h = o.h * z,
        selected = s.selectedObject === o.id,
        deconstruct = s.map.plans[o.x + ',' + o.y]?.type === 'demolishModule';
      c.save();
      if (deconstruct) {
        c.globalAlpha = 0.72;
        c.fillStyle = '#783d42';
        c.strokeStyle = '#ff8585';
      } else if (o.built === false) {
        c.globalAlpha = 0.48;
        c.fillStyle = '#3299df';
        c.strokeStyle = '#75c9ff';
      } else if (o.family === 'STR' && o.type !== 'STR0001') {
        c.fillStyle = '#6b493d';
        c.strokeStyle = selected ? '#8ee0a8' : '#d6a17d';
      } else if (o.family === 'FUR') {
        c.fillStyle = '#665a3d';
        c.strokeStyle = selected ? '#8ee0a8' : '#d8c58c';
      } else if (o.type === 'STR0001') {
        c.fillStyle = '#4d6570';
        c.strokeStyle = selected ? '#8ee0a8' : '#a6bdca';
      } else if (o.type === 'MOD0014') {
        c.fillStyle = '#164d58';
        c.strokeStyle = selected ? '#8ee0a8' : '#62d9e7';
      } else {
        c.fillStyle = '#253744';
        c.strokeStyle = selected ? '#8ee0a8' : '#a6bdca';
      }
      c.fillRect(p.x + z * 0.06, p.y + z * 0.06, w - z * 0.12, h - z * 0.12);
      c.lineWidth = selected ? 3 : 1.5;
      c.strokeRect(p.x + z * 0.08, p.y + z * 0.08, w - z * 0.16, h - z * 0.16);
      c.restore();
      c.fillStyle = deconstruct ? '#ffe1e1' : o.built === false ? '#d7efff' : '#e1edf2';
      c.font = 'bold ' + Math.max(8, Math.min(11, z * 0.27)) + 'px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const def = getBuildable(o.type);
      c.fillText(
        o.type === 'MOD0014'
          ? 'CP'
          : (def?.name ?? o.type)
              .split(' ')
              .map((x) => x[0])
              .join('')
              .slice(0, 4),
        p.x + w / 2,
        p.y + h / 2
      );
      if (o.type === 'MOD0014') {
        const dirs = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0],
          ],
          d = dirs[(o.rotation ?? 0) % 4],
          cx = p.x + w / 2,
          cy = p.y + h / 2;
        c.save();
        c.strokeStyle = '#a4f6ff';
        c.fillStyle = '#a4f6ff';
        c.lineWidth = Math.max(1.5, z * 0.06);
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + d[0] * z * 0.34, cy + d[1] * z * 0.34);
        c.stroke();
        c.beginPath();
        c.arc(cx + d[0] * z * 0.34, cy + d[1] * z * 0.34, Math.max(2, z * 0.09), 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    if (s.activeDeck === 'Z0') {
      const pawn = pos(s.pawn.x, s.pawn.y),
        m = z * 0.29;
      const pawnColor = s.pawn.color ?? C.pawn;
      c.fillStyle = pawnColor;
      c.fillRect(pawn.x + m, pawn.y + m, z - 2 * m, z - 2 * m);
      c.strokeStyle = '#f2c2c5';
      c.lineWidth = 1.5;
      c.strokeRect(pawn.x + m, pawn.y + m, z - 2 * m, z - 2 * m);
      if (s.pawn.selected) {
        c.strokeStyle = '#70f0a0';
        c.lineWidth = Math.max(3, z * 0.09);
        c.strokeRect(pawn.x + z * 0.06, pawn.y + z * 0.06, z * 0.88, z * 0.88);
      }
    }
    if (s.activeDeck === 'Z0' && s.shipCreator?.active && s.hoverTile) {
      const p = pos(s.hoverTile.x, s.hoverTile.y),
        tool = s.shipCreator.tool,
        tile = s.map.tiles[s.hoverTile.x + ',' + s.hoverTile.y],
        obj = Object.values(s.map.objects).find(
          (o) =>
            s.hoverTile.x >= o.x &&
            s.hoverTile.y >= o.y &&
            s.hoverTile.x < o.x + o.w &&
            s.hoverTile.y < o.y + o.h
        );
      let valid = s.hoverTile.x < 128 && !obj;
      if (tool === 'wall') valid = valid && !!tile?.hull && !tile.wall;
      if (tool === 'hull') valid = valid && !tile?.hull;
      if (tool === 'erase') valid = valid && !!tile?.hull;
      c.save();
      c.globalAlpha = 0.42;
      c.fillStyle = valid
        ? tool === 'wall'
          ? '#b7c6ce'
          : tool === 'erase'
            ? '#d77c76'
            : '#829fa7'
        : '#c34f55';
      c.fillRect(p.x + z * 0.1, p.y + z * 0.1, z * 0.8, z * 0.8);
      c.strokeStyle = valid ? '#d9e8ef' : '#ff7777';
      c.lineWidth = 2;
      c.strokeRect(p.x + z * 0.1, p.y + z * 0.1, z * 0.8, z * 0.8);
      c.restore();
    }
    if (s.activeDeck === 'Z0' && s.activeTool === 'prefab' && s.hoverTile) {
      const def = getBuildable(s.selectedPrefab),
        check = validatePrefabPlacement(s, s.selectedPrefab, s.hoverTile.x, s.hoverTile.y),
        size = prefabSize(def, s.rotation),
        p = pos(s.hoverTile.x, s.hoverTile.y),
        w = size.w * z,
        h = size.h * z;
      c.save();
      c.fillStyle = check.valid ? 'rgba(55,155,255,.34)' : 'rgba(230,75,75,.28)';
      c.fillRect(p.x, p.y, w, h);
      c.strokeStyle = check.valid ? 'rgba(105,190,255,.95)' : 'rgba(255,105,105,.95)';
      c.lineWidth = 2;
      c.strokeRect(p.x + 1, p.y + 1, w - 2, h - 2);
      c.restore();
    }
    if (s.activeDeck !== 'Z0') {
      const deck = s.technicalDecks?.[s.activeDeck];
      c.save();
      c.fillStyle = '#d7e8ef';
      c.font = 'bold 12px sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.fillText('TECHNICAL DECK ' + s.activeDeck + ' · SHIP HULL · UNBREAKABLE', 16, 16);
      c.fillStyle = 'rgba(6,14,20,.92)';
      c.strokeStyle = '#9bb9c5';
      c.lineWidth = 2;
      for (const point of deck?.shaft ?? []) {
        const shaftPoint = pos(point.x, point.y);
        c.fillRect(shaftPoint.x, shaftPoint.y, z, z);
        c.strokeRect(shaftPoint.x + 1, shaftPoint.y + 1, z - 2, z - 2);
      }
      c.restore();
    }
    if (s.hoverTile) {
      const p = pos(s.hoverTile.x, s.hoverTile.y);
      c.strokeStyle = 'rgba(210,230,245,.55)';
      c.lineWidth = 1;
      c.strokeRect(p.x + 1, p.y + 1, z - 2, z - 2);
    }
  }
  resize();
  return { draw, resize, getView: () => v };
}
