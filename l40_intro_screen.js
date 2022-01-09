//#include l01_hl_animators.js
//#include l03_scene_parts.js

// component responsible for keeping game scene control and logic
// also wraps the scene objects into the script tools system to expose them
// to the screen scripts (see l15_specs_scripts.js)

function ComIntroScreen(ent, {
	xcomRenderer = entApp.comScene.comRenderer,
	xcomScene = entApp.comScene
} = {}) {
	var me, entScreen = ent.newSubEntity();
	const {
		SCREEN_WIDTH,
		SCREEN_HEIGHT
	} = GameConst;

	var spriteSlots = [
		{ x: 0, y: 0, entSprite: null },
		{ x: SCREEN_WIDTH >> 1, y: 0, entSprite: null },
		{ x: 0, y: SCREEN_HEIGHT >> 1, entSprite: null },
		{ x: SCREEN_WIDTH >> 1, y: SCREEN_HEIGHT >> 1, entSprite: null },
	];

	async function showPictureAt(s, {
		gfxId,
		slot // number
	}) {
		var animation;
		try {
			slot = spriteSlots[slot];
			var entOldSprite = slot.entSprite,
				entSprite = entScreen.newSubEntity();
			var { comSprite, comAnimator } =
				xcomScene.getSpriteAndAnimator(entSprite);
			xcomScene.comParts.spriteLayers["1"].addSprite(comSprite);
			comSprite.x = slot.x;
			comSprite.y = slot.y;
			comSprite.alpha = 0;
			
			entSprite.playAnimation =
				ScriptHelpers.playAnimationForVisibleObject(entSprite);
			animation = entSprite.playAnimation({
				animationId: "FadeInOverTicks",
				parameters: {
					TICKS: 60
				}
			});
			comSprite.gfxId = gfxId;
			await s.anyOf(animation);
		} finally {
			comSprite.alpha = 1;
			if (entOldSprite) {
				entOldSprite.dispose();
			}
			if (animation) {
				animation.stop();
			}
			xcomScene.comParts.spriteLayers["0"].addSprite(comSprite);
			if (slot.entSprite == entOldSprite) {
				slot.entSprite = entSprite;
			} else {
				entSprite.dispose();
			}
		}
	}

	async function movePicture(s, {
		fromSlot,
		toSlot,
		fromAlpha = null,
		toAlpha = null
	}) {
		fromSlot = spriteSlots[fromSlot];
		toSlot = spriteSlots[toSlot];
		var entOldSprite = toSlot.entSprite,
			entSprite = fromSlot.entSprite;
		var animationFade,
			animationMove;
		if (entOldSprite === entSprite) {
			entOldSprite = null;
		}
		if (entOldSprite) {
			if (fromAlpha === null) {
				toAlpha = entOldSprite.comSprite.alpha;
			}
		}

		if (entSprite) {
			if (toAlpha === null) {
				toAlpha = entSprite.comSprite.alpha;
			}
			if (fromAlpha === null) {
				fromAlpha = entSprite.comSprite.alpha;
			}

			xcomScene.comParts.spriteLayers["1"].addSprite(
				entSprite.comSprite);
			animationMove = entSprite.playAnimation({
				animationId: "MoveAndFadeOverTicks",
				parameters: {
					FROM_X: fromSlot.x,
					FROM_Y: fromSlot.y,
					TO_X: toSlot.x,
					TO_Y: toSlot.y,
					FROM_A: fromAlpha,
					TO_A: toAlpha,
					TICKS: 20
				}
			});
		}

		if (entOldSprite) {
			animationFade = entOldSprite.playAnimation({
				animationId: "FadeOutOverTicks",
				parameters: {
					TICKS: 20
				}
			});
		}

		try {
			if (animationFade) {
				await s.anyOf(animationFade);
			}
			if (animationMove) {
				await s.anyOf(animationMove);
			}
		} finally {
			if (animationFade) {
				animationFade.stop();
			}
			if (animationMove) {
				animationMove.stop();
			}

			if (entSprite) {
				entSprite.comSprite.x = toSlot.x;
				entSprite.comSprite.y = toSlot.y;
				xcomScene.comParts.spriteLayers["0"].addSprite(entSprite.comSprite);
			}
			if (toSlot.entSprite == entOldSprite) {
				toSlot.entSprite = entSprite;
			} else {
				if (toSlot.entSprite != entSprite) {
					entSprite.dispose();
				}
			}
			if (fromSlot.entSprite == entSprite &&
				fromSlot !== toSlot) {
				fromSlot.entSprite = null;
			}

			if (entOldSprite) {
				entOldSprite.dispose();
			}
		}
	}

	async function fadePicture(s, {
		slot
	}) {
		slot = spriteSlots[slot];
		var entOldSprite = slot.entSprite, animationFade;
		if (entOldSprite) {
			animationFade = entOldSprite.playAnimation({
				animationId: "FadeOutOverTicks",
				parameters: {
					TICKS: 60
				}
			});
		}

		try {
			if (animationFade) {
				await s.anyOf(animationFade);
			}
		} finally {
			if (animationFade) {
				animationFade.stop();
			}

			if (slot.entSprite == entOldSprite) {
				slot.entSprite = null;
			}

			if (entOldSprite) {
				entOldSprite.dispose();
			}
		}
	}

	var skipped = false;
	async function showFrame(s, {
		text,
		slot = null,
		gfxId = null
	}) {
		var sp = entScreen.newScript(), sc;
		if (gfxId) {
			sc = sp.run(showPictureAt, {
				slot,
				gfxId
			});
		}

		var [ popupResult ] = await s.anyOf(
			entUI.comUI.popupModal({
				type: "intro",
				text: text,
				enableSkip: true
			})
		);
		sp.stop();
		if (sc) {
			await s.anyOf(sc);
		}

		if (popupResult.skipped) {
			skipped = true;
		}
	}

	async function showIntro(s) {
		INTRO: do {
			await showFrame(s, {
				text: "@this_story_started:Ёта истори€ началась давно и\
 неправда..."
			});
			if (skipped) break INTRO;

			await showFrame(s, {
				text: "@when_hotkey_master_created:...когда\
 сумрачно-просветлЄнный гений HotkeyMaster создал артефакт невиданной мощи...",
 				gfxId: "intro_1",
 				slot: 2
			});
			if (skipped) break INTRO;

			await showFrame(s, {
				text: "@and_was_astonished:...и сам прифигел от созданного.",
				gfxId: "intro_2",
 				slot: 2
			});
			if (skipped) break INTRO;

			await s.allOf(
				s.fork().run(movePicture, {
					fromSlot: 2,
					toSlot: 2,
					toAlpha: 0.5
				}),
				s.fork().run(showFrame, {
					text: "@artifact_was_fought_over:¬ схватке за артефакт сошлись\
 зримые и незримые силы, повелевающие пространствами, временами, гламурами и\
 дискурсами.",
				gfxId: "intro_3",
 				slot: 3
				})
			);
			if (skipped) break INTRO;

			await showFrame(s, {
				text: "@the_battle_took_longer:Ѕитва выдалась ожесточЄнной и\
 зат€нулась, ибо силы оказались сопоставимы, и никто не мог одержать верха.",
				gfxId: "intro_4",
 				slot: 3
			});
			if (skipped) break INTRO;

			await showFrame(s, {
				text: "@the_parties_got_the_hang: ак водитс€ в таких случа€х,\
 силы вошли во вкус, увлеклись самим процессом, и предмет битвы был успешно\
 проворонен.",
				gfxId: "intro_5",
 				slot: 3
			});
			if (skipped) break INTRO;

			await s.allOf(
				s.fork().run(movePicture, {
					fromSlot: 2,
					toSlot: 0,
					toAlpha: 0.5
				}),
				s.fork().run(movePicture, {
					fromSlot: 3,
					toSlot: 1,
					toAlpha: 0.5
				})
			);
			await s.waitAppFixedTicks(30);

			await showFrame(s, {
				text: "@meanwhile:“ем временем, много лет тому в сторону, в\
 невообразимо далЄких перд€х –одины...",
				gfxId: "intro_6",
 				slot: 2
			});
			if (skipped) break INTRO;

			await s.allOf(
				s.fork().run(movePicture, {
					fromSlot: 2,
					toSlot: 2,
					toAlpha: 0.5
				}),
				s.fork().run(showFrame, {
					text: "@cubic_hero_existed:...неторопливо влачил размеренное\
 существование кубический герой.",
					gfxId: "intro_7",
	 				slot: 3
				})
			);
			if (skipped) break INTRO;

			await showFrame(s, {
				text: "@and_robbed_corovans:ј промышл€л он тем, что грабил\
 корованы.",
				gfxId: "intro_8",
 				slot: 3
			});
			if (skipped) break INTRO;

			await s.allOf(
				s.fork().run(fadePicture, {
					slot: 0
				}),
				s.fork().run(fadePicture, {
					slot: 1
				}),
				s.fork().run(fadePicture, {
					slot: 2
				}),
				s.fork().run(fadePicture, {
					slot: 3
				})
			);

			await showFrame(s, {
				text: "@here_our_story_starts:ќтсюда и начинаетс€ наш\
 зубодробительно неверо€тный рассказ..."
			});
			if (skipped) break INTRO;
		} while (false);
	}

	return (me = {
		dispose() {
			entScreen.dispose();
		},

		async showIntro(s) {
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxLoadGFXGroup("gfxGrpIntro"));
			await showIntro(s);
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxUnloadGFXGroup("gfxGrpIntro"));
		}

	});
}
