// Animations resource specs

const ResAnimations = {
// list of named animation specs
// specs: specID -> [ list_of_frames_or_subanimations ]
// frame =
// { [var: "varName val" | "varName val1->val2 .:val_gran"]?
//   [evt: "varName val" | "varName" ]?
//   [ticks: "val"]|[rate: "val"] }
// val_gran is granularity of the interpolation, the .:val_gran is optional
// all var names and values can be either actual names/values or @paramName
// in which case they will be taken from parameter named "paramName" provided
// to hlanimCompileStory's parameters arg
specs: {
	"Sample": [
		{ var: "x @FROM->@TO .:@GRAN", ticks: "@TICKS" }
	],
	"Test": [
		{ var: ["x @X", "y @Y"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_walk_down_0", ticks: 10 },
		{ var: "gfxId hero_walk_down_1", ticks: 10 },
		{ var: "gfxId hero_walk_down_2", ticks: 10 },
		{ var: "gfxId hero_walk_down_1", ticks: 10 }
	],

	// general purpose animations
	"-": [
		{ var: "gfxId -", ticks: 0 }
	],
	"MoveOverTicks": [
		{ var: ["x @FROM_X->@TO_X .:2", "y @FROM_Y->@TO_Y .:2"], ticks: "@TICKS" }
	],
	"MoveAtRate": [
		{ var: ["x @FROM_X->@TO_X .:2", "y @FROM_Y->@TO_Y .:2"], rate: "@RATE" }
	],
	"FadeInOverTicks": [
		{ var: "alpha 0", ticks: "30" },
		{ var: "alpha 0 -> 1", ticks: "@TICKS" }
	],
	"FadeOutOverTicks": [
		{ var: "alpha 1 -> 0", ticks: "@TICKS" }
	],
	"MoveAndFadeOverTicks": [
		{
			bunch: [
				[
				{ var: ["x @FROM_X->@TO_X .:2", "y @FROM_Y->@TO_Y .:2"],
					ticks: "@TICKS" }
				],
				[
				{ var: ["alpha @FROM_A -> @TO_A"], ticks: "@TICKS" }
				]
			]
		}
	],

	// map animations (they work on tiles rather than on sprites)
	"MapBadWater": [
		{ var: "gfxId map_badwater_0", ticks: "@RANDOM_INITIAL_DELAY" },
		"loop-start",
		{ var: "gfxId map_badwater_1", ticks: 24 },
		{ var: "gfxId map_badwater_2", ticks: 24 },
		{ var: "gfxId map_badwater_3", ticks: 24 },
		{ var: "gfxId map_badwater_2", ticks: 24 },
		{ var: "gfxId map_badwater_1", ticks: 24 },
		{ var: "gfxId map_badwater_0", ticks: 100 }
	],
	"MapWater": [
		{ var: "gfxId map_water_0", ticks: "@RANDOM_INITIAL_DELAY" },
		"loop-start",
		{ var: "gfxId map_water_1", ticks: 24 },
		{ var: "gfxId map_water_2", ticks: 24 },
		{ var: "gfxId map_water_3", ticks: 24 },
		{ var: "gfxId map_water_2", ticks: 24 },
		{ var: "gfxId map_water_1", ticks: 24 },
		{ var: "gfxId map_water_0", ticks: 100 }
	],

	// hero animations
	"HeroWalkUp": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_walk_up_0", evt: ["step", "playSfx hero_step_3"], ticks: 3 },
		{ var: "gfxId hero_walk_up_1", evt: ["step"], ticks: 3 },
		{ var: "gfxId hero_walk_up_2", evt: ["step", "playSfx hero_step_4"], ticks: 3 },
		{ var: "gfxId hero_walk_up_1", evt: ["step"], ticks: 3 }
	],
	"HeroWalkDown": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_walk_down_0", evt: ["step", "playSfx hero_step_3"], ticks: 3 },
		{ var: "gfxId hero_walk_down_1", evt: ["step"], ticks: 3 },
		{ var: "gfxId hero_walk_down_2", evt: ["step", "playSfx hero_step_4"], ticks: 3 },
		{ var: "gfxId hero_walk_down_1", evt: ["step"], ticks: 3 }
	],
	"HeroWalkLeft": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_walk_left_0", evt: ["step", "playSfx hero_step_1"], ticks: 3 },
		{ var: "gfxId hero_walk_left_1", evt: ["step"], ticks: 3 },
		{ var: "gfxId hero_walk_left_2", evt: ["step", "playSfx hero_step_2"], ticks: 3 },
		{ var: "gfxId hero_walk_left_1", evt: ["step"], ticks: 3 }
	],
	"HeroWalkRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_walk_right_0", evt: ["step", "playSfx hero_step_1"], ticks: 3 },
		{ var: "gfxId hero_walk_right_1", evt: ["step"], ticks: 3 },
		{ var: "gfxId hero_walk_right_2", evt: ["step", "playSfx hero_step_2"], ticks: 3 },
		{ var: "gfxId hero_walk_right_1", evt: ["step"], ticks: 3 }
	],
	"HeroStand": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId hero_stand_0", ticks: 4 },
		{ var: "gfxId hero_stand_1", ticks: 4 },
		{ var: "gfxId hero_stand_2", ticks: 4 },
		{ var: "gfxId hero_stand_1", ticks: 4 }
	],

	// hero cutscene animations
	"HeroHoldupGrenade": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: ["gfxId.0 hero_holdup_left_0",
			"gfxId.1 hero_holdup_grenade_left_0"], ticks: 1 },
	],

	"HeroHoldupPistol": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: ["gfxId.0 hero_holdup_left_0",
			"gfxId.1 hero_holdup_pistol_left_0"], ticks: 1 },
	],

	"HeroHoldupPistolGrenade": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: ["gfxId.0 hero_holdup_left_0",
			"gfxId.1 hero_holdup_pistol_left_0",
			"gfxId.2 hero_holdup_grenade_left_0"], ticks: 1 },
	],

	"HeroHandsUp": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_handsup_0"], ticks: 0 }
	],

	"HeroStandUp": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_walk_up_1"], ticks: 0 }
	],
	"HeroStandDown": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_walk_down_1"], ticks: 0 }
	],

	"HeroKicked": [
		{ var: "playSfx kick", ticks: 0 },
		{
			bunch: [
				"primary",
				[
					{ var: "scale 1 -> 1.5", ticks: 20 },
					{ var: "scale 1.5 -> 1", ticks: 20 }
				],
				[
					{ var: ["depthOffset 8", "setLayer overlays"], ticks: 0 },
					"loop-start",
					{ var: "gfxId hero_flying_down_0", ticks: 4 },
					{ var: "gfxId hero_flying_down_1", ticks: 4 }
				]
			]
		},
		{ var: "playSfx facedrop", ticks: 0 }
	],

	"HeroFaceDown": [
		{ var: ["depthOffset 8", "setLayer actors",
			"gfxId hero_facedown_down_0"], ticks: 30 }
	],

	"HeroSkiUp": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ evt: "particle water_ripple", ticks: 20 }
				],
				[
					{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
					"loop-start",
					{ var: "gfxId hero_ski_up_0",
						evt: ["step", "playSfx bloop"],
						ticks: 12 },
					{ var: "gfxId hero_ski_up_1",
						evt: ["step"],
						ticks: 4 },
					{ var: "gfxId hero_ski_up_2",
						evt: ["step", "playSfx bloop"],
						ticks: 12 },
					{ var: "gfxId hero_ski_up_1", evt: ["step"], ticks: 4 }
				]
			]
		}
	],
	"HeroSkiDown": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ evt: "particle water_ripple", ticks: 20 }
				],
				[
					{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
					"loop-start",
					{ var: "gfxId hero_ski_down_0",
						evt: ["step", "playSfx bloop"],
						ticks: 12 },
					{ var: "gfxId hero_ski_down_1",
						evt: ["step"],
						ticks: 4 },
					{ var: "gfxId hero_ski_down_2",
						evt: ["step", "playSfx bloop"],
						ticks: 12 },
					{ var: "gfxId hero_ski_down_1", evt: ["step"], ticks: 4 }
				]
			]
		}
	],
	"HeroPuzzled": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: "gfxId hero_puzzled_0", ticks: 30 },
		{ var: "gfxId hero_puzzled_scratch_0", ticks: 10 },
		{ var: "gfxId hero_puzzled_scratch_1", ticks: 10 },
		{ var: "gfxId hero_puzzled_scratch_0", ticks: 10 },
		{ var: "gfxId hero_puzzled_scratch_1", ticks: 10 },
		{ var: "gfxId hero_puzzled_0", ticks: 30 }
	],

	"HeroMK152": [
		{
			bunch: [
				"no-primary",
				[
					{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
					"loop-start",
					{ var: "gfxId hero_mk152_0", ticks: 8 },
					{ var: "gfxId hero_mk152_1", ticks: 8 },
					{ var: "gfxId hero_mk152_2", ticks: 8 },
					{ var: "gfxId hero_mk152_1", ticks: 8 }
				],
				[
					{ evt: "particle radio", ticks: 60 },
					{ evt: "particle radio", ticks: 60 },
					{ evt: "particle radio", ticks: 60 },
					{ evt: "particle radio", ticks: 60 }
				]
			]
		}
	],

	"HeroAngry": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_angry_0"], ticks: 0 }
	],
	"HeroSmile": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_smile_0"], ticks: 0 }
	],

	"HeroPuzzledStatic": [
		{ var: ["depthOffset 8",
			"setLayer actors",
			"gfxId hero_puzzled_0"], ticks: 0 }
	],

	// doodad animations...

	// map FX pointers
	"MapFXPtrUp": [
		{ var: "setLayer beacons", ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_ptr_up_0", ticks: 45 },
		{ var: "gfxId mapfx_ptr_up_1", ticks: 45 }
	],
	"MapFXPtrDown": [
		{ var: "setLayer beacons", ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_ptr_down_0", ticks: 45 },
		{ var: "gfxId mapfx_ptr_down_1", ticks: 45 }
	],
	"MapFXPtrLeft": [
		{ var: "setLayer beacons", ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_ptr_left_0", ticks: 45 },
		{ var: "gfxId mapfx_ptr_left_1", ticks: 45 }
	],
	"MapFXPtrRight": [
		{ var: "setLayer beacons", ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_ptr_right_0", ticks: 45 },
		{ var: "gfxId mapfx_ptr_right_1", ticks: 45 }
	],

	// map FX hotspots
	"MapFXHotSpotX": [
		{ var: ["setLayer beacons", "scale 1"], ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_beac_x_0", ticks: 45 },
		{ var: "gfxId mapfx_beac_x_1", ticks: 45 },
		{ var: "gfxId mapfx_beac_qm_0", ticks: 45 },
		{ var: "gfxId mapfx_beac_qm_1", ticks: 45 },
	],
	"MapFXHotSpotZX": [
		{ var: ["setLayer beacons", "scale 1"], ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_beac_x_0", ticks: 45 },
		{ var: "gfxId mapfx_beac_x_1", ticks: 45 },
		{ var: "gfxId mapfx_beac_z_0", ticks: 45 },
		{ var: "gfxId mapfx_beac_z_1", ticks: 45 },
	],
	"MapFXHotSpotBlank": [
		{ var: ["setLayer beacons", "scale 1"], ticks: 0 },
		"loop-start",
		{ var: "gfxId mapfx_beac_bl_0", ticks: 45 },
		{ var: "gfxId mapfx_beac_bl_1", ticks: 45 },
	],
	"MapFXHotSpotBlankFocus": [
		{ var: "setLayer ceiling", ticks: 0 },
		"loop-start",
		{
			bunch: [
				[
					{ var: "gfxId mapfx_beac_bl_0", ticks: 45 },
					{ var: "gfxId mapfx_beac_bl_1", ticks: 45 }
				],
				[
					{ var: "scale 0.75->1.25", ticks: 45 },
					{ var: "scale 1.25->0.75", ticks: 45 }
				]
			]
		}
	],

	// other
	"MedvedStompDown": [
		{ var: ["setLayer static_decals", "gfxId medved_stomp_down"], ticks: 0 }
	],
	"MedvedStompRight": [
		{ var: ["setLayer static_decals", "gfxId medved_stomp_right"], ticks: 0 }
	],
	"MedvedStompLeft": [
		{ var: ["setLayer static_decals", "gfxId medved_stomp_left"], ticks: 0 }
	],
	"MedvedStompUp": [
		{ var: ["setLayer static_decals", "gfxId medved_stomp_up"], ticks: 0 }
	],

	"BloodPool": [
		{ var: ["setLayer static_decals", "gfxId part_squish_3", "alpha 0.5"],
			ticks: 0 }
	],
	"SpecSpot": [
		{ var: ["setLayer static_decals", "gfxId spec_spot"],
			ticks: 0 }
	],
	"BoomSpot": [
		{ var: ["setLayer static_decals", "gfxId boom_spot", "alpha 0.75"],
			ticks: 0 }
	],
	"BoomSpotTransient": [
		{ var: ["setLayer dynamic_decals", "gfxId boom_spot", "alpha 0.75"],
			ticks: 120 },
		{ var: "alpha 0.75 -> 0", ticks: 240 },
		{ var: "gfxId -", ticks: 0 }
	],

	// tunnels
	"TunnelUp": [
		{ var: ["setLayer actors", "gfxId tunnel_up", "depthOffset 16"],
			ticks: 0 }
	],
	"TunnelUpCS": [
		{ var: ["setLayer high_actors", "gfxId tunnel_up", "depthOffset 16"],
			ticks: 0 }
	],
	"TunnelDown": [
		{ var: ["setLayer actors", "gfxId tunnel_down", "depthOffset 16"],
			ticks: 0 }
	],
	"TunnelDownCS": [
		{ var: ["setLayer high_actors", "gfxId tunnel_down", "depthOffset 16"],
			ticks: 0 }
	],
	"TunnelLeft": [
		{ var: ["setLayer actors", "gfxId tunnel_left", "depthOffset 48"],
			ticks: 0 }
	],
	"TunnelLeftCS": [
		{ var: ["setLayer high_actors", "gfxId tunnel_left", "depthOffset 48"],
			ticks: 0 }
	],
	"TunnelRight": [
		{ var: ["setLayer actors", "gfxId tunnel_right", "depthOffset 48"],
			ticks: 0 }
	],
	// tunnel at higher level for cut scenes
	"TunnelRightCS": [
		{ var: ["setLayer high_actors", "gfxId tunnel_right", "depthOffset 48"],
			ticks: 0 }
	],

	"WiresRemote": [
		{ var: ["setLayer static_decals", "gfxId wires_posts"], ticks: 0 }
	],
	"WiresLocal": [
		{ var: ["setLayer static_decals", "gfxId wires_local"], ticks: 0 }
	],
	"StateBorder": [
		{ var: ["setLayer static_decals", "gfxId state_border"], ticks: 0 }
	],
	"Deadline": [
		{ var: ["setLayer static_decals", "gfxId deadline"], ticks: 0 }
	],

	"CowAngry": [
		{ var: ["setLayer actors", "depthOffset 32"], ticks: 0 },
		"loop-start",
		{ var: "gfxId cow_0", ticks: 20 },
		{ var: "gfxId cow_1", ticks: 20 }
	],

	"CowHappy": [
		{ var: ["setLayer actors", "depthOffset 32"], ticks: 0 },
		"loop-start",
		{ var: "gfxId cow_2", ticks: 20 },
		{ var: "gfxId cow_3", ticks: 10 }
	],

	"GastersIdle": [
		{ var: ["setLayer actors", "depthOffset 32"], ticks: 0 },
		"loop-start",
		{ var: "gfxId gasters_1", ticks: 4 },
		{ var: "gfxId gasters_2", ticks: 4 }
	],

	"GastersWagon": [
		{ var: ["setLayer actors", "gfxId gasters_wagon",
			"depthOffset 32"], ticks: 0 },
	],
	"Bear": [
		{ var: ["setLayer actors", "gfxId bear",
			"depthOffset 32"], ticks: 0 },
	],
	"BearNoIron": [
		{ var: ["setLayer actors", "gfxId bear_no_iron",
			"depthOffset 32"], ticks: 0 },
	],
	"Transformator": [
		{ var: ["setLayer actors", "gfxId transformator",
			"depthOffset 32"], ticks: 0 },
	],
	"Korovnik": [
		{ var: ["setLayer actors", "gfxId korovnik",
			"depthOffset 32"], ticks: 0 },
	],
	"PensionRoll": [
		{ var: ["setLayer static_decals", "gfxId pension_roll",
			"depthOffset 32"], ticks: 0 },
	],

	"TableEmptyUp": [
		{ var: ["setLayer actors", "gfxId table_empty_up",
			"depthOffset 16"], ticks: 0 },
	],
	"TableEmptyDown": [
		{ var: ["setLayer actors", "gfxId table_empty_down",
			"depthOffset 16"], ticks: 0 },
	],
	"TableEmptyLeft": [
		{ var: ["setLayer actors", "gfxId table_empty_left",
			"depthOffset 32"], ticks: 0 },
	],
	"TableEmptyRight": [
		{ var: ["setLayer actors", "gfxId table_empty_right",
			"depthOffset 32"], ticks: 0 },
	],

	"TableCompUp": [
		{ var: ["setLayer actors", "gfxId table_comp_up",
			"depthOffset 16"], ticks: 0 },
	],
	"TableCompDown": [
		{ var: ["setLayer actors", "gfxId table_comp_down",
			"depthOffset 16"], ticks: 0 },
	],
	"TableCompLeft": [
		{ var: ["setLayer actors", "gfxId table_comp_left",
			"depthOffset 32"], ticks: 0 },
	],
	"TableCompRight": [
		{ var: ["setLayer actors", "gfxId table_comp_right",
			"depthOffset 32"], ticks: 0 },
	],
	"BedUp": [
		{ var: ["setLayer actors", "gfxId bed_up",
			"depthOffset 16"], ticks: 0 },
	],
	"TableBookRight": [
		{ var: ["setLayer actors", "gfxId table_book_right",
			"depthOffset 32"], ticks: 0 },
	],

	"Bunkerist": [
		{ var: ["setLayer actors", "gfxId bunkerist_1",
			"depthOffset 33"], ticks: 0 },
		"loop-start",
		{ var: "gfxId bunkerist_1", ticks: 10 },
		{ var: "gfxId bunkerist_2", ticks: 10 }
	],
	"Telephone": [
		{ var: ["setLayer actors", "gfxId telephone",
			"depthOffset 32"], ticks: 0 },
	],
	"Voyager": [
		{ var: ["setLayer actors", "gfxId voyager_unsearched",
			"depthOffset 16"], ticks: 0 },
	],
	"VoyagerSearched": [
		{ var: ["setLayer actors", "gfxId voyager_searched",
			"depthOffset 16"], ticks: 0 },
	],

	"LibCaseUp": [
		{ var: ["setLayer actors", "gfxId lib_case_up",
			"depthOffset 16"], ticks: 0 },
	],
	"LibCaseDown": [
		{ var: ["setLayer actors", "gfxId lib_case_down",
			"depthOffset 16"], ticks: 0 },
	],

	"LongTableUp": [
		{ var: ["setLayer actors", "gfxId long_table_up",
			"depthOffset 16"], ticks: 0 },
	],
	"LongTableDown": [
		{ var: ["setLayer actors", "gfxId long_table_down",
			"depthOffset 16"], ticks: 0 },
	],
	"TableStalker": [
		{ var: ["setLayer actors", "gfxId table_stalker",
			"depthOffset 16"], ticks: 0 },
	],
	"Barrels": [
		{ var: ["setLayer actors", "gfxId barrels",
			"depthOffset 16"], ticks: 0 },
	],

	"GnusmasUp": [
		{ var: ["setLayer actors", "gfxId gnusmas_up", "depthOffset 32"],
			ticks: 0 }
	],
	"GnusmasDown": [
		{ var: ["setLayer actors", "gfxId gnusmas_down", "depthOffset 32"],
			ticks: 0 }
	],
	"GnusmasLeft": [
		{ var: ["setLayer actors", "gfxId gnusmas_left"], ticks: 0 }
	],
	"GnusmasRight": [
		{ var: ["setLayer actors", "gfxId gnusmas_right"], ticks: 0 }
	],

	"NewsPost": [
		{ var: ["setLayer actors", "gfxId news_post", "depthOffset 32"],
			ticks: 0 }
	],
	"TeslaLink": [
		{ var: ["setLayer actors", "gfxId teslalink_1", "depthOffset 32"],
			ticks: 0 },
		"loop-start",
		{ var: "gfxId teslalink_1", ticks: 20 },
		{ var: "gfxId teslalink_2", ticks: 20 },
	],
	"EmptyBoxes": [
		{ var: ["setLayer actors", "gfxId empty_boxes", "depthOffset 32"],
			ticks: 0 }
	],
	"Compromats": [
		{ var: ["setLayer actors", "gfxId compromats", "depthOffset 32"],
			ticks: 0 }
	],
	"BagsBucks": [
		{ var: ["setLayer actors", "gfxId bags_bucks", "depthOffset 32"],
			ticks: 0 }
	],
	"BagsTugriks": [
		{ var: ["setLayer actors", "gfxId bags_tugriks", "depthOffset 32"],
			ticks: 0 }
	],
	"GoldStacks": [
		{ var: ["setLayer actors", "gfxId gold_stacks", "depthOffset 32"],
			ticks: 0 }
	],
	"Printer": [
		{ var: ["setLayer actors", "gfxId printer_1", "depthOffset 32"],
			ticks: 0 }
	],
	"PrinterReady": [
		{
			bunch: [
				"no-primary",
				[
					{ var: "setLayer actors", ticks: 0 },
					"loop-start",
					{ var: "gfxId printer_1",
						ticks: 10 },
					{ var: "gfxId printer_2", ticks: 10 }
				],
				[
					"loop-start",
					{ var: "offsetY 0 -> -4", evt: "playSfx tractor",
						ticks: 8 },
					{ var: "offsetY -1 -> 0", ticks: 3 }
				]
			]
		}
	],
	

	// items
	"ItemTugrik": [
		{ var: ["setLayer items", "gfxId item_tugrik"], ticks: 0 }
	],
	"ItemPistol": [
		{ var: ["setLayer items", "gfxId item_pistol"], ticks: 0 }
	],
	"ItemGrenade": [
		{ var: ["setLayer items", "gfxId item_grenade"], ticks: 0 }
	],
	"ItemMK152": [
		{ var: ["setLayer items", "gfxId item_mk152"], ticks: 0 }
	],
	"ItemTurban": [
		{ var: ["setLayer items", "gfxId item_turban"], ticks: 0 }
	],
	"ItemScanner": [
		{ var: ["setLayer items", "gfxId item_scanner_0"], ticks: 0 },
		"loop-start",
		{ var: "gfxId item_scanner_0", ticks: 20 },
		{ var: "gfxId item_scanner_1", ticks: 20 },
		{ var: "gfxId item_scanner_2", ticks: 20 },
	],
	"ItemDetector": [
		{ var: ["setLayer items", "gfxId item_detector"], ticks: 0 }
	],
	"ItemRake": [
		{ var: ["setLayer items", "gfxId item_rake"], ticks: 0 }
	],
	"ItemFish": [
		{ var: ["setLayer items", "gfxId item_fish_0"], ticks: 0 }
	],
	"FishCrawl": [
		{ var: "setLayer items", ticks: 0 },
		"loop-start",
		{ var: "gfxId item_fish_0", evt: ["step", "playSfx bloop"], ticks: 30 },
		{ var: "gfxId item_fish_1", ticks: 5 }
	],
	"ItemElixir": [
		{ var: ["setLayer items", "gfxId item_elixir"], ticks: 0 }
	],
	"ItemBottle": [
		{ var: ["setLayer items", "gfxId item_bottle"], ticks: 0 }
	],
	"ItemVodka": [
		{ var: ["setLayer items", "gfxId item_vodka"], ticks: 0 }
	],
	"ItemCondMilk": [
		{ var: ["setLayer items", "gfxId item_condmilk"], ticks: 0 }
	],
	"ItemBalalaika": [
		{ var: ["setLayer items", "gfxId item_balalaika"], ticks: 0 }
	],
	"ItemHren": [
		{ var: ["setLayer items", "gfxId item_hren"], ticks: 0 }
	],
	"ItemSki": [
		{ var: ["setLayer items", "gfxId item_ski"], ticks: 0 }
	],
	"ItemYad": [
		{ var: ["setLayer items", "gfxId item_yad"], ticks: 0 }
	],
	"ItemTorchlight": [
		{ var: ["setLayer items", "gfxId item_torchlight_0"], ticks: 0 },
		"loop-start",
		{ var: ["setLayer items", "gfxId item_torchlight_0"], ticks: 30 },
		{ var: ["setLayer items", "gfxId item_torchlight_1"], ticks: 30 }
	],
	"ItemData": [
		{ var: ["setLayer items", "gfxId item_data"], ticks: 0 }
	],
	"ItemValenok": [
		{ var: ["setLayer items", "gfxId item_valenok"], ticks: 0 }
	],
	"ItemIphone": [
		{ var: ["setLayer items", "gfxId item_iphone"], ticks: 0 }
	],
	"ItemPaper": [
		{ var: ["setLayer items", "gfxId item_paper"], ticks: 0 }
	],
	"ItemProject": [
		{ var: ["setLayer items", "gfxId item_project"], ticks: 0 }
	],
	"ItemGoldball": [
		{
			// "no-primary" bunch will only work as the only entry
			// of a sequence
			bunch: [
				"no-primary",
				[
					{ var: ["setLayer items", "gfxId item_goldball_0"], ticks: 0 },
					"loop-start",
					{ var: "gfxId item_goldball_1", ticks: 60 },
					{ var: "gfxId item_goldball_0", ticks: 5 },
					{ var: "gfxId item_goldball_1", ticks: 60 },
					{ var: "gfxId item_goldball_2", ticks: 5 }
				],
				[
					"loop-start",
					{ var: "offsetY -4 -> 4", ticks: 60 },
					{ var: "offsetY 4 -> -4", ticks: 60 }
				]
			]
		}
	],
	"ItemTank": [
		{ var: ["setLayer items", "gfxId item_tank"], ticks: 0 }
	],
	"ItemTankFull": [
		{ var: ["setLayer items", "gfxId item_tank_full"], ticks: 0 }
	],
	"ItemPassport": [
		{ var: ["setLayer items", "gfxId item_passport"], ticks: 0 }
	],
	"ItemScotch": [
		{ var: ["setLayer items", "gfxId item_scotch"], ticks: 0 }
	],
	"ItemIron": [
		{ var: ["setLayer items", "gfxId item_iron"], ticks: 0 }
	],
	"ItemBackpack": [
		{ var: ["setLayer items", "gfxId item_backpack"], ticks: 0 }
	],
	"ItemProcId": [
		{ var: ["setLayer items", "gfxId item_proc_id"], ticks: 0 }
	],
	"ItemPistolScotch": [
		{ var: ["setLayer items", "gfxId item_pistol_scotch"], ticks: 0 }
	],
	"ItemPistolTorchlight": [
		{ var: ["setLayer items", "gfxId item_pistol_torchlight_0"], ticks: 0 },
		"loop-start",
		{ var: ["setLayer items", "gfxId item_pistol_torchlight_0"], ticks: 30 },
		{ var: ["setLayer items", "gfxId item_pistol_torchlight_1"], ticks: 30 }
	],
	"ItemTicket": [
		{ var: ["setLayer items", "gfxId item_ticket"], ticks: 0 }
	],

	// corovans
	// (on beacons layer to be below tunnels)
	"TrainWagonPepsiRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_pepsi_right", ticks: 0 }
	],
	"TrainWagonPepsiUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_pepsi_up", ticks: 0 }
	],
	"TrainLocoPepsiRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_pepsi_right", evt: "particle smoke_train_up", ticks: 4 }
	],
	"TrainLocoPepsiUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_pepsi_up", evt: "particle smoke_train_right", ticks: 4 }
	],
	"TrainWagonHlebRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_hleb_right", ticks: 0 }
	],
	"TrainWagonHlebUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_hleb_up", ticks: 0 }
	],
	"TrainLocoHlebRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_hleb_right", evt: "particle smoke_train_up", ticks: 4 }
	],
	"TrainLocoHlebUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_hleb_up", evt: "particle smoke_train_right", ticks: 4 }
	],
	"TrainWagonPassRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_pass_right", ticks: 0 }
	],
	"TrainWagonPassUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		{ var: "gfxId wag_pass_up", ticks: 0 }
	],
	"TrainLocoPassRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_pass_right", evt: "particle smoke_train_up", ticks: 4 }
	],
	"TrainLocoPassUp": [
		{ var: ["depthOffset 24", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId prvz_pass_up", evt: "particle smoke_train_right", ticks: 4 }
	],

	// FSB
	"FSBSpecRightOutDown": [
		{ var: ["depthOffset 8", "gfxId fsb_spn_run_right_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY -48 -> 0", ticks: 16 }
	],

	"FSBSpecRightOutUp": [
		{ var: ["depthOffset 8", "gfxId fsb_spn_run_right_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY 48 -> 0", ticks: 16 }
	],

	"FSBSpecLeftInDown": [
		{ var: ["depthOffset 8", "gfxId fsb_spn_run_left_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY 0 -> 48", ticks: 16 }
	],

	"FSBSpecLeftInUp": [
		{ var: ["depthOffset 8", "gfxId fsb_spn_run_left_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY 0 -> -48", ticks: 60 }
	],

	"FSBMibRightOutDown": [
		{ var: ["depthOffset 8", "gfxId fsb_mib_walk_right_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY -48 -> 0", ticks: 60 }
	],

	"FSBMibLeftInUp": [
		{ var: ["depthOffset 8", "gfxId fsb_mib_walk_left_1", "setLayer beacons"], ticks: 0 },
		{ var: "shiftY 0 -> -48", ticks: 60 }
	],

	"FSBSpecRunRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId fsb_spn_run_right_1", evt: ["step", "playSfx sapog"], ticks: 4 },
		{ var: "gfxId fsb_spn_run_right_2", evt: ["step"], ticks: 4 }
	],

	"FSBSpecAimRight": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId fsb_spn_aim_right_1"],
			evt: "playSfx gcock", ticks: 0 }
	],

	"FSBSpecRunLeft": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId fsb_spn_run_left_1", evt: ["step", "playSfx sapog"], ticks: 4 },
		{ var: "gfxId fsb_spn_run_left_2", evt: ["step"], ticks: 4 }
	],

	"FSBSpecAimLeft": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId fsb_spn_aim_left_1"],
			evt: "playSfx gcock", ticks: 0 }
	],

	"FSBMibWalkRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId fsb_mib_walk_right_1", evt: ["step", "playSfx boot"], ticks: 7 },
		{ var: "gfxId fsb_mib_walk_right_2", evt: ["step"], ticks: 7 }
	],

	"FSBMibStandRight": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId fsb_mib_walk_right_1"], ticks: 0 }
	],

	"FSBMibWalkLeft": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId fsb_mib_walk_left_1", evt: ["step", "playSfx boot"], ticks: 7 },
		{ var: "gfxId fsb_mib_walk_left_2", evt: ["step"], ticks: 7 }
	],

	"FSBMibStandLeft": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId fsb_mib_walk_left_1"], ticks: 0 }
	],

	// partizans
	"PartizanShootRight": [
		{ var: ["depthOffset 8", "shiftX -32", "setLayer actors"], ticks: 0 },
		{ var: "gfxId partizan_right_1", ticks: 0 },
		{ var: "shiftX -32 -> 0", ticks: 16 },
		{ var: "gfxId partizan_shoot_right_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_right_1", ticks: 12 },
		{ var: "gfxId partizan_shoot_right_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_right_1", ticks: 0 },
		{ var: "shiftX 0 -> -32", ticks: 16 }
	],

	"PartizanShootUp": [
		{ var: ["depthOffset 8", "shiftX -32", "setLayer actors"], ticks: 0 },
		{ var: "gfxId partizan_up_1", ticks: 0 },
		{ var: "shiftX -32 -> 0", ticks: 16 },
		{ var: "gfxId partizan_shoot_up_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_up_1", ticks: 12 },
		{ var: "gfxId partizan_shoot_up_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_up_1", ticks: 0 },
		{ var: "shiftX 0 -> -32", ticks: 16 }
	],

	"PartizanShootLeft": [
		{ var: ["depthOffset 8", "shiftX -32", "setLayer actors"], ticks: 0 },
		{ var: "gfxId partizan_left_1", ticks: 0 },
		{ var: "shiftX -32 -> 0", ticks: 16 },
		{ var: "gfxId partizan_shoot_left_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_left_1", ticks: 12 },
		{ var: "gfxId partizan_shoot_left_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_left_1", ticks: 0 },
		{ var: "shiftX 0 -> -32", ticks: 16 }
	],

	"PartizanShootDown": [
		{ var: ["depthOffset 8", "shiftX -32", "setLayer actors"], ticks: 0 },
		{ var: "gfxId partizan_down_1", ticks: 0 },
		{ var: "shiftX -32 -> 0", ticks: 16 },
		{ var: "gfxId partizan_shoot_down_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_down_1", ticks: 12 },
		{ var: "gfxId partizan_shoot_down_1", evt: ["fire", "playSfx pistol"], ticks: 2 },
		{ var: "gfxId partizan_down_1", ticks: 0 },
		{ var: "shiftX 0 -> -32", ticks: 16 }
	],

	// pig on tractor
	"PigTractorRight": [
		{ var: ["setLayer actors", "depthOffset 16"], ticks: 0 },
		"loop-start",
		{ var: "gfxId pig_tractor_right_0", evt: "playSfx tractor", ticks: 10 },
		{ var: "gfxId pig_tractor_right_1", evt: "playSfx tractor", ticks: 10 }
	],

	"PigTractorLeft": [
		{ var: ["setLayer actors", "depthOffset 16"], ticks: 0 },
		"loop-start",
		{ var: "gfxId pig_tractor_left_0", evt: "playSfx tractor", ticks: 10 },
		{ var: "gfxId pig_tractor_left_1", evt: "playSfx tractor", ticks: 10 }
	],

	"PigTractorDown": [
		{ var: ["setLayer actors", "depthOffset 16"], ticks: 0 },
		"loop-start",
		{ var: "gfxId pig_tractor_down_0", evt: "playSfx tractor", ticks: 10 },
		{ var: "gfxId pig_tractor_down_1", evt: "playSfx tractor", ticks: 10 }
	],

	"PigTractorUp": [
		{ var: ["setLayer actors", "depthOffset 16"], ticks: 0 },
		"loop-start",
		{ var: "gfxId pig_tractor_up_0", evt: "playSfx tractor", ticks: 10 },
		{ var: "gfxId pig_tractor_up_1", evt: "playSfx tractor", ticks: 10 }
	],

	// pig run
	"PigRunRight": [
		{ var: ["setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId pig_run_right_1", evt: ["playSfx pig", "step"],
			ticks: 6 },
		{ var: "gfxId pig_run_right_2", evt: ["step"], ticks: 6 },
	],

	"PigRunLeft": [
		{ var: ["setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: ["gfxId.0 pig_run_left_1", "gfxId.1 pig_run_bottle_left_0"],
			evt: ["playSfx pig", "step"], ticks: 6 },
		{ var: ["gfxId.0 pig_run_left_2", "gfxId.1 pig_run_bottle_left_0"],
			evt: ["step"], ticks: 6 },
	],

	// pig parts
	"PigPartBottle": [
		{ var: ["setLayer overlays", "gfxId part_bottle"], ticks: 0 },
		"loop-start",
		{ var: "rotate 0 -> 360", ticks: 200 }
	],
	"PigPartMeat": [
		{ var: ["setLayer overlays", "gfxId part_meat"], ticks: 0 },
		"loop-start",
		{ var: "rotate 0 -> -360", ticks: 75 }
	],
	"PigPartWheel": [
		{ var: ["setLayer overlays", "gfxId part_wheel"], ticks: 0 },
		"loop-start",
		{ var: "rotate 0 -> 360", ticks: 10 }
	],

	// railswitch
	"SwitchOff": [
		{ var: ["setLayer actors", "depthOffset 16", "gfxId switch_off"],
			ticks: 0 }
	],

	"SwitchOn": [
		{ var: ["setLayer actors", "depthOffset 16", "gfxId switch_on"],
			ticks: 0 }
	],

	// security turrets
	"SecTurret": [
		{ var: ["setLayer actors", "gfxId sec_turret_right_0", "depthOffset 40"], ticks: 0 },
	],

	"SecTurretFire": [
		{ var: ["setLayer actors", "depthOffset 40"], ticks: 0 },
		{ var: "gfxId sec_turret_right_1", evt: "playSfx explosion2", ticks: 5 },
		{ var: "gfxId sec_turret_right_0", ticks: 0 }
	],

	// security crocodile
	"SecCrocDown": [
		"loop-start",
		{ var: ["setLayer actors", "gfxId sec_croc_down", "depthOffset 12"], ticks: 16 },
		{ var: ["setLayer actors", "gfxId sec_croc_down_1", "depthOffset 12"], ticks: 16 },
	],

	"SecCrocUp": [
		"loop-start",
		{ var: ["setLayer actors", "gfxId sec_croc_up", "depthOffset 12"], ticks: 16 },
		{ var: ["setLayer actors", "gfxId sec_croc_up_1", "depthOffset 12"], ticks: 16 },
	],

	"SecCrocLeft": [
		"loop-start",
		{ var: ["setLayer actors", "gfxId sec_croc_left", "depthOffset 12"], ticks: 16 },
		{ var: ["setLayer actors", "gfxId sec_croc_left_1", "depthOffset 12"], ticks: 16 },
	],

	"SecCrocRight": [
		"loop-start",
		{ var: ["setLayer actors", "gfxId sec_croc_right", "depthOffset 12"], ticks: 16 },
		{ var: ["setLayer actors", "gfxId sec_croc_right_1", "depthOffset 12"], ticks: 16 },
	],

	// tank
	"TankChassis": [
		{ var: ["setLayer beacons", "gfxId tank_chassis", "depthOffset 40"], ticks: 0 },
	],

	"TankTurret": [
		{ var: ["setLayer actors", "gfxId tank_turret_right_0", "depthOffset 40"], ticks: 0 },
	],

	"TankTurretFire": [
		{ var: ["setLayer actors", "depthOffset 40"], ticks: 0 },
		{ var: "gfxId tank_turret_right_1", evt: "playSfx explosion2", ticks: 8 },
		{ var: "gfxId tank_turret_right_0", ticks: 0 }
	],

	// tank turret on ski
	"TankSkiStandDown": [
		{ var: ["depthOffset 8", "setLayer actors",
			"gfxId tank_turret_ski_down_2"], ticks: 0 }
	],

	"TankSkiMoveDown": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId tank_turret_ski_down_1", evt: ["step"], ticks: 8 },
		{ var: "gfxId tank_turret_ski_down_2", evt: ["step"], ticks: 8 }
	],

	"TankSkiMoveRight": [
		{ var: ["depthOffset 8", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId tank_turret_ski_right_1", evt: ["step"], ticks: 4 },
		{ var: "gfxId tank_turret_ski_right_2", evt: ["step"], ticks: 4 }
	],

	// zone
	"SparkHz": [
		{ var: ["depthOffset 8", "setLayer overlays"], evt: "playSfx bzzz",
			ticks: 0 },
		"loop-start",
		{ var: "gfxId spark_hz_1", ticks: 4 },
		{ var: "gfxId spark_hz_2", ticks: 4 }
	],

	"SparkVt": [
		{ var: ["depthOffset 8", "setLayer overlays"], evt: "playSfx bzzz",
			ticks: 0 },
		"loop-start",
		{ var: "gfxId spark_vt_1", ticks: 4 },
		{ var: "gfxId spark_vt_2", ticks: 4 }
	],

	"SparkStop": [
		{ var: ["gfxId -"], ticks: 0 }
	],

	"MoonRight": [
		{ var: ["depthOffset 12", "setLayer actors", "gfxId moon_right"], ticks: 0 },
		"loop-start",
		{ var: "offsetY -4 -> 4", ticks: 16 },
		{ var: "offsetY 4 -> -4", ticks: 16 }
	],

	"MoonAxeRight": [
		{ var: ["setLayer beacons", "gfxId moon_axe_right"], ticks: 0 },
		"loop-start",
		{ var: "rotate 0 -> 360", ticks: 60 }
	],

	"MoonLeft": [
		{ var: ["depthOffset 12", "setLayer actors", "gfxId moon_left"], ticks: 0 },
		"loop-start",
		{ var: "offsetY -4 -> 4", ticks: 16 },
		{ var: "offsetY 4 -> -4", ticks: 16 }
	],

	"MoonAxeLeft": [
		{ var: ["setLayer beacons", "gfxId moon_axe_left"], ticks: 0 },
		"loop-start",
		{ var: "rotate 0 -> -360", ticks: 60 }
	],

	"DuctorRight": [
		{ var: ["depthOffset 12", "setLayer actors", "gfxId ductor_right"], ticks: 0 },
		"loop-start",
		{ var: "offsetY 24 -> 0", ticks: 15 },
		{ var: "offsetY 0 -> 24", ticks: 15 },
		{ var: "offsetY 24 -> 0", ticks: 15 },
		{ var: "offsetY 0 -> 24", ticks: 15 }
	],

	"DuctorLegsRight": [
		{ var: ["setLayer beacons", "gfxId ductor_legs_right"], ticks: 0 },
		"loop-start",
		{ var: ["rotate 0 -> 90", "offsetY 24 -> 0"], ticks: 15 },
		{ var: ["rotate 90 -> 180", "offsetY 0 -> 24"], ticks: 15 },
		{ var: ["rotate 180 -> 270", "offsetY 24 -> 0"], ticks: 15 },
		{ var: ["rotate 270 -> 360", "offsetY 0 -> 24"], ticks: 15 }
	],

	"DuctorLeft": [
		{ var: ["depthOffset 12", "setLayer actors", "gfxId ductor_left"], ticks: 0 },
		"loop-start",
		{ var: "offsetY 24 -> 0", ticks: 15 },
		{ var: "offsetY 0 -> 24", ticks: 15 },
		{ var: "offsetY 24 -> 0", ticks: 15 },
		{ var: "offsetY 0 -> 24", ticks: 15 }
	],

	"DuctorLegsLeft": [
		{ var: ["setLayer beacons", "gfxId ductor_legs_left"], ticks: 0 },
		"loop-start",
		{ var: ["rotate 0 -> -90", "offsetY 24 -> 0"], ticks: 15 },
		{ var: ["rotate -90 -> -180", "offsetY 0 -> 24"], ticks: 15 },
		{ var: ["rotate -180 -> -270", "offsetY 24 -> 0"], ticks: 15 },
		{ var: ["rotate -270 -> -360", "offsetY 0 -> 24"], ticks: 15 }
	],

	// kreakliat
	"Hamster": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId hamster"],
			ticks: 0 },
	],

	"HamsterRunLeft": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ evt: ["particle smoke"], ticks: 10 }
				],
				[
					{ var: ["depthOffset 8", "setLayer actors"],
						evt: "playSfx khe2", ticks: 0 },
					"loop-start",
					{ var: "gfxId hamster_run_left_1", evt: ["step"], ticks: 4 },
					{ var: "gfxId hamster_run_left_2", evt: ["step"], ticks: 4 }
				]
			]
		}
	],

	"Penguin": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId penguin"],
			ticks: 0 },
	],

	"PenguinRunLeft": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ evt: ["particle smoke"], ticks: 10 }
				],
				[
					{ var: ["depthOffset 8", "setLayer actors"],
						evt: "playSfx khe1", ticks: 0 },
					"loop-start",
					{ var: "gfxId penguin_run_left_1", evt: ["step"], ticks: 4 },
					{ var: "gfxId penguin_run_left_2", evt: ["step"], ticks: 4 }
				]
			]
		}
	],

	// troll
	"TrollIdle": [
		{ var: ["depthOffset 12", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId troll_1", ticks: 16 },
		{ var: "gfxId troll_2", ticks: 16 }
	],

	"TrollOuch": [
		{ var: ["depthOffset 12", "setLayer actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId troll_ouch_1", ticks: 4 },
		{ var: "gfxId troll_ouch_2", ticks: 4 }
	],

	// gasters at work
	"GastWolWork": [
		{ var: ["depthOffset 8", "setLayer high_actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId gast_wol_1", evt: ["step"], ticks: 12 },
		{ var: "gfxId gast_wol_2", evt: ["step"], ticks: 12 }
	],

	"GastLeoWork": [
		{ var: ["depthOffset 8", "setLayer high_actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId gast_leo_1", evt: ["step"], ticks: 12 },
		{ var: "gfxId gast_leo_2", evt: ["step"], ticks: 12 }
	],

	"GastGreWork": [
		{ var: ["depthOffset 8", "setLayer high_actors"], ticks: 0 },
		"loop-start",
		{ var: "gfxId gast_gre_1", evt: ["step"], ticks: 8 },
		{ var: "gfxId gast_gre_2", evt: ["step"], ticks: 8 }
	],

	// fish
	"FloatingFish": [
		{
			bunch: [
				"no-primary",
				[
					{ var: ["depthOffset 24",
						"setLayer actors", "gfxId floating_fish"], ticks: 0 }
				],
				[
					"loop-start",
					{ var: "offsetY -1 -> 1", ticks: 10 },
					{ var: "offsetY 1", ticks: 57 },
					{ var: "offsetY 1 -> -1", ticks: 10 },
					{ var: "offsetY -1", ticks: 57 },
				],
				[
					"loop-start",
					{ var: "rotate -5 -> 5", ticks: 111 },
					{ var: "rotate 5 -> -5", ticks: 111 },
				],
			]
		}
	],

	"FloatingFishUpfloat": [
		{ var: ["depthOffset 24", "rotate 0",
				"setLayer actors", "gfxId floating_fish"], ticks: 0 },
		{ var: "shiftY 12 -> 0", ticks: 10 },
		{ var: "playSfx bloop", ticks: 0 }
	],

	// fishman
	"FishmanIdle": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ var: ["depthOffset 24",
						"setLayer actors", "gfxId fishman_1"], ticks: 200 },
					{ var: "gfxId fishman_wave_1", ticks: 20 },
					{ var: "gfxId fishman_wave_2", ticks: 20 },
					{ var: "gfxId fishman_wave_1", ticks: 20 },
					{ var: "gfxId fishman_wave_2", ticks: 20 }
				],
				[
					"loop-start",
					{ var: "shiftY 0 -> 1", ticks: 10 },
					{ var: "shiftY 1", ticks: 57 },
					{ var: "shiftY 1 -> 0", ticks: 10 },
					{ var: "shiftY 0", ticks: 57 },
				]
			]
		}
	],

	"FishmanDefeatDown": [
		{ var: ["depthOffset 24", "setLayer actors",
			"gfxId fishman_1"], evt: "playSfx bubbling", ticks: 0 },
		{ var: "shiftY 0 -> 48", ticks: 120 },
		{ evt: "stopSfx bubbling", ticks: 0 }
	],

	"FishmanDefeatUp": [
		{ var: ["depthOffset 24", "setLayer actors",
			"gfxId fishman_defeated_1", "rotate -7"],
			evt: "playSfx bubbling", ticks: 0 },
		{ var: "shiftY 48 -> 0", ticks: 60 },
		{ evt: "stopSfx bubbling", ticks: 0 }
	],

	"FishmanDefeated": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ var: ["depthOffset 24",
						"setLayer actors", "gfxId fishman_defeated_1"], ticks: 0 },
				],
				[
					"loop-start",
					{ var: "offsetY -1 -> 1", ticks: 10 },
					{ var: "offsetY 1", ticks: 57 },
					{ var: "offsetY 1 -> -1", ticks: 10 },
					{ var: "offsetY -1", ticks: 57 },
				],
				[
					"loop-start",
					{ var: "rotate -7 -> 7", ticks: 111 },
					{ var: "rotate 7 -> -7", ticks: 111 }
				],
			]
		}
	],

	"FishmanDefeatedMove": [
		{
			bunch: [
				"no-primary",
				[
					"loop-start",
					{ var: ["depthOffset 24",
						"setLayer actors", "gfxId fishman_defeated_1"], ticks: 0 },
				],
				[
					"loop-start",
					{ var: "offsetY -1 -> 1", ticks: 10 },
					{ var: "offsetY 1", ticks: 57 },
					{ var: "offsetY 1 -> -1", ticks: 10 },
					{ var: "offsetY -1", ticks: 57 },
				],
				[
					"loop-start",
					{ var: "rotate -20 -> 20", ticks: 50 },
					{ evt: ["playSfx bloop", "particle water_ripple"], ticks: 0 },
					{ var: "rotate 20 -> -20", ticks: 50 },
					{ evt: ["playSfx bloop", "particle water_ripple"], ticks: 0 }
				],
			]
		}
	],

	// stalker
	"StalkerSleep": [
		{ var: ["depthOffset 8", "setLayer beacons", "gfxId stalker_sleep"],
			ticks: 1 },
		"loop-start",
		{ var: "gfxId stalker_sleep", evt: "particle z", ticks: 75 },
	],

	"StalkerSleepWithBalalaika": [
		{ var: ["depthOffset 8", "setLayer beacons",
			"gfxId.0 stalker_sleep", "gfxId.1 stalker_balalaika"], ticks: 0 },
		"loop-start",
		{ var: ["gfxId.0 stalker_sleep", "gfxId.1 stalker_balalaika"],
			evt: "particle z", ticks: 60 },
	],

	"StalkerStand": [
		{ var: ["depthOffset 8", "setLayer actors", "gfxId stalker_stand"],
			ticks: 0 }
	],

	"StalkerStandBalalaika": [
		{ var: ["depthOffset 8", "setLayer actors",
			"gfxId.0 stalker_balalaika", "gfxId.1 stalker_stand"],
			ticks: 0 }
	],

	"StalkerStandBalalaikaLeft": [
		{ var: ["depthOffset 8", "setLayer actors",
			"gfxId.0 stalker_balalaika", "gfxId.1 stalker_stand_left"],
			ticks: 0 }
	],

	// buildings
	"PodsobkaClosed": [
		{ var: ["setLayer actors", "gfxId podsobka_closed", "depthOffset 64"],
			ticks: 0 },
	],
	"PodsobkaOpen": [
		{ var: ["setLayer actors", "gfxId podsobka_open", "depthOffset 64"],
			ticks: 0 },
	],
	"Library": [
		{ var: ["setLayer actors", "gfxId library", "depthOffset 64"],
			ticks: 0 },
	],
	"IzbaStalker": [
		{ var: ["setLayer actors", "gfxId izba_stalker", "depthOffset 80"],
			ticks: 0 },
	],
	"IzbaSut": [
		{ var: ["setLayer actors", "gfxId izba_sut", "depthOffset 80"],
			ticks: 0 },
	],
	"Mansion": [
		{ var: ["setLayer actors", "gfxId mansion_active_1", "depthOffset 80"],
			ticks: 0 },
		"loop-start",
		{ var: ["setLayer actors", "gfxId mansion_active_1", "depthOffset 80"],
			ticks: 15 },
		{ var: ["setLayer actors", "gfxId mansion_active_2", "depthOffset 80"],
			ticks: 15 },
	],
	"MansionInactive": [
		{ var: ["setLayer actors", "gfxId mansion_inactive", "depthOffset 80"],
			ticks: 0 },
	],
	"Dolgostroy": [
		{ var: ["setLayer actors", "gfxId dolgostroy", "depthOffset 64"],
			ticks: 0 },
	],
	"DolgostroyIn": [
		{ var: ["setLayer actors", "gfxId dolgostroy", "depthOffset 64"],
			ticks: 0 },
		{ var: "shutterBottom 80 -> 16", ticks: 300 },
	],
	"DolgostroyOut": [
		{ var: ["setLayer actors", "gfxId dolgostroy", "depthOffset 64"],
			ticks: 0 },
		{ var: "shutterBottom 16 -> 80", ticks: 300 },
		{ var: "gfxId -", ticks: 0 }
	],
	"Dacha": [
		{ var: ["setLayer actors", "gfxId dacha", "depthOffset 64"],
			ticks: 0 },
	],
	"DachaIn": [
		{ var: ["setLayer actors", "gfxId dacha", "depthOffset 64"],
			ticks: 0 },
		{ var: "shutterTop 80 -> 16", ticks: 300 },
	],
	"DachaOut": [
		{ var: ["setLayer actors", "gfxId dacha", "depthOffset 64"],
			ticks: 0 },
		{ var: "shutterTop 16 -> 80", ticks: 300 },
		{ var: "gfxId -", ticks: 1 }
	],
	"Station": [
		{ var: ["setLayer static_decals", "gfxId station", "depthOffset 64"],
			ticks: 0 },
	],
	"StationIn": [
		{ var: ["setLayer static_decals", "gfxId station", "depthOffset 64"],
			ticks: 0 },
		{ var: "shutterTop 80 -> 16", ticks: 300 },
	],
	"ConstructionIn": [
		{ var: ["setLayer overlays", "gfxId construction", "depthOffset 64"],
			ticks: 0 },
		{ var: "offsetY 0 -> -128", ticks: 300 },
		{ var: "gfxId -", ticks: 0 }
	],
	"ConstructionOut": [
		{ var: ["setLayer overlays", "gfxId construction", "depthOffset 64"],
			ticks: 0 },
		{ var: "offsetY -128 -> 0", ticks: 300 },
		{ var: "gfxId -", ticks: 0 }
	],

	"5G": [
		{ var: ["setLayer actors", "gfxId 5g", "depthOffset 48"],
			ticks: 0 },
	],
	"BoozeStand": [
		{ var: ["setLayer actors", "gfxId booze_stand", "depthOffset 48"],
			ticks: 0 },
	],
	"BoozeStandWithBottle": [
		{ var: ["setLayer actors", "gfxId booze_stand_with_bottle",
			"depthOffset 48"],
			ticks: 0 },
	],
	"Sortir": [
		{ var: ["setLayer actors", "gfxId sortir", "depthOffset 48"],
			ticks: 0 },
	],
	"SortirOpen": [
		{ var: ["setLayer actors", "gfxId sortir_open", "depthOffset 48"],
			ticks: 0 },
	],
	"SortirNoDoor": [
		{ var: ["setLayer actors", "gfxId sortir_no_door", "depthOffset 48"],
			ticks: 0 },
	],
	"SortirValenok": [
		{ var: ["setLayer actors", "gfxId sortir_valenok", "depthOffset 48"],
			ticks: 0 },
	],
	"Kassa": [
		{ var: ["setLayer actors", "gfxId kassa", "depthOffset 48"],
			ticks: 0 },
	],

	// building inners
	"DoorUp": [
		{ var: ["setLayer dynamic_decals", "gfxId door_up", "depthOffset 16"],
			ticks: 0 },
	],
	"DoorDown": [
		{ var: ["setLayer dynamic_decals", "gfxId door_down", "depthOffset 16"],
			ticks: 0 },
	],
	"DoorLeft": [
		{ var: ["setLayer dynamic_decals", "gfxId door_left", "depthOffset 16"],
			ticks: 0 },
	],
	"DoorRight": [
		{ var: ["setLayer dynamic_decals", "gfxId door_right", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowUp": [
		{ var: ["setLayer dynamic_decals", "gfxId window_up", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowDown": [
		{ var: ["setLayer dynamic_decals", "gfxId window_down", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowLeft": [
		{ var: ["setLayer dynamic_decals", "gfxId window_left", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowRight": [
		{ var: ["setLayer dynamic_decals", "gfxId window_right", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowBarredUp": [
		{ var: ["setLayer dynamic_decals", "gfxId window_barred_up", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowBarredDown": [
		{ var: ["setLayer dynamic_decals", "gfxId window_barred_down", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowBarredLeft": [
		{ var: ["setLayer dynamic_decals", "gfxId window_barred_left", "depthOffset 16"],
			ticks: 0 },
	],
	"WindowBarredRight": [
		{ var: ["setLayer dynamic_decals", "gfxId window_barred_right", "depthOffset 16"],
			ticks: 0 },
	],
	"MountMakePassport": [
		{ var: ["setLayer dynamic_decals", "gfxId mount_make_passport", "depthOffset 16"],
			ticks: 0 },
	],
	"MountMakePistol": [
		{ var: ["setLayer dynamic_decals", "gfxId mount_make_pistol", "depthOffset 16"],
			ticks: 0 },
	],
	"MountMakeVodka": [
		{ var: ["setLayer dynamic_decals", "gfxId mount_make_vodka", "depthOffset 16"],
			ticks: 0 },
	],
	"MountMakeElixir": [
		{ var: ["setLayer dynamic_decals", "gfxId mount_make_elixir", "depthOffset 16"],
			ticks: 0 },
	],

	"PatefonOff": [
		{ var: ["setLayer actors", "gfxId patefon_1", "depthOffset 16"],
			ticks: 0 },
	],

	"PatefonOn": [
		{ var: ["setLayer actors", "gfxId patefon_1", "depthOffset 16"],
			ticks: 0 },
		"loop-start",
		{ var: "gfxId patefon_1", ticks: 20 },
		{ var: "gfxId patefon_2", ticks: 20 },
	],

	"TrashBin": [
		{ var: ["setLayer actors", "gfxId trashbin", "depthOffset 16"],
			ticks: 0 },
	],

	"Tolchok": [
		{ var: ["setLayer actors", "gfxId tolchok_1", "depthOffset 16"],
			ticks: 0 },
		"loop-start",
		{ var: "gfxId tolchok_1", ticks: 8 },
		{ var: "gfxId tolchok_2", ticks: 8 },
	],

	"GoldenTolchok": [
		{ var: ["setLayer actors", "gfxId golden_tolchok_1", "depthOffset 16"],
			ticks: 0 },
		"loop-start",
		{ var: "gfxId golden_tolchok_1", ticks: 8 },
		{ var: "gfxId golden_tolchok_2", ticks: 8 },
	],

	"GoldenEgg": [
		{ var: ["setLayer actors", "gfxId golden_egg", "depthOffset 16"],
			ticks: 0 },
	],

	"GoldenCup": [
		{ var: ["setLayer actors", "gfxId golden_cup", "depthOffset 16"],
			ticks: 0 },
	],

	"GoldenBaton": [
		{ var: ["setLayer actors", "gfxId golden_baton", "depthOffset 16"],
			ticks: 0 },
	],

	"Sign": [
		{ var: ["setLayer actors", "gfxId sign", "depthOffset 16"],
			ticks: 0 },
	],

	"SignDirections": [
		{ var: ["setLayer actors", "gfxId sign_directions", "depthOffset 16"],
			ticks: 0 },
	],

	"Box": [
		{ var: ["setLayer actors", "gfxId box", "depthOffset 16"],
			ticks: 0 },
	],

	"BoxKDS": [
		{ var: ["setLayer actors", "gfxId box_kds", "depthOffset 16"],
			ticks: 0 },
	],

	"BoxKDSBitten": [
		{ var: ["setLayer actors", "gfxId box_kds_bitten", "depthOffset 16"],
			ticks: 0 },
	],

	"FishSkelRight": [
		{ var: ["setLayer static_decals", "gfxId fishskel_right"], ticks: 0 }
	],

	"FishSkelDown": [
		{ var: ["setLayer static_decals", "gfxId fishskel_down"], ticks: 0 }
	],

	"FishSkelLeft": [
		{ var: ["setLayer static_decals", "gfxId fishskel_left"], ticks: 0 }
	],

	"FishSkelUp": [
		{ var: ["setLayer static_decals", "gfxId fishskel_up"], ticks: 0 }
	],

	"Lenin": [
		{ var: ["setLayer actors", "gfxId lenin", "depthOffset 16"],
			ticks: 0 },
	],

	"Lioness": [
		{ var: ["setLayer static_decals", "gfxId lioness_unsearched",
			"depthOffset 64"],
			ticks: 0 },
	],

	"LionessSearched": [
		{ var: ["setLayer static_decals", "gfxId lioness_searched",
			"depthOffset 64"],
			ticks: 0 },
	],

	"GnusmasUp": [
		{ var: ["setLayer static_decals", "gfxId gnusmas_up",
			"depthOffset 16"],
			ticks: 0 },
	],
	"GnusmasDown": [
		{ var: ["setLayer static_decals", "gfxId gnusmas_down",
			"depthOffset 16"],
			ticks: 0 },
	],
	"GnusmasLeft": [
		{ var: ["setLayer static_decals", "gfxId gnusmas_left",
			"depthOffset 48"],
			ticks: 0 },
	],
	"GnusmasRight": [
		{ var: ["setLayer static_decals", "gfxId gnusmas_right",
			"depthOffset 48"],
			ticks: 0 },
	],

	// particles
	"ParticleTeleportOut": [
		{ var: ["setLayer dynamic_decals", "gfxId part_teleport"],
			evt: "playSfx telept", ticks: 0 },
		{ var: ["rotate 0 -> 240", "scale 0 -> 1.2"], ticks: 30 },
		{ var: "setLayer overlays", ticks: 0 },
		{ var: ["rotate 240 -> 480", "scale 1.2 -> 0"], ticks: 30 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleTeleportIn": [
		{ var: ["setLayer overlays", "gfxId part_teleport"],
			evt: "playSfx telept", ticks: 0 },
		{ var: ["rotate 0 -> 240", "scale 0 -> 1.2"], ticks: 30 },
		{ var: "setLayer dynamic_decals", ticks: 0 },
		{ var: ["rotate 240 -> 480", "scale 1.2 -> 0"], ticks: 30 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleWaterRipple": [
		{ var: ["setLayer dynamic_decals", "gfxId part_ripple", "scale 0"],
			ticks: 0 },
		{ var: ["scale 0 -> 1.5", "alpha 1 -> 0"], ticks: 60 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleBoom": [
		{ var: "setLayer overlays", ticks: 0 },
		{ var: ["gfxId part_boom", "scale 0.5"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 1"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 1.25"], ticks: 10 },
		{ var: ["gfxId part_boom", "scale 1"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 0.5"], ticks: 5 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleLesserBoom": [
		{ var: "setLayer overlays", ticks: 0 },
		{ var: ["gfxId part_boom", "scale 0.25"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 0.5"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 0.75"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 0.5"], ticks: 5 },
		{ var: ["gfxId part_boom", "scale 0.25"], ticks: 5 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleSquish": [
		{ var: "setLayer dynamic_decals", evt: "playSfx squish", ticks: 0 },
		{ var: ["gfxId part_squish_1", "scale 0.25"], ticks: 5 },
		{ var: ["gfxId part_squish_2", "scale 0.5"], ticks: 5 },
		{ var: ["gfxId part_squish_3", "scale 1"], ticks: 30 },
		{ var: ["alpha 1 -> 0"], ticks: 120 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleSmoke": [
		{ var: ["setLayer overlays", "gfxId part_smoke"], ticks: 0 },
		{ var: ["scale 0.5 -> 1.1", "alpha 0.5 -> 0"], ticks: 120 },
		{ var: "gfxId -", ticks: 0 }
	],
	"ParticleSmokeFast": [
		{ var: ["setLayer overlays", "gfxId part_smoke"], ticks: 0 },
		{ var: ["scale 0.5 -> 1.1", "alpha 0.5 -> 0"], ticks: 30 },
		{ var: "gfxId -", ticks: 0 }
	],
	"ParticleSmokeTrain": [
		{ var: ["setLayer overlays", "gfxId part_train_smoke"], ticks: 0 },
		{ var: ["scale 0.5 -> 1.1", "alpha 0.5 -> 0"], ticks: 30 },
		{ var: "gfxId -", ticks: 0 }
	],
	"ParticleHeart": [
		{ var: ["setLayer overlays", "gfxId part_heart", "x @FROM_X", "y @FROM_Y"],
			ticks: 0 },
		{ var: ["scale 0 -> 1.0"], ticks: 5 },
		{ var: ["scale 1.0 -> 0.5"], ticks: 5 },
		{ var: ["x @FROM_X -> @TO_X",
			"y @FROM_Y -> @TO_Y",
			"alpha 1 -> 0"], ticks: 30 }
	],
	"ParticleBubble": [
		{ var: ["setLayer overlays", "gfxId part_bubble_0", "x @FROM_X", "y @FROM_Y"],
			ticks: 6 },
		{ var: ["gfxId part_bubble_1", "x @FROM_X", "y @FROM_Y"],
			ticks: 6 },
		{ var: ["gfxId part_bubble_2", "x @FROM_X -> @TO_X",
			"y @FROM_Y -> @TO_Y"], rate: "@RATE" },
		{ var: "gfxId part_bubble_3", ticks: 3 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleLazer": [
		{ var: ["setLayer overlays", "gfxId part_lazer_1"], ticks: 0 }
	],

	"ParticleLazerLocked": [
		{ var: "setLayer overlays", evt: "playSfx lazer", ticks: 0 },
		"loop-start",
		{ var: "gfxId part_lazer_1", ticks: 2 },
		{ var: "gfxId part_lazer_2", ticks: 2 },
	],

	"ParticleNuke": [
		{ var: ["setLayer overlays", "gfxId nuke_mushroom",
			"alpha 0.75"], ticks: 0 },
		{ var: "shiftY 80 -> 0", ticks: 60 },
		{ var: "alpha 0.75 -> 0", ticks: 160 }
	],
	"ParticleSortirDoor": [
		{ var: ["setLayer actors", "gfxId part_sortir_door"], ticks: 0 }
	],
	"ParticleRadio": [
		{ var: ["setLayer overlays", "gfxId part_radio", "scale 0"],
			ticks: 0 },
		{ var: ["scale 0 -> 2", "alpha 0.5 -> 0"], ticks: 60 },
		{ var: "gfxId -", ticks: 0 }
	],
	"ParticleZ": [
		{ var: ["setLayer overlays", "gfxId part_z", "x @FROM_X", "y @FROM_Y"],
			ticks: 0 },
		{ var: ["scale 0 -> 1.5"], ticks: 5 },
		{ var: ["scale 1.5 -> 1.0"], ticks: 5 },
		{ var: ["x @FROM_X -> @TO_X",
			"y @FROM_Y -> @TO_Y",
			"alpha 1 -> 0"], ticks: 60 }
	],

	"ParticleGlimmerA": [
		{ var: "setLayer overlays", ticks: 0 },
		{ var: "gfxId part_glimmer_a_1", ticks: 10 },
		{ var: "gfxId part_glimmer_a_2", ticks: 10 },
		{ var: "gfxId part_glimmer_a_1", ticks: 10 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ParticleGlimmerB": [
		{ var: "setLayer overlays", ticks: 0 },
		{ var: "gfxId part_glimmer_b_1", ticks: 10 },
		{ var: "gfxId part_glimmer_b_2", ticks: 10 },
		{ var: "gfxId part_glimmer_b_1", ticks: 10 },
		{ var: "gfxId -", ticks: 0 }
	],

	"ItemGoldballSviborg": [
		{ var: ["setLayer items", "gfxId item_goldball_0"], ticks: 0 },
		{ var: "gfxId item_sviborg_0", ticks: 20 },
		{ var: "gfxId item_sviborg_1", ticks: 20 },
		{ var: "gfxId item_sviborg_2", ticks: 20 },
		{ var: "gfxId item_sviborg_3", evt: "playSfx boo", ticks: 20 },
	],

	"Anomaly": [
		"loop-start",
		{ var: ["setLayer dynamic_decals", "gfxId -"], ticks: 200 },
		{ var: "gfxId part_anomaly_1", ticks: 10 },
		{ var: "gfxId part_anomaly_2", ticks: 10 },
		{ var: "gfxId part_anomaly_3", ticks: 10 },
		{ var: "gfxId part_anomaly_2", ticks: 10 },
		{ var: "gfxId part_anomaly_1", ticks: 10 },
	],

	// GD server
	"GDServer": [
		{ var: ["setLayer actors", "depthOffset 16"], ticks: 0 },
		"loop-start",
		{ var: "gfxId gd_server_1", ticks: 8 },
		{ var: "gfxId gd_server_2", ticks: 8 },
		{ var: "gfxId gd_server_3", ticks: 8 },
		{ var: "gfxId gd_server_4", ticks: 8 },
		{ var: "gfxId gd_server_5", ticks: 8 },
		{ var: "gfxId gd_server_6", ticks: 8 },
		{ var: "gfxId gd_server_7", ticks: 8 },
		{ var: "gfxId gd_server_8", ticks: 8 },
	],

	"GDMessage1": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_1"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage2": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_2"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage3": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_3"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage4": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_4"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage5": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_5"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage6": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_6"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage7": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_7"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage8": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_8"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage9": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_9"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage10": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_10"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage11": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_11"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage12": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_12"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage13": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_13"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage14": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_14"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage15": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_15"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],

	"GDMessage16": [
		{ var: ["setLayer beacons", "depthOffset 16",
			"alpha 1", "offsetY 0",
			"gfxId gd_message_16"], ticks: 0 },
		{ var: "shiftX -64 -> 0", ticks: 30 },
		{ var: "setLayer beacons", ticks: 0 },
		{ var: "offsetY 0 -> 32", ticks: 15 },
		{ var: "alpha 1 -> 0", ticks: 60 },
	],
}

};