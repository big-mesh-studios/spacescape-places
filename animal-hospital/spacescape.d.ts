/**
 * The types for a spacescape place script's `spacescape` import.
 *
 * The module is the guest library spacescape bundles into the place's interpreter, so a place
 * writes `import { createShape } from "spacescape"`. It is not a package. This declaration is a
 * hand-maintained snapshot of that library, copied from
 * `apps/spacescape/src/places/guest/place-api.ts`, so editors outside the spacescape repository
 * can complete the place API. It is not generated, and it will need updating when the guest
 * library changes.
 *
 * The current snapshot includes the camera, photo, screen and HUD-image API that arrived with
 * `@random-mesh/rmsl` 1.17.0 — `createCamera` and friends, `takePhoto`, `createScreen`, and
 * `showImage` — plus the HUD meter, HUD label and world-space HUD panel API, and the shared
 * beam, particle and sound effects.
 *
 * The file carries no top-level `import` or `export` on purpose: a `.d.ts` reached through
 * `paths` is resolved as a module, and a `declare module` inside a module augments a module that
 * has to exist somewhere else. Kept as an ambient declaration, this file is simply the module.
 */
declare module "spacescape" {
  /**
   * Thrown when the host refuses an effect.
   *
   * A place is code, and code that is told nothing about its own failures fails somewhere else.
   * A script that adds a two-thousand-and-first shape gets a `PlaceError` naming the limit at the
   * line that caused it, rather than a world with a bridge missing from it.
   */
  export class PlaceError extends Error {
    constructor(message: string);
  }

  /* ------------------------------------------------------------------ geometry */

  /** A position, as three plain numbers — an array, because that is what JSON makes of it. */
  export type Vec3Like = readonly [number, number, number];

  /**
   * A shape's own dimensions, as an object.
   *
   * **Which is not the same as `Vec3Like`.** A position crosses the boundary as an array, so `at`
   * is `[x, y, z]`. A shape's dimensions are part of the CSG type, where they are objects, and the
   * host copies them straight through — so `len` is `{ x, y, z }`.
   */
  export type PlaceVec3 = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };

  /** One vertex of a polygon's outline: two numbers on the XZ plane. */
  export type PlaceVec2 = {
    readonly x: number;
    readonly z: number;
  };

  /** How a shape changes the field. */
  export type Combine = "Add" | "Subtract" | "Paint";

  /**
   * One SDF primitive a place may add, named by its `type` and sized by the primitive's own
   * parameters.
   *
   * The source derives this union from `@big-mesh-studios/sdf`'s primitive table; it is spelled
   * out here so this file stays self-contained. The ten primitives, their fields, and their arities
   * are the table's.
   */
  export type PlaceShape =
    | { readonly type: "Sphere"; readonly radius: number }
    | { readonly type: "Ellipsoid"; readonly radius: PlaceVec3 }
    | { readonly type: "Box"; readonly len: PlaceVec3 }
    | {
        readonly type: "RoundBox";
        readonly len: PlaceVec3;
        readonly radius: number;
      }
    | {
        readonly type: "Capsule";
        readonly len: number;
        readonly radius: number;
      }
    | { readonly type: "Cone"; readonly len: number; readonly radius: number }
    | {
        readonly type: "Cylinder";
        readonly len: number;
        readonly radius: number;
      }
    | {
        readonly type: "Torus";
        readonly majorRadius: number;
        readonly minorRadius: number;
      }
    | {
        readonly type: "HexPrism";
        readonly len: number;
        readonly radius: number;
      }
    | {
        readonly type: "Polygon";
        readonly points: readonly PlaceVec2[];
        readonly len: number;
      };

  /** What `createShape` takes: which place and id the operation belongs to, where it sits, what it is, and how it joins the fold. */
  export interface CreateShapeOptions {
    /** Which place it belongs to. Created if it does not exist. */
    readonly place: string;
    /**
     * Its name within that place.
     *
     * **Never optional and never generated.** Two peers run the same script and derive the same
     * operations rather than receiving them, so an id this peer invented would be a different id
     * on every peer and every shape would appear once per peer.
     */
    readonly id: string;
    /** Where it is. */
    readonly at: Vec3Like;
    readonly shape: PlaceShape;
    readonly combine: Combine;
    /** How far the edge blends. Above 0.25 the stored box is smaller than the shape's reach. */
    readonly softness?: number;
    /** A unit quaternion. */
    readonly orientation?: readonly [number, number, number, number];
    /** A colour, 0 to 255 per channel. */
    readonly colour?: {
      readonly r: number;
      readonly g: number;
      readonly b: number;
    };
    /**
     * The procedural material, by name — one of `MATERIAL_NAMES`.
     *
     * The id that goes on the wire is an index into that list, so an unknown name is refused
     * whole rather than becoming an operation that draws the wrong pattern.
     */
    readonly material?: string;
  }

  /** Adds one operation to a place. The id is the handle; there is no returned object. */
  export function createShape(options: CreateShapeOptions): void;

  /* --------------------------------------------------------------------- items */

  /**
   * Declares an item, so the place can hand it out.
   *
   * `giveItem` refuses a name this has not declared, and in the shop this API was built for the
   * difference between "the player has a cola" and "the player has a cloa" is the entire puzzle.
   * Declaring the same item again changes nothing and is not an error.
   */
  export function defineItem(item: string): void;

  /** Puts items in what the player is carrying. The item must have been declared. */
  export function giveItem(item: string, count?: number): void;

  /**
   * Takes items out of what the player is carrying, and never fails.
   *
   * Takes whatever is there, up to `count`. A held item that runs out is dropped.
   */
  export function takeItem(item: string, count?: number): void;

  /* ----------------------------------------------------------------------- talk */

  /** Says a line, with a name to attribute it to. It replaces the last one rather than queueing. */
  export function narrate(who: string, text: string): void;

  /**
   * Asks the player a question with answers to click.
   *
   * Opening a second dialog replaces the first. The pointer lock is released while it is up, and
   * the answer arrives as an `npc-choose` event with an index counting from zero.
   */
  export function openDialog(options: {
    /** Who is asking, by the id `createNpc` gave them. */
    readonly entityId: string;
    /** The question. */
    readonly prompt: string;
    /** The answers, in the order they should be offered. */
    readonly options: readonly string[];
  }): void;

  /** Closes the dialog, and does nothing when there is none. */
  export function closeDialog(): void;

  /**
   * Ends the game, with a title and a card, and offers to play again.
   *
   * There is deliberately no `unend`: the card's only way on is to start again, which reloads the
   * place from the beginning rather than undoing the run.
   */
  export function endGame(options: {
    /** What to call it. */
    readonly title: string;
    /** What to say about it. */
    readonly text: string;
  }): void;

  /* --------------------------------------------------------------------- hands */

  /**
   * Puts an item in the player's hands, or empties them.
   *
   * Omitting the item is how a place says "put that down", and there is no other way. What a hand
   * changes is the interaction, not the world: a crosshair on a character is a conversation with
   * empty hands and a use with anything in them.
   */
  export function holdItem(item?: string): void;

  /* ------------------------------------------------------------------- figures */

  /**
   * The address of something standing in the world, whether a prop or a character.
   *
   * `createProp` and `createNpc` rather than one function with a `kind`: a character has to be
   * given a name, and a prop has no name to give.
   */
  export interface CreateEntityOptions {
    /**
     * What the script calls it, which is the only handle there is.
     *
     * **Never generated**, for the reason a shape's id is never generated: every peer runs every
     * place and derives the same figures rather than receiving them.
     */
    readonly id: string;
    /**
     * One of the place's attached models, by the name in its manifest.
     *
     * Not a path and not a file. A name the place does not attach is refused by name.
     */
    readonly model: string;
    /** Where it is. This is the model's own origin, not its base and not its middle. */
    readonly at: Vec3Like;
    /** A turn about up, in radians. Omitted means no turn. */
    readonly yaw?: number;
    /** Uniform scale, about its own origin. Omitted means the model's own size. */
    readonly scale?: number;
    /**
     * The voxel size to mesh this model at, in world units.
     *
     * A quality override rather than a size. Omitted means the model's own default.
     */
    readonly meshResolution?: number;
  }

  /** A prop, which is anything the player uses rather than talks to. */
  export interface CreatePropOptions extends CreateEntityOptions {
    /**
     * Whether the player walks into it.
     *
     * True unless a script says otherwise, because the common case is furniture. A pickup
     * should say so.
     */
    readonly solid?: boolean;
  }

  /** Stands a character in the world. A name is required and not optional. */
  export interface CreateNpcOptions extends CreateEntityOptions {
    /** What to call it, in the narration and the dialog. */
    readonly name: string;
  }

  /** Stands a prop in the world, from one of the place's attached models. */
  export function createProp(options: CreatePropOptions): void;

  /** Stands a character in the world, from one of the place's attached models. */
  export function createNpc(options: CreateNpcOptions): void;

  /**
   * Moves whatever is standing under `id`, and optionally turns it.
   *
   * `yaw` is omitted rather than defaulted to zero, so a character walking across a room keeps the
   * way it was facing.
   */
  export function moveEntity(id: string, at: Vec3Like, yaw?: number): void;
  export function setEntityUseDuration(id: string, seconds: number): void;

  /**
   * Takes whatever is standing under `id` out of the world.
   *
   * Removing something that is not there does nothing and is not an error.
   */
  export function removeEntity(id: string): void;

  /** Takes one shape out of a place by the id `createShape` was given. */
  export function removeShape(place: string, id: string): void;

  /** Removes a whole place, its shapes with it. Nothing it added is in the undo history. */
  export function removePlace(place: string): void;

  /** Empties a place but leaves the place itself, so its name stays valid. */
  export function clearPlace(place: string): void;

  /* --------------------------------------------------------------------- zones */

  /** What `createZone` takes: an id, the box it fills, and the label a script sees in the event. */
  export interface CreateZoneOptions {
    /** Its name. Never generated, for the same reason a shape's id is not. */
    readonly id: string;
    readonly label?: string;
    readonly box: readonly [Vec3Like, Vec3Like];
  }

  /**
   * Creates a zone: a box the place is told the player entered and left. Replaces any zone with
   * the same id.
   */
  export function createZone(options: CreateZoneOptions): void;

  /** Takes a zone away. Doing nothing when there is none, so a place need not remember what it made. */
  export function removeZone(id: string): void;

  /* -------------------------------------------------------------------- lights */

  /** A light a place script created. Removing the handle turns it off. */
  export interface LightHandle {
    readonly id: string;
    remove(): void;
  }

  /** What `createLight` takes: an id, where it is, its colour, how far it reaches, and how bright it is where it stops. */
  export interface CreateLightOptions {
    /** Its name, and how it is referred to when removed. Never generated. */
    readonly id: string;
    /** Where it is, in world units. */
    readonly at: Vec3Like;
    /** Its colour, each channel 0 to 255. */
    readonly colour: {
      readonly r: number;
      readonly g: number;
      readonly b: number;
    };
    /**
     * How far it reaches, in world units.
     *
     * The falloff is scaled so that `intensity` is the brightness at the edge of this radius. A
     * light of radius 100 at intensity 1 is as bright at 100 units as one of radius 20 is at 20.
     */
    readonly radius: number;
    /** How bright, up to 10. Read alongside `radius`, not instead of it. */
    readonly intensity: number;
  }

  /** Creates a light. Replaces any light with the same id, so re-running a script does not stack lamps. */
  export function createLight(options: CreateLightOptions): LightHandle;

  /** Takes a light away. Doing nothing when there is none. */
  export function removeLight(id: string): void;

  /* ------------------------------------------------------------------- sounds */

  /** Playback settings for `playSound`. */
  export interface PlaySoundOptions {
    /** A name for stopping this playback later. Required when looping. */
    readonly id?: string;
    /** Playback volume, zero to one. */
    readonly volume?: number;
    /** Playback rate, 0.25 to four. */
    readonly pitch?: number;
    /** Keep playing until the handle is stopped. */
    readonly loop?: boolean;
  }

  /** A sound playback. A one-shot sound has an empty id. */
  export interface SoundHandle {
    readonly id: string;
    stop(): void;
  }

  /** Plays a sound file named in the place manifest. The name is its manifest path. */
  export function playSound(
    name: string,
    options?: PlaySoundOptions,
  ): SoundHandle;

  /** Stops a named sound playback. */
  export function stopSound(id: string): void;

  /* ---------------------------------------------------- shared visual effects */

  /**
   * A beam from a point to a point, or from an entity to an entity.
   *
   * Give one of `from`/`fromEntity` and one of `to`/`toEntity`; the host refuses a beam with
   * neither end or with both forms on the same end.
   */
  export interface CreateBeamOptions {
    readonly id: string;
    /** Linear RGB, zero to one. */
    readonly color?: readonly [number, number, number];
    readonly width?: number;
    readonly fromEntity?: string;
    readonly from?: Vec3Like;
    readonly toEntity?: string;
    readonly to?: Vec3Like;
  }

  /** A beam placed by a place script. */
  export interface BeamHandle {
    readonly id: string;
    remove(): void;
  }

  /** Draws a line between world points or entities. */
  export function createBeam(options: CreateBeamOptions): BeamHandle;

  /** The portable particle kinds supported by both engines. */
  export type ParticleKind = "spark" | "flame" | "smoke" | "dust";

  /**
   * A particle emitter at a world point or over an entity.
   *
   * The `kind` picks a baseline look; the remaining fields override it. Attaching with
   * `entityId` makes the emitter follow the entity and ignores `x`/`y`/`z`.
   */
  export interface CreateParticleOptions {
    readonly id: string;
    readonly kind?: ParticleKind;
    readonly entityId?: string;
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
    /** Linear RGB, zero to one. */
    readonly color?: readonly [number, number, number];
    readonly size?: number;
    readonly spread?: number;
    readonly lifeMs?: number;
    /** Continue emitting until the handle is removed. */
    readonly loop?: boolean;
  }

  /** A particle emitter placed by a place script. */
  export interface ParticleHandle {
    readonly id: string;
    remove(): void;
  }

  /** Runs a particle emitter at a point or over an entity. */
  export function createParticle(
    options: CreateParticleOptions,
  ): ParticleHandle;

  /* -------------------------------------------------------------------- fields */

  /** What `createMedium` takes: an id, the box it fills, and how it pushes, slows or sinks whatever is inside it. */
  export interface CreateMediumOptions {
    /** Its name, and how it is referred to when removed. Never generated. */
    readonly id: string;
    /** Two opposite corners, in any order — the field sorts them. */
    readonly box: readonly [Vec3Like, Vec3Like];
    /** Sideways pull, in world units per second. Zero on one axis makes it a one-way belt. */
    readonly pushVx: number;
    /** Forward pull, in world units per second. */
    readonly pushVz: number;
    /**
     * Upward pull, positive is up. Left out, the field does not touch falling at all — which is
     * what makes one conveyor definition also a floor, rather than also being an updraft.
     */
    readonly pushVy?: number;
    /**
     * What walking speed becomes while inside. 0 is quicksand: the player moves at a fraction of
     * their own speed, or not at all, and `sink` decides how fast they go down.
     */
    readonly speedScale: number;
    /**
     * The fastest this field lets a player fall, in world units per second. Left out or zero, they
     * fall at their own gravity.
     */
    readonly sink?: number;
  }

  /** Creates a medium: a box the player is pushed, slowed or sunk by. Replaces any medium with the same id. */
  export function createMedium(options: CreateMediumOptions): void;

  /** Takes a medium away. Doing nothing when there is none. */
  export function removeMedium(id: string): void;

  /** What a field does to a player inside it. The same five numbers the physics reads. */
  export interface Medium {
    /** Sideways pull, in world units per second. */
    readonly pushVx: number;
    readonly pushVz: number;
    /** Upward pull, positive is up. `null` when the field does not touch falling. */
    readonly pushVy: number | null;
    /** What walking speed becomes. */
    readonly speedScale: number;
    /** The fastest this field lets a player fall. Zero does not hold them down. */
    readonly sink: number;
  }

  /** What a scripted field at a point does to whoever is inside it, or `undefined` where none sits. */
  export function getMediumAt(
    x: number,
    y: number,
    z: number,
  ): Medium | undefined;

  /* --------------------------------------------------------------------- clock */

  /** Jumps the clock to a mark in its cycle. The cycle is 1,200 seconds. */
  export function setTime(seconds: number): void;

  /** Scales how fast the cycle runs. Zero stops time. */
  export function setTimeSpeed(multiplier: number): void;

  /* -------------------------------------------------------------------- player */

  /** Places the player at a world position, optionally facing a heading. For a spawn point, a teleport or a trapdoor. */
  export function movePlayer(
    x: number,
    y: number,
    z: number,
    yaw?: number,
  ): void;

  /** Scales how fast the player moves, as a multiplier on their ordinary speed. */
  export function setPlayerSpeed(multiplier: number): void;

  /** Scales how high the player jumps, as a multiplier on their ordinary jump. */
  export function setPlayerJump(multiplier: number): void;

  /** Lets the player fly, or stops them doing so. The one movement verb a place owns outright. */
  export function setFlying(on: boolean): void;

  /* -------------------------------------------------------------------- camera */

  /** Points the camera at a world position until `clearCamera` is called, optionally with a field of view. */
  export function lookAt(
    x: number,
    y: number,
    z: number,
    fov?: number,
  ): void;

  /** Gives the camera back to the player, whether it was aimed or taken over by a virtual camera. */
  export function clearCamera(): void;

  /* ----------------------------------------------------------- virtual cameras */

  /**
   * A viewpoint the place owns, rather than one the player is inside.
   *
   * `at` and `target` rather than position and rotation, because a security camera is aimed at
   * something — a door, a till, a corridor — and the two points are also what a screen shows
   * without a second definition.
   */
  export interface CreateCameraOptions {
    /** A name the caller chose. Two peers running the same script must agree on it. */
    readonly id: string;
    /** Where the camera is. */
    readonly at: Vec3Like;
    /** The point it looks at. */
    readonly target: Vec3Like;
    /**
     * The vertical field of view in degrees, 1 to 179. Omitted means the player's own field of
     * view, which is what makes a camera view feel like the same world seen from elsewhere.
     */
    readonly fov?: number;
  }

  /** Places a virtual camera. Nothing looks through it until something watches it or shows it. */
  export function createCamera(options: CreateCameraOptions): void;

  /**
   * Moves a virtual camera, or changes its lens. Every field is optional and an absent one is
   * unchanged, so panning is one field rather than the whole definition repeated.
   */
  export function moveCamera(
    id: string,
    options: { at?: Vec3Like; target?: Vec3Like; fov?: number },
  ): void;

  /** Removes a virtual camera by id, and anything that was showing it. */
  export function removeCamera(id: string): void;

  /**
   * Takes the player's view over and puts it at a camera, until `clearCamera`.
   *
   * This player only: two peers watching the same camera are two views of one world from the same
   * place.
   */
  export function watchCamera(id: string): void;

  /* -------------------------------------------------------------------- photos */

  /**
   * A picture this machine has taken.
   *
   * An id and a size, and deliberately nothing else. The pixels never cross the sandbox: a script
   * can show a photo or put it on a screen, and cannot read it, hash it or send it anywhere.
   */
  export interface Photo {
    readonly id: string;
    readonly width: number;
    readonly height: number;
  }

  /**
   * Renders one frame and keeps it.
   *
   * Returns before the pixels exist, so a script can show the photo immediately and watch it fill
   * in a frame or two later. The picture is of the world rather than of the screen, so it never
   * contains the crosshair, a dialog or the HUD. Omit `camera` for the player's own view.
   */
  export function takePhoto(options: {
    readonly id: string;
    readonly camera?: string;
    readonly width?: number;
    readonly height?: number;
  }): Photo;

  /** Forgets a photo, freeing its pixels and removing anything that was showing it. */
  export function removePhoto(id: string): void;

  /* ---------------------------------------------------- screens and HUD images */

  /**
   * What a screen or a HUD image shows: a camera is live, a photo is a picture that was taken.
   */
  export type ImageSource =
    | { readonly camera: string }
    | { readonly photo: string };

  /** The corners a HUD image may sit in. */
  export type HudCorner =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

  /**
   * A surface in the world showing a camera or a photo.
   *
   * **The resolution is not yours to choose.** It follows the screen's size on screen, so a monitor
   * across a room renders small and the one in front of the player renders sharp.
   */
  export interface CreateScreenOptions {
    readonly id: string;
    readonly source: ImageSource;
    readonly at: Vec3Like;
    /** A turn about up, in radians. The picture faces this way. */
    readonly yaw: number;
    /** How wide, in world units. */
    readonly width: number;
    /** How tall, in world units. */
    readonly height: number;
  }

  /** Puts a screen in the world. Only the screens nearest the player are redrawn in a frame. */
  export function createScreen(options: CreateScreenOptions): void;

  /** Moves, resizes or re-aims a screen, or changes what it shows. */
  export function moveScreen(
    id: string,
    options: {
      readonly source?: ImageSource;
      readonly at?: Vec3Like;
      readonly yaw?: number;
      readonly width?: number;
      readonly height?: number;
    },
  ): void;

  /** Removes a screen by id. */
  export function removeScreen(id: string): void;

  /**
   * Shows a camera or a photo in a corner of this player's screen.
   *
   * A HUD image is not in the world, so nothing else can see it and nothing can walk in front of
   * it. `corner` omitted means `top-right`; the size is in CSS pixels, 16 to 512.
   */
  export function showImage(options: {
    readonly id: string;
    readonly source: ImageSource;
    readonly corner?: HudCorner;
    readonly width: number;
    readonly height: number;
  }): void;

  /** Takes a HUD image away. A no-op when there was none. */
  export function hideImage(id: string): void;

  /* ------------------------------------------------------- HUD meters and labels */

  /** What `createHudMeter` takes: a labelled bar in a corner of this player's screen. */
  export interface CreateHudMeterOptions {
    readonly id: string;
    readonly label: string;
    readonly value: number;
    readonly max: number;
  }

  /** A HUD meter that can be changed in place or removed. */
  export interface HudMeterHandle {
    readonly id: string;
    setValue(value: number): void;
    setLabel(label: string): void;
    remove(): void;
  }

  /** Creates a labelled bar on the HUD; update it with the handle rather than by id. */
  export function createHudMeter(
    options: CreateHudMeterOptions,
  ): HudMeterHandle;

  /** What `createHudLabel` takes: a line of text in a corner of this player's screen. */
  export interface CreateHudLabelOptions {
    readonly id: string;
    readonly text: string;
  }

  /** A HUD label that can be changed in place or removed. */
  export interface HudLabelHandle {
    readonly id: string;
    setText(text: string): void;
    remove(): void;
  }

  /** Creates a line of text on the HUD; update it with the handle rather than by id. */
  export function createHudLabel(
    options: CreateHudLabelOptions,
  ): HudLabelHandle;

  /* ----------------------------------------------------------------- HUD panels */

  /**
   * What `createHudPanel` takes: a labelled progress quad in the world.
   *
   * **Attach it or not with `entityId`.** Attached, `position` and `yaw` are offsets from the
   * figure's own origin and turn, and the figure's scale applies to both the offset and the
   * panel's size. Unattached, they are world-space and the panel stays where it is put.
   */
  export interface CreateHudPanelOptions {
    /** Its name, and how it is updated or removed. Never generated. */
    readonly id: string;
    /** Attach to this entity; omitted means `position` and `yaw` are world-space. */
    readonly entityId?: string;
    /** Where it is: local offset when attached, otherwise world-space. */
    readonly position: Vec3Like;
    /** A turn about up, in radians: local when attached, otherwise world-space. */
    readonly yaw?: number;
    /** How wide, in the same units as `position`. */
    readonly width: number;
    /** How tall, in the same units as `position`. */
    readonly height: number;
    /** The caption along the top, at most 64 characters. */
    readonly label: string;
    /** How full the bar is, read against `max`. */
    readonly value: number;
    /** The value `value` has when the bar is full. Must be greater than zero. */
    readonly max: number;
  }

  /** A placed panel; the same id can be updated or removed without creating another one. */
  export interface HudPanelHandle {
    readonly id: string;
    /** Moves the bar. Clamped to 0..`max` when drawn. */
    setValue(value: number): void;
    /** Changes the caption, at most 64 characters. */
    setLabel(label: string): void;
    /** Takes the panel out of the world. */
    remove(): void;
  }

  /**
   * Puts a labelled progress panel on a quad in the world.
   *
   * A panel is a canvas-backed quad in the world, like a screen's picture, so it is cheap — but
   * it is still one of 64 a place may keep alive, so create one and change it through the handle
   * rather than creating it again each tick.
   */
  export function createHudPanel(
    options: CreateHudPanelOptions,
  ): HudPanelHandle;

  /* -------------------------------------------------------------------- output */

  /** Prints a line to the console's scrollback, which is where a place's own account of itself is read. */
  export function log(text: string): void;

  /** Shows a line briefly over the world, for something the player should see rather than the console. */
  export function toast(text: string): void;

  /**
   * Schedules a `timer` event.
   *
   * The delay and the id are separate parameters, id first, so a script can build a name from
   * something it already has. Timers fire in sorted id order. Setting an id that is already
   * pending does nothing — not "resets it", not "queues a second".
   */
  export function after(id: string, delayMs: number): void;

  /* ---------------------------------------------------------------------- data */

  /**
   * Writes a value the place can read on a later visit.
   *
   * Global rather than per-player: v1 has no accounts and one local player, and `scope` is an
   * enum precisely so that adding accounts is a data change rather than a format change.
   */
  export function saveData(key: string, value: string): void;

  /** Reads a stored value, or undefined when there is none. */
  export function loadData(key: string): string | undefined;

  /** Forgets a stored value, so a later `loadData` finds nothing. */
  export function deleteData(key: string): void;

  /* --------------------------------------------------------------------- world */

  /** Whether a point is inside material. Water is not material. */
  export function getSolidAt(x: number, y: number, z: number): boolean;

  /** The terrain's surface height at a column. */
  export function getHeightAt(x: number, z: number): number;

  /** Whether a point is underwater. */
  export function getWaterAt(x: number, y: number, z: number): boolean;

  /** What a ray found, or undefined for nothing. */
  export interface RayHit {
    readonly kind: "shape" | "terrain" | "water";
    readonly point: Vec3Like;
    /** Which way the surface faced, as a unit vector. */
    readonly normal: Vec3Like;
    readonly distance: number;
  }

  /**
   * Casts a ray against the world and reports what it hit.
   *
   * Traces the same field the picker does, which is why this is a query and not a grid walk: there
   * is no voxel DDA here, and no step cap, because a surface is found by the sign of a distance
   * function.
   */
  export function raycast(
    origin: Vec3Like,
    direction: Vec3Like,
    maxDistance: number,
  ): RayHit | undefined;

  /* -------------------------------------------------------------------- events */

  /** A fact the host delivered, as the guest sees it. */
  export type PlaceEvent =
    | {
        readonly kind: "player-joined";
        /** Who caused it. `"local"` for a peer acting on itself. */
        readonly producer: string;
        readonly player: string;
      }
    | {
        readonly kind: "player-left";
        readonly producer: string;
        readonly player: string;
      }
    | {
        readonly kind: "player-died";
        readonly producer: string;
        readonly player: string;
        readonly cause: string;
      }
    | {
        readonly kind: "zone-entered";
        readonly producer: string;
        readonly zoneId: string;
      }
    | {
        readonly kind: "zone-left";
        readonly producer: string;
        readonly zoneId: string;
      }
    | {
        readonly kind: "entity-used";
        readonly producer: string;
        /** One id space: `createProp` and `createNpc` put both under the same namespace. */
        readonly entityId: string;
        /** What the player was holding; absent when they were holding nothing. */
        readonly item?: string;
      }
    | {
        readonly kind: "item-used";
        readonly producer: string;
        readonly item: string;
      }
    | {
        readonly kind: "npc-talk";
        readonly producer: string;
        readonly entityId: string;
      }
    | {
        readonly kind: "npc-choose";
        readonly producer: string;
        readonly entityId: string;
        /** The chosen option, counting from zero. */
        readonly option: number;
      }
    | {
        readonly kind: "timer";
        readonly producer: string;
        readonly timerId: string;
      }
    | {
        readonly kind: "data-changed";
        readonly producer: string;
        readonly scope: string;
        readonly player: string;
        readonly key: string;
        readonly deleted: boolean;
        readonly value?: string;
      };

  /** The kinds, so a place author can write a `switch` that the compiler will check. */
  export const EVENT_KINDS: readonly [
    "player-joined",
    "player-left",
    "player-died",
    "zone-entered",
    "zone-left",
    "entity-used",
    "item-used",
    "npc-talk",
    "npc-choose",
    "timer",
    "data-changed",
  ];

  /** What a tick is given: the shared clock, and whatever arrived. */
  export interface TickInfo {
    readonly now: number;
    readonly events: readonly PlaceEvent[];
  }

  /**
   * Registers a function to run on every step.
   *
   * Called during load, before the first step, so a place builds itself from its handlers rather
   * than from something that has to ask to be run.
   */
  export function onTick(handler: (info: TickInfo) => void): void;

  /* -------------------------------------------------------------- small maths */

  /** Holds `value` between `low` and `high`. */
  export function clamp(value: number, low: number, high: number): number;

  /** The value `t` of the way from `a` to `b`, for interpolating a number. */
  export function lerp(a: number, b: number, t: number): number;

  /** A number from the seeded generator, so two peers drawing the same place agree. */
  export function random(): number;

  /** A whole number in `[low, high]`, from the seeded generator. */
  export function randint(low: number, high: number): number;

  /** A number in `[low, high)`, from the seeded generator. */
  export function randFloat(low: number, high: number): number;

  /** One of the entries, or undefined for an empty array. From the seeded generator. */
  export function choice<T>(items: readonly T[]): T | undefined;

  /**
   * A three-component vector, for a place that is mostly arithmetic on positions.
   *
   * Guest-side only and never crosses the boundary: every function that takes a position takes a
   * `Vec3Like`, which a `Vector3` converts into with `toArray`.
   */
  export class Vector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    constructor(x: number, y: number, z: number);
    static zero(): Vector3;
    static one(): Vector3;
    static fromArray(values: Vec3Like): Vector3;
    add(other: Vector3): Vector3;
    subtract(other: Vector3): Vector3;
    scale(factor: number): Vector3;
    dot(other: Vector3): number;
    cross(other: Vector3): Vector3;
    readonly length: number;
    unit(): Vector3;
    lerp(other: Vector3, t: number): Vector3;
    /** The plain triple every crossing to the host takes. */
    toArray(): Vec3Like;
    equals(other: Vector3): boolean;
  }

  /* --------------------------------------------------------------------- level */

  /**
   * The level document this place carries under `name`, as the JSON text it was written as.
   *
   * A string, and not a parsed object: anything structured has to cross the boundary as text. A
   * place carrying no level under this name throws, naming the level.
   */
  export function level(name: string): string;
}
