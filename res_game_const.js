// Various constants

const GameConst = {
	// actual pixels
	SCREEN_WIDTH: 512,
	SCREEN_HEIGHT: 512,

	MAP_WIDTH: 16,
	MAP_HEIGHT: 16,
	MAP_CELL_WIDTH: 32,
	PIXEL_GRANULARITY: 2,
	LIGHT_RADIUS: 6,

	MAX_PARTICLES: 64,

	HOTSPOT_TICK_ALIGN: 180,
	RANDOM_INITIAL_DELAY: 200, // for water etc.
	SMALL_RANDOM_INITIAL_DELAY: 30, // for fish

	HERO_STEP_SIZE: 8,
	HERO_SKI_STEP_SIZE: 8,
	// only for getting hit by troubles;
	// for clipping movements, the hero is pointlike
	HERO_HITBOX_RADIUS: 4,

	PASS_FLAG_NOPASS_STATIC: 1,

	HERO_MAX_HP: 10,
	HP_PER_TUGRIK: 1,

	INVENTORY_SIZE_DEFAULT: 3,
	INVENTORY_SIZE_EXPANDED: 4,

	DELIVERY_COST_DELIVERY: 2,
	DELIVERY_COST_CHECKPOINT: 5,

	N_COROVAN_WAGONS: 4, // including the locomotive
	COROVAN_SPEED: 16, // tiles per second
	COROVAN_OFFSCREEN_PHASE_GAP_PRE: 20,
	COROVAN_OFFSCREEN_PHASE_GAP_POST: 40,
	COROVAN_SEG_WIDTH: 3, // in tiles

	TRACTOR_RADIUS: 33,
	TRACTOR_SPEED: 6, // ~2x faster than hero
	TRACTOR_MIN_DELAY: 5,
	TRACTOR_MAX_PLUS_DELAY: 55,

	KREAKL_RADIUS: 12,

	TURRET_MAX_YAW_SPEED: 5,
	TURRET_COOLDOWN: 50,
	TURRET_FIRE_HIT_DURATION: 5,
	TURRET_FIRE_HIT_RADIUS: 8,
	TURRET_RETARGET_COOLDOWN: 60, // before targeting already shot item again
};

exports.GameConst = GameConst; // enable acquisition from node.js