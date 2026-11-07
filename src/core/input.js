import { getBuildable } from '../systems/prefab-manager.js';
import { applyDamageAt } from '../systems/damage-system.js';
import { isBlocked } from '../systems/navigation.js';
import { bindCameraControls } from './camera-controls.js';
import { createCommandExecutor } from './command-execution.js';
import { createConstructionInput } from './construction-input.js';
const key = (x, y) => x + ',' + y;
export function bindInput(canvas, s, r, refresh, cancel, note, onControlPanelClick) {
  const controller = new AbortController();
  const listen = (target, type, handler, options = {}) =>
    target.addEventListener(type, handler, { ...options, signal: controller.signal });
  let pan = false,
    last = null,
    painting = false,
    lastPainted = null;
  function tile(cx, cy) {
    const a = canvas.getBoundingClientRect(),
      v = r.getView(),
      z = s.map.tileSize * s.camera.zoom;
    return {
      x: Math.floor(s.camera.x + (cx - a.left - v.width / 2) / z),
      y: Math.floor(s.camera.y + (cy - a.top - v.height / 2) / z),
    };
  }
  function inside(p) {
    return p.x >= 0 && p.y >= 0 && p.x < 256 && p.y < 128;
  }
  function objectAt(p) {
    return Object.values(s.map.objects).find(
      (o) => p.x >= o.x && p.y >= o.y && p.x < o.x + o.w && p.y < o.y + o.h
    );
  }
  const place = createConstructionInput(s, inside, objectAt, refresh, note);
  const executeCommand = createCommandExecutor(s, refresh, note, objectAt, controller.signal);
  listen(canvas, 'pointerdown', (e) => {
    if (s.paused) return;
    if (e.button === 1) {
      pan = true;
      last = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      e.preventDefault();
      if (s.activeTool) {
        cancel();
        note('BUILD MODE CANCELLED');
      } else executeCommand(tile(e.clientX, e.clientY));
      return;
    }
    if (e.button === 0) {
      const p = tile(e.clientX, e.clientY);
      if (!inside(p)) return;
      if (s.activeDeck !== 'Z0') {
        if (s.damageSimulator?.active) note('SHIP HULL IS UNDAMAGEABLE');
        else if (s.activeTool) note('TECHNICAL DECKS ARE SEALED · CONSTRUCTION DISABLED');
        return;
      }
      if (s.damageSimulator?.active) {
        const result = applyDamageAt(s, p.x, p.y);
        note(result.message);
        refresh();
        return;
      }
      if (s.activeTool) {
        place(p);
        if (s.activeTool === 'hull' || s.activeTool === 'wall' || s.activeTool === 'erase') {
          painting = true;
          lastPainted = key(p.x, p.y);
          canvas.setPointerCapture(e.pointerId);
        }
        return;
      }
      if (p.x === s.pawn.x && p.y === s.pawn.y) {
        s.pawn.selected = true;
        s.selectedObject = null;
        refresh();
        return;
      }
      const obj = objectAt(p);
      if (obj) {
        s.selectedObject = obj.id;
        s.pawn.selected = false;
        if (obj.type === 'MOD0014' && obj.built !== false) onControlPanelClick?.(obj);
        refresh();
        return;
      }
      s.selectedObject = null;
      s.pawn.selected = false;
      refresh();
    }
  });
  listen(canvas, 'pointermove', (e) => {
    if (s.paused) return;
    const p = tile(e.clientX, e.clientY);
    s.hoverTile = inside(p) ? p : null;
    if (painting && s.activeTool && inside(p)) {
      const k = key(p.x, p.y);
      if (k !== lastPainted) {
        lastPainted = k;
        place(p);
      }
    }
    const inspector = document.querySelector('#tile-inspector');
    if (inspector) {
      if (!s.hoverTile) inspector.textContent = 'HOVER OVER A TILE TO INSPECT';
      else {
        const t = s.map.tiles[key(p.x, p.y)],
          plan = s.map.plans[key(p.x, p.y)],
          obj = objectAt(p),
          asteroidCell = s.map.asteroid?.cells.find((cell) => cell.x === p.x && cell.y === p.y);
        let label = 'EMPTY SPACE',
          attrs = 'No structure';
        if (asteroidCell?.kind === 'cavity') {
          label = 'ASTEROID CAVITY GROUND';
          attrs = 'Natural interior · Walkable · Hidden until discovered';
        } else if (asteroidCell?.kind === 'floor') {
          label = 'EXCAVATED ASTEROID FLOOR';
          attrs = 'Walkable ground · Excavated from solid rock';
        } else if (asteroidCell?.kind === 'solid') {
          label = 'ASTEROID ROCK';
          attrs = 'Solid material · Not walkable · Requires mining';
        }
        if (obj) {
          label =
            (obj.built ? 'BUILD ITEM · ' : 'BUILD BLUEPRINT · ') +
            (getBuildable(obj.type)?.legacyId ?? obj.type).toUpperCase();
          attrs =
            'Footprint ' +
            obj.w +
            ' × ' +
            obj.h +
            ' · Integrity ' +
            (obj.integrity ?? 100) +
            '% · ' +
            (obj.family === 'STR'
              ? 'structural element'
              : obj.family === 'FUR'
                ? 'interior furnishing'
                : 'system module');
        } else if (t?.aluminiumWall) {
          label = 'ALUMINIUM WALL';
          attrs = 'Integrity ' + (t.aluminiumWallIntegrity ?? 100) + '% · Structural aluminium';
        } else if (t?.wall) {
          label = 'HULL WALL';
          attrs = 'Integrity ' + (t.wallIntegrity ?? 100) + '% · Hull underneath';
        } else if (t?.hull) {
          label = 'HULL FLOOR';
          attrs =
            'Integrity ' +
            (t.integrity ?? 100) +
            '% · Walkable: ' +
            (!isBlocked(s, p.x, p.y) ? 'yes' : 'no');
        }
        if (plan) {
          label += ' · PLAN: ' + plan.type.toUpperCase();
          attrs += ' · Work cost 1 AP';
        }
        if (p.x === s.pawn.x && p.y === s.pawn.y) {
          label = 'RESEARCHER · PAWN';
          attrs =
            'HP ' +
            s.pawn.health +
            ' · AP ' +
            s.pawn.op +
            '/' +
            s.pawn.maxOP +
            ' · Level ' +
            s.pawn.level;
        }
        inspector.innerHTML =
          '<strong>' + label + '</strong><br>' + attrs + '<br>POSITION ' + p.x + ', ' + p.y;
      }
    }
    if (pan && last) {
      const z = s.map.tileSize * s.camera.zoom;
      s.camera.x -= (e.clientX - last.x) / z;
      s.camera.y -= (e.clientY - last.y) / z;
      last = { x: e.clientX, y: e.clientY };
    }
    r.draw();
  });
  function stop() {
    pan = false;
    last = null;
    painting = false;
    lastPainted = null;
  }
  listen(canvas, 'pointerup', stop);
  listen(canvas, 'pointercancel', stop);
  listen(canvas, 'contextmenu', (e) => e.preventDefault());
  listen(
    canvas,
    'wheel',
    (e) => {
      if (s.paused) return;
      e.preventDefault();
      s.camera.zoom = Math.max(0.35, Math.min(2.4, s.camera.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      r.draw();
    },
    { passive: false }
  );
  listen(window, 'keydown', (e) => {
    if (s.paused) return;
    const key = e.key.toLowerCase();
    if (key === '[' || key === ']') {
      const levels = ['Z0', ...Object.keys(s.technicalDecks ?? {})];
      const current = Math.max(0, levels.indexOf(s.activeDeck ?? 'Z0'));
      s.activeDeck = levels[(current + (key === ']' ? 1 : -1) + levels.length) % levels.length];
      s.activeTool = null;
      s.selectedObject = null;
      refresh();
      note('DECK VIEW · ' + s.activeDeck + ' · [ / ] TO CHANGE LEVEL · 0 FOR Z0');
      return;
    }
    if (key === '0') {
      s.activeDeck = 'Z0';
      refresh();
      note('DECK VIEW · Z0');
      return;
    }
    if ((key === 'q' || key === 'e') && s.activeTool === 'prefab') {
      e.preventDefault();
      s.rotation = (s.rotation + (key === 'q' ? 3 : 1)) % 4;
      r.draw();
    }
  });
  bindCameraControls(s, r, listen, controller.signal);
  return () => controller.abort();
}
