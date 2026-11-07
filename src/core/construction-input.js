import { placePrefab } from '../systems/prefab-manager.js';
import { createTechnicalDecks } from '../systems/technical-deck-generator.js';

const key = (x, y) => x + ',' + y;

export function createConstructionInput(s, inside, objectAt, refresh, note) {
  function place(p) {
    if (!inside(p)) return;
    if (s.activeDeck !== 'Z0') {
      note('TECHNICAL DECKS ARE SEALED · CONSTRUCTION DISABLED');
      return;
    }
    if (p.x >= 128) {
      note('SHIP CONSTRUCTION IS LIMITED TO THE LEFT SECTOR');
      return;
    }
    const k = key(p.x, p.y),
      t = s.map.tiles[k],
      existing = s.map.plans[k];
    if (s.activeTool === 'hull') {
      if (t?.hull || existing) return;
      if (s.devCreator) {
        s.map.tiles[k] = {
          hull: true,
          integrity: 100,
          wall: false,
          wallIntegrity: null,
          aluminiumWall: false,
          aluminiumWallIntegrity: null,
        };
        s.technicalDecks = createTechnicalDecks(s.map.tiles);
        note('HULL BUILT · DEV CREATOR');
      } else {
        s.map.plans[k] = { type: 'hull', materialFamily: 'titanium' };
        note('HULL BLUEPRINT · 1 TITANIUM · 1 AP');
      }
    } else if (s.activeTool === 'wall') {
      if (!t?.hull || t.wall || existing) {
        note('WALL REQUIRES COMPLETED HULL');
        return;
      }
      if (s.devCreator) {
        t.wall = true;
        t.wallIntegrity = 100;
        note('HULL WALL BUILT · DEV CREATOR');
      } else {
        s.map.plans[k] = { type: 'wall', materialFamily: 'titanium' };
        note('HULL WALL BLUEPRINT · 1 TITANIUM · 1 AP');
      }
    } else if (s.activeTool === 'aluminiumWall') {
      if (!s.devMode || !t?.hull || t.aluminiumWall || existing) {
        note('ALUMINIUM WALL REQUIRES AN OPEN HULL TILE IN DEV MODE');
        return;
      }
      if (s.devCreator) {
        t.aluminiumWall = true;
        t.aluminiumWallIntegrity = 100;
        note('ALUMINIUM WALL BUILT · DEV CREATOR');
      } else {
        s.map.plans[k] = { type: 'aluminiumWall', materialFamily: 'aluminium' };
        note('ALUMINIUM WALL BLUEPRINT · DEV TEST');
      }
    } else if (s.activeTool === 'erase') {
      if (s.devCreator) {
        if (existing) {
          delete s.map.plans[k];
          note('PLAN REMOVED · DEV CREATOR');
        } else {
          const obj = objectAt(p);
          if (obj) {
            delete s.map.objects[obj.id];
            if (s.selectedObject === obj.id) s.selectedObject = null;
            note('BUILD ITEM REMOVED · DEV CREATOR');
          } else if (t?.aluminiumWall) {
            t.aluminiumWall = false;
            t.aluminiumWallIntegrity = null;
            note('ALUMINIUM WALL REMOVED · DEV CREATOR');
          } else if (t?.wall) {
            t.wall = false;
            t.wallIntegrity = null;
            note('HULL WALL REMOVED · DEV CREATOR');
          } else if (t?.hull) {
            delete s.map.tiles[k];
            s.technicalDecks = createTechnicalDecks(s.map.tiles);
            note('HULL TILE REMOVED · DEV CREATOR');
          } else note('NOTHING TO ERASE');
        }
      } else if (existing) {
        delete s.map.plans[k];
        note('CONSTRUCTION PLAN REMOVED');
      } else {
        const obj = objectAt(p);
        if (obj) {
          const anchor = key(obj.x, obj.y);
          if (s.map.plans[anchor]?.type === 'demolishModule') return;
          s.map.plans[anchor] = { type: 'demolishModule', objectId: obj.id };
          note('MODULE DECONSTRUCTION PLANNED · 1 AP');
        } else if (t?.aluminiumWall) {
          s.map.plans[k] = { type: 'demolishAluminiumWall' };
          note('ALUMINIUM WALL DECONSTRUCTION PLANNED · 1 AP');
        } else if (t?.wall) {
          s.map.plans[k] = { type: 'demolishWall' };
          note('HULL WALL DECONSTRUCTION PLANNED · 1 AP');
        } else if (t?.hull) {
          s.map.plans[k] = { type: 'demolishHull' };
          note('HULL DECONSTRUCTION PLANNED · 1 AP');
        } else note('NOTHING TO ERASE');
      }
    } else if (s.activeTool === 'prefab') {
      const result = placePrefab(s, s.selectedPrefab, p.x, p.y);
      note(result.message);
      if (result.objectId) {
        s.selectedObject = result.objectId;
      }
    }
    refresh();
  }

  return place;
}
