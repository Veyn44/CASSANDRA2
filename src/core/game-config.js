export const GAME_MODES = Object.freeze({
  normal: Object.freeze({
    mode: 'normal',
    freeConstruction: false,
    freeResearch: false,
    allTechnologiesUnlocked: false,
    unlimitedResources: false,
    devToolsEnabled: false,
  }),
  dev: Object.freeze({
    mode: 'dev',
    freeConstruction: true,
    freeResearch: true,
    allTechnologiesUnlocked: true,
    unlimitedResources: true,
    devToolsEnabled: true,
  }),
});

export function createGameConfig(mode = 'normal') {
  const selected = GAME_MODES[mode] ?? GAME_MODES.normal;
  return { ...selected };
}
