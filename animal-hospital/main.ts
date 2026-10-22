import { createLight, level, log, onTick } from "voxelscape";

level("animal-hospital.json");

/**
 * Ceiling lamps, one per bay, in the rooms the level's ceiling covers.
 *
 * **The building has a roof, so the sun does not reach inside it.** Without a lamp the
 * interior is lit by the flat ambient alone, which is why every surface used to read at the
 * same brightness no matter which way it faced. These are points rather than a directional
 * fill on purpose: a room lit from a handful of places has a shape, and the baked occlusion
 * in the mesh darkens the corners under them.
 *
 * They sit twelve units above the floor — the middle of the room, now that the ceiling is at
 * -32 — and reach 220, so two or three overlap in each bay. `intensity` scales `r²/d²`; 0.003
 * puts a bright pool on the floor under a lamp and leaves the far side of a bay dim enough to
 * keep the corners readable.
 */
const LAMPS = [
  // The waiting room the level opens in.
  { id: "ward-west", at: [-350, -44, 60] },
  { id: "ward-east", at: [-250, -44, 35] },
  // The reception, where the desk faces the waiting room.
  { id: "reception", at: [-340, -44, -10] },
  // The ward behind the reception, and the room beside it.
  { id: "ward-north", at: [-180, -44, -20] },
  { id: "ward-north-east", at: [-100, -44, -20] },
  // The two far rooms.
  { id: "ward-far-east", at: [-60, -44, -60] },
  { id: "ward-far-north", at: [-200, -44, -110] },
] as const;

for (const lamp of LAMPS) {
  createLight({
    id: lamp.id,
    at: lamp.at,
    colour: { r: 255, g: 228, b: 186 },
    radius: 220,
    intensity: 0.003,
  });
}

/**
 * Daylight at the front door, cool against the lamps.
 *
 * It is outside the opening rather than in the room, so its falloff lands on the threshold and
 * the first few units of floor. It has no shadow, like every light here, so a little of it
 * reaches the whole waiting room; that is the point — it reads as the door being open.
 */
createLight({
  id: "front-door-daylight",
  at: [-267, -48, 108],
  colour: { r: 190, g: 214, b: 255 },
  radius: 120,
  intensity: 0.0015,
});

onTick((info: any) => {
  for (const event of info.events) {
    if (event.kind === "zone-entered") log(`arrived at ${event.zoneId}`);
    if (event.kind === "zone-left") log(`left ${event.zoneId}`);
  }
});
