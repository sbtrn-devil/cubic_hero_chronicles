//#include l10_doodads.js
//#include l10_script_helpers.js

function mapitems$createDoodad({
	ent,
	desc,
	srcObj
}) {
	ent.comSceneObject = ent.newComponent(ComDoodad, {
		desc: desc,
		x: srcObj.x * GameConst.PIXEL_GRANULARITY,
		y: srcObj.y * GameConst.PIXEL_GRANULARITY
	});
	ScriptHelpers.setupDoodadScriptTools(ent);
}

// map object id => entity initialization factory
const ResMapItemFactory = {	
	["dt_mapfx_ptr_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MapFXPtrLeft", animTickAlign: 30, passable: true },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_mapfx_ptr_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MapFXPtrRight", animTickAlign: 30, passable: true },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_mapfx_ptr_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MapFXPtrUp", animTickAlign: 30, passable: true },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_mapfx_ptr_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MapFXPtrDown", animTickAlign: 30, passable: true },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_tunnel_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TunnelLeft", passable: false },
					"on-cs": { animationId: "TunnelLeftCS", passable: false },
				},
				width: 1,
				height: 3
			}
		});
	},

	["dt_tunnel_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TunnelRight", passable: false },
					"on-cs": { animationId: "TunnelRightCS", passable: false },
				},
				width: 1,
				height: 3
			}
		});
	},

	["dt_tunnel_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TunnelDown", passable: false },
					"on-cs": { animationId: "TunnelDownCS", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_tunnel_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TunnelUp", passable: false },
					"on-cs": { animationId: "TunnelUpCS", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	// pickable items
	["dt_item_tugrik"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTugrik", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_pistol"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemPistol", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_grenade"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemGrenade", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_mk152"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemMK152", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_turban"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTurban", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_scanner"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemScanner", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_detector"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemDetector", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_rake"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemRake", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_fish"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemFish", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_elixir"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemElixir", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_bottle"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemBottle", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_vodka"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemVodka", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_explosive_vodka"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemVodka", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_condmilk"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemCondMilk", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_balalaika"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemBalalaika", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_hren"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemHren", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_ski"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemSki", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_yad"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemYad", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_torchlight"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTorchlight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_data"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemData", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_valenok"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemValenok", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_iphone"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemIphone", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_paper"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemPaper", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_project"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemProject", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_goldball"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemGoldball", passable: true },
					"on-sviborg": { animationId: "ItemGoldballSviborg",
						passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_tank"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTank", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_tank_full"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTankFull", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_passport"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemPassport", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_scotch"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemScotch", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_iron"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemIron", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_backpack"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemBackpack", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_proc_id"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemProcId", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_pistol_scotch"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemPistolScotch", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_pistol_torchlight"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemPistolTorchlight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_item_ticket"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "ItemTicket", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	// map objects
	["nvt_train_ctl"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComTrainControl, {
			path: srcObj.props.path,
			phaseOffset: srcObj.props.phaseOffset,
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["nvt_partizan_ctl"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPartizanControl, {
			shooters: srcObj.props.shooters,
			phaseOffset: srcObj.props.phaseOffset,
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["nvt_tractor_ctl"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComTractorControl, {
			tracks: srcObj.props.tracks,
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["nvt_kreakl_ctl"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComKreaklControl, {
			srcLocId: srcObj.props.srcLocId,
			dstLocId: srcObj.props.dstLocId,
			avgRespawnPeriod: srcObj.props.avgRespawnPeriod,
			nKreakls: srcObj.props.nKreakls,
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_switch"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"switch-off": { animationId: "SwitchOff", passable: false },
					"switch-on": { animationId: "SwitchOn", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_tank_chassis"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TankChassis", passable: false },
				},
				width: 3,
				height: 3
			}
		});
	},

	["dt_tank_turret"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComTurret, {
			idleAnimationId: "TankTurret",
			fireAnimationId: "TankTurretFire",
			x: srcObj.x * GameConst.PIXEL_GRANULARITY,
			y: srcObj.y * GameConst.PIXEL_GRANULARITY,
			hitCause: "tank",
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_sec_turret"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComTurret, {
			idleAnimationId: "SecTurret",
			fireAnimationId: "SecTurretFire",
			x: srcObj.x * GameConst.PIXEL_GRANULARITY,
			y: srcObj.y * GameConst.PIXEL_GRANULARITY,
			hitCause: "sec_turret",
			xcomGameScreen: xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_sec_croc"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				left: {
					animationId: "SecCrocLeft",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null
				},
				right: {
					animationId: "SecCrocRight",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null

				},
				down: {
					animationId: "SecCrocDown",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null
				},
				up: {
					animationId: "SecCrocUp",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null
				},
				// no stop animation
			},
			velocity: 4,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_spark"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				left: {
					animationId: "SparkHz",
					moveAnimationId: "MoveAtRate"
				},
				right: {
					animationId: "SparkHz",
					moveAnimationId: "MoveAtRate"
				},
				down: {
					animationId: "SparkVt",
					moveAnimationId: "MoveAtRate",
				},
				up: {
					animationId: "SparkVt",
					moveAnimationId: "MoveAtRate"
				},
				stop: {
					animationId: "SparkStop"
				}
			},
			velocity: 8,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_moon"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				left: {
					animationId: "MoonLeft",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null,
					secAnimationId: "MoonAxeLeft"
				},
				right: {
					animationId: "MoonRight",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null,
					secAnimationId: "MoonAxeRight"
				}
			},
			velocity: 4,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_ductor"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				left: {
					animationId: "DuctorLeft",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null,
					secAnimationId: "DuctorLegsLeft"
				},
				right: {
					animationId: "DuctorRight",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: null,
					secAnimationId: "DuctorLegsRight"
				}
			},
			velocity: 2,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_gast_wol"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				up: {
					animationId: "GastWolWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				},
				down: {
					animationId: "GastWolWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				}
			},
			velocity: 8,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_gast_leo"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				up: {
					animationId: "GastLeoWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				},
				down: {
					animationId: "GastLeoWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				}
			},
			velocity: 8,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_gast_gre"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComPatroller, {
			route: srcObj.props.route,
			animations: {
				left: {
					animationId: "GastGreWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				},
				right: {
					animationId: "GastGreWork",
					moveAnimationId: "MoveAtRate",
					moveTickEvent: "step"
				}
			},
			velocity: 8,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_troll"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TrollIdle", passable: true },
					"on-ouch": { animationId: "TrollOuch", passable: true }
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_particle_spawner"]({ ent, srcObj, xcomGameScreen }) {
		ent.comSceneObject = ent.newComponent(ComParticleSpawner, {
			x: srcObj.x * GameConst.PIXEL_GRANULARITY,
			y: srcObj.y * GameConst.PIXEL_GRANULARITY,
			particle: srcObj.props.particle,
			particles: srcObj.props.particles, // array alt to particle
			period: srcObj.props.period,
			randomPeriodShift: srcObj.props.randomPeriodShift,
			xcomGameScreen
		});
		ent.scriptTools = ent.comSceneObject.scriptTools;
	},

	["dt_dolgostroy"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Dolgostroy", passable: false },
					"in": { animationId: "DolgostroyIn", passable: false },
					"out": { animationId: "DolgostroyOut", passable: false }
				},
				width: 5,
				height: 4
			}
		});
	},

	["dt_dacha"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Dacha", passable: false },
					"in": { animationId: "DachaIn", passable: false },
					"out": { animationId: "DachaOut", passable: false }
				},
				width: 5,
				height: 4
			}
		});
	},

	["dt_station"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Station", passable: true },
					"in": { animationId: "StationIn", passable: false },
					"out": { animationId: "StationOut", passable: false }
				},
				width: 5,
				height: 4
			}
		});
	},

	["dt_library"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Library", passable: false }
				},
				width: 5,
				height: 4
			}
		});
	},

	["dt_podsobka"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "PodsobkaClosed", passable: false },
					"on-open": { animationId: "PodsobkaOpen", passable: false }
				},
				width: 5,
				height: 4
			}
		});
	},

	["dt_mansion"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Mansion", passable: false },
					"on-inactive": { animationId: "MansionInactive",
						passable: false }
				},
				width: 5,
				height: 5
			}
		});
	},

	["dt_medved_stomp_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MedvedStompUp", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_medved_stomp_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MedvedStompDown", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_medved_stomp_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MedvedStompRight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_medved_stomp_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MedvedStompLeft", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_bloodpool"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BloodPool", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_spec_spot"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "SpecSpot", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_boom_spot"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BoomSpot", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_floating_fish"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": {
						animationId: "FloatingFish",
						randomAnimShiftTicks:
							GameConst.RANDOM_INITIAL_DELAY,
						passable: true 
					},
					"on-up": {
						animationId: "FloatingFishUpfloat",
						passable: true 
					},
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_fishman"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": {
						animationId: "FishmanIdle",
						passable: true 
					}
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_stalker"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on-sleep": {
						animationId: "StalkerSleep",
						passable: true 
					},
					"on-sleep-balalaika": {
						animationId: "StalkerSleepWithBalalaika",
						passable: true 
					},
					"on": {
						animationId: "StalkerStand",
						passable: true 
					},
					"on-balalaika": {
						animationId: "StalkerStandBalalaika",
						passable: true 
					},
					"on-balalaika-left": {
						animationId: "StalkerStandBalalaikaLeft",
						passable: true 
					},
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_gd_server"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": {
						animationId: "GDServer",
						passable: true 
					}
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_wires_posts"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WiresRemote", passable: true }
				},
				width: 1,
				height: 4
			}
		});
	},

	["dt_wires_local"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WiresLocal", passable: true }
				},
				width: 4,
				height: 1
			}
		});
	},

	["dt_state_border"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "StateBorder", passable: true }
				},
				width: 1,
				height: 4
			}
		});
	},

	["dt_deadline"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Deadline", passable: true }
				},
				width: 4,
				height: 1
			}
		});
	},

	["dt_anomaly"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": {
						animationId: "Anomaly",
						randomAnimShiftTicks:
							GameConst.RANDOM_INITIAL_DELAY,
						passable: true
					}
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_door_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "DoorUp", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_door_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "DoorDown", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_door_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "DoorLeft", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_door_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "DoorRight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowUp", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowDown", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowLeft", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowRight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_barred_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowBarredUp", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_barred_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowBarredDown", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_barred_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowBarredLeft", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_window_barred_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "WindowBarredRight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_mount_make_passport"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MountMakePassport", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_mount_make_pistol"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MountMakePistol", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_mount_make_vodka"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MountMakeVodka", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_mount_make_elixir"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "MountMakeElixir", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_cow"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "CowAngry", passable: false },
					"on-nice": { animationId: "CowHappy", passable: false },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_gasters"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GastersIdle", passable: true },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_patefon"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "PatefonOn", passable: false },
					"on-off": { animationId: "PatefonOff", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_trashbin"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TrashBin", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_tolchok"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Tolchok", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_golden_tolchok"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GoldenTolchok", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_golden_egg"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GoldenEgg", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_golden_cup"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GoldenCup", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_golden_baton"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GoldenBaton", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_sign"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Sign", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_sign_directions"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "SignDirections", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_box"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Box", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_box_kds"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BoxKDS", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_box_kds_bitten"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BoxKDSBitten", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_fishskel_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "FishSkelRight", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_fishskel_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "FishSkelDown", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_fishskel_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "FishSkelLeft", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_fishskel_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "FishSkelUp", passable: true },
				},
				width: 0,
				height: 0
			}
		});
	},

	["dt_5g"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "5G", passable: false },
				},
				width: 2,
				height: 3
			}
		});
	},

	["dt_booze_stand"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BoozeStand", passable: false },
					"on-bottle": { animationId: "BoozeStandWithBottle",
						passable: false },
				},
				width: 2,
				height: 3
			}
		});
	},

	["dt_sortir"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Sortir", passable: false },
					"on-open": { animationId: "SortirOpen", passable: false },
					"on-valenok": { animationId: "SortirValenok",
						passable: false },
					"on-no-door": { animationId: "SortirNoDoor",
						passable: false },
				},
				width: 2,
				height: 3
			}
		});
	},

	["dt_kassa"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Kassa", passable: false },
				},
				width: 2,
				height: 3
			}
		});
	},

	["dt_lenin"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Lenin", passable: false },
				},
				width: 1,
				height: 1
			}
		});
	},

	["dt_pension_roll"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "PensionRoll", passable: true },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_gasters_wagon"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GastersWagon", passable: false },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_bear"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Bear", passable: false },
					"on-no-iron": { animationId: "BearNoIron",
						passable: false },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_korovnik"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Korovnik", passable: false },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_transformator"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Transformator", passable: false },
				},
				width: 3,
				height: 2
			}
		});
	},

	["dt_izba_sut"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "IzbaSut", passable: false },
				},
				width: 5,
				height: 5
			}
		});
	},

	["dt_izba_stalker"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "IzbaStalker", passable: false },
				},
				width: 5,
				height: 5
			}
		});
	},

	["dt_lioness"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Lioness", passable: false },
					"on-searched": { animationId: "LionessSearched",
						passable: false },
				},
				width: 4,
				height: 3
			}
		});
	},

	["dt_table_empty_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableEmptyUp", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_table_empty_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableEmptyDown", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_table_empty_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableEmptyLeft", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_table_empty_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableEmptyRight", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_table_comp_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableCompUp", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_table_comp_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableCompDown", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_table_comp_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableCompLeft", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_table_comp_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableCompRight", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_bed_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BedUp", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_table_book_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableBookRight", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_bunkerist"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Bunkerist", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_telephone"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Telephone", passable: false },
				},
				width: 1,
				height: 2
			}
		});
	},

	["dt_voyager"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Voyager", passable: false },
					"on-searched": { animationId: "VoyagerSearched",
						passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_lib_case_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "LibCaseUp", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_lib_case_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "LibCaseDown", passable: false },
				},
				width: 2,
				height: 1
			}
		});
	},

	["dt_long_table_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "LongTableUp", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_long_table_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "LongTableDown", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_table_stalker"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TableStalker", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_barrels"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Barrels", passable: false },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_news_post"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "NewsPost", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_teslalink"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "TeslaLink", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_gnusmas_up"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GnusmasUp", passable: true },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_gnusmas_down"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GnusmasDown", passable: true },
				},
				width: 3,
				height: 1
			}
		});
	},

	["dt_gnusmas_left"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GnusmasLeft", passable: true },
				},
				width: 1,
				height: 3
			}
		});
	},

	["dt_gnusmas_right"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GnusmasRight", passable: true },
				},
				width: 1,
				height: 3
			}
		});
	},

	["dt_empty_boxes"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "EmptyBoxes", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_compromats"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Compromats", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_bags_bucks"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BagsBucks", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_bags_tugriks"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "BagsTugriks", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_gold_stacks"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "GoldStacks", passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

	["dt_printer"]({ ent, srcObj }) {
		mapitems$createDoodad({
			ent: ent,
			srcObj: srcObj,
			desc: {
				states: {
					"on": { animationId: "Printer", passable: false },
					"on-ready": { animationId: "PrinterReady",
						passable: false },
				},
				width: 2,
				height: 2
			}
		});
	},

};
