Here is the revised Technical Plan optimized for an MVP.

This plan focuses on getting a "playable vertical slice" working immediately using free, static images (Stage-Based), but it explicitly instructs the AI to architect the code so that swapping in Mapbox later is easy (using a "Modular" design).

Copy the text below and feed it to Claude.

---

# Technical Plan: 3D Glider Game (MVP Phase)

**Objective:** Build a browser-based 3D glider game using Three.js.
**Phase 1 Strategy:** "Local Stages." We will load static heightmap images for terrain to avoid API costs and complexity.
**Phase 2 Strategy (Future):** Swap the terrain loader for a Mapbox API streamer without breaking the game logic.

## Core Tech Stack

* **Language:** JavaScript (ES6 Modules)
* **Build Tool:** Vite (for fast local development)
* **3D Engine:** Three.js
* **Physics:** Custom arcade-style aerodynamics (No heavy physics engine like Cannon.js yet)

---

## Milestone 1: The "Grey Box" & Physics Core

**Goal:** A reliable flight controller on a flat infinite plane.
**Manual Steps:** None.

**Tasks for Claude:**

1. **Project Setup:** Initialize a basic Vite + Three.js project.
2. **Architecture:** Create a `Glider` class.
* Store `position` (Vector3), `velocity` (Vector3), and `rotation` (Quaternion).
* **Input:** Map Arrow Keys/WASD to pitch and roll.


3. **Physics Loop:** Implement a specialized "Glider Physics" update function:
* **Gravity:** Constant downward force.
* **Lift Logic:** Calculate the "Angle of Attack." If the nose is level or slightly up *and* speed is high → generate upward lift.
* **Drag:** Speed decays over time, but decays *faster* if pitching up.
* **Dive:** Pitching down converts potential energy (height) into kinetic energy (speed).


4. **Camera:** Implement a "Chase Camera" that follows the glider smoothly (using `Vector3.lerp` for lag).
5. **HUD:** Simple HTML overlay showing Speed (km/h) and Altitude (m).

---

## Milestone 2: Static Terrain Engine (The MVP Terrain)

**Goal:** Load a local black-and-white image and turn it into 3D mountains.
**Manual Steps:**

1. Go to **Tangram Heightmapper** (web tool).
2. Find a cool spot (e.g., Mount Fuji or Grand Canyon).
3. Export the **Heightmap** (grayscale) and take a screenshot of the **Map View** (color texture).
4. Name them `terrain_height.png` and `terrain_color.jpg` and put them in the `/public` folder.

**Tasks for Claude:**

1. **Interface Design (Crucial for Future Mapbox):**
* Create an abstract class or interface named `TerrainProvider`.
* It must have a method `getHeightAt(x, z)` that returns the ground altitude at that world coordinate.


2. **Implementation:** Create `LocalTerrainProvider` that extends `TerrainProvider`.
* Load the `terrain_height.png` into an HTML Canvas.
* Read pixel data (`context.getImageData`) to determine height values (0 = black, 255 = white).
* Generate a Three.js `PlaneGeometry` with high segments (e.g., 256x256).
* Displace vertices based on the pixel data.
* Apply `terrain_color.jpg` as the material texture.


3. **Collision:** Update the Glider logic to call `TerrainProvider.getHeightAt(playerX, playerZ)`. If player height < ground height, stop the game (Crash).

---

## Milestone 3: Thermals & Game Loop

**Goal:** Add gameplay elements (Updrafts).
**Manual Steps:** None.

**Tasks for Claude:**

1. **Thermal Logic:** Create a `Thermal` class (invisible cylinder).
2. **Placement:** For this MVP, write a function that scans the terrain height data.
* *Algorithm:* Find "peaks" or high points in the heightmap array and automatically place a Thermal object directly above them (simulating real ridge lift).


3. **Physics Interaction:**
* If the glider enters a Thermal's radius, add a vertical velocity modifier (`+Y`).
* Rotate the glider slightly to simulate turbulence.


4. **Visuals:** Create a simple particle system (white semi-transparent sprites) spiraling upward inside the thermal so the player can see them.

---

## Milestone 4: The "Stage Select" (MVP UI)

**Goal:** Allow switching between different "Local Maps."
**Manual Steps:** Create 2 or 3 folders in your project (e.g., `/maps/canyon`, `/maps/alps`) and put different heightmap/texture pairs in them.

**Tasks for Claude:**

1. Create a simple HTML Menu on startup.
2. List the available maps (hardcoded for now based on your folders).
3. On click:
* Destroy the current scene.
* Re-initialize `LocalTerrainProvider` with the selected image paths.
* Reset the Glider to the starting position (high up).



---

## Milestone 5: Polish & Assets

**Goal:** Replace the white cube with a real glider.
**Manual Steps:**

1. Download a free "Low Poly Glider" model (`.glb` or `.gltf` format) from **Kenney.nl** or **Poly.pizza**.
2. (Optional) Download a "Tree" model.

**Tasks for Claude:**

1. **GLTF Loader:** Use Three.js `GLTFLoader` to replace the generic cube mesh with your downloaded glider model.
2. **Vegetation (Stretch Goal):**
* Scatter the tree model randomly across the map.
* **Optimization:** Use `InstancedMesh` to render them efficiently.
* *Constraint:* Do not place trees if the terrain slope is too steep (cliffs) or the height is too high (snow cap).

*Questions from Claude (with answers)*
  ***Questions***

  1. Spawn altitude: Milestone 4 mentions resetting "high up" - what starting altitude should I use for Milestone 1? 500m? 1000m?
  1000 m
  2. Terrain scale: The heightmap uses 256x256 segments, but what real-world area should this represent? 1km × 1km? 5km × 5km? This affects gameplay feel significantly.
  Let's start with 3 km x 3 km and we can adjust as needed.
  3. Height scaling: When mapping pixel values (0-255) to terrain height, what's the max elevation? A 255 value should equal how many meters?
  I'll scale these values so that 255 is the absolute maximum elevation in the world (8,849 metres).
  4. Yaw control: The plan specifies pitch and roll controls. Should yaw be player-controlled (rudder key), or derived from banking angle (more realistic soaring behavior)?
  Let's go with derived from banking angle to start.
  5. Crash handling: "Stop the game" on collision - should this show a game-over screen with restart option, or just freeze?
  To start let's just have a simple game over screen with the ability to restart.
  6. Map boundaries: What happens when the glider flies past the terrain edge?  Invisible walls? Fall into void?
  Let's have it force the player to turn until they are no longer going off the map.

  ***Concerns***

  1. Tangram Heightmapper - I should verify this tool is still available. Do you have a backup source for heightmaps if it's not?
  It still works!  I just checked.
  2. Frame-rate independence: The physics section doesn't mention delta time.  I'll implement this, but wanted to flag it.
  Yes!  Good idea.
  3. JavaScript "interfaces": JS doesn't have true abstract classes. I'll use a base class with documented contracts or TypeScript if you'd prefer type safety.
  No need for typescript.
  4. Physics tuning: Terms like "slightly up" and "high speed" will need numerical thresholds. Expect some iteration to get the feel right.
  Sounds good.

  ***Suggestions***

  1. Consider adding a debug mode toggle (visualize thermals, show physics vectors) - very useful during development.
  Yes!  This is a great idea, let's do it.
  2. Should I add basic mobile/touch controls, or is this desktop-only for MVP?
  Let's add mobile touch controls too.