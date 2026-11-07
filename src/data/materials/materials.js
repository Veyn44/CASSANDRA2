export const MATERIALS = [
  {
    id: 'MAT0001',
    name: 'Titanium',
    category: 'structural',
    unit: 'unit',
    asset: 'assets/materials/MAT0001.png',
    properties: { structural: true },
  },
  {
    id: 'MAT0002',
    name: 'Water',
    category: 'fluid',
    unit: 'unit',
    asset: 'assets/materials/MAT0002.png',
    properties: { fluid: true },
  },
  {
    id: 'MAT0003',
    name: 'Ice',
    category: 'volatile',
    unit: 'unit',
    asset: 'assets/materials/MAT0003.png',
    properties: { volatile: true },
  },
  {
    id: 'MAT0004',
    name: 'Oxygen',
    category: 'gas',
    unit: 'unit',
    asset: 'assets/materials/MAT0004.png',
    properties: { gas: true },
  },
  {
    id: 'MAT0005',
    name: 'Hydrogen',
    category: 'gas',
    unit: 'unit',
    asset: 'assets/materials/MAT0005.png',
    properties: { gas: true, fuel: true },
  },
];

export const MATERIAL_BY_ID = Object.freeze(
  Object.fromEntries(MATERIALS.map((material) => [material.id, material]))
);
