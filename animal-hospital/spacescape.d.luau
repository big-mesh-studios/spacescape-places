--[[
  Type definitions for a spacescape place script's `spacescape` module.

  Luau counterpart to `spacescape.d.ts`, for places migrating from TypeScript.
  The module is the guest library spacescape bundles into the place's interpreter,
  so a place writes `local M = require("spacescape")`.

  This declaration is a hand-maintained snapshot of that library (see
  apps/spacescape/src/places/guest/place-api.ts in the spacescape repository).
  It is not generated, and it will need updating when the guest library changes.
]]

-- ------------------------------------------------------------------- geometry

--- A position as three numbers: { x, y, z } in array form.
export type Vec3Like = { number }

--- A shape's dimensions as a vector object (not the same as Vec3Like).
export type PlaceVec3 = {
	read x: number,
	read y: number,
	read z: number,
}

--- One vertex of a polygon outline on the XZ plane.
export type PlaceVec2 = {
	read x: number,
	read z: number,
}

--- How a shape changes the field.
export type Combine = "Add" | "Subtract" | "Paint"

--- An RGB colour, 0 to 255 per channel.
export type Colour = {
	read r: number,
	read g: number,
	read b: number,
}

--- A unit quaternion { x, y, z, w }.
export type Quaternion = { number }

--- One SDF primitive a place may add.
export type PlaceShape =
	{ read type: "Sphere", read radius: number }
	| { read type: "Ellipsoid", read radius: PlaceVec3 }
	| { read type: "Box", read len: PlaceVec3 }
	| { read type: "RoundBox", read len: PlaceVec3, read radius: number }
	| { read type: "Capsule", read len: number, read radius: number }
	| { read type: "Cone", read len: number, read radius: number }
	| { read type: "Cylinder", read len: number, read radius: number }
	| { read type: "Torus", read majorRadius: number, read minorRadius: number }
	| { read type: "HexPrism", read len: number, read radius: number }
	| { read type: "Polygon", read points: { PlaceVec2 }, read len: number }

export type CreateShapeOptions = {
	--- Which place it belongs to. Created if it does not exist.
	read place: string,
	--- Its name within that place. Never optional and never generated.
	read id: string,
	--- Where it is.
	read at: Vec3Like,
	read shape: PlaceShape,
	read combine: Combine,
	--- How far the edge blends. Above 0.25 the stored box is smaller than the shape's reach.
	read softness: number?,
	--- A unit quaternion.
	read orientation: Quaternion?,
	--- A colour, 0 to 255 per channel.
	read colour: Colour?,
	--- The procedural material, by name (one of MATERIAL_NAMES).
	read material: string?,
}

-- ---------------------------------------------------------------------- items

-- defineItem(item), giveItem(item, count?), takeItem(item, count?) declared below.

-- ------------------------------------------------------------------------ talk

export type OpenDialogOptions = {
	--- Who is asking, by the id createNpc gave them.
	read entityId: string,
	--- The question.
	read prompt: string,
	--- The answers, in the order they should be offered.
	read options: { string },
}

export type EndGameOptions = {
	--- What to call it.
	read title: string,
	--- What to say about it.
	read text: string,
}

-- ---------------------------------------------------------------------- hands

-- holdItem(item?) declared below.

-- -------------------------------------------------------------------- figures

export type CreateEntityOptions = {
	--- What the script calls it. Never generated.
	read id: string,
	--- One of the place's attached models, by the name in its manifest.
	read model: string,
	--- Where it is (the model's own origin).
	read at: Vec3Like,
	--- A turn about up, in radians. Omitted means no turn.
	read yaw: number?,
	--- Uniform scale about its own origin. Omitted means the model's own size.
	read scale: number?,
	--- Voxel size to mesh this model at, in world units.
	read meshResolution: number?,
}

export type CreatePropOptions = {
	read id: string,
	read model: string,
	read at: Vec3Like,
	read yaw: number?,
	read scale: number?,
	read meshResolution: number?,
	--- Whether the player walks into it. True unless a script says otherwise.
	read solid: boolean?,
}

export type CreateNpcOptions = {
	read id: string,
	read model: string,
	read at: Vec3Like,
	read yaw: number?,
	read scale: number?,
	read meshResolution: number?,
	--- What to call it, in narration and dialog.
	read name: string,
}

-- ---------------------------------------------------------------------- zones

export type CreateZoneOptions = {
	--- Its name. Never generated.
	read id: string,
	read label: string?,
	read box: { Vec3Like },
}

-- --------------------------------------------------------------------- lights

export type LightHandle = {
	read id: string,
	remove: (self: LightHandle) -> (),
}

export type CreateLightOptions = {
	--- Its name. Never generated.
	read id: string,
	--- Where it is, in world units.
	read at: Vec3Like,
	--- Its colour, each channel 0 to 255.
	read colour: Colour,
	--- How far it reaches, in world units.
	read radius: number,
	--- How bright, up to 10.
	read intensity: number,
}

-- --------------------------------------------------------------------- sounds

export type PlaySoundOptions = {
	--- A name for stopping this playback later. Required when looping.
	read id: string?,
	--- Playback volume, zero to one.
	read volume: number?,
	--- Playback rate, 0.25 to four.
	read pitch: number?,
	--- Keep playing until the handle is stopped.
	read loop: boolean?,
}

export type SoundHandle = {
	read id: string,
	stop: (self: SoundHandle) -> (),
}

-- ----------------------------------------------------- shared visual effects

export type CreateBeamOptions = {
	read id: string,
	--- Linear RGB, zero to one.
	read color: { number }?,
	read width: number?,
	read fromEntity: string?,
	read from: Vec3Like?,
	read toEntity: string?,
	read to: Vec3Like?,
}

export type BeamHandle = {
	read id: string,
	remove: (self: BeamHandle) -> (),
}

export type ParticleKind = "spark" | "flame" | "smoke" | "dust"

export type CreateParticleOptions = {
	read id: string,
	read kind: ParticleKind?,
	read entityId: string?,
	read x: number?,
	read y: number?,
	read z: number?,
	--- Linear RGB, zero to one.
	read color: { number }?,
	read size: number?,
	read spread: number?,
	read lifeMs: number?,
	--- Continue emitting until the handle is removed.
	read loop: boolean?,
}

export type ParticleHandle = {
	read id: string,
	remove: (self: ParticleHandle) -> (),
}

-- --------------------------------------------------------------------- fields

export type CreateMediumOptions = {
	--- Its name. Never generated.
	read id: string,
	--- Two opposite corners, in any order.
	read box: { Vec3Like },
	read pushVx: number,
	read pushVz: number,
	--- Upward pull, positive is up. Omit to not affect falling.
	read pushVy: number?,
	--- What walking speed becomes while inside.
	read speedScale: number,
	--- Fastest fall speed allowed inside. Omit or zero for no limit.
	read sink: number?,
}

export type Medium = {
	read pushVx: number,
	read pushVz: number,
	--- nil when the field does not touch falling.
	read pushVy: number?,
	read speedScale: number,
	read sink: number,
}

-- ------------------------------------------------------------ virtual cameras

export type CreateCameraOptions = {
	--- A name the caller chose. Never generated.
	read id: string,
	--- Where the camera is.
	read at: Vec3Like,
	--- The point it looks at.
	read target: Vec3Like,
	--- Vertical field of view in degrees, 1 to 179.
	read fov: number?,
}

export type MoveCameraOptions = {
	read at: Vec3Like?,
	read target: Vec3Like?,
	read fov: number?,
}

-- --------------------------------------------------------------------- photos

export type Photo = {
	read id: string,
	read width: number,
	read height: number,
}

export type TakePhotoOptions = {
	read id: string,
	read camera: string?,
	read width: number?,
	read height: number?,
}

-- ----------------------------------------------------- screens and HUD images

export type ImageSource = { read camera: string } | { read photo: string }

export type HudCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export type CreateScreenOptions = {
	read id: string,
	read source: ImageSource,
	read at: Vec3Like,
	--- A turn about up, in radians.
	read yaw: number,
	--- How wide, in world units.
	read width: number,
	--- How tall, in world units.
	read height: number,
}

export type MoveScreenOptions = {
	read source: ImageSource?,
	read at: Vec3Like?,
	read yaw: number?,
	read width: number?,
	read height: number?,
}

export type ShowImageOptions = {
	read id: string,
	read source: ImageSource,
	read corner: HudCorner?,
	read width: number,
	read height: number,
}

-- -------------------------------------------------------- HUD meters and labels

export type CreateHudMeterOptions = {
	read id: string,
	read label: string,
	read value: number,
	read max: number,
}

export type HudMeterHandle = {
	read id: string,
	setValue: (self: HudMeterHandle, value: number) -> (),
	setLabel: (self: HudMeterHandle, label: string) -> (),
	remove: (self: HudMeterHandle) -> (),
}

export type CreateHudLabelOptions = {
	read id: string,
	read text: string,
}

export type HudLabelHandle = {
	read id: string,
	setText: (self: HudLabelHandle, text: string) -> (),
	remove: (self: HudLabelHandle) -> (),
}

-- ------------------------------------------------------------------ HUD panels

export type CreateHudPanelOptions = {
	read id: string,
	--- Attach to this entity; omitted means world-space.
	read entityId: string?,
	--- Local offset when attached, otherwise world-space.
	read position: Vec3Like,
	--- Turn about up, in radians.
	read yaw: number?,
	--- Tilt from upright, in radians.
	read pitch: number?,
	read width: number,
	read height: number,
	read label: string,
	read value: number,
	read max: number,
}

export type HudPanelHandle = {
	read id: string,
	setValue: (self: HudPanelHandle, value: number) -> (),
	setLabel: (self: HudPanelHandle, label: string) -> (),
	remove: (self: HudPanelHandle) -> (),
}

-- ---------------------------------------------------------------------- world

export type RayHit = {
	read kind: "shape" | "terrain" | "water",
	read point: Vec3Like,
	--- Surface normal as a unit vector.
	read normal: Vec3Like,
	read distance: number,
}

-- --------------------------------------------------------------------- events

export type PlaceEvent =
	{ read kind: "player-joined", read producer: string, read player: string }
	| { read kind: "player-left", read producer: string, read player: string }
	| { read kind: "player-died", read producer: string, read player: string, read cause: string }
	| { read kind: "zone-entered", read producer: string, read zoneId: string }
	| { read kind: "zone-left", read producer: string, read zoneId: string }
	| { read kind: "entity-used", read producer: string, read entityId: string, read item: string? }
	| { read kind: "item-used", read producer: string, read item: string }
	| { read kind: "npc-talk", read producer: string, read entityId: string }
	| { read kind: "npc-choose", read producer: string, read entityId: string, read option: number }
	| { read kind: "timer", read producer: string, read timerId: string }
	| {
		read kind: "data-changed",
		read producer: string,
		read scope: string,
		read player: string,
		read key: string,
		read deleted: boolean,
		read value: string?,
	}

export type TickInfo = {
	read now: number,
	read events: { PlaceEvent },
}

-- --------------------------------------------------------------- small maths / Vector3

export type Vector3 = {
	x: number,
	y: number,
	z: number,
	add: (self: Vector3, other: Vector3) -> Vector3,
	subtract: (self: Vector3, other: Vector3) -> Vector3,
	scale: (self: Vector3, factor: number) -> Vector3,
	dot: (self: Vector3, other: Vector3) -> number,
	cross: (self: Vector3, other: Vector3) -> Vector3,
	length: number,
	unit: (self: Vector3) -> Vector3,
	lerp: (self: Vector3, other: Vector3, t: number) -> Vector3,
	toArray: (self: Vector3) -> Vec3Like,
	equals: (self: Vector3, other: Vector3) -> boolean,
}

export type Vector3Class = {
	zero: () -> Vector3,
	one: () -> Vector3,
	fromArray: (values: Vec3Like) -> Vector3,
	new: (x: number, y: number, z: number) -> Vector3,
}

-- ---------------------------------------------------------------------- module

export type Spacescape = {
	-- geometry / shapes
	createShape: (options: CreateShapeOptions) -> (),
	removeShape: (place: string, id: string) -> (),
	removePlace: (place: string) -> (),
	clearPlace: (place: string) -> (),

	-- items
	defineItem: (item: string) -> (),
	giveItem: (item: string, count: number?) -> (),
	takeItem: (item: string, count: number?) -> (),

	-- talk
	narrate: (who: string, text: string) -> (),
	openDialog: (options: OpenDialogOptions) -> (),
	closeDialog: () -> (),
	endGame: (options: EndGameOptions) -> (),

	-- hands
	holdItem: (item: string?) -> (),

	-- figures
	createProp: (options: CreatePropOptions) -> (),
	createNpc: (options: CreateNpcOptions) -> (),
	moveEntity: (id: string, at: Vec3Like, yaw: number?) -> (),
	setEntityUseDuration: (id: string, seconds: number) -> (),
	removeEntity: (id: string) -> (),

	-- zones
	createZone: (options: CreateZoneOptions) -> (),
	removeZone: (id: string) -> (),

	-- lights
	createLight: (options: CreateLightOptions) -> LightHandle,
	removeLight: (id: string) -> (),

	-- sounds
	playSound: (name: string, options: PlaySoundOptions?) -> SoundHandle,
	stopSound: (id: string) -> (),

	-- shared visual effects
	createBeam: (options: CreateBeamOptions) -> BeamHandle,
	createParticle: (options: CreateParticleOptions) -> ParticleHandle,

	-- fields
	createMedium: (options: CreateMediumOptions) -> (),
	removeMedium: (id: string) -> (),
	getMediumAt: (x: number, y: number, z: number) -> Medium?,

	-- clock
	setTime: (seconds: number) -> (),
	setTimeSpeed: (multiplier: number) -> (),

	-- player
	movePlayer: (x: number, y: number, z: number, yaw: number?) -> (),
	setPlayerSpeed: (multiplier: number) -> (),
	setPlayerJump: (multiplier: number) -> (),
	setFlying: (on: boolean) -> (),

	-- camera
	lookAt: (x: number, y: number, z: number, fov: number?) -> (),
	clearCamera: () -> (),
	createCamera: (options: CreateCameraOptions) -> (),
	moveCamera: (id: string, options: MoveCameraOptions) -> (),
	removeCamera: (id: string) -> (),
	watchCamera: (id: string) -> (),

	-- photos
	takePhoto: (options: TakePhotoOptions) -> Photo,
	removePhoto: (id: string) -> (),

	-- screens and HUD images
	createScreen: (options: CreateScreenOptions) -> (),
	moveScreen: (id: string, options: MoveScreenOptions) -> (),
	removeScreen: (id: string) -> (),
	showImage: (options: ShowImageOptions) -> (),
	hideImage: (id: string) -> (),

	-- HUD meters and labels
	createHudMeter: (options: CreateHudMeterOptions) -> HudMeterHandle,
	createHudLabel: (options: CreateHudLabelOptions) -> HudLabelHandle,

	-- HUD panels
	createHudPanel: (options: CreateHudPanelOptions) -> HudPanelHandle,

	-- output
	log: (text: string) -> (),
	toast: (text: string) -> (),
	after: (id: string, delayMs: number) -> (),

	-- data
	saveData: (key: string, value: string) -> (),
	loadData: (key: string) -> string?,
	deleteData: (key: string) -> (),

	-- world
	getSolidAt: (x: number, y: number, z: number) -> boolean,
	getHeightAt: (x: number, z: number) -> number,
	getWaterAt: (x: number, y: number, z: number) -> boolean,
	raycast: (origin: Vec3Like, direction: Vec3Like, maxDistance: number) -> RayHit?,

	-- events
	EVENT_KINDS: { string },
	onTick: (handler: (info: TickInfo) -> ()) -> (),

	-- small maths
	clamp: (value: number, low: number, high: number) -> number,
	lerp: (a: number, b: number, t: number) -> number,
	random: () -> number,
	randint: (low: number, high: number) -> number,
	randFloat: (low: number, high: number) -> number,
	choice: <T>(items: { T }) -> T?,

	-- Vector3 class
	Vector3: Vector3Class,

	-- level
	level: (name: string) -> string,
}

declare class PlaceError
	message: string
	function new(self: PlaceError, message: string): PlaceError
end

local spacescape: Spacescape
return spacescape
