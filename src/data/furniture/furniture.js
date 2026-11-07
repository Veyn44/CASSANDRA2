const base = {
  stats: {},
  attributes: {},
  requirements: {},
  systems: {},
  defaultMaterialFamily: 'titanium',
};

export const FURNITURE = [
  {
    ...base,
    id: 'FUR0001',
    legacyId: 'wall-light',
    name: 'Wall Light',
    category: 'furniture',
    subcategory: 'lighting',
    type: 'furniture',
    w: 1,
    h: 1,
    description: 'Interior wall-mounted light fixture.',
    function: 'Interior lighting',
    placement: 'wall-mounted',
  },
];

export const FURNITURE_BY_ID = Object.freeze(
  Object.fromEntries(FURNITURE.map((item) => [item.id, item]))
);
export const FURNITURE_BY_LEGACY_ID = Object.freeze(
  Object.fromEntries(FURNITURE.map((item) => [item.legacyId, item]))
);
export function getFurniture(id) {
  return FURNITURE_BY_ID[id] ?? FURNITURE_BY_LEGACY_ID[id] ?? null;
}
