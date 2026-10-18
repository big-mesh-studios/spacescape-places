import { createLight, createShape, createProp, createZone, log, onTick, level } from "voxelscape";

level("animal-hospital.json");

onTick((info: any) => {
  for (const event of info.events) {
    if (event.kind === "zone-entered") log(`arrived at ${event.zoneId}`);
    if (event.kind === "zone-left") log(`left ${event.zoneId}`);
  }
});
