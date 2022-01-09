// declaration of hotspots
// the functions are only allowed to operate on "gs" and "tmps" args
// (and GameConst, as an exception)

const HS_SK = {
	PickupTugrik(tugrikId) {
		return [ UIText.SK_PICKUP, "ac.pickupTugrik", { id: tugrikId } ];
	},
	Examine(subjectId, setAfter) {
		return [ UIText.SK_EXAMINE, "examine", { id: subjectId,
			setAfter: setAfter } ];
	},
	// examine item and enable the pickable item at the given hotspot
	// relies on naming of the hotspot and, optionally, of the hint
	EnableItem({ itemId, hintId = "ex_" + itemId, nextAction = null }) {
		return [ UIText.SK_EXAMINE, "ac.enableItem", {
			itemId: itemId,
			hintId: hintId,
			hotspotId: "hs_" + itemId,
			nextAction: nextAction
		} ];
	},
	OpenInvForUseAt(hostpotId) {
		[ UIText.SK_USE, "openInventory",
			{ forUse: true, hotspotId: hotspotId } ];
	},
	Action(text, type, args) {
		return [text, type, args];
	},
	None: ["", null, null]
}

// screen ID => hotspot ID => ({gs} => state getter)
const ResHotspotSpecs = {
	// border
	"sA0": {
		"hs_tugrik_20": ({gs}) => {
			if (!gs.tugrik_20) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_20"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_tank_drain": ({gs,tmps}) => {
			if (gs.f_tank_drain_enabled && !gs.f_tank_drained) return [
				gs.f_tank_drain_inspected ? "xz" : "x",
				gs.f_tank_drain_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_tank_drain",
					{ f_tank_drain_inspected: true })
			];
		},

		"hs_specplace_sA0": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sA0) return [
				gs.f_specplace_sA0_inspected ? "xz" : "x",
				gs.f_specplace_sA0_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sA0_inspected: true })
			];
		},

		"hs_sign_A0_1": ({gs,tmps}) => {
			if (!gs.f_otstrel_started && !gs.f_sortir_off &&
				!gs.f_debil_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.debilEnable")
			];
		},

		"hs_sign_A0_2": ({gs,tmps}) => {
			if (!gs.f_otstrel_started && !gs.f_sortir_off &&
				!gs.f_debil_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.debilEnable")
			];
		}
	},

	// sortir
	"sB0": {
		"hs_tugrik_19": ({gs}) => {
			if (!gs.tugrik_19 && gs.f_sortir_off) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_19"),
				HS_SK.Examine("ex_it_tugrik_stinky",
					{ ach_money_dont_stink: true })
			];
		},

		"hs_tugrik_18": ({gs}) => {
			if (!gs.tugrik_18) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_18"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_paper": ({gs,tmps}) => {
			if (!gs.it_paper && gs.it_paper_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_paper" })
			];
		},

		"hs_it_iphone": ({gs,tmps}) => {
			if (!gs.it_iphone && gs.it_iphone_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_iphone" })
			];
		},

		"hs_specplace_sB0": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sB0) return [
				gs.f_specplace_sB0_inspected ? "xz" : "x",
				gs.f_specplace_sB0_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sB0_inspected: true })
			];
		},

		"hs_sortir": ({gs}) => {
			if (!gs.f_kreakl_intro) return [
				gs.f_sortir_inspected ? "xz" : "x",
				gs.f_sortir_inspected ?
					HS_SK.Action(UIText.SK_KNOCK, "cs.knockSortir", {})
					: HS_SK.None,
				HS_SK.Examine("ex_sortir",
					{ f_sortir_inspected: true })
			];
		},

		"hs_use_grenade": ({gs}) => {
			if (gs.f_kreakl_intro && !gs.f_grenade_used) return [
				gs.f_sortir_window_inspected ? "xz" : "x",
				gs.f_sortir_window_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_sortir_window",
					{ f_sortir_window_inspected: true })
			];
		},

		"hs_get_data": ({gs}) => {
			if (gs.f_grenade_used && !gs.it_data && !gs.f_sortir_off) return [
				gs.f_get_data_inspected ? "xz" : "x",
				gs.f_get_data_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_teslalink",
					{ f_get_data_inspected: true })
			];
		},

		"hs_use_valenok": ({gs}) => {
			if (gs.f_grenade_used && !gs.f_sortir_blocked) return [
				gs.f_sortir_vent_inspected ? "xz" : "x",
				gs.f_sortir_vent_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_sortir_vent",
					{ f_sortir_vent_inspected: true })
			];
		}
	},

	// thicket
	"sC0": {
		"hs_tugrik_17": ({gs}) => {
			if (!gs.tugrik_17) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_17"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_backpack": ({gs,tmps}) => {
			if (!gs.f_backpack_collected) return [
				"xz",
				HS_SK.Action(UIText.SK_USE, "cs.collectBackpack", {}),
				HS_SK.Examine("ex_it_backpack")
			];
		},

		"hs_it_scotch": ({gs,tmps}) => {
			if (!gs.it_scotch && gs.it_scotch_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_scotch" })
			];
		},

		"hs_search_valenok": ({gs,tmps}) => {
			if (gs.f_medved_detected_sC0 && !gs.it_valenok_enabled) return [
				gs.f_search_valenok_inspected ? "xz" : "x",
				gs.f_search_valenok_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_search_valenok",
					{ f_search_valenok_inspected: true })
			];
		},

		"hs_it_valenok": ({gs,tmps}) => {
			if (!gs.it_valenok && gs.it_valenok_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_valenok" })
			];
		},

		"hs_specplace_sC0": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sC0) return [
				gs.f_specplace_sC0_inspected ? "xz" : "x",
				gs.f_specplace_sC0_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sC0_inspected: true })
			];
		},

		"hs_voyager": ({gs,tmps}) => {
			if (!gs.f_voyager_poked) return [
				gs.f_voyager_inspected ? "xz" : "x",
				gs.f_voyager_inspected ?
					HS_SK.Action(UIText.SK_POKE, "cs.pokeVoyager", {})
					: HS_SK.None,
				HS_SK.Examine("ex_voyager",
					{ f_voyager_inspected: true })
			];
		},

		"hs_voyager_loot": ({gs,tmps}) => {
			if (gs.f_voyager_poked && !gs.it_scotch_enabled) return [
				gs.f_voyager_loot_inspected ? "xz" : "x",
				gs.f_voyager_loot_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_voyager_loot",
					{ f_voyager_loot_inspected: true })
			];
		}
	},

	// road to nowhere
	"sD0": {
		"hs_tugrik_16": ({gs}) => {
			if (!gs.tugrik_16) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_16"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_scanner": ({gs,tmps}) => {
			if (!gs.it_scanner) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_scanner" })
			];
		},

		"hs_specplace_sD0": ({gs,tmps}) => {
			if (!gs.f_medved_detected_sD0) return [
				gs.f_specplace_sD0_inspected ? "xz" : "x",
				gs.f_specplace_sD0_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_already",
					{ f_specplace_sD0_inspected: true })
			];
		},

		"hs_no_fishing_sign": ({gs,tmps}) => {
			if (!gs.it_fish || !gs.f_no_fishing_inspected) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.noFishing", {})
			];
		}
	},

	// southwest bank
	"sA1": {
		"hs_tugrik_15": ({gs}) => {
			if (!gs.tugrik_15) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_15"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_medved_observe": ({gs}) => {
			if (!gs.it_turban_enabled) return [
				gs.f_medved_inspected ? "xz" : "x",
				gs.f_medved_inspected ?
					HS_SK.Action(UIText.SK_POKE, "cs.pokeMedved", {})
					: HS_SK.None,
				HS_SK.Examine("ex_medved_observe",
					{ f_medved_inspected: true })
			];
		},

		"hs_it_turban": ({gs,tmps}) => {
			if (!gs.it_turban && gs.it_turban_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_turban",
					hintId: "ex_it_turban_intro" })
			];
		},

		"hs_medved_iron": ({gs}) => {
			if (gs.f_medved_detected_sA1 && !gs.it_iron_1_enabled) return [
				"xz",
				HS_SK.Action(UIText.SK_WELL, "cs.extractIron", {}),
				HS_SK.Examine("ex_medved_iron")
			];
		},

		"hs_it_iron_1": ({gs,tmps}) => {
			if (!gs.it_iron_1 && gs.it_iron_1_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_iron_1",
					hintId: "ex_it_iron" })
			];
		},

		"hs_specplace_sA1": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sA1) return [
				gs.f_specplace_sA1_inspected ? "xz" : "x",
				gs.f_specplace_sA1_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sA1_inspected: true })
			];
		}
	},

	// eco-disaster river
	"sB1": {
		"hs_tugrik_14": ({gs}) => {
			if (!gs.tugrik_14) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_14"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_ferry_north": ({gs}) => {
			if (!gs.f_water_cleansed) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_ferry_closed")
			];
			// else OpenInvForUse + exam bad river
			return [
				gs.f_ferry_inspected ? "xz" : "x",
				gs.f_ferry_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory", { forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_ferry_open", { f_ferry_inspected: true })
			];
		},

		"hs_ferry_south": ({gs}) => {
			if (!gs.f_water_cleansed) return null;
			return [
				gs.f_ferry_inspected ? "xz" : "x",
				HS_SK.Action(UIText.SK_USE, "openInventory", { forUse: true }),
				HS_SK.Examine("ex_ferry_open")
			];
		},

		"hs_use_elixir": ({gs}) => {
			if (!gs.f_water_cleansed) return [
				gs.f_use_elixir_inspected ? "xz" : "x",
				gs.f_use_elixir_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory", { forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_use_elixir", { f_use_elixir_inspected: true })
			];
		},

		"hs_get_vodka": ({gs}) => {
			if (gs.f_water_cleansed && gs.it_bottle &&
				gs.it_bottle != "discarded") return [
				gs.f_get_vodka_inspected ? "xz" : "x",
				gs.f_get_vodka_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory", { forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_get_vodka", { f_get_vodka_inspected: true })
			];
		}
	},

	// forest & partisanen
	"sC1": {
		"hs_tugrik_11": ({gs}) => {
			if (!gs.tugrik_11) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_11"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_specplace_sC1": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sC1) return [
				gs.f_specplace_sC1_inspected ? "xz" : "x",
				gs.f_specplace_sC1_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sC1_inspected: true })
			];
		}
	},

	// gasters
	"sD1": {
		"hs_tugrik_13": ({gs}) => {
			if (!gs.tugrik_13) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_13"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_ski": ({gs,tmps}) => {
			if (!gs.it_ski && gs.it_ski_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_ski" })
			];
		},

		"hs_specplace_sD1": ({gs,tmps}) => {
			if (tmps.specPlaceRevealed && !gs.f_medved_detected_sD1) return [
				gs.f_specplace_sD1_inspected ? "xz" : "x",
				gs.f_specplace_sD1_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_spec_place_detected",
					{ f_specplace_sD1_inspected: true })
			];
		},

		"hs_gasters_D1": ({gs,tmps}) => {
			if (!gs.f_gasters_launched) return [
				gs.f_gasters_sD1_inspected ? "xz" : "x",
				gs.f_gasters_sD1_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_gasters_idle",
					{ f_gasters_sD1_inspected: true })
			];
		}
	},

	// inside corrupt manager's mansion
	"sA2": {
		"hs_tugrik_9": ({gs}) => {
			if (!gs.tugrik_9) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_9"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_project": ({gs,tmps}) => {
			if (!gs.it_project && gs.it_project_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_project" })
			];
		},

		"hs_it_proc_id": ({gs,tmps}) => {
			if (!gs.it_proc_id && gs.it_proc_id_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_proc_id" })
			];
		},

		"hs_mansion_comp": ({gs,tmps}) => {
			if (!gs.it_project_enabled) return [
				gs.f_comp_inspected ? "xz" : "x",
				gs.f_comp_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_comp",
					{ f_comp_inspected: true })
			];
		},

		"hs_mansion_printer_fuel": ({gs,tmps}) => {
			if (gs.f_printer_enabled && !gs.f_printer_fueled) return [
				gs.f_printer_fuel_inspected ? "xz" : "x",
				gs.f_printer_fuel_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_printer",
					{ f_printer_fuel_inspected: true })
			];
		},

		"hs_mansion_printer_paper": ({gs,tmps}) => {
			if (gs.f_printer_fueled && !gs.f_printer_ready) return [
				gs.f_printer_paper_inspected ? "xz" : "x",
				gs.f_printer_paper_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_printer_no_paper",
					{ f_printer_paper_inspected: true })
			];
		},

		"hs_mansion_tolchok": ({gs,tmps}) => {
			if (!gs.f_mansion_tolchok_inspected) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.inspectTolchok")
			];
		},

		"hs_mansion_lioness": ({gs,tmps}) => {
			if (!gs.f_mansion_lioness_inspected) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_lioness",
					{ f_mansion_lioness_inspected: true })
			];
		},

		"hs_mansion_lioness_side": ({gs,tmps}) => {
			if (gs.f_mansion_lioness_inspected &&
				!gs.it_proc_id_enabled) return [
				gs.f_mansion_lioness_side_inspected ? "xz" : "x",
				gs.f_mansion_lioness_side_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_lioness_side",
					{ f_mansion_lioness_side_inspected: true })
			];
		}
	},

	// dolgostroy
	"sB2": {
		"hs_tugrik_12": ({gs}) => {
			if (!gs.tugrik_12) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_12"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_ticket": ({gs,tmps}) => {
			if (!gs.it_ticket && gs.it_ticket_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_ticket" })
			];
		},

		"hs_gasters_B2": ({gs,tmps}) => {
			if (gs.f_gasters_launched &&
				gs.f_dacha_on) return [
				"xz",
				HS_SK.Action(UIText.SK_TALK, "cs.whatTheFuck", {}),
				HS_SK.Examine("ex_gasters_idle2")
			];

			if (gs.f_gasters_launched &&
				!gs.f_dacha_on &&
				!gs.f_station_on) return [
				"xz",
				HS_SK.Action(UIText.SK_USE, "openInventory",
					{ forUse: true }),
				HS_SK.Examine("ex_gasters_idle3")
			];
		},

		"hs_directions_sign": ({gs,tmps}) => {
			if (!gs.f_directions_read) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.inspectDirections")
			];
		},

		"hs_buy_ticket": ({gs,tmps}) => {
			if (!gs.it_ticket_enabled && gs.f_station_on) {
				return [
					gs.f_kassa_inspected ? "xz" : "x",
					gs.f_kassa_inspected ?
						HS_SK.Action(UIText.SK_BUY_TICKET, "gameAction",
							{ action: "ac.tryBuyTicket" })
						: HS_SK.None,
					HS_SK.Examine("ex_kassa",
						{ f_kassa_inspected: true })
				];
			}
		},

		"hs_enter_train": ({gs,tmps}) => {
			if (gs.f_station_on) return [
				gs.f_enter_train_inspected ? "xz" : "x",
				gs.f_enter_train_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_enter_train",
					{ f_enter_train_inspected: true })
			];
		}
	},

	// corovan road
	"sC2": {
		"hs_it_fish": ({gs,tmps}) => {
			if (!gs.it_fish && gs.it_fish_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_fish",
					hintId: "ex_it_fish_intro",
					nextAction: "cs.whoAlcoholizesFish" })
			];
		},

		"hs_telephone_C2": ({gs}) => {
			if (!gs.f_telephone_on) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_telephone_off")
			];
			else return [
				"xz",
				HS_SK.Action(UIText.SK_DIAL, "gameAction", { action: "ac.dial" }),
				HS_SK.Examine("ex_telephone_on"),
			];
		},

		"hs_holdup_spot": ({gs}) => {
			if (!gs.it_mk152) return [
				gs.f_holdup_inspected ? "xz" : "x",
				gs.f_holdup_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_holdup",
					{ f_holdup_inspected: true })
			];
		}
	},

	// lost switch
	"sD2": {
		"hs_tugrik_10": ({gs}) => {
			if (!gs.tugrik_10) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_10"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_troll_talk": ({gs}) => {
			if (gs.f_troll_intro && !gs.f_troll_off) return [
				"xz",
				gs.f_railswitch_sign_read && !gs.f_incomplete_line_say?
					HS_SK.Action(UIText.SK_TALK, "gameAction",
						{ action: "cs.theLineIsIncomplete" })
					: HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true }),
				HS_SK.Examine("ex_troll")
			];
		},

		"hs_railswitch_sign": ({gs}) => {
			if (!gs.f_railswitch_sign_read) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_railswitch_incomplete",
					{ f_railswitch_sign_read: true }),
			];
		},

		"hs_railswitch": ({gs}) => {
			if (gs.f_railswitch_sign_read &&
				((!gs.f_railswitch_up && !gs.it_ticket_enabled) ||
					(gs.f_railswitch_up && gs.it_ticket_enabled)
				)) return [
				gs.f_railswitch_inspected ? "xz" : "x",
				gs.f_railswitch_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine(gs.it_ticket_enabled ? "ex_railswitch_incomplete3"
					: "ex_railswitch_incomplete2",
					gs.it_ticket ? { f_railswitch_inspected2: true }
					: { f_railswitch_inspected: true }),
			];
		}
	},

	// corrupt manager's mansion
	"sA3": {
		"hs_tugrik_5": ({gs}) => {
			if (!gs.tugrik_5) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_5"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_wire_observe": ({gs}) => {
			if (!gs.f_security_off && !gs.f_goldball_observed) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.observeWire", {})
			];
		},

		"hs_mansion_entrance": ({gs}) => {
			if (gs.f_security_off && !(
				((gs.it_pistol == "inv" || gs.it_pistol_scotch == "inv" ||
					gs.it_grenade == "inv")
					&& gs.it_torchlight == "inv")
				|| gs.it_pistol_torchlight == "inv"
				)) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_entrance_danger")
			];
		}
	},

	// kolhoz entrance
	"sB3": {
		"hs_tugrik_8": ({gs}) => {
			if (!gs.tugrik_8) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_8"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_rake": ({gs,tmps}) => {
			if (!gs.it_rake && gs.it_rake_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_rake" })
			];
		},

		"hs_it_detector": ({gs,tmps}) => {
			if (!gs.it_detector) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_detector" })
			];
		},

		"hs_news_post": ({gs,tmps}) => {
			if (!gs.f_tolchok_compromised) return [
				gs.f_newspost_inspected ? "xz" : "x",
				gs.f_newspost_inspected ?
					HS_SK.Action(UIText.SK_READ, "cs.readNewsPost", {})
					: HS_SK.None,
				HS_SK.Examine("ex_news_post",
					{ f_newspost_inspected: true })
			];
		},

		"hs_cow_interact": ({gs,tmps}) => {
			if (!gs.f_cow_off) return [
				gs.f_cow_inspected ? "xz" : "x",
				gs.f_cow_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_cow",
					{ f_cow_inspected: true })
			];
		}
	},

	// secret hero bunker
	"sC3": {
		"hs_pistol_search": ({gs,tmps}) => {
			if (!gs.it_pistol_enabled) return [
				gs.f_pistolcase_inspected ? "xz" : "x",
				gs.f_pistolcase_inspected ?
					HS_SK.Action(UIText.SK_SEARCH, "cs.findPistol", {})
					: HS_SK.None,
				HS_SK.Examine("ex_pistolcase",
					{ f_pistolcase_inspected: true })
			];
		},

		"hs_it_pistol": ({gs,tmps}) => {
			if (!gs.it_pistol && gs.it_pistol_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_pistol" })
			];
		},

		"hs_iron_search": ({gs,tmps}) => {
			if (!gs.it_iron_2_enabled && gs.f_tolchok_compromised) return [
				gs.f_buntolchok_inspected ? "xz" : "x",
				gs.f_buntolchok_inspected ?
					HS_SK.Action(UIText.SK_SEARCH, "cs.findIron2", {})
					: HS_SK.None,
				HS_SK.Examine("ex_bunker_tolchok",
					{ f_buntolchok_inspected: true })
			];
		},

		"hs_it_iron_2": ({gs,tmps}) => {
			if (!gs.it_iron_2 && gs.it_iron_2_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_iron_2", hintId: "ex_it_iron" })
			];
		},

		"hs_exit": ({gs,tmps}) => {
			if (gs.it_pistol != "inv" && !gs.f_outside_bunker_visited) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_no_exit_without_pistol")
			];
		},

		"hs_patefon": ({gs,tmps}) => {
			return [
				gs.f_patefon_inspected ? "xz" : "x",
				gs.f_patefon_inspected ?
					HS_SK.Action(
						gs.f_patefon_off ? UIText.SK_SWITCH_ON
							: UIText.SK_SWITCH_OFF,
						gs.f_patefon_off ? "cs.patefonOn"
							: "cs.patefonOff", {})
					: HS_SK.None,
				HS_SK.Examine(gs.f_patefon_off ? "ex_patefon_off"
						: "ex_patefon_on",
					{ f_patefon_inspected: true })
			];
		},

		"hs_bunkerist_interact": ({gs,tmps}) => {
			return [
				gs.f_bunkerist_inspected ? "xz" : "x",
				gs.f_bunkerist_inspected ?
					HS_SK.Action(UIText.SK_POKE, "cs.pokeBunkerist", {})
					: HS_SK.None,
				HS_SK.Examine("ex_bunkerist",
					{ f_bunkerist_inspected: true })
			];
		}
	},

	// civilization appendix
	"sD3": {
		"hs_tugrik_7": ({gs}) => {
			if (!gs.tugrik_7) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_7"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_grenade": ({gs,tmps}) => {
			if (!gs.it_grenade && gs.it_grenade_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_grenade" })
			];
		},

		"hs_grenade_search": ({gs,tmps}) => {
			if (!gs.it_grenade_enabled) return [
				gs.f_grenade_inspected ? "xz" : "x",
				gs.f_grenade_inspected ?
					HS_SK.Action(UIText.SK_SEARCH, "cs.findGrenade", {})
					: HS_SK.None,
				HS_SK.Examine("ex_grenadecase",
					{ f_grenade_inspected: true })
			];
		},

		"hs_5g": ({gs,tmps}) => {
			if (!gs.f_telephone_on) return [
				gs.f_5g_inspected ? "xz" : "x",
				gs.f_5g_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_5g",
					{ f_5g_inspected: true })
			];
		}
	},

	// kolhoz field zone
	"sA4": {
		"hs_tugrik_6": ({gs}) => {
			if (!gs.tugrik_6) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_6"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_goldball": ({gs,tmps}) => {
			if (!gs.it_goldball && gs.it_goldball_enabled) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_goldball" })
			];
		},

		"hs_goldball_observe": ({gs}) => {
			if (gs.f_wire_observed && !gs.f_stalker_deal_open) return [
				"x",
				HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "gameAction",
					{ action: "cs.observeGoldBall" })
			];
		},

		"hs_stalker_talk_A4": ({gs}) => {
			if (gs.f_stalker_done && !gs.f_bottle_reclaim_open) return [
				"xz",
				HS_SK.Action(UIText.SK_POKE, "gameAction",
					{ action: "cs.stalkerWhereIsBottle" }),
				HS_SK.Examine("ex_stalker_resting")
			];
		}
	},

	// kolhoz barracks
	"sB4": {
		"hs_podsobka": ({gs}) => {
			if (!gs.f_pig_off) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_podsobka")
			];
		}
	},

	// kolhoz booze stand
	"sC4": {
		"hs_telephone_C4": ({gs}) => {
			if (!gs.f_telephone_on) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_telephone_off")
			];
			else return [
				"xz",
				HS_SK.Action(UIText.SK_DIAL, "gameAction", { action: "ac.dial" }),
				HS_SK.Examine("ex_telephone_on"),
			];
		},

		"hs_booze_stand": ({gs}) => {
			if (!gs.f_pig_off) return [
				gs.f_boozestand_inspected ? "xz" : "x",
				gs.f_boozestand_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Examine("ex_booze_stand",
					{ f_boozestand_inspected: true })
			];
		}
	},

	// n/a
	"sD4": {
	},

	// inside sut
	"sA5": {
		"hs_tugrik_4": ({gs}) => {
			if (!gs.tugrik_4) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_4"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_elixir": ({gs,tmps}) => {
			// note - no it_elixir_enabled, it is there by default
			if (!gs.it_elixir) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_elixir",
					hintId: "ex_it_elixir_intro" })
			];
		},

		"hs_make_passport": ({gs,tmps}) => {
			if (!gs.it_passport) return [
				gs.f_make_passport_inspected ? "xz" : "x",
				gs.f_make_passport_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.exMakePassport")
			];
		},

		"hs_make_pistol_torchlight": ({gs,tmps}) => {
			if (!gs.it_pistol_torchlight) return [
				gs.f_make_pistol_torchlight_inspected ? "xz" : "x",
				gs.f_make_pistol_torchlight_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.exMakePistolTorchlight")
			];
		},

		"hs_make_explosive_vodka": ({gs,tmps}) => {
			if (!gs.it_explosive_vodka) return [
				gs.f_make_explosive_vodka_inspected ? "xz" : "x",
				gs.f_make_explosive_vodka_inspected ?
					HS_SK.Action(UIText.SK_USE, "openInventory",
						{ forUse: true })
					: HS_SK.None,
				HS_SK.Action(UIText.SK_EXAMINE, "cs.exMakeExplosiveVodka")
			];
		},

		"hs_lenin_A5": ({gs,tmps}) => {
			if (!gs.f_lenin_inspected) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_lenin",
					{ f_lenin_inspected: true })
			];
		}
	},

	// inside stalker's hut
	"sB5": {
		"hs_tugrik_3": ({gs}) => {
			if (!gs.tugrik_3) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_3"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_condmilk": ({gs,tmps}) => {
			if (!gs.it_condmilk) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_condmilk" })
			];
			else if (!gs.f_stalker_on) return [
				"xz",
				//HS_SK.None,
				[ UIText.SK_PICKUP, "cs.awakeStalker", { } ],
				HS_SK.Examine("ex_it_condmilk")
			];
			else if (!gs.f_stalker_joke) return [
				"xz",
				//HS_SK.None,
				[ UIText.SK_PICKUP, "cs.stalkerJoke", { } ],
				HS_SK.Examine("ex_it_condmilk")
			];
		},

		"hs_stalker_talk_B5": ({gs}) => {
			if (gs.f_stalker_on && gs.f_stalker_joke) {
				if (!gs.f_stalker_intro) return [
					"xz",
					HS_SK.Action(UIText.SK_TALK, "gameAction",
						{ action: "cs.stalkerIntro" }),
					HS_SK.Examine("ex_local_inhabitant")
				];

				if (gs.f_goldball_observed && !gs.f_stalker_deal_open) return [
					"xz",
					HS_SK.Action(UIText.SK_TALK, "gameAction",
						{ action: "cs.stalkerOpenDeal" }),
					HS_SK.Examine("ex_stalker_useful")
				];

				if (gs.f_stalker_intro && !gs.f_stalker_done) return [
					"xz",
					HS_SK.Action(UIText.SK_USE, "openInventory",
							{ forUse: true }),
					HS_SK.Examine(gs.f_stalker_deal_open ?
						"ex_stalker_requires" : "ex_stalker")
				];
			}
		}
	},

	// inside podsobka
	"sC5": {
		"hs_tugrik_2": ({gs}) => {
			if (!gs.tugrik_2) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_2"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_it_tank": ({gs,tmps}) => {
			// note - no it_tank_enabled, it is there by default
			if (!gs.it_tank) return [
				"x",
				HS_SK.None,
				HS_SK.EnableItem({ itemId: "it_tank" })
			];
		}
	},

	// inside library
	"sD5": {
		"hs_tugrik_1": ({gs}) => {
			if (!gs.tugrik_1) return [
				"xz",
				HS_SK.PickupTugrik("tugrik_1"),
				HS_SK.Examine("ex_it_tugrik")
			];
		},

		"hs_shtirlitz_book": ({gs}) => {
			return [
				gs.f_shtirlitz_book_inspected ? "xz" : "x",
				gs.f_shtirlitz_book_inspected ?
					HS_SK.Action(UIText.SK_READ, "cs.readBook", {})
					: HS_SK.None,
				HS_SK.Examine("ex_book",
					{ f_shtirlitz_book_inspected: true })
			];
		},

		"hs_lenin_D5": ({gs,tmps}) => {
			if (!gs.f_lenin_inspected) return [
				"x",
				HS_SK.None,
				HS_SK.Examine("ex_lenin",
					{ f_lenin_inspected: true })
			];
		}
	},
};
