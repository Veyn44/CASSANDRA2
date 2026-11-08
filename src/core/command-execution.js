import { completePlanAction, completeModuleAction } from '../systems/construction-system.js';
import { findDeckPath, findWorkPath, isBlocked, isDeckLocked } from '../systems/navigation.js';
import { syncAccessShaftPressureLocks } from '../systems/access-shaft-system.js';

const key = (x, y) => x + ',' + y;

export function createCommandExecutor(s, refresh, note, objectAt, signal) {
  const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < 256 && p.y < 128;
  function walk(path, done) {
    if (!path || !path.length) { note('NO ACCESSIBLE PATH'); return; }
    if (path.length === 1) { done?.(); return; }
    s.pawn.moving = true;
    let i = 1;
    const step = () => {
      if (signal.aborted) return;
      if (i >= path.length) { s.pawn.moving = false; refresh(); done?.(); return; }
      const point = path[i++];
      if (point.deck && point.deck !== (s.pawn.deck ?? 'Z0')) {
        s.pawn.deck = point.deck; s.activeDeck = point.deck;
      }
      s.pawn.x = point.x; s.pawn.y = point.y;
      refresh();
      setTimeout(step, 115);
    };
    setTimeout(step, 115);
  }
  function command(p, targetDeck = s.activeDeck) {
    if (!inside(p) || s.pawn.moving) return;
    syncAccessShaftPressureLocks(s);
    if (!s.pawn.selected) { note('SELECT THE RESEARCHER FIRST'); return; }
    if (targetDeck !== (s.pawn.deck ?? 'Z0')) {
      if (isDeckLocked(s, s.pawn.deck ?? 'Z0') || isDeckLocked(s, targetDeck)) { note('ACCESS SHAFT LOCKED'); return; }
      const path = findDeckPath(s, p, targetDeck);
      if (!path) { note('NO ACCESSIBLE ROUTE · CHECK SHAFT AND DESTINATION'); return; }
      note('RESEARCHER MOVING THROUGH ACCESS SHAFT');
      walk(path, () => { note('RESEARCHER ARRIVED · ' + targetDeck); refresh(); });
      return;
    }
    const obj = targetDeck === 'Z0' ? objectAt(p) : null;
    if (obj && !obj.built) {
      if (s.pawn.op < 1) { note('NOT ENOUGH AP · 1 AP REQUIRED'); return; }
      if (!s.devMode && s.resources.titanium < 1) { note('INSUFFICIENT TITANIUM'); return; }
      const path = findWorkPath(s, obj.x, obj.y, obj.w, obj.h);
      if (!path) { note('NO ACCESSIBLE WORKING POSITION'); return; }
      note('MOVING TO MODULE BLUEPRINT');
      walk(path.map(point => ({ ...point, deck: targetDeck })), () => {
        const result = completeModuleAction(s, obj.id); note(result.message); refresh();
      });
      return;
    }
    const plan = targetDeck === 'Z0' && ((obj && s.map.plans[key(obj.x, obj.y)]) || s.map.plans[key(p.x, p.y)]);
    if (plan) {
      if (s.pawn.op < 1) { note('NOT ENOUGH AP · 1 AP REQUIRED'); return; }
      const tx = plan.type === 'demolishModule' && obj ? obj.x : p.x, ty = plan.type === 'demolishModule' && obj ? obj.y : p.y;
      const path = findWorkPath(s, tx, ty);
      if (!path) { note('NO ACCESSIBLE WORKING POSITION'); return; }
      note('MOVING TO CONSTRUCTION BLUEPRINT');
      walk(path.map(point => ({ ...point, deck: targetDeck })), () => {
        const result = completePlanAction(s, tx, ty); note(result.message); refresh();
      });
      return;
    }
    if (targetDeck === 'Z0' && isBlocked(s, p.x, p.y)) { note('UNREACHABLE · TARGET IS NOT WALKABLE'); return; }
    const path = findDeckPath(s, p, targetDeck);
    if (!path) { note('NO PATH TO DESTINATION'); return; }
    note('RESEARCHER MOVING · NO AP COST');
    walk(path, () => { note('RESEARCHER ARRIVED · NO AP COST'); refresh(); });
  }
  return command;
}
