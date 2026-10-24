import { createLight, createNpc, level, log, moveEntity, onTick, setEntityUseDuration } from "voxelscape";
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

type PatientStage = 
  | "WalkingToCounter"
  | "TurningTowardsCounter"
  | "WalkingToCounter2"
  | "WaitingAtCounter"
  | "WaitingPatientlyAtCounter"
  | "WalkingToBed"
  | "WaitingInBed";

const PATIENT_ENTRY_START_LOCATION: [ number, number, number, ] = [ -267, -52.5, 85, ];
const COUNTER_Z = -15.0;
const COUNTER_X = -290.0;
const PHOTO_DISAPPEAR_TIMEOUT_TICKS = 1000;

let photoShown = false;
let currentPhotoTimeoutTicks = 0;

const FORMS_ID = "forms";
const FORMS_LOCATION: [ number, number, number, ] = [ -301.29, -48.54, -14.02 ];
const FORMS_YAW = 1.6;
const FORMS_SCALE = 3.55;

let formsShown = false;

/**
 * The camera above the reception desk, as a viewpoint the engine can render through.
 *
 * **The model at `prop-hospital-camera` is scenery; a camera is a position, a target and a lens.**
 * They are two things on purpose — a place can turn one without the other — so this is written
 * where the model was placed and looks where the model points: at `COUNTER_X`/`COUNTER_Z`, the spot
 * a patient stops on to talk.
 *
 * It is a touch in front of the model rather than inside it, because a camera at the centre of its
 * own housing photographs the housing. The lens is wider than the player's own eye, the way a
 * security camera's is: it covers the desk and the room in front of it rather than looking at one
 * thing.
 */
const RECEPTION_CAMERA = "reception-camera";

$.createCamera({
  id: RECEPTION_CAMERA,
  at: [ -299.6, -45.4, -17.4, ],
  target: [ COUNTER_X, -46, COUNTER_Z, ],
  fov: 60,
});

/**
 * The id the level gave the camera model, and the two names the photo uses.
 *
 * **A level figure is a figure like any other**, so the player can aim at it and press use: it lives
 * in the same id space a script's `createProp` writes to, under the engine's `level/` prefix. That
 * is what lets this demo photograph through the camera the level already has, instead of the place
 * placing a second one to point at.
 *
 * The photo and the HUD image are separate names because they are separate things: a picture, and a
 * corner of the screen that shows one.
 */
const CAMERA_PROP = "level/prop-hospital-camera";
const RECEPTION_PHOTO = "reception-photo";
const RECEPTION_IMAGE = "reception-image";

type Patient = {
  id: string,
  stage: PatientStage,
  location: [ number, number, number, ],
  yaw: number,
  // used for timing stuff
  tickCounter1: number,
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
    tickCounter1: 0,
  });
  return id;
}

/**
 * Takes a picture through the reception camera, when the player uses the prop.
 *
 * **`takePhoto` returns before the pixels exist.** The id, width and height are known immediately,
 * so the photo can be shown straight away and fills in a frame or two later; there is no callback
 * and no event to wait for. That is why `showImage` below can name a picture the renderer has not
 * drawn yet — a photo is a thing that becomes true, like a `toast` appearing on the next frame.
 *
 * **The picture is of the world, not of the screen.** It comes from a fresh pass through the scene,
 * so it is of whoever is at the desk and never contains the crosshair, a dialog or the HUD — not
 * even this corner image, which would otherwise be a camera photographing its own monitor.
 *
 * Taking one needs a free id, so the previous shot goes first. Removing a photo also removes
 * anything showing it, so the image is put back with the new source; both calls land in the same
 * tick, so the player never sees the gap.
 *
 * **Showing `{ camera: RECEPTION_CAMERA }` instead would make the image live** — the same corner,
 * redrawn rather than frozen. That is the whole difference between the two sources, and it is one
 * field.
 *
 * Omit `camera` on `takePhoto` to photograph the player's own view instead — again, one field less.
 */
function photographReception() {
  $.removePhoto(RECEPTION_PHOTO);
  $.takePhoto({
    id: RECEPTION_PHOTO,
    camera: RECEPTION_CAMERA,
    width: 640,
    height: 360,
  });
  $.showImage({
    id: RECEPTION_IMAGE,
    source: { photo: RECEPTION_PHOTO, },
    corner: "top-right",
    width: 256,
    height: 144,
  });
  photoShown = true;
}

function clearPhoto() {
  $.hideImage(RECEPTION_IMAGE);
  $.removePhoto(RECEPTION_PHOTO);
  photoShown = false;
}

function updatePhoto() {
  if (photoShown) {
    ++currentPhotoTimeoutTicks;
    if (currentPhotoTimeoutTicks >= PHOTO_DISAPPEAR_TIMEOUT_TICKS) {
      clearPhoto();
      currentPhotoTimeoutTicks = 0;
    }
  }
}

function showForms() {
  $.createProp({
    id: FORMS_ID,
    at: FORMS_LOCATION,
    yaw: FORMS_YAW,
    model: "forms.sdfmod",
    scale: FORMS_SCALE,
  });
  setEntityUseDuration(FORMS_ID, 4);
  formsShown = true;
}

function hideForm() {
  $.removeEntity(FORMS_ID);
  formsShown = false;
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
      case "WalkingToCounter2":
        updatePatientWalkingToCounter2(patient);
        break;
      case "WaitingAtCounter":
        updatePatientWaitingAtCounter(patient);
        break;
      case "WaitingPatientlyAtCounter":
        updatePatientWaitingPatientlyAtCounter(patient);
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
    patient.stage = "WalkingToCounter2";
  }
  moveEntity(patient.id, patient.location, patient.yaw);
}

function updatePatientWalkingToCounter2(patient: Patient) {
  patient.location[0] -= 0.3;
  if (patient.location[0] <= COUNTER_X) {
    patient.location[0] = COUNTER_X;
    patient.stage = "WaitingAtCounter";
    patient.tickCounter1 = 0;
  }
  moveEntity(patient.id, patient.location);
}

function updatePatientWaitingAtCounter(patient: Patient) {
  if (patient.tickCounter1 === 0) {
    $.narrate(patient.id, "Hello!");
  } else if (patient.tickCounter1 === 300) {
    $.narrate(patient.id, "I am here for an appointment.");
  } else if (patient.tickCounter1 === 600) {
    $.narrate(patient.id, "");
  } else if (patient.tickCounter1 === 900) {
    $.narrate(patient.id, "Hello! Is anybody there?");
  } else if (patient.tickCounter1 === 1200) {
    $.narrate(patient.id, "");
  } else if (patient.tickCounter1 === 1500) {
    $.narrate(patient.id, "Hello Hello Hello!!! Does anybody work here!!!");
  }
  patient.tickCounter1++;
}

function updatePatientWaitingPatientlyAtCounter(patient: Patient) {
  $.narrate(patient.id, "");
  patient.tickCounter1++;
  if (patient.tickCounter1 > 2000) {
    patient.tickCounter1 = 0;
    patient.stage = "WaitingAtCounter";
  }
}

function updatePatientWalkingToBed(patient: Patient) {
}

function updatePatientWaitingInBed(patient: Patient) {
}

function makePatentAtReceptionPatent() {
  for (let patient of patients) {
    if (patient.stage === "WaitingAtCounter") {
      patient.stage = "WaitingPatientlyAtCounter";
      patient.tickCounter1 = 0;
      break;
    }
  }
}

spawnPatient();

onTick((info: any) => {
  for (const event of info.events) {
    if (event.kind === "zone-entered") log(`arrived at ${event.zoneId}`);
    if (event.kind === "zone-left") log(`left ${event.zoneId}`);
    // **Use on the camera is the shutter.** The prop is a figure in the level, so the player can
    // aim at it and press use like any other; empty hands on a character is a conversation instead,
    // which is why this only ever arrives for a prop.
    if (event.kind === "entity-used" && event.entityId === CAMERA_PROP) {
      photographReception();
      showForms();
    }
    if (event.kind === "entity-used" && event.entityId === FORMS_ID) {
      makePatentAtReceptionPatent();
    }
  }
  updatePatients();
  updatePhoto();
});

