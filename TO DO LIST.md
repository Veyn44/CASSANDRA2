# CASSANDRA — TO DO LIST

> **Purpose:** Persistent development plan and source of truth for the foundational ship systems. Read this document before continuing work on these systems.
>
> **Progress rule:** Do not replace this plan when discussions evolve. Update this document in place. Mark completed work DONE and mark only the phase currently being worked on IN PROGRESS. All later phases remain PENDING. A phase is not DONE merely because its code exists: its logic must be reviewed, tested together, polished, and left in a playable state before work moves to the next phase.
>
> **Change-control rule:** Any meaningful change to scope, architecture, ordering, or accepted rules must be discussed and agreed before this document is changed. Do not silently rewrite settled rules.

## Overall development principles

- Build real game systems from the beginning. Do not add modules as isolated prefabs whose functionality will be invented later.
- Every functional construction element and module must have its attributes, placement rules, interactions, costs where applicable, rendering, and turn behaviour defined.
- Keep simulation logic separate from rendering and UI.
- Keep logical grid coordinates independent from sprite dimensions and visual perspective.
- The game is turn-based. Environmental degradation, integrity changes, energy production/consumption, and other simulation updates are evaluated on NEXT TURN, not continuously in real time.
- Develop in small increments, but finish and polish each phase to a playable state before starting the next.
- After each phase, review the whole phase's logic and interactions—not just whether individual features appear to work.
- Do not remove existing modules. Keep unfinished modules as placeholders or locked content until their real functionality is implemented.
- DEV MODE must remain a permanent testing tool. It must allow instant spawning/placement and deletion of construction and modules so normal game logic can be tested against deliberately damaged or incomplete ships.
- Before every code change, first tell the user exactly what will change, which files will be touched, and what will remain unchanged. Wait for explicit approval before editing.
- After each approved change, fetch changed files from GitHub again and verify the requested changes. Clearly distinguish static verification from actual browser/gameplay testing.

## Technical decks — approved implementation rules (2026-11-07)

- Z0 is the single source of truth for the ship's outer Hull footprint.
- Technical decks mirror the exact set of Hull coordinates in Z0; their dimensions are never configured independently.
- A Z0 footprint expansion or reduction must regenerate technical-deck geometry from the updated Z0 footprint.
- Technical deck geometry is stored separately from any future deck equipment/content so geometry regeneration cannot erase that content.
- Technical deck surfaces use the generic `SHIP_HULL` type. It is not a player-buildable material and has no integrity, damage, repair, or demolition interactions.
- Technical decks have a central 2×2 vertical shaft wherever those cells exist inside the Z0 footprint.
- The first implementation exposes deck views using [ and ] to cycle levels and 0 to return to Z0. Technical deck views are read-only.
- The starting technical levels are Z+2, Z+1, Z-1, and Z-2; Z0 remains the source level.
- This is a geometry/rendering milestone only. It does not change Z0 construction, atmosphere, section detection, modules, economy, or JSON ship export.

## Persistent ship prefab and DEV tools rules

- The initial ship will eventually be defined by a complete JSON prefab containing all information needed to reconstruct its initial layout and configuration.
- JSON should describe map dimensions, construction tiles, walls, doors, modules, positions, orientations, material/initial attributes, and explicit links/configuration that cannot safely be derived.
- Derived runtime state (for example, currently detected section boundaries) should be computed by game logic rather than duplicated as a second source of truth in the prefab.
- JSON export remains available in DEV TOOLS as a development and testing facility.
- Normal gameplay will not depend on editing or re-importing this JSON to expand the ship. Once the initial ship is established, players expand it directly through normal gameplay.
- DEV MODE must always support instant spawning of available construction pieces/modules and deletion of Hull Floor and other elements, so NEXT TURN behaviour can be tested on incomplete, damaged, or exposed layouts.

---

# PHASE 1 — VACUUM & IDEAL LIFE-SUPPORT ENVIRONMENT

**Status: IN PROGRESS**

**Goal:** Define the outside vacuum and the ideal interior environment, then implement the minimum airtightness rules needed to determine whether a space can maintain life-support conditions. Start here before building the full construction catalogue.

### 1.1 Outside environment: space vacuum

- [ ] Define space as vacuum: no breathable atmosphere and no ambient pressure.
- [ ] Define the basic environmental properties relevant to the ship.
- [ ] Define which ship surfaces are exposed to space.
- [ ] Treat vacuum as an environmental condition, not as an instant destructive event.
- [ ] Establish how exposure is evaluated on NEXT TURN.

### 1.2 Ideal interior environment

Define the baseline target state for a properly sealed, functioning interior:

- [ ] Pressure within the acceptable range.
- [ ] Oxygen within the acceptable range.
- [ ] Temperature within the habitable range.
- [ ] Distinguish an ideal life-support state from a space that is merely enclosed.
- [ ] Keep the first implementation deliberately simple; do not build a detailed fluid/airflow simulation yet.

### 1.3 Airtightness rules

- [ ] Hull Floor is part of the hermetic boundary between the interior and vacuum.
- [ ] Hull Wall is part of the hermetic boundary.
- [ ] Airtight Door seals only while closed.
- [ ] Inner Wall is not airtight.
- [ ] Inner Door is not airtight.
- [ ] Glass Wall is non-airtight in the initial version; special sealed glass variants may be added later.
- [ ] An open/unsealed space cannot maintain its ideal atmosphere.
- [ ] Define how a missing/removed Hull Floor or Hull Wall affects the relevant space on NEXT TURN.

### 1.4 Basic environment state

- [ ] Define the minimum environment state needed by a space/section: sealed or unsealed, pressure, oxygen, temperature, and life-support status.
- [ ] Define the ideal-state values/ranges in one authoritative place.
- [ ] Define the initial failure behaviour when airtightness is lost.
- [ ] Make the rules deterministic and testable.

### Phase 1 acceptance / playable-state review

Phase 1 is not complete until all of the following have been checked together:

- [ ] A correctly sealed interior can reach and maintain the defined ideal state.
- [ ] An unsealed space exposed to vacuum cannot maintain that state.
- [ ] Removing Hull Floor/Hull Wall in DEV MODE produces the expected result on NEXT TURN.
- [ ] Closed Airtight Doors seal; open Airtight Doors do not.
- [ ] Inner Walls and Inner Doors do not accidentally create airtight boundaries.
- [ ] The implementation behaves consistently across different room shapes and map edges.
- [ ] The whole phase is reviewed and polished into a playable, understandable state before Phase 2 begins.

**Phase 1 completion rule:** Mark this phase DONE only after the acceptance review passes. Then mark Phase 2 IN PROGRESS. Do not begin Phase 2 implementation early merely because some Phase 1 code is present.

---

# PHASE 2 — SECTION DETECTION & CONTROL PANEL

**Status: PENDING**

**Goal:** Build the room/section model and the Control Panel UI. A section is a detected floor area managed by one local control unit. This phase establishes section identity and capacity before the full construction and energy catalogue is implemented.

### 2.1 Section Control Panel I: placement and identity

- [ ] Panel footprint is 1×1 tile.
- [ ] Render the panel through Canvas as a distinct tile with a small directional arrow.
- [ ] The arrow indicates the direction/orientation of the panel toward the adjacent Aluminium Wall.
- [ ] Panel must be placed directly next to an Aluminium Wall; it cannot be placed arbitrarily in the middle of a room.
- [ ] Support the four grid orientations.
- [ ] Allow placement in an unfinished/open construction area.
- [ ] Exactly one Control Panel may be installed in a detected section.
- [ ] A second panel cannot be placed in the same section.
- [ ] Panel placement creates/records the section identity even if the section is incomplete or currently nonfunctional.

### 2.2 Active Tiles and capacity

- [ ] Active Tiles are all detected floor tiles in the section, from boundary to boundary or to an open/unbounded space.
- [ ] Only floor tiles count toward capacity.
- [ ] Walls, doors, and the panel itself do not count as Active Tiles.
- [ ] Control Panel I initial capacity: **64 Active Tiles (8×8)**.
- [ ] Show the count as ACTIVE TILES / CAPACITY, for example 10 / 50 or 110 / 50.
- [ ] If capacity is exceeded, the panel still displays section information, but the section cannot become functional.
- [ ] Do not require airtight walls or a fully enclosed room merely for a section to be detected.

### 2.3 Section detection and boundaries

- [ ] Detect connected floor areas using the agreed physical boundaries.
- [ ] Physical walls and Hull define boundaries.
- [ ] Open passages without a separating door/wall connect floor areas.
- [ ] Doors preserve the identity of the sections on either side, including when the door is open.
- [ ] The panel must inspect neighbouring construction walls, including corner adjacency, for section information and diagnostics.
- [ ] Support irregular layouts: rectangles, corridors, L-shapes, and open/partially enclosed sections.
- [ ] Recalculate section membership when construction or doors change.
- [ ] Handle section split/merge cases without silently losing or confusing section identity.
- [ ] Support section IDs and player-editable section names.

### 2.4 Basic Section UI and information visibility

- [ ] Add a Sections overlay/toggle that highlights detected section boundaries and IDs.
- [ ] Clicking a section opens its basic overview.
- [ ] Basic overview contains only aggregate/visually inferable information: section ID/name, Active Tiles/capacity, counts of relevant construction/support elements, and broad operating status.
- [ ] Do not reveal the hidden integrity/status of individual tiles through hover-over.
- [ ] Individual-tile condition and precise fault location require an appropriate paid diagnostic action.
- [ ] Define what happens to names/IDs when sections split or merge.

### 2.5 Control Panel responsibility

- [ ] Define the panel as the local management/maintenance unit for its section, not merely a display terminal.
- [ ] A section over capacity is detected and reportable but nonfunctional.
- [ ] A section that is not correctly constructed/connected cannot claim functioning local life support or power.
- [ ] Keep detailed power-network and backup-power implementation for Phase 3, while defining the interfaces this phase needs.

### 2.6 Door relationships and control

- [ ] A door between two sections can be controlled by every active panel belonging to either adjacent section.
- [ ] A door can therefore be visible/control-accessible from more than one panel.
- [ ] Manual opening costs 1 AP.
- [ ] Manual closing costs 1 AP.
- [ ] Preserve the distinction between automatic powered control and manual local operation; complete power-failure behaviour in Phase 3.

### 2.7 Diagnostics concept and UI

- [ ] Basic section overview is free and aggregate-only.
- [ ] Detailed Section Scan is an action costing 2 AP and energy.
- [ ] A scan can report anomalies in neighbouring sections without necessarily revealing exact coordinates.
- [ ] More detailed investigation can require access to the local panel in the affected section.
- [ ] The bridge/main control may eventually show only overall section integrity/status, while a local panel provides detailed logs.
- [ ] Exact scan report tiers and information disclosure are to be finalized before implementation of detailed diagnostics.

### Phase 2 acceptance / playable-state review

- [ ] Panel placement/orientation and adjacency rules work.
- [ ] Section detection works for regular, irregular, open, split, and merged layouts.
- [ ] Active Tiles count is correct and excludes walls/doors/panel.
- [ ] Capacity enforcement works at and above 64 tiles.
- [ ] One-panel-per-section rule is reliable.
- [ ] Section overlay, selection, naming, and aggregate UI work.
- [ ] Individual tile state is not exposed by hover-over.
- [ ] Door-to-panel relationships work for both adjacent sections.
- [ ] The complete section system is reviewed and polished into a playable state before Phase 3 begins.

---

# PHASE 3 — CONSTRUCTION CATALOGUE, ENERGY & MODULE SYSTEMS

**Status: PENDING**

**Goal:** Define and implement the actual construction elements and foundational modules. Every functional element introduced in this phase must have its attributes and real gameplay logic—not just a prefab appearance.

### 3.1 Construction data model

Establish a consistent definition for every construction/module type, including where relevant:

- [ ] Stable type/ID.
- [ ] Footprint and occupied grid layer.
- [ ] Placement/adjacency rules.
- [ ] Orientation and rotation.
- [ ] Material requirements/costs.
- [ ] Integrity and damage behaviour.
- [ ] Airtight/sealing behaviour.
- [ ] Structural/support behaviour.
- [ ] Electrical/conduit behaviour.
- [ ] Interaction and UI behaviour.
- [ ] Canvas rendering and visual states.
- [ ] NEXT TURN behaviour.
- [ ] DEV MODE spawn/delete support.

Keep floor tiles, walls, doors, floor-placed modules, and wall-mounted modules distinct in the data model. Do not model all of them as interchangeable generic floor prefabs.

### 3.2 Hull and interior construction

Implement and define:

- [ ] **Hull Floor** — hermetic floor/boundary tile.
- [ ] **Hull Wall** — hermetic outer wall.
- [ ] **Aluminium Wall** — thick 1×1 internal structural wall; contains service space and carries conduits.
- [ ] **Aluminium Beam** — structural support element; define its footprint/placement and support effect.
- [ ] **External Aluminium Frame** — external structure outside the ship's Hull floor capacity.
- [ ] **Glass Wall** — non-airtight internal transparent partition in the first version; future material variants may include reinforced/bullet-resistant glass.

### 3.3 Doors

- [ ] **Airtight Door 1×1** — seals when closed.
- [ ] **Airtight Door 2×1** — wider airtight passage.
- [ ] **Inner Door 1×1** — non-airtight internal passage.
- [ ] **Inner Door 2×1** — wider non-airtight passage.
- [ ] Define placement on boundaries, orientation, occupancy, opening/closing, and panel control.
- [ ] Preserve section identity across doors.

### 3.4 Control Panel functionality

- [ ] Implement Control Panel I as a fully functional local section-management unit.
- [ ] Define local power distribution to devices within its section; devices in a functional section connect automatically, without requiring the player to route a separate wall to every device.
- [ ] Define how the panel is connected to the ship's central distribution network through the structural/conduit path.
- [ ] Define the panel's responsibility for local life-support/atmosphere maintenance.
- [ ] Implement backup energy and its duration (current design proposal: 10 turns / 5 in-game days).
- [ ] Implement loss of central connection, backup operation, and full panel shutdown when backup is exhausted.
- [ ] Implement panel UI and control of lights/devices/adjacent doors.
- [ ] Implement basic and detailed diagnostic action interfaces.
- [ ] Keep future Control Panel II/III extensibility in the data model, but higher tiers do not need to be implemented now.

### 3.5 Integrity, support and power-path logic

- [ ] Define integrity for Hull tiles and internal Aluminium structures separately.
- [ ] Define section structural integrity based on actual construction/support, not a random standalone percentage.
- [ ] Define the relationship between damaged supports, nearby Hull integrity, airtightness, and possible floor collapse.
- [ ] Define the central power path from RC to each section panel.
- [ ] Evaluate power-path integrity based on the actual path, not only an average of unrelated walls.
- [ ] Current proposed thresholds: below 95% may cause lighting/conduit failures; below 90% disconnects the panel from the central network. Final exact rules must be tested and balanced.
- [ ] Define local branch/path failures so a damaged conduit can affect only relevant downstream devices where appropriate.
- [ ] Evaluate all integrity and power changes on NEXT TURN.

### 3.6 Energy system

Implement:

- [ ] **RC / Resonance Core** — central ship energy source/distribution component; retain its special non-classical propulsion/lore role.
- [ ] **Battery** — storage capacity, charge/discharge, and state.
- [ ] **Solar Panel** — energy generation, placement on external frame/valid external positions, and environmental damage.
- [ ] Central energy network.
- [ ] Section-local energy distribution.
- [ ] Device energy consumption.
- [ ] Backup power for section panels.
- [ ] Energy accounting and clear UI values.

Do not invent conventional engine/mass behaviour for the Resonance Core. Its special spatial-binding function remains distinct from ordinary electrical generation/distribution unless explicitly designed otherwise.

### 3.7 Lighting

- [ ] **Wall Light** — 1×1 device placed on a valid boundary/floor location adjacent to an Aluminium Wall, with direction/orientation.
- [ ] Light points into the intended space.
- [ ] Initial target range: approximately 6 tiles, subject to balancing.
- [ ] Other modules/obstacles can block emitted light.
- [ ] Light requires section power.
- [ ] Control Panel can switch lights on/off.
- [ ] Motion Detection mode is a later extension; define data support now if straightforward, but do not let it delay basic lighting.

### 3.8 EVA Module

- [ ] **EVA Module 1×1** — functional access between ship interior and external vacuum.
- [ ] Integrate with airtightness and door/airlock logic.
- [ ] Define basic pawn exit/return interaction.
- [ ] Keep advanced suit oxygen, EVA hazards, and sampling mechanics for later unless required by the initial playable loop.

### 3.9 Existing modules and placeholders

- [ ] Preserve all existing module definitions/assets/catalogue entries.
- [ ] Classify each as Functional, Placeholder, or Locked.
- [ ] Prevent nonfunctional placeholders from being built in normal gameplay.
- [ ] Allow DEV MODE testing/spawning where appropriate.
- [ ] Do not delete or casually rename existing content.

### Phase 3 acceptance / playable-state review

- [ ] Every functional construction/module has a complete data definition and gameplay behaviour.
- [ ] Placement, rotation, occupancy, adjacency, and rendering agree.
- [ ] Hull, interior walls, doors, and airtightness work together.
- [ ] Aluminium construction supports the agreed structural/conduit role.
- [ ] RC, solar, battery, central distribution, and section power work together.
- [ ] Panel backup and failure behaviour work.
- [ ] Lights respond to orientation, obstruction, power, and panel control.
- [ ] EVA has a real basic interaction.
- [ ] Existing unfinished modules remain safely preserved as placeholders/locked entries.
- [ ] The full construction and energy system is reviewed and polished into a playable state before Phase 4 begins.

---

# PHASE 4 — INITIAL CASSANDRA, JSON PREFAB & TURN SIMULATION

**Status: PENDING**

**Goal:** Assemble the smaller initial ship from the now-functional systems, define it as a complete JSON prefab, and verify that the ship reacts correctly to NEXT TURN and DEV MODE testing.

### 4.1 Initial ship design

- [ ] Replace the oversized current starting layout with a substantially smaller Cassandra (current direction: roughly one-third the current size; exact dimensions/layout to be decided).
- [ ] Start with two functional sections:
  - **Section 01 — RC / Engineering**
  - **Section 02 — Bridge / Control**
- [ ] Each section has its own Control Panel.
- [ ] Include the RC, battery, solar panels, basic lights, doors, and EVA module as required for the initial working ship.
- [ ] Ensure the ship is a scientific exploration vessel, not a fighter or atmospheric lander.
- [ ] Keep the external aluminium frame and solar array visually/functionally distinct from Hull floor capacity.
- [ ] Confirm the layout is buildable and maintainable under the 50-tile initial panel capacity.

### 4.2 Complete JSON ship prefab

- [ ] Define the entire initial ship in JSON, not only Hull and walls.
- [ ] Include map dimensions.
- [ ] Include all Hull Floor and Hull Wall tiles.
- [ ] Include all internal walls, beams, external frame pieces, and doors.
- [ ] Include every starting module and its position/orientation.
- [ ] Include initial material/configuration attributes where needed.
- [ ] Include explicit links/configuration that cannot safely be derived at runtime.
- [ ] Use stable IDs where object relationships require them.
- [ ] Derive runtime section membership and other computed state from the actual layout rather than duplicating it as authoritative prefab data.
- [ ] Integrate the prefab into NEW GAME so the starting ship is created from the JSON definition.
- [ ] Keep JSON export in DEV TOOLS as a permanent development/testing feature.
- [ ] Normal gameplay expansion must happen directly in the game, not by editing/re-importing the starting prefab.

### 4.3 NEXT TURN simulation

At the end of each turn, evaluate the foundational ship systems in a consistent order:

- [ ] Outside environmental exposure.
- [ ] Hull and construction integrity.
- [ ] Structural support and section integrity.
- [ ] Solar energy generation and solar-panel environmental damage.
- [ ] Battery charging/discharging.
- [ ] RC and central energy availability.
- [ ] Central power paths to section panels.
- [ ] Section-panel backup energy and shutdown.
- [ ] Local module energy consumption.
- [ ] Life-support/atmosphere state for each section.
- [ ] Other defined degradation/failure effects.

The exact order and dependency handling must be explicit so that a failure in one subsystem produces consistent downstream consequences.

### 4.4 DEV MODE testing tools

- [ ] Preserve instant construction/spawn without normal material/AP costs.
- [ ] Preserve deletion of Hull Floor and extend deletion to relevant construction/module types.
- [ ] Allow deliberate creation of holes/exposed tiles to test vacuum and airtightness.
- [ ] Allow spawning all functional modules for isolated tests.
- [ ] Ensure DEV MODE uses the same simulation rules as normal gameplay; it only bypasses construction costs/time, not the underlying behaviour.
- [ ] Keep JSON export available.
- [ ] Make it possible to end turns after deliberately damaging/removing parts of the ship.

### 4.5 Initial ship acceptance tests

- [ ] NEW GAME creates the smaller Cassandra from its complete JSON prefab.
- [ ] Both starting sections are detected and functional.
- [ ] Both panels report correct Active Tiles and capacity.
- [ ] The sealed ship maintains the defined ideal interior environment.
- [ ] Opening an airtight boundary to vacuum changes the relevant environment correctly.
- [ ] Removing Hull Floor in DEV MODE causes the expected environmental change on NEXT TURN.
- [ ] Solar panels generate energy and suffer the defined external damage.
- [ ] Battery and RC energy behaviour is correct.
- [ ] Section power failures and panel backup behaviour are correct.
- [ ] Door control works from all valid adjacent panels.
- [ ] The ship remains playable after normal turn progression and after tested damage scenarios.
- [ ] JSON export faithfully represents the complete initial ship and can be used to reconstruct it.
- [ ] The full initial ship is reviewed, balanced, and polished into a playable state.

**Phase 4 completion:** The foundational Cassandra milestone is complete. Further ship expansion and new gameplay systems proceed through normal gameplay and separately agreed development tasks.

---

## Decision log / settled rules

These are the currently agreed design decisions. Do not silently change them during implementation.

- Cassandra is a scientific exploration/research vessel that investigates anomalies and materials, visits asteroids to scan and collect samples, and returns to its mothership. It is not a fighter and is not designed to land on planets.
- The Resonance Core relocates the ship through a spatial binding with another body; it is not a conventional engine.
- Hull is the outer airtight envelope. Hull integrity can degrade, but the design does not include the ship being physically torn apart in the conventional damage sense.
- Aluminium internal walls are thick 1×1 construction blocks, not thin lines between floor tiles. They provide structural/service space and carry conduits.
- Aluminium can be sourced/refined from asteroid materials; asteroid compositions vary. Exact yields and recipes remain to be balanced.
- Airtight construction uses rarer/mixed materials and should be more expensive than ordinary aluminium construction.
- External aluminium frame is outside the ship's Hull floor-tile capacity and can support external equipment such as solar panels and sensors.
- Section Active Tiles count floor tiles only. Walls, doors, and the panel do not count.
- Control Panel I capacity is currently 64 Active Tiles (8×8).
- One Control Panel per section. It must be directly adjacent to an Aluminium Wall and has a directional orientation.
- A panel may be installed before the section is complete. It still reports detected section information, but an over-capacity or otherwise invalid section is nonfunctional.
- Sections need not be airtight to be detected.
- A section panel is a local management/maintenance unit responsible for local systems including power and atmosphere, subject to valid construction and network connection.
- Devices within a functional section are connected to the panel's local distribution automatically; the player does not route a separate cable to every device.
- A panel connects to the central ship network through the structural/conduit path. Current proposed power-path thresholds: below 95% may cause lighting/conduit faults; below 90% disconnects the panel from the central network. These values are provisional until tested.
- A section panel has a proposed 10-turn (5 in-game day) backup supply. A portable battery is a possible future mechanic, not part of the initial implementation requirement.
- Doors between sections can be controlled by active panels in either adjacent section. Manual opening costs 1 AP and manual closing costs 1 AP.
- The game is turn-based: integrity/environment/energy updates occur on NEXT TURN, not continuously in real time.
- Basic section information must not expose individual tile condition via hover-over. Detailed inspection is an action with AP and energy cost; proposed Section Scan cost is 2 AP.
- Section scan reports may identify affected sections without revealing exact coordinates. Local panel diagnostics may provide more detailed information.
- A hidden living-metal entity may consume aluminium inside walls and cause anomalies. Do not reveal it through ordinary diagnostics or implement its full encounter until separately designed.
- Existing modules must be preserved as functional, placeholder, or locked content; do not delete them to simplify the new architecture.
- DEV MODE remains available for instant spawn/build and destructive testing. JSON export remains in DEV TOOLS; normal gameplay does not use JSON to expand the ship.
- User approval is required before every code modification. First state exact files and changes, then wait.

## Latest accepted rules — 2026-11-07

These rules were explicitly approved and are now the implementation target. They do not mark Phase 1 or Phase 2 complete; browser/gameplay verification is still required.

- **Section capacity:** Control Panel I remains limited to 64 floor tiles (8×8). The Control Panel does not define or increase the ship-wide Hull tile capacity.
- **Ship-wide capacity:** A separate ship Hull tile limit is still undecided and is intentionally deferred.
- **Starting integrity:** Every construction tile and placed component in the New Game starting ship begins at 100% integrity. DEV/test damage values must not leak into the New Game starting state.
- **Integrity floor:** Integrity of walls, doors, floor tiles, and components cannot degrade below 25%.
- **NORMAL / STABLE:** 100–75% integrity. No leak.
- **CAUTIOUS:** 74–50% integrity. The affected section loses exactly one pressure level on entry (for example OPTIMAL → LOW), not one level every turn. Temperature begins leaking. Aluminium components inside that section degrade by a random 2–10% per completed turn while it remains CAUTIOUS.
- **CRITICAL:** 49–25% integrity. If any one boundary tile or boundary door in a section falls below 50%, the entire section changes to NONE / VACUUM (−270 °C) in that same NEXT TURN calculation. Integrity then stops at 25%.
- **Locality:** Vacuum and aluminium degradation effects are confined to the affected section; intact boundaries prevent the effect from propagating into another section.
- **Boundary aluminium degradation:** Aluminium Walls and Aluminium Doors on a section boundary degrade by a random 2–10% per completed turn when exposed to an adjacent LOW-pressure or VACUUM section. LOW pressure is sufficient; degradation must not wait for full vacuum.
- **Interior aluminium degradation:** Aluminium components inside a CAUTIOUS section continue to degrade by a random 2–10% per completed turn.
- **Door degradation:** STR0004/STR0005 Aluminium Doors degrade under the same boundary exposure rule as Aluminium Walls. STR0002/STR0003 Titanium Doors do not degrade from environmental LOW-pressure or vacuum exposure. Both door materials still use the same integrity thresholds for sealing and section-state changes. An open door is an immediate open boundary.
- **Door materials:** Titanium Doors use titanium; Aluminium Doors use aluminium. Door integrity is tracked as airtightness/sealing integrity, not hit points or physical material loss.
- **Testing:** The initial ship geometry and JSON export remain unchanged. The next verification is New Game initialization and NEXT TURN behaviour on the completed Cassandra layout.

---

## Current progress

- [x] Four-phase roadmap agreed with the user.
- [x] Complete initial plan drafted for this document.
- [x] Create this document in the repository and verify it by fetching it back.
- [ ] Phase 1 — Vacuum & Ideal Life-Support Environment: **IN PROGRESS**.
- [ ] Phase 2 — Section Detection & Control Panel: PENDING.
- [ ] Phase 3 — Construction Catalogue, Energy & Module Systems: PENDING.
- [ ] Phase 4 — Initial Cassandra, JSON Prefab & Turn Simulation: PENDING.

**Next task:** Begin Phase 1 only. Before changing code, present the exact proposed files and scope and wait for explicit user approval.
