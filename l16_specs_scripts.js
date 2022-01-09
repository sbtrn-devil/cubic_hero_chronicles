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
			text: "@picked_tugrik:Герой поднял 1 тугрик!"
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
			text: "@hero_drinks_yad:Герой выпил йаду."
		});
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e3_m5",
			header: "@hero_says:Герой:",
			text: "@hero_yad_is_good:Ой, как резко похорошело-то!\nТеперь у меня\
 есть энергия! А то хожу как лох, один фофан - и сразу геймовер."
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
					header: "@tankist_says:Злющий танкист:",
					text: "@hit_tank_debil:Ты что, дебил? Или там не по-русски\
 написано?|\n...А-а-а, тля, они опять её не в ту сторону поставили. Ну,\
 гоблины с лопатами. Ну едрипть вашу дивизию."
				});
				gs.ach_debil = true;
			} else {
				await st.popup(s, {
					text: "@hit_tank_normal:Попытка проскочить на скрытности и\
 наглости не возымела успеха. Танк держал и север, и юг под надёжным\
 обстрелом, а танкист внимательно и злобно бдил."
				});
			}
		} else {
			// tank is shooting kreakliat (hero will only be hit at top lane)
			await st.popup(s, {
				text: "@hit_tank_obstrel:Ломануться под танковый обстрел\
 вместе с толпой ополоумевшего креаклиата было, несомненно, серьёзной заявкой\
 на успех."
			});
		}
		break;

	case "tractor":
		await st.popup(s, {
			text: "@hit_tractor:Пьянство за рулём - бессмысленая и\
 беспощадная сила. Даже если это всего лишь рычаги провинциального трактора,\
 а сидит за ними жалкое моральное ничтожество."
			});
		break;

	case "kreakl":
		await st.popup(s, {
			text: "@hit_kreakl:Попадать под ноги креаклу, прущему через\
 границу в угаре от своей внутренней неполживости - крайне небезопасное для\
 здоровья дело."
			});
		break;

	case "train":
		if (!gs.f_train_hit_intro) {
			await st.popup(s, {
				text: "@hit_train:Не следовало выбегать под поезд, не имея\
 чёткого и хитрого плана."
			});
		}
		break;

	case "train_fail_grenade":
		hlsfxPlayMusic({ sfxId: "music_abort" });
		await st.popup(s, {
			text: "@hit_train_grenade:Вид только одной гранаты не впечатлил\
 корованщиков. Следовало вооружиться пострашнее."
			});
		tmps.f_music_set = false;
		await S_setMusic(s, {gs, tmps, st, action});
		break;

	case "train_fail_pistol":
		hlsfxPlayMusic({ sfxId: "music_abort" });
		await st.popup(s, {
			text: "@hit_train_pistol:Вид одинокой пукалки не впечатлил\
 корованщиков. Следовало вооружиться пострашнее."
			});
		tmps.f_music_set = false;
		await S_setMusic(s, {gs, tmps, st, action});
		break;

	case "partizan":
		await st.popup(s, {
			text: "@hit_partizan:Морда в формате дерзкого кирпича не\
 оказала на партизан умиротворяющего эффекта. Здесь явно требовался другой\
 подход."
			});
		break;

	case "sec_turret":
		await st.popup(s, {
			text: "@hit_sec_turret:Было довольно глупо соваться прямо под\
 обстрел вооружённого рва с крокодилами, тогда как совсем рядом присутствовали\
 более полезные и удобные для внимания места."
			});
		break;

	case "nuke":
		await st.popup(s, {
			text: "@hit_nuke:Дразнить серьёзную коммерческую структуру\
 оказалось не лучшей затеей."
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
			header: "@game_over_header:Геймовер",
			text: "@game_over_text:Герой получил слишком много люлей и был\
 вынужден загрузиться с последней контрольной точки."
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
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@tlf_delivery_intro:Здравствуйте! Служба универсальной\
 доставки \"Вежливость дороже денег\". Чего желаете?"
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
			text: "@tlf_order_balalaika:Купить балалайку (100 \u20AE, крeд.)",
			enabled: true,
			leftText: "@tlf_buy:Купить",
			leftResult: "buy_balalaika",
			selected: action.lastSelect == "buy_balalaika"
		});
	}
	items.push(
		{
			text: "@tlf_order_checkpoint:Контрольная точка (" +
				DELIVERY_COST_CHECKPOINT + " \u20AE, предопл.)",
			enabled: gs.tugriks_collected >= DELIVERY_COST_CHECKPOINT,
			leftText: "@tlf_buy:Купить",
			leftResult: "buy_checkpoint",
			selected: action.lastSelect == "buy_checkpoint"
		},
		{
			text: "@tlf_order_lost_found:Доставка предмета (" +
				DELIVERY_COST_DELIVERY + " \u20AE, предопл.)",
			enabled: gs.tugriks_collected >= DELIVERY_COST_DELIVERY,
			leftText: "@inv_buy:Купить",
			leftResult: "buy_delivery",
			selected: action.lastSelect == "buy_delivery"
		});
	if (!gs.it_hren) {
		items.push({
			text: "@tlf_order_free:Бесплатный сервис",
			enabled: true,
			leftText: "@inv_request:Запрос",
			leftResult: "free_service",
			selected: action.lastSelect == "free_service"
		});
	}

	items.push(
		"hr",
		{
			text: "@tlf_order_none:Положить трубку",
			enabled: true,
			leftText: "@tlf_order_none:Положить трубку",
			leftResult: "exit",
			selected: !action.lastSelect
		}
	);

	var result = await st.menu(s, {
		title: "@tlf_what_order:Что решил заказать герой?",
		items: items
	});

	switch (result) {
	case "buy_balalaika":
		if (gs.it_passport == "inv") {
			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:Герой:",
				text: "@i_want_balalika_heres_passport:Здравствуйте. Я\
 покупаю балалайку в кредит, вот мой паспорт."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@you_did_right_buy_from_us:Отличный выбор! Подождите,\
 пока я оформляю кредит...| Готово! Договор о продаже в кредитное рабство и\
 окончательная сумма, с учётом оплаты услуг коллектора и прочих накладных\
 расходов, придут вам на телефон в СМС."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m3",
				header: "@hero_says:Герой:",
				text: "@wait_i_didnt_tell_number:Но я ещё не сказал вам\
 номер..."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@dont_worry_we_searched_it:Не волнуйтесь, мы уже\
 пробили его по базе наших партнёров. Счёт за пробивку включён в сумму. Всё для\
 удобства нашего клиента!"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:Герой:",
				text: "@what_if_i_dont_have_phone:А может, у меня и\
 телефона-то нет?"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@now_you_have:Теперь будет. Чтобы вам не напрягаться,\
 мы заключили на вас договор мобильной связи с нашими партнёрами по хорошему\
 дорогому тарифу и купили вам хороший дорогой аппарат. Это всё, разумеется,\
 тоже включено в сумму. СМСку вам доставят прямо вместе с телефоном."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m1",
				header: "@hero_says:Герой:",
				text: "@is_the_courier_paid_as_well:Услуги курьера, надеюсь,\
 тоже включены в сумму?"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@why_courier:Зачем ещё и курьера? Мы не навязываем\
 нашим клиентам ненужных услуг. Вам его доставит коллектор. И паяльник с собой\
 заодно захватит. Если с перспективами выплаты кредита всё и так ясно, к чему\
 терять наше и ваше время, когда можно сэкономить и его?"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e4_m5",
				header: "@hero_says:Герой:",
				text: "@bad_luck_for_kreakl:(Да, не повезло какому-то\
 случайному креаклу...) Спасибо, у вас очень классный сервис!"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@thats_our_job:Вам спасибо. Это наша работа и источник\
 дохода."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@ah_here_is_balalaika:Ах да, и вот ваша балалайка."
			});

			await st.popup(s, {
				text: "@hero_got_balalaika:Итак, благодаря спонсорству\
 какого-то случайного креакла, герой стал обладателем умеренно недорогой\
 кредитной балалайки. Теперь бы ещё сообразить, на хрена она ему нужна..."
			});

			if (gs.f_stalker_deal_open) {
				await st.popup(s, {
					text: "@or_does_he_know:...или у героя уже были идеи?"
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
				header: "@hero_says:Герой:",
				text: "@i_want_balalika_heres_data:Здравствуйте. Я хотел бы\
 купить балалайку - разумеется, в кредит. Вот мои паспортные данные."
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@you_are_too_happy:Что-то вы больно радостный для\
 влезающего в кредитное рабство. Паспорт-то настоящий?"
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e1_m3",
				header: "@hero_says:Герой:",
				text: "@gadom_budu:Гадом буду!"
			});

			await st.popup(s, {
				type: "iconRight",
				icon: "icon_delivery",
				header: "@tlf_delivery_says:Служба доставки:",
				text: "@oh_yeah_show_it:Да? А покажьте-ка его в веб-камеру..."
			});

			await st.popup(s, {
				type: "iconLeft",
				icon: "icon_hero_e5_m4",
				header: "@hero_says:Герой:",
				text: "@blin:Блин."
			});

			await st.popup(s, {
				text: "@data_didnt_work:Попытка обойтись голыми данными вместо\
 настоящего паспорта не прокатила. Следовало каким-то образом придать им более\
 материальную и убедительную форму."
			});
			return;

		} else {
			await st.popup(s, {
				type: "iconTop",
				icon: "icon_hero_e4_m2",
				text: "@tlf_no_credit:Герой не был финансовым гением, но точно\
 помнил, что для оформления кредита потребуется предъявить паспорт -\
 желательно, какого-нибудь нехорошего человека."
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
					header: "@tlf_delivery_says:Служба доставки:",
					text: "@tlf_angry_1:Алё! Так вы будете чего-нибудь\
 заказывать или нет? Алё! Чего молчите? Чё за нафиг?! Алё!.."
				});
				break;

			case 1:
				gs.f_delivery_angry = 2;
				await st.popup(s, {
					type: "iconRight",
					icon: "icon_delivery",
					header: "@tlf_delivery_says:Служба доставки:",
					text: "@tlf_angry_2:Это вы сюда звоните просто в трубу\
 помолчать? Думаете, смешно, да? А нам не смешно ни хрена! Телефонный центр\
 у нас, сцуко, не бесплатный! Хулиганьё сраное!"
				});
				await st.popup(s, {
					type: "iconLeft",
					icon: "icon_hero_e4_m5",
					header: "@hero_says:Герой:",
					text: "@tlf_angry_hero_comment:А с вежливостью там не\
 алё. Какие-то они нервные."
				});
				break;

			case 2:
				gs.f_delivery_angry = 3;
				await st.popup(s, {
					type: "iconRight",
					icon: "icon_delivery",
					header: "@tlf_delivery_says:Служба доставки:",
					text: "@tlf_angry_3:Ну всё, нас задолбало! Ты кто там ваще\
 такое, чмо? Шутник телефонный? Сервал Лексус хренов? Вот мы ща тебе так\
 пошутим, что от юмора костями усрёшься! Мы отследили звонок, щас пацаны\
 к тебе на адрес заедут! Всю вашу шайку в натуре порешаем!"
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
			text: "@tlf_toad:Героя душила жаба платить за банальнейшие услуги,\
 но он успокаивал себя логическими доводами. Легко пришло, легко ушло.\
 Где тугрик, там и другой. Прошвырнуться ещё раз по местам, где уже находил\
 халявные бабки - глядишь, найдутся и новые взамен потраченных.\n\
 Так говорила логика. Это успокаивало.\n\
 Но было трудно. Жаба всё равно душила."
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
		text: "@tlf_delivery_checkpoint:Ура, герой купил контрольную точку!\
 Теперь, если случится неприятное, ему не придётся откатываться в самое начало\
 игры."
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
			text: "@tlf_delivery_cluttered:Площадка для доставки предметов\
 загажена. Пожалуйста, разгребите предметы с площадки перед использованием\
 данного сервиса."
		});
		return {
			action: "ac.dial",
			callOk: true
		};
	} else if (itemsToDeliver <= 0) {
		await st.popup(s, {
			text: "@tlf_delivery_nothing:На данный момент недоставленных\
 предметов не имеется. Перезвоните, когда потеряете что-нибудь."
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
				leftText: "@inv_deliver:Доставить",
				leftResult: itemId,
				selected: items.length == 0
			});
		}

		items.push(
			"hr",
			{
				text: "@inv_do_nothing:Так точно",
				enabled: true,
				leftText: "@tlf_deliver_none:Не доставлять",
				leftResult: "exit"
			}
		);

		var result = await st.menu(s, {
			title: "@tlf_what_deliver:Что решил доставить герой?",
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
					text: "@tlf_delivery_no_money:Заказывать доставку было\
 прикольно, но у героя закончились бабки."
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
			header: "@hero_says:Герой:",
			text: "@do_you_have_any_free_service:А у вас есть что-нибудь\
 бесплатное? Промо-раздачи там, акции-облигации там всякие..."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@only_hren_do_you_have_panama:Бесплатно можем предложить\
 только хрен в панамку. У вас есть панамка?"
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e4_m3",
			header: "@hero_says:Герой:",
			text: "@eh_no:Э-э... Нету."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@any_other_headdress:Ну, хотя бы какой-нибудь другой\
 головной убор?"
		});
		
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e5_m3",
			header: "@hero_says:Герой:",
			text: "@eh_no:Эм-м... Нету никакого."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@sorry_then:Ну, тогда извините."
		});

		await st.popup(s, {
			type: "iconTop",
			icon: "icon_hero_e5_m4",
			text: "@who_could_think_no_cap:Кто бы мог подумать, что получению\
 героем халявы помешает такая позорная мелочь, как отсутствие шапки?"
		});
	} else {
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:Герой:",
			text: "@do_you_have_any_free_service:А у вас есть что-нибудь\
 бесплатное? Промо-раздачи там, акции-облигации там всякие..."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@only_hren_do_you_have_panama:Бесплатно можем предложить\
 только хрен в панамку. У вас есть панамка?"
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:Герой:",
			text: "@no_panama_but_this:Панамки нет, но есть вот такая...\
 э-э-э... шапка."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_delivery",
			header: "@tlf_delivery_says:Служба доставки:",
			text: "@will_do_place_it:Сойдёт. Подставляйте...|\
\nГотово. Спасибо за интерес к нашим услугам!"
		});

		await st.popup(s, {
			text: "@as_the_proberb_says:Как гласила известная поговорка, на\
 халяву уксус сладкий. Сладкий уксус, бр-р, ужас-то какой... К счастью,\
 насчёт хрена поговорка ничего не гласила, поэтому доставшийся герою хрен был\
 самым обычным."
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
		text: "@popup_mk152:Товарищ, вы недопоняли ситуацию. МК-152Ъ был\
 пристёгнут к руке героя. В смысле, совсем. В смысле, неснимаемым образом.\
 Его же не подарили, а навязали для оценки и контроля - не забыли?"
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
		text: "@popup_no_drop_on_rails:Бросать предметы на рельсы было\
 нехорошо. Это было, как минимум, свинством. Герой же был благородным\
 грабителем корованов, а не свинотой."
	});
});

SCRIPT_ADD("*", "cs.noDropPartizan",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_partizan:Было неразумно оставлять вещи\
 прямо в месте, кишащем партизанами, только и ждущими, как бы реквизировать\
 что-нибудь для своих сомнительных партизанских нужд."
	});
});

SCRIPT_ADD("*", "cs.noDropTractor",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_tractor:Класть предметы прямо под колёса\
 полоумному трактору c Пьяной Свиньёй за рулём? Ну, знаете ли... нет."
	});
});

SCRIPT_ADD("*", "cs.noDropObstrel",
async function (s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_no_drop_obstrel:Оставлять вещи под танковым обстрелом,\
 чтоб потом их хрен достать обратно? Это глупо, как минимум."
	});
});

// drop torchlight for 1st time
SCRIPT_ADD("*", "onDrop",
async function torchlightDrop(s, {gs, tmps, st, action}) {
	if (gs.currentScreen != "sA2" && action.itemId == "it_torchlight"
		&& !gs.f_torchlight_dropped) {
		gs.f_torchlight_dropped = true;
		await st.popup(s, {
			text: "@popup_drop_torchlight:Избавиться от перспективы постоянно\
 носить фонарь оказалось на удивление легко - просто взять да выложить из\
 инвертаря. С обременениями посерьёзнее, типа МК-152Ъ, такой фокус, увы, не\
 прокатывал."
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
		text: "@hero_didnt_know_physics:Герой плохо знал физику и не учёл, что\
 информация нематериальна. Едва оказавшись без материального носителя, данные,\
 по мнению актуального научного консенсуса, тут же перестали существовать."
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
		header: "@hero_says:Герой:",
		text: "@fuck_ok_need_new_data:Ну зашибись. Придётся идти качать новые."
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
				text: "@popup_no_medved_tracks:Инструкция к трассировщику\
 предлагала следующее:\
\n1. Встать на особое место.\
\n2. Навести прибор в сторону предполагаемого появления или исчезновения\
 меведя.\
\nС особым местом проблем не было, а вот медведотропного направления\
 в данной локации герой пока не знал."
			});

			if (gs.currentScreen == "sA1") {
				await st.popup(s, {
				text: "@popup_not_this_medved:(Медведь, занимавший\
 местный пейзаж, в счёт не шёл - он явно уже никуда не исчезал и не\
 появлялся.)"
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
				header: "@hero_says:Герой:",
				text: "@need_to_try_nearby:Надо попробовать на соседних\
 экранах."
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
		header: "@mk152_says:МК-152Ъ:",
		text: "@mk152_beep:Бип, бип, бип-бип-бип..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@got_it_no_abroad:Понял, за границу не гуляем."
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
		header: "@tankist_says:Злющий танкист:",
		text: "@right_through_the_walls:И, значит, прямо сквозь стены, и\
 прямо, значит, табуном, да? Типа, на всех патронов не хватит? Мать-перемать,\
 ещё и газы!.."
	});
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:Злющий танкист:",
		text: "@are_you_kidding_assholes:Это кого вы на границу вызвали? Вы\
 что, сволочи, угораете?!"
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
		header: "@tankist_says:Злющий танкист:",
		text: "@hey_shit_cant_you_read:Эй, говно! Читать не умеешь?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@no_and_what:Нет. А чо?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:Злющий танкист:",
		text: "@border_locked_heres_what:Граница на замке, вот чо. Нарушители\
 расстреливаются без предупреждения! Ясно? Вон, тля, табличка поставлена для\
 грибников всяких сраных. Давай, канай отсюда!"
	});

	return { action: "ac.assignTargets" };
});

SCRIPT_ADD("sA0", "cs.debilEnable",
async function (s, {gs, tmps, st, action}) {
	gs.f_debil_enabled = true;
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m2",
		header: "@hero_says:Герой:",
		text: "@no_and_what:\"Гра-ница на замке. Ни шагу дальше этого знака.\
 Рас-стрел из танка без преду-пре-ждения.\""
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
		text: "@medved_flee_bad:Медведь, окончательно утративший волю и\
 интерес к жизни, перемещался на юг на беспорядочно перепутанных лапах,\
 совершенно уже не разбирая карты. Герой всё сильнее сомневался, хочет ли\
 узнать, чем закончилось жуткое происшествие..."
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
		text: "@no_drain_with_bottle:Нет, ну, конечно, теоретически, так тоже\
 было можно, но... Ходить за халявной соляркой с бутылкой выглядело каким-то\
 совсем уж запредельным лоховством. Да и потом, данную стеклотару\
 предполагалось задействовать под более подходящее по формату содержимое..."
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
		text: "@hero_drained_tank:Пользуясь занятостью танкиста на другом\
 фланге, герой невозбранно перекачал солярку из танкового бака в ненасытное\
 нутро канистры."
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
		header: "@tankist_says:Злющий танкист:",
		text: "@ah_square_hlebalo:Ааа, хлебало квадратное! Ну всё, звизда\
 тебе! Щас, вот как только с дегенератами доразберусь, так сразу тебе и\
 звизда. Готовься."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m5",
		header: "@hero_says:Герой:",
		text: "@will_you_catch_up:А догонишь, пешком-то?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:Злющий танкист:",
		text: "@uh_i_ll_get_ya:Ууу... Ну, попадёшься ты мне поперёк узкого\
 окопа, падла-а!.. Ох, попадёшься-а!.."
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
		text: "@popup_tank_gone:Опа! Разобравшись с креаклами, танкист исчез\
 в неизвестном направлении, предусмотрительно не оставив бесхозным ничего, что\
 сохраняло боевую ценность или транспортабельность."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:Герой:",
		text: "@where_did_he_go:Не меня ли пошёл искать? Пожалуй, надо теперь\
 ходить и оглядываться... Больно уж злой дядя."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m2",
		header: "@hero_says:Герой:",
		text: "@how_he_got_turret:Интересно, как он башню-то упёр? Не на лыжи\
 же поставил?.."
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
		text: "@medved_no_life_sign:Медведь, несмотря на стимулы, упорно не\
 подавал признаков жизни. Это одновременно и страшило, и обнадёживало.\
\nНевдалеке герой заметил шапку, видимо, свалившуюся с головы незадачливого\
 мишки в процессе борьбы за живучесть..."
	});
	gs.it_turban_enabled = true;
});

SCRIPT_ADD("sA1", "cs.medvedDetected",
async function medvedDetected(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@medved_end:Итак, здешний медведь и был тем самым топтыгиным,\
 пострадавшим от излишней самоуверенности. Это объясняло многие странности.\
 К примеру, непотребную шапку медведь носил не сам по себе - всего лишь\
 единственный трофей, который бедолага смог удержать в зубах. И то,\
 что из жопы у бывшего владыки лесов торчит не геморрой, а утюг, герою тоже\
 отнюдь не показалось..."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_detector" });
	st.discardPickableItem({ gs: gs, itemId: "it_scanner" });
});

SCRIPT_ADD("sA1", "cs.extractIron",
async function extractIron(s, {gs, tmps, st}) {
	hlsfxPlaySFX({ sfxId: "chpok" });
	await st.popup(s, {
		text: "@iron_extracted:Итак, расследование загадочного происшествия в\
 лесу и судьбы медведя подошло к печальной, поучительной и - глупо отрицать -\
 откровенно дурно попахивающей разгадке. Но историю нельзя было считать\
 завершённой. Образ гражданина, столкнувшегося с медведем, с каждой новой\
 находкой проступал всё рельефнее - и от мысли, что гражданин, способный на\
 подобное, бродит где-то по соседству, герою становилось всё некомфортнее.\
 Поездка в Мурманск по заданию Родины внезапно начинала выглядеть на удивление\
 своевременно."
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
		text: "@popup_keep_light_weapon:В этом тёмном и стрёмном месте не\
 следовало выпускать из рук оружия и осветительных приборов."
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
		text: "@popup_hero_inside_but_smth_is_wrong:Итак, герой проник в\
 логово коррумпированного председателя. Но его не отпускало ощущение, будто\
 что-то не так. Подозрительная игра теней в робком свете фонарика? Или что-то\
 не так с инвертарём?.. А, точно - он же был полностью забит предметами,\
 которые здесь нельзя было выложить. Всё, что герой мог сделать в такой\
 ситуации - походить да посмотреть на местную роскошь голодными глазами.\n\
 Проблему недостаточно свободных рук следовало как-то решать, и побыстрее,\
 пока не нагрянули конкуренты."
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
		text: "@mk152_hacked_the_comp:МК-152Ъ, как всегда, быстро принудил\
 строптивую неприятельскую технику к сотрудничеству."
	});
	await st.popup(s, {
		text: "@popup_files:В председательском компе оказалось много файлов,\
 смысл которых было трудно уловить в условиях полевого криптоанализа. Быть\
 может, в распечатанном виде они выглядели бы понятнее? По счастью, рядом\
 как раз имелся принтер. Но, к сожалению, не готовый к работе..."
	});

	gs.f_printer_enabled = true;
});

SCRIPT_ADD("sA2", "cs.printerNotReady",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_not_ready:Загадочную документацию с\
 председательского компа оставалось только распечатать. Но принтер ещё не был\
 полноценно подготовлен..."
	});
});

SCRIPT_ADD("sA2", "cs.printProject",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_printer_printed:Герой ввёл команду, и принтер,\
 накормленный всем необходимым, с довольным урчанием принялся стучать,\
 как заправский информатор. Вскоре замыслы председателя были преданы\
 бесстрастной бумаге..."
	});

	gs.it_project_enabled = true;

	await st.popup(s, {
		title: "@hex_project:Проект железнодорожной станции",
		text: "@tex_project:В распечатанном виде документ из компьютера\
 обрёл ясность и отчётливость: это был проект железнодорожной станции.\
 Коррумпированный председатель собирался поставить разворовывание и вывоз\
 колхозного добра, в буквальном смысле, на самые широкие рельсы. Проект\
 был максимально проработан и подготовлен к исполнению. Разве что формат\
 страниц отличался от привычного А4...\
\nЕдинственное, по-видимому, что до сих пор мешало началу строительства -\
 феноменальное жлобство коррупционера, жавшегося на расходники для печати."
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
		text: "@popup_printer_fueled:Герой залил топливо в бак принтера,\
 подёргал за ручку, и аппарат, прокашлявшись, с готовностью заурчал,\
 перерабатывая солярку в выхлопные газы. Вытяжка не работала, но герой\
 рассчитывал закончить дело до того, как обитель порока превратится в\
 прокопчённый газенваген, и не возражал предоставить решение данной\
 проблемы последующим посетителям."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_tank_full" });
	gs.f_printer_fueled = true;
});

SCRIPT_ADD("sA2", "cs.paperPrinterTooEarly",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_paper_too_early:Смелый и остроумный замысел героя\
 разбивался об тот факт, что при неработающем моторе лампочки-подсказки на\
 агрегате не горели, и не было ясно, куда в нём нужно заряжать бумагу..."
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
		text: "@popup_printer_papered:Герой заправил рулон в принтер. Принтер\
 возражений не имел - можно было приступать к печати. Так что там за файлы в\
 председательском компе?"
	});

	st.discardPickableItem({ gs: gs, itemId: "it_paper" });
	gs.f_printer_ready = true;
});

SCRIPT_ADD("sA2", "cs.inspectTolchok",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@popup_mansion_tolchok:Председатель пытался жить на широкую\
 ногу и конвертировать богатства, наворованные у державы, в статус, но в его\
 потугах сквозила мещанская ограниченность представлений о роскоши."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@how_his_ass_doesnt_crack:Да как у него жопа-то не треснет\
 в такой толчок гадить! Да ещё в два сразу!.."
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
		text: "@popup_proc_id_obtained:Поворошив граблями по недрам и\
 бранзулеткам впавшей в ничтожество львицы, герой вытащил неплохо\
 сохранившийся документ..."
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
		header: "@popup_director_mansion:Хоромы председателя",
		text: "@popup_director_mansion_text:Коррумпированный председатель\
 колхоза старался жить на широкую ногу. С наворованного добра он выстроил\
 себе роскошные хоромы, в которых даже сейчас, пока хозяин пребывал в отъезде,\
 не прекращался чад кутежа.\n\
 А от народа и закона коррупционер и самодур отгородился бетонной стеной и\
 вооружённым до зубов рвом с крокодилами."
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
		text: "@popup_director_mansion_sec_off:Реквизиция золотого шара не\
 прошла незамеченной для электроснабжения председательских хором. Система\
 безопасности коррупционера от народа более не представляла проблемы.\
\nБыло самое время наведаться и поискать чего-нибудь полезное, пока народ\
 не просёк перемен и не потянулся с той же целью."
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
		text: "@popup_wire_observed:Разнузданный праздник жизни и его\
 вооружённо-крокодилизированное охранение потребляли прорву электричества.\
 Было страшно подумать, где председатель его столько ворует (в том, что\
 именно ворует, никаких сомнений быть не могло).\
\nОт трансформаторной будки куда-то в сторону колхозного поля тянулись\
 провода. Возможно, стоило не думать, а просто сходить туда и посмотреть?"
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
		header: "@popup_zone_field:Колхозное поле",
		text: "@popup_zone_field_text:За десятилетия коррупции и нерадения\
 колхозное поле прошло все мыслимые и немыслимые стадии запустения, заросло\
 аномалиями и превратилось в самую настоящую Зону. Там царил полный Адъ,\
 Израиль и Gamedev.ru.\n\
 Очаг несостоявшегося плодородия был обнесён периметром с колючей проволокой,\
 и это вовсе не казалось чрезмерной предосторожностью."
	});
});

SCRIPT_ADD("sA4", "cs.observeGoldBall",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		header: "@popup_goldball:Золотой шар",
		text: "@popup_goldball_text:В глубине Зоны искрил и призывно\
 маячил золотой шар. Странное чувство подсказывало герою, что это очень\
 полезный артефакт, на который нужно непременно наложить лапу. Но как это\
 сделать? Соваться в настолько ядрёную Зону мог рискнуть только опытный\
 сталкер. Герой же, при всех своих достоинствах, на сталкера не тянул."
	});

	if (gs.f_stalker_intro) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e4_m1",
			header: "@hero_says:Герой:",
			text: "@i_know_a_guy:...но, кажется, у меня есть на примете\
 подходящий спец."
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
		header: "@stalker_says:Сталкер:",
		text: "@here_hold_your_ball:Вот... к-каароче... держи свой ш... шар."
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
		header: "@stalker_says:Сталкер:",
		text: "@but_something_broken_in_mansion:Т... только этово... к-когда я\
 его взял, то... к-кажись... т-там у п-председателя на хате чо-то с...\
 сломалось. Так шо... этово... если он из к-командировки взад п-притаранит...\
 лучче т-тебе тово... на всякслучай... ну... от него п-подальше быть."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:Герой:",
		text: "@you_were_fast:Спасибо, сталкер, выручил. А быстро у тебя\
 получилось!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@the_old_school:Ну д-дык. Ст-тарая школа! Зона - она ж это...\
 как тварь живая... П-подход любит..."
	});

	st.object("stalker_A4").state = "on-balalaika-left";
	await st.waitTicks(s, 120);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@and_needs_understanding:К ней... с п-понятиями надо. А\
 м-молодёш-то без п-понятий совсем п... пошла..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@and_needs_understanding_2:П-председатель, сцуко... В к-колхозе всё\
 п-покрал, теперь н-на Зону глаз п-положил... Да с Зоны т-то тащить ссыкотно...\
 Так он, с-слышь, чо уд... думал?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@and_needs_understanding_3:Открою... грит... ст-талкерское\
 сафари... П-понаедут сюда, значит, м-мамкины ст-талкеры... лазить б-будут,\
 т-типа э... эк... к... кстрим... артефакты к-красть... так от прям и сказал,\
 п-прикинь?\n\
 А он, зн-начит... т-типа бар п-построит, будет у них п-покраденное скупать и\
 б... барыжить. Ну не сц... цук-ко... а?"
	});

	st.object("stalker_A4").state = "on-balalaika";
	await st.waitTicks(s, 120);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@not_at_our_generation:Х... хрен ему, м... мудиле жадному!\
 Пока н-наше п... п-поколение живо, не б-бывать такому б... блинству! С\
 Зоны, и красть... Иш чо загнул ж... жопошник... Мы... честные ст-талкеры...\
 не крадём! Мы...| х...| хх...| хабарим!!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:Герой:",
		text: "@did_you_drink_it:А ты что, уже и гонорар весь употребил?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@i_did_and_what:Ну д... да... А ш... шо т... такова?..\
 Х... хх... хрр...."
	});

	gs.f_stalker_done_sleep = true;
});

SCRIPT_ADD("sA4", "cs.stalkerWhereIsBottle",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m3",
		header: "@hero_says:Герой:",
		text: "@stalker_stalker:Сталкер!.. Сталкер!!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@huh_what:Хррр... хр... А?.. Ш-шо?.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@where_is_bottle:А бутылка из-под гонорара где?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@bottle_uh_bottle:П... путылка?.. м...| ммм...|\
\nв ларёк я её с... сдал, твою п-путылку...|\
\nСлуш, шо ты т-такой... м... мелочный? Фу т-таким б... быть...\
| х...| ххррр..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:Герой:",
		text: "@picky_but_bottle_is:Ну, мелочный не мелочный, а нефиг\
 стеклотарой разбрасываться. Водки тут теперь целая река, а бутылка одна...\
 В ларёк, значит? Ну чо, заглянем в ларёк."
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
		header: "@popup_sut:Станция юных натуралистов",
		text: "@intro_sut:Во времена советской власти партия заботилась о\
 всестороннем развитии детей школьного возраста и покрывала самые отдалённые\
 углы Отечества кружками, секциями и питомниками. Вот и в колхозе построили\
 станцию для юных натуралистов, склонных к изобретательству. Разумеется, с\
 поправкой на то, что здесь ещё тогда заправлял упырь-председатель. Так,\
 например, оборудование и материалы для практических занятий досюда не\
 доехали. Колхозным юннатам достались только стенды с рецептами для\
 таковых занятий. И то, имелось сильное подозрение, что оные стенды юннаты\
 сами же и сделали. Сквозила в этих рецептах какая-то безысходная\
 практичность, не характерная для теплично-травоядной советской школпечати."
	});
});


SCRIPT_ADD("sA5", "cs.exMakePassport",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:Стенд с рецептом для умелых ручонок",
		text: "@recipe_passport:Изделие: паспорт человека и гражданина\
\nТех.-эк. обоснование: Ой-вэй, ви имеете спрашивать, зачем таки приличному\
 человеку и гражданину может понадобиться паспорт?\
\nИнгридиенты: а) рыба, б) паспортные данные\
\nИзготовление:\
\n1. Возьмите рыбу.\
\n2. Заполните рыбу паспортными данными.",
		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:Герой:",
			text: "@it_is_complicated:Чо-то сложно. Хрен запомнишь. Это надо\
 всё нести сюда и по шпаргалке крафтить..."
		});
	}

	gs.f_make_passport_inspected = true;
});

SCRIPT_ADD("sA5", "cs.exMakePistolTorchlight",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:Стенд с рецептом для умелых ручонок",
		text: "@recipe_pistol_torchlight:Изделие: пистолет с фонариком\
\nТех.-эк. обоснование: Пистолет с фонариком занимает на 1 инвертарное место\
 меньше, чем просто пистолет и фонарик.\
\nИнгридиенты: а) пистолет, б) фонарик, в) изолента (или заменитель)\
\nИзготовление:\
\n1. Оберните пистолет изолентой. Один конец ленты оставьте длинным - это\
 важно!\
\n2. Прикрутите фонарик к пистолету свободным концом изоленты.\
\nPS: Смотрите, не перепутайте шаги! Сначала - пистолет и изолента, и\
 только потом - фонарик!",
 		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:Герой:",
			text: "@to_complicated:Ну прям ваще сложно... Я точно не запомню.\
 Придётся крафтить прямо здесь."
		});
	}

	gs.f_make_pistol_torchlight_inspected = true;
});

SCRIPT_ADD("sA5", "cs.exMakeExplosiveVodka",
async function(s, {gs, tmps, st, action}) {
	var p = await st.popup(s, {
		header: "@mount:Стенд с рецептом для умелых ручонок",
		text: "@recipe_explosive_vodka:Изделие: заминированная водка\
\nТех.-эк. обоснование: подсунуть врагу\
\nИнгридиенты: а) водка, б) взрывчатое вещество\
\nИзготовление:\
\n1. Разотрите взрывчатое вещество до порошка.\
\n2. Засыпьте порошок в бутылку с водкой и встрях\
\n(продолжение текста написано другим почерком и не очень разборчиво\
 из-за каких-то пятен, заляпавших стенд)\
\nосторожно перемешайте до полного растворения.",
		enableSkip: true
	});

	if (!p.skipped) {
		await st.popup(s, {
			type: "iconRight",
			icon: "icon_hero_e5_m2",
			header: "@hero_says:Герой:",
			text: "@why_so_complicated:Ну сложно же. Прямо хоть неси всё сюда\
 и крафть с этой штукой перед глазами."
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
		header: "@it_doesnt_work:Ничего не вышло",
		text: "@hero_forgot_somehting:Герой невнимательно изучил инструкцию и\
 забыл поднести к месту крафта кое-какие ингридиенты."
	});
});

SCRIPT_ADD("sA5", "cs.makePassport",
async function(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "chimes" });
	await st.popup(s, {
		header: "@popup_passport:Паспорт",
		text: "@passport_made:Следуя инструкциям на стенде, герой сделал из\
 рыбы и паспортных данных самый настоящий паспорт! Ну, то есть, конечно,\
 с точки зрения закона вопрос о настоящести паспорта был крайне скользкий,\
 но данные креакла в нём точно были настоящие. Герой и МК-152Ъ гарантировали\
 это. Как и то, что их мерзопакостствующий обладатель вскоре перестанет\
 мерзопакостить в связи с появлением у себя более актуальных проблем.",
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_major",
		header: "@major_says:Т-щ майор:",
		text: "@info_legal_notice:\
\u26A0 МИНУТКА ПРАВОВОЙ ИНФОРМАЦИИ \u26A0\
\nТоварищи! Помните: подделка документов сурово преследуется по закону. Не\
 пытайтесь повторить гнусный поступок героя в жизни и ни в коем случае не\
 рассматривайте его методы как руководство к решению каких-либо проблем.\
 В целях недопущения нарушения закона, рецепт изготовления паспорта в данной\
 игре подменён заведомо неработающим."
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
		header: "@it_doesnt_work:Ничего не вышло",
		text: "@hero_mixed_steps:Герой невнимательно изучил инструкцию и\
 перепутал шаги крафта."
	});
});

SCRIPT_ADD("sA5", "cs.makePistolScotch",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		header: "@popup_pistol_scotch:Пистолет, обёрнутый скотчем",
		text: "@pistol_scotch_made:Герой тщательно обернул пистолет скотчем,\
 не забыв оставить длинный свободный кусок. Сложная инструкция выветривалась\
 у него из головы быстрее, чем продвигался крафт, но то, что оставить длинный\
 свободный кусок - это очень важно, герой успел запомнить.",
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
		header: "@popup_pistol_torchlight:Пистолет с фонарём",
		text: "@pistol_torchlight_made:Ура! У героя получилось осилить очень\
 сложный крафт, и он стал счастливым и заслуженно гордым собой обладателем\
 пистолета с фонарём.",
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
		header: "@popup_explosive_vodka:Заминированная водка",
		text: "@explosive_vodka_made:Герой скрафтил бутылку заминированной\
 водки. И ужаснулся, как только понял, какая недобрая вещь у него получилась."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m4",
		header: "@hero_says:Герой:",
		text: "@explosive_vodka_what_ive_done:Ох ты ж эпическая сила! Это ведь\
 заминированная водка!! Господи, что же я сделал!.. Вот этими самыми руками..."
		});

	await st.popup(s, {
		text: "@only_hope_it_will_justify:Оставалось надеяться, что герой\
 учинил столь порицабельное непотребство для благого дела, и что в процессе\
 оного благого дела не пострадают безвинные."
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
		header: "@hamster_says:Креакл-хомячок:",
		text: "@who_goes_therrre:Кто прррипёрррся?!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@a_customer:Посетитель."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:Креакл-пингвин:",
		text: "@customers_fuck_off:Посетители идут нахеr. Пrинимаем только\
 кандидатов в паrтию. Вместе с донатами."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m4",
		header: "@hero_says:Герой:",
		text: "@a_candidate_then:Ну, тогда кандидат!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:Креакл-хомячок:",
		text: "@why_candidate_with_square_face:А чо морррда квадррратная?!\
 Ватник, штоле?!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:Креакл-пингвин:",
		text: "@i_think_hes_from_olgino:Сдаётся мне, что нихrена это не\
 кандидат, а ольгинский пrовокатоr."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@how_can_you_im_folk:Да как можно! Я - кандидат от народа!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:Креакл-хомячок:",
		text: "@tell_folk_password:А чо донат не пррринёс?! Врррёшь небось,\
 душитель рррусской демокррратии! Ну-ка скажи наррродный паррроль...|\
\nПТН| ПНХ!!!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@eh_ptn:Э... птн..."
	});

	hlsfxPlaySFX({ sfxId: "beep-beep-2" });
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_mk152",
		header: "@mk152_says:МК-152Ъ:",
		text: "@mk152_beep:Бип, бип, бип-бип-бип..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@eh_is_power:... - сила, предателей - на мыло!|\
 Грантососы!| Подпиндосники!| Вы здесь не власть!| В шарагу, на лекции!|\
 Паразитарный класс!| Марш работать на завод!| Мало вас менты щемят!|\
 Охреневшие бездельники!| Поедете под Воркуту шконки варежками обшивать!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m1",
		header: "@hero_says:Герой:",
		text: "@how_good_to_tell_truth:...фух, аж попустило. До чего же легко\
 и приятно говорить правду!.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:Креакл-пингвин:",
		text: "@like_i_thought:Ну, как я и пrедполагал. Тrидцатиrублёвый\
 охrанительский моrдовоrот."
	});

	await st.popup(s, {
		text: "@text_sortir_locked:Дверь в сортир негостеприимно захлопнулась\
 перед носом героя.\
\nДа не очень-то и хотелось.\
\nС другой стороны, оставлять безобразие безнаказанно нарушенным было тоже\
 нельзя."
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
		text: "@hero_throws_grenade:Герой закинул в окно сортира гранату\
 и стал ждать результата..."
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
		header: "@penguin_says:Креакл-пингвин:",
		text: "@penguin_rumol:Позоrный rумоловский нашист."
	});
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hamster",
		header: "@hamster_says:Креакл-хомячок:",
		text: "@hamster_wooden_grenade:Рррассчитывал напугать нас\
 деррревянной гррранатой?! Черррносотенец! Уррралвагонзаводник!!"
	});
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_penguin",
		header: "@penguin_says:Креакл-пингвин:",
		text: "@penguin_and_chmo:И чмо. Таки да, ещё и чмо."
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
		header: "@hero_says:Герой:",
		text: "@hero_you_fucking_kreakls:Сраные креаклы! Вот я вам ща...\
 вот ща как придумаю, чего я вам ща..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:Герой:",
		text: "@hero_blin_black_eye:Блин, теперь фонарь будет на пол-морды."
	});

	await st.popup(s, {
		text: "@text_torchlight_obtained:Герой, не желая того, обзавёлся\
 большим и ярким фонарём."
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
			text: "@text_no_vandalism:Вандализировать ценный прибор в отместку\
 креаклиату смысла не было - т-щ майор вряд ли одобрил бы саботаж оперативных\
 мепроприятий. А вот подключиться и посмотреть, чем живёт и думает лох,\
 которому под видом станции в свободные микроспутниковые интернеты впарили\
 переодетый сотовый момед с неоправданно дорогим тарифным планом, было\
 энтомологически интересно..."
		});
	}

	var maxItems = gs.f_backpack_collected ?
		GameConst.INVENTORY_SIZE_EXPANDED :
		GameConst.INVENTORY_SIZE_DEFAULT;
	if (gs.inventory.length >= maxItems) {
		await st.popup(s, {
			type: "iconTop",
			icon: "icon_hero_e5_m4",
			text: "@hero_got_no_space:...но у героя в инвертаре не было\
 свободного места под возможные находки."
		});
		return;
	}

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e4_m5",
		text: "@hero_got_data:Повисев на траффике между сортиром и соцсетями,\
 герой и МК-152Ъ без труда стали обладателями паспортных данных какого-то\
 случайного креакла."
	});

	if (!gs.f_data_intro) {
		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_major",
			header: "@major_says:Т-щ майор:",
			text: "@info_security_minute:\
\u26A0 МИНУТКА ИНФОРМАЦИОННОЙ БЕЗОПАСНОСТИ \u26A0\
\nТоварищи! Помните: предоставление личных данных соцсетям - самый надёжный\
 способ сделать их достоянием неопределённо широкого круга лиц!\
 При регистрации и эксплуатации соцсетей избегайте передачи информации,\
 утечка которой может повлечь финансовый, административный или моральный\
 ущерб."
		});

		await st.popup(s, {
			type: "iconRight",
			icon: "icon_public",
			header: "@public_says:Вопрос из зала:",
			text: "@but_they_all_require_it:Так ведь они все её требуют. Не\
 передашь - хрен где зарегистрируешься..."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_major",
			header: "@major_says:Т-щ майор:",
			text: "@register_nowhere:Вот нигде и не регистрируйтесь. Ибо\
 нехрен."
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
		text: "@text_sortir_blocked:Вместительный валенок аккуратно и\
 решительно зачехлил сортирную трубу, оставив креаклов в изоляции\
 наедине с их богатым внутренним миром."
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
		text: "@text_kreakls_run_abroad:Дезориентированные внезапным\
 напором собственного креатива, затопившего сортир, креаклы предались\
 панике, начали беспорядочно покидать помещение и, не понимая, что\
 происходит, по стойкой классовой привычке инстинктивно побежали в сторону\
 западной границы."
	});

	await st.waitTicks(s, 180);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m5",
		header: "@hero_says:Герой:",
		text: "@hero_how_is_it_kreakls:Чо, креаклиат, невмоготу стало?\
 Как только всё своё дерьмо пришлось в себе оставлять, так сразу тяжко\
 сделалось?"
	});

	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: stHero.position
	});
	await st.waitTicks(s, 60);
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m2",
		header: "@hero_says:Герой:",
		text: "@hero_they_flushed_it:А ведь они здесь сидели и это всё прямо\
 в Россию высирали... Немудрено, что речка-то засахарилась!"
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
		text: "@text_grenade_not_wood:К несказанному удивлению героя,\
 старая добрая граната оказалась не деревянной, а самой что ни на есть\
 настоящей. Просто с очень медленным запалом."
	});
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@hero_grenade_wow:Вот те и раз... А я ей орехи колол..."
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
		text: "@medved_flee:Подозрения превращались в уверенность: медведь\
 наехал на добычу не по зубам. Вопрос здесь совершенно точно стоял уже не об\
 обеде, а о спасении горемычной бурой шкуры. Поруганный хищник стремительно\
 отступал всё дальше на запад - и отступал в такой раскорячке, что герою было\
 страшно подумать, какое именно поругание над ним учинил разъярённый\
 приезжий... Да что же это был за страшный человек такой? И человек ли?"
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
		header: "@title_backpack:Дерзкий рюкзачок",
		text: "@text_backpack_collected:Отлично! Герой надел дерзкий рюкзачок,\
 и его грузоподъёмность увеличилась...|\nна целый 1 предмет! Теперь можно было\
 ни в чём себе не отказывать."
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
		text: "@medved_turntide:Чем дальше, тем менее герой становился уверен\
 в развязке истории медведя и незадачливого туриста. Да и в том, кто из них\
 оказался незадачливым... Судя по следам в данной локации, исход конфликта уже\
 совсем не представлялся очевидным."
 	});

 	await st.popup(s, {
 		text: "@medved_turntide_2:Битва перемещалась на запад, невзирая на\
 препятствия, и герой был даже где-то рад, что путь к продолжению\
 расследования преграждает непроходимая для нормального человека чаща. Он\
 сомневался, что готов без подготовки узнать продолжение столь странно\
 поворачивающейся истории."
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
 		text: "@valenok_obtained:Аккуратно манипулируя граблями, герой вытянул\
 на свет одиночный валенок. Потрёпанный, но, к облегчению героя, пустой. Но\
 оттого - ещё более подозрительный."
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
 		text: "@voyager_identified:От аппарата отвалилась проржавевшая\
 пластинка с какими-то каракулями и иностранными письменами на оборотной\
 стороне: \"Voyager-1\ (c) 1977 NASA Property of the U. S. Govt\".\
\nГерой не особо интересовался космическими новостями, но ему почему-то\
 казалось, что аппарат с такими параметрами уже много лет как летит из\
 Солнечной Системы в далёкие жопы космоса, передавая по пути кучу всяких\
 научных данных и фоточек..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m2",
		header: "@hero_says:Герой:",
		text: "@what_if_pindosians_lied:А что, если пиндосы всем врут, и\
 никуда он у них не полетел, а данные сочиняют, и фотки в фотошопе рисуют?..\
\nДа ну, бред какой-то..."
	});

	await st.popup(s, {
 		text: "@voyager_to_be_looted:Тем не менее, вопрос о реквизиции\
 трофеев с повестки не снимался. Герой осмотрел аппарат более тщательно,\
 высматривая наиболее ценное и прикидывая подходы..."
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
 		text: "@scotch_obtained:Вражеская предположительно космическая техника\
 недолго сопротивлялась фирменному кирпичу в руках умелого вандализатора, и\
 вскоре герой стал обладателем шматка настоящего (хотелось надеяться)\
 космического скотча."
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
 			text: "@for_calm_and_proud:Для душевного и интеллектуального\
 спокойствия герой принял трудное решение считать, что аппарат не настоящий,\
 но в то же время настоящий.\
\nЕсли он не настоящий, то выходило, что добыча - не кусок высокой технологии,\
 добытый из передовой вражеской техники почти что в боевом столкновении, а\
 обычный лоховской скотч от бутафории, на которой уже 40 лет разводят весь\
 мир, и героя в том числе. Для самооценки такой расклад был решительно\
 неприемлем."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e1_m1",
			header: "@hero_says:Герой:",
			text: "@and_if_it_would_be_real:А если он настоящий - это ж такой\
 аццкий компромат, что они бы уже заслали хы-мэна на зачистку следов и\
 устранение свидетелей. А потом и второго, чтоб он зачистил первого.\
 Хоть один бы да попался. А в наших лесах кому-нибудь попадался хы-мэн?\
 Ну и вот. Л - Логика!"
		});
	}
});

//
// sB1 (eco-disaster river)
//

SCRIPT_ADD("sB1", "daemon",
async function(s, {gs, tmps, st}) {
	if (gs.f_water_cleansed) {
		st.setScreenTitle("@s_ecobad_river_fixed:Речка из водки");
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
		header: "@fishman_says:Человек-Рыба:",
		text: "@hey_hero:Эгееей, гирооой!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@who_are_you:Ты хто?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_fishman",
		header: "@fishman_says:Человек-Рыба:",
		text: "@im_fishman:Йа - Чилавек-Рыба! Прасвитлёный и прасвититель!\
 Падайди сюда, йа и с табой падилюсь прасветлением! Давай, прямо па воде, тута\
 ни глубоко!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@yeap_just_wait:Угу, щазз."
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
		text: "@popup_hero_applied_elixir:Герой, воровато оглядываясь, вылил\
 в речку могучий экологический эликсир и, потирая руки, принялся ждать..."
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
		text: "@popup_but_nothing_happened:...но ничего не происходило..."
	});
	stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);
	await st.popup(s, {
		text: "@popup_because_no_respect:...потому что герой вёл себя\
 утилитарно, пользовался инструментом без уважения к труду людей, в него\
 вложенному, и не сказал волшебное слово."
	});

	stHero.playAnimation({
		animationId: "HeroAngry",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:Герой:",
		text: "@hero_nothing_works:Нибуя не работает. Шарлатаны!!!"
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
		text: "@popup_odd_but_correct:Как ни странно, но волшебное слово,\
 поставленное юннатами на активацию эликсира, именно таким и оказалось."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:Герой:",
		text: "@hero_works_get_down:Ох ты ж ё, работает! Ложись!!!"
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
		text: "@popup_wow_water_turned:Ну и ну! Прямо на глазах вода в речке\
 из зловонной неблагонадёжной жижи превратилась в чистейшую..."
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
		text: "@popup_however_strange_it_is:...почти идеально прозрачную..."
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
		text: "@popup_into_vodka:...ВОДКУ!"
	});
	st.setScreenTitle("@s_ecobad_river_fixed:Речка из водки");
	stHero.playAnimation({
		animationId: "HeroSmile",
		atPosition: heroPos
	});
	await st.waitTicks(s, 30);
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:Герой:",
		text: "@hero_gee_powerful:Гыы. А средство-то действительно мощное\
 оказалось!"
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
		header: "@fishman_says:Человек-рыба:",
		text: "@fishman_do_you_think_you_win:Прак-.. лятый... ик!.. гирой...\
 Прани-... ик!.. цатильный... гирой... Ик!.. Ду-... маишь... ты па-.. ик!..\
 бидил?.. Мы... ищо... ик!.. встре-... тимся... Ик!.. Буль..."
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
		text: "@popup_ferry_open:Итак, речка была очищена и в химическом, и в\
 тактическом смыслах. Препятствий к переправе вроде бы больше не имелось..."
	});

	await st.popup(s, {
		text: "@popup_and_bottle:Да, и ещё немаловажный момент: у героя на\
 руках осталась пустая бутылка."
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
		text: "@hero_scooped_probe:Герой, не скупясь, зачерпнул проб на всю\
 поллитровую ёмкость бутылки."
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
		text: "@hero_no_fish_rake:Даже с помощью граблей герой не мог\
 дотянуться до ближайшей рыбы. Рыбачить в этой игре следовало не здесь и не\
 так."
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
		text: "@popup_partizan:Углубляться слишком далеко в лес было\
 небезопасно. Здесь до сих пор постреливали партизаны."
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
				text: "@popup_partizan_hide:По условному сигналу из двух\
 утюгов партизаны опознали, что по лесу идёт наш человек, и попячились."
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
		text: "@medved_resist_more:Похоже, нынешний обед обошёлся медведю\
 дорого. На этой локации сопротивление продолжалось, не думая утихать, и\
 косолапому приходилось жарковато. Битва отгромыхивала куда-то на север..."
	});
});

//
// sB2 (dolgostroy)
//

SCRIPT_ADD("sB2", "daemon",
async function(s, {gs, tmps, st}) {
	if (gs.f_dacha_on) {
		st.setScreenTitle("@s_dacha:Дача уважаемого человека");
	} else if (gs.f_station_on) {
		st.setScreenTitle("@s_station:Станция \"Колхоз \"Успешный Успех\"\"");
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
		header: "@hero_says:Герой:",
		text: "@wtf_did_you_build:Ну и чо вы тут за хрень построили, на хрен?!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@dacha_boss:Даца, насяльника!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@why_dacha_near_railroad:А на хрена нужна дача впритык к\
 рельсам?! Чтоб поездами листы сдувало и шмар давило?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:Гастарбайтеры:",
		text: "..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@deconstruct_and_wait:Давайте-ка разбирайте это к хренам взад,\
 и ждите - я вам потом скажу, что делать."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@ruf:Р-рюф!"
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
		header: "@hero_says:Герой:",
		text: "@they_need_project:Эти чурбаны, кроме дач, ничего в жизни\
 не строили... Нужно дать им нормальный строительный проект."
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
		header: "@hero_says:Герой:",
		text: "@here_is_what_to_build:Короче, надо построить вот это...\
 Осилите?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_default",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@ruf:Р-рюф!"
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
		header: "@hero_says:Герой:",
		text: "@i_have_right_for_free_ride:Я - генералиссимус Прокуратуры\
 Вселенной и имею право на бесплатный проезд!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_conductor",
		header: "@conductor_says:Проводник:",
		text: "@i_dont_care_ticket_only:Ничё не знаю. Велено без билета не\
 пущать - значит, не пущаю! Вон, в кассе продают - иди там права покачай."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@ppz_lived_up_to:Ппц до чего в стране докатились -\
 генералиссимусов Прокуратуры Вселенной не уважают!.."
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
		header: "@hero_says:Герой:",
		text: "@i_have_right_for_free_ticket:Я - генералиссимус Прокуратуры\
 Вселенной и требую свой законный бесплатный билет до Мурманска!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:Кассир:",
		text: "@the_id_is_invalid:Морда на фотографии не совпадает, и дата\
 выдачи - 31 февраля. Но попытка хорошая."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@blin:Блин."
	});

	await st.popup(s, {
		text: "@popup_hero_had_big_plans:А у героя-то уже были большие планы\
 на авторитетный документ с полномочиями... Но, похоже, документ оказался\
 лежалым, и полномочия выветрились. Хорошо хоть, на достройку станции хватило."
	});

	st.discardPickableItem({ gs: gs, itemId: "it_proc_id" });
});

SCRIPT_ADD("sB2", "cs.buyTicketPhayl",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@ticket_to_murmansk_please:Один билет до Мурманска, пожалуйста."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:Кассир:",
		text: "@20_tugriks:20 тугриков."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@blin:Блин."
	});

	await st.popup(s, {
		text: "@popup_hero_had_not_enough_money:У героя не было столько\
 тугриков. Ничего не оставалось, кроме как поискать по округе..."
	});
});

SCRIPT_ADD("sB2", "cs.buyTicketSuccess",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@ticket_to_murmansk_please:Один билет до Мурманска, пожалуйста."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:Кассир:",
		text: "@20_tugriks:20 тугриков."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@here_you_hold:Держите, обдиралы..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:Кассир:",
		text: "@thanks_and_here_is_a_discount:Кстати, поздравляю! Вам, как\
 первому покупателю, предоставляется скидка в 5 тугриков! Вот ваш билет, вот\
 ваша скидка."
	});

	gs.it_ticket_enabled = true;
	st.setTugrikCount({
		gs: gs,
		value: st.getTugrikCount({gs}) - 15
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@could_it_be_15:А вот нельзя было сразу за 15 тугриков продать?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_kassir",
		header: "@kassir_says:Кассир:",
		text: "@NO:НЕТ."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@ok_fuck_you:Ну и ладно, хрен с вами. Что там за те 5 тугриков\
 можно купить? Контрольную точку разве что, а на хрена она теперь-то... Всё\
 равно, что совсем без тугриков."
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
		text: "@popup_hero_boards_train:Герой сел в поезд и поехал..."
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
		text: "@popup_hero_forgot:...но он забыл кое-что сделать."
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
		header: "@hero_says:Герой:",
		text: "@hero_heres_my_ticket:Вот мой билет. Доставь с ветерком,\
 корованщик - у меня задание от Родины в Мурманске!"
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
		header: "@tankist_says:Злющий танкист:",
		text: "@tankist_here_you_are:Во-от ты где, говно! Ну-ка иди сюда,\
 щас убивать буду!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:Герой:",
		text: "@hero_deliver_quicker_please:Начинайте доставлять побыстрее,\
 пожалуйста. Это ОЧЕНЬ срочное задание..."
	});

	st.object("nv_train_ctl_B2").stopped = false;
	await st.waitTicks(s, 90);
	st.object("nv_train_ctl_B2").stopped = true;

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_tankist",
		header: "@tankist_says:Злющий танкист:",
		text: "@tankist_halt_fucker:Стоять, сцуко!"
	});
	await st.waitTicks(s, 30);

	var {gs, tmps} = await st.switchToScreen(s, {
		screenId: "sD2",
		transOutVeilType: "right-in",
		transInVeilType: "left-out"
	});

	await st.popup(s, {
		text: "@popup_hero_goes_to_murmansk:Итак, герой решил загадки,\
 преодолел препятствия, натянул всех недругов, вставших у него на пути,\
 и таки отправился в Мурманск..."
	});

	st.object("tunnel_right").state = "on-cs";
	st.object("nv_train_ctl_D2a").state = "pass-on";
	st.object("nv_train_ctl_D2a").currentPhase = 0;
	st.object("nv_train_ctl_D2a").stopped = false;
	await st.waitTicks(s, 120);

	st.object("nv_train_ctl_D2a").stopped = true;

	await st.popup(s, {
		text: "@popup_what_waits_him:Что ждёт его и МК-152Ъ в далёком северном\
 городе?|\
\nПочему задержался в области коррумпированный председатель колхоза?|\
\nКакой ответ на унижение замышляет мерзкий Человек-Рыба?|\
\nЧто за зловещий персонаж с приборами и в валенках проник на водных лыжах в\
 прибрежные леса Родины, и с какой целью?"
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
		text: "@popup_what_waits_tankist:Как сложится погоня для злющего\
 танкиста?|\nКакие открытия и испытания ждут его по дороге?|\nСумеет ли\
 он в решающий момент переступить через мелочную мстительность и выбрать\
 правильную сторону в конфликте?|\nЗа какие достижения и подвиги ему предстоит\
 прослыть легендарным Великим Танкистом?|\
\nОбо всём этом и многом другом..."
	});

	hlsfxPlayMusic({ sfxId: "music_abort" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_troll",
		header: "@title_you_wont_learn:...вы не узнаете.",
		text: "@popup_no_pay_no_sequel:Эпизод не проплачен, кина не будет.\
 Гхых гхых."
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
		header: "@win_header:Вы победили!",
		text: "@win_total_text:Процент приключения:@:\n" +
			achTexts.join("\n") +
			"\n@total:Итого:@: " + score + "%"
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
		text: "@popup_goldball_waited:Золотой Шар был доволен.\
 И он снова ждал жертв..."
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
		header: "@sign_directions:Табличка направлений",
		text: "@directions:Таможня и граница: \u2190 2 экрана\
\nМурманск: \u2192 до хрена\
\nМосква: \u2193 ещё больше до хрена\
\nКолхоз: \u2193 1 экран\
\nРоссия: \u25CF прямо тут (в т. ч., но не только)\
\nНахрен: \u2190\u2193\u2191\u2192 не останавливаться и не оборачиваться"
	});

	if (gs.it_mk152) {
		var stHero = st.object("hero");
		await s.anyOf(stHero.playAnimation({
			animationId: "HeroPuzzled",
			atPosition: stHero.position
		}));

		await st.popup(s, {
			text: "@hero_didnt_think_but:Герой раньше как-то не придавал этому\
 факту значения, но дорога шла аккурат на Мурманск. То есть, если прибиться к\
 попутному коровану, по идее, как раз можно было бы туда добраться.\
\nПроблема была в том, чтобы попутный корован здесь хотя бы остановился. Как\
 показал недавний печальный опыт, классический способ остановки корованов\
 сегодня работал крайне неэффективно.\
\nТребовалось изобрести решение, более отвечающее духу времени."
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
		text: "@hero_felt_unsafe:Внутренний голос подсказал герою, что дальше\
 этой невидимой линии лучше не заходить. Герой удивился, но не стал спорить с\
 интуицией."
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
		text: "@cow_pistol_not_work:Прикинув соотношение ТТХ животного и\
 оружия, герой решил, что это будет чересчур жестоко по отношению к нему.\
 К оружию, в смысле. Засунешь его стволом в эту дырку, а вытащишь без ствола.\
 А пестик и так не то чтобы особо мощный."
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
		text: "@cow_grenade_not_work:Оценив, как корова управляется с ручкой\
 граблей, герой заключил, что деревянная граната ей будет и вовсе на один\
 укус."
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
		text: "@the_difficulty_was:Самым трудным вопросом оказалась передача\
 корове хрена вместо граблей. Тёртая жизнью скотина не намеревалась выпускать\
 из зубов последнюю добычу, хотя бы отдалённо похожую на съедобную органику,\
 не имея твёрдых гарантий, что получит взамен нечто, как минимум, равноценное.\
 А поскольку пасть была занята, получить замену через неё не представлялось\
 возможным...\
\nК счастью, бедное животное настолько изголодалось и желудочно, и вообще\
 полностью, что было готово принять питательный корнеплод с любой стороны\
 организма."
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
		header: "@pig_says:Пьяная Свинья:",
		text: "@pig_way_to_the_port:Дор-рогу поросёнку, заср-ранцыыы!\n\
Пор-росёнок на тр-рактор-реее!"
	});
	st.object("nv_pig_ctl_B3").state = "on";

	await s.anyOf(st.entScreenSink.event("tractorOut"));
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_pig",
		header: "@pig_says:Пьяная Свинья:",
		text: "@pig_freedom_do_emigration:Р-рашка-пар-рашкааа!\n\
Св-вободу эмигр-раци-ииии!"
	});

	await stHero.playAnimation({
		animationId: "HeroPuzzled",
		atPosition: stHero.position
	});

	await st.popup(s, {
		text: "@intro_looks_like_go_careful:По колхозным улицам предстояло\
 передвигаться с крайней осторожностью. Причём, если от телесных травм герой\
 мог рассчитывать уклониться с помощью ловкости и тактического мышления, то\
 травмы моральные, наносимые выкриками Пьяной Свиньи, приходилось терпеть..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:Герой:",
		text: "@hero_he_doesnt_love_fatherland:Родину оскорбляет. Сволочь!"
	});
});

SCRIPT_ADD("sB3", "cs.readNewsPost",
async function readNewsPost(s, {gs, tmps, st, action}) {
	var p;
	for (;;) {
		p = await st.popup(s, {
			text: "@newspost_intro:Было очевидно, что ничего полезного для\
 случайного прохожего в местных сплетнях прочитать не удастся. Не стоило\
 тратить время. Разве что совсем уж нечем заняться...",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_1_hdr:Новости политики",
			text: "@newspost_1_txt:Председатель до сих пор не вернулся из\
 командировки в область. Неужели сбылась мечта колхозан, и взяли-таки в оборот\
 мироеда?!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_2_hdr:Новости криминальной обстановки",
			text: "@newspost_2_txt:Участились случаи грабежа корованов на\
 железной дороге. Подозреваются гастарбайтеры, притон которых замечен к\
 северо-востоку от колхоза.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_3_hdr:Новости механизации",
			text: "@newspost_3_txt:Трактор, три дня назад украденный Пьяной\
 Свиньёй с целью побега за границу, до сих пор находится на территории\
 колхоза. На почве алкоголизма водила до сих пор не может вписаться в выездную\
 трассу. Просьба к товарищам колхозанам передвигаться по колхозу с\
 осторожностью.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_4_hdr:Новости ассенизации",
			text: "@newspost_4_txt:Временный сортир №4 (на юго-восток)\
 закрывается по естественным причинам (в связи с переполнением). Прилежащий\
 район объявлен зоной химико-биологического неблагополучия, и его посещение\
 запрещено командованием районной роты РХБЗ. Вопрос о постройке канализации и\
 постоянного сортира прорабатывается. На время его проработки жителям и гостям\
 предлагается пользоваться новым временным сортиром №5 (на север, за рекой).",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_5_hdr:Новости дрессировки",
			text: "@newspost_5_txt:Корову не кормить! Пока не отдаст грабли,\
 тигра рогатая.\nЗавхоз З.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_6_hdr:Новости науки и техники",
			text: "@newspost_6_txt:Кукурузник межрегиональных террористов, не\
 дотянув до здания управы облцентра, рухнул на крышу станции юных\
 натуралистов в нашем колхозе. На заседании совета по поводу данного\
 происшествия было предложено мудрое и экономное решение считать акцию\
 безвозмездным даром сельскому образованию, а самолёт - новым экспонатом.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_7_hdr:Новости от благодарных покупателей",
			text: "@newspost_7_txt:Нибуя не работает. Шарлатаны!!!\
\n\n(Надпись сделана на бланке \"Ваш отзыв о нашем трассировщике медведя\
 БК-0001, охренительно важный для нас\", с нерусским акцентом и без подписи.)",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_8_hdr:Новости международной политики",
			text: "@newspost_8_txt:Букингемский дворец продолжает расследование\
 обстоятельств появления на туалетном сидении королевы отпечатка в форме\
 кочегара. Весь мир, затаив дыхание, следит за ходом судьбоносного дела.\
 Слухи о даче королевой дуба и её подмене неустановленным лицом с целью\
 продолжения получения королевской пенсии с негодованием отвергаются, как\
 конспирологические и вообще непонятно как относящиеся к теме.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_9_hdr:Новости убедительной просьбы",
			text: "@newspost_9_txt:Товарищи колхозане! Убедительная просьба\
 прекратить практику использования одноразовых вилок при употреблении в пищу\
 ежей. Это расточительство и бесхозяйственность. Благодарим за понимание.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_10_hdr:Новости культуры",
			text: "@newspost_10_txt:Наш земляк, известный поэт Сысой\
 Аристархович Молодуду, сидя в московском кабаке, предался ностальгии по малой\
 родине и написал стихи, посвящённые её транспортной труднодоступности. Вот\
 эти проникновенные лирические строки:\
\n\nЗдесь волки не срут, магистраль не идёт,\
\nИ белка орехи не прячет,\
\nИ Лорд Пневмослон, даже если припрёт,\
\nСюда на коне не доскачет.\
\nВо мгле, исподволь, невзначай и навзрыд\
\nДалёкий колхоз неприступно торчит.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_11_hdr:Новости постапокалипсиса",
			text: "@newspost_11_txt:Вася из Убежища 14 - лох! Я твоё Убежище\
 труба шатал!\
\nПетя из Убежища 88",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_12_hdr:Новости истории",
			text: "@newspost_12_txt:В этом году нашему колхозу исполняется\
 очередной юбилей, в связи с чем не помешает в очередной раз вспомнить о наших\
 древних корнях и славных традициях. Некоторые злопыхатели утверждают, что\
 нам всего 40 лет, что отражено в его названии. Следует напомнить недоумкам,\
 что, во-первых, в отличие от иных наспунктов, название которых давно осталось\
 лишь названием, наш колхоз не посрамляет своё имя ни единого дня и\
 соответствует ему с самого 1973 года, когда оно было дано партией взамен\
 предыдущего. А дано оно было - и это во-вторых - потому, что колхоз уже тогда\
 его заслужил. И это мы ещё не углубляемся в более далёкую историю...",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_13_hdr:Новости об ужасном",
			text: "@newspost_13_txt:По информации районного УВД, курочка Ряба\
 снесла яичко. \"Начисто\", - коротко сообщил оперуполномоченный Кутузов на\
 вопрос редакции о подробностях. Личность жертвы не раскрывается.",
	 		enableSkip: true
		});
		if (p.skipped) break;


		p = await st.popup(s, {
			header: "@newspost_14_hdr:Новости о пользе образования",
			text: "@newspost_14_txt:В N-ском районе разоблачён иностранный\
 агент. Злодей шифровался под ягуара в передвижном цирке и имел необходимые\
 ветеринарные документы чрезвычайно высокого качества. Однако участковый П.\
 не забыл школьных уроков русского языка, по которому имел твёрдую тройку,\
 и это помогло ему раскрыть подделку по безграмотной надписи \"Спрафку выдол\
 витеринарный врачь...\" Герой дня, П. передаёт спасибо своей школьной училке,\
 не жалевшей здоровья и твёрдых предметов, пока будущий полиционер не\
 запомнил, что мягкий знак после буквы Ч пишется только в слове \"ачько\".",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_15_hdr:Новости рекламы",
			text: "@newspost_15_txt:В связи с тем, что контора PYPSI\
 не проплатила продукт плейсмент, в данной игре её название и логотип\
 изменены до неузнаваемости. Не до полной, конечно, а ровно до такой, чтобы\
 контора поняла, о ком идёт речь, и ей стало стыдно.",
	 		enableSkip: true
		});
		if (p.skipped) break;


		p = await st.popup(s, {
			header: "@newspost_16_hdr:Новости лингвистики",
			text: "@newspost_16_txt:Одиозный археолог д-р И. Графф расшифровал\
 древний текст, доказывающий, что Соломон - не ископаемый подвид покемонов,\
 а древнееврейский царь. Д-р Графф усматривает в этом очередное подтверждение\
 своей экстравагантной теории, гласящей, что покемонов изобрели не в\
 библейском Израиле, а в Японии, и притом значительно позже.\
\nНаучное сообщество яростно критикует исследование, обвиняя д-ра Граффа\
 в методологической предвзятости, антисемитизме и фоменковщине.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_17_hdr:Новости на уровне слухов",
			text: "@newspost_17_txt:По непровренной информации, поезда,\
 ездящие поверх туннелей - это не баг, а фича, призванная добавить глубины\
 смысла.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_18_hdr:Новости безумия",
			text: "@newspost_18_txt:24 часа 13 минут. Ровно столько времени\
 прошло между полной отменой куриновирусных ограничений в уездном городе М.\
 и роспуском местного отделения Госкурвиднадзора внезапным указом М-ского\
 градоначальника, и отменой этого указа следующим внезапным указом его же.\
 Причины внезапных указов пока не известны. Градоначальник не доступен для\
 комментариев.\
\nПо непроверенным пока сведениям от источника, близкого к и вхожего в,\
 градоначальник в настоящий момент забаррикадировался в М-ском городском\
 зоопарке и с воплями \"Да что ты знаешь о безумии, п-п-падла!\" пытается\
 душить местных сервалов.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_19_hdr:Новости точки зрения",
			text: "@newspost_19_txt:13 июня господин товарищ председатель\
 толкнул крайне воодушевляющую речь перед собранием колхозан возле станции\
 юного натуралиста. Согласно предложенной им неожиданной перспективе,\
 древянный телескоп без единого гвоздя - не свидетельство крайней нищеты, а\
 памятник народного зодчества, который можно за деньги показывать туристам.\
 Колхозане разошлись, возбуждённо подсчитывая грядущие барыши.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_20_hdr:Ещё новости постапокалипсиса",
			text: "@newspost_20_txt:Это не труба нашего убежища, это толчок\
 на развалинах городского СИЗО. Вот ты лошара, ггг.\
\nВася из Убежища 14",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_21_hdr:Новости зоологии",
			text: "@newspost_21_txt:По сообщениям с мест, вблизи недавно\
 развёрнутого мусорного полигона в Задрищенском районе местные волки начали\
 рожать мутантов-вервольфов, которые нападают на скот и вообще всячески\
 гадят. Руководство полигона отвергает жалобы. \"Ну, то есть, процессы там,\
 конечно, такие, что всякое может случиться,\" - цитирует агентство ОБС\
 представителя руководства, - \"но ведь мы ещё даже не запустили его в\
 работу.\"\
\nОзабоченным местным жителям рекомендуют искать источники проблемы\
 среди понаехавших псевдоэкологических активистов, которые готовы на какие\
 угодно мерзости, лишь бы не допустить создания новых рабочих мест и повышения\
 уровня жизни в провинции.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_22_hdr:Новости астрофизики",
			text: "@newspost_22_txt:Теория относительности Эйнштейна в\
 очередной раз выдержала проверку экспериментом. Так утверждает астроном\
 Лейкин, поставивший остроумный опыт. Он посмотрел на Солнце сквозь стекло\
 с нарисованной на нём калибровочной окружностью, одновременно измеряя её\
 диаметр и периметр. Полученное соотношение между этими двумя параметрами\
 отличалось от классического l=\u03C0d, что подтверждает факт искривления\
 пространства-времени вокруг светила, и отличилось на величину, блестяще\
 совпавшую с предсказанием гениальной теории. Слава науке!\
\nИ да, это ещё раз к вопросу о деревянном телескопе.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_23_hdr:Новости открытого диалога",
			text: "@newspost_23_txt:Отдай грабли, сцуко! Да, я знаю, что ты\
 читать умеешь, не хрен ваньку валять. Последние грабли на складе, блин!\
 Отдавай, не будь свиньёй!\nЗавхоз З.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_24_hdr:Новости паспортизации",
			text: "@newspost_24_txt:Дорогой товарищ Генеральный Секретарь ЦК\
 КПСС Л. И. Брежнев распорядился разрешить выдачу паспортов товарищам\
 колхозанам с целью облегчения их выезда на срок до полутора месяцев, а также\
 в санатории, дома отдыха, на совещания, в командировки или при временном\
 привлечении их на посевные, уборочные и другие работы. Отдельным пунктом\
 распоряжения д. т. Г. С. ЦК КПСС приказал повысить оперативность обновления\
 информации на колхозных досках объявлений, дабы товарищи колхозане\
 своевременно узнавали про заботу Партии о трудящихся.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_25_hdr:Новости кроссвордов",
			text: "@newspost_25_txt:Новый популярный кроссворд от Министерства\
 Иностранных Дел:\
\n\u25A1\u25A1Б\u25A1\u25A1\u25A1\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0\
\n\u00A0\u00A0\u25A1\u00A0\u00A0\u00A0",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_26_hdr:Новости телефонии",
			text: "@newspost_26_txt:Известный телефонный пранкстер Сервал\
 Лексус опубликовал ежегодную вырезку из своих периодических учений на\
 случайно выбранных номерах.\
\n\n- Фрагмент 1125 -\
\nАбонент: Общество анонимных пидоров слушает.\
\nС.Л.: Слышь, олень, давай сюда вашего главного оленевода. Будет спрашивать,\
 кто - скажешь, он сам знает, кто. Давай, метнулся кабанчиком.\
\nАбонент (после паузы, другим голосом): Д-да, ваше п-превосходительство?..\
\nС.Л.: Короче, сворачивай этот ваш цирк и закрывай шалман.\
\nАбонент: Как?.. Прямо сейчас?.. Н-но... бизнес-планы... монетизация... надо\
 предупредить контрагентов...\
\nС.Л.: Пацаны на сходке порешали. У тебя 15 минут.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_27_hdr:Новости цифровизации",
			text: "@newspost_27_txt:Вниманию колхозан, подключённым к\
 интернету по тарифу \"Колхозный\"! Компьютерщик Гоша заезжает из райцентра\
 на почту за IP-пакетами каждую вторую среду. Пакеты выдаются и принимаются в\
 соответствии с RFC-2549. Просьба писать датаграммы на бланках разборчиво\
 и не ошибаться при подсчёте контрольных сумм.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_28_hdr:Новости рекурсивной кулинарии",
			text: "@newspost_28_txt:Знаменитый шеф-повар Кулебякин изобрёл\
 рецепт оригинального блюда, которое можно сделать из любой пиццы. Как\
 нетрудно догадаться по его названию - \"Пицца с пиццей N\" - это пицца с\
 фрагментами N, где N - любая другая пицца. Шеф-повар собирается запатентовать\
 вариант рецепта, в котором в качестве пиццы N выступает сам этот же рецепт,\
 и уже начал писать титульный лист заявки с полным названием патентуемого\
 блюда.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_29_hdr:Новости изящной словесности",
			text: "@newspost_29_txt:Генерал-подполковник агитации и пропаганды\
 Розенталь в своём открытом письме к военнослужащим всех родов войск, военным\
 журналистам и литераторам на военную тему доходчиво просит не забывать, что\
 крайней бывает только мера, плоть и необходимость, а всё остальное -\
 ПОСЛЕДНЕЕ!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_30_hdr:Новости так им и надо",
			text: "@newspost_30_txt:С непониманием, но злорадством была\
 встречена в нашем колхозе новость об дефиците туалетной бумаги в розничной\
 продаже за буржуинской границей. \"Лучше никогда не иметь, чем иметь и\
 просрать\", - сказал по этому поводу дед Василич из пятого барака.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_31_hdr:Новости из них про нас",
			text: "@newspost_31_txt:Газета \"N-ский областной вестник\"\
 сообщает:\
\nСегодня состоялся суд по доносу экологического активиста Ветрова,\
 сообщившего, что в колхозе №116 под видом коровы угнетают голодом и\
 жестоким обращением редкое краснокнижное животное. Диркетор колхоза №116\
 лихо отбил обвинение, предъявив экспертизу, что угнетаемое животное -\
 действительно корова, подвергшаяся эволюции в результате давления факторов\
 окружающей среды. И тут же отправил встречный донос на активиста Ветрова\
 в Комитет Искоренения Лженауки, обвинив его в подвергании антинаучному\
 сомнению учения об эволюции и абиогинезе. В ближайшее время г-ну Ветрову\
 будет не до экологического активизма.",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_32_hdr:Новости официального подтверждения",
			text: "@newspost_32_txt:Официально подтверждено, что заикающийся\
 звук на фаерфоксе - это не фича, а баг. Потому что фаерфоксеры - криворукие\
 жопорушники и толерасты, которые программируют тем же местом, в которое\
 толерастят. Был же нормальный браузер - зачем начали его портить?",
	 		enableSkip: true
		});
		if (p.skipped) break;

		p = await st.popup(s, {
			header: "@newspost_33_hdr:Новости ещё культуры",
			text: "@newspost_33_txt:Успешно защитил честь колхоза на столичном\
 столичном культурном мероприятии наш уже известный вам земляк, поэт Сысой\
 Аристархович Молодуду. \"Я - поэт\", - скромно представился он на\
 мероприятии. В ответ некто, известный как \"Дизайнер Артемий\", выдвинул\
 новую идею: \"А по-моему, ты говно!\" Однако, в отличие от классического\
 сюжета, наш земляк к этой идее оказался подготовленным, и заранее держал\
 в кармане кулак, которым тут же и отоварил зарвавшегося столичного креакла.\
\nПотрясённая креативностью поэта, столица предложила ему 15-суточный отпуск\
 с полным содержанием за казённый счёт.\
\nЗнай наших, городские!",
	 		enableSkip: true
		});
		if (p.skipped) break;

		//hlsfxPlaySFX({ sfxId: "chimes" });
		await st.popup(s, {
			header: "@newspost_final_hdr:Новости о всяком разном",
			text: "@newspost_final_txt:Кубический герой, устроивший секретный\
 бункер в соседнем лесу, прячет за толчком утюг."
		});

		await st.popup(s, {
			type: "iconLeft",
			icon: "icon_hero_e3_m4",
			header: "@hero_says:Герой:",
			text: "@ah_you_fuckin_paparazzi:Ах вы ж сраные папарацци! Как вы\
 про утюг-то пронюхали?.. Нужно срочно бежать проверять!"
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
		"@pigs_you_are:Сам-ми вы с-свиньиии!\
\nА я - пор-росёнаааак!",
		"@slaves_and_im_on_tractor:Р-рабские р-рабыыыы!\
\nА я - на тр-рактор-рееее!",
		"@yes_i_stole_it:Укр-рал, выпил, и за гр-раницууу!\
\nПор-росёнок пр-раво имеееет!",
		"@stick_in_shit_losers:Пр-розябайте в дер-рьме, лузер-рыыы!\
\nА мне пор-ра видеть чудааа!",
		"@my_beloved_aboard:Канадааа! Австр-ралияяя!\
\nПр-ринимай пор-росёнкааа!",
		"@born_in_slavery:Р-рождённые в р-рабствеее!\
\nИ тр-рактор у вас ср-раныййй!",
		"@kolhoz_bydlo:Б-быдло колхозноеее!\
\nА я в белой р-рубашкеее!",
		"@tushka_chuchelo:Хоть тушкой, хоть чучелом,\
 а валить из ср-раной Р-рашки надааа!"
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
		header: "@pig_says:Пьяная Свинья:",
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
		text: "@hero_just_realized_pig_mostly_flew_to_border:Герой только\
 сейчас обратил внимание, что проспиртованная туша большинством частей\
 полетела в сторону границы. Это что же получается, Золотой Шар исполнил\
 желание ничтожества, опустившегося до дна своего свинства?\
\nГерой благоразумно прервал мысли об этом, пока они не дошли до логического\
 завершения, и его не начала снедать неоправданная зависть."
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
		header: "@local_says:Местный житель:",
		text: "@dont_touch_condmilk:Э! Не трожь сгуху, фраер!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@but_it_is_empty:Так она всё равно пустая."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:Местный житель:",
		text: "@ok_you_can_take_it:...|Ну ладно, бери."
	});

	gs.f_stalker_on = true;
});

SCRIPT_ADD("sB5", "cs.stalkerJoke",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@intro_condmilk_failed:Герой попытался поднять банку из-под\
 сгущёнки, но не преуспел."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@but_it_is_nailed:Так это... Она к полу прибитая..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:Местный житель:",
		text: "@of_course_bugoga:Отож.|\nБугагагагагага!"
	});

	gs.f_stalker_joke = true;
});

SCRIPT_ADD("sB5", "cs.stalkerIntro",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@hero_appreciated_humor:Герою понравился тупой, но хлёсткий\
 провинциальный юмор. Да и весёлый мужичок, по всему видать, был не простым\
 местным жителем. Как минимум, весьма таким себе непростым был этот мужичок\
 в спартанском прикиде и маске чумного доктора..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:Герой:",
		text: "@who_are_you_good_man:А ты, добрый человек в спартанском\
 прикиде, кто сам будешь? Чем живёшь-промышляешь?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@local_says:Местный житель:",
		text: "@how_else_can_you_live_here:А чем тут промышлять-то ещё можно?\
 Сталкер я, вестимо. Это, в смысле, по Зонам ходок. У меня тут даже прибор\
 где-то был специальный, на особые места... куда я его бишь... а-а, и хрен с\
 ним..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@to_sum_up_address_for_habar:Короче - ежели надобно на Зоне\
 чего-нибудь провернуть, на волю чего пронести, или там хабар какой добыть -\
 это ко мне обращайся. Расценки божеские. Не городские жлобы, чай."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:Герой:",
		text: "@theres_no_habar_and_no_zones:А тут, с вашим-то председателем,\
 разве ещё какой-то хабар остался? Да и зон вроде бы в здешних местах нету..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@heh_no_zones:Это Зон-то в наших местах нету? Х-хех! А ты поле\
 наше колхозное видал? Во. А если не видал пока - так сходи посмотри. Только\
 осторожно. Там такая хрень, что засмотришься - да так и останешься стоять да\
 таращиться."
 	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@and_no_director: А про председателя не напоминай лучше...\
 У-у-у, падла подколодная... В область, видите ли, по делам поехал. Хоть\
 бы там на него, наконец, уже метод нашли..."
	});

	gs.f_stalker_intro = true;
});

SCRIPT_ADD("sB5", "cs.stalkerOpenDeal",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@hey_stalker_theres_subject:Слушай, сталкер, есть тема. Можешь\
 с Зоны вашей колхозной золотой шар достать?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@ah_golden_ball:А-а, Золотой Шар... Могучая штука... Говорят,\
 кто его коснётся, тому он сокровенные желания исполняет. Да притом такие\
 сокровенные, что поциэнт не сразу и догоняет, когда и какое именно желание\
 у него исполнилось..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@not_an_issue:Не вопрос. Гонорар в поллитра - и ваащще не\
 вопрос! Ещё мне балалайка понадобится..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@why_balalaika:А балалайка-то зачем?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@so_then_a_deal:По гонорару, сталбыть, вопросов нет? Ну и\
 отлично - значит, договорились!"
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
		header: "@stalker_says:Сталкер:",
		text: "@balalaika_is_good:Ага, такая сойдёт. Дело за гонораром."
	});
});

SCRIPT_ADD("sB5", "cs.stalkerHonorarIsGood",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@honorar_is_good:Во, самое то, что нужно! Только ещё балалайка\
 нужна. Без балалайки никак."
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
		header: "@stalker_says:Сталкер:",
		text: "@yes_this_is_my_device:Во! Он самый. А я всё думаю, куда же его\
 засунул-то... Можешь взять поиграться, он всё равно негодный."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@does_it_not_work:А что так? Не работает? Особые места не ищет?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@it_works_but:Работать-то работает, и искать - ищет... Только\
 вот особые места особым местам - рознь. Я думал, ищет он места с артефактами.\
 А оказалось - места, медведями обоссанные."
	});

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e5_m4",
		text: "@hero_not_happy_with_discovery:Не сказать, чтобы герой приятно\
 удивился, узнав, чем именно особенны места, отыскиваемые замысловатым\
 детектором. Но, так или иначе, теперь ему предстояло жить с этим знанием..."
	});

	gs.ach_pribor = true;
});

SCRIPT_ADD("sB5", "cs.stalkerCommitDeal",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@yes_perfect_lets_start:Во! Отлично! Можно начинать."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m1",
		header: "@hero_says:Герой:",
		text: "@why_balalaika_after_all:А всё же, зачем балалайка?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_stalker",
		header: "@stalker_says:Сталкер:",
		text: "@sha_pazan:Ша, пацан! Кто тут сталкер - ты или я? Если говорю,\
 что без балалайки никак - значит, никак! Не бздо. Звиздуй на поле и принимай\
 хабар - пока чапаешь, я как раз туда-сюда обернусь."
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
		text: "@intro_corovan_road:Корованы, проходящие по этой дороге,\
 издревле служили герою источником насущного. Но шли годы, прогресс не стоял\
 на месте, и даже в этих глухих закоулках Родины ощущалось его неоднозначное\
 дыхание: дорога стала железной, и сами корованы - тоже железными.\n\
 В принципе, по вопросу насущного это ничего не меняло. За исключением\
 некоторых технических нюансов."
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
		header: "@hero_says:Герой:",
		text: "@hero_holdup_pistol:Руки вверх! Это ограбление!"
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
		header: "@hero_says:Герой:",
		text: "@hero_holdup_grenade:Стоять-бояцца! Я вооружён и ппц как\
 опасен!"
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
		header: "@hero_says:Герой:",
		text: "@hero_holdup_givemoney:Гони бабло, падла!"
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
		text: "@fsb_holdup_so_it_is_hero:Итак, у нас тут кубический герой."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m1",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_well_yes:Ну... эээ... как бы... да."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_hero_pistol:А это у нас тут пистолет героя."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m1",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_well_kinda:Ну... эээ... типа."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_hero_grenade:А это у нас тут граната героя."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m5",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_i_can_explain:Я могу объяснить..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_did_you_really_think:А ты и правда решил,\
 что поезд, сто тонн железа и столько же километров в час, взял и остановился\
 просто потому, что какой-то дебил выбежал на рельсы с наглой мордой, пукалкой\
 и деревянной гранатой?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_well_eh:Ну... эээ..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_of_course_no:Конечно же, нет. Мы остановили\
 поезд потому, что это был именно ты, герой!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m2",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_ehq:Эээ... э?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_you_are_very_like:Дело в том, что ты чрезвычайно,\
 просто-таки до безобразия, похож на... кое-что очень секретное. И, если ты\
 действительно то, о чём я думаю, то мы должны срочно и немедленно завербовать\
 тебя для работы на благо Родины."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m1",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_uhu:Ы... гы... ыгы."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_on_other_hand:С другой стороны, если ты - не оно,\
 то в этом нет смысла. И вообще, то, о чём я говорю, настолько секретное,\
 что мы обязаны ликвидировать тебя на месте, потому что ты узнал о\
 существовании такого уровня секретности."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m4",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_uhu:Ы... ы?!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib_think",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_we_have_a_problem:Таким образом, мы имеем проблему.\
 Если ты - оно самое, то тебя надо вербовать. Если ты - не оно самое, то тебя\
 надо ликвидировать. Это два взаимоисключающих варианта. Но выяснить, оно ты\
 или не оно, в полевых условиях не представляется возможным. Как же с тобой\
 поступить?.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_no_liqudation:Не надо меня ликвидировать,\
 дяденька! Давайте я башкой обо что-нибудь стукнусь и всё секретное забуду?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_we_ll_do_this:Сделаем так. Слушай внимательно,\
 герой! Родина, в моём лице, поручает тебе важное испытательное задание.\
 Твоя первая задача - прибыть в Мурманск. Тебе будет предоставлена полная\
 свобода действий..."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_how_is_this:Это как?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_this_means:Это значит, что ты можешь добраться\
 до Мурманска, а можешь не добраться до Мурманска.\n\
 Если ты - действительно то, о чём я думаю, первая часть задания удастся\
 тебе с пугающей лёгкостью. Если ты - не оно, но всё равно удастся... \
 в любом случае, там будет уже не тут - сможем разобраться более предметно."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_and_if_fail:А если не удастся, то, по крайней\
 мере, ты никому не достанешься, а значит, не выдашь никаких секретов. То\
 есть, нас устроит любой исход, проистекающий из предоставленной тебе\
 полной свободы действий. Как видишь, это очень умная стратегия."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_yep:Да уж."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_of_course_we_control:Разумеется, мы не оставим тебя\
 без присмотра. На случай, если тебе вдруг удастся отчебучить какой-нибудь\
 вариант, который не был предусмотрен нашей очень умной стратегией..."
	});

	hlsfxPlaySFX({ sfxId: "beep-beep-1" });
	st.takePickableItem({ gs, itemId: "it_mk152", updateScene: false });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@hero_holdup_plugged_mk152:К руке героя пристегнули странное\
 и увесистое устройство."
	});

	s.anyOf(stHero.playAnimation({
		animationId: "HeroPuzzledStatic",
		atPosition: st.object("loc_holdup_hitbox").position
	}));
	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_whats_it:Эт чё?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152:Электронно-клавишная вычислительная машина\
 МК-152Ъ. Крайнее слово отечественной вычислительной техники и\
 импортозамещения. \"Ъ\" означает суперзащищённый и дооборудованный вариант\
 для работы в особо секретных условиях. Оснащён искусственным интеллектом для\
 оценки ситуации, системой самоуничтожения при попадании в непоправимую\
 ситуацию, и звуковым сигналом о включении системы самоуничтожения при\
 попадании в непоправимую ситуацию. Это чтобы окружающие могли отбежать на\
 безопасное расстояние и не пострадали."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_2:А также - средствами для принудительного\
 подключения к любым электронным устройствам, допускающим хотя бы\
 теоретическую возмозность подключения, цифроректальным криптоанализатором\
 и рядом иных приложений, которые помогут тебе преодолеть препятствия и\
 скоротать досуг."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e1_m5",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_and_tetris:А тетрис есть?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_tetris_yes:Есть. Но не советую. В этой\
 прошивке глючная версия - ещё не пофиксили баг, из-за которого может\
 сработать система самоуничтожения."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@hero_blin:Блин."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_mk152_3:В общем, аппарат присмотрит за твоим\
 прогрессом, произведёт предварительные оценки проявляемых тобой возможностей,\
 и, в случае чего, не даст тебе попасть в лапы противника. Ну и в целом\
 поможет в твоём задании по разным мелочам."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e4_m3",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_can_we_without_self_dtr:А без самоуничтожения\
 как-нибудь можно?"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_no_we_cant:Никак нельзя. Если противник тебя\
 поймает, обездвижит, начнёт подвергать унижениям и склонять к актам\
 государственной измены, как ещё ты ему сможешь противодействовать? Тетрис\
 включишь?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@hero_holdup_ok_if_land_asks:Ну... ладно. Раз Родина просит...\
 и всё равно теперь хрен отвертишься..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_fsb_mib",
		header: "@fsb_says:\u25A0\u25A0\u25A0\u25A0\u25A0:",
		text: "@fsb_holdup_meet_in_murmansk:Итак, до встречи в Мурманске.\
 Дальнейшие инструкции - по факту прибытия. Удачи, герой! Она тебе понадобится."
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
		text: "@hero_holdup_over:Вот как-то так кубический герой и нашёл на\
 свою квадратную жопу важное испытательное задание от Родины.\n\
 А заодно стал обладателем мощного компьютерного девайса и полной свободы\
 действий.\nНе самый плохой размен, если так-то подумать."
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
		header: "@hero_says:Герой:",
		text: "@hero_holdup_grenade:Стоять! У меня граната!"
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
		header: "@hero_says:Герой:",
		text: "@who_alcoholizes_fish:Ну трындец ваще. Это какая же сволочь\
 спаивает русскую рыбу?"
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
		header: "@popup_ctls_welcome:Здравия желаем, игрок!",
		text: "@popup_ctls:Управление (сугубо с клавиатуры):\n\
\u2190\u2193\u2191\u2192 = ходить\n\
Z, X = по ситуации\n\
[\u25CF REC] означает, что идёт кат-сцена, и герой управляется сценарием\n\n\
Места, в которых можно что-то сделать или посмотреть, отмечены \
маркерами (обычно сначала нужно посмотреть). Если место не отмечено, \
то вам туда не нужно. Не тыкайтесь в пейзаж в поисках секретных \
проходов и не тыкайте Z/X где попало в поисках секретных нычек, \
здесь это так не работает.\n\n\
Приступим же к свершениям!"
	})
})

SCRIPT_ADD("sC3", "cs.findPistol",
async function findPistol(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@hero_found_pistol:Герой нашёл в ящике пистолет."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m2",
		header: "@hero_says:Герой:",
		text: "@i_had_grenade_elsewhere:Где-то ещё граната была... Надо будет\
 поискать при случае."
	});

	gs.it_pistol_enabled = true;
});

SCRIPT_ADD("sC3", "cs.findIron2",
async function findIron2(s, {gs, tmps, st}) {
	await st.popup(s, {
		text: "@popup_iron_in_place:Утюг, к облегчению героя, был на месте.\
 Пока что."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e4_m4",
		header: "@hero_says:Герой:",
		text: "@i_will_rehide_it:А вот щас как возьму, да как его перепрячу -\
 и что вы тогда запоёте, в-попу-рацци?"
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
		text: "@hero_switched_patefon_on:Герой включил патефон."
	});
});

SCRIPT_ADD("sC3", "cs.patefonOff",
async function(s, {gs, tmps, st, action}) {
	gs.f_patefon_off = true;
	gs.ach_patefon = true;
	tmps.f_music_set = false;
	await S_setMusic(s, {gs, tmps, st, action});

	await st.popup(s, {
		text: "@hero_switched_patefon_off:Герой выключил патефон."
	});
});

SCRIPT_ADD("sC3", "cs.pokeBunkerist",
async function findIron2(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@bunkerist_hint:Компьютерщик, не оборачиваясь, молча показал\
 герою бумажку с загадочными письменами. Письмена были таковы:\
\n\nllsfx$masterGain.gain.value = 0.05; // default volume\
\n\nИнтересно, что бы это значило?"
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
		header: "@hero_says:Герой:",
		text: "@oh_stalker_did_they_say:Ох, сталкер, сталкер... Не говорили\
 тебе, что нельзя синим ходить бутылки сдавать? В ларёк сдал, ага... Мимо\
 ларька ты её сдал. Интересно, догнал хоть, что за неё бабла не отсыпали?"
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
		text: "@bottles_can_be_returned_but:Бутылки, конечно, сюда тоже можно\
 было сдавать, но... Вряд ли появление в ларьке пустой бутылки привлечёт\
 внимание кабана, гоняющего наперегонки с белкой. Да герой, собственно, и сам\
 бы проявил к подобному завозу в алкогольный ларёк непонимание на грани\
 неодобрения.\
\nЕсли что и выставлять на эту витрину, то хотя бы нечто наполненное."
	});
});

SCRIPT_ADD("sC4", "cs.vodkaNoUse",
async function vodkaNoUse(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_thought_on_it:Герой взвесил все за и против, и пришёл к\
 выводу, что один-единственный пузырь Пьяную Свинью, конечно, отвлечёт, но\
 очень ненадолго. И при этом получится, что проворовавшийся и хулящий Родину\
 девиант получит на халяву бухла, а ему за это ничего не будет. Так дело не\
 пойдёт. Ей, родимой, можно было найти и более достойное применение. А ларёк\
 следовало зарядить чем-нибудь таким, что решило бы проблему бешеного\
 трактора раз и надолго. Но чем же?"
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
		text: "@hero_was_about_to_commit:Герой понимал, что совершает\
 поступок, опасно близкий к грани, за которой его не простит совесть и не\
 поймут пацаны. Но у него не оставалось выбора. На пути стоял (вернее, ездил)\
 самый натуральный враг народа, против которого были оправданны даже столь\
 гнусные меры..."
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
		header: "@hero_says:Герой:",
		text: "@hero_love_russia_pig:Люби Россию, пьяная свинья!"
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
		text: "@popup_road_to_nowere:Здесь, близ противоестественного конца\
 железнодорожной ветки, затерянной в нигде и ведущей в никуда, случилось\
 что-то неприятное. Уцелевшие следы были скудны, и картина по ним\
 угадывалась лишь в самых общих чертах: в лесу то ли объявился,\
 то ли заблудился некто, ищущий встречи с местной фауной - и, судя по всему,\
 её нашёл. И местная фауна его, похоже, огорчила. А может, даже и обидела."
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
		text: "@medved_start:Итак, медведь, завершив здесь свои медвежьи дела,\
 двинулся на юг...\n\
 Наверняка при удачно подвернувшемся госте были какие-нибудь полезные,\
 но несъедобные пожитки, которые остались дальше по следу и ждали\
 обнаружения пронырливым мимопрохожим."
 	});

 	await st.popup(s, {
		text: "@medved_start2: Был, конечно, риск найти и самого медведя, но\
 герой рассчитывал, что в этом случае ему хватит природной смекалки и\
 этой... как его... харизмы."
	});
});

SCRIPT_ADD("sD0", "cs.noFishing",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		header: "@sign:Табличка",
		text: "@no_fishing:В целях боротьбы с распространением куриновирусной\
 инфекции ловля рыбы без предъявления кукарекода запрещена нахрен.\
 Госкурвиднадзор."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@satraps_no_people_but_them:Вот сатрапы! Сюда человек-то если и\
 попадёт, то разве случайно - а эти уже пролезли со своим запретительством."
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
		text: "@hero_had_argument_but:Аргумент у героя был весомый, но\
 гастарбайтеры выглядели так, будто вполне могли предъявить контраргумент\
 потолще и подлиннее. По всему выходило, что на одной распальцовке не\
 вывезти. Следовало подкрепить аргумент полномочиями, против которых не\
 посмеют пойти на эскалацию даже вот эти вот."
	});
});

SCRIPT_ADD("sD1", "cs.noArgument",
async function(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_had_authority_but:Полномочия у героя свисали по самый\
 пояс - на всю длину прокурорской документации. Теоретически, достаточно\
 для начала переговоров. Но места здесь были глухие, и герой благоразумно\
 рассудил, что полномочия по пояс и самозарядный аргумент всё же надёжнее,\
 чем просто полномочия по пояс."
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
		text: "@hero_came_with_authority:Герой вышел на переговоры при полном\
 параде наперевес, с полномочиями в одной руке и с веским аргументом - в\
 другой, и сразу же взял инициативу..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@who_there:Кто такие! Покажь прописку! Почему нарушаем! Где\
 паспорт! Почему без печати! Разрешение на работу! Пальцы не откатаны!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@not_our_fault_boss:Насяльника, мы не виноватая..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@whaaat:Чооо?! Сопротивление власти! Административка!\
 Аннуляция визы! Пробивка по базе! Задержание до выяснения!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@can_we_deal:Насяльника, мозят договоримса?.."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@bribe_you_scum:Взятку предлагаешь, каналья?! Состав\
 преступления! Коррупция! Федеральный розыск! Контрольная закупка!\
 План-перехват!"
	});

	await st.popup(s, {
		text: "@hero_knew_many_words:(Герой знал много волшебных слов,\
 обретающих силу в присутствии полномочий, и не забывал главный секрет\
 волшебства - сыпать ими как можно больше, не давая жертве шанса перейти в\
 защиту, до тех пор, пока противник не будет подавлен и готов к\
 сотрудничеству.)"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@narco_vet:Наркоконтроль! Оцепление! Карантин! Принудительная\
 ветеринария!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_bad",
		header: "@gasters_say:Гастарбайтеры:",
		text: "..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@why_idle:Ну, чо зависли?! Работу работать кто будет?! Ну-ка,\
 взяли и построили всё быстро!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_good",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@going_now_boss:Сделаем, насяльника!"
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@not_now_quick:Не \"сделаем\", а быcтр-р-ра-а!.."
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_gasters_default",
		header: "@gasters_say:Гастарбайтеры:",
		text: "@ruf:Р-рюф!"
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
		text: "@medved_resist:Жертва не сдалась медведю без боя.\
 Судя по следам, медведь смещался из этой локации на запад, испытывая более\
 продолжительное и ожесточённое сопротивление, нежели рассчитывал..."
	});

	await st.popup(s, {
		text: "@medved_ski:Здешний кусок маршрута проходил мимо неприметного\
 куска ветоши. Присмотревшись к нему новым взглядом, герой понял, что перед\
 ним лыжи, потерянные оппонентом медведя в ходе борьбы.\n\
 Лыжи были водные, что немало удивило героя. В безликом портрете случайного\
 гостя провинции начинали проступать странные черты..."
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
		header: "@hero_says:Герой:",
		text: "@what_is_this_body:А чо это за тело в проходе обозначилось?"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:Тролль:",
		text: "@me_troll_my_bridge:Моя тролль. Это быть моя мост. Ходить мост,\
 платить моя. 20 тугрик. Гхых гхых."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@dumb_trololo_this_is_tunnel:Тупое трололо, мост - это наверху!\
 А то, где ты стоишь - это туннель!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:Тролль:",
		text: "@troll_crafty_where_walk_pay:Тролль не тупой, тролль хитрый.\
 Верх не ходить, низ - ходить. Где ходить, там и платить. Гхых гхых."
	});

	gs.f_troll_intro = true;
});

SCRIPT_ADD("sD2", "cs.theLineIsIncomplete",
async function(s, {gs, tmps, st}) {
	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m3",
		header: "@hero_says:Герой:",
		text: "@dumb_trololo_line_is_incomplete:Тупое трололо, ветка не\
 достроена! Корованы сюда не ходят! Некого тебе тут трясти!"
	});

	await st.popup(s, {
		type: "iconRight",
		icon: "icon_troll",
		header: "@troll_says:Тролль:",
		text: "@troll_crafty_you_walk:Тролль не тупой, тролль хитрый. Корован\
 не ходить, твоя ходить. Кто ходить, тот платить. Гхых гхых."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e5_m4",
		header: "@hero_says:Герой:",
		text: "@what_a_shitman:Ты смотри, и логика его не берёт. Вот говнюк."
	});

	gs.f_incomplete_line_say = true;
});

SCRIPT_ADD("sD2", "cs.turnSwitchUp",
async function turnSwitchUp(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_switch:МК-152Ъ без труда сокрушил ламерскую\
 криптозащиту замка, и рычаг стрелки со скрипом повернулся..."
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
		header: "@hero_says:Герой:",
		text: "@hero_did_your_craft_troll:Ну чо, трололо? Помогла тебе\
 твоя хитрость, супротив железного-то паровоза?"
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
		header: "@troll_says:Тролль:",
		text: "@troll_no_pay_no_walk:Твоя не платить, твоя не ходить.\
 Гхых гхых."
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
			header: "@hero_says:Герой:",
			text: "@hero_ah_you_fucking_troll:Ах ты жирное трололо!\
 Ну, погоди - и на тебя найдём управу!"
		});
	}
});

SCRIPT_ADD("sD2", "cs.turnSwitchDown",
async function turnSwitchDown(s, {gs, tmps, st, action}) {
	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_switch_again:МК-152Ъ ещё раз проделал своё\
 чёрное дело, и рычаг стрелки повернулся обратно..."
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
		text: "@troll_pistol_not_work:Было совершенно очевидно, что пули\
 застрянут в толстом слое жира, и тролль даже не заметит наезда. Герой\
 не собирался тратить драгоценные патроны заведомо бесполезным образом."
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
		header: "@troll_says:Тролль:",
		text: "@wooden_grenade_ghuh:Деревянный граната. Гхых гхых."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:Герой:",
		text: "@a_clever_asshole:Сволочь.\nСообразительная сволочь."
	});
});

//
// sD3 (civ appendix)
//

SCRIPT_ADD("sD3", "cs.findGrenade",
async function findGrenade(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_dug_boxes:Герой порылся в мусорниках..."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e1_m1",
		header: "@hero_says:Герой:",
		text: "@here_it_is_my_grenade:Вот она. Моя верная граната!\
 Контрабанда с эстонских натовских складов. Интересно, там её уже\
 хватились?"
	});

	await st.popup(s, {
		text: "@grenade_was_of_wood:Граната была деревянной, но выглядела\
 пугающе правдоподобно. Героя, в принципе, такое устраивало. Это ведь была\
 граната для ограблений, а не для подрывов."
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
		header: "@hero_says:Герой:",
		text: "@wonder_if_mk152_hacks_it:А интересно, эту вышку этот ваш\
 МК-152Ъ осилит взломать?"
	});

	hlsfxPlaySFX({ sfxId: "mk152_hack" });
	await st.popup(s, {
		type: "iconTop",
		icon: "icon_mk152",
		text: "@mk152_hacked_the_tower:МК-152Ъ взломал вышку, даже не\
 напрягаясь."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e3_m3",
		header: "@hero_says:Герой:",
		text: "@oh_fuck:Херассе."
	});

	await st.popup(s, {
		text: "@hero_got_right:Было трудно поверить, что это произошло\
 вот так просто и мимоходом, но факт был налицо: герой только что взял и\
 разблокировал себе бесплатные звонки с окрестных таксофонов."
	});

	await st.popup(s, {
		text: "@by_the_way_only_4G:И, к слову, вопреки слухам, на вышке\
 оказалось не 5G, а только 4."
	});

	await st.popup(s, {
		type: "iconLeft",
		icon: "icon_hero_e2_m4",
		header: "@hero_says:Герой:",
		text: "@they_are_greedy:Вот жлобы. И здесь нахлобучили!"
	});

	gs.f_telephone_on = true;
});

//
// sD5 (library)
//

SCRIPT_ADD("sD5", "cs.readBook",
async function readBook(s, {gs, tmps, st, action}) {
	await st.popup(s, {
		text: "@hero_took_book_and_read:Герой взял книгу и принялся читать..."
	});

	await st.popup(s, {
		header: "@adventures_of_shtirlitz:Невероятные приключения\
 штандартенфюрера Отто фон Штирлица, записанные со слов его самого",
		text: "@shtirlitz_was_going_thru_forest:Штирлиц шёл через лес с двумя\
 утюгами в руках. Он не боялся партизан, несмотря на вызывающую эсэсовскую\
 форму. Голова штандартенфюрера, квадратная после вчерашней попойки, с утра\
 соображала неважно, но главное он помнил: два утюга - условный знак, по\
 которому партизаны поймут, что перед ними - не шпион, а самый настоящий\
 разведчик..."
	});

	await st.popup(s, {
		type: "iconTop",
		icon: "icon_hero_e3_m4",
		text: "@hero_shut_the_book:Герой в ужасе захлопнул книгу.\nСтало ясно,\
 что причина, по которой на данный фолиант не поднялась вороватая рука\
 коррумпированного председателя, всё-таки не в цепи. Удержать такое в руках\
 без непоправимых последствий для здоровья могли не только лишь все."
	});
});
