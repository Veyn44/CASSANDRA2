# CASSANDRA data architecture

## Stable identifiers

Data IDs are immutable and encode their family in a three-letter prefix followed by four digits:

- `MOD0001`: module definition (MOD0001 remains unused; the existing Resonance Core keeps MOD0002)
- `STR0001`: structural element, including external supports and doors
- `FUR0001`: furniture and interior equipment
- `MAT0001`: material definition
- `AST0001`: asteroid / generated cosmic body

Display names, descriptions, categories, balancing values and asset paths may change without changing an ID. IDs are not display labels.

## Buildable catalogue families

Definitions live under `src/data/` and are exposed to the build UI through `src/systems/prefab-manager.js`.

- Modules: `src/data/modules/modules.js`
- Structures: `src/data/structures/structures.js`
- Furniture: `src/data/furniture/furniture.js`

Every buildable definition has an ID, legacy ID, display name, category, subcategory, type, footprint (`w`, `h`), description, function, placement rule, and reserved `stats`, `attributes`, `requirements`, and `systems` objects. Those four objects are intentionally empty until each item receives designed gameplay values. Do not invent balancing values in catalogue scaffolding.

The UI groups items by category independently of their ID family. For example, doors are `STR` structural objects but appear in the `ACCESS` category. External Frame belongs to `STRUCTURE`; Wall Light belongs to `FURNITURE`.

Current build families:

- `MOD`: Resonance Core, Solar Panel, Ship Computer, Sleeping Module, Medical Chamber, EVA Suit Chamber, Material Tanks, Material Separator, Life Support Panel, Battery Storage.
- `STR`: External Frame, Airtight Door 1×1, Airtight Door 2×1, Basic Door 1×1, Basic Door 2×1.
- `FUR`: Wall Light.

Placement metadata distinguishes open-hull modules, wall openings, external frames, external equipment, and wall-mounted furniture. Doors occupy existing wall tiles and are traversable in the current prototype. Pressure simulation and door operation are not implemented. Solar Panels require a nearby External Frame; this is a placement prerequisite only, not an implemented power system.

## Data and assets

Definitions live under `src/data/`; external visual files live under `assets/`. The renderer consumes asset references and visual properties; it must not infer gameplay meaning from display names.

## Cosmic bodies

A body is a two-dimensional set of occupied grid cells. Its width and height describe its bounding box; `occupiedTileCount` describes the actual cell count. Generation is deterministic from the seed and parameters. The body stores true world data independently of player visibility.

## Visibility

Visibility is player knowledge, not world state. Revealing or hiding a cell must never delete or mutate its underlying world data. The initial surface visibility and later scanner reveals are handled by `visibility-manager.js`.

## Researcher action points

The current prototype starts with 12 action points per turn. The turn manager restores the pawn to its configured maximum when a turn advances.

## Game modes

Normal and developer modes share the same game systems. Their differences are expressed through a configuration object rather than separate simulation implementations.
