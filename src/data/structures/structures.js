const base = {
  stats: {},
  attributes: {},
  requirements: {},
  systems: {},
  defaultMaterialFamily: 'titanium',
};

export const ALUMINIUM_WALL = {
  id: 'STR0006',
  legacyId: 'aluminium-wall',
  name: 'Aluminium Wall',
  category: 'structure',
  subcategory: 'internal-wall',
  type: 'structure',
  w: 1,
  h: 1,
  description: 'Thick structural aluminium wall. Integrity is tracked independently from the Hull.',
  function: 'Internal structural wall',
  placement: 'hull',
  integrityRange: [25, 100],
  defaultMaterialFamily: 'aluminium',
};

export const STRUCTURES = [
  {
    ...base,
    id: 'STR0001',
    legacyId: 'external-frame',
    name: 'External Frame',
    category: 'structure',
    subcategory: 'external-support',
    type: 'structure',
    w: 1,
    h: 1,
    description: 'Lightweight external mounting structure. Not a floor or wall.',
    function: 'External equipment support',
    placement: 'external-frame',
  },
  {
    ...base,
    id: 'STR0002',
    legacyId: 'titanium-door-1x1',
    name: 'Titanium Door 1×1',
    category: 'access',
    subcategory: 'titanium-door',
    type: 'door',
    w: 1,
    h: 1,
    description: 'Titanium pressure-sealing passage. Integrity controls section pressure state.',
    function: 'Airtight passage',
    placement: 'wall-opening',
    airtight: true,
    integrityRange: [25, 100],
    defaultMaterialFamily: 'titanium',
  },
  {
    ...base,
    id: 'STR0003',
    legacyId: 'titanium-door-2x1',
    name: 'Titanium Door 2×1',
    category: 'access',
    subcategory: 'titanium-door',
    type: 'door',
    w: 2,
    h: 1,
    description:
      'Wide titanium pressure-sealing passage. Integrity controls section pressure state.',
    function: 'Airtight passage',
    placement: 'wall-opening',
    airtight: true,
    integrityRange: [25, 100],
    defaultMaterialFamily: 'titanium',
  },
  {
    ...base,
    id: 'STR0004',
    legacyId: 'aluminium-door-1x1',
    name: 'Aluminium Door 1×1',
    category: 'access',
    subcategory: 'aluminium-door',
    type: 'door',
    w: 1,
    h: 1,
    description: 'Aluminium internal door. Resists vacuum while integrity is at least 75%.',
    function: 'Internal passage · pressure resistant',
    placement: 'wall-opening',
    airtight: false,
    integrityRange: [25, 100],
    defaultMaterialFamily: 'aluminium',
  },
  {
    ...base,
    id: 'STR0005',
    legacyId: 'aluminium-door-2x1',
    name: 'Aluminium Door 2×1',
    category: 'access',
    subcategory: 'aluminium-door',
    type: 'door',
    w: 2,
    h: 1,
    description: 'Wide aluminium internal door. Resists vacuum while integrity is at least 75%.',
    function: 'Internal passage · pressure resistant',
    placement: 'wall-opening',
    airtight: false,
    integrityRange: [25, 100],
    defaultMaterialFamily: 'aluminium',
  },
];

export const STRUCTURE_BY_ID = Object.freeze(
  Object.fromEntries(STRUCTURES.map((item) => [item.id, item]))
);
export const STRUCTURE_BY_LEGACY_ID = Object.freeze(
  Object.fromEntries(STRUCTURES.map((item) => [item.legacyId, item]))
);
export function getStructure(id) {
  return STRUCTURE_BY_ID[id] ?? STRUCTURE_BY_LEGACY_ID[id] ?? null;
}
