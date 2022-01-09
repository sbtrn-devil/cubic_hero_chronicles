//#include ResMaps.gen.js

// screen specific and unspecific game scripts
// script functions only are allowed to use the args:
// gs (the game state preserved on switching screens and subject to save),
// tmps (transient screen state, cleared on switching screens),
// st (the script tools, exposed from l30_game_screen's scriptTools)
// hsId (hotspot ID, onUse/onDrop/onPick only)
// GameConst
// also (as an exception) hlsfx API

const ResScripts = {
	// screen ID => "act-ID"|"onUse"|"onDrop"|"onPickup"|"preControl"|"daemon"
	//  => [ array of asyncs ]
};

// screenId is a single screen ID, or "*", or array of screenId-s
// scriptId is "onUse"|"onDrop"|"onPickup"|"preControl"|"daemon"|"act-ID"
// (the "act-ID" is matched against "action" field in game action event,
// "action" parameter to the async is also supplied when called this way)
// for cut scenes, only one action per screenId+scriptId pair is recommended,
// but if there are several ones they'll be performed in the order of adding,
// and stop at 1st one that returns a non-null object (the return will be
// interpreted as the next action event)
// for pre*'s, there can be multiple ones - they will be cascaded in the order
// they are added
// daemon's can be multiple ones, are run on switch to screen and stopped on
// switching from the screen; can also be used to do something action early on
// entering the screen (before transition-in is played) - the map objects
// are already created and set to states by time of a daemon invocation
// preControl is run before user gets control on the hero, should not be used
// for anything contionuous - may return game action object if needed to trigger
// it, but this will stop the sequence of preConrol's yet to be executed
function SCRIPT_ADD(screenId, scriptId, action) {
	var screenIds = [];
	if (screenId == "*") {
		for (var screenId in ResMaps) {
			screenIds.push(screenId);
		}
	} else if (typeof (screenId) != 'string') {
		screenIds.push(...screenId);
	} else {
		screenIds.push(screenId);
	}

	for (var screenId of screenIds) {
		if (!ResScripts[screenId]) {
			ResScripts[screenId] = new Object();
		}

		if (!ResScripts[screenId][scriptId]) {
			ResScripts[screenId][scriptId] = new Array();
		}

		ResScripts[screenId][scriptId].push(action);
	}
}

function S_persistFromTmps({gs, tmps, items}) {
	if (!(items instanceof Array)) {
		items = [items];
	}

	if (!gs.savedFromTmps) {
		gs.savedFromTmps = new Object();
	}

	if (!gs.savedFromTmps[gs.currentScreen]) {
		gs.savedFromTmps[gs.currentScreen] = new Object();
	}

	for (var item of items) {
		gs.savedFromTmps[gs.currentScreen][item] = tmps[item];
	}
}

function S_unpersistToTmps({gs, tmps, items}) {
	if (!(items instanceof Array)) {
		items = [items];
	}

	if (!gs.savedFromTmps[gs.currentScreen]) {
		return;
	}

	if (!gs.savedFromTmps[gs.currentScreen]) {
		gs.savedFromTmps[gs.currentScreen] = new Object();
	}

	for (var item of items) {
		tmps[item] = gs.savedFromTmps[gs.currentScreen][item];
	}
}

//
// the actual scripts...
//

// more or less universal scripts

SCRIPT_ADD("*", "daemon",
async function adjustDark(s, {gs, tmps, st}) {
	st.enableDark(gs.currentScreen == "sA2");
});

SCRIPT_ADD("*", "ac.enableItem",
async function(s, {gs, tmps, st, action}) {
	await s.anyOf(st.examinePopup(s, {
		id: action.hintId
	}));
	if (action.itemId != "it_condmilk") {
		st.placePickableItem({
			gs: gs,
			itemId: action.itemId,
			screen: gs.currentScreen,
			atTile: st.screenPosToTilePos(st.object(action.hotspotId).position)
		});
		if (action.nextAction) {
			return { action: action.nextAction };
		}
	} else {
		// condmilk is a fake item, so just set flag
		gs.it_condmilk = true;
	}
});

SCRIPT_ADD("*", "ac.pickupTugrik",
async function(s, {gs, tmps, st, action}) {
	if (!gs[action.id]) {
		st.setTugrikCount({
			gs: gs,
			value: st.getTugrikCount({gs: gs}) + 1
		});

		// mark tugrik as picked
		gs[action.id] = "picked";

		hlsfxBeep({ frequency: 659, ticks: 2 });
		await st.popup(s, {
			text: "@picked_tugrik:����� ������ 1 ������!"
		});
		
		// picking tugrik has a healing effect
		if (gs.f_hp_enabled) {
			var newHP = st.getHP({gs}) + GameConst.HP_PER_TUGRIK;
			if (newHP > GameConst.HERO_MAX_HP) {
				newHP = GameConst.HERO_MAX_HP;
			}
			st.setHP({ gs: gs, value: newHP });
		}
		st.updateSceneToGameState();
	}
});

// drink yad
SCRIPT_ADD("*", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_yad") {
		tmps.inv_last_selected = null;
		return { action: "cs.drinkYad" };
	}
});

SCRIPT_ADD("*", "cs.drinkYad",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_hp_enabled) {
		gs.f_hp_enabled = true;
		st.discardPickableItem({
			gs: gs,
			itemId: "it_yad"
		});
		await st.popup(s, {
			text: "@hero_drinks_yad:����� ����� ����."
		});
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e3_m5",
			header: "@hero_says:�����:",
			text: "@hero_yad_is_good:��, ��� ����� ����������-��!\n������ � ����\
 ���� �������! � �� ���� ��� ���, ���� ����� - � ����� ��������."
		});

		// fill HP to max
		st.setHP({ gs: gs, value: GameConst.HERO_MAX_HP });
	}
});

// daemon scripts are executed before pre-control, so use them for setting up
// music (for cases when entering causes an immediate game action, missing
// pre-control stage)

async function S_setMusic(s, {gs, tmps, st, action}) {
	if (!gs.f_cut_scene && !tmps.f_music_set) {
		tmps.f_music_set = true;
		if (gs.currentScreen == "sA4") {
			hlsfxPlayMusic({ sfxId: "music_zona" });
		} else if (gs.currentScreen == "sA0" && gs.f_otstrel_started &&
			!gs.f_sortir_off) {
			hlsfxPlayMusic({ sfxId: "music_3" });
		} else if (gs.currentScreen == "sA3" && !gs.f_security_off) {
			hlsfxPlayMusic({ sfxId: "music_chad_kutezh" });
		} else {
			if (gs.f_patefon_off) {
				hlsfxPlayMusic({ sfxId: null });
			} else {
				hlsfxPlayMusic({ sfxId: "music_2" });
			}
		}
	}
}

SCRIPT_ADD("*", "daemon", S_setMusic);

// animated actor helper
async function S_animateAndMove(s, {
	st,
	entId,
	fromLocId,
	fromPosition = null,
	toLocId,
	toPosition = null,
	animFrom, // pre-movement animation (played to end)
	animMove, // animaion during movement
	animTo, // post-movement animation (not waited for)
	moveAnimationId = "MoveAtRate", // to be used for x/y updates for movement
	rate, // to be passed for @RATE parameter to the moveAnimationId
	ticks, // to be passed for @TICKS parameter to the moveAnimationId
	moveTickEvent
}) {
	var stObject = st.object(entId);
	if (animFrom) {
		await s.anyOf(stObject.playAnimation({
			animationId: animFrom,
			atPosition: st.object(fromLocId).position
		}));
	}

	await s.anyOf(stObject.playAnimation({
		animationId: animMove,
		moveAnimationId: moveAnimationId,
		moveFrom: fromPosition || st.object(fromLocId).position,
		moveTo: toPosition || st.object(toLocId).position,
		moveTickEvent: moveTickEvent,
		parameters: {
			RATE: rate,
			TICKS: ticks
		}
	}));

	if (animTo) {
		stObject.playAnimation({
			animationId: animTo,
			atPosition: toPosition || st.object(toLocId).position
		});
	}
}

// HP reduction
function S_reduceHP({gs, st, minusHP}) {
	var newHP = st.getHP({gs}) - minusHP;
	if (newHP <= 0) {
		newHP = 0;
		gs.f_gameover = true;
	}
	st.setHP({gs, value: newHP});
	return !gs.f_gameover;
}

SCRIPT_ADD("*", "ac.heroHit",
async function heroHit(s, {gs, tmps, st, action}) {
	var minusHP;
	
	switch (action.cause) {
	case "nuke":
		st.object("hero").hide();
		// nuke spot particle
		st.playParticle({
			particleId: "boom_spot",
			atPosition: st.object("hero").position
		});
		// and nuke sound
		hlsfxPlaySFX({ sfxId: "nuke" });
		// and flash
		st.playScreenFX({ type: "flash", duration: 120 });
		minusHP = 5;
		break;

	case "aftermath":
		// aftermath of the hit that had been performed earlier
		minusHP = 0;
		break;

	default:
		minusHP = 1;
		st.object("hero").hide();
		st.playParticle({
			particleId: "squish",
			atPosition: st.object("hero").position
		});
		break;
	}
	
	S_reduceHP({gs, st, minusHP});
	await st.waitTicks(s, 60);

	if (action.cause == "nuke") {
		// play mushroom
		st.playParticle({
			particleId: "nuke",
			atPosition: st.object("hero").position
		});
		await st.waitTicks(s, 60);
	}

	switch (action.cause) {
	case "tank":
		if (!gs.f_otstrel_started) {
			// tank is in sentry
			if (tmps.isDebil) {
				// this is set after reading the border alert sign
				tmps.isDebil = false;
				await st.popup(s, {
					type: "iconLeft",
					icon: "icon_tankist",
					header: "@tankist_says:������ �������:",
					text: "@hit_tank_debil:�� ���, �����? ��� ��� �� ��-������\
 ��������?|\n...�-�-�, ���, ��� ����� � �� � �� ������� ���������. ��,\
 ������� � ��������. �� ������� ���� �������."
				});
				gs.ach_debil = true;
			} else {
				await st.popup(s, {
					text: "@hit_tank_normal:������� ���������� �� ���������� �\
 �������� �� �������� ������. ���� ������ � �����, � �� ��� �������\
 ���������, � ������� ����������� � ������ ����."
				});
			}
		} else {
			// tank is shooting kreakliat (hero will only be hit at top lane)
			await st.popup(s, {
				text: "@hit_tank_obstrel:���������� ��� �������� �������\
 ������ � ������ ������������� ���������� ����, ����������, ��������� �������\
 �� �����."
			});
		}
		break;

	case "tractor":
		await st.popup(s, {
			text: "@hit_tractor:�������� �� ���� - ������������ �\
 ����������� ����. ���� ���� ��� ����� ���� ������ ��������������� ��������,\
 � ����� �� ���� ������ ��������� �����������."
			});
		break;

	case "kreakl":
		await st.popup(s, {
			text: "@hit_kreakl:�������� ��� ���� �������, ������� �����\
 ������� � ����� �� ����� ���������� ������������ - ������ ������������ ���\
 �������� ����."
			});
		break;

	case "train":
		if (!gs.f_train_hit_intro) {
			await st.popup(s, {
				text: "@hit_train:�� ��������� �������� ��� �����, �� ����\
 ������� � ������� �����."
			});
		}
		break;

	case "train_fail_grenade":
		hlsfxPlayMusic({ sfxId: "music_abort" });
		await st.popup(s, {
			text: "@hit_train_grenade:��� ������ ����� ������� �� ���������\
 ������������. ��������� ����������� ����������."
			});
		tmps.f_music_set = false;
		await S_setMusic(s, {gs, tmps, st, action});
		break;

	case "train_fail_pistol":
		hlsfxPlayMusic({ sfxId: "music_abort" });
		await st.popup(s, {
			text: "@hit_train_pistol:��� �������� ������� �� ���������\
 ������������. ��������� ����������� ����������."
			});
		tmps.f_music_set = false;
		await S_setMusic(s, {gs, tmps, st, action});
		break;

	case "partizan":
		await st.popup(s, {
			text: "@hit_partizan:����� � ������� �������� ������� ��\
 ������� �� �������� ��������������� �������. ����� ���� ���������� ������\
 ������."
			});
		break;

	case "sec_turret":
		await st.popup(s, {
			text: "@hit_sec_turret:���� �������� ����� �������� ����� ���\
 ������� ����������� ��� � �����������, ����� ��� ������ ����� ��������������\
 ����� �������� � ������� ��� �������� �����."
			});
		break;

	case "nuke":
		await st.popup(s, {
			text: "@hit_nuke:�������� ��������� ������������ ���������\
 ��������� �� ������ ������."
			});
		gs.ach_delivery = true;
		break;
	}

	// proceed to gameover action if gs.f_gameover, or to hero respawn
	// otherwise
	if (gs.f_gameover) {
		hlsfxPlayMusic({ sfxId: "music_gameover" });
		await st.popup(s, {
			type: "iconTop",
			icon: "icon_hero_fail",
			header: "@game_over_header:��������",
			text: "@game_over_text:����� ������� ������� ����� ����� � ���\
 �������� ����������� � ��������� ����������� �����."
			});

		return {
			action: "gameOver"
		};
	} else {
		return {
			action: "ac.heroRespawn"
		};
	}
});

async function S_heroRespawn(s, {gs, tmps, st, animationId }) {
	if (gs.currentScreen == "sA0" && gs.f_otstrel_started) {
		// handle special case of getting under tank fire
		gs.local.heroAtTop = false;
		gs.local.heroAtBottom = false;
	}

	// if hit by pig (at the houses screen), then set the respawn point
	// for exclusion from one next tractor spawn
	var stHero = st.object("hero");
	stHero.hide();
	var pos = gs.local.heroRespawnPosition;
	if (gs.currentScreen == "sB3") {
		st.object("nv_pig_ctl_B3").setExclusionPoint(pos);
		// TODO: remove tractor (not actually necessary)
	}

	st.playParticle({
		particleId: "teleport_in",
		atPosition: pos
	});
	await st.waitTicks(s, 30);
	stHero.position = pos;
	stHero.playAnimation({
		animationId: animationId,
		atPosition: pos
	});
	await st.waitTicks(s, 30);
}

SCRIPT_ADD("*", "ac.heroRespawn",
async function heroRespawnAfterHit(s, {gs, tmps, st, action}) {
	await S_heroRespawn(s, { gs, tmps, st, animationId: "HeroStand" });
});

// delivery service menu helper
SCRIPT_ADD("*", "ac.dial",
async function deliveryMenu(s, {gs, tmps, st, action}) {
	// intro dialog
	///*
	if (!gs.f_delivery_intro) {
		gs.f_delivery_intro = true;
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@tlf_delivery_intro:������������! ������ �������������\
 �������� \"���������� ������ �����\". ���� �������?"
		});
	}
	//*/

	const {
		DELIVERY_COST_DELIVERY,
		DELIVERY_COST_CHECKPOINT
	} = GameConst;

	var items = new Array();
	if (!gs.it_balalaika) {
		items.push({
			text: "@tlf_order_balalaika:������ ��������� (100 \u20AE, ��e�.)",
			enabled: true,
			leftText: "@tlf_buy:������",
			leftResult: "buy_balalaika",
			selected: action.lastSelect == "buy_balalaika"
		});
	}
	items.push(
		{
			text: "@tlf_order_checkpoint:����������� ����� (" +
				DELIVERY_COST_CHECKPOINT + " \u20AE, �������.)",
			enabled: gs.tugriks_collected >= DELIVERY_COST_CHECKPOINT,
			leftText: "@tlf_buy:������",
			leftResult: "buy_checkpoint",
			selected: action.lastSelect == "buy_checkpoint"
		},
		{
			text: "@tlf_order_lost_found:�������� �������� (" +
				DELIVERY_COST_DELIVERY + " \u20AE, �������.)",
			enabled: gs.tugriks_collected >= DELIVERY_COST_DELIVERY,
			leftText: "@inv_buy:������",
			leftResult: "buy_delivery",
			selected: action.lastSelect == "buy_delivery"
		});
	if (!gs.it_hren) {
		items.push({
			text: "@tlf_order_free:���������� ������",
			enabled: true,
			leftText: "@inv_request:������",
			leftResult: "free_service",
			selected: action.lastSelect == "free_service"
		});
	}

	items.push(
		"hr",
		{
			text: "@tlf_order_none:�������� ������",
			enabled: true,
			leftText: "@tlf_order_none:�������� ������",
			leftResult: "exit",
			selected: !action.lastSelect
		}
	);

	var result = await st.menu(s, {
		title: "@tlf_what_order:��� ����� �������� �����?",
		items: items
	});

	switch (result) {
	case "buy_balalaika":
		if (gs.it_passport == "inv") {
			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:�����:",
				text: "@i_want_balalika_heres_passport:������������. �\
 ������� ��������� � ������, ��� ��� �������."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@you_did_right_buy_from_us:�������� �����! ���������,\
 ���� � �������� ������...| ������! ������� � ������� � ��������� ������� �\
 ������������� �����, � ������ ������ ����� ���������� � ������ ���������\
 ��������, ������ ��� �� ������� � ���."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m3",
				header: "@hero_says:�����:",
				text: "@wait_i_didnt_tell_number:�� � ��� �� ������ ���\
 �����..."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@dont_worry_we_searched_it:�� ����������, �� ���\
 ������� ��� �� ���� ����� ��������. ���� �� �������� ������� � �����. �� ���\
 �������� ������ �������!"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:�����:",
				text: "@what_if_i_dont_have_phone:� �����, � ���� �\
 ��������-�� ���?"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@now_you_have:������ �����. ����� ��� �� �����������,\
 �� ��������� �� ��� ������� ��������� ����� � ������ ��������� �� ��������\
 �������� ������ � ������ ��� ������� ������� �������. ��� ��, ����������,\
 ���� �������� � �����. ����� ��� �������� ����� ������ � ���������."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:�����:",
				text: "@is_the_courier_paid_as_well:������ �������, �������,\
 ���� �������� � �����?"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@why_courier:����� ��� � �������? �� �� ����������\
 ����� �������� �������� �����. ��� ��� �������� ���������. � �������� � �����\
 ������ ��������. ���� � ������������� ������� ������� �� � ��� ����, � ����\
 ������ ���� � ���� �����, ����� ����� ���������� � ���?"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e4_m5",
				header: "@hero_says:�����:",
				text: "@bad_luck_for_kreakl:(��, �� ������� ������-��\
 ���������� �������...) �������, � ��� ����� �������� ������!"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@thats_our_job:��� �������. ��� ���� ������ � ��������\
 ������."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@ah_here_is_balalaika:�� ��, � ��� ���� ���������."
			});

			await st.popup(s, {
				text: "@hero_got_balalaika:����, ��������� �����������\
 ������-�� ���������� �������, ����� ���� ����������� �������� ���������\
 ��������� ���������. ������ �� ��� ����������, �� ����� ��� ��� �����..."
			});

			if (gs.f_stalker_deal_open) {
				await st.popup(s, {
					text: "@or_does_he_know:...��� � ����� ��� ���� ����?"
				});
			}

			st.discardPickableItem({ gs, itemId: "it_passport",
				updateScene: false });
			st.takePickableItem({ gs, itemId: "it_balalaika",
				updateScene: false });
			tmps.inv_last_selected = "it_balalaika";
			return { action: "openInventory", forUse: true };

		} else if (gs.it_data == "inv") {
			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m5",
				header: "@hero_says:�����:",
				text: "@i_want_balalika_heres_data:������������. � ����� ��\
 ������ ��������� - ����������, � ������. ��� ��� ���������� ������."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@you_are_too_happy:���-�� �� ������ ��������� ���\
 ���������� � ��������� �������. �������-�� ���������?"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m3",
				header: "@hero_says:�����:",
				text: "@gadom_budu:����� ����!"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:������ ��������:",
				text: "@oh_yeah_show_it:��? � ��������-�� ��� � ���-������..."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e5_m4",
				header: "@hero_says:�����:",
				text: "@blin:����."
			});

			await st.popup(s, {
				text: "@data_didnt_work:������� �������� ������ ������� ������\
 ���������� �������� �� ���������. ��������� �����-�� ������� ������� �� �����\
 ������������ � ������������ �����."
			});
			return;

		} else {
			await st.popup(s, {
				type: "iconTop",
				icon: "icon_hero_e4_m2",
				text: "@tlf_no_credit:����� �� ��� ���������� ������, �� �����\
 ������, ��� ��� ���������� ������� ����������� ���������� ������� -\
 ����������, ������-������ ���������� ��������."
			});
			return {
				action: "ac.dial",
				lastSelect: "buy_balalaika",
				callOk: true
			};
		}

	case "buy_checkpoint":
		return {
			action: "ac.dialCheckpoint"
		};
		break;

	case "buy_delivery":
		return {
			action: "ac.dialLostItems"
		};
		break;

	case "free_service":
		return {
			action: "ac.dialFreeService"
		};
		break;

	case "exit":
		if (!action.callOk) {
			if (!gs.f_delivery_angry) {
				gs.f_delivery_angry = 0;
			}
			switch (gs.f_delivery_angry) {
			case 0:
				gs.f_delivery_angry = 1;
				await st.popup(s, {
					type: "iconRight",
					icon: "icon_delivery",
					header: "@tlf_delivery_says:������ ��������:",
					text: "@tlf_angry_1:��! ��� �� ������ ����-������\
 ���������� ��� ���? ��! ���� �������? ׸ �� �����?! ��!.."
				});
				break;

			case 1:
				gs.f_delivery_angry = 2;
				await st.popup(s, {
					type: "iconRight",
					icon: "icon_delivery",
					header: "@tlf_delivery_says:������ ��������:",
					text: "@tlf_angry_2:��� �� ���� ������� ������ � �����\
 ���������? �������, ������, ��? � ��� �� ������ �� �����! ���������� �����\
 � ���, �����, �� ����������! ��������� ������!"
				});
				await st.popup(s, {
					type: "iconLeft",
					icon: "icon_hero_e4_m5",
					header: "@hero_says:�����:",
					text: "@tlf_angry_hero_comment:� � ����������� ��� ��\
 ��. �����-�� ��� �������."
				});
				break;

			case 2:
				gs.f_delivery_angry = 3;
				await st.popup(s, {
					type: "iconRight",
					icon: "icon_delivery",
					header: "@tlf_delivery_says:������ ��������:",
					text: "@tlf_angry_3:�� ��, ��� ���������! �� ��� ��� ����\
 �����, ���? ������ ����������? ������ ������ ������? ��� �� �� ���� ���\
 �������, ��� �� ����� ������� �������! �� ��������� ������, ��� ������\
 � ���� �� ����� ������! ��� ���� ����� � ������ ��������!"
				});
				break;

			case 3:
				gs.f_delivery_angry = 4;
				await st.popup(s, {
					text: "..."
				});
				return {
					action: "cs.deliveryRevenge"
				};
			}
		}
	}
});

async function S_deductAndRecycleTugriks(s, { gs, tmps, st, value }) {
	st.setTugrikCount({
		gs: gs,
		value: st.getTugrikCount({gs}) - value
	});

	// get locations of already picked tugriks
	// (the map design assumes they are all off screens with tlf. booths)
	var tugrikFreeLocations = new Array();
	for (var i = 0; i < 20; i++) {
		if (gs["tugrik_" + (i + 1)]) {
			tugrikFreeLocations.push("tugrik_" + (i + 1));
		}
	}

	// shuffle locations
	for (var i = 0; i < tugrikFreeLocations.length; i++) {
		var n = Math.floor(Math.random() * tugrikFreeLocations.length);
		var t = tugrikFreeLocations[n];
		tugrikFreeLocations[n] = tugrikFreeLocations[0];
		tugrikFreeLocations[0] = t;
	}

	// respawn the tugrik at the random location (by deleting its pick mark
	// from the game state)
	for (var i = 0; i < value && i < tugrikFreeLocations.length; i++) {
		delete gs[tugrikFreeLocations[i]];
	}

	if (!gs.f_toad_intro) {
		gs.f_toad_intro = true;
		await st.popup(s, {
			type: "iconTop",
			icon: "icon_toad",
			text: "@tlf_toad:����� ������ ���� ������� �� ������������ ������,\
 �� �� ���������� ���� ����������� ��������. ����� ������, ����� ����.\
 ��� ������, ��� � ������. ������������� ��� ��� �� ������, ��� ��� �������\
 �������� ����� - �������, �������� � ����� ������ �����������.\n\
 ��� �������� ������. ��� �����������.\n\
 �� ���� ������. ���� �� ����� ������."
		});
	}
}

SCRIPT_ADD(["sC2", "sC4"], "ac.dialCheckpoint",
async function deliveryCheckpoint(s, {gs, tmps, st, action}) {
	await S_deductAndRecycleTugriks(s, { gs, tmps, st,
		value: GameConst.DELIVERY_COST_CHECKPOINT });
	st.saveCheckpoint();

	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.popup(s, {
		text: "@tlf_delivery_checkpoint:���, ����� ����� ����������� �����!\
 ������, ���� �������� ����������, ��� �� ������� ������������ � ����� ������\
 ����."
	});
});

SCRIPT_ADD(["sC2", "sC4"], "ac.dialLostItems",
async function deliveryLostItems(s, {gs, tmps, st, action}) {
	const { DELIVERY_COST_DELIVERY } = GameConst;
	var lostItemsRect = tmps.loc_lostitems.rect;
	var { xt: xt1, yt: yt1 } = st.screenPosToTilePos({
			x: lostItemsRect.x,
			y: lostItemsRect.y
		}),
		{ xt: xt2, yt: yt2 } = st.screenPosToTilePos({
			x: lostItemsRect.x + lostItemsRect.width - 1,
			y: lostItemsRect.y + lostItemsRect.height - 1
		});

	var freeSpots = {};
	for (var x = xt1; x <= xt2; x++) {
		for (var y = yt1; y <= yt2; y++) {
			freeSpots[x + "," + y] = { x: x, y: y };
		}
	}

	var itemsToDeliver = new Array();
	for (var itemId in ResInventoryItems) {
		var gsItem = gs[itemId];
		if (!gsItem || gsItem == "inv" || gsItem == "discarded") {
			continue;
		} else if (gsItem.screen == gs.currentScreen) {
			// item is on the screen, so can not be delivered,
			// but can occupy the delivery pad
			delete freeSpots[gsItem.xt + "," + gsItem.yt];
		} else {
			// item is eligible for delivery
			itemsToDeliver.push(itemId);
		}
	}

	if (Object.keys(freeSpots).length <= 0) {
		await st.popup(s, {
			text: "@tlf_delivery_cluttered:�������� ��� �������� ���������\
 ��������. ����������, ���������� �������� � �������� ����� ��������������\
 ������� �������."
		});
		return {
			action: "ac.dial",
			callOk: true
		};
	} else if (itemsToDeliver <= 0) {
		await st.popup(s, {
			text: "@tlf_delivery_nothing:�� ������ ������ ��������������\
 ��������� �� �������. �����������, ����� ��������� ���-������."
		});
		return {
			action: "ac.dial",
			callOk: true
		};
	} else {
		// offer delivery options
		var items = new Array();
		for (var itemId of itemsToDeliver) {
			items.push({
				text: ResInventoryItems[itemId].name + " (" +
					DELIVERY_COST_DELIVERY + " \u20AE)",
				enabled: true,
				leftText: "@inv_deliver:���������",
				leftResult: itemId,
				selected: items.length == 0
			});
		}

		items.push(
			"hr",
			{
				text: "@inv_do_nothing:��� �����",
				enabled: true,
				leftText: "@tlf_deliver_none:�� ����������",
				leftResult: "exit"
			}
		);

		var result = await st.menu(s, {
			title: "@tlf_what_deliver:��� ����� ��������� �����?",
			items: items,
			maxOnScreen: 8
		});

		if (result != "exit") {
			await S_deductAndRecycleTugriks(s, { gs, tmps, st,
				value: DELIVERY_COST_DELIVERY });

			var stHero = st.object("hero");
			stHero.playAnimation({
				animationId: "HeroStandDown",
				atPosition: stHero.position
			});
			var spot = freeSpots[Object.keys(freeSpots)[0]];
			st.playParticle({
				particleId: "teleport_in",
				atPosition: st.tilePosToScreenPos({
					xt: spot.x,
					yt: spot.y
				})
			});
			await st.waitTicks(s, 30);
			st.placePickableItem({
				gs: gs,
				itemId: result,
				screen: gs.currentScreen,
				atTile: { xt: spot.x, yt: spot.y }
			});
			await st.waitTicks(s, 60);

			if (st.getTugrikCount({gs}) >= DELIVERY_COST_DELIVERY) {
				return {
					action: "ac.dialLostItems"
				};
			} else {
				await st.popup(s, {
					text: "@tlf_delivery_no_money:���������� �������� ����\
 ���������, �� � ����� ����������� �����."
				});
				return;
			}
		}
	}

	return {
		action: "ac.dial",
		lastSelect: "buy_delivery",
		callOk: true
	};
});

SCRIPT_ADD(["sC2", "sC4"], "ac.dialFreeService",
async function deliveryDialFreeService(s, {gs, tmps, st, action}) {
	if (gs.it_turban != "inv") {
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:�����:",
			text: "@do_you_have_any_free_service:� � ��� ���� ���-������\
 ����������? �����-������� ���, �����-��������� ��� ������..."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@only_hren_do_you_have_panama:��������� ����� ����������\
 ������ ���� � �������. � ��� ���� �������?"
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e4_m3",
			header: "@hero_says:�����:",
			text: "@eh_no:�-�... ����."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@any_other_headdress:��, ���� �� �����-������ ������\
 �������� ����?"
		});
		
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e5_m3",
			header: "@hero_says:�����:",
			text: "@eh_no:��-�... ���� ��������."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@sorry_then:��, ����� ��������."
		});

		await st.popup(s, {
			type: "iconTop",
			icon: "icon_hero_e5_m4",
			text: "@who_could_think_no_cap:��� �� ��� ��������, ��� ���������\
 ������ ������ �������� ����� �������� ������, ��� ���������� �����?"
		});
	} else {
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:�����:",
			text: "@do_you_have_any_free_service:� � ��� ���� ���-������\
 ����������? �����-������� ���, �����-��������� ��� ������..."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@only_hren_do_you_have_panama:��������� ����� ����������\
 ������ ���� � �������. � ��� ���� �������?"
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:�����:",
			text: "@no_panama_but_this:������� ���, �� ���� ��� �����...\
 �-�-�... �����."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:������ ��������:",
			text: "@will_do_place_it:�����. ������������...|\
\n������. ������� �� ������� � ����� �������!"
		});

		await st.popup(s, {
			text: "@as_the_proberb_says:��� ������� ��������� ���������, ��\
 ������ ����� �������. ������� �����, ��-�, ����-�� �����... � �������,\
 ������ ����� ��������� ������ �� �������, ������� ����������� ����� ���� ���\
 ����� �������."
		});

		st.discardPickableItem({ gs, itemId: "it_turban",
			updateScene: false });
		st.takePickableItem({ gs, itemId: "it_hren",
			updateScene: false });
		tmps.inv_last_selected = "it_hren";
		return { action: "openInventory", forUse: true };
	}
});

SCRIPT_ADD("*", "cs.deliveryRevenge",
async function deliveryRevenge(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero"),
		pos = stHero.position;
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: pos
	});
	await st.waitTicks(s, 45);

	// lazer pritzel at hero
	var posFrom = { x: pos.x, y: pos.y + 128 },
		posTo = { x: pos.x, y: pos.y - 8 };
	await S_animateAndMove(s, {
		st,
		entId: "@lazer",
		fromPosition: posFrom,
		animMove: "ParticleLazer",
		ticks: 30,
		toPosition: posTo,
		animTo: "ParticleLazerLocked",
		moveAnimationId: "MoveOverTicks"
	});

	await st.waitTicks(s, 90);
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: pos
	});
	await st.waitTicks(s, 60);
	// hide lazer
	st.object("@lazer").playAnimation({
		animationId: "-",
		atPosition: pos
	});
	return {
		action: "ac.heroHit",
		cause: "nuke",
		atPosition: pos
	};
});

SCRIPT_ADD(["sB2", "sC2", "sD2", "sD1"], "daemon",
async function trainPlaySignal(s, {gs, tmps, st, action}) {
	for (;;) {
		await s.anyOf(st.entScreenSink.event("trainIncoming"));
		hlsfxPlaySFX({ sfxId: "train_beep" });
	}
});

SCRIPT_ADD(["sD0"], "daemon",
async function trainPlayBoom(s, {gs, tmps, st, action}) {
	for (;;) {
		await s.anyOf(st.entScreenSink.event("trainIncoming"));
		hlsfxPlaySFX({ sfxId: "explosion" });
		st.playScreenFX({
			type: "shaker",
			x: 0,
			y: 4,
			duration: 30
		});
	}
});

// no dropping MK152 anywhere
SCRIPT_ADD("*", "onDrop",
async function checkNoDropMK152(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_mk152") {
		// returning non-null also prevents the drop
		return { action: "cs.noDropMK152" };
	}
});

SCRIPT_ADD("*", "cs.noDropMK152",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_mk152:�������, �� ���������� ��������. ��-152� ���\
 ��������� � ���� �����. � ������, ������. � ������, ����������� �������.\
 ��� �� �� ��������, � �������� ��� ������ � �������� - �� ������?"
	});
});

// no items drop in unappropriate locations
SCRIPT_ADD("*", "onDrop",
async function checkGeneralNoDrop(s, {gs, tmps, st, action}) {
	var point = action.at;
	if (st.isInCollisionZoneWithFlags({
			point: action.at,
			offerFlags: { rails: true }
		})) {
		return { action: "cs.noDropOnRails" };
	}

	if (st.isInCollisionZoneWithFlags({
			point: action.at,
			offerFlags: { partizan: true }
		})) {
		return { action: "cs.noDropPartizan" };
	}

	if (!gs.f_pig_off && st.isInCollisionZoneWithFlags({
			point: action.at,
			offerFlags: { tractor: true }
		})) {
		return { action: "cs.noDropTractor" };
	}

	if (!gs.f_sortir_off && st.isInCollisionZoneWithFlags({
			point: action.at,
			offerFlags: { obstrel: true }
		})) {
		return { action: "cs.noDropObstrel" };
	}
});

SCRIPT_ADD("*", "cs.noDropOnRails",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_on_rails:������� �������� �� ������ ����\
 ��������. ��� ����, ��� �������, ���������. ����� �� ��� �����������\
 ���������� ���������, � �� ��������."
	});
});

SCRIPT_ADD("*", "cs.noDropPartizan",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_partizan:���� ��������� ��������� ����\
 ����� � �����, ������� �����������, ������ � �������, ��� �� �������������\
 ���-������ ��� ����� ������������ ������������ ����."
	});
});

SCRIPT_ADD("*", "cs.noDropTractor",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_tractor:������ �������� ����� ��� �����\
 ���������� �������� c ������ ������� �� ����? ��, ������ ��... ���."
	});
});

SCRIPT_ADD("*", "cs.noDropObstrel",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_obstrel:��������� ���� ��� �������� ���������,\
 ���� ����� �� ���� ������� �������? ��� �����, ��� �������."
	});
});

// drop torchlight for 1st time
SCRIPT_ADD("*", "onDrop",
async function torchlightDrop(s, {gs, tmps, st, action}) {
	if (gs.currentScreen != "sA2" && action.itemId == "it_torchlight"
		&& !gs.f_torchlight_dropped) {
		gs.f_torchlight_dropped = true;
		await st.popup(s, {
			text: "@popup_drop_torchlight:���������� �� ����������� ���������\
 ������ ������ ��������� �� ��������� ����� - ������ ����� �� �������� ��\
 ���������. � ������������� �����������, ���� ��-152�, ����� �����, ���, ��\
 ����������."
		});
		// do not return anything, as we're not preventing the drop
	}
});

// no dropping MK152 anywhere
SCRIPT_ADD("*", "onDrop",
async function checkNoDropData(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_data") {
		// returning non-null also prevents the drop
		return { action: "cs.dataDropped" };
	}
});

SCRIPT_ADD("*", "cs.dataDropped",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_didnt_know_physics:����� ����� ���� ������ � �� ����, ���\
 ���������� �������������. ���� ���������� ��� ������������� ��������, ������,\
 �� ������ ����������� �������� ����������, ��� �� ��������� ������������."
	});

	st.discardPickableItem({
		gs,
		itemId: "it_data",
		updateScene: false,
		unenable: true
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@fuck_ok_need_new_data:�� ��������. ������� ���� ������ �����."
	});
});


// this script creates revealer subscript that exists during this screen,
// and can be used to run revealer sequence possibly aborting the previous one
SCRIPT_ADD(["sA1", "sA0", "sB0", "sC0", "sC1", "sD1"], "daemon",
async function specPlaceRevealerCtl(s, {gs, tmps, st, action}) {
	var scrRevealer = tmps.scrSpecPlaceRevealer = s.fork();
	tmps.specPlaceRevealed = false;
	try {
		for (;;) {
			s.checkLeave();
			await st.waitTicks(s, 30);
		}
	} finally {
		if (tmps.scrSpecPlaceRevealer == scrRevealer) {
			tmps.scrSpecPlaceRevealer = null;
		}
		scrRevealer.dispose();
	}
});

SCRIPT_ADD(["sA1", "sA0", "sB0", "sC0", "sC1", "sD1"], "preControl",
async function revealSpecPlace(s, {gs, tmps, st, action}) {
	var revealedNow = gs.it_detector == "inv";
	if (revealedNow != tmps.specPlaceRevealed && tmps.scrSpecPlaceRevealer) {
		tmps.specPlaceRevealed = revealedNow;
		tmps.scrSpecPlaceRevealer.run(async function(s) {
			if (!revealedNow) {
				st.updateSceneToGameState({
					tilesOnly: true,
					refreshHotspots: true
				});
			}
			st.playParticle({
				particleId: revealedNow ? "teleport_in" : "teleport_out",
				atPosition: st.object("hs_" + tmps.specPlaceIdToShow).position,
			});
			await st.waitTicks(s, 30);
			s.checkLeave();
			// refresh again to catch up the spec place doodad status
			st.updateSceneToGameState({
				refreshHotspots: true
			});
		});
	}
});

SCRIPT_ADD(["sA1", "sA0", "sB0", "sC0", "sC1", "sD1", "sD0"], "cs.detectMedved",
async function detectMedved(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero"),
		pos = stHero.position;
	hlsfxPlaySFX({ sfxId: "detector" });
	stHero.playAnimation({
		animationId: "HeroMK152",
		atPosition: pos
	});

	tmps.detectInProgress = true;
	tmps.detectStep = 0;

	for (var i = 0; i <= 24; i++) {
		s.checkLeave();
		await st.waitTicks(s, 10);
		hlsfxBeep({ frequency: 600 + 24 * i, ticks: 2 });
		if (!(i & 1)) {
			tmps.detectStep = i >> 1;
			st.updateSceneToGameState({});
		}
	}

	if (tmps.medvedFlagToSet) {
		gs[tmps.medvedFlagToSet] = true;
	}

	if (gs.currentScreen != "sA1") {
		await s.anyOf(stHero.playAnimation({
			animationId: "HeroPuzzled",
			atPosition: pos
		}));
	} else {
		stHero.playAnimation({
			animationId: "HeroStandUp",
			atPosition: pos
		})
		await st.waitTicks(s, 60);
	}

	return { action: "cs.medvedDetected" };
});

SCRIPT_ADD("*", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_scanner" &&
		action.hotspotId.startsWith("hs_specplace_")) {
		if (!tmps.medvedFlagRequired || gs[tmps.medvedFlagRequired]) {
			return { action: "cs.detectMedved" };
		} else {
			await st.popup(s, {
				text: "@popup_no_medved_tracks:���������� � �������������\
 ���������� ���������:\
\n1. ������ �� ������ �����.\
\n2. ������� ������ � ������� ��������������� ��������� ��� ������������\
 ������.\
\n� ������ ������ ������� �� ����, � ��� ��������������� �����������\
 � ������ ������� ����� ���� �� ����."
			});

			if (gs.currentScreen == "sA1") {
				await st.popup(s, {
				text: "@popup_not_this_medved:(�������, ����������\
 ������� ������, � ���� �� ��� - �� ���� ��� ������ �� ������� � ��\
 ���������.)"
				});
	 		}

			return { action: "cs.needToTryNearby" };
		}
	}
});

SCRIPT_ADD("*", "cs.needToTryNearby",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e4_m2",
				header: "@hero_says:�����:",
				text: "@need_to_try_nearby:���� ����������� �� ��������\
 �������."
	});
});

//
// sA0 (border)
//

SCRIPT_ADD("sA0", "preControl",
async function determineRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;

		var stHero = st.object("hero");
		if (st.isInLocation({
			point: stHero.position,
			locId: "tr_A0_B0_top"
		})) {
			gs.local.heroRespawnPosition =
				st.object("loc_hero_respawn_A0top").position;
			gs.local.heroAtTop = true;
		} else if (st.isInLocation({
			point: stHero.position,
			locId: "tr_A0_B0_btm"
		})) {
			gs.local.heroRespawnPosition =
				st.object("loc_hero_respawn_A0btm").position;
			gs.local.heroAtBottom = true;
		}
		
		if (gs.f_otstrel_started) {
			gs.local.heroRespawnPosition =
				st.object("loc_hero_respawn_A0btm").position;
		}
	}
});

SCRIPT_ADD("sA0", "daemon",
async function retreatFromBorder(s, {gs, tmps, st}) {
	for (;;) {
		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_border" })) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.retreat"
			});
		}
	}
});

SCRIPT_ADD("sA0", "cs.retreat",
async function(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero");
	var retreatPos = {
		x: st.object("loc_border_retreat").position.x,
		y: stHero.position.y
	};

	hlsfxPlaySFX({ sfxId: "beep-beep-2" });
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_mk152",
		header: "@mk152_says:��-152�:",
		text: "@mk152_beep:���, ���, ���-���-���..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@got_it_no_abroad:�����, �� ������� �� ������."
	});

	await s.anyOf(stHero.playAnimation({
		animationId: "HeroWalkRight",
		moveAnimationId: "MoveAtRate",
		parameters: {
			RATE: GameConst.HERO_STEP_SIZE
		},
		moveTickEvent: "step",
		moveFrom: stHero.position,
		moveTo: retreatPos
	}));
});

// otstrel initiation
SCRIPT_ADD("sA0", "preControl",
async function(s, {gs, tmps, st, action}) {
	if (gs.f_sortir_blocked && !gs.f_sortir_off && !gs.f_otstrel_started) {
		return { action: "cs.startOtstrel" };
	}
});

SCRIPT_ADD("sA0", "cs.startOtstrel",
async function(s, {gs, tmps, st, action}) {
	gs.f_otstrel_started = true;
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@right_through_the_walls:�, ������, ����� ������ �����, �\
 �����, ������, �������, ��? ����, �� ���� �������� �� ������? ����-��������,\
 ��� � ����!.."
	});
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@are_you_kidding_assholes:��� ���� �� �� ������� �������? ��\
 ���, �������, ��������?!"
	});
	hlsfxPlayMusic({ sfxId: "music_3" });

	// add kreakls as targets
	for (var i = 0; i < 4; i++) {
		st.object("tank_turret").addTarget("@kreakl_" + i);
	}
	st.object("tank_turret").fireEnabled = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_A0btm").position;
	return { action: "ac.assignTargets" };
});

SCRIPT_ADD("sA0", "ac.assignTargets",
async function assignTargets(s, {gs, tmps, st, action}) {
	// add hero as target if he is either at top or otstrel is not started
	if (tmps.heroAtTop || !gs.f_otstrel_started) {
		st.object("tank_turret").addTarget("loc_hero_hitbox");
	} else {
		st.object("tank_turret").deleteTarget("loc_hero_hitbox");
	}

	// if otstrel is started, add kreakls
	if (gs.f_otstrel_started) {
		for (var i = 0; i < 4; i++) {
			st.object("tank_turret").addTarget("@kreakl_" + i);
		}

		st.object("tank_turret").fireEnabled = true;
	} else {
		for (var i = 0; i < 4; i++) {
			st.object("tank_turret").deleteTarget("@kreakl_" + i);
		}

		st.object("tank_turret").fireEnabled = false;
	}
});

SCRIPT_ADD("sA0", "preControl",
async function (s, {gs, tmps, st, action}) {
	if (!gs.f_sortir_off) {
		if (!gs.f_sortir_blocked && !gs.f_hey_shit) {
			return { action: "cs.heyShit" };
		} else {
			return { action: "ac.assignTargets" };
		}
	}
});

SCRIPT_ADD ("sA0", "daemon",
async function enableFireAtHero(s, {gs, tmps, st, action}) {
	if (!gs.f_otstrel_started && !gs.f_sortir_off) {
		for (;;) {
			s.checkLeave();
			var [ evtMaybeHeroEnterFireArea, evtFireJustAsIs ] = await s.anyOf(
				st.entScreenSink.event("collisionEnter"),
				st.entScreenSink.event("ge.debilFire"));

			// when hero enters obstrel zone, enable the tank fire
			// (it will automatically reset after hero
			// is hit, so don't bother that right here)
			if (evtMaybeHeroEnterFireArea &&
				st.isCollision({
					collEvent: evtMaybeHeroEnterFireArea,
					locId: "loc_hero_pinpoint",
					withLocId: "loc_border_obstrel"
				})) {
				st.object("tank_turret").fireEnabled = true;
			}

			// or when explicit fire is triggered
			if (evtFireJustAsIs) {
				tmps.isDebil = true;
				st.object("tank_turret").fireEnabled = true;
			}
		}
	}
});

SCRIPT_ADD("sA0", "daemon",
async function enableDrain(s, {gs, tmps, st}) {
	if (!gs.f_tank_drain_enabled) {
		// wait until 4 kreakls are hit
		await s.anyOf(st.entScreenSink.event("4kreaklsHit"));

		// reveal the drain spot
		st.playParticle({
			particleId: "teleport_in",
			atPosition: st.object("hs_tank_drain").position
		});
		await st.waitTicks(s, 30);
		gs.f_tank_drain_enabled = true;
		st.updateSceneToGameState({
			refreshHotspots: true
		});
	}
});

SCRIPT_ADD("sA0", "cs.heyShit",
async function heyShit(s, {gs, tmps, st, action}) {
	gs.f_hey_shit = true;
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@hey_shit_cant_you_read:��, �����! ������ �� ������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@no_and_what:���. � ��?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@border_locked_heres_what:������� �� �����, ��� ��. ����������\
 ��������������� ��� ��������������! ����? ���, ���, �������� ���������� ���\
 ��������� ������ ������. �����, ����� ������!"
	});

	return { action: "ac.assignTargets" };
});

SCRIPT_ADD("sA0", "cs.debilEnable",
async function (s, {gs, tmps, st, action}) {
	gs.f_debil_enabled = true;
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m2",
		header: "@hero_says:�����:",
		text: "@no_and_what:\"���-���� �� �����. �� ���� ������ ����� �����.\
 ���-����� �� ����� ��� �����-���-������.\""
	});
	st.entScreenSink.postEvent("ge.debilFire", {});
});

SCRIPT_ADD("sA0", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sA0";
	tmps.medvedFlagToSet = "f_medved_detected_sA0";
	tmps.medvedFlagRequired = "f_medved_detected_sB0";
});

SCRIPT_ADD("sA0", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_flee_bad:�������, ������������ ���������� ���� �\
 ������� � �����, ����������� �� �� �� ������������ ������������ �����,\
 ���������� ��� �� �������� �����. ����� �� ������� ����������, ����� ��\
 ������, ��� ����������� ������ ������������..."
	});
});

SCRIPT_ADD("sA0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_tank_drained &&
		action.itemId == "it_bottle" &&
		action.hotspotId == "hs_tank_drain") {
		return { action: "cs.tankNotDrain" };
	}
});

SCRIPT_ADD("sA0", "cs.tankNotDrain",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@no_drain_with_bottle:���, ��, �������, ������������, ��� ����\
 ���� �����, ��... ������ �� �������� �������� � �������� ��������� �����-��\
 ������ �� ������������ ����������. �� � �����, ������ ����������\
 �������������� ������������� ��� ����� ���������� �� ������� ����������..."
	});
});

SCRIPT_ADD("sA0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_tank_drained &&
		action.itemId == "it_tank" &&
		action.hotspotId == "hs_tank_drain") {
		return { action: "cs.tankDrain" };
	}
});

SCRIPT_ADD("sA0", "cs.tankDrain",
async function(s, {gs, tmps, st, action}) {
	gs.f_tank_drained = true;
	await st.popup(s, {
		text: "@hero_drained_tank:��������� ���������� �������� �� ������\
 ������, ����� ����������� ��������� ������� �� ��������� ���� � ����������\
 ����� ��������."
	});
	st.discardPickableItem({ gs, itemId: "it_tank", updateScene: false });
	st.takePickableItem({ gs, itemId: "it_tank_full", updateScene: true });
	tmps.inv_last_selected = "it_tank_full";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sA0", "daemon",
async function hlebaloCheck(s, {gs, tmps, st}) {
	for (; !gs.f_hlebalo;) {
		var [ collExit, collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionExit"),
			st.entScreenSink.event("collisionEnter"));
		if (collEnter &&
			collEnter.z1.id == "loc_hero_pinpoint" &&
			collEnter.z2.id == "loc_hlebalo") {
		}
		if (collExit &&
			collExit.z1.id == "loc_hero_pinpoint" &&
			collExit.z2.id == "loc_hlebalo") {
		}
		if (collEnter && gs.f_tank_drained &&
			st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_hlebalo" })) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.hlebalo"
			});
			break;
		}
	}
});

SCRIPT_ADD("sA0", "cs.hlebalo",
async function hlebaloTrigger(s, {gs, tmps, st}) {
	gs.f_hlebalo = true;

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@ah_square_hlebalo:���, ������� ����������! �� ��, ������\
 ����! ���, ��� ��� ������ � ������������ �����������, ��� ����� ���� �\
 ������. ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m5",
		header: "@hero_says:�����:",
		text: "@will_you_catch_up:� ��������, ������-��?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@uh_i_ll_get_ya:���... ��, ��������� �� ��� ������ ������\
 �����, �����-�!.. ��, ���������-�!.."
	});
});

SCRIPT_ADD("sA0", "preControl",
async function(s, {gs, tmps, st}) {
	if (gs.f_sortir_off && !gs.f_tank_gone_intro) {
		return { action: "cs.tankGone" };
	}
});

SCRIPT_ADD("sA0", "cs.tankGone",
async function(s, {gs, tmps, st}) {
	gs.f_tank_gone_intro = true;
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@popup_tank_gone:���! ������������ � ���������, ������� �����\
 � ����������� �����������, ����������������� �� ������� ��������� ������, ���\
 ��������� ������ �������� ��� �������������������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:�����:",
		text: "@where_did_he_go:�� ���� �� ����� ������? �������, ���� ������\
 ������ � ������������... ������ �� ���� ����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m2",
		header: "@hero_says:�����:",
		text: "@how_he_got_turret:���������, ��� �� �����-�� ���? �� �� ����\
 �� ��������?.."
	});
});

//
// sA1 (southwest bank)
//

SCRIPT_ADD("sA1", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sA1";
	tmps.medvedFlagToSet = "f_medved_detected_sA1";
	tmps.medvedFlagRequired = "f_medved_detected_sA0";
});

SCRIPT_ADD("sA1", "cs.pokeMedved",
async function pokeMedved(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_no_life_sign:�������, �������� �� �������, ������ ��\
 ������� ��������� �����. ��� ������������ � ��������, � �����������.\
\n��������� ����� ������� �����, ������, ����������� � ������ �������������\
 ����� � �������� ������ �� ���������..."
	});
	gs.it_turban_enabled = true;
});

SCRIPT_ADD("sA1", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_end:����, ������� ������� � ��� ��� ����� ����������,\
 ������������ �� �������� ���������������. ��� ��������� ������ ����������.\
 � �������, ����������� ����� ������� ����� �� ��� �� ���� - ����� ����\
 ������������ ������, ������� �������� ���� �������� � �����. � ��,\
 ��� �� ���� � ������� ������� ����� ������ �� ��������, � ����, ����� ����\
 ������ �� ����������..."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_detector" });
	st.discardPickableItem({ gs: gs, itemId: "it_scanner" });
});

SCRIPT_ADD("sA1", "cs.extractIron",
async function extractIron(s, {gs, tmps, st}) {
	hlsfxPlaySFX({ sfxId: "chpok" });
	await st.popup(s, {
		text: "@iron_extracted:����, ������������� ����������� ������������ �\
 ���� � ������ ������� ������� � ���������, ������������ � - ����� �������� -\
 ���������� ����� ������������ ��������. �� ������� ������ ���� �������\
 �����������. ����� ����������, �������������� � ��������, � ������ �����\
 �������� ��������� �� ��������� - � �� �����, ��� ���������, ��������� ��\
 ��������, ������ ���-�� �� ���������, ����� ����������� �� ������������.\
 ������� � �������� �� ������� ������ �������� �������� ��������� �� ���������\
 ������������."
	});
	gs.it_iron_1_enabled = true;
});


//
// sA2 (manager mansion inside)
//

SCRIPT_ADD("sA2", "daemon",
async function playBoo(s, {gs, tmps, st}) {
	if (!gs.f_boo) {
		gs.f_boo = true;
		hlsfxPlaySFX({ sfxId: "boo" });
	}
});

SCRIPT_ADD("sA2", "onDrop",
async function checkNoDropLightOrWeapon(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_torchlight" ||
		action.itemId == "it_pistol" ||
		action.itemId == "it_pistol_scotch" ||
		action.itemId == "it_pistol_torchlight") {
		// returning non-null also prevents the drop
		return { action: "cs.noDropLightOrWeapon" };
	}
});

SCRIPT_ADD("sA2", "cs.noDropLightOrWeapon",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_keep_light_weapon:� ���� ����� � ������� ����� ��\
 ��������� ��������� �� ��� ������ � ������������� ��������."
	});
});

SCRIPT_ADD("sA2", "daemon",
async function smthIsWrong(s, {gs, tmps, st}) {
	var maxItems = gs.f_backpack_collected ?
		GameConst.INVENTORY_SIZE_EXPANDED :
		GameConst.INVENTORY_SIZE_DEFAULT;
	if (gs.f_backpack_collected) return;

	for (; !gs.f_smth_is_wrong;) {
		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_smth_is_wrong" })) {
			gs.f_smth_is_wrong = true;
			if (gs.inventory.length >= maxItems) {
				st.entScreenSink.postEvent("gameAction", {
					action: "cs.somethingIsWrong"
				});
			}
		}
	}
});

SCRIPT_ADD("sA2", "cs.somethingIsWrong",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@popup_hero_inside_but_smth_is_wrong:����, ����� ������ �\
 ������ ����������������� ������������. �� ��� �� ��������� ��������, �����\
 ���-�� �� ���. �������������� ���� ����� � ������ ����� ��������? ��� ���-��\
 �� ��� � ���������?.. �, ����� - �� �� ��� ��������� ����� ����������,\
 ������� ����� ������ ���� ��������. ��, ��� ����� ��� ������� � �����\
 �������� - �������� �� ���������� �� ������� ������� ��������� �������.\n\
 �������� ������������ ��������� ��� ��������� ���-�� ������, � ���������,\
 ���� �� ��������� ����������."
	});
});

SCRIPT_ADD("sA2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_mk152" &&
		action.hotspotId == "hs_mansion_comp") {
		if (!gs.f_printer_enabled) {
			return { action: "cs.enablePrinter" };
		} else if (!gs.f_printer_ready) {
			return { action: "cs.printerNotReady" };
		} else if (!gs.it_project_enabled) {
			return { action: "cs.printProject" };
		}
	}
});

SCRIPT_ADD("sA2", "cs.enablePrinter",
async function(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_comp:��-152�, ��� ������, ������ ��������\
 ���������� �������������� ������� � ��������������."
	});
	await st.popup(s, {
		text: "@popup_files:� ���������������� ����� ��������� ����� ������,\
 ����� ������� ���� ������ ������� � �������� �������� �������������. ����\
 �����, � ������������� ���� ��� ��������� �� ��������? �� �������, �����\
 ��� ��� ������ �������. ��, � ���������, �� ������� � ������..."
	});

	gs.f_printer_enabled = true;
});

SCRIPT_ADD("sA2", "cs.printerNotReady",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_not_ready:���������� ������������ �\
 ����������������� ����� ���������� ������ �����������. �� ������� ��� �� ���\
 ���������� �����������..."
	});
});

SCRIPT_ADD("sA2", "cs.printProject",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_printed:����� ��� �������, � �������,\
 ������������ ���� �����������, � ��������� �������� �������� �������,\
 ��� ���������� ����������. ������ ������� ������������ ���� �������\
 ������������ ������..."
	});

	gs.it_project_enabled = true;

	await st.popup(s, {
		title: "@hex_project:������ ��������������� �������",
		text: "@tex_project:� ������������� ���� �������� �� ����������\
 ���� ������� � ������������: ��� ��� ������ ��������������� �������.\
 ���������������� ������������ ��������� ��������� �������������� � �����\
 ���������� �����, � ���������� ������, �� ����� ������� ������. ������\
 ��� ����������� ���������� � ����������� � ����������. ����� ��� ������\
 ������� ��������� �� ���������� �4...\
\n������������, ��-��������, ��� �� ��� ��� ������ ������ ������������� -\
 ������������� �������� �������������, ��������� �� ���������� ��� ������."
 	});
});

SCRIPT_ADD("sA2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_tank_full" &&
		action.hotspotId == "hs_mansion_printer_fuel") {
		return { action: "cs.fuelPrinter" };
	}

	if (action.itemId == "it_paper" &&
		action.hotspotId == "hs_mansion_printer_fuel") {
		return { action: "cs.paperPrinterTooEarly" };
	}
});

SCRIPT_ADD("sA2", "cs.fuelPrinter",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_fueled:����� ����� ������� � ��� ��������,\
 ������� �� �����, � �������, �������������, � ����������� �������,\
 ������������� ������� � ��������� ����. ������� �� ��������, �� �����\
 ����������� ��������� ���� �� ����, ��� ������� ������ ����������� �\
 ������������ ����������, � �� �������� ������������ ������� ������\
 �������� ����������� �����������."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_tank_full" });
	gs.f_printer_fueled = true;
});

SCRIPT_ADD("sA2", "cs.paperPrinterTooEarly",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_paper_too_early:������ � ���������� ������� �����\
 ���������� �� ��� ����, ��� ��� ������������ ������ ��������-��������� ��\
 �������� �� ������, � �� ���� ����, ���� � �� ����� �������� ������..."
	});
});


SCRIPT_ADD("sA2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_paper" &&
		action.hotspotId == "hs_mansion_printer_paper") {
		return { action: "cs.paperPrinter" };
	}
});

SCRIPT_ADD("sA2", "cs.paperPrinter",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_papered:����� �������� ����� � �������. �������\
 ���������� �� ���� - ����� ���� ���������� � ������. ��� ��� ��� �� ����� �\
 ���������������� �����?"
	});

	st.discardPickableItem({ gs: gs, itemId: "it_paper" });
	gs.f_printer_ready = true;
});

SCRIPT_ADD("sA2", "cs.inspectTolchok",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_mansion_tolchok:������������ ������� ���� �� �������\
 ���� � �������������� ���������, ������������ � �������, � ������, �� � ���\
 ������� �������� ��������� �������������� ������������� � �������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@how_his_ass_doesnt_crack:�� ��� � ���� ����-�� �� �������\
 � ����� ������ ������! �� ��� � ��� �����!.."
	});

	gs.f_mansion_tolchok_inspected = true;
});

SCRIPT_ADD("sA2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_rake" &&
		action.hotspotId == "hs_mansion_lioness_side") {
		return { action: "cs.getProcId" };
	}
});

SCRIPT_ADD("sA2", "cs.getProcId",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_proc_id_obtained:��������� �������� �� ������ �\
 ������������ ������� � ����������� ������, ����� ������� �������\
 ������������� ��������..."
	});

	gs.f_lioness_searched = true;
	gs.it_proc_id_enabled = true;
	if (gs.it_valenok_enabled && gs.it_proc_id_enabled) {
		// discard rake after all uses
		st.discardPickableItem({ gs: gs, itemId: "it_rake" });
	}
	st.object("lioness").state = "on-searched";
});


//
// sA3 (manager mansion entrance)
//

SCRIPT_ADD("sA3", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_A3").position;
	}
});

SCRIPT_ADD("sA3", "preControl",
async function showIntroMansion(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_sA3_mansion_entrance_intro) {
		gs.f_sA3_mansion_entrance_intro = "done";
		return { action: "cs.mansionEntranceIntro" };
	}
});

SCRIPT_ADD("sA3", "cs.mansionEntranceIntro",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		header: "@popup_director_mansion:������ ������������",
		text: "@popup_director_mansion_text:���������������� ������������\
 ������� �������� ���� �� ������� ����. � ������������� ����� �� ��������\
 ���� ��������� ������, � ������� ���� ������, ���� ������ �������� � �������,\
 �� ����������� ��� ������.\n\
 � �� ������ � ������ ������������ � ������� ����������� �������� ������ �\
 ���������� �� ����� ���� � �����������."
	});

	// the assignTargets pre-control script is not invoked after
	// this action
	if (!gs.f_security_off) {
		tmps.targetsAssigned = true;

		st.object("sec_turret_1").addTarget("loc_hero_hitbox");
		st.object("sec_turret_2").addTarget("loc_hero_hitbox");
	}
});

SCRIPT_ADD("sA3", "preControl",
async function showIntroMansionSecurityOff(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (gs.f_security_off && !gs.f_sA3_mansion_secrity_off_intro) {
		gs.f_sA3_mansion_secrity_off_intro = true;
		gs.f_sA3_mansion_entrance_intro = "done";
		return { action: "cs.mansionSecurityOff" };
	}
});

SCRIPT_ADD("sA3", "cs.mansionSecurityOff",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@popup_director_mansion_sec_off:���������� �������� ���� ��\
 ������ ������������ ��� ���������������� ���������������� �����. �������\
 ������������ ������������� �� ������ ����� �� ������������ ��������.\
\n���� ����� ����� ���������� � �������� ����-������ ��������, ���� �����\
 �� ����� ������� � �� ��������� � ��� �� �����."
	});
});

SCRIPT_ADD("sA3", "preControl",
async function assignTargets(s, {gs, tmps, st, action}) {
	if (!gs.f_security_off) {
		tmps.targetsAssigned = true;

		st.object("sec_turret_1").addTarget("loc_hero_hitbox");
		st.object("sec_turret_2").addTarget("loc_hero_hitbox");
	}
});

SCRIPT_ADD("sA3", "ac.heroRespawn",
async function fireAtHero(s, {gs, tmps, st, action}) {
	// an extra to hero respawn at this stage to stop turrets fire
	// after 1st shot
	st.object("sec_turret_1").fireEnabled = false;
	st.object("sec_turret_2").fireEnabled = false;
});

SCRIPT_ADD("sA3", "daemon",
async function fireAtHero(s, {gs, tmps, st, action}) {
	if (!gs.f_security_off) {
		for (;;) {
			s.checkLeave();
			var [ evtMaybeHeroEnterFireArea ] = await s.anyOf(
				st.entScreenSink.event("collisionEnter"));

			// when hero enters obstrel zone, enable the tank fire
			// (it will automatically reset after hero
			// is hit, so don't bother that right here)
			if (evtMaybeHeroEnterFireArea &&
				st.isCollision({
					collEvent: evtMaybeHeroEnterFireArea,
					locId: "loc_hero_pinpoint",
					withLocId: "loc_sec_obstrel"
				})) {
				st.object("sec_turret_1").fireEnabled = true;
				st.object("sec_turret_2").fireEnabled = true;
			}
		}
	}
});

SCRIPT_ADD("sA3", "cs.observeWire",
async function observeWire(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_wire_observed:������������ �������� ����� � ���\
 ���������-������������������� ��������� ���������� ������ �������������.\
 ���� ������� ��������, ��� ������������ ��� ������� ������ (� ���, ���\
 ������ ������, ������� �������� ���� �� �����).\
\n�� ���������������� ����� ����-�� � ������� ���������� ���� ��������\
 �������. ��������, ������ �� ������, � ������ ������� ���� � ����������?"
	});
	gs.f_wire_observed = true;
});

//
// sA4 (zone/field)
//

SCRIPT_ADD("sA4", "preControl",
async function showIntroFieldZone(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_zone_intro) {
		gs.f_zone_intro = "done";
		return { action: "cs.zoneEntranceIntro" };
	}
});

SCRIPT_ADD("sA4", "cs.zoneEntranceIntro",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		header: "@popup_zone_field:��������� ����",
		text: "@popup_zone_field_text:�� ����������� ��������� � ���������\
 ��������� ���� ������ ��� �������� � ���������� ������ ����������, �������\
 ���������� � ������������ � ����� ��������� ����. ��� ����� ������ ���,\
 ������� � Gamedev.ru.\n\
 ���� ��������������� ���������� ��� ������ ���������� � ������� ����������,\
 � ��� ����� �� �������� ���������� �����������������."
	});
});

SCRIPT_ADD("sA4", "cs.observeGoldBall",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		header: "@popup_goldball:������� ���",
		text: "@popup_goldball_text:� ������� ���� ������ � ��������\
 ������ ������� ���. �������� ������� ������������ �����, ��� ��� �����\
 �������� ��������, �� ������� ����� ���������� �������� ����. �� ��� ���\
 �������? �������� � ��������� ������ ���� ��� �������� ������ �������\
 �������. ����� ��, ��� ���� ����� ������������, �� �������� �� �����."
	});

	if (gs.f_stalker_intro) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e4_m1",
			header: "@hero_says:�����:",
			text: "@i_know_a_guy:...��, �������, � ���� ���� �� �������\
 ���������� ����."
		});
	}

	gs.f_goldball_observed = true;
});

SCRIPT_ADD("sA4", "preControl",
async function(s, {gs, tmps, st}) {
	if (gs.f_stalker_done && !gs.f_security_off) {
		return { action: "cs.hereIsTheBall" };
	}
});

SCRIPT_ADD("sA4", "cs.hereIsTheBall",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 30);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@here_hold_your_ball:���... �-�������... ����� ���� �... ���."
	});

	st.playParticle({
		particleId: "teleport_in",
		atPosition: st.object("hs_it_goldball").position
	});
	await st.waitTicks(s, 30);

	gs.f_security_off = true;
	gs.it_goldball_enabled = true;
	st.updateSceneToGameState();

	await st.waitTicks(s, 60);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@but_something_broken_in_mansion:�... ������ �����... �-����� �\
 ��� ����, ��... �-������... �-��� � �-������������ �� ���� ��-�� �...\
 ���������. ��� ��... �����... ���� �� �� �-������������ ���� �-����������...\
 ����� �-���� ����... �� ����������... ��... �� ���� �-�������� ����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:�����:",
		text: "@you_were_fast:�������, �������, �������. � ������ � ����\
 ����������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@the_old_school:�� �-���. ��-����� �����! ���� - ��� � ���...\
 ��� ����� �����... �-������ �����..."
	});

	st.object("stalker_A4").state = "on-balalaika-left";
	await st.waitTicks(s, 120);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@and_needs_understanding:� ���... � �-��������� ����. �\
 �-������-�� ��� �-������� ������ �... �����..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@and_needs_understanding_2:�-������������, �����... � �-������� ��\
 �-������, ������ �-�� ���� ���� �-�������... �� � ���� �-�� ������ ��������...\
 ��� ��, �-�����, �� ��... �����?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@and_needs_understanding_3:������... ����... ��-����������\
 ������... �-�������� ����, ������, �-������� ��-�������... ������ �-�����,\
 �-���� �... ��... �... ������... ��������� �-������... ��� �� ���� � ������,\
 �-�������?\n\
 � ��, ��-�����... �-���� ��� �-��������, ����� � ��� �-����������� ������� �\
 �... ��������. �� �� ��... ���-��... �?"
	});

	st.object("stalker_A4").state = "on-balalaika";
	await st.waitTicks(s, 120);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@not_at_our_generation:�... ���� ���, �... ������ �������!\
 ���� �-���� �... �-��������� ����, �� �-������ ������ �... ��������! �\
 ����, � ������... �� �� ������ �... ��������... ��... ������� ��-�������...\
 �� �����! ��...| �...| ��...| �������!!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:�����:",
		text: "@did_you_drink_it:� �� ���, ��� � ������� ���� ���������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@i_did_and_what:�� �... ��... � �... �� �... ������?..\
 �... ��... ���...."
	});

	gs.f_stalker_done_sleep = true;
});

SCRIPT_ADD("sA4", "cs.stalkerWhereIsBottle",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m3",
		header: "@hero_says:�����:",
		text: "@stalker_stalker:�������!.. �������!!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@huh_what:����... ��... �?.. �-��?.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@where_is_bottle:� ������� ��-��� �������� ���?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@bottle_uh_bottle:�... �������?.. �...| ���...|\
\n� ���� � � �... ����, ���� �-�������...|\
\n����, �� �� �-�����... �... ��������? �� �-����� �... ����...\
| �...| �����..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:�����:",
		text: "@picky_but_bottle_is:��, �������� �� ��������, � �����\
 ����������� ��������������. ����� ��� ������ ����� ����, � ������� ����...\
 � ����, ������? �� ��, �������� � ����."
	});

	gs.f_bottle_reclaim_open = true;
});

//
// sA5 (sut)
//

SCRIPT_ADD("sA5", "preControl",
async function(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_sA5_intro) {
		gs.f_sA5_intro = "done";
		return { action: "cs.enterSUT" };
	}
});

SCRIPT_ADD("sA5", "cs.enterSUT",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		header: "@popup_sut:������� ���� ������������",
		text: "@intro_sut:�� ������� ��������� ������ ������ ���������� �\
 ������������ �������� ����� ��������� �������� � ��������� ����� ���������\
 ���� ��������� ��������, �������� � �����������. ��� � � ������� ���������\
 ������� ��� ���� ������������, �������� � ����������������. ����������, �\
 ��������� �� ��, ��� ����� ��� ����� ��������� �����-������������. ���,\
 ��������, ������������ � ��������� ��� ������������ ������� ������ ��\
 �������. ��������� ������� ��������� ������ ������ � ��������� ���\
 ������� �������. � ��, ������� ������� ����������, ��� ���� ������ ������\
 ���� �� � �������. �������� � ���� �������� �����-�� �����������\
 ������������, �� ����������� ��� ��������-���������� ��������� ����������."
	});
});


SCRIPT_ADD("sA5", "cs.exMakePassport",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:����� � �������� ��� ������ �������",
		text: "@recipe_passport:�������: ������� �������� � ����������\
\n���.-��. �����������: ��-���, �� ������ ����������, ����� ���� ����������\
 �������� � ���������� ����� ������������ �������?\
\n�����������: �) ����, �) ���������� ������\
\n������������:\
\n1. �������� ����.\
\n2. ��������� ���� ����������� �������.",
		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:�����:",
			text: "@it_is_complicated:��-�� ������. ���� ���������. ��� ����\
 �� ����� ���� � �� ��������� ��������..."
		});
	}

	gs.f_make_passport_inspected = true;
});

SCRIPT_ADD("sA5", "cs.exMakePistolTorchlight",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:����� � �������� ��� ������ �������",
		text: "@recipe_pistol_torchlight:�������: �������� � ���������\
\n���.-��. �����������: �������� � ��������� �������� �� 1 ����������� �����\
 ������, ��� ������ �������� � �������.\
\n�����������: �) ��������, �) �������, �) �������� (��� ����������)\
\n������������:\
\n1. �������� �������� ���������. ���� ����� ����� �������� ������� - ���\
 �����!\
\n2. ���������� ������� � ��������� ��������� ������ ��������.\
\nPS: ��������, �� ����������� ����! ������� - �������� � ��������, �\
 ������ ����� - �������!",
 		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:�����:",
			text: "@to_complicated:�� ���� ���� ������... � ����� �� �������.\
 ������� �������� ����� �����."
		});
	}

	gs.f_make_pistol_torchlight_inspected = true;
});

SCRIPT_ADD("sA5", "cs.exMakeExplosiveVodka",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:����� � �������� ��� ������ �������",
		text: "@recipe_explosive_vodka:�������: �������������� �����\
\n���.-��. �����������: ��������� �����\
\n�����������: �) �����, �) ���������� ��������\
\n������������:\
\n1. ��������� ���������� �������� �� �������.\
\n2. �������� ������� � ������� � ������ � ������\
\n(����������� ������ �������� ������ �������� � �� ����� ����������\
 ��-�� �����-�� �����, ���������� �����)\
\n��������� ����������� �� ������� �����������.",
		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:�����:",
			text: "@why_so_complicated:�� ������ ��. ����� ���� ���� �� ����\
 � ������ � ���� ������ ����� �������."
		});
	}

	gs.f_make_explosive_vodka_inspected = true;
});

SCRIPT_ADD("sA5", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.hotspotId == "hs_make_passport") {
		if ((action.itemId == "it_fish" && gs.it_data != "inv") ||
			(action.itemId == "it_data" && gs.it_fish != "inv")) {
			return { action: "cs.somethingIsMissing" };
		}

		if ((action.itemId == "it_fish" && gs.it_data == "inv") ||
			(action.itemId == "it_data" && gs.it_fish == "inv")) {
			return { action: "cs.makePassport" };
		}
	}
});

SCRIPT_ADD("sA5", "cs.somethingIsMissing",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m2",
		header: "@it_doesnt_work:������ �� �����",
		text: "@hero_forgot_somehting:����� ������������� ������ ���������� �\
 ����� �������� � ����� ������ ���-����� �����������."
	});
});

SCRIPT_ADD("sA5", "cs.makePassport",
async function(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.popup(s, {
		header: "@popup_passport:�������",
		text: "@passport_made:������ ����������� �� ������, ����� ������ ��\
 ���� � ���������� ������ ����� ��������� �������! ��, �� ����, �������,\
 � ����� ������ ������ ������ � ����������� �������� ��� ������ ���������,\
 �� ������ ������� � �� ����� ���� ���������. ����� � ��-152� �������������\
 ���. ��� � ��, ��� �� ������������������� ���������� ������ ����������\
 �������������� � ����� � ���������� � ���� ����� ���������� �������.",
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_major",
		header: "@major_says:�-� �����:",
		text: "@info_legal_notice:\
\u26A0 ������� �������� ���������� \u26A0\
\n��������! �������: �������� ���������� ������ ������������ �� ������. ��\
 ��������� ��������� ������� �������� ����� � ����� � �� � ���� ������ ��\
 �������������� ��� ������ ��� ����������� � ������� �����-���� �������.\
 � ����� ����������� ��������� ������, ������ ������������ �������� � ������\
 ���� ������� �������� ������������."
		});

	st.discardPickableItem({ gs, itemId: "it_data", updateScene: false });
	st.discardPickableItem({ gs, itemId: "it_fish",
		updateScene: false });
	st.takePickableItem({ gs, itemId: "it_passport", updateScene: false });
	tmps.inv_last_selected = "it_passport";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sA5", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.hotspotId == "hs_make_pistol_torchlight") {
		if ((action.itemId == "it_torchlight" && !gs.it_pistol_scotch) ||
			(action.itemId == "it_pistol" && gs.it_torchlight == "inv" &&
				gs.it_scotch != "inv")) {
			return { action: "cs.wrongSteps" };
		}

		if ((action.itemId == "it_pistol" && gs.it_scotch != "inv") ||
			(action.itemId == "it_scotch" && gs.it_pistol != "inv")) {
			return { action: "cs.somethingIsMissing" };
		}

		if ((action.itemId == "it_pistol_scotch" && gs.it_torchlight != "inv") ||
			(action.itemId == "it_torchlight" && gs.it_pistol_scotch != "inv")) {
			return { action: "cs.somethingIsMissing" };
		}

		if ((action.itemId == "it_pistol" && gs.it_scotch == "inv") ||
			(action.itemId == "it_scotch" && gs.it_pistol == "inv")) {
			return { action: "cs.makePistolScotch" };
		}

		if ((action.itemId == "it_pistol_scotch" && gs.it_torchlight == "inv") ||
			(action.itemId == "it_torchlight" && gs.it_pistol_scotch == "inv")) {
			return { action: "cs.makePistolTorchlight" };
		}
	}
});

SCRIPT_ADD("sA5", "cs.wrongSteps",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m2",
		header: "@it_doesnt_work:������ �� �����",
		text: "@hero_mixed_steps:����� ������������� ������ ���������� �\
 ��������� ���� ������."
	});
});

SCRIPT_ADD("sA5", "cs.makePistolScotch",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		header: "@popup_pistol_scotch:��������, �������� �������",
		text: "@pistol_scotch_made:����� ��������� ������� �������� �������,\
 �� ����� �������� ������� ��������� �����. ������� ���������� �������������\
 � ���� �� ������ �������, ��� ����������� �����, �� ��, ��� �������� �������\
 ��������� ����� - ��� ����� �����, ����� ����� ���������.",
	});

	st.discardPickableItem({ gs, itemId: "it_pistol", updateScene: false });
	st.discardPickableItem({ gs, itemId: "it_scotch",
		updateScene: false });
	st.takePickableItem({ gs, itemId: "it_pistol_scotch",
		updateScene: false });
	tmps.inv_last_selected = "it_pistol_scotch";
	return { action: "openInventory", forUse: true };
});

SCRIPT_ADD("sA5", "cs.makePistolTorchlight",
async function(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.popup(s, {
		header: "@popup_pistol_torchlight:�������� � ������",
		text: "@pistol_torchlight_made:���! � ����� ���������� ������� �����\
 ������� �����, � �� ���� ���������� � ���������� ������ ����� �����������\
 ��������� � ������.",
	});

	st.discardPickableItem({ gs, itemId: "it_pistol_scotch",
		updateScene: false });
	st.discardPickableItem({ gs, itemId: "it_torchlight",
		updateScene: false });
	st.takePickableItem({ gs, itemId: "it_pistol_torchlight",
		updateScene: false });
	tmps.inv_last_selected = "it_pistol_torchlight";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sA5", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.hotspotId == "hs_make_explosive_vodka") {
		if ((action.itemId == "it_vodka" && gs.it_goldball != "inv") ||
			(action.itemId == "it_goldball" && gs.it_vodka != "inv")) {
			return { action: "cs.somethingIsMissing" };
		}

		if ((action.itemId == "it_vodka" && gs.it_goldball == "inv") ||
			(action.itemId == "it_goldball" && gs.it_vodka == "inv")) {
			return { action: "cs.makeExplosiveVodka" };
		}
	}
});

SCRIPT_ADD("sA5", "cs.makeExplosiveVodka",
async function(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.popup(s, {
		header: "@popup_explosive_vodka:�������������� �����",
		text: "@explosive_vodka_made:����� �������� ������� ��������������\
 �����. � ���������, ��� ������ �����, ����� �������� ���� � ���� ����������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m4",
		header: "@hero_says:�����:",
		text: "@explosive_vodka_what_ive_done:�� �� � ��������� ����! ��� ����\
 �������������� �����!! �������, ��� �� � ������!.. ��� ����� ������ ������..."
		});

	await st.popup(s, {
		text: "@only_hope_it_will_justify:���������� ���������, ��� �����\
 ������ ����� ������������� ������������ ��� ������� ����, � ��� � ��������\
 ����� ������� ���� �� ���������� ���������."
	});

	st.discardPickableItem({ gs, itemId: "it_vodka", updateScene: false });
	st.discardPickableItem({ gs, itemId: "it_goldball",
		updateScene: false });
	st.takePickableItem({ gs, itemId: "it_explosive_vodka",
		updateScene: false });
	tmps.inv_last_selected = "it_explosive_vodka";
	return { action: "openInventory", forUse: false };
});

//
// sB0 (sortir)
//

SCRIPT_ADD("sB0", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_B0").position;
	}
});

SCRIPT_ADD("sB0", "cs.knockSortir",
async function heroKreakliatKick(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:������-�������:",
		text: "@who_goes_therrre:��� �����������?!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@a_customer:����������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:������-�������:",
		text: "@customers_fuck_off:���������� ���� ����r. �r������� ������\
 ���������� � ��r���. ������ � ��������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m4",
		header: "@hero_says:�����:",
		text: "@a_candidate_then:��, ����� ��������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:������-�������:",
		text: "@why_candidate_with_square_face:� �� ������� ������������?!\
 ������, �����?!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:������-�������:",
		text: "@i_think_hes_from_olgino:������ ���, ��� ���r��� ��� ��\
 ��������, � ���������� �r�������r."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@how_can_you_im_folk:�� ��� �����! � - �������� �� ������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:������-�������:",
		text: "@tell_folk_password:� �� ����� �� �������?! ������ ������,\
 �������� ��������� ������������! ��-�� ����� ���������� ��������...|\
\n���| ���!!!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@eh_ptn:�... ���..."
	});

	hlsfxPlaySFX({ sfxId: "beep-beep-2" });
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_mk152",
		header: "@mk152_says:��-152�:",
		text: "@mk152_beep:���, ���, ���-���-���..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@eh_is_power:... - ����, ���������� - �� ����!|\
 ����������!| �������������!| �� ����� �� ������!| � ������, �� ������!|\
 ������������ �����!| ���� �������� �� �����!| ���� ��� ����� �����!|\
 ���������� �����������!| ������� ��� ������� ������ ��������� ��������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m1",
		header: "@hero_says:�����:",
		text: "@how_good_to_tell_truth:...���, �� ���������. �� ���� �� �����\
 � ������� �������� ������!.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:������-�������:",
		text: "@like_i_thought:��, ��� � � �r���������. �r������r������\
 ��r����������� ��r����r��."
	});

	await st.popup(s, {
		text: "@text_sortir_locked:����� � ������ �������������� ������������\
 ����� ����� �����.\
\n�� �� �����-�� � ��������.\
\n� ������ �������, ��������� ���������� ������������ ���������� ���� ����\
 ������."
	});

	gs.f_kreakl_intro = true;
});

SCRIPT_ADD("sB0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_grenade_used &&
		action.itemId == "it_grenade" &&
		action.hotspotId == "hs_use_grenade") {
		return { action: "cs.heroKicked" };
	}
});

SCRIPT_ADD("sB0", "cs.heroKicked",
async function heroKreakliatKick(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m1",
		text: "@hero_throws_grenade:����� ������� � ���� ������� �������\
 � ���� ����� ����������..."
	});
	st.discardPickableItem({ gs: gs, itemId: "it_grenade" });
	gs.f_grenade_used = true;

	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 60);

	st.object("sortir").state = "on-open";
	var sPenguinMove = s.fork(),
		sHamsterMove = s.fork();

	await s.allOf(
		sHamsterMove.run(S_animateAndMove, {
			st,
			entId: "@hamster",
			fromLocId: "loc_kreakl_src_B0",
			animMove: "Hamster",
			ticks: 20,
			toLocId: "loc_kreakl_out_1",
			moveAnimationId: "MoveOverTicks"
		}),
		sPenguinMove.run(S_animateAndMove, {
			st,
			entId: "@penguin",
			fromLocId: "loc_kreakl_src_B0",
			animMove: "Penguin",
			ticks: 20,
			toLocId: "loc_kreakl_out_2",
			moveAnimationId: "MoveOverTicks"
		})
	);
	await st.waitTicks(s, 30);

	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 30);

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:������-�������:",
		text: "@penguin_rumol:����r��� r���������� ������."
	});
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:������-�������:",
		text: "@hamster_wooden_grenade:������������� �������� ���\
 ������������ ����������?! ��������������! �������������������!!"
	});
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:������-�������:",
		text: "@penguin_and_chmo:� ���. ���� ��, ��� � ���."
	});

	await s.allOf(
		sHamsterMove.run(async function(s) {
			await st.waitTicks(s, 30);
			await S_animateAndMove(s, {
				st,
				entId: "@hamster",
				fromLocId: "loc_kreakl_out_1",
				animMove: "Hamster",
				ticks: 20,
				toLocId: "loc_kreakl_src_B0",
				moveAnimationId: "MoveOverTicks",
				animTo: "-"
			});
		}),
		sPenguinMove.run(async function(s) {
			await st.waitTicks(s, 30);
			await S_animateAndMove(s, {
				st,
				entId: "@penguin",
				fromLocId: "loc_kreakl_out_2",
				animMove: "Penguin",
				ticks: 20,
				toLocId: "loc_kreakl_src_B0",
				moveAnimationId: "MoveOverTicks",
				animTo: "-"
			});
		}),
		s.fork().run(S_animateAndMove, {
			st,
			entId: "hero",
			fromLocId: "hs_use_grenade",
			animMove: "HeroKicked",
			animTo: "HeroFaceDown",
			ticks: 40,
			toLocId: "loc_kreakl_kick_tgt",
			moveAnimationId: "MoveOverTicks"
		})
	);

	st.object("sortir").state = "on";
	await st.waitTicks(s, 60);

	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: st.object("loc_kreakl_kick_tgt").position
	});

	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:�����:",
		text: "@hero_you_fucking_kreakls:������ �������! ��� � ��� ��...\
 ��� �� ��� ��������, ���� � ��� ��..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:�����:",
		text: "@hero_blin_black_eye:����, ������ ������ ����� �� ���-�����."
	});

	await st.popup(s, {
		text: "@text_torchlight_obtained:�����, �� ����� ����, ��������\
 ������� � ����� ������."
	});

	st.takePickableItem({ gs, itemId: "it_torchlight", updateScene: false });
	tmps.inv_last_selected = "it_torchlight";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sB0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.it_data &&
		action.itemId == "it_mk152" &&
		action.hotspotId == "hs_get_data") {
		return { action: "cs.getData" };
	}
});

SCRIPT_ADD("sB0", "cs.getData",
async function getData(s, {gs, tmps, st, action}) {
	if (!gs.f_data_intro) {
		await st.popup(s, {
			text: "@text_no_vandalism:��������������� ������ ������ � ��������\
 ���������� ������ �� ���� - �-� ����� ���� �� ������� �� ������� �����������\
 ������������. � ��� ������������ � ����������, ��� ���� � ������ ���,\
 �������� ��� ����� ������� � ��������� ���������������� ��������� �������\
 ���������� ������� ����� � ������������ ������� �������� ������, ����\
 ��������������� ���������..."
		});
	}

	var maxItems = gs.f_backpack_collected ?
		GameConst.INVENTORY_SIZE_EXPANDED :
		GameConst.INVENTORY_SIZE_DEFAULT;
	if (gs.inventory.length >= maxItems) {
		await st.popup(s, {
			type: "iconTop",
			icon: "icon_hero_e5_m4",
			text: "@hero_got_no_space:...�� � ����� � ��������� �� ����\
 ���������� ����� ��� ��������� �������."
		});
		return;
	}

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e4_m5",
		text: "@hero_got_data:������� �� �������� ����� �������� � ���������,\
 ����� � ��-152� ��� ����� ����� ������������ ���������� ������ ������-��\
 ���������� �������."
	});

	if (!gs.f_data_intro) {
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_major",
			header: "@major_says:�-� �����:",
			text: "@info_security_minute:\
\u26A0 ������� �������������� ������������ \u26A0\
\n��������! �������: �������������� ������ ������ �������� - ����� �������\
 ������ ������� �� ���������� ������������ �������� ����� ���!\
 ��� ����������� � ������������ �������� ��������� �������� ����������,\
 ������ ������� ����� ������� ����������, ���������������� ��� ���������\
 �����."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_public",
			header: "@public_says:������ �� ����:",
			text: "@but_they_all_require_it:��� ���� ��� ��� � �������. ��\
 �������� - ���� ��� �����������������..."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_major",
			header: "@major_says:�-� �����:",
			text: "@register_nowhere:��� ����� � �� ���������������. ���\
 ������."
		});
	}

	gs.f_data_intro = true;
	st.takePickableItem({ gs, itemId: "it_data", updateScene: false });
	tmps.inv_last_selected = "it_data";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sB0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_valenok" &&
		action.hotspotId == "hs_use_valenok") {
		return { action: "cs.sortirBlock" };
	}
});

SCRIPT_ADD("sB0", "cs.sortirBlock",
async function sortirBlock(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: stHero.position
	});

	st.discardPickableItem({ gs: gs, itemId: "it_valenok" });
	hlsfxPlaySFX({ sfxId: "chpok" });
	st.object("sortir").state = "on-valenok";
	await st.popup(s, {
		text: "@text_sortir_blocked:������������� ������� ��������� �\
 ���������� �������� ��������� �����, ������� �������� � ��������\
 ������� � �� ������� ���������� �����."
	});
	st.object("sortir_smoke_roof").state = "off";
	await st.waitTicks(s, 60);

	st.playScreenFX({ type: "shaker", x: 0, y: -4, duration: 120 });
	hlsfxPlaySFX({ sfxId: "buildup" });
	await st.waitTicks(s, 120);
	hlsfxStopSFX({ sfxId: "buildup" });

	hlsfxPlaySFX({ sfxId: "explosion2" });
	gs.f_sortir_blocked = true;
	await S_animateAndMove(s, {
		st,
		entId: "@door_out",
		fromLocId: "loc_kreakl_src_B0",
		animMove: "ParticleSortirDoor",
		rate: 40,
		toLocId: "loc_sortir_door_tgt",
		animTo: "-"
	});

	st.object("sortir").state = "on-no-door";
	st.object("nv_kreakl_ctl_B0").state = "on";
	st.object("sortir_smoke_door").state = "on";
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: stHero.position
	});

	await st.popup(s, {
		text: "@text_kreakls_run_abroad:������������������ ���������\
 ������� ������������ ��������, ����������� ������, ������� ���������\
 ������, ������ ������������ �������� ��������� �, �� �������, ���\
 ����������, �� ������� ��������� �������� ������������ �������� � �������\
 �������� �������."
	});

	await st.waitTicks(s, 180);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m5",
		header: "@hero_says:�����:",
		text: "@hero_how_is_it_kreakls:��, ���������, ��������� �����?\
 ��� ������ �� ��� ������ �������� � ���� ���������, ��� ����� �����\
 ���������?"
	});

	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m2",
		header: "@hero_says:�����:",
		text: "@hero_they_flushed_it:� ���� ��� ����� ������ � ��� �� �����\
 � ������ ��������... ���������, ��� �����-�� ������������!"
	});
});

SCRIPT_ADD("sB0", "cs.sortirExplodes",
async function sortirExplodes(s, {gs, tmps, st, action}) {
	st.object("nv_kreakl_ctl_B0").state = "off";
	st.object("sortir_smoke_door").state = "off";

	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 30);

	hlsfxPlaySFX({ sfxId: "buildup" });
	st.playScreenFX({ type: "shaker", x: 0, y: -4, duration: 60 });
	await st.waitTicks(s, 60);
	hlsfxStopSFX({ sfxId: "buildup" });

	st.playScreenFX({ type: "flash", duration: 120 });
	hlsfxPlaySFX({ sfxId: "nuke" });
	await st.waitTicks(s, 6);
	st.object("sortir_busted_spot").state = "on";
	st.object("sortir").state = "off";

	await st.waitTicks(s, 60);
	st.playParticle({
		particleId: "nuke",
		atPosition: st.object("sortir_busted_spot").position
	});
	await st.waitTicks(s, 60);

	async function dropThing(s, {
		entId,
		animId,
		locId
	}) {
		var stLoc = st.object(locId);
		var fromPos = {
			x: stLoc.position.x,
			y: stLoc.position.y - 256
		};
		await S_animateAndMove(s, {
			st,
			entId,
			fromPosition: fromPos,
			animMove: animId,
			ticks: 20,
			toLocId: locId,
			moveAnimationId: "MoveOverTicks"
		});
		hlsfxPlaySFX({ sfxId: "item_fall" });
	}

	await s.allOf(
		s.fork().run(async function(s) {
			await st.waitTicks(s, 20);
			await dropThing(s, {
				entId: "it_paper",
				animId: "ItemPaper",
				locId: "hs_it_paper"
			});
		}),
		s.fork().run(async function(s) {
			await st.waitTicks(s, 40);
			await dropThing(s, {
				entId: "tugrik_19",
				animId: "ItemTugrik",
				locId: "hs_tugrik_19"
			});
		}),
		s.fork().run(async function(s) {
			await st.waitTicks(s, 60);
			await dropThing(s, {
				entId: "it_iphone",
				animId: "ItemIphone",
				locId: "hs_it_iphone"
			});
		})
	);

	await st.waitTicks(s, 30);
	await stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 30);

	gs.f_sortir_off = true;

	gs.it_paper_enabled = true;
	gs.it_iphone_enabled = true;

	await st.popup(s, {
		text: "@text_grenade_not_wood:� ������������ ��������� �����,\
 ������ ������ ������� ��������� �� ����������, � ����� ��� �� �� ����\
 ���������. ������ � ����� ��������� �������."
	});
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@hero_grenade_wow:��� �� � ���... � � �� ����� �����..."
	});
	
});

SCRIPT_ADD("sB0", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sB0";
	tmps.medvedFlagToSet = "f_medved_detected_sB0";
	tmps.medvedFlagRequired = "f_medved_detected_sC0";
});

SCRIPT_ADD("sB0", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_flee:���������� ������������ � �����������: �������\
 ������ �� ������ �� �� �����. ������ ����� ���������� ����� ����� ��� �� ��\
 �����, � � �������� ���������� ����� �����. ���������� ������ ������������\
 �������� �� ������ �� ����� - � �������� � ����� ����������, ��� ����� ����\
 ������� ��������, ����� ������ ��������� ��� ��� ������ ����������\
 ��������... �� ��� �� ��� ��� �� �������� ������� �����? � ������� ��?"
	});
});

SCRIPT_ADD("sB0", "preControl",
async function(s, {gs, tmps, st}) {
	if (!gs.f_sortir_off &&
		gs.f_tank_drained &&
		gs.f_otstrel_started) {
		return { action: "cs.sortirExplodes" };
	}
});

//
// sC0 (thicket)
//

SCRIPT_ADD("sC0", "cs.collectBackpack",
async function(s, {gs, tmps, st, action}) {
	gs.f_backpack_collected = true;
	gs.ach_secret = true;
	await st.popup(s, {
		header: "@title_backpack:������� ��������",
		text: "@text_backpack_collected:�������! ����� ����� ������� ��������,\
 � ��� ���������������� �����������...|\n�� ����� 1 �������! ������ ����� ����\
 �� � ��� ���� �� ����������."
	});
	st.updateSceneToGameState();
});

SCRIPT_ADD("sC0", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sC0";
	tmps.medvedFlagToSet = "f_medved_detected_sC0";
	tmps.medvedFlagRequired = "f_medved_detected_sC1";
});

SCRIPT_ADD("sC0", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_turntide:��� ������, ��� ����� ����� ���������� ������\
 � �������� ������� ������� � ������������� �������. �� � � ���, ��� �� ���\
 �������� ������������... ���� �� ������ � ������ �������, ����� ��������� ���\
 ������ �� ������������� ���������."
 	});

 	await st.popup(s, {
 		text: "@medved_turntide_2:����� ������������ �� �����, �������� ��\
 �����������, � ����� ��� ���� ���-�� ���, ��� ���� � �����������\
 ������������� ����������� ������������ ��� ����������� �������� ����. ��\
 ����������, ��� ����� ��� ���������� ������ ����������� ����� �������\
 ���������������� �������."
	});
});

SCRIPT_ADD("sC0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_rake" &&
		action.hotspotId == "hs_search_valenok") {
		return { action: "cs.searchValenok" };
	}
});

SCRIPT_ADD("sC0", "cs.searchValenok",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
 		text: "@valenok_obtained:��������� ����������� ��������, ����� �������\
 �� ���� ��������� �������. ����������, ��, � ���������� �����, ������. ��\
 ������ - ��� ����� ��������������."
	});

	gs.it_valenok_enabled = true;
	if (gs.it_valenok_enabled && gs.it_proc_id_enabled) {
		// discard rake after all uses
		st.discardPickableItem({ gs: gs, itemId: "it_rake" });
	}
});

SCRIPT_ADD("sC0", "cs.pokeVoyager",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
 		text: "@voyager_identified:�� �������� ���������� ������������\
 ��������� � ������-�� ���������� � ������������ ���������� �� ���������\
 �������: \"Voyager-1\ (c) 1977 NASA Property of the U. S. Govt\".\
\n����� �� ����� ������������� ������������ ���������, �� ��� ������-��\
 ��������, ��� ������� � ������ ����������� ��� ����� ��� ��� ����� ��\
 ��������� ������� � ������ ���� �������, ��������� �� ���� ���� ������\
 ������� ������ � �������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m2",
		header: "@hero_says:�����:",
		text: "@what_if_pindosians_lied:� ���, ���� ������� ���� ����, �\
 ������ �� � ��� �� �������, � ������ ��������, � ����� � �������� ������?..\
\n�� ��, ���� �����-��..."
	});

	await st.popup(s, {
 		text: "@voyager_to_be_looted:��� �� �����, ������ � ����������\
 ������� � �������� �� ��������. ����� �������� ������� ����� ���������,\
 ����������� �������� ������ � ���������� �������..."
	});

	gs.f_voyager_poked = true;
});

SCRIPT_ADD("sC0", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_iphone" &&
		action.hotspotId == "hs_voyager_loot") {
		return { action: "cs.searchScotch" };
	}
});

SCRIPT_ADD("sC0", "cs.searchScotch",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
 		text: "@scotch_obtained:��������� ���������������� ����������� �������\
 ������� �������������� ���������� ������� � ����� ������� �������������, �\
 ������ ����� ���� ����������� ������ ���������� (�������� ���������)\
 ������������ ������."
	});

	gs.it_scotch_enabled = true;
	st.discardPickableItem({ gs: gs, itemId: "it_iphone" });
});

SCRIPT_ADD("sC0", "onPickup",
async function(s, {gs, tmps, st, action}) {
	console.log(action);
	if (!gs.f_what_if_its_real && action.itemId == "it_scotch") {
		gs.f_what_if_its_real = true;
		await st.popup(s, {
 			text: "@for_calm_and_proud:��� ��������� � �����������������\
 ����������� ����� ������ ������� ������� �������, ��� ������� �� ���������,\
 �� � �� �� ����� ���������.\
\n���� �� �� ���������, �� ��������, ��� ������ - �� ����� ������� ����������,\
 ������� �� ��������� ��������� ������� ����� ��� � ������ ������������, �\
 ������� ��������� ����� �� ���������, �� ������� ��� 40 ��� �������� ����\
 ���, � ����� � ��� �����. ��� ���������� ����� ������� ��� ����������\
 ����������."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:�����:",
			text: "@and_if_it_would_be_real:� ���� �� ��������� - ��� � �����\
 ������ ���������, ��� ��� �� ��� ������� ��-���� �� �������� ������ �\
 ���������� ����������. � ����� � �������, ���� �� �������� �������.\
 ���� ���� �� �� �������. � � ����� ����� ����-������ ��������� ��-���?\
 �� � ���. � - ������!"
		});
	}
});

//
// sB1 (eco-disaster river)
//

SCRIPT_ADD("sB1", "daemon",
async function(s, {gs, tmps, st}) {
	if (gs.f_water_cleansed) {
		st.setScreenTitle("@s_ecobad_river_fixed:����� �� �����");
	}
});

SCRIPT_ADD("sB1", "preControl",
async function showIntroFishnam(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_water_cleansed && !gs.f_fishman_intro) {
		gs.f_fishman_intro = "done";
		return { action: "cs.fishmanIntro" };
	}
});

SCRIPT_ADD("sB1", "cs.fishmanIntro",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_fishman",
		header: "@fishman_says:�������-����:",
		text: "@hey_hero:������, �������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@who_are_you:�� ���?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_fishman",
		header: "@fishman_says:�������-����:",
		text: "@im_fishman:�� - �������-����! ����������� � ������������!\
 ������� ����, �� � � ����� �������� �������������! �����, ����� �� ����, ����\
 �� �������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@yeap_just_wait:���, ����."
	});

});

SCRIPT_ADD("sB1", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_ski") {
		if (action.hotspotId == "hs_ferry_north") {
			return { action: "cs.ferryNorth" };
		} else if (action.hotspotId == "hs_ferry_south") {
			return { action: "cs.ferrySouth" };
		}
	}
});

SCRIPT_ADD("sB1", "cs.ferryNorth",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroSkiUp",
		moveAnimationId: "MoveAtRate",
		parameters: {
			RATE: GameConst.HERO_SKI_STEP_SIZE
		},
		moveTickEvent: "step",
		// ferry location names are a bit anti-intuitive
		moveFrom: st.object("hs_ferry_north").position,
		moveTo: st.object("hs_ferry_south").position
	}));
});

SCRIPT_ADD("sB1", "cs.ferrySouth",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroSkiDown",
		moveAnimationId: "MoveAtRate",
		parameters: {
			RATE: GameConst.HERO_SKI_STEP_SIZE
		},
		moveTickEvent: "step",
		// ferry location names are a bit anti-intuitive
		moveFrom: st.object("hs_ferry_south").position,
		moveTo: st.object("hs_ferry_north").position
	}));
});

SCRIPT_ADD("sB1", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_elixir" &&
		action.hotspotId == "hs_use_elixir") {
		return { action: "cs.cleanseWater" };
	}
});

SCRIPT_ADD("sB1", "cs.cleanseWater",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	var heroPos = stHero.position;

	await st.popup(s, {
		text: "@popup_hero_applied_elixir:�����, �������� �����������, �����\
 � ����� ������� ������������� ������� �, ������� ����, �������� �����..."
	});

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sB1",
		transOutVeilType: "black-in",
		transInVeilType: "black-out"
	});

	stHero = st.object("hero"); // old one has invalidated by screen switch
	stHero.playAnimation({
		animationId: "HeroStandUp",
		atPosition: heroPos
	});

	await st.popup(s, {
		text: "@popup_but_nothing_happened:...�� ������ �� �����������..."
	});
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);
	await st.popup(s, {
		text: "@popup_because_no_respect:...������ ��� ����� �� ����\
 ����������, ����������� ������������ ��� �������� � ����� �����, � ����\
 ����������, � �� ������ ��������� �����."
	});

	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:�����:",
		text: "@hero_nothing_works:����� �� ��������. ���������!!!"
	});

	await st.waitTicks(s, 30);

	hlsfxPlaySFX({ sfxId: "buildup" });
	st.playScreenFX({
		type: "shaker",
		x: 0,
		y: 4,
		duration: 60
	});
	await st.waitTicks(s, 60);
	hlsfxStopSFX({ sfxId: "buildup" });
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: heroPos
	});
	await st.waitTicks(s, 15);

	await st.popup(s, {
		text: "@popup_odd_but_correct:��� �� �������, �� ��������� �����,\
 ������������ �������� �� ��������� ��������, ������ ����� � ���������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:�����:",
		text: "@hero_works_get_down:�� �� � �, ��������! ������!!!"
	});
	stHero.playAnimation({
		animationId: "HeroFaceDown",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);

	hlsfxPlaySFX({ sfxId: "buildup" });
	st.playScreenFX({
		type: "shaker",
		x: 0,
		y: 4,
		duration: 150
	});
	await st.waitTicks(s, 60);

	hlsfxPlaySFX({ sfxId: "bubbling" });
	for (var i = 0; i <= 11; i++) {
		st.object("bubble_" + i).state = "on";
	}

	await st.waitTicks(s, 60);
	for (var i = 0; i <= 11; i++) {
		st.object("bubble_" + i).state = "off";
	}
	await st.waitTicks(s, 31);
	hlsfxStopSFX({ sfxId: "buildup" });
	hlsfxStopSFX({ sfxId: "bubbling" });

	await st.popup(s, {
		text: "@popup_wow_water_turned:�� � ��! ����� �� ������ ���� � �����\
 �� ��������� �������������� ���� ������������ � ���������..."
	});
	gs.f_water_cleansed = true;
	st.updateSceneToGameState({ tilesOnly: true });
	hlsfxPlaySFX({ sfxId: "chimes" });

	await st.waitTicks(s, 30);
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);
	await st.popup(s, {
		text: "@popup_however_strange_it_is:...����� �������� ����������..."
	});

	await st.waitTicks(s, 30);

	await s.allOf(
		s.fork().run(async function (s) {
			st.object("floating_fish_1").state = "on-up";
			await st.waitTicks(s, 15);
			st.object("floating_fish_1").state = "on";
			await st.waitTicks(s, 30);
		}),
		s.fork().run(async function (s) {
			await st.waitTicks(s, 10);
			st.object("floating_fish_2").state = "on-up";
			await st.waitTicks(s, 15);
			st.object("floating_fish_2").state = "on";
			await st.waitTicks(s, 20);
		}),
		s.fork().run(async function (s) {
			await st.waitTicks(s, 20);
			st.object("floating_fish_3").state = "on-up";
			await st.waitTicks(s, 15);
			st.object("floating_fish_3").state = "on";
			await st.waitTicks(s, 10);
		})
	);

	await st.waitTicks(s, 30);

	var stFishman = st.object("fishman");
	await s.anyOf(stFishman.playAnimation({
		animationId: "FishmanDefeatDown",
		atPosition: stFishman.position
	}));

	await st.waitTicks(s, 30);

	await st.popup(s, {
		text: "@popup_into_vodka:...�����!"
	});
	st.setScreenTitle("@s_ecobad_river_fixed:����� �� �����");
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:�����:",
		text: "@hero_gee_powerful:���. � ��������-�� ������������� ������\
 ���������!"
	});

	await st.waitTicks(s, 60);
	await s.anyOf(stFishman.playAnimation({
		animationId: "FishmanDefeatUp",
		atPosition: st.object("loc_fishman_retreat_src").position
	}));
	stFishman.playAnimation({
		animationId: "FishmanDefeated",
		atPosition: st.object("loc_fishman_retreat_src").position
	});
	await st.waitTicks(s, 120);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_fishman_defeated",
		header: "@fishman_says:�������-����:",
		text: "@fishman_do_you_think_you_win:����-.. �����... ��!.. �����...\
 �����-... ��!.. ���������... �����... ��!.. ��-... �����... �� ��-.. ��!..\
 �����?.. ��... ���... ��!.. �����-... �����... ��!.. ����..."
	});

	await S_animateAndMove(s, {
		st,
		entId: "fishman",
		fromLocId: "loc_fishman_retreat_src",
		animMove: "FishmanDefeatedMove",
		rate: 1,
		toLocId: "loc_fishman_retreat_dst",
		animTo: "-"
	});

	await st.waitTicks(s, 30);

	await st.popup(s, {
		text: "@popup_ferry_open:����, ����� ���� ������� � � ����������, � �\
 ����������� �������. ����������� � ��������� ����� �� ������ �� �������..."
	});

	await st.popup(s, {
		text: "@popup_and_bottle:��, � ��� ������������ ������: � ����� ��\
 ����� �������� ������ �������."
	});

	st.discardPickableItem({ gs, itemId: "it_elixir", updateScene: false });
	st.takePickableItem({ gs, itemId: "it_bottle", updateScene: true });
	tmps.inv_last_selected = "it_bottle";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sB1", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_bottle" &&
		action.hotspotId == "hs_get_vodka") {
		return { action: "cs.getVodka" };
	}
});

SCRIPT_ADD("sB1", "cs.getVodka",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_scooped_probe:�����, �� �������, ��������� ���� �� ���\
 ����������� ������� �������."
	});

	st.discardPickableItem({ gs, itemId: "it_bottle" });
	st.takePickableItem({ gs, itemId: "it_vodka", updateScene: true });
	tmps.inv_last_selected = "it_vodka";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sB1", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_rake" &&
		(action.hotspotId == "hs_ferry_north" ||
		action.hotspotId == "hs_ferry_south" ||
		action.hotspotId == "hs_get_vodka")) {
		return { action: "cs.noFishRake" };
	}
});

SCRIPT_ADD("sB1", "cs.noFishRake",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_no_fish_rake:���� � ������� ������� ����� �� ���\
 ���������� �� ��������� ����. �������� � ���� ���� ��������� �� ����� � ��\
 ���."
	});
});

//
// sC1 (partizan forest)
//

SCRIPT_ADD("sC1", "preControl",
async function determineRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;

		var stHero = st.object("hero");
		if (st.isInLocation({
			point: stHero.position,
			locId: "tr_C1_C0_lft"
		})) {
			gs.local.enterFromTop = true;
			gs.local.heroRespawnPosition =
				st.object("loc_hero_respawn_C1top").position;
		} else if (st.isInLocation({
			point: stHero.position,
			locId: "tr_C1_C2"
		})) {
			gs.local.enterFromBottom = true;
			gs.local.heroRespawnPosition =
				st.object("loc_hero_respawn_C1btm").position;
			// vars set here will pass to preControl's added next
		}
	}
});

SCRIPT_ADD("sC1", "preControl",
async function showIntroPartizan(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (gs.local.enterFromBottom &&
		!gs.f_sC1_partizan_entrance_intro &&
		!(gs.it_iron_1 == "inv" && gs.it_iron_2 == "inv")) {
		gs.f_sC1_partizan_entrance_intro = "done";
		return { action: "cs.partizanEntranceIntro" };
	}
});

SCRIPT_ADD("sC1", "cs.partizanEntranceIntro",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@popup_partizan:����������� ������� ������ � ��� ����\
 �����������. ����� �� ��� ��� ������������ ���������."
	});
});

SCRIPT_ADD("sC1", "preControl",
async function partizanOnOff(s, {gs, tmps, st}) {
	if ((gs.local.enterFromBottom || gs.local.enterFromTop) &&
		gs.it_iron_1 == "inv" && gs.it_iron_2 == "inv") {
		st.object("nv_partizan_ctl_C1").state = "off";
		var stHero = st.object("hero");
		stHero.playAnimation({
			animationId: "HeroStand",
			atPosition: stHero.position
		});
		if (!gs.f_sC1_partizan_hide_intro) {
			gs.f_sC1_partizan_hide_intro = "done";
			await st.popup(s, {
				text: "@popup_partizan_hide:�� ��������� ������� �� ����\
 ������ ��������� ��������, ��� �� ���� ��� ��� �������, � ����������."
			});
		}
	} else {
		st.object("nv_partizan_ctl_C1").state = "on";
	}
});

SCRIPT_ADD("sC1", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sC1";
	tmps.medvedFlagToSet = "f_medved_detected_sC1";
	tmps.medvedFlagRequired = "f_medved_detected_sD1";
});

SCRIPT_ADD("sC1", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_resist_more:������, �������� ���� �������� �������\
 ������. �� ���� ������� ������������� ������������, �� ����� �������, �\
 ���������� ����������� ���������. ����� ������������� ����-�� �� �����..."
	});
});

//
// sB2 (dolgostroy)
//

SCRIPT_ADD("sB2", "daemon",
async function(s, {gs, tmps, st}) {
	if (gs.f_dacha_on) {
		st.setScreenTitle("@s_dacha:���� ���������� ��������");
	} else if (gs.f_station_on) {
		st.setScreenTitle("@s_station:������� \"������ \"�������� �����\"\"");
	}
});

SCRIPT_ADD("sB2", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_B2").position;
	}
});

SCRIPT_ADD("sB2", "daemon",
async function(s, {gs, tmps, st, action}) {
	if (gs.f_station_on) {
		var stTrainCtl = st.object("nv_train_ctl_B2");
		stTrainCtl.stopped = true;
		stTrainCtl.currentPhase = 15.5;
	}
});

SCRIPT_ADD("sB2", "cs.whatTheFuck",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@wtf_did_you_build:�� � �� �� ��� �� ����� ���������, �� ����?!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:�������������:",
		text: "@dacha_boss:����, ����������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@why_dacha_near_railroad:� �� ����� ����� ���� ������� �\
 �������?! ���� �������� ����� ������� � ���� ������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:�������������:",
		text: "..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@deconstruct_and_wait:�������-�� ���������� ��� � ������ ����,\
 � ����� - � ��� ����� �����, ��� ������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:�������������:",
		text: "@ruf:�-���!"
	});

	return { action: "cs.deconstructDacha" };
});

SCRIPT_ADD("sB2", "cs.deconstructDacha",
async function deconstructDacha(s, {gs, tmps, st, action}) {
	gs.f_cut_scene = true;
	var heroScreen = gs.currentScreen,
		heroPoint = st.object("hero").position;

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sB2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	st.object("nv_train_ctl_B2").state = "off";
	st.object("gast_wol_work").state = "on";
	st.object("gast_gre_work").state = "on";
	st.object("gast_leo_work").state = "on";

	hlsfxPlaySFX({ sfxId: "construct" });

	var
		stDolgostroy = st.object("dolgostroy"),
		stDacha = st.object("dacha"),
		stStation = st.object("station"),
		stConstruction = st.object("@construction");
	stDacha.state = "out";
	stDolgostroy.state = "in";
	var consAnim = stConstruction.playAnimation({
		animationId: "ConstructionOut",
		atPosition: stDacha.position
	});

	await s.anyOf(consAnim);
	hlsfxStopSFX({ sfxId: "construct" });
	st.object("gast_wol_work").state = "off";
	st.object("gast_gre_work").state = "off";
	st.object("gast_leo_work").state = "off";

	gs.f_dacha_on = false;
	stDacha.state = "on";
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.waitTicks(s, 60);
	
	gs.f_cut_scene = false;
	gs.heroPoint = heroPoint;
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: heroScreen,
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});
	st.object("hero").position = heroPoint;

	return { action: "cs.theyNeedProject" };
});

SCRIPT_ADD("sB2", "cs.theyNeedProject",
async function theyNeedProject(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m2",
		header: "@hero_says:�����:",
		text: "@they_need_project:��� �������, ����� ���, ������ � �����\
 �� �������... ����� ���� �� ���������� ������������ ������."
	});
});

SCRIPT_ADD("sB2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_station_on &&
		action.itemId == "it_project" &&
		action.hotspotId == "hs_gasters_B2") {
		return { action: "cs.hereIsWhatYouMustBuild" };
	}
});

SCRIPT_ADD("sB2", "cs.hereIsWhatYouMustBuild",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@here_is_what_to_build:������, ���� ��������� ��� ���...\
 �������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_default",
		header: "@gasters_say:�������������:",
		text: "@ruf:�-���!"
	});

	return { action: "cs.constructStation" };
});

SCRIPT_ADD("sB2", "cs.constructStation",
async function constructStation(s, {gs, tmps, st, action}) {
	gs.f_cut_scene = true;
	var heroScreen = gs.currentScreen,
		heroPoint = st.object("hero").position;

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sB2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	var stTrainCtl = st.object("nv_train_ctl_B2");
	stTrainCtl.state = "off";
	st.object("gast_wol_work").state = "on";
	st.object("gast_gre_work").state = "on";
	st.object("gast_leo_work").state = "on";

	hlsfxPlaySFX({ sfxId: "construct" });

	var
		stDolgostroy = st.object("dolgostroy"),
		stDacha = st.object("dacha"),
		stStation = st.object("station"),
		stConstruction = st.object("@construction");
	stStation.state = "in";
	stDolgostroy.state = "out";
	var consAnim = stConstruction.playAnimation({
		animationId: "ConstructionIn",
		atPosition: stStation.position
	});

	await s.anyOf(consAnim);
	hlsfxStopSFX({ sfxId: "construct" });
	st.object("gast_wol_work").state = "off";
	st.object("gast_gre_work").state = "off";
	st.object("gast_leo_work").state = "off";

	gs.f_station_on = true;
	stStation.state = "on";
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.waitTicks(s, 60);

	// spawn kassa
	hlsfxPlaySFX({ sfxId: "placement" });
	gs.f_kassa_on = true;
	st.object("kassa").state = "on";
	await st.waitTicks(s, 30);

	// show train
	st.object("tunnel_left").state = "on-cs";
	stTrainCtl.currentPhase = 0;
	stTrainCtl.state = "pass-on";
	stTrainCtl.stopped = false;

	while (stTrainCtl.currentPhase < 15.5) {
		await st.waitTicks(s, 1);
	}
	stTrainCtl.stopped = true;
	await st.waitTicks(s, 60);
	
	gs.f_cut_scene = false;
	gs.heroPoint = heroPoint;
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: heroScreen,
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});
	st.object("hero").position = heroPoint;
	st.discardPickableItem({ gs: gs, itemId: "it_project" });
});

SCRIPT_ADD("sB2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_ticket" &&
		action.hotspotId == "hs_enter_train") {
		if (gs.f_railswitch_up) {
			return { action: "cs.departurePhayl" };
		} else {
			return { action: "cs.departureSuccess" };
		}
	}

	if (action.itemId == "it_proc_id" &&
		action.hotspotId == "hs_enter_train") {
		return { action: "cs.tryFreeRide" };
	}
});

SCRIPT_ADD("sB2", "cs.tryFreeRide",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m3",
		header: "@hero_says:�����:",
		text: "@i_have_right_for_free_ride:� - �������������� �����������\
 ��������� � ���� ����� �� ���������� ������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_conductor",
		header: "@conductor_says:���������:",
		text: "@i_dont_care_ticket_only:���� �� ����. ������ ��� ������ ��\
 ������ - ������, �� �����! ���, � ����� ������� - ��� ��� ����� �������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@ppz_lived_up_to:��� �� ���� � ������ ���������� -\
 ���������������� ����������� ��������� �� �������!.."
	});
});

SCRIPT_ADD("sB2", "ac.tryBuyTicket",
async function(s, {gs, tmps, st, action}) {
	if (gs.it_proc_id == "inv") {
		return { action: "cs.tryBuyTicketForFree" };
	} else if (gs.tugriks_collected >= 20) {
		return { action: "cs.buyTicketSuccess" };
	} else {
		return { action: "cs.buyTicketPhayl" };
	}
});

SCRIPT_ADD("sB2", "cs.tryBuyTicketForFree",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m3",
		header: "@hero_says:�����:",
		text: "@i_have_right_for_free_ticket:� - �������������� �����������\
 ��������� � ������ ���� �������� ���������� ����� �� ���������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:������:",
		text: "@the_id_is_invalid:����� �� ���������� �� ���������, � ����\
 ������ - 31 �������. �� ������� �������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@blin:����."
	});

	await st.popup(s, {
		text: "@popup_hero_had_big_plans:� � �����-�� ��� ���� ������� �����\
 �� ������������ �������� � ������������... ��, ������, �������� ��������\
 �������, � ���������� �����������. ������ ����, �� ��������� ������� �������."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_proc_id" });
});

SCRIPT_ADD("sB2", "cs.buyTicketPhayl",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@ticket_to_murmansk_please:���� ����� �� ���������, ����������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:������:",
		text: "@20_tugriks:20 ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@blin:����."
	});

	await st.popup(s, {
		text: "@popup_hero_had_not_enough_money:� ����� �� ���� �������\
 ��������. ������ �� ����������, ����� ��� �������� �� ������..."
	});
});

SCRIPT_ADD("sB2", "cs.buyTicketSuccess",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@ticket_to_murmansk_please:���� ����� �� ���������, ����������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:������:",
		text: "@20_tugriks:20 ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@here_you_hold:�������, ��������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:������:",
		text: "@thanks_and_here_is_a_discount:������, ����������! ���, ���\
 ������� ����������, ��������������� ������ � 5 ��������! ��� ��� �����, ���\
 ���� ������."
	});

	gs.it_ticket_enabled = true;
	st.setTugrikCount({
		gs: gs,
		value: st.getTugrikCount({gs}) - 15
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@could_it_be_15:� ��� ������ ���� ����� �� 15 �������� �������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:������:",
		text: "@NO:���."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@ok_fuck_you:�� � �����, ���� � ����. ��� ��� �� �� 5 ��������\
 ����� ������? ����������� ����� ����� ���, � �� ����� ��� ������-��... ��\
 �����, ��� ������ ��� ��������."
	});

});

SCRIPT_ADD("sB2", "cs.departurePhayl",
async function departurePhayl(s, {gs, tmps, st, action}) {
	await S_animateAndMove(s, {
		st,
		entId: "hero",
		fromLocId: "hs_enter_train",
		animMove: "HeroWalkDown",
		moveTickEvent: "step",
		rate: 4,
		toLocId: "loc_in_train",
		animTo: "-"
	});

	await st.waitTicks(s, 30);
	await st.popup(s, {
		text: "@popup_hero_boards_train:����� ��� � ����� � ������..."
	});

	gs.f_cut_scene = true;
	gs.f_railswitch_up = true;
	// ^precaution to ensure this scene finishes playing consistently
	hlsfxPlayMusic({ sfxId: "music_1" });

	st.object("nv_train_ctl_B2").stopped = false;
	await st.waitTicks(s, 60);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sC2",
		transOutVeilType: "right-in",
		transInVeilType: "left-out"
	});

	st.object("nv_train_ctl_C2").state = "pass-on";
	st.object("nv_train_ctl_C2").currentPhase = 0;
	st.object("nv_train_ctl_C2").stopped = false;
	await st.waitTicks(s, 120);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD2",
		transOutVeilType: "right-in",
		transInVeilType: "left-out"
	});

	st.object("nv_train_ctl_D2b").state = "pass-on";
	st.object("nv_train_ctl_D2b").currentPhase = 0;
	st.object("nv_train_ctl_D2b").stopped = false;
	st.object("tunnel_up").state = "on-cs";
	await st.waitTicks(s, 120);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD1",
		transOutVeilType: "up-in",
		transInVeilType: "down-out"
	});

	st.object("nv_train_ctl_D1").state = "pass-on";
	st.object("nv_train_ctl_D1").currentPhase = 0;
	st.object("nv_train_ctl_D1").stopped = false;
	st.object("tunnel_down").state = "on-cs";
	await st.waitTicks(s, 120);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD0",
		transOutVeilType: "up-in",
		transInVeilType: "down-out"
	});

	st.object("nv_train_ctl_D0").state = "pass-on";
	st.object("nv_train_ctl_D0").currentPhase = 0;
	st.object("nv_train_ctl_D0").stopped = false;
	await st.waitTicks(s, 120);
	hlsfxPlayMusic({ sfxId: "music_abort" });

	await s.anyOf(st.entScreenSink.event("trainIncoming"));
	var gameover = !S_reduceHP({gs, st, minusHP: 5});
	st.object("nv_train_ctl_D0").stopped = true;
	await st.waitTicks(s, 40);
	await st.popup(s, {
		text: "@popup_hero_forgot:...�� �� ����� ���-��� �������."
	});

	if (gameover) {
		return { action: "ac.heroHit", cause: "aftermath" };
	}

	gs.f_cut_scene = false;
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sB2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});
	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_B2").position;
	return { action: "ac.heroRespawn" };
});

SCRIPT_ADD("sB2", "cs.departureSuccess",
async function departureSuccess(s, {gs, tmps, st, action}) {
	// this is actually the final victory cut scene script

	await S_animateAndMove(s, {
		st,
		entId: "hero",
		fromLocId: "hs_enter_train",
		animMove: "HeroWalkDown",
		moveTickEvent: "step",
		rate: 4,
		toLocId: "loc_in_train",
		animTo: "-"
	});

	await st.waitTicks(s, 30);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@hero_heres_my_ticket:��� ��� �����. ������� � ��������,\
 ���������� - � ���� ������� �� ������ � ���������!"
	});

	await st.waitTicks(s, 30);

	gs.f_cut_scene = true;
	gs.f_railswitch_up = false;
	// ^precaution to ensure this scene finishes playing consistently
	hlsfxPlayMusic({ sfxId: "music_3" });

	await S_animateAndMove(s, {
		st,
		entId: "@tankist",
		fromLocId: "loc_tankist_src_B2",
		animMove: "TankSkiMoveDown",
		moveTickEvent: "step",
		rate: 8,
		toLocId: "loc_tankist_dst_B2",
		animTo: "TankSkiStandDown"
	});

	await st.waitTicks(s, 30);
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@tankist_here_you_are:��-�� �� ���, �����! ��-�� ��� ����,\
 ��� ������� ����!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:�����:",
		text: "@hero_deliver_quicker_please:��������� ���������� ���������,\
 ����������. ��� ����� ������� �������..."
	});

	st.object("nv_train_ctl_B2").stopped = false;
	await st.waitTicks(s, 90);
	st.object("nv_train_ctl_B2").stopped = true;

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:������ �������:",
		text: "@tankist_halt_fucker:������, �����!"
	});
	await st.waitTicks(s, 30);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD2",
		transOutVeilType: "right-in",
		transInVeilType: "left-out"
	});

	await st.popup(s, {
		text: "@popup_hero_goes_to_murmansk:����, ����� ����� �������,\
 ��������� �����������, ������� ���� ��������, �������� � ���� �� ����,\
 � ���� ���������� � ��������..."
	});

	st.object("tunnel_right").state = "on-cs";
	st.object("nv_train_ctl_D2a").state = "pass-on";
	st.object("nv_train_ctl_D2a").currentPhase = 0;
	st.object("nv_train_ctl_D2a").stopped = false;
	await st.waitTicks(s, 120);

	st.object("nv_train_ctl_D2a").stopped = true;

	await st.popup(s, {
		text: "@popup_what_waits_him:��� ��� ��� � ��-152� � ������ ��������\
 ������?|\
\n������ ���������� � ������� ���������������� ������������ �������?|\
\n����� ����� �� �������� ��������� ������� �������-����?|\
\n��� �� �������� �������� � ��������� � � �������� ������ �� ������ ����� �\
 ���������� ���� ������, � � ����� �����?"
	});

	await S_animateAndMove(s, {
		st,
		entId: "@tankist",
		fromLocId: "loc_tankist_src_D2",
		animMove: "TankSkiMoveRight",
		moveTickEvent: "step",
		rate: 8,
		toLocId: "loc_tankist_dst_D2"
	});

	await st.waitTicks(s, 60);
	await st.popup(s, {
		text: "@popup_what_waits_tankist:��� �������� ������ ��� �������\
 ��������?|\n����� �������� � ��������� ���� ��� �� ������?|\n������ ��\
 �� � �������� ������ ����������� ����� �������� ������������� � �������\
 ���������� ������� � ���������?|\n�� ����� ���������� � ������� ��� ���������\
 �������� ����������� ������� ���������?|\
\n��� ��� ���� � ������ ������..."
	});

	hlsfxPlayMusic({ sfxId: "music_abort" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_troll",
		header: "@title_you_wont_learn:...�� �� �������.",
		text: "@popup_no_pay_no_sequel:������ �� ���������, ���� �� �����.\
 ���� ����."
	});

	gs.ach_win = true;

	var achs = [
		['ach_debil', 1],
		['ach_delivery', 19],
		['ach_win', 51],
		['ach_pribor', 19],
		['ach_patefon', 9],
		['ach_secret', 39],
		['ach_money_dont_stink', 8]
	];
	var achTexts = new Array(), score = 0;
	for (var ach of achs) {
		var achId = ach[0], achScore = ach[1];
		if (gs[achId]) {
			score += achScore;
			achTexts.push("\u2713 " + achId + " = " + achScore + "%");
		} else {
			achTexts.push("\u2717 " + achId + " = 0");
		}
	}

	hlsfxPlayMusic({ sfxId: "music_gameover" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_success",
		header: "@win_header:�� ��������!",
		text: "@win_total_text:������� �����������:@:\n" +
			achTexts.join("\n") +
			"\n@total:�����:@: " + score + "%"
	});

	// postscriptum
	gs.f_cut_scene = true;
	gs.f_stalker_done = true;

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sA4",
		transOutVeilType: "black-in",
		transInVeilType: "black-out"
	});
	await st.waitTicks(s, 30);

	gs.f_cut_scene = false;
	var stGoldBall = st.object("it_goldball_working");

	st.playParticle({
		particleId: "teleport_in",
		atPosition: stGoldBall.position
	});
	await st.waitTicks(s, 30);
	stGoldBall.state = "on";

	await st.waitTicks(s, 120);
	await st.popup(s, {
		text: "@popup_goldball_waited:������� ��� ��� �������.\
 � �� ����� ���� �����..."
	});

	await st.waitTicks(s, 60);
	stGoldBall.state = "on-sviborg";

	await st.waitTicks(s, 240);

	return {
		action: "gameOver",
		win: true
	};
});

SCRIPT_ADD("sB2", "cs.inspectDirections",
async function inspectDirections(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		header: "@sign_directions:�������� �����������",
		text: "@directions:������� � �������: \u2190 2 ������\
\n��������: \u2192 �� �����\
\n������: \u2193 ��� ������ �� �����\
\n������: \u2193 1 �����\
\n������: \u25CF ����� ��� (� �. �., �� �� ������)\
\n������: \u2190\u2193\u2191\u2192 �� ��������������� � �� �������������"
	});

	if (gs.it_mk152) {
		var stHero = st.object("hero");
		await s.anyOf(stHero.playAnimation({
			animationId: "HeroPuzzled",
			atPosition: stHero.position
		}));

		await st.popup(s, {
			text: "@hero_didnt_think_but:����� ������ ���-�� �� �������� �����\
 ����� ��������, �� ������ ��� ������� �� ��������. �� ����, ���� ��������� �\
 ��������� ��������, �� ����, ��� ��� ����� ���� �� ���� ���������.\
\n�������� ���� � ���, ����� �������� ������� ����� ���� �� �����������. ���\
 ������� �������� ��������� ����, ������������ ������ ��������� ���������\
 ������� ������� ������ ������������.\
\n����������� ��������� �������, ����� ���������� ���� �������."
		});

		gs.f_directions_read = true;
	}
});

//
// sB3 (kolhoz entrance)
//

SCRIPT_ADD("sB3", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_B3").position;
		// also prevent hero position from being on first tractor's track
		var stHero = st.object("hero");
		console.log(st.object("nv_pig_ctl_B3"));
		st.object("nv_pig_ctl_B3").setExclusionPoint(stHero.position);
	}
});

SCRIPT_ADD("sB3", "daemon",
async function retreatFromCow(s, {gs, tmps, st}) {
	for (; !gs.f_cow_off;) {
		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (gs.f_cow_off) {
			// might turn off in the background
			break;
		}

		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_hero_cow_unsafe" })) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.retreat"
			});
		}
	}
});

SCRIPT_ADD("sB3", "cs.retreat",
async function(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero");
	var retreatPos = {
		x: stHero.position.x,
		y: st.object("loc_hero_cow_retreat").position.y
	};

	await st.popup(s, {
		text: "@hero_felt_unsafe:���������� ����� ��������� �����, ��� ������\
 ���� ��������� ����� ����� �� ��������. ����� ��������, �� �� ���� ������� �\
 ���������."
	});

	await s.anyOf(stHero.playAnimation({
		animationId: "HeroWalkUp",
		moveAnimationId: "MoveAtRate",
		parameters: {
			RATE: GameConst.HERO_STEP_SIZE
		},
		moveTickEvent: "step",
		moveFrom: stHero.position,
		moveTo: retreatPos
	}));
});

SCRIPT_ADD("sB3", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_pistol" &&
		action.hotspotId == "hs_cow_interact") {
		return { action: "cs.cowTryPistol" };
	}
});

SCRIPT_ADD("sB3", "cs.cowTryPistol",
async function tryPistol(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@cow_pistol_not_work:�������� ����������� ��� ��������� �\
 ������, ����� �����, ��� ��� ����� �������� ������� �� ��������� � ����.\
 � ������, � ������. �������� ��� ������� � ��� �����, � �������� ��� ������.\
 � ������ � ��� �� �� ����� ����� ������."
	});
});

SCRIPT_ADD("sB3", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_grenade" &&
		action.hotspotId == "hs_cow_interact") {
		return { action: "cs.cowTryGrenade" };
	}
});

SCRIPT_ADD("sB3", "cs.cowTryGrenade",
async function tryGrenade(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@cow_grenade_not_work:������, ��� ������ ����������� � ������\
 �������, ����� ��������, ��� ���������� ������� �� ����� � ����� �� ����\
 ����."
	});
});

SCRIPT_ADD("sB3", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_hren" &&
		action.hotspotId == "hs_cow_interact") {
		return { action: "cs.feedHren" };
	}
});

SCRIPT_ADD("sB3", "cs.feedHren",
async function(s, {gs, tmps, st}) {
	st.discardPickableItem({ gs: gs, itemId: "it_hren" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_cow",
		text: "@the_difficulty_was:����� ������� �������� ��������� ��������\
 ������ ����� ������ �������. Ҹ���� ������ ������� �� ������������ ���������\
 �� ����� ��������� ������, ���� �� �������� ������� �� ��������� ��������,\
 �� ���� ������ ��������, ��� ������� ������ �����, ��� �������, �����������.\
 � ��������� ����� ���� ������, �������� ������ ����� �� �� ��������������\
 ���������...\
\n� �������, ������ �������� ��������� ������������ � ���������, � ������\
 ���������, ��� ���� ������ ������� ����������� ��������� � ����� �������\
 ���������."
	});
	hlsfxPlaySFX({ sfxId: "chpok" });

	gs.f_cow_off = true;
	gs.it_rake_enabled = true;
	st.updateSceneToGameState({});
});

SCRIPT_ADD("sB3", "daemon",
async function observePig(s, {gs, tmps, st}) {
	for (;;) {
		if (gs.f_pig_on) {
			break;
		}

		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_observe_pig" })) {
			gs.f_pig_on = true;
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.pigOn"
			});
		}
	}
});

SCRIPT_ADD("sB3", "cs.pigOn",
async function activatePig(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});

	hlsfxPlaySFX({ sfxId: "tractor_honk" });
	await st.waitTicks(s, 60);

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_pig",
		header: "@pig_says:������ ������:",
		text: "@pig_way_to_the_port:���-���� ��������, ����-�������!\n\
���-������ �� ��-������-����!"
	});
	st.object("nv_pig_ctl_B3").state = "on";

	await s.anyOf(st.entScreenSink.event("tractorOut"));
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_pig",
		header: "@pig_says:������ ������:",
		text: "@pig_freedom_do_emigration:�-�����-���-�������!\n\
��-������ �����-����-����!"
	});

	await stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	});

	await st.popup(s, {
		text: "@intro_looks_like_go_careful:�� ��������� ������ ����������\
 ������������� � ������� �������������. ������, ���� �� �������� ����� �����\
 ��� ������������ ���������� � ������� �������� � ������������ ��������, ��\
 ������ ���������, ��������� ��������� ������ ������, ����������� �������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:�����:",
		text: "@hero_he_doesnt_love_fatherland:������ ����������. �������!"
	});
});

SCRIPT_ADD("sB3", "cs.readNewsPost",
async function readNewsPost(s, {gs, tmps, st, action}) {
	var p;
	for (;;) {
		p = await st.popup(s, {
			text: "@newspost_intro:���� ��������, ��� ������ ��������� ���\
 ���������� ��������� � ������� �������� ��������� �� �������. �� ������\
 ������� �����. ����� ��� ������ �� ����� ��������...",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_1_hdr:������� ��������",
			text: "@newspost_1_txt:������������ �� ��� ��� �� �������� ��\
 ������������ � �������. ������� ������� ����� ��������, � �����-���� � ������\
 �������?!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_2_hdr:������� ������������ ����������",
			text: "@newspost_2_txt:���������� ������ ������� ��������� ��\
 �������� ������. ������������� �������������, ������ ������� ������� �\
 ������-������� �� �������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_3_hdr:������� �����������",
			text: "@newspost_3_txt:�������, ��� ��� ����� ���������� ������\
 ������� � ����� ������ �� �������, �� ��� ��� ��������� �� ����������\
 �������. �� ����� ����������� ������ �� ��� ��� �� ����� ��������� � ��������\
 ������. ������� � ��������� ���������� ������������� �� ������� �\
 �������������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_4_hdr:������� �����������",
			text: "@newspost_4_txt:��������� ������ �4 (�� ���-������)\
 ����������� �� ������������ �������� (� ����� � �������������). ����������\
 ����� �������� ����� ������-�������������� ��������������, � ��� ���������\
 ��������� ������������� �������� ���� ����. ������ � ��������� ����������� �\
 ����������� ������� ���������������. �� ����� ��� ���������� ������� � ������\
 ������������ ������������ ����� ��������� �������� �5 (�� �����, �� �����).",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_5_hdr:������� �����������",
			text: "@newspost_5_txt:������ �� �������! ���� �� ������ ������,\
 ����� �������.\n������ �.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_6_hdr:������� ����� � �������",
			text: "@newspost_6_txt:���������� ��������������� �����������, ��\
 ������� �� ������ ������ ���������, ������ �� ����� ������� ����\
 ������������ � ����� �������. �� ��������� ������ �� ������ �������\
 ������������ ���� ���������� ������ � ��������� ������� ������� �����\
 ������������� ����� ��������� �����������, � ������ - ����� ����������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_7_hdr:������� �� ����������� �����������",
			text: "@newspost_7_txt:����� �� ��������. ���������!!!\
\n\n(������� ������� �� ������ \"��� ����� � ����� ������������� �������\
 ��-0001, ������������ ������ ��� ���\", � ��������� �������� � ��� �������.)",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_8_hdr:������� ������������� ��������",
			text: "@newspost_8_txt:������������ ������ ���������� �������������\
 ������������� ��������� �� ��������� ������� �������� ��������� � �����\
 ��������. ���� ���, ������ �������, ������ �� ����� ������������� ����.\
 ����� � ���� ��������� ���� � � ������� ��������������� ����� � �����\
 ����������� ��������� ����������� ������ � ������������ �����������, ���\
 ������������������ � ������ ��������� ��� ����������� � ����.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_9_hdr:������� ������������ �������",
			text: "@newspost_9_txt:�������� ���������! ������������ �������\
 ���������� �������� ������������� ����������� ����� ��� ������������ � ����\
 ����. ��� ��������������� � ������������������. ���������� �� ���������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_10_hdr:������� ��������",
			text: "@newspost_10_txt:��� ������, ��������� ���� �����\
 ������������ ��������, ���� � ���������� ������, �������� ���������� �� �����\
 ������ � ������� �����, ����������� � ������������ �����������������. ���\
 ��� �������������� ���������� ������:\
\n\n����� ����� �� ����, ���������� �� ���,\
\n� ����� ����� �� ������,\
\n� ���� ����������, ���� ���� ������,\
\n���� �� ���� �� ��������.\
\n�� ����, ���������, ��������� � �������\
\n������ ������ ����������� ������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_11_hdr:������� ����������������",
			text: "@newspost_11_txt:���� �� ������� 14 - ���! � ��� �������\
 ����� �����!\
\n���� �� ������� 88",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_12_hdr:������� �������",
			text: "@newspost_12_txt:� ���� ���� ������ ������� �����������\
 ��������� ������, � ����� � ��� �� �������� � ��������� ��� ��������� � �����\
 ������� ������ � ������� ���������. ��������� ����������� ����������, ���\
 ��� ����� 40 ���, ��� �������� � ��� ��������. ������� ��������� ���������,\
 ���, ��-������, � ������� �� ���� ����������, �������� ������� ����� ��������\
 ���� ���������, ��� ������ �� ���������� ��� ��� �� ������� ��� �\
 ������������� ��� � ������ 1973 ����, ����� ��� ���� ���� ������� ������\
 �����������. � ���� ��� ���� - � ��� ��-������ - ������, ��� ������ ��� �����\
 ��� ��������. � ��� �� ��� �� ����������� � ����� ������ �������...",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_13_hdr:������� �� �������",
			text: "@newspost_13_txt:�� ���������� ��������� ���, ������� ����\
 ������ �����. \"�������\", - ������� ������� ������������������ ������� ��\
 ������ �������� � ������������. �������� ������ �� ������������.",
	 		enableSkip: true
		});
		if (p.skipped) break;


		p = await st.popup(s, {
			header: "@newspost_14_hdr:������� � ������ �����������",
			text: "@newspost_14_txt:� N-���� ������ ���������� �����������\
 �����. ������ ���������� ��� ������ � ����������� ����� � ���� �����������\
 ������������ ��������� ����������� �������� ��������. ������ ���������� �.\
 �� ����� �������� ������ �������� �����, �� �������� ���� ������ ������,\
 � ��� ������� ��� �������� �������� �� ������������ ������� \"������� �����\
 ������������ �����...\" ����� ���, �. ������� ������� ����� �������� ������,\
 �� �������� �������� � ������ ���������, ���� ������� ���������� ��\
 ��������, ��� ������ ���� ����� ����� � ������� ������ � ����� \"�����\".",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_15_hdr:������� �������",
			text: "@newspost_15_txt:� ����� � ���, ��� ������� PYPSI\
 �� ���������� ������� ���������, � ������ ���� � �������� � �������\
 �������� �� ��������������. �� �� ������, �������, � ����� �� �����, �����\
 ������� ������, � ��� ��� ����, � �� ����� ������.",
	 		enableSkip: true
		});
		if (p.skipped) break;


		p = await st.popup(s, {
			header: "@newspost_16_hdr:������� �����������",
			text: "@newspost_16_txt:�������� �������� �-� �. ����� �����������\
 ������� �����, ������������, ��� ������� - �� ���������� ������ ���������,\
 � ��������������� ����. �-� ����� ����������� � ���� ��������� �������������\
 ����� ��������������� ������, ��������, ��� ��������� �������� �� �\
 ���������� �������, � � ������, � ������ ����������� �����.\
\n������� ���������� ������� ��������� ������������, ������� �-�� ������\
 � ���������������� ������������, ������������� � ������������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_17_hdr:������� �� ������ ������",
			text: "@newspost_17_txt:�� ������������ ����������, ������,\
 ������� ������ �������� - ��� �� ���, � ����, ���������� �������� �������\
 ������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_18_hdr:������� �������",
			text: "@newspost_18_txt:24 ���� 13 �����. ����� ������� �������\
 ������ ����� ������ ������� �������������� ����������� � ������� ������ �.\
 � ��������� �������� ��������� ���������������� ��������� ������ �-�����\
 ���������������, � ������� ����� ����� ��������� ��������� ������ ��� ��.\
 ������� ��������� ������ ���� �� ��������. �������������� �� �������� ���\
 ������������.\
\n�� ������������� ���� ��������� �� ���������, �������� � � ������� �,\
 �������������� � ��������� ������ ������������������ � �-���� ���������\
 �������� � � ������� \"�� ��� �� ������ � �������, �-�-�����!\" ��������\
 ������ ������� ��������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_19_hdr:������� ����� ������",
			text: "@newspost_19_txt:13 ���� �������� ������� ������������\
 ������� ������ �������������� ���� ����� ��������� �������� ����� �������\
 ����� �����������. �������� ������������ �� ����������� �����������,\
 ��������� �������� ��� ������� ������ - �� ������������� ������� ������, �\
 �������� ��������� ���������, ������� ����� �� ������ ���������� ��������.\
 ��������� ���������, ���������� ����������� �������� ������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_20_hdr:��� ������� ����������������",
			text: "@newspost_20_txt:��� �� ����� ������ �������, ��� ������\
 �� ���������� ���������� ����. ��� �� ������, ���.\
\n���� �� ������� 14",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_21_hdr:������� ��������",
			text: "@newspost_21_txt:�� ���������� � ����, ������ �������\
 ����������� ��������� �������� � ������������ ������ ������� ����� ������\
 ������ ��������-����������, ������� �������� �� ���� � ������ ��������\
 �����. ����������� �������� ��������� ������. \"��, �� ����, �������� ���,\
 �������, �����, ��� ������ ����� ���������,\" - �������� ��������� ���\
 ������������� �����������, - \"�� ���� �� ��� ���� �� ��������� ��� �\
 ������.\"\
\n����������� ������� ������� ����������� ������ ��������� ��������\
 ����� ����������� ������������������� ����������, ������� ������ �� �����\
 ������ ��������, ���� �� �� ��������� �������� ����� ������� ���� � ���������\
 ������ ����� � ���������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_22_hdr:������� �����������",
			text: "@newspost_22_txt:������ ��������������� ��������� �\
 ��������� ��� ��������� �������� �������������. ��� ���������� ��������\
 ������, ����������� ���������� ����. �� ��������� �� ������ ������ ������\
 � ������������ �� �� ������������� �����������, ������������ ������� �\
 ������� � ��������. ���������� ����������� ����� ����� ����� �����������\
 ���������� �� ������������� l=\u03C0d, ��� ������������ ���� �����������\
 ������������-������� ������ �������, � ���������� �� ��������, ��������\
 ��������� � ������������� ���������� ������. ����� �����!\
\n� ��, ��� ��� ��� � ������� � ���������� ���������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_23_hdr:������� ��������� �������",
			text: "@newspost_23_txt:����� ������, �����! ��, � ����, ��� ��\
 ������ ������, �� ���� ������ ������. ��������� ������ �� ������, ����!\
 �������, �� ���� �������!\n������ �.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_24_hdr:������� �������������",
			text: "@newspost_24_txt:������� ������� ����������� ��������� ��\
 ���� �. �. ������� ������������ ��������� ������ ��������� ���������\
 ���������� � ����� ���������� �� ������ �� ���� �� �������� �������, � �����\
 � ���������, ���� ������, �� ���������, � ������������ ��� ��� ���������\
 ����������� �� �� ��������, ��������� � ������ ������. ��������� �������\
 ������������ �. �. �. �. �� ���� �������� �������� ������������� ����������\
 ���������� �� ��������� ������ ����������, ���� �������� ���������\
 ������������ �������� ��� ������ ������ � ����������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_25_hdr:������� �����������",
			text: "@newspost_25_txt:����� ���������� ��������� �� ������������\
 ����������� ���:\
\n\u25A1\u25A1�\u25A1\u25A1\u25A1\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_26_hdr:������� ���������",
			text: "@newspost_26_txt:��������� ���������� ��������� ������\
 ������ ����������� ��������� ������� �� ����� ������������� ������ ��\
 �������� ��������� �������.\
\n\n- �������� 1125 -\
\n�������: �������� ��������� ������� �������.\
\n�.�.: �����, �����, ����� ���� ������ �������� ���������. ����� ����������,\
 ��� - �������, �� ��� �����, ���. �����, �������� ����������.\
\n������� (����� �����, ������ �������): �-��, ���� �-������������������?..\
\n�.�.: ������, ���������� ���� ��� ���� � �������� ������.\
\n�������: ���?.. ����� ������?.. �-��... ������-�����... �����������... ����\
 ������������ ������������...\
\n�.�.: ������ �� ������ ��������. � ���� 15 �����.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_27_hdr:������� ������������",
			text: "@newspost_27_txt:�������� ��������, ������������ �\
 ��������� �� ������ \"���������\"! ������������ ���� �������� �� ���������\
 �� ����� �� IP-�������� ������ ������ �����. ������ �������� � ����������� �\
 ������������ � RFC-2549. ������� ������ ���������� �� ������� ����������\
 � �� ��������� ��� �������� ����������� ����.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_28_hdr:������� ����������� ���������",
			text: "@newspost_28_txt:���������� ���-����� ��������� ������\
 ������ ������������� �����, ������� ����� ������� �� ����� �����. ���\
 �������� ���������� �� ��� �������� - \"����� � ������ N\" - ��� ����� �\
 ����������� N, ��� N - ����� ������ �����. ���-����� ���������� �������������\
 ������� �������, � ������� � �������� ����� N ��������� ��� ���� �� ������,\
 � ��� ����� ������ ��������� ���� ������ � ������ ��������� ������������\
 �����.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_29_hdr:������� ������� �����������",
			text: "@newspost_29_txt:�������-������������ �������� � ����������\
 ��������� � ���� �������� ������ � �������������� ���� ����� �����, �������\
 ����������� � ����������� �� ������� ���� ��������� ������ �� ��������, ���\
 ������� ������ ������ ����, ����� � �������������, � �� ��������� -\
 ���������!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_30_hdr:������� ��� �� � ����",
			text: "@newspost_30_txt:� ������������, �� ����������� ����\
 ��������� � ����� ������� ������� �� �������� ��������� ������ � ���������\
 ������� �� ����������� ��������. \"����� ������� �� �����, ��� ����� �\
 ��������\", - ������ �� ����� ������ ��� ������� �� ������ ������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_31_hdr:������� �� ��� ��� ���",
			text: "@newspost_31_txt:������ \"N-���� ��������� �������\"\
 ��������:\
\n������� ��������� ��� �� ������ �������������� ��������� �������,\
 �����������, ��� � ������� �116 ��� ����� ������ �������� ������� �\
 �������� ���������� ������ ������������� ��������. �������� ������� �116\
 ���� ����� ���������, ��������� ����������, ��� ���������� �������� -\
 ������������� ������, ������������ �������� � ���������� �������� ��������\
 ���������� �����. � ��� �� �������� ��������� ����� �� ��������� �������\
 � ������� ����������� ��������, ������� ��� � ����������� ������������\
 �������� ������ �� �������� � ����������. � ��������� ����� �-�� �������\
 ����� �� �� �������������� ���������.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_32_hdr:������� ������������ �������������",
			text: "@newspost_32_txt:���������� ������������, ��� �����������\
 ���� �� ��������� - ��� �� ����, � ���. ������ ��� ����������� - ����������\
 ����������� � ���������, ������� ������������� ��� �� ������, � �������\
 ����������. ��� �� ���������� ������� - ����� ������ ��� �������?",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_33_hdr:������� ��� ��������",
			text: "@newspost_33_txt:������� ������� ����� ������� �� ���������\
 ��������� ���������� ����������� ��� ��� ��������� ��� ������, ���� �����\
 ������������ ��������. \"� - ����\", - ������� ������������ �� ��\
 �����������. � ����� �����, ��������� ��� \"�������� �������\", ��������\
 ����� ����: \"� ��-�����, �� �����!\" ������, � ������� �� �������������\
 ������, ��� ������ � ���� ���� �������� ��������������, � ������� ������\
 � ������� �����, ������� ��� �� � �������� ������������ ���������� �������.\
\n���������� ������������� �����, ������� ���������� ��� 15-�������� ������\
 � ������ ����������� �� ������� ����.\
\n���� �����, ���������!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		//hlsfxPlaySFX({ sfxId: "chimes" });
		await st.popup(s, {
			header: "@newspost_final_hdr:������� � ������ ������",
			text: "@newspost_final_txt:���������� �����, ���������� ���������\
 ������ � �������� ����, ������ �� ������� ����."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e3_m4",
			header: "@hero_says:�����:",
			text: "@ah_you_fuckin_paparazzi:�� �� � ������ ���������! ��� ��\
 ��� ����-�� ���������?.. ����� ������ ������ ���������!"
		});

		gs.f_tolchok_compromised = true;
		break;
	}
});

//
// sB4 (kolhoz barracks)
//

SCRIPT_ADD("sB4", "preControl",
async function determineRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;

		// the logic here is most easy to specify as -
		// the hero will respawn at the point he entered the screen
		var stHero = st.object("hero");
		if (!gs.local.heroRespawnPosition) {
			gs.local.heroRespawnPosition = stHero.position;
		}

		// also prevent hero position from being on first tractor's track
		st.object("nv_pig_ctl_B4").setExclusionPoint(stHero.position);
	}
});

SCRIPT_ADD("sB4", "daemon",
async function pigTauntStart(s, {gs, tmps, st, action}) {
	for (;;) {
		await s.anyOf(st.entScreenSink.event("tractorOut"));

		if (Math.random() < 0.6) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.pigTaunt"
			});
		}
	}
});

SCRIPT_ADD("sB4", "cs.pigTaunt",
async function pigTaunt(s, {gs, tmps, st, action}) {
	var texts = [
		"@pigs_you_are:���-�� �� �-��������!\
\n� � - ���-���������!",
		"@slaves_and_im_on_tractor:�-������� �-�������!\
\n� � - �� ��-������-�����!",
		"@yes_i_stole_it:���-���, �����, � �� ��-��������!\
\n���-������ ��-���� �������!",
		"@stick_in_shit_losers:��-��������� � ���-����, �����-����!\
\n� ��� ���-�� ������ ������!",
		"@my_beloved_aboard:��������! �����-�������!\
\n��-������� ���-��������!",
		"@born_in_slavery:�-�������� � �-���������!\
\n� ��-������ � ��� ��-�������!",
		"@kolhoz_bydlo:�-����� �����������!\
\n� � � ����� �-���������!",
		"@tushka_chuchelo:���� ������, ���� �������,\
 � ������ �� ��-����� �-����� ������!"
	];

	var i;
	do {
		i = Math.floor(Math.random() * texts.length);
	} while (i == tmps.prevTaunt);
	tmps.prevTaunt = i;
	var text = texts[i];

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_pig",
		header: "@pig_says:������ ������:",
		text: text
	});
});

SCRIPT_ADD("sB4", "preControl",
async function(s, {gs, tmps, st, action}) {
	if (gs.f_pig_off && !gs.f_hero_just_realized_B4) {
		return { action: "cs.heroJustRealized" };
	}
});

SCRIPT_ADD("sB4", "cs.heroJustRealized",
async function(s, {gs, tmps, st, action}) {
	gs.f_hero_just_realized_B4 = true;

	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@hero_just_realized_pig_mostly_flew_to_border:����� ������\
 ������ ������� ��������, ��� ��������������� ���� ������������ ������\
 �������� � ������� �������. ��� ��� �� ����������, ������� ��� ��������\
 ������� �����������, ������������� �� ��� ������ ��������?\
\n����� ������������ ������� ����� �� ����, ���� ��� �� ����� �� �����������\
 ����������, � ��� �� ������ ������� ������������� �������."
	});
});


//
// sB5 (stalker izba)
//

SCRIPT_ADD("sB5", "cs.awakeStalker",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:������� ������:",
		text: "@dont_touch_condmilk:�! �� ����� �����, �����!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@but_it_is_empty:��� ��� �� ����� ������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:������� ������:",
		text: "@ok_you_can_take_it:...|�� �����, ����."
	});

	gs.f_stalker_on = true;
});

SCRIPT_ADD("sB5", "cs.stalkerJoke",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@intro_condmilk_failed:����� ��������� ������� ����� ��-���\
 ��������, �� �� ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@but_it_is_nailed:��� ���... ��� � ���� ��������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:������� ������:",
		text: "@of_course_bugoga:����.|\n��������������!"
	});

	gs.f_stalker_joke = true;
});

SCRIPT_ADD("sB5", "cs.stalkerIntro",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@hero_appreciated_humor:����� ���������� �����, �� �������\
 �������������� ����. �� � ������ �������, �� ����� ������, ��� �� �������\
 ������� �������. ��� �������, ������ ����� ���� ��������� ��� ���� �������\
 � ����������� ������� � ����� ������� �������..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:�����:",
		text: "@who_are_you_good_man:� ��, ������ ������� � �����������\
 �������, ��� ��� ������? ��� �����-�����������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:������� ������:",
		text: "@how_else_can_you_live_here:� ��� ��� ����������-�� ��� �����?\
 ������� �, �������. ���, � ������, �� ����� �����. � ���� ��� ���� ������\
 ���-�� ��� �����������, �� ������ �����... ���� � ��� ����... �-�, � ���� �\
 ���..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@to_sum_up_address_for_habar:������ - ����� ������� �� ����\
 ����-������ ����������, �� ���� ���� ��������, ��� ��� ����� ����� ������ -\
 ��� �� ��� ���������. �������� ��������. �� ��������� �����, ���."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:�����:",
		text: "@theres_no_habar_and_no_zones:� ���, � �����-�� �������������,\
 ����� ��� �����-�� ����� �������? �� � ��� ����� �� � ������� ������ ����..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@heh_no_zones:��� ���-�� � ����� ������ ����? �-���! � �� ����\
 ���� ��������� �����? ��. � ���� �� ����� ���� - ��� ����� ��������. ������\
 ���������. ��� ����� �����, ��� ������������ - �� ��� � ���������� ������ ��\
 ����������."
 	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@and_no_director: � ��� ������������ �� ��������� �����...\
 �-�-�, ����� �����������... � �������, ������ ��, �� ����� ������. ����\
 �� ��� �� ����, �������, ��� ����� �����..."
	});

	gs.f_stalker_intro = true;
});

SCRIPT_ADD("sB5", "cs.stalkerOpenDeal",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@hey_stalker_theres_subject:������, �������, ���� ����. ������\
 � ���� ����� ��������� ������� ��� �������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@ah_golden_ball:�-�, ������� ���... ������� �����... �������,\
 ��� ��� �������, ���� �� ����������� ������� ���������. �� ������ �����\
 �����������, ��� ������� �� ����� � ��������, ����� � ����� ������ �������\
 � ���� �����������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@not_an_issue:�� ������. ������� � �������� - � ������ ��\
 ������! ��� ��� ��������� �����������..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@why_balalaika:� ���������-�� �����?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@so_then_a_deal:�� ��������, ��������, �������� ���? �� �\
 ������� - ������, ������������!"
	});

	gs.f_stalker_deal_open = true;
});

SCRIPT_ADD("sB5", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (gs.f_stalker_deal_open && action.hotspotId == "hs_stalker_talk_B5") {
		if (action.itemId == "it_balalaika" && gs.it_vodka != "inv") {
			return { action: "cs.stalkerBalalaikaIsGood" };
		} else if (action.itemId == "it_vodka" && gs.it_balalaika != "inv") {
			return { action: "cs.stalkerHonorarIsGood" };
		} else if ((action.itemId == "it_vodka" ||
			action.itemId == "it_balalaika") && gs.it_vodka == "inv" &&
			gs.it_balalaika == "inv") {
			return { action: "cs.stalkerCommitDeal" };
		}
	}
});


SCRIPT_ADD("sB5", "cs.stalkerBalalaikaIsGood",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@balalaika_is_good:���, ����� �����. ���� �� ���������."
	});
});

SCRIPT_ADD("sB5", "cs.stalkerHonorarIsGood",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@honorar_is_good:��, ����� ��, ��� �����! ������ ��� ���������\
 �����. ��� ��������� �����."
	});
});

SCRIPT_ADD("sB5", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_detector" &&
		action.hotspotId == "hs_stalker_talk_B5") {
		return { action: "cs.detectorIdentified" };
	}
});

SCRIPT_ADD("sB5", "cs.detectorIdentified",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@yes_this_is_my_device:��! �� �����. � � �� �����, ���� �� ���\
 �������-��... ������ ����� ����������, �� �� ����� ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@does_it_not_work:� ��� ���? �� ��������? ������ ����� �� ����?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@it_works_but:��������-�� ��������, � ������ - ����... ������\
 ��� ������ ����� ������ ������ - �����. � �����, ���� �� ����� � �����������.\
 � ��������� - �����, ��������� ����������."
	});

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m4",
		text: "@hero_not_happy_with_discovery:�� �������, ����� ����� �������\
 ��������, �����, ��� ������ �������� �����, ������������ ������������\
 ����������. ��, ��� ��� �����, ������ ��� ���������� ���� � ���� �������..."
	});

	gs.ach_pribor = true;
});

SCRIPT_ADD("sB5", "cs.stalkerCommitDeal",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@yes_perfect_lets_start:��! �������! ����� ��������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:�����:",
		text: "@why_balalaika_after_all:� �� ��, ����� ���������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:�������:",
		text: "@sha_pazan:��, �����! ��� ��� ������� - �� ��� �? ���� ������,\
 ��� ��� ��������� ����� - ������, �����! �� ����. ������� �� ���� � ��������\
 ����� - ���� �������, � ��� ��� ����-���� ��������."
	});

	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});

	st.playParticle({
		particleId: "teleport_out",
		atPosition: st.object("stalker_B5").position
	});
	await st.waitTicks(s, 30);
	st.object("stalker_B5").state = "off";
	await st.waitTicks(s, 60);

	st.discardPickableItem({ gs: gs, itemId: "it_balalaika" });
	st.discardPickableItem({ gs: gs, itemId: "it_vodka" });
	gs.f_stalker_done = true;
});


//
// sC2 (corovan road)
//

SCRIPT_ADD("sC2", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_C2").position;
	}
});

SCRIPT_ADD("sC2", "preControl",
async function(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_sC2_intro) {
		gs.f_sC2_intro = "done";
		return { action: "cs.enterCorovanRoad" };
	}
});

SCRIPT_ADD("sC2", "cs.enterCorovanRoad",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@intro_corovan_road:��������, ���������� �� ���� ������,\
 �������� ������� ����� ���������� ���������. �� ��� ����, �������� �� �����\
 �� �����, � ���� � ���� ������ ��������� ������ ��������� ��� �������������\
 �������: ������ ����� ��������, � ���� �������� - ���� ���������.\n\
 � ��������, �� ������� ��������� ��� ������ �� ������. �� �����������\
 ��������� ����������� �������."
	});
});

SCRIPT_ADD("sC2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.hotspotId == "hs_holdup_spot") {
		if (action.itemId == "it_pistol" &&
			gs.it_grenade != "inv") {
			return { action: "cs.holdupPistol" };
		}

		if (action.itemId == "it_grenade" &&
			gs.it_pistol != "inv") {
			return { action: "cs.holdupGrenade" };
		}

		if ((action.itemId == "it_pistol" || action.itemId == "it_grenade") &&
			(gs.it_pistol == "inv" && gs.it_grenade == "inv")) {
			return { action: "cs.holdupSuccess" };
		}
	}
});

SCRIPT_ADD("sC2", "cs.holdupPistol",
async function(s, {gs, tmps, st}) {
	// note - switch to screen invalidates all entities
	// and resets tmps object
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sC2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	hlsfxPlayMusic({ sfxId: "music_1" });
	var stHero = st.object("hero"),
		stHoldupHitbox = st.object("loc_holdup_hitbox"),
		stTrainCtl = st.object("nv_train_ctl_C2");
	s.anyOf(stHero.playAnimation({
		animationId: "HeroHoldupPistol",
		atPosition: stHoldupHitbox.position
	}));
	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_C2").position;

	stTrainCtl.state = "off";
	stTrainCtl.currentPhase = 0;

	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_pistol:���� �����! ��� ����������!"
	});

	stTrainCtl.state = "on";
	await s.anyOf(stHoldupHitbox.ent.event("collisionEnter"));
	stHero.hide();
	return {
		action: "ac.heroHit",
		cause: "train_fail_pistol",
		pos: stHoldupHitbox.position
	};
});

SCRIPT_ADD("sC2", "cs.holdupSuccess",
async function(s, {gs, tmps, st, action}) {
	// note - switch to screen invalidates all entities
	// and resets tmps object
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sC2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	hlsfxPlayMusic({ sfxId: "music_1" });
	var stHero = st.object("hero"),
		stHoldupHitbox = st.object("loc_holdup_hitbox"),
		stTrainCtl = st.object("nv_train_ctl_C2");
	s.anyOf(stHero.playAnimation({
		animationId: "HeroHoldupPistolGrenade",
		atPosition: stHoldupHitbox.position
	}));
	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_C2").position;

	stTrainCtl.state = "off";
	stTrainCtl.currentPhase = 0;

	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_grenade:������-������! � ������� � ��� ���\
 ������!"
	});

	stTrainCtl.state = "hleb-on";
	while (stTrainCtl.currentPhase < 12) {
		await st.waitTicks(s, 1);
	}

	stTrainCtl.stopped = true;
	hlsfxPlaySFX({ sfxId: "train_brake" });
	await st.waitTicks(s, 120);

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_givemoney:���� �����, �����!"
	});

	var fsbSpnRunners = [s.fork(), s.fork(), s.fork(), s.fork()];

	// fsb spn running out
	var fsbSpnAnimsOut = [
		{
			st: st,
			entId: "@fsb1",
			fromLocId: "loc_holdup_fsb_src_1",
			animFrom: "FSBSpecRightOutDown",
			animMove: "FSBSpecRunRight",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_dst_1",
			animTo: "FSBSpecAimLeft"
		},
		{
			st: st,
			entId: "@fsb2",
			fromLocId: "loc_holdup_fsb_src_2",
			animFrom: "FSBSpecRightOutUp",
			animMove: "FSBSpecRunRight",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_dst_2",
			animTo: "FSBSpecAimLeft"
		},
		{
			st: st,
			entId: "@fsb3",
			fromLocId: "loc_holdup_fsb_src_3",
			animFrom: "FSBSpecRightOutDown",
			animMove: "FSBSpecRunRight",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_dst_3",
			animTo: "FSBSpecAimRight"
		},
		{
			st: st,
			entId: "@fsb4",
			fromLocId: "loc_holdup_fsb_src_4",
			animFrom: "FSBSpecRightOutUp",
			animMove: "FSBSpecRunRight",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_dst_4",
			animTo: "FSBSpecAimRight"
		},
	];

	var fsbRunOuts = new Array();
	for (var i = 0; i < 4; i++) {
		fsbRunOuts.push(fsbSpnRunners[i].run(S_animateAndMove,
			fsbSpnAnimsOut[i]));
		await st.waitTicks(s, 15);
	}
	await s.allOf(...fsbRunOuts);

	// hero surrenders
	await st.waitTicks(s, 120);
	s.anyOf(stHero.playAnimation({
		animationId: "HeroHandsUp",
		atPosition: st.object("loc_holdup_hitbox").position
	}));

	hlsfxPlayMusic({ sfxId: "music_abort" });
	// drop grenade and pistol
	await s.allOf(
		s.fork().run(S_animateAndMove, {
			st,
			entId: "it_grenade",
			fromLocId: "loc_holdup_hitbox",
			animMove: "ItemGrenade",
			rate: 12,
			toLocId: "loc_holdup_drop_grenade",
		}),
		s.fork().run(S_animateAndMove, {
			st,
			entId: "it_pistol",
			fromLocId: "loc_holdup_hitbox",
			animMove: "ItemPistol",
			rate: 12,
			toLocId: "loc_holdup_drop_pistol",
		})
	);

	st.placePickableItem({
		gs: gs,
		itemId: "it_grenade",
		screen: gs.currentScreen,
		atTile: st.screenPosToTilePos(st.object(
			"loc_holdup_drop_grenade").position),
		updateScene: false
	});
	st.placePickableItem({
		gs: gs,
		itemId: "it_pistol",
		screen: gs.currentScreen,
		atTile: st.screenPosToTilePos(st.object(
			"loc_holdup_drop_pistol").position),
		updateScene: false
	});

	// fsb mib walking out
	await st.waitTicks(s, 120);
	await S_animateAndMove(s, {
		st,
		entId: "@fsbmib",
		fromLocId: "loc_holdup_fsboss_src",
		animFrom: "FSBMibRightOutDown",
		animMove: "FSBMibWalkRight",
		moveTickEvent: "step",
		rate: 6,
		toLocId: "loc_holdup_fsboss_dst",
		animTo: "FSBMibStandRight"
	});

	// the dialog
	await st.waitTicks(s, 60);
	tmps.f_music_set = false;
	await S_setMusic(s, {gs, tmps, st, action});
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_so_it_is_hero:����, � ��� ��� ���������� �����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m1",
		header: "@hero_says:�����:",
		text: "@hero_holdup_well_yes:��... ���... ��� ��... ��."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_hero_pistol:� ��� � ��� ��� �������� �����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m1",
		header: "@hero_says:�����:",
		text: "@hero_holdup_well_kinda:��... ���... ����."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_hero_grenade:� ��� � ��� ��� ������� �����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m5",
		header: "@hero_says:�����:",
		text: "@hero_holdup_i_can_explain:� ���� ���������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_did_you_really_think:� �� � ������ �����,\
 ��� �����, ��� ���� ������ � ������� �� ���������� � ���, ���� � �����������\
 ������ ������, ��� �����-�� ����� ������� �� ������ � ������ ������, ��������\
 � ���������� ��������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_well_eh:��... ���..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_of_course_no:������� ��, ���. �� ����������\
 ����� ������, ��� ��� ��� ������ ��, �����!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m2",
		header: "@hero_says:�����:",
		text: "@hero_holdup_ehq:���... �?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_you_are_very_like:���� � ���, ��� �� �����������,\
 ������-���� �� ����������, ����� ��... ���-��� ����� ���������. �, ���� ��\
 ������������� ��, � ��� � �����, �� �� ������ ������ � ���������� �����������\
 ���� ��� ������ �� ����� ������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m1",
		header: "@hero_says:�����:",
		text: "@hero_holdup_uhu:�... ��... ���."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_on_other_hand:� ������ �������, ���� �� - �� ���,\
 �� � ���� ��� ������. � ������, ��, � ��� � ������, ��������� ���������,\
 ��� �� ������� ������������� ���� �� �����, ������ ��� �� ����� �\
 ������������� ������ ������ �����������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m4",
		header: "@hero_says:�����:",
		text: "@hero_holdup_uhu:�... �?!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib_think",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_we_have_a_problem:����� �������, �� ����� ��������.\
 ���� �� - ��� �����, �� ���� ���� ���������. ���� �� - �� ��� �����, �� ����\
 ���� �������������. ��� ��� ����������������� ��������. �� ��������, ��� ��\
 ��� �� ���, � ������� �������� �� �������������� ���������. ��� �� � �����\
 ���������?.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_no_liqudation:�� ���� ���� �������������,\
 ��������! ������� � ������ ��� ���-������ �������� � �� ��������� ������?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_we_ll_do_this:������� ���. ������ �����������,\
 �����! ������, � ��� ����, �������� ���� ������ ������������� �������.\
 ���� ������ ������ - ������� � ��������. ���� ����� ������������� ������\
 ������� ��������..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_how_is_this:��� ���?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_this_means:��� ������, ��� �� ������ ���������\
 �� ���������, � ������ �� ��������� �� ���������.\n\
 ���� �� - ������������� ��, � ��� � �����, ������ ����� ������� �������\
 ���� � �������� ��������. ���� �� - �� ���, �� �� ����� �������... \
 � ����� ������, ��� ����� ��� �� ��� - ������ ����������� ����� ���������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_and_if_fail:� ���� �� �������, ��, �� �������\
 ����, �� ������ �� �����������, � ������, �� ������ ������� ��������. ��\
 ����, ��� ������� ����� �����, ������������� �� ��������������� ����\
 ������ ������� ��������. ��� ������, ��� ����� ����� ���������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_yep:�� ��."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_of_course_we_control:����������, �� �� ������� ����\
 ��� ���������. �� ������, ���� ���� ����� ������� ���������� �����-������\
 �������, ������� �� ��� ������������ ����� ����� ����� ����������..."
	});

	hlsfxPlaySFX({ sfxId: "beep-beep-1" });
	st.takePickableItem({ gs, itemId: "it_mk152", updateScene: false });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@hero_holdup_plugged_mk152:� ���� ����� ����������� ��������\
 � ��������� ����������."
	});

	s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: st.object("loc_holdup_hitbox").position
	}));
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_whats_it:�� ��?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152:����������-��������� �������������� ������\
 ��-152�. ������� ����� ������������� �������������� ������� �\
 ����������������. \"�\" �������� ��������������� � ��������������� �������\
 ��� ������ � ����� ��������� ��������. ������� ������������� ����������� ���\
 ������ ��������, �������� ��������������� ��� ��������� � ������������\
 ��������, � �������� �������� � ��������� ������� ��������������� ���\
 ��������� � ������������ ��������. ��� ����� ���������� ����� �������� ��\
 ���������� ���������� � �� ����������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_2:� ����� - ���������� ��� ���������������\
 ����������� � ����� ����������� �����������, ����������� ���� ��\
 ������������� ����������� �����������, ��������������� ������������������\
 � ����� ���� ����������, ������� ������� ���� ���������� ����������� �\
 ��������� �����."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:�����:",
		text: "@hero_holdup_and_tetris:� ������ ����?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_tetris_yes:����. �� �� �������. � ����\
 �������� ������� ������ - ��� �� ��������� ���, ��-�� �������� �����\
 ��������� ������� ���������������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@hero_blin:����."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_3:� �����, ������� ���������� �� �����\
 ����������, ��������� ��������������� ������ ����������� ����� ������������,\
 �, � ������ ����, �� ���� ���� ������� � ���� ����������. �� � � �����\
 ������� � ���� ������� �� ������ �������."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_can_we_without_self_dtr:� ��� ���������������\
 ���-������ �����?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_no_we_cant:����� ������. ���� ��������� ����\
 �������, ����������, ����� ���������� ��������� � �������� � �����\
 ��������������� ������, ��� ��� �� ��� ������� ������������������? ������\
 ��������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@hero_holdup_ok_if_land_asks:��... �����. ��� ������ ������...\
 � �� ����� ������ ���� �����������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_meet_in_murmansk:����, �� ������� � ���������.\
 ���������� ���������� - �� ����� ��������. �����, �����! ��� ���� �����������."
	});

	// fsb mib walking in
	await S_animateAndMove(s, {
		st,
		entId: "@fsbmib",
		fromLocId: "loc_holdup_fsboss_dst",
		animMove: "FSBMibWalkLeft",
		moveTickEvent: "step",
		rate: 4,
		toLocId: "loc_holdup_fsboss_src",
		animTo: "FSBMibLeftInUp"
	});

	// fsb spn running in
	var fsbSpnAnimsIn = [
		{
			st: st,
			entId: "@fsb3",
			fromLocId: "loc_holdup_fsb_dst_3",
			animMove: "FSBSpecRunLeft",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_src_3",
			animTo: "FSBSpecLeftInUp"
		},
		{
			st: st,
			entId: "@fsb4",
			fromLocId: "loc_holdup_fsb_dst_4",
			animMove: "FSBSpecRunLeft",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_src_4",
			animTo: "FSBSpecLeftInDown"
		},
		{
			st: st,
			entId: "@fsb1",
			fromLocId: "loc_holdup_fsb_dst_1",
			animMove: "FSBSpecRunLeft",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_src_1",
			animTo: "FSBSpecLeftInUp"
		},
		{
			st: st,
			entId: "@fsb2",
			fromLocId: "loc_holdup_fsb_dst_2",
			animMove: "FSBSpecRunLeft",
			moveTickEvent: "step",
			rate: 12,
			toLocId: "loc_holdup_fsb_src_2",
			animTo: "FSBSpecLeftInDown"
		}
	];

	var fsbRunIns = new Array();
	for (var i = 0; i < 4; i++) {
		fsbRunOuts.push(fsbSpnRunners[i].run(S_animateAndMove,
			fsbSpnAnimsIn[i]));
		await st.waitTicks(s, 15);
	}
	await s.allOf(...fsbRunIns);
	
	// hero retreat
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroWalkDown",
		moveAnimationId: "MoveAtRate",
		parameters: {
			RATE: GameConst.HERO_STEP_SIZE
		},
		moveTickEvent: "step",
		moveFrom: stHoldupHitbox.position,
		moveTo: st.object("loc_hero_retreat").position
	}));
	s.anyOf(stHero.playAnimation({
		animationId: "HeroStandUp",
		atPosition: st.object("loc_hero_retreat").position
	}));

	await st.waitTicks(s, 60);
	stTrainCtl.stopped = false;

	await st.waitTicks(s, 120);
	await st.popup(s, {
		text: "@hero_holdup_over:��� ���-�� ��� ���������� ����� � ����� ��\
 ���� ���������� ���� ������ ������������� ������� �� ������.\n\
 � ������ ���� ����������� ������� ������������� ������� � ������ �������\
 ��������.\n�� ����� ������ ������, ���� ���-�� ��������."
	});

	tmps.inv_last_selected = "it_mk152";
	return { action: "openInventory", forUse: false };
});

SCRIPT_ADD("sC2", "cs.holdupGrenade",
async function(s, {gs, tmps, st}) {
	// note - switch to screen invalidates all entities
	// and resets tmps object
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sC2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	hlsfxPlayMusic({ sfxId: "music_1" });
	var stHero = st.object("hero"),
		stHoldupHitbox = st.object("loc_holdup_hitbox"),
		stTrainCtl = st.object("nv_train_ctl_C2");
	s.anyOf(stHero.playAnimation({
		animationId: "HeroHoldupGrenade",
		atPosition: stHoldupHitbox.position
	}));
	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_C2").position;

	stTrainCtl.state = "off";
	stTrainCtl.currentPhase = 0;

	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@hero_holdup_grenade:������! � ���� �������!"
	});

	stTrainCtl.state = "on";
	await s.anyOf(stHoldupHitbox.ent.event("collisionEnter"));
	stHero.hide();
	return {
		action: "ac.heroHit",
		cause: "train_fail_grenade",
		pos: stHoldupHitbox.position
	};
});

SCRIPT_ADD("sC2", "daemon",
async function fishCrawl(s, {gs, tmps, st, action}) {
	if (!gs.it_fish_enabled && gs.f_water_cleansed) {
		await st.waitTicks(s, 30);
		await S_animateAndMove(s, {
			st,
			entId: "it_fish",
			fromLocId: "loc_fish_src",
			animMove: "FishCrawl",
			moveTickEvent: "step",
			rate: 16,
			toLocId: "hs_it_fish",
			animTo: "ItemFish"
		});
		gs.it_fish_enabled = true;
		st.updateSceneToGameState({
			refreshHotspots: true
		});
	}
});

SCRIPT_ADD("sC2", "cs.whoAlcoholizesFish",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m2",
		header: "@hero_says:�����:",
		text: "@who_alcoholizes_fish:�� ������� ����. ��� ����� �� �������\
 �������� ������� ����?"
	});
});

SCRIPT_ADD("sC2", "daemon",
async function(s, {gs, tmps, st}) {
	// mark that we've left the bunker, so that further bunker exits
	// did not require to have a pistol
	gs.f_outside_bunker_visited = true;
});

SCRIPT_ADD("sC2", "preControl",
async function setupTelephoneLocs(s, {gs, tmps, st}) {
	if (!tmps.isTelephoneLocsSet) {
		tmps.isTelephoneLocsSet = true;
		tmps.hs_telephone = st.object("hs_telephone_C2");
		tmps.loc_lostitems = st.object("loc_lostitems_C2");
	}
});

//
// sC3 (secret hero bunker)
//

SCRIPT_ADD("sC3", "preControl",
async function showIntroControls(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_sC3_ctl_intro) {
		gs.f_sC3_ctl_intro = "done";
		return { action: "cs.controlsIntro" };
	}
});

SCRIPT_ADD("sC3", "cs.controlsIntro",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		header: "@popup_ctls_welcome:������� ������, �����!",
		text: "@popup_ctls:���������� (������ � ����������):\n\
\u2190\u2193\u2191\u2192 = ������\n\
Z, X = �� ��������\n\
[\u25CF REC] ��������, ��� ��� ���-�����, � ����� ����������� ���������\n\n\
�����, � ������� ����� ���-�� ������� ��� ����������, �������� \
��������� (������ ������� ����� ����������). ���� ����� �� ��������, \
�� ��� ���� �� �����. �� ��������� � ������ � ������� ��������� \
�������� � �� ������� Z/X ��� ������ � ������� ��������� �����, \
����� ��� ��� �� ��������.\n\n\
��������� �� � ����������!"
	})
})

SCRIPT_ADD("sC3", "cs.findPistol",
async function findPistol(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@hero_found_pistol:����� ����� � ����� ��������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:�����:",
		text: "@i_had_grenade_elsewhere:���-�� ��� ������� ����... ���� �����\
 �������� ��� ������."
	});

	gs.it_pistol_enabled = true;
});

SCRIPT_ADD("sC3", "cs.findIron2",
async function findIron2(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@popup_iron_in_place:����, � ���������� �����, ��� �� �����.\
 ���� ���."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:�����:",
		text: "@i_will_rehide_it:� ��� ��� ��� ������, �� ��� ��� ��������� -\
 � ��� �� ����� ������, �-����-�����?"
	});

	gs.it_iron_2_enabled = true;
});

SCRIPT_ADD("sC3", "cs.patefonOn",
async function(s, {gs, tmps, st, action}) {
	gs.f_patefon_off = false;
	gs.ach_patefon = true;
	tmps.f_music_set = false;
	await S_setMusic(s, {gs, tmps, st, action});

	await st.popup(s, {
		text: "@hero_switched_patefon_on:����� ������� �������."
	});
});

SCRIPT_ADD("sC3", "cs.patefonOff",
async function(s, {gs, tmps, st, action}) {
	gs.f_patefon_off = true;
	gs.ach_patefon = true;
	tmps.f_music_set = false;
	await S_setMusic(s, {gs, tmps, st, action});

	await st.popup(s, {
		text: "@hero_switched_patefon_off:����� �������� �������."
	});
});

SCRIPT_ADD("sC3", "cs.pokeBunkerist",
async function findIron2(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@bunkerist_hint:������������, �� ������������, ����� �������\
 ����� ������� � ����������� ����������. �������� ���� ������:\
\n\nllsfx$masterGain.gain.value = 0.05; // default volume\
\n\n���������, ��� �� ��� �������?"
	});
});

//
// sC4 (booze stand)
//

SCRIPT_ADD("sC4", "preControl",
async function(s, {gs, tmps, st, action}) {
	if (gs.f_bottle_reclaim_open && !gs.f_bottle_reclaimed) {
		return { action: "cs.reclaimBottle" };
	}
});

SCRIPT_ADD("sC4", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_C4").position;
	}
});

SCRIPT_ADD("sC4", "cs.reclaimBottle",
async function reclaimBottle(s, {gs, tmps, st, action}) {
	gs.f_bottle_reclaimed = true;
	st.placePickableItem({
		gs: gs,
		itemId: "it_bottle",
		screen: gs.currentScreen,
		atTile: st.screenPosToTilePos(
			st.object("loc_bottle_after_stalker").position),
		updateScene: true
	});
	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: stHero.position
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@oh_stalker_did_they_say:��, �������, �������... �� ��������\
 ����, ��� ������ ����� ������ ������� �������? � ���� ����, ���... ����\
 ������ �� � ����. ���������, ������ ����, ��� �� �� ����� �� ��������?"
	});

	return { action: "ac.setRespawnPointExplicit" };
});

SCRIPT_ADD("sC4", "ac.setRespawnPointExplicit",
async function setRespawnPointExplicit(s, {gs, tmps, st, action}) {
	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_C4").position;
});

SCRIPT_ADD("sC4", "preControl",
async function setupTelephoneLocs(s, {gs, tmps, st}) {
	if (!tmps.isTelephoneLocsSet) {
		tmps.isTelephoneLocsSet = true;
		tmps.hs_telephone = st.object("hs_telephone_C4");
		tmps.loc_lostitems = st.object("loc_lostitems_C4");
	}
});

SCRIPT_ADD("sC4", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.hotspotId == "hs_booze_stand") {
		if (action.itemId == "it_bottle") {
			return { action: "cs.bottleNoUse" };
		}

		if (action.itemId == "it_vodka") {
			return { action: "cs.vodkaNoUse" };
		}

		if (action.itemId == "it_explosive_vodka") {
			return { action: "cs.pigBusted" };
		}
	}
});

SCRIPT_ADD("sC4", "cs.bottleNoUse",
async function bottleNoUse(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@bottles_can_be_returned_but:�������, �������, ���� ���� �����\
 ���� �������, ��... ���� �� ��������� � ������ ������ ������� ���������\
 �������� ������, ��������� ����������� � ������. �� �����, ����������, � ���\
 �� ������� � ��������� ������ � ����������� ���� ����������� �� �����\
 �����������.\
\n���� ��� � ���������� �� ��� �������, �� ���� �� ����� �����������."
	});
});

SCRIPT_ADD("sC4", "cs.vodkaNoUse",
async function vodkaNoUse(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_thought_on_it:����� ������� ��� �� � ������, � ������ �\
 ������, ��� ����-������������ ������ ������ ������, �������, ��������, ��\
 ����� ���������. � ��� ���� ���������, ��� ��������������� � ������� ������\
 ������� ������� �� ������ �����, � ��� �� ��� ������ �� �����. ��� ���� ��\
 �����. ��, �������, ����� ���� ����� � ����� ��������� ����������. � ����\
 ��������� �������� ���-������ �����, ��� ������ �� �������� ��������\
 �������� ��� � �������. �� ��� ��?"
	});
});

SCRIPT_ADD("sC4", "cs.pigBusted",
async function pigBusted(s, {gs, tmps, st, action}) {
	gs.f_cut_scene = true;
	var heroScreen = gs.currentScreen,
		heroPoint = st.object("hero").position;

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m4",
		text: "@hero_was_about_to_commit:����� �������, ��� ���������\
 ��������, ������ ������� � �����, �� ������� ��� �� ������� ������� � ��\
 ������ ������. �� � ���� �� ���������� ������. �� ���� ����� (������, �����)\
 ����� ����������� ���� ������, ������ �������� ���� ���������� ���� �����\
 ������� ����..."
	});
	st.discardPickableItem({ gs: gs, itemId: "it_explosive_vodka" });

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sC4",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	await st.waitTicks(s, 30);
	hlsfxPlaySFX({ sfxId: "chimes" });
	st.object("larek").state = "on-bottle";

	await st.waitTicks(s, 60);
	await S_animateAndMove(s, {
		st,
		entId: "@pig",
		fromLocId: "loc_pigrun_src",
		animMove: "PigRunRight",
		rate: 3,
		toLocId: "loc_pigrun_dst",
	});

	st.object("larek").state = "on"; // no bottle

	await S_animateAndMove(s, {
		st,
		entId: "@pig",
		fromLocId: "loc_pigrun_dst",
		animMove: "PigRunLeft",
		rate: 3,
		toLocId: "loc_pigrun_src",
		animTo: "-"
	});
	await st.waitTicks(s, 240);

	hlsfxPlaySFX({ sfxId: "explosion" });
	st.playScreenFX({
		type: "shaker",
		x: 0,
		y: 4,
		duration: 30
	});
	await st.waitTicks(s, 90);

	await s.allOf(
		s.fork().run(async function(s) {
			await st.waitTicks(s, 0);
			await S_animateAndMove(s, {
				st,
				entId: "@bottle",
				fromLocId: "loc_pigpart_1_src",
				animMove: "PigPartBottle",
				rate: 8,
				toLocId: "loc_pigpart_1_dst",
				animTo: "-"
			});
		}),
		s.fork().run(async function(s) {
			await st.waitTicks(s, 30);
			await S_animateAndMove(s, {
				st,
				entId: "@meat",
				fromLocId: "loc_pigpart_2_src",
				animMove: "PigPartMeat",
				rate: 12,
				toLocId: "loc_pigpart_2_dst",
				animTo: "-"
			});
		}),
		s.fork().run(async function(s) {
			await st.waitTicks(s, 60);
			await S_animateAndMove(s, {
				st,
				entId: "@wheel",
				fromLocId: "loc_pigpart_3_src",
				animMove: "PigPartWheel",
				rate: 12,
				toLocId: "loc_pigpart_3_dst",
				animTo: "-"
			});
		})
	);
	gs.f_pig_off = true;
	gs.f_cut_scene = false;

	await st.waitTicks(s, 30);

	gs.local.isRespawnPointSet = true;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_C4").position;

	await S_heroRespawn(s, { gs, tmps, st, animationId: "HeroSmile" });
	await st.waitTicks(s, 30);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m5",
		header: "@hero_says:�����:",
		text: "@hero_love_russia_pig:���� ������, ������ ������!"
	});
});

//
// sD0 (road to nowhere)
//

SCRIPT_ADD("sD0", "preControl",
async function showIntroRoadToNowhere(s, {gs, tmps, st}) {
	//return; // DEBUG
	if (!gs.f_road_ro_nowhere_intro) {
		return { action: "cs.roadToNowhereEntranceIntro" };
	}
});

SCRIPT_ADD("sD0", "cs.roadToNowhereEntranceIntro",
async function(s, {gs, tmps, st}) {
	gs.f_road_ro_nowhere_intro = true;
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		text: "@popup_road_to_nowere:�����, ���� �������������������� �����\
 ��������������� �����, ���������� � ����� � ������� � ������, ���������\
 ���-�� ����������. ��������� ����� ���� ������, � ������� �� ���\
 ����������� ���� � ����� ����� ������: � ���� �� �� ���������,\
 �� �� ���������� �����, ������ ������� � ������� ������ - �, ���� �� �����,\
 � �����. � ������� ����� ���, ������, ��������. � �����, ���� � �������."
	});

	return { action: "cs.explicitRespawnPoint" };
});


SCRIPT_ADD("sD0", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_D0").position;
	}
});

// this will be called after intro, as it subverts the preControl
// chain and the setRespawnPoint above
SCRIPT_ADD("sD0", "cs.explicitRespawnPoint",
async function setRespawnPointExplicit(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_D0").position;
	}
});

SCRIPT_ADD("sD0", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = null; // actually specplace_sD0,
	// but it is always enabled and doesn't need special detection
	tmps.medvedFlagToSet = "f_medved_detected_sD0";
	tmps.medvedFlagRequired = null;
});

SCRIPT_ADD("sD0", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_start:����, �������, �������� ����� ���� �������� ����,\
 �������� �� ��...\n\
 ��������� ��� ������ �������������� ����� ���� �����-������ ��������,\
 �� ����������� �������, ������� �������� ������ �� ����� � �����\
 ����������� ����������� ������������."
 	});

 	await st.popup(s, {
		text: "@medved_start2: ���, �������, ���� ����� � ������ �������, ��\
 ����� �����������, ��� � ���� ������ ��� ������ ��������� �������� �\
 ����... ��� ���... �������."
	});
});

SCRIPT_ADD("sD0", "cs.noFishing",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		header: "@sign:��������",
		text: "@no_fishing:� ����� �������� � ���������������� ��������������\
 �������� ����� ���� ��� ������������ ���������� ��������� ������.\
 ���������������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@satraps_no_people_but_them:��� �������! ���� �������-�� ���� �\
 ������, �� ����� �������� - � ��� ��� �������� �� ����� ����������������."
	});

	gs.f_no_fishing_inspected = true;
});

//
// sD1 (gasters hideout)
//

SCRIPT_ADD("sD1", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_D1").position;
	}
});

SCRIPT_ADD("sD1", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (!gs.f_gasters_launched) {
		if ((action.itemId == "it_pistol" || 
				action.itemId == "it_pistol_scotch" ||
				action.itemId == "it_pistol_torchlight" ||
				action.itemId == "it_grenade") &&
			gs.it_proc_id != "inv" &&
			action.hotspotId == "hs_gasters_D1") {
			return { action: "cs.noAuthority" };
		}

		if (action.itemId == "it_proc_id" &&
			!(gs.it_pistol == "inv" || 
				gs.it_pistol_scotch == "inv" ||
				gs.it_pistol_torchlight == "inv" ||
				gs.it_pistol_grenade == "inv") &&
			action.hotspotId == "hs_gasters_D1") {
			return { action: "cs.noArgument" };
		}

		if ((action.itemId == "it_proc_id" ||
				action.itemId == "it_pistol" || 
				action.itemId == "it_pistol_scotch" ||
				action.itemId == "it_pistol_torchlight" ||
				action.itemId == "it_grenade") &&
			(gs.it_pistol == "inv" || 
				gs.it_pistol_scotch == "inv" ||
				gs.it_pistol_torchlight == "inv" ||
				gs.it_pistol_grenade == "inv") &&
			gs.it_proc_id == "inv" &&
			action.hotspotId == "hs_gasters_D1") {
			// the grenade should actually be no longer available here
			return { action: "cs.launchGasters" };
		}
	}
});

SCRIPT_ADD("sD1", "cs.noAuthority",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_had_argument_but:�������� � ����� ��� �������, ��\
 ������������� ��������� ���, ����� ������ ����� ���������� �������������\
 ������� � ���������. �� ����� ��������, ��� �� ����� ������������ ��\
 �������. ��������� ���������� �������� ������������, ������ ������� ��\
 ������� ����� �� ��������� ���� ��� ��� ���."
	});
});

SCRIPT_ADD("sD1", "cs.noArgument",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_had_authority_but:���������� � ����� ������� �� �����\
 ���� - �� ��� ����� ������������ ������������. ������������, ����������\
 ��� ������ �����������. �� ����� ����� ���� ������, � ����� ������������\
 ��������, ��� ���������� �� ���� � ������������ �������� �� �� �������,\
 ��� ������ ���������� �� ����."
	});
});

SCRIPT_ADD("sD1", "cs.launchGasters",
async function(s, {gs, tmps, st, action}) {
	var stHero = st.object("hero");
	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: stHero.position
	});

	await st.popup(s, {
		text: "@hero_came_with_authority:����� ����� �� ���������� ��� ������\
 ������ ���������, � ������������ � ����� ���� � � ������ ���������� - �\
 ������, � ����� �� ���� ����������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@who_there:��� �����! ������ ��������! ������ ��������! ���\
 �������! ������ ��� ������! ���������� �� ������! ������ �� ��������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:�������������:",
		text: "@not_our_fault_boss:����������, �� �� ���������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@whaaat:����?! ������������� ������! ���������������!\
 ��������� ����! �������� �� ����! ���������� �� ���������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:�������������:",
		text: "@can_we_deal:����������, ����� �����������?.."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@bribe_you_scum:������ �����������, �������?! ������\
 ������������! ���������! ����������� ������! ����������� �������!\
 ����-��������!"
	});

	await st.popup(s, {
		text: "@hero_knew_many_words:(����� ���� ����� ��������� ����,\
 ���������� ���� � ����������� ����������, � �� ������� ������� ������\
 ���������� - ������ ��� ��� ����� ������, �� ����� ������ ����� ������� �\
 ������, �� ��� ���, ���� ��������� �� ����� �������� � ����� �\
 ��������������.)"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@narco_vet:�������������! ���������! ��������! ��������������\
 �����������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:�������������:",
		text: "..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@why_idle:��, �� �������?! ������ �������� ��� �����?! ��-��,\
 ����� � ��������� �� ������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:�������������:",
		text: "@going_now_boss:�������, ����������!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@not_now_quick:�� \"�������\", � ��c��-�-��-�!.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_default",
		header: "@gasters_say:�������������:",
		text: "@ruf:�-���!"
	});

	st.playParticle({
		particleId: "teleport_in",
		atPosition: st.object("loc_gasters_out").position
	});

	gs.f_gasters_launched = true;
	await st.waitTicks(s, 30);
	st.object("gasters_D1").state = "off";
	await st.waitTicks(s, 30);

	return { action: "cs.constructDacha" };
});

SCRIPT_ADD("sD1", "cs.constructDacha",
async function constructDacha(s, {gs, tmps, st, action}) {
	gs.f_cut_scene = true;
	var heroScreen = gs.currentScreen,
		heroPoint = st.object("hero").position;

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sB2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	st.object("nv_train_ctl_B2").state = "off";
	st.object("gast_wol_work").state = "on";
	st.object("gast_gre_work").state = "on";
	st.object("gast_leo_work").state = "on";

	hlsfxPlaySFX({ sfxId: "construct" });

	var
		stDolgostroy = st.object("dolgostroy"),
		stDacha = st.object("dacha"),
		stStation = st.object("station"),
		stConstruction = st.object("@construction");
	stDacha.state = "in";
	stDolgostroy.state = "out";
	var consAnim = stConstruction.playAnimation({
		animationId: "ConstructionIn",
		atPosition: stDacha.position
	});

	await s.anyOf(consAnim);
	hlsfxStopSFX({ sfxId: "construct" });
	st.object("gast_wol_work").state = "off";
	st.object("gast_gre_work").state = "off";
	st.object("gast_leo_work").state = "off";

	gs.f_dacha_on = true;
	stDacha.state = "on";
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.waitTicks(s, 60);
	
	gs.f_cut_scene = false;
	gs.heroPoint = heroPoint;
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: heroScreen,
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});
	st.object("hero").position = heroPoint;
});

SCRIPT_ADD("sD1", "daemon",
async function setMedvedDetection(s, {gs, tmps, st}) {
	tmps.specPlaceIdToShow = "specplace_sD1";
	tmps.medvedFlagToSet = "f_medved_detected_sD1";
	tmps.medvedFlagRequired = "f_medved_detected_sD0";
});

SCRIPT_ADD("sD1", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_resist:������ �� ������� ������� ��� ���.\
 ���� �� ������, ������� �������� �� ���� ������� �� �����, ��������� �����\
 ��������������� � ������������ �������������, ������ �����������..."
	});

	await st.popup(s, {
		text: "@medved_ski:������� ����� �������� �������� ���� ������������\
 ����� ������. �������������� � ���� ����� ��������, ����� �����, ��� �����\
 ��� ����, ���������� ���������� ������� � ���� ������.\n\
 ���� ���� ������, ��� ������ ������� �����. � �������� �������� ����������\
 ����� ��������� �������� ���������� �������� �����..."
	});
	gs.it_ski_enabled = true;
});

//
// sD2 (troll and switch)
//

SCRIPT_ADD("sD2", "preControl",
async function setRespawnPoint(s, {gs, tmps, st, action}) {
	if (!gs.local.isRespawnPointSet) {
		gs.local.isRespawnPointSet = true;
		gs.local.heroRespawnPosition =
			st.object("loc_hero_respawn_D2").position;
	}
});

SCRIPT_ADD("sD2", "daemon",
async function trollPreIntro(s, {gs, tmps, st}) {
	for (; !gs.f_troll_intro;) {
		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_troll_warning" })) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.trollIntro"
			});
		}
	}
});

SCRIPT_ADD("sD2", "cs.trollIntro",
async function(s, {gs, tmps, st}) {
	var stHero = st.object("hero");
	await s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	}));

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:�����:",
		text: "@what_is_this_body:� �� ��� �� ���� � ������� ������������?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:������:",
		text: "@me_troll_my_bridge:��� ������. ��� ���� ��� ����. ������ ����,\
 ������� ���. 20 ������. ���� ����."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@dumb_trololo_this_is_tunnel:����� �������, ���� - ��� �������!\
 � ��, ��� �� ������ - ��� �������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:������:",
		text: "@troll_crafty_where_walk_pay:������ �� �����, ������ ������.\
 ���� �� ������, ��� - ������. ��� ������, ��� � �������. ���� ����."
	});

	gs.f_troll_intro = true;
});

SCRIPT_ADD("sD2", "cs.theLineIsIncomplete",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:�����:",
		text: "@dumb_trololo_line_is_incomplete:����� �������, ����� ��\
 ���������! �������� ���� �� �����! ������ ���� ��� ������!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:������:",
		text: "@troll_crafty_you_walk:������ �� �����, ������ ������. �������\
 �� ������, ���� ������. ��� ������, ��� �������. ���� ����."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:�����:",
		text: "@what_a_shitman:�� ������, � ������ ��� �� ����. ��� ������."
	});

	gs.f_incomplete_line_say = true;
});

SCRIPT_ADD("sD2", "cs.turnSwitchUp",
async function turnSwitchUp(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_switch:��-152� ��� ����� �������� ���������\
 ������������ �����, � ����� ������� �� ������� ����������..."
	});

	gs.f_cut_scene = true;

	gs.f_railswitch_up = true;
	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD2",
		transOutVeilType: "down-in",
		transInVeilType: "up-out"
	});

	var stTrainCtl = st.object("nv_train_ctl_D2b");
	stTrainCtl.currentPhase = 0;
	stTrainCtl.state = "on";

	await s.anyOf(st.object("loc_train_mid_D2b").ent.event("collisionEnter"));
	hlsfxPlaySFX({ sfxId: "ouch" });
	st.object("troll").state = "on-ouch";

	var stTrollHitbox = st.object("loc_troll_hitbox");
	await s.anyOf(stTrollHitbox.ent.event("collisionEnter"));
	st.object("troll").state = "off";
	gs.f_troll_off = true;
	st.playParticle({
		particleId: "squish",
		atPosition: stTrollHitbox.position
	});
	hlsfxStopSFX({ sfxId: "ouch" });
	await st.waitTicks(s, 60);
	
	gs.f_cut_scene = false;
	gs.local.heroRespawnPosition =
		st.object("loc_hero_respawn_D2").position;
	await S_heroRespawn(s, { gs, tmps, st, animationId: "HeroSmile" });

	await st.waitTicks(s, 30);
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m5",
		header: "@hero_says:�����:",
		text: "@hero_did_your_craft_troll:�� ��, �������? ������� ����\
 ���� ��������, �������� ���������-�� ��������?"
	});
});

SCRIPT_ADD("sD2", "daemon",
async function trollPreIntro(s, {gs, tmps, st}) {
	for (; !gs.f_troll_off;) {
		var [ collEnter ] = await s.anyOf(
			st.entScreenSink.event("collisionEnter"));
		if (st.isCollision({ collEvent: collEnter,
			locId: "loc_hero_pinpoint",
			withLocId: "loc_troll_kick_src" })) {
			st.entScreenSink.postEvent("gameAction", {
				action: "cs.heroKicked"
			});
		}
	}
});

SCRIPT_ADD("sD2", "cs.heroKicked",
async function heroTrollKick(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_troll",
		header: "@troll_says:������:",
		text: "@troll_no_pay_no_walk:���� �� �������, ���� �� ������.\
 ���� ����."
	});

	var gameover = !S_reduceHP({gs, st, minusHP: 1});
	await S_animateAndMove(s, {
		st,
		entId: "hero",
		fromLocId: "loc_troll_kick_src",
		animMove: "HeroKicked",
		animTo: "HeroFaceDown",
		ticks: 40,
		toLocId: "loc_troll_kick_tgt",
		moveAnimationId: "MoveOverTicks"
	});

	await st.waitTicks(s, 60);

	if (gameover) {
		return { action: "ac.heroHit", cause: "aftermath" };
	}

	if (!gs.f_trollkick_intro) {
		gs.f_trollkick_intro = true;
		var stHero = st.object("hero");
		stHero.playAnimation({
			animationId: "HeroAngry",
			atPosition: st.object("loc_troll_kick_tgt").position
		});

		await st.waitTicks(s, 60);
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e2_m4",
			header: "@hero_says:�����:",
			text: "@hero_ah_you_fucking_troll:�� �� ������ �������!\
 ��, ������ - � �� ���� ����� ������!"
		});
	}
});

SCRIPT_ADD("sD2", "cs.turnSwitchDown",
async function turnSwitchDown(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_switch_again:��-152� ��� ��� �������� ���\
 ������ ����, � ����� ������� ���������� �������..."
	});

	gs.f_railswitch_up = false;
	st.updateSceneToGameState();
});

SCRIPT_ADD("sD2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_mk152" &&
		action.hotspotId == "hs_railswitch") {
		if (!gs.it_ticket_enabled) {
			return { action: "cs.turnSwitchUp" };
		} else {
			return { action: "cs.turnSwitchDown" };
		}
	}
});

SCRIPT_ADD("sD2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_pistol" &&
		action.hotspotId == "hs_troll_talk") {
		return { action: "cs.trollTryPistol" };
	}
});

SCRIPT_ADD("sD2", "cs.trollTryPistol",
async function tryPistol(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@troll_pistol_not_work:���� ���������� ��������, ��� ����\
 ��������� � ������� ���� ����, � ������ ���� �� ������� ������. �����\
 �� ��������� ������� ����������� ������� �������� ����������� �������."
	});
});

SCRIPT_ADD("sD2", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_grenade" &&
		action.hotspotId == "hs_troll_talk") {
		return { action: "cs.trollTryGrenade" };
	}
});

SCRIPT_ADD("sD2", "cs.trollTryGrenade",
async function tryGrenade(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:������:",
		text: "@wooden_grenade_ghuh:���������� �������. ���� ����."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:�����:",
		text: "@a_clever_asshole:�������.\n��������������� �������."
	});
});

//
// sD3 (civ appendix)
//

SCRIPT_ADD("sD3", "cs.findGrenade",
async function findGrenade(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_dug_boxes:����� ������� � ����������..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:�����:",
		text: "@here_it_is_my_grenade:��� ���. ��� ������ �������!\
 ����������� � ��������� ��������� �������. ���������, ��� � ���\
 ���������?"
	});

	await st.popup(s, {
		text: "@grenade_was_of_wood:������� ���� ����������, �� ���������\
 ������� �������������. �����, � ��������, ����� ����������. ��� ���� ����\
 ������� ��� ����������, � �� ��� ��������."
	});

	gs.it_grenade_enabled = true;
});

SCRIPT_ADD("sD3", "onUse",
async function(s, {gs, tmps, st, action}) {
	if (action.itemId == "it_mk152" &&
		action.hotspotId == "hs_5g") {
		return { action: "cs.hackTower" };
	}
});

SCRIPT_ADD("sD3", "cs.hackTower",
async function hackTower(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m5",
		header: "@hero_says:�����:",
		text: "@wonder_if_mk152_hacks_it:� ���������, ��� ����� ���� ���\
 ��-152� ������ ��������?"
	});

	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_tower:��-152� ������� �����, ���� ��\
 ����������."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:�����:",
		text: "@oh_fuck:�������."
	});

	await st.popup(s, {
		text: "@hero_got_right:���� ������ ��������, ��� ��� ���������\
 ��� ��� ������ � ���������, �� ���� ��� ������: ����� ������ ��� ���� �\
 ������������� ���� ���������� ������ � ��������� ����������."
	});

	await st.popup(s, {
		text: "@by_the_way_only_4G:�, � �����, ������� ������, �� �����\
 ��������� �� 5G, � ������ 4."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:�����:",
		text: "@they_are_greedy:��� �����. � ����� �����������!"
	});

	gs.f_telephone_on = true;
});

//
// sD5 (library)
//

SCRIPT_ADD("sD5", "cs.readBook",
async function readBook(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_took_book_and_read:����� ���� ����� � �������� ������..."
	});

	await st.popup(s, {
		header: "@adventures_of_shtirlitz:����������� �����������\
 ���������������� ���� ��� ��������, ���������� �� ���� ��� ������",
		text: "@shtirlitz_was_going_thru_forest:������� ��� ����� ��� � �����\
 ������� � �����. �� �� ������ ��������, �������� �� ���������� ����������\
 �����. ������ ����������������, ���������� ����� ��������� �������, � ����\
 ���������� �������, �� ������� �� ������: ��� ����� - �������� ����, ��\
 �������� ��������� ������, ��� ����� ���� - �� �����, � ����� ���������\
 ���������..."
	});

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e3_m4",
		text: "@hero_shut_the_book:����� � ����� ��������� �����.\n����� ����,\
 ��� �������, �� ������� �� ������ ������� �� ��������� ��������� ����\
 ����������������� ������������, ��-���� �� � ����. �������� ����� � �����\
 ��� ������������ ����������� ��� �������� ����� �� ������ ���� ���."
	});
});
