import { getBuildable } from '../systems/prefab-manager.js';
import { applyDamageAt } from '../systems/damage-system.js';
import { isBlocked, isDeckLocked } from '../systems/navigation.js';
import { syncAccessShaftPressureLocks } from '../systems/access-shaft-system.js';
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
  const shaftMenu = document.querySelector('#shaft-menu');
  const onShaft = (p) => s.accessShaft?.cells?.some((cell) => cell.x === p.x && cell.y === p.y);
  function shaftArrivalTile(deckId) {
    const shaftCells = s.accessShaft?.cells ?? [];
    const candidates = new Map();
    for (const cell of shaftCells) {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const x = cell.x + dx, y = cell.y + dy, k = key(x, y);
        if (shaftCells.some((shaftCell) => shaftCell.x === x && shaftCell.y === y)) continue;
        const walkable = deckId === 'Z0'
          ? Boolean(s.map.tiles[k]?.hull) && !isBlocked(s, x, y)
          : Boolean(s.technicalDecks?.[deckId]?.tiles?.[k]);
        if (walkable) candidates.set(k, { x, y });
      }
    }
    return [...candidates.values()].sort((a, b) =>
      Math.abs(a.x - s.pawn.x) + Math.abs(a.y - s.pawn.y) -
      (Math.abs(b.x - s.pawn.x) + Math.abs(b.y - s.pawn.y))
    )[0] ?? { x: s.accessShaft.x + 1, y: s.accessShaft.y + 1 };
  }
  function facePawnToward(point) {
    if (!s.pawn.selected || (s.pawn.deck ?? 'Z0') !== s.activeDeck) return;
    const dx = point.x + 0.5 - (s.pawn.x + 0.5);
    const dy = point.y + 0.5 - (s.pawn.y + 0.5);
    if (dx || dy) {
      s.pawn.facing = Math.atan2(dy, dx);
      refresh();
    }
  }
  const closeShaftMenu = () => { if (shaftMenu) shaftMenu.hidden = true; };
  function showShaftMenu(event) {
    if (!shaftMenu || !s.devMode || !s.accessShaft) return;
    syncAccessShaftPressureLocks(s);
    const deckLock = s.accessShaft.decks?.[s.activeDeck] ?? {};
    const autoLocked = Boolean(deckLock.autoLock);
    const locked = isDeckLocked(s, s.activeDeck);
    shaftMenu.innerHTML =
      '<button type="button" data-shaft-action="lock"' + (autoLocked ? ' disabled' : '') + '>' +
      (autoLocked ? 'LOCKED · PRESSURE SAFETY' : locked ? 'UNLOCK ' + s.activeDeck : 'LOCK ' + s.activeDeck) + '</button>' +
      (deckLock.lockReason ? '<div class="shaft-lock-reason">' + deckLock.lockReason + '</div>' : '') +
      (s.pawn.selected
        ? '<button type="button" data-shaft-action="go">GO TO <span>›</span></button>' +
          '<div class="shaft-deck-options" hidden>' +
          ['Z+2','Z+1','Z0','Z-1','Z-2'].filter((deck) => deck !== (s.pawn.deck ?? 'Z0'))
            .map((deck) => '<button type="button" data-shaft-deck="' + deck + '">' + deck + '</button>').join('') +
          '</div>'
        : '') +
      '<div class="shaft-menu-footer">' + s.activeDeck + '</div>';
    shaftMenu.style.left = Math.min(event.clientX, window.innerWidth - 190) + 'px';
    shaftMenu.style.top = Math.min(event.clientY, window.innerHeight - 150) + 'px';
    shaftMenu.hidden = false;
  }
  if (shaftMenu) listen(shaftMenu, 'click', (event) => {
    const action = event.target.closest('[data-shaft-action]')?.dataset.shaftAction;
    if (action === 'lock') {
      const deck = s.activeDeck;
      const access = s.accessShaft.decks?.[deck];
      if (access?.autoLock) note('ACCESS SHAFT LOCKED · PRESSURE SAFETY');
      else if (access) {
        access.manualLock = !access.manualLock;
        syncAccessShaftPressureLocks(s);
        note(access.manualLock ? 'ACCESS LOCKED · ' + deck : 'ACCESS UNLOCKED · ' + deck);
      } else {
        s.accessShaft.locked = !s.accessShaft.locked;
        note(s.accessShaft.locked ? 'ACCESS SHAFT LOCKED' : 'ACCESS SHAFT UNLOCKED');
      }
      closeShaftMenu(); refresh(); return;
    }
    if (action === 'go') {
      if (!s.pawn.selected) return;
      const list = shaftMenu.querySelector('.shaft-deck-options');
      if (list) list.hidden = !list.hidden;
      return;
    }
    const deck = event.target.closest('[data-shaft-deck]')?.dataset.shaftDeck;
    if (deck && s.pawn.selected) {
      const destination = shaftArrivalTile(deck);
      s.activeTool = null;
      s.selectedObject = null;
      closeShaftMenu();
      note('RESEARCHER ROUTING TO ' + deck);
      executeCommand(destination, deck);
    }
  });
  listen(document, 'click', (event) => {
    if (shaftMenu && !shaftMenu.hidden && !shaftMenu.contains(event.target)) closeShaftMenu();
  });

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
      const p = tile(e.clientX, e.clientY);
      if (s.devMode && onShaft(p)) { showShaftMenu(e); return; }
      closeShaftMenu();
      if (s.activeDeck !== 'Z0') {
        note('TECHNICAL DECKS ARE READ-ONLY');
        return;
      }
      if (s.activeTool) {
        cancel();
        note('BUILD MODE CANCELLED');
      } else executeCommand(p, s.activeDeck);
      return;
    }
    if (e.button === 0) {
      const p = tile(e.clientX, e.clientY);
      if (!inside(p)) return;
      if (s.pawn.selected && s.activeDeck !== (s.pawn.deck ?? 'Z0')) {
        executeCommand(p, s.activeDeck);
        return;
      }
      if (s.activeDeck !== 'Z0') {
        if (s.damageSimulator?.active) note('SHIP HULL IS UNDAMAGEABLE');
        else if (s.activeTool) note('TECHNICAL DECKS ARE SEALED · CONSTRUCTION DISABLED');
        else if (s.pawn.selected) executeCommand(p, s.activeDeck);
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
      else if (s.activeDeck !== 'Z0') {
        const deck = s.technicalDecks?.[s.activeDeck];
        const tile = deck?.tiles[key(p.x, p.y)];
        const shaft = deck?.shaft.some((point) => point.x === p.x && point.y === p.y);
        inspector.innerHTML = '<strong>' + (tile ? 'SHIP HULL' : shaft ? 'CENTRAL SHAFT' : 'OUTSIDE DECK FOOTPRINT') + '</strong><br>' +
          (tile ? 'Undamageable · Non-buildable · No integrity' : shaft ? '2 × 2 vertical access void' : 'Derived directly from Z0 footprint') + '<br>ENVIRONMENT · ' + (deck?.environmentTag ?? 'N/A') +
          '<br>LEVEL ' + s.activeDeck + ' · POSITION ' + p.x + ', ' + p.y;
      } else {
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
          '<strong>' + label + '</strong><br>' + attrs + '<br>ENVIRONMENT · ' + (s.deckEnvironmentTags?.Z0 ?? 'N/A') + '<br>POSITION ' + p.x + ', ' + p.y;
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
    if ((key === 'q' || key === 'e') && s.activeDeck === 'Z0' && s.activeTool === 'prefab') {
      e.preventDefault();
      s.rotation = (s.rotation + (key === 'q' ? 3 : 1)) % 4;
      r.draw();
    }
  });
  bindCameraControls(s, r, listen, controller.signal);
  return () => controller.abort();
}
