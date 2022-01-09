//#include l30_game_screen

// root component for keeping everything game related

function ComGameContainer(ent, {
	xcomScene = entApp.comScene
} = {}) {
	var me;
	var entContainer = ent.newSubEntity();

	var comGame = entContainer.comGame = entContainer.newComponent(ComGame, {
	});
	var comGameScreen = entContainer.comGameScreen = entContainer.newComponent(ComGameScreen, {
		comGame
	});

	return (me = {
		dispose() {
			entContainer.dispose(); // also disposes the subcomponents
		},

		// target for events
		get entContainer() {
			return entContainer;
		},
		get comGameScreen() {
			return comGameScreen;
		},

		get gameState() {
			return comGame.gameState;
		},
		set gameState(gs) {
			comGame.gameState = gs;
		},

		// x, y = coordinates
		async playHeroByUser(s, {
			x,
			y
		} = {}) {
			var entHero = comGameScreen.replaceHeroEntity();

			var scrHotspotTracker = entHero.newScript();
			scrHotspotTracker.run(async function runHotspotTracker(s) {
				for (;;) {
					s.checkLeave();
					var [ moveOnMap ] = await s.anyOf(
						entHero.event("moveOnMap")
						);
					comGameScreen.setActiveHotspot({
						x: moveOnMap.xt,
						y: moveOnMap.yt
					});
				}
			});

			entHero.comControlledHero = entHero.newComponent(ComControlledHero, {
				x: x,
				y: y,
				xcomGameScreen: comGameScreen
			});
			entHero.comControlledHero.comCollHitbox.turretNoTargetCountdown = false;
			comGameScreen.refreshHotspots({ show: true });
			comGameScreen.setActiveHotspot({
				x: Math.floor(x / GameConst.MAP_CELL_WIDTH),
				y: Math.floor(y / GameConst.MAP_CELL_WIDTH),
				force: true
			});

			try {
				comGame.saveGame();
				comGameScreen.isUserControl = true;
				// wait for events that finish user's control loop
				for (;;) {
					var [ makeTransit, gameAction ] = await s.anyOf(
						comGameScreen.entScreen.event("makeTransit"),
						comGameScreen.entScreen.event("gameAction"),
						);

					if (makeTransit) {
						return Object.assign({ "action": "transit" },
							makeTransit);
					}

					if (gameAction) {
						return gameAction; // game action returned as is
					}
				}
			} finally {
				comGameScreen.isUserControl = false;
				scrHotspotTracker.dispose();
				comGameScreen.refreshHotspots({ show: false });
			}
		},

		// sort of main game function
		async gameLoop(s, {
		} = {}) {
			// sanitize and defaultize the proposed game state
			var currentScreen = me.gameState.currentScreen || "sC3";
			var defaultStartLocation =
				ResMaps["sC3"].locations["loc_hero_start"];
			var { x: heroX, y: heroY } =
				me.gameState.heroPoint || {
					x: (GameConst.PIXEL_GRANULARITY *
						(defaultStartLocation.x +
						defaultStartLocation.width * 0.5)) | 0,
					y: (GameConst.PIXEL_GRANULARITY *
						(defaultStartLocation.y +
						defaultStartLocation.height * 0.5)) | 0
				};
				// ^ get default starting screen and location
			// next action to make may be set by runScriptSet returns
			var immediateNextAction = null;
			if (!me.gameState.inventory) {
				me.gameState.inventory = new Array();
				// default inventory
				me.gameState.inventory.push("it_yad");
			}

			// filter out non-existent items and sync statuses of the
			// existing ones
			me.gameState.inventory = me.gameState.inventory.filter(
				(v) => v in ResInventoryItems );
			for (var itemId of me.gameState.inventory) {
				me.gameState[itemId] = "inv";
			}
			for (var itemId in ResInventoryItems) {
				if (me.gameState[itemId] == "inv" &&
					me.gameState.inventory.indexOf(itemId) == -1) {
					me.gameState.inventory.push(itemId);
				}
			}

			// tugriks count
			comGameScreen.scriptTools.setTugrikCount({
				gs: me.gameState,
				value: me.gameState.tugriks_collected | 0
			});

			// HP
			comGameScreen.scriptTools.setHP({
				gs: me.gameState,
				value: me.gameState.hp | 0,
				sync: true
			});
			
			// show the current screen
			await me.comGameScreen.switchToScreen(s, {
				screenId: currentScreen,
				transInVeilType: "black-out",
				isRestore: true
			});

			var preControlActionScheduled = false;

			THE_LOOP:
			for (;;) {
				me.gameState.heroPoint = { x: heroX, y: heroY };

				comGameScreen.updateAccordingToGameState();

				// let the user control the hero until a gameplay action occurs

				var action = null;
				if (immediateNextAction) {
					action = immediateNextAction;
					immediateNextAction = null;
				} else if (!preControlActionScheduled) {
					// the control session can be overridden by a pre-control action
					var preControlAction = await comGameScreen.runScriptSet(s, {
						scriptId: "preControl"
					});

					if (preControlAction) {
						immediateNextAction = preControlAction;
						preControlActionScheduled = true;
						continue;
					}
				}

				if (!action) {
					action = await me.playHeroByUser(s, {
						x: heroX,
						y: heroY
					});
					preControlActionScheduled = false;
				}
				 
				//console.log(action);

				// and what happened?
				switch (action.action) {
				// inter-screen transit
				case "transit":
					var transTarget = ResMaps[action.targetScreenId]
						.transits[action.targetTransitId];

					switch (action.axis) {
					case "hz":
						heroX = transTarget.x * GameConst.PIXEL_GRANULARITY
							+ action.xOffs;
						heroY = (transTarget.y + transTarget.height * 0.5)
							* GameConst.PIXEL_GRANULARITY;
						break;

					case "vt":
						heroX = (transTarget.x + transTarget.width * 0.5)
							* GameConst.PIXEL_GRANULARITY;
						heroY = transTarget.y * GameConst.PIXEL_GRANULARITY
							+ action.yOffs;
						break;
					}

					await me.comGameScreen.switchToScreen(s, {
						screenId: action.targetScreenId,
						transOutVeilType: action.transTypeOut,
						transInVeilType: action.transTypeIn
					});

					me.gameState.currentScreen = action.targetScreenId;
					me.gameState.heroPoint = { x: heroX, y: heroY };
					continue THE_LOOP;

				case "examine":
					await s.anyOf(comGameScreen.scriptTools.examinePopup(s, {
						id: action.id
					}));
					if (action.setAfter) {
						for (var theVar in action.setAfter) {
							me.gameState[theVar] = action.setAfter[theVar];
						}
					}
					var { x: heroX, y: heroY } =
						comGameScreen.entHero.scriptTools.position;
					continue THE_LOOP;

				case "openInventory":
					var itemAction =
						await InventoryHelpers.showInventory(s, {
							gs: me.gameState,
							tmps: comGameScreen.tmpScreenVars,
							st: comGameScreen.scriptTools,
							forUse: action.forUse
						});
					var { x: heroX, y: heroY } =
						comGameScreen.entHero.scriptTools.position;

					// now, depending on the choice and the mode...
					if (itemAction) {
						var atTile = comGameScreen.scriptTools.
							screenPosToTilePos({
								x: heroX,
								y: heroY
							});
						var onSelectAction = await comGameScreen.runScriptSet(s, {
							scriptId: itemAction.use ? "onUse" : "onDrop",
							action: Object.assign(itemAction, {
								at: { x: heroX, y: heroY },
								atTile: comGameScreen.scriptTools.
									screenPosToTilePos({
										x: heroX,
										y: heroY
									}),
								hotspotId: comGameScreen.getHotspotId(atTile)
							})
						});

						if (onSelectAction) {
							immediateNextAction = onSelectAction;
						} else {
							comGameScreen.tmpScreenVars.inv_last_selected = null;
							if (itemAction.use) {
								// no use found (use mode) - say that aloud
								await comGameScreen.scriptTools.popup(s, {
									text: "@inv_no_use:Герой не увидел в\
 сложившейся ситуации подходящего применения этому предмету."
						});
							} else {
								// no drop preventions (drop mode) -
								// do the drop
								comGameScreen.scriptTools.placePickableItem({
									gs: me.gameState,
									itemId: itemAction.itemId,
									screen: me.gameState.currentScreen,
									atTile: comGameScreen.scriptTools.
										screenPosToTilePos({
											x: heroX,
											y: heroY
										})
								});
								hlsfxBeep({ frequency: 659, ticks: 2 });
							}
						}
					} else {
						// exit-and-dont-drop/use - next inventory view will
						// start with default selection
						comGameScreen.tmpScreenVars.inv_last_selected = null;
					}

					var { x: heroX, y: heroY } =
						comGameScreen.entHero.scriptTools.position;
					comGameScreen.updateAccordingToGameState();
					comGameScreen.refreshHotspots();
					continue THE_LOOP;

				case "pickupItem":
					var { x: heroX, y: heroY } =
						comGameScreen.entHero.scriptTools.position;
					// check for inventory overflow
					var maxItems = me.gameState.f_backpack_collected ?
						GameConst.INVENTORY_SIZE_EXPANDED : 
						GameConst.INVENTORY_SIZE_DEFAULT;
					if (me.gameState.inventory.length >= maxItems) {
						await comGameScreen.scriptTools.popup(s, {
							text: "@inv_full:В котомке героя нет свободного\
 места!"
						});
						continue THE_LOOP;
					}

					// on-pickup action
					var onPickupAction = await comGameScreen.runScriptSet(s, {
						scriptId: "onPickup",
						action: action
					});

					if (onPickupAction) {
						immediateNextAction = onPickupAction;
					} else {
						// no pickup prevention - do the pickup
						comGameScreen.scriptTools.takePickableItem({
							gs: me.gameState,
							itemId: action.itemId
						});

						// and open the inventory in no-use mode
						comGameScreen.tmpScreenVars.inv_last_selected =
							action.itemId;
						immediateNextAction = { 
							action: "openInventory",
							forUse: false,
							hotspotId: null
						};
					}
					var { x: heroX, y: heroY } =
						comGameScreen.entHero.scriptTools.position;
					comGameScreen.updateAccordingToGameState();
					comGameScreen.refreshHotspots();
					continue THE_LOOP;

				case "gameOver":
					//hlsfxPlayMusic({ sfx: null });
					return action;
				}

				// check if there is a (cut scene/action) script in this screen
				// (or several of them)
				if (ResScripts[me.gameState.currentScreen] &&
					ResScripts[me.gameState.currentScreen][action.action]) {
					// uncontrol hero
					comGameScreen.entHero.comControlledHero &&
						comGameScreen.entHero.comControlledHero.dispose();

					// clear the SKs
					entUI.comSoftKeys.setSoftKey({
						side: "left",
					});
					entUI.comSoftKeys.setSoftKey({
						side: "right"
					});

					try {
						entUI.comUI.showRecSync(); // show cut scene indicator
						comGameScreen.refreshHotspots({ show: false });
						immediateNextAction = await comGameScreen.runScriptSet(s, {
							scriptId: action.action,
							action: action
						});

						
					} finally {
						entUI.comUI.hideRecSync();
					}
				}

				var { x: heroX, y: heroY } =
					comGameScreen.entHero.scriptTools.position;
			}
		},

		async loadGameResources(s, {} = {}) {
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxLoadGFXGroup("gfxGrpGame"),
				...hlsfxLoadSFXGroup("sfxGrpGame"));
		},

		async unloadGameResources(s, {} = {}) {
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxUnloadGFXGroup("gfxGrpGame"),
				...hlsfxUnloadSFXGroup("sfxGrpGame"));
		},
	});
}