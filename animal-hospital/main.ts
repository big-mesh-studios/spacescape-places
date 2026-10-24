import { createNpc, createLight, level, log, onTick, moveEntity } from "voxelscape";
import * as $ from "voxelscape";

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

let nextId = 0;

const patientKinds: { name: string, model: string, }[] = [
  { name: "Melty", model: "melty.sdfmod", },
];

type PatientStage = "WalkingToCounter" | "TurningTowardsCounter" | "WaitingAtCounter" | "WalkingToBed" | "WaitingInBed";

const PATIENT_ENTRY_START_LOCATION: [ number, number, number, ] = [ -267, -52.5, 85, ];
const COUNTER_Z = -15.0;

type Patient = {
  id: string,
  stage: PatientStage,
  location: [ number, number, number, ],
  yaw: number,
};

const patients: Patient[] = [];

function spawnPatient(): string {
  let patientKind = patientKinds[$.randint(0, patientKinds.length - 1)];
  let id = `patient:${nextId++}`;
  let location: [ number, number, number, ] = [ ...PATIENT_ENTRY_START_LOCATION, ];
  createNpc({
    id,
    at: location,
    name: patientKind.name,
    model: patientKind.model,
    scale: 3.5,
    meshResolution: 0.02,
    yaw: Math.PI,
  });
  patients.push({
    id,
    stage: "WalkingToCounter",
    location,
    yaw: Math.PI,
  });
  return id;
}

function updatePatients() {
  for (let patient of patients) {
    switch (patient.stage) {
      case "WalkingToCounter":
        updatePatientWalkingToCounter(patient);
        break;
      case "TurningTowardsCounter":
        updatePatientTurningTowardsCounter(patient); 
        break;
      case "WaitingAtCounter":
        updatePatientWaitingAtCounter(patient);
        break;
      case "WalkingToBed":
        updatePatientWalkingToBed(patient);
        break;
      case "WaitingInBed":
        updatePatientWaitingInBed(patient);
        break;
      default: {
        let x: never = patient.stage;
        throw new Error(`Unreachable: ${x}`);
      }
    }
  }
}

function updatePatientWalkingToCounter(patient: Patient) {
  patient.location[2] -= 0.3;
  if (patient.location[2] <= COUNTER_Z) {
    patient.location[2] = COUNTER_Z;
    patient.stage = "TurningTowardsCounter";
  }
  moveEntity(patient.id, patient.location);
}

function updatePatientTurningTowardsCounter(patient: Patient) {
  patient.yaw += 0.1;
  if (patient.yaw >= 3.0 * Math.PI / 2) {
    patient.yaw = -0.5 * Math.PI;
    patient.stage = "WaitingAtCounter";
  }
  moveEntity(patient.id, patient.location, patient.yaw);
}

function updatePatientWaitingAtCounter(patient: Patient) {
}

function updatePatientWalkingToBed(patient: Patient) {
}

function updatePatientWaitingInBed(patient: Patient) {
}

spawnPatient();

onTick((info: any) => {
  for (const event of info.events) {
    if (event.kind === "zone-entered") log(`arrived at ${event.zoneId}`);
    if (event.kind === "zone-left") log(`left ${event.zoneId}`);
  }
  updatePatients();
});

