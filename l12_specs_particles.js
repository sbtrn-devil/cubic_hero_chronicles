//#include l10_particles.js

// declaration of particle templates

// particle [type] ID => set of parameters as for comParticle.playParticle,
// except for "parameters", "moveFrom", "moveTo" and "atPosition", with all
// these replaced with "toOffset"
const ResParticles = {
	"teleport_out": {
		animationId: "ParticleTeleportOut"
	},

	"teleport_in": {
		animationId: "ParticleTeleportIn"
	},

	"water_ripple": {
		animationId: "ParticleWaterRipple"
	},

	"boom": {
		animationId: "ParticleBoom"
	},

	"crash": {
		animationId: "ParticleLesserBoom"
	},

	"squish": {
		animationId: "ParticleSquish"
	},

	"smoke": {
		animationId: "ParticleSmoke",
		moveAnimationId: "MoveAtRate",
		toOffset: { x: 0, y: -128 },
		parameters: {
			RATE: 1
		}
	},

	"smoke_sortir_door": {
		animationId: "ParticleSmokeFast",
		moveAnimationId: "MoveAtRate",
		toOffset: { x: -128, y: 0 },
		randomToOffset: { x: 0, y: 32 },
		parameters: {
			RATE: 4
		}
	},

	"smoke_train_up": {
		animationId: "ParticleSmokeTrain",
		moveAnimationId: "MoveAtRate",
		toOffset: { x: 0, y: -32 },
		parameters: {
			RATE: 1
		}
	},

	"smoke_train_right": {
		animationId: "ParticleSmokeTrain",
		moveAnimationId: "MoveAtRate",
		toOffset: { x: 32, y: 0 },
		parameters: {
			RATE: 1
		}
	},

	"heart": {
		animationId: "ParticleHeart", // self moving, so no moveAnimationId
		toOffset: { x: 0, y: -64 }
	},

	"bubble": {
		animationId: "ParticleBubble",
		toOffset: { x: 0, y: -64 },
		parameters: {
			RATE: 4
		}
	},

	"boom_spot": {
		animationId: "BoomSpotTransient"
	},

	"nuke": {
		animationId: "ParticleNuke"
	},

	"radio": {
		animationId: "ParticleRadio"
	},

	"z": {
		animationId: "ParticleZ",
		toOffset: { x: 0, y: -64 }
	},

	"glimmer_a": {
		animationId: "ParticleGlimmerA"
	},

	"glimmer_b": {
		animationId: "ParticleGlimmerB"
	},

	"gd_message_1": {
		animationId: "GDMessage1",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_2": {
		animationId: "GDMessage2",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_3": {
		animationId: "GDMessage3",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_4": {
		animationId: "GDMessage4",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_5": {
		animationId: "GDMessage5",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_6": {
		animationId: "GDMessage6",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_7": {
		animationId: "GDMessage7",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_8": {
		animationId: "GDMessage8",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_9": {
		animationId: "GDMessage9",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_10": {
		animationId: "GDMessage10",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_11": {
		animationId: "GDMessage11",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_12": {
		animationId: "GDMessage12",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_13": {
		animationId: "GDMessage13",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_14": {
		animationId: "GDMessage14",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_15": {
		animationId: "GDMessage15",
		toOffset: { x: 0, y: 0 }
	},

	"gd_message_16": {
		animationId: "GDMessage16",
		toOffset: { x: 0, y: 0 }
	},
};
