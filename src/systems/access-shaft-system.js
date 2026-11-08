import { detectSections } from './section-manager.js';

/**
 * Read the existing Z0 pressure snapshot and derive the access-shaft safety
 * interlock. This module never advances or mutates the atmosphere simulation.
 */
export function syncAccessShaftPressureLocks(state) {
  const shaft = state.accessShaft;
  if (!shaft?.decks) return;

  const data = detectSections(state);
  const adjacentSections = new Map();
  for (const cell of shaft.cells ?? []) {
    const sectionId = data.tileToSection[cell.x + ',' + cell.y];
    const section = sectionId ? data.byId[sectionId] : null;
    if (section) adjacentSections.set(section.id, section);
  }

  const z0 = shaft.decks.Z0;
  if (z0) {
    const sections = [...adjacentSections.values()];
    const unsafe = sections.filter((section) => section.pressure !== 'OPTIMAL');
    // Fail closed if the shaft cannot be associated with a known pressurized Z0 section.
    z0.autoLock = sections.length === 0 || unsafe.length > 0;
    z0.lockReason = z0.autoLock
      ? sections.length === 0
        ? 'PRESSURE DATA UNAVAILABLE'
        : 'PRESSURE SAFETY · ' + unsafe.map((section) => section.pressure).join(' / ')
      : null;
  }

  // Keep legacy global fields synchronized for older UI or callers.
  shaft.autoLocked = Boolean(z0?.autoLock);
  shaft.locked = Boolean(z0?.manualLock || z0?.autoLock);
  shaft.lockReason = z0?.lockReason ?? null;
}
