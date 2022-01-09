//#include l01_hl_animators.js
//#include l01_collisions.js
//#include l03_scene_parts.js

// component responsible for keeping game scene control and logic
// also wraps the scene objects into the script tools system to expose them
// to the screen scripts (see l15_specs_scripts.js)

function ComGameScreen(ent, {
	comGame
} = {}) {
	var me;
	var xcomRenderer = entApp.comScene.comRenderer;

	var entScreen = ent.newSubEntity(),
		entHero;
	var objectsById = new Object(),
		transitsById = new Object(), // note that transit IDs are shared with object IDs
		tmpScreenVars = new Object(), // tmps for script tools
		entInvItemDoodads = new Object(), // doodads for pickable items, itemId => ent
		scrDaemonScripts = new Array(),
		currentScreenId = "",
		currentScreenRes = null,
		defaultSceneId = 0; // ref to a map screen resource

	var comCollisionEngine = entScreen.newComponent(ComCollisionEngine, {
	});

	var comHotspots = entScreen.newComponent(ComHotspots, {
		comGame
	});

	var comParticles = entScreen.newComponent(ComParticles, {
	});

	function ComRegistryAutoDeleter(ent, { sceneId }) {
		return ({
			dispose() {
				if (objectsById[sceneId] === ent) {
					delete objectsById[sceneId];
				}
			}
		});
	}

	// script to check hero bumping transit barriers and emit
	// transit suggestions
	var scrHeroTransitBumpChecker = entScreen.newScript();
	async function runHeroTransitBumpChecker(s) {
		for (;;) {
			var [ checkTransitBump ] = await s.anyOf(entHero.event("checkTransitBump"));
			if (checkTransitBump) {
				// check bump against the transits
				for (var transId in transitsById) {
					var entTrans = transitsById[transId],
						transSrc = entTrans.src;
					if (transSrc.getState({ gs: comGame.gameState }) != 'on') {
						continue; // this transit is disabled
					}

					var bumpDirs = entTrans.comCollisionZone.checkOutwardBump({
							xFrom: checkTransitBump.xFrom,
							yFrom: checkTransitBump.yFrom,
							xTo: checkTransitBump.xTo,
							yTo: checkTransitBump.yTo
						});
					if (bumpDirs[transSrc.dir]) {
						// post message to make transit
						entScreen.postEvent("makeTransit", {
							targetScreenId: transSrc.target.screenId,
							targetTransitId: transSrc.target.transitId,
							// animation to leave current screen
							transTypeOut: transSrc.transTypeOut,
							// animation to enter target screen
							transTypeIn: transSrc.transTypeIn,
							xOffs: checkTransitBump.xFrom
								- transSrc.x * GameConst.PIXEL_GRANULARITY,
							yOffs: checkTransitBump.yFrom
								- transSrc.y * GameConst.PIXEL_GRANULARITY,
							axis: (transSrc.dir == "down" ||
								transSrc.dir == "up") ?
								"hz" : "vt" // for aligning on target loc
						});
						break;
					}
				}
			}
		}
	}

	// factory to construct playAnimation for a visible object
	// which plays a primary animation, plus optionally moves the sprite
	// between 2 given points using a movement animation, which can optionally
	// be tick-driven by an event from the primary animation (e. g. a footstep)
	// returns: awaitable wrapper around the animation, with added stop method
	function playAnimationForVisibleObject(entObj) {
		return (async function playAnimation(s, {
			animationId, // the primary animation
			moveAnimationId = null, // movement animation (FROM/TO_X/Y), if any
			moveTickEvent = null, // coming from the animation animationId
			moveFrom = null,
			moveTo = null,
			parameters = {}
		} = {}) {
			// embed parameters, and the from/to parameters if provided
			var actualParameters = Object.assign({}, parameters);
			if (moveFrom) {
				actualParameters.FROM_X = moveFrom.x;
				actualParameters.FROM_Y = moveFrom.y;
			}
			if (moveTo) {
				actualParameters.TO_X = moveTo.x;
				actualParameters.TO_Y = moveTo.y;
			}
			
			var story = "";
			if (!moveAnimationId) {
				// just a standalone non-position-moving animation
				// (or the movement FROM_X/Y TO_X/Y is embedded)
				story = animationId;
			} else if (moveTickEvent) {
				// story with movement animation driven by the animation
				story = [{
					primary: moveAnimationId,
					driver: animationId,
					tickOn: moveTickEvent
				}];
			} else {
				// a bunch animation, where the primary one (i. e. the one
				// that defines when the whole animation stops) is movement one
				story = [{
					bunch: [
						"primary",
						moveAnimationId,
						animationId
					]
				}];
			}

			// begin the animation
			var { comAnimator } = entApp.comScene.getSpriteAndAnimator(entObj);
			var theAnimation = comAnimator.playAnimation({
				story: story,
				parameters: actualParameters,
				tickSource: entApp.comScene.comGameFixedTicks
			}), result = theAnimation.evtDone();

			// prepare and return the result
			result.stop = function stop() { theAnimation.dispose(); };
			return result;
		});
	}

	function scriptToolsForDefaultObject(entObj) {
		return {
			get ent() {
				// direct access to the entity
				return entObj;
			},
			get id() {
				return entObj.sceneId;
			},
			get rect() {
				var { x, y } = entObj.scriptTools.position;
				return { x: x, y: y, width: 0, height: 0 };
			},
			// {x,y}
			get position() {
				if (entObj.comSprite) {
					return ({
						x: entObj.comSprite.x,
						y: entObj.comSprite.y
					});
				} else {
					return ({ x: 0, y: 0 });
				}
			},
			set position(pos) {
				entObj.comSceneObject.setPosition({
					x: pos.x,
					y: pos.y
				});
			},
			playAnimation: ScriptHelpers.playAnimationForVisibleObject(
				entObj),
			dispose() {
				entObj.dispose();
			}
		};
	}

	function createEntLocation({ sceneId, x, y, width, height }) {
		var entLocation = me.newSceneEntity({
			sceneId: sceneId,
			reuseExisting: false
		});

		entLocation.comCollisionZone = entLocation.newComponent(
			comCollisionEngine.ComCollisionZone, {
				id: sceneId,
				x: x,
				y: y,
				width: width,
				height: height
			});

		var scriptTools = entLocation.scriptTools = {
			get ent() {
				// direct access to the entity
				return entLocation;
			},
			get id() {
				return entLocation.sceneId;
			},
			get rect() {
				return entLocation.comCollisionZone.rect;
			},
			// {x,y}
			get position() {
				var rect = entLocation.comCollisionZone.rect;
				return {
					x: rect.x + rect.width * 0.5,
					y: rect.y + rect.height * 0.5
				};
			},
			set position(pos) {
				var rect = entLocation.comCollisionZone.rect;
				entLocation.comCollisionZone.setRect({
					x: pos.x - rect.width * 0.5,
					y: pos.y - rect.height * 0.5,
					width: rect.width,
					height: rect.height
				});
			}
		};

		return entLocation;
	}

	// script for making beeps on HP bar changes
	var scrHPBeeper = ent.newScript();
	scrHPBeeper.run(async function hpBarSfx(s) {
		for (;;) {
			s.checkLeave();
			var [ evtWidth, evtSetHPBar ] = await s.anyOf(
				s.ent.event("hpbar$width"), // feedback from the bar
				s.ent.event("hpbar$set"));
			if (evtWidth) {
				hlsfxBeep({ frequency: 400 + evtWidth.width * 400 });
			} else if (evtSetHPBar) {
				entUI.comUI.setBar(s, {
					entEvtTarget: s.ent,
					evtType: "hpbar$width",
					width: evtSetHPBar.value / GameConst.HERO_MAX_HP
				});
			}
		}
	});

	// script for making screen effects (shakes, flashes)
	var scrScreenFXer = ent.newScript();
	var currentScreenFX = null;
	async function runScreenFXer(s) {
		for (;;) {
			while (!currentScreenFX) {
				s.checkLeave();
				await s.waitGameFixedTicks(1);
			}

			var currentFX = currentScreenFX;
			var comVeil = entApp.comScene.comParts.comVeil;
			try {
				switch (currentFX.type) {
				case "shaker":
					for (var i = 0;
						i < currentFX.duration &&
							currentFX == currentScreenFX; i++) {
						var phase = 1 - (i % 3);
						xcomRenderer.shakeOffset = [
							currentFX.x * phase,
							currentFX.y * phase
						];
						s.checkLeave();
						await s.waitGameFixedTicks(1);
					}
					break;

				case "flash":
					comVeil.enabled = true;
					comVeil.xOffset = comVeil.yOffset = 0;
					comVeil.color = "#FFFFFF";
					for (var i = 0;
						i < currentFX.duration &&
							currentFX == currentScreenFX; i++) {
						var phase = 1.0 - i / currentFX.duration;
						comVeil.alpha = phase;
						s.checkLeave();
						await s.waitGameFixedTicks(1);
					}
					break;
				}
			} finally {
				if (currentScreenFX === currentFX) {
					currentScreenFX = null;
				}
				xcomRenderer.shakeOffset = [0, 0];
				comVeil.enabled = false;
			}
		}
	}

	// script that listens for "playParticle" events going from animations
	var scrParticleFromAnimationsPlayer = ent.newScript();
	async function runParticleFromAnimationsPlayer(s) {
		for (;;) {
			s.checkLeave();
			var [ playParticle ] = await s.anyOf(
				entApp.comScene.entSceneEventSink.event("playParticle"));
			me.scriptTools.playParticle({
				particleId: playParticle.particleId,
				atPosition: {
					x: playParticle.xcomAtSprite.x || 0,
					y: playParticle.xcomAtSprite.y || 0
				}
			});
		}
	}

	return (me = {
		dispose() {
			scrHPBeeper.dispose();
			// components and sub-entities are disposed automatically
		},

		get comCollisionEngine() { return comCollisionEngine; },
		get entScreen() { return entScreen; },

		newSceneEntity({
			sceneId = "@@" + (++defaultSceneId),
			reuseExisting = false
		} = {}) {
			if (objectsById[sceneId]) {
				if (reuseExisting) {
					// re-using of existing object is allowed
					return objectsById[sceneId];
				} else {
					// creating object with an existing ID wipes the existing one
					objectsById[sceneId].dispose();
				}
			}
			var newObj = (objectsById[sceneId] = entScreen.newSubEntity());
			newObj.sceneId = sceneId;
			newObj.newComponent(ComRegistryAutoDeleter, { sceneId: sceneId });
			return newObj;
		},

		// update map only according to the game state
		updateTilesOnlyAccordingToGameState() {
			if (!currentScreenRes) {
				return;
			}

			var gameState = comGame.gameState;
			for (var tilePatch of currentScreenRes.tilePatches) {
				if (tilePatch.getState({ gs: gameState, tmps: tmpScreenVars })
						== 'on') {
					entApp.comScene.comParts.comDrawableMap.applyTilePatch(
						tilePatch);
				}
			}
		},

		// update all object states according to the game state
		updateAccordingToGameState() {
			if (!currentScreenRes) {
				return;
			}

			me.updateTilesOnlyAccordingToGameState();

			var gameState = comGame.gameState;

			// iterate across objectsById and update state where applicable
			for (var objSrc of currentScreenRes.doodads) {
				var sceneId = objSrc.sceneId,
					obj = objectsById[sceneId];
				if (objSrc.getState && obj && obj.comSceneObject) {
					obj.comSceneObject.setState(objSrc.getState({
						gs: gameState,
						tmps: tmpScreenVars
					}));
				}
			}

			// create/update pickable items doodads
			for (var invItemId in ResInventoryItems) {
				var invItem = ResInventoryItems[invItemId];
				if (!invItem || !comGame.gameState[invItemId] ||
					comGame.gameState[invItemId] == "inv" ||
					comGame.gameState[invItemId] == "discarded" ||
					comGame.gameState[invItemId].screen != currentScreenId) {
					// incorrect item, or it is not enabled, or is
					// in inventory, or is not on the current screen

					// wipe the item doodad reference from the helper
					// registry
					if (entInvItemDoodads[invItemId]) {
						entInvItemDoodads[invItemId].dispose();
						delete entInvItemDoodads[invItemId];
					}
					continue;
				}

				var gameStateItem = comGame.gameState[invItemId];

				// create the doodad (if not yet)
				if (!entInvItemDoodads[invItemId]) {
					var entItem = entInvItemDoodads[invItemId] =
						me.newSceneEntity({
							sceneId: invItemId,
							reuseExisting: false
						});
					var itemDoodadFactory =
						ResMapItemFactory[invItem.mapTypeId];
					if (itemDoodadFactory) {
						itemDoodadFactory({
							ent: entItem,
							srcObj: {
								typeId: invItem.mapTypeId,
								sceneId: invItemId,
								x: (gameStateItem.xt + 0.5) *
									GameConst.MAP_CELL_WIDTH
									/ GameConst.PIXEL_GRANULARITY,
								y: (gameStateItem.yt + 0.5) *
									GameConst.MAP_CELL_WIDTH
									/ GameConst.PIXEL_GRANULARITY,
								getState: ({gs,tmps}) => 'on',
								props: {}
							}
						});
					}
				}

				// update it (they are always in the 'on' state)
				entInvItemDoodads[invItemId].comSceneObject.setState('on');
			}
		},

		async clear(s, {
			transOutVeilType = "none",
			isRestore = false // if true then don't clear gs.local
		} = {}) {
			// suspend game timer
			entApp.comScene.comGameFixedTicks.enabled = false;

			// stop screen FX script
			scrScreenFXer.stop();
			currentScreenFX = null;

			// stop particle player
			scrParticleFromAnimationsPlayer.stop();

			// play transition animation
			await me.playVeilAnimation(s, { type: transOutVeilType });

			// reset stuff
			entScreen.dispose();
			entScreen = ent.newSubEntity();
			objectsById = {};
			transitsById = {};
			tmpScreenVars = {};

			// clear locals container (unless we are loading the stored game)
			if (!isRestore || !comGame.gameState.local) {
				comGame.gameState.local = {};
			}

			comCollisionEngine = entScreen.newComponent(ComCollisionEngine, {
			});

			comHotspots = entScreen.newComponent(ComHotspots, {
				comGame
			});

			comParticles = entScreen.newComponent(ComParticles, {
			});

			entApp.comScene.comParts.comDrawableMap.clear();
			scrHeroTransitBumpChecker = entScreen.newScript();

			// they are possibly disposed already as scripts of of entScreen,
			// but just to be sure
			for (var scrDaemonScript of scrDaemonScripts) {
				scrDaemonScript.dispose();
			}
			scrDaemonScripts.length = 0;

			entInvItemDoodads = new Object();
			// ^the contained entities are disposed earlier as sub-entities
			// of entScreen
		},

		// method to refresh hotspots
		refreshHotspots({ show = true } = {}) {
			comHotspots.clear();

			var hotspotReservedIds = {}; // for items

			// get reserved IDs (for items that are explicitly
			// dropped on this screen)
			for (var invItemId in ResInventoryItems) {
				var invItem = ResInventoryItems[invItemId];
				if (invItem && comGame.gameState[invItemId] &&
					comGame.gameState[invItemId].screen == currentScreenId) {
					hotspotReservedIds[invItem.hotspotId] = true;
				}
			}

			if (currentScreenRes && currentScreenRes.hotspots) {
				// get hotspot specs from scripts and init hotspots
				for (var hotspotId in currentScreenRes.hotspots) {
					if (hotspotId in hotspotReservedIds) {
						continue;
					}

					var hotspotSrc = currentScreenRes.hotspots[hotspotId],
						hotspotSpec = ResHotspotSpecs[currentScreenId] &&
							ResHotspotSpecs[currentScreenId][hotspotId];

					var skSpec = [
						{
							text: UIText.SK_INVENTORY,
							action: "gameAction",
							args: {
								action: "openInventory",
								forUse: true,
								hotspotId: hotspotId
							}
						},
						{ text: "", action: null, args: null }
					], animationId = null;


					// query to the script to resolve the hotspot spec
					hotspotSpec = hotspotSpec && hotspotSpec(
						{ gs: comGame.gameState, tmps: tmpScreenVars });
					if (hotspotSpec) {
							
						// determine animation ID
						switch (hotspotSpec[0]) {
						case "xz": animationId = "MapFXHotSpotZX"; break;
						case "x": animationId = "MapFXHotSpotX"; break;
						}

						// construct SK specs
						for (var i = 0; i < 2; i++) {
							if (hotspotSpec[i + 1]) {
								skSpec[i] = {
									text: hotspotSpec[i + 1][0],
									action: "gameAction",
									args: Object.assign({
										action: hotspotSpec[i + 1][1]
									}, hotspotSpec[i + 1][2])
								};
							}
						}
					}

					if (show && hotspotSpec) {
						comHotspots.setHotspot({
							x: hotspotSrc.xt,
							y: hotspotSrc.yt,
							animationId: animationId,
							leftSK: skSpec[0],
							rightSK: skSpec[1],
							hotspotId: hotspotId
						});
					} else {
						comHotspots.setHotspot({
							x: hotspotSrc.xt,
							y: hotspotSrc.yt,
							hotspotId: hotspotSpec ? hotspotId : null
						});
					}

					// create location
					var ent = createEntLocation({
						sceneId: hotspotId,
						x: hotspotSrc.xt * GameConst.MAP_CELL_WIDTH,
						y: hotspotSrc.yt * GameConst.MAP_CELL_WIDTH,
						width: GameConst.MAP_CELL_WIDTH,
						height: GameConst.MAP_CELL_WIDTH
					});
				}

				// add hotspots for active pickable items
				// (as marked in gameState)
				for (var invItemId in ResInventoryItems) {
					var invItem = ResInventoryItems[invItemId];
					if (!invItem || !comGame.gameState[invItemId] ||
						comGame.gameState[invItemId] == "inv" ||
						comGame.gameState[invItemId].screen != currentScreenId) {
						// incorrect item, or it is not enabled, or is
						// in inventory, or is not on the current screen

						// wipe the item doodad reference from the helper
						// registry
						if (entInvItemDoodads[invItemId]) {
							delete entInvItemDoodads[invItemId];
						}
						continue;
					}

					var hotspotId = invItem.hotspotId,
						gameStateItem = comGame.gameState[invItemId];

					if (show) {
						var isFreeSpot = comHotspots.isHotspotBlank({
							x: gameStateItem.xt,
							y: gameStateItem.yt
						});
						if (!isFreeSpot) console.log(gameStateItem,
							comHotspots.getHotspotId({
								x: gameStateItem.xt,
								y: gameStateItem.yt
							}));

						var skSpec = [
							{
								text: UIText.SK_PICKUP,
								action: "gameAction",
								args: {
									action: "pickupItem",
									itemId: invItemId
								}
							},
							{
								text: UIText.SK_EXAMINE,
								action: "gameAction",
								args: {
									action: "examine",
									id: isFreeSpot ? invItem.examHintId :
										"ex_place_cluttered"
								}
							}
						];

						if (!isFreeSpot) {
							// clear already existing hotspot for making place
							// for "much stuff here" type hotspot
							comHotspots.setHotspot({
								x: gameStateItem.xt,
								y: gameStateItem.yt,
								animationId: null
							});
						}

						comHotspots.setHotspot({
							x: gameStateItem.xt,
							y: gameStateItem.yt,
							animationId: "MapFXHotSpotZX",
							leftSK: skSpec[0],
							rightSK: skSpec[1],
							hotspotId: invItemId
						});
					}

					// create location
					createEntLocation({
						sceneId: hotspotId,
						x: gameStateItem.xt * GameConst.MAP_CELL_WIDTH,
						y: gameStateItem.yt * GameConst.MAP_CELL_WIDTH,
						width: GameConst.MAP_CELL_WIDTH,
						height: GameConst.MAP_CELL_WIDTH
					});
				}
			}
		},

		getHotspotId({ xt, yt }) {
			return comHotspots.getHotspotId({ x: xt, y: yt });
		},

		async switchToScreen(s, {
			screenId,
			transInVeilType = "none",
			transOutVeilType = "none",
			isRestore = false
		} = {}) {
			await me.clear(s, {
				transOutVeilType: transOutVeilType,
				isRestore
			});
			comHotspots.clear();

			currentScreenRes = ResMaps[screenId];
			currentScreenId = comGame.gameState.currentScreen = screenId;

			// create the transits
			for (var transId in currentScreenRes.transits) {
				var srcObj = currentScreenRes.transits[transId];
				let transObj = transitsById[transId] = me.newSceneEntity({
					sceneId: srcObj.sceneId
				});
				// creates transObj.comCollisionZone
				transObj.comCollisionZone = transObj.newComponent(
					comCollisionEngine.ComCollisionZone, {
						id: transId,
						x: srcObj.x * GameConst.PIXEL_GRANULARITY,
						y: srcObj.y * GameConst.PIXEL_GRANULARITY,
						width: srcObj.width * GameConst.PIXEL_GRANULARITY,
						height: srcObj.height * GameConst.PIXEL_GRANULARITY
					});
				transObj.src = srcObj;

				let scriptTools = transObj.scriptTools = {
					get ent() {
						// direct access to the entity
						return transObj;
					},
					get id() {
						return transObj.sceneId;
					},
					get rect() {
						return transObj.comCollisionZone.rect;
					},
					// {x,y}
					get position() {
						return transObj.comCollisionZone.center;
					},
					set position(pos) {
						transObj.comCollisionZone.setRect({
							x: pos.x - scriptTools.rect.width * 0.5,
							y: pos.y - scriptTools.rect.height * 0.5,
							width: scriptTools.rect.width,
							height: scriptTools.rect.height
						});
					},
					get state() {
						// call to transit enabled detector
						return srcObj.getState(
							{ gs: comGame.gameState, tmps: tmpScreenVars });
					}
				};
			}

			// create locations
			for (var locId in currentScreenRes.locations) {
				var srcObj = currentScreenRes.locations[locId];

				// create location
				var locObj = createEntLocation({
					sceneId: locId,
					x: srcObj.x * GameConst.PIXEL_GRANULARITY,
					y: srcObj.y * GameConst.PIXEL_GRANULARITY,
					width: srcObj.width * GameConst.PIXEL_GRANULARITY,
					height: srcObj.height * GameConst.PIXEL_GRANULARITY
				});
				locObj.src = srcObj;
				if (srcObj.props.offerFlags) {
					locObj.comCollisionZone.setOfferFlags(
						srcObj.props.offerFlags
					);
				}
				if (srcObj.props.acceptFlags) {
					locObj.comCollisionZone.setAcceptFlags(
						srcObj.props.acceptFlags
					);
				}
			}

			// create the objects (doodads, actors and nonvisuals)
			for (var srcObj of currentScreenRes.doodads) {
				var factoryFunc = ResMapItemFactory[srcObj.typeId];
				if (factoryFunc) {
					// create the core entity
					var entNewObj = me.newSceneEntity({
						sceneId: srcObj.sceneId
					});
					entNewObj.srcProps = srcObj.props;

					// create the components using the factory
					factoryFunc({
						ent: entNewObj,
						srcObj: srcObj,
						xcomGameScreen: me
					});
				} else {
					console.log("Bad object typeId ", srcObj.typeId);
				}				
			}

			// create hero
			entHero = me.replaceHeroEntity();
			scrHeroTransitBumpChecker.run(runHeroTransitBumpChecker, {});

			me.updateAccordingToGameState();

			entUI.comUI.setLocationTitleSync(currentScreenRes.name);

			// enforce creation of hotspots location
			me.refreshHotspots({ show: false });

			// startup daemon scripts (do not clean previous ones - they
			// were already cleaned on clear() above)
			if (ResScripts[currentScreenId] &&
				ResScripts[currentScreenId].daemon) {
				for (var daemonScriptFunc of ResScripts[currentScreenId].daemon) {
					var scrDaemonScript = entScreen.newScript();
					scrDaemonScript.run(daemonScriptFunc, {
						gs: comGame.gameState,
						tmps: tmpScreenVars,
						st: me.scriptTools
					});
					scrDaemonScripts.push(scrDaemonScript);
				}
			}
			
			// play transition-in animation
			entApp.comScene.comGameFixedTicks.enabled = false;
			await me.playVeilAnimation(s, { type: transInVeilType });

			// resume game timer
			entApp.comScene.comGameFixedTicks.enabled = true;

			// restart screen FX script
			scrScreenFXer.run(runScreenFXer);

			// restart particle player
			scrParticleFromAnimationsPlayer.run(
				runParticleFromAnimationsPlayer);
		},

		async playVeilAnimation(s, { type = "none" }) {
			var comVeil = entApp.comScene.comParts.comVeil;

			var interpStoryPos = [
				{ var: ["x @FROM_X->@TO_X", "y @FROM_Y->@TO_Y"], ticks: 30 }
			];
			var interpPosParams = {
				"left-in": { FROM_X: -GameConst.SCREEN_WIDTH, TO_X: 0, FROM_Y: 0, TO_Y: 0, enableAfter: true },
				"left-out": { FROM_X: 0, TO_X: -GameConst.SCREEN_WIDTH, FROM_Y: 0, TO_Y: 0, enableAfter: false },
				"right-in": { FROM_X: GameConst.SCREEN_WIDTH, TO_X: 0, FROM_Y: 0, TO_Y: 0, enableAfter: true },
				"right-out": { FROM_X: 0, TO_X: GameConst.SCREEN_WIDTH, FROM_Y: 0, TO_Y: 0, enableAfter: false },
				"up-in": { FROM_Y: -GameConst.SCREEN_HEIGHT, TO_Y: 0, FROM_X: 0, TO_X: 0, enableAfter: true },
				"up-out": { FROM_Y: 0, TO_Y: -GameConst.SCREEN_HEIGHT, FROM_X: 0, TO_X: 0, enableAfter: false },
				"down-in": { FROM_Y: GameConst.SCREEN_HEIGHT, TO_Y: 0, FROM_X: 0, TO_X: 0, enableAfter: true },
				"down-out": { FROM_Y: 0, TO_Y: GameConst.SCREEN_HEIGHT, FROM_X: 0, TO_X: 0, enableAfter: false }
			};

			var interpStoryVal = [
				{ var: "alpha @FROM_V->@TO_V", ticks: 60 }
			];
			var interpValParams = {
				"black-in": { FROM_V: 0, TO_V: 1, enableAfter: true },
				"black-out": { FROM_V: 1, TO_V: 0, enableAfter: false }
			};

			var comVeilAnimation;
			function veilAnimator({
				varName,
				value,
				isEvent
			}) {
				switch (varName) {
				default:
					return;
				case "x": comVeil.xOffset = value; break;
				case "y": comVeil.yOffset = value; break;
				case "alpha":
					comVeil.xOffset = comVeil.yOffset = 0;
					comVeil.alpha = value;
					break;
				}
				// enable automatically on 1st frame
				comVeil.enabled = true;
			}

			// launch the appropriate animation
			try {
				switch (type) {
				case "none":
					comVeil.enabled = false;
					return;

				case "black-in":
				case "black-out":
					comVeil.color = "#000000";
					comVeilAnimation = s.ent.newComponent(ComHLAnimation, {
						story: interpStoryVal,
						parameters: interpValParams[type],
						tickSource: entApp.comAppFixedTicks,
						animator: veilAnimator
					});
					await s.anyOf(comVeilAnimation.evtDone());
					comVeil.enabled = interpValParams[type].enableAfter;
					return;

				case "left-in":
				case "right-in":
				case "down-in":
				case "up-in":
				case "left-out":
				case "right-out":
				case "down-out":
				case "up-out":
					hlsfxPlaySFX({ sfxId: "change_screen" });
					comVeil.alpha = 1;
					comVeil.color = "#000000";
					comVeilAnimation = s.ent.newComponent(ComHLAnimation, {
						story: interpStoryPos,
						parameters: interpPosParams[type],
						tickSource: entApp.comAppFixedTicks,
						animator: veilAnimator
					});
					await s.anyOf(comVeilAnimation.evtDone());
					comVeil.enabled = interpPosParams[type].enableAfter;
					return;
				}
			} finally {
				if (comVeilAnimation) {
					comVeilAnimation.dispose();
				}
			}
		},

		// set hotspot (in map tile coord) the hero is currently in
		setActiveHotspot({ x, y, force = false }) {
			comHotspots.setActiveCell({ x, y, force });
		},

		get entHero() { return entHero; },
		replaceHeroEntity() {
			entHero = me.newSceneEntity({ sceneId: "hero" });
			var scriptTools = entHero.scriptTools = {
				get ent() {
					// direct access to the entity
					return entHero;
				},
				get id() {
					return entHero.sceneId;
				},
				get rect() {
					var { x, y } = entHero.scriptTools.position;
					return { x: x, y: y, width: 0, height: 0 };
				},
				// {x,y}
				get position() {
					if (entHero.comSprite) {
						return ({
							x: entHero.comSprite.x,
							y: entHero.comSprite.y
						});
					} else {
						return (comGame.gameState.heroPoint || { x: 0, y: 0 });
					}
				},
				set position(pos) {
					comGame.gameState.heroPoint = { x: pos.x, y: pos.y };
					if (entHero.comSprite) {
						entHero.comSprite.x = pos.x;
						entHero.comSprite.y = pos.y;
					}
					entHero.postEvent("extMove", { x: pos.x, y: pos.y });
				},
				// stateId
				get state() {
					return entHero.comSceneObject.getState();
				},
				set state(stateId) {
					entHero.comSceneObject.setState(stateId);
				},
				playAnimation: ScriptHelpers.playAnimationForVisibleObject(
					entHero),
				hide() {
					if (entHero.comSprite) {
						entHero.comSprite.gfxId = "";
					}
				}
			};
			scrHeroTransitBumpChecker.run(runHeroTransitBumpChecker, {});
			return entHero;
		},

		// run bunch of scripts until one of them returns non-false,
		// and return that value (or undefined if all returned false)
		// action depends on the script set meaning - typically it is
		// the game action which needs to be validated
		async runScriptSet(s, { scriptId, action }) {
			var scripts = ResScripts[comGame.gameState.currentScreen] &&
				ResScripts[comGame.gameState.currentScreen][scriptId];
			if (scripts) {
				var scriptCtl = s.fork();
				try {
					entUI.comUI.showRecSync(); // show cut scene indicator
					for (var script of scripts) {
						var ssc = scriptCtl.run(script, {
							gs: comGame.gameState,
							tmps: me.tmpScreenVars,
							st: me.scriptTools,
							action: action
						});
						var [ result ] = await s.anyOf(ssc);
						if (result) {
							return result;
						}
					}
				} finally {
					entUI.comUI.hideRecSync();
					scriptCtl.dispose();
				}
			}
		},

		get comCollisionEngine() { return comCollisionEngine },

		isUserControl: false, // true while hero moves under user control

		// script tools (this one will be passed to scripts as "st" arg)
		scriptTools: {
			object(sceneId) {
				var entObj = me.newSceneEntity({
					sceneId: sceneId,
					reuseExisting: true
				});

				// if the object has no script tools (i. e. it is a new created
				// one), then it is supposed to be a default type object
				if (!entObj.scriptTools) {
					entObj.scriptTools = scriptToolsForDefaultObject(entObj);
				}

				return entObj.scriptTools;
			},

			// can be used for posting/listening events to/by daemon scripts
			get entScreenSink() {
				return entScreen;
			},

			// check if the locations in the collisionEnter/collisionExit
			// event are given pair, or a given locId is one of them
			// ordered = true if only events where locId is the _first_
			// component must be scored (only if withLocId != null)
			isCollision({ collEvent, locId, withLocId = null, ordered = true }) {
				if (withLocId) {
					return (collEvent.z1.id == locId &&
						collEvent.z2.id == withLocId) ||
						(!ordered && (collEvent.z2.id == locId &&
						collEvent.z1.id == withLocId));
				} else {
					return collEvent.z1.id == locId || collEvent.z2.id == locId;
				}
			},

			// check if the given point is in a collision zone with given
			// offerFlags
			isInCollisionZoneWithFlags({ point, offerFlags }) {
				return comCollisionEngine.isInCollisionZone({
					point,
					offerFlags
				});
			},

			// async
			async waitTicks(s, ticks) {
				await s.waitGameFixedTicks(ticks);
			},

			async popup(s, {
				type = "plain", // "intro"|"plain"|"iconLeft"|"iconRight"|"iconTop"
				header = "",
				icon = null,
				text = "",
				enableSkip = false
			}) {
				var recShown = entUI.comUI.isRecVisible;
				try {
					entApp.comScene.comGameFixedTicks.enabled = false;
					entUI.comUI.hideRecSync();
					var [ popupResult ] = await s.anyOf(
						entUI.comUI.popupModal({
							type: type,
							header: header,
							icon: icon && (hlgfxGetSheetImg(icon) || icon),
							text: text,
							enableSkip: enableSkip
						})
					);
					return popupResult;
				} finally {
					if (recShown) {
						entUI.comUI.showRecSync();
					}
					entApp.comScene.comGameFixedTicks.enabled = true;
				}
			},

			async examinePopup(s, { id }) {
				var examineHint = ResExamineHints[id];
				if (examineHint) {
					return await me.scriptTools.popup(s, {
						type: examineHint.icon ? "iconTop" : "plain",
						header: examineHint.title,
						icon: examineHint.icon || null,
						text: examineHint.text
					});
				}
			},

			// items: array of
			// {
			//	text: string,
			//	enabled: true|false,
			//	leftText: string|undef,
			//  leftResult: ...|undef
			//  rightText: string|undef
			//  rightResult: ...|undef
			//  selected: true
			// }|"hr",
			async menu(s, {
				title,
				items,
				maxOnScreen
			}) {
				var recShown = entUI.comUI.isRecVisible;
				try {
					entApp.comScene.comGameFixedTicks.enabled = false;
					entUI.comUI.hideRecSync();
					var menuResult = await ScriptHelpers.runMenu(s, {
						entTarget: entScreen,
						title: title,
						items: items,
						maxOnScreen: maxOnScreen
					});
					return menuResult;
				} finally {
					if (recShown) {
						entUI.comUI.showRecSync();
					}
					entApp.comScene.comGameFixedTicks.enabled = true;
				}
			},

			screenPosToTilePos({ x, y }) {
				return {
					xt: Math.floor(x / GameConst.MAP_CELL_WIDTH),
					yt: Math.floor(y / GameConst.MAP_CELL_WIDTH)
				};
			},

			tilePosToScreenPos({ xt, yt }) {
				return {
					x: Math.floor((xt + 0.5) * GameConst.MAP_CELL_WIDTH),
					y: Math.floor((yt + 0.5) * GameConst.MAP_CELL_WIDTH)
				};
			},

			updateSceneToGameState({
				tilesOnly = false,
				refreshHotspots = false
			} = {}) {
				if (tilesOnly) {
					me.updateTilesOnlyAccordingToGameState();
				} else {
					me.updateAccordingToGameState();
				}

				if (refreshHotspots) {
					me.refreshHotspots({ show: me.isUserControl });
				}
			},

			// note - invalidates the objects acquired so far and their st's
			// returns after the switch is completed
			async switchToScreen(s, {
				screenId,
				transInVeilType = "none",
				transOutVeilType = "none"
			} = {}) {
				await me.switchToScreen(s, {
					screenId: screenId,
					transInVeilType: transInVeilType,
					transOutVeilType: transOutVeilType
				});
				me.updateAccordingToGameState();

				return {
					gs: comGame.gameState,
					tmps: me.tmpScreenVars
				};
			},

			placePickableItem({ gs, itemId, screen, atTile, updateScene = true }) {
				var invItem = ResInventoryItems[itemId];
				if (invItem) {
					// remove the item from inventory (if any)
					gs.inventory = gs.inventory.filter((v) => v != itemId);

					// place the item within the state
					gs[itemId] = {
						screen: screen,
						xt: atTile.xt,
						yt: atTile.yt
					};

					if (updateScene) {
						me.updateAccordingToGameState();
					}
				}
			},

			takePickableItem({ gs, itemId, updateScene = true }) {
			    var invItem = ResInventoryItems[itemId];
				if (invItem) {
					if (gs.inventory.indexOf(itemId) == -1) {
						gs.inventory.push(itemId);
					}
					gs[itemId] = "inv";

					if (updateScene) {
						me.updateAccordingToGameState();
					}
				}
			},

			discardPickableItem({
				gs,
				itemId,
				updateScene = true,
				unenable = false
			}) {
			    var invItem = ResInventoryItems[itemId];
				if (invItem) {
					gs.inventory = gs.inventory.filter((v) => v != itemId);
					if (unenable) {
						delete gs[itemId];
					} else {
						gs[itemId] = "discarded";
					}

					if (updateScene) {
						me.updateAccordingToGameState();
					}
				}
			},

			isInLocation({ point, locId }) {
				var comCollZone =
					comCollisionEngine.getCollisionZoneById(locId);
				if (comCollZone) {
					return comCollZone.containsPoint(point);
				} else {
					return false;
				}
			},

			locationById(locId) {
				return comCollisionEngine.getCollisionZoneById(locId);
			},

			getTugrikCount({ gs }) {
				return gs.tugriks_collected || 0;
			},

			setTugrikCount({ gs, value }) {
				gs.tugriks_collected = (value || 0);
				entUI.comUI.setTugricsSync(gs.tugriks_collected);
			},

			getHP({ gs }) {
				return gs.hp | 0;
			},

			setHP({ gs, value, sync = false }) {
				if (value < 0) {
					value = 0;
				}

				if (value > GameConst.HERO_MAX_HP) {
					value = GameConst.HERO_MAX_HP;
				}

				gs.hp = value;
				if (sync) {
					entUI.comUI.setBarSync(value / GameConst.HERO_MAX_HP);
				} else {
					ent.postEvent("hpbar$set",  { value: value });
				}
			},

			setScreenTitle(title) {
				entUI.comUI.setLocationTitleSync(title);
			},

			// fx = { type:"shaker|flash", duration:N, [x, y - shaker only] }
			playScreenFX(fx) {
				currentScreenFX = fx;
			},

			playParticle({
				particleId,
				atPosition
			}) {
				var particleSpec = ResParticles[particleId];
				if (particleSpec) {
					comParticles.playParticle({
						animationId: particleSpec.animationId || null,
						moveAnimationId: particleSpec.moveAnimationId || null,
						moveTickEvent: particleSpec.moveTickEvent || null,
						moveFrom: atPosition,
						moveTo: particleSpec.toOffset ?
							{
								x: atPosition.x + particleSpec.toOffset.x,
								y: atPosition.y + particleSpec.toOffset.y
							} : atPosition,
						randomToOffset: particleSpec.randomToOffset || null,
						parameters: particleSpec.parameters,
						atPosition: atPosition
					});
				}
			},

			enableDark(yes) {
				entApp.comScene.comParts.comDrawableDark.enabled = yes;
				entApp.comScene.comParts.comDrawableDark.lightRadius = 0;
			},

			get gameState() {
				return comGame.gameState;
			},

			saveCheckpoint() {
				comGame.saveCheckpoint();
			},
		},

		get tmpScreenVars() {
			return tmpScreenVars;
		}
	});
}
