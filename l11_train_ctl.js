// sort of forward reference to ComGameScreen

// control for trains

// note: "phase" is an offset, in tiles, from the train path
// each screen also has "phase offset", so that its phase are considered
// to be "phase offset...phase offset + path length" rather than
// "0...path length", so that visiting neighboring screens gave illusion
// of train correctly moving between the screens
function ComTrainControl(ent, {
	path = [], // array of loc ids
	phaseOffset,
	xcomGameScreen
} = {}) {
	var me;
	var actualPath = new Array(),
		xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools,
		gameState = scriptTools.gameState;
	const {
		N_COROVAN_WAGONS,
		COROVAN_SPEED,
		COROVAN_OFFSCREEN_PHASE_GAP_PRE,
		COROVAN_OFFSCREEN_PHASE_GAP_POST,
		COROVAN_SEG_WIDTH,
		MAP_CELL_WIDTH,
		PIXEL_GRANULARITY,
		SCREEN_WIDTH,
		SCREEN_HEIGHT
	} = GameConst;
	var currentState = "off";

	// create wagons visualizations
	var entWagons = new Array(N_COROVAN_WAGONS);
	for (var i = 0; i < N_COROVAN_WAGONS; i++) {
		entWagons[i] = ent.newSubEntity();
		xcomScene.getSpriteAndAnimator(entWagons[i]);
		entWagons[i].comCollisionZone = entWagons[i].newComponent(
			xcomCollisionEngine.ComCollisionZone, {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				id: "@wagon_" + i
			});
		entWagons[i].comCollisionZone.hitCause = "train";
		entWagons[i].animationId = "";
		entWagons[i].currentAnimation = null;
		entWagons[i].setAnimation = function setAnimation(animationId) {
			if (this.animationId != animationId) {
				this.animationId = animationId;
				if (this.currentAnimation) {
					this.currentAnimation.dispose();
					this.currentAnimation = null;
				}
				if (animationId) {
					this.comAnimator.playAnimation({
						story: animationId,
						tickSource: xcomScene.comGameFixedTicks
					});
				}
			}
		};
	}

	for (var pathPoint of path) {
		var pos = scriptTools.object(pathPoint.locId).position;
		actualPath.push({ pos: pos, phase: phaseOffset + pathPoint.phase });
	}

	var
		minPhase = actualPath[0].phase,
		minOffscreenPhase = minPhase - COROVAN_OFFSCREEN_PHASE_GAP_PRE,
		maxPhase = actualPath[actualPath.length - 1].phase,
		maxOffscreenPhase = maxPhase + COROVAN_OFFSCREEN_PHASE_GAP_POST;

	function getPointAndDirForPhase(phase) {
		var n = actualPath.length;
		// the phase is beyond the edge points?
		if (phase <= actualPath[0].phase) {
			return {
				x: actualPath[0].pos.x,
				y: actualPath[0].pos.y,
				dir: null
			};
		} else if (phase >= actualPath[n - 1].phase) {
			return {
				x: actualPath[n - 1].pos.x,
				y: actualPath[n - 1].pos.y,
				dir: null
			};
		} else {
			// the phase is on the path - interpolate
			for (var i = 0; i < n; i++) {	
				if (actualPath[i].phase <= phase &&
					actualPath[i + 1].phase >= phase) {
					break;
				}
			}

			// an unlikely case if we've not found the
			// segment
			if (i >= n) {
				return {
					x: actualPath[0].pos.x,
					y: actualPath[0].pos.y,
					dir: null
				};
			}

			var alpha = (phase - actualPath[i].phase) /
					(actualPath[i + 1].phase - actualPath[i].phase);
			return {
				x: actualPath[i].pos.x + (actualPath[i + 1].pos.x -
					actualPath[i].pos.x) * alpha,
				y: actualPath[i].pos.y + (actualPath[i + 1].pos.y -
					actualPath[i].pos.y) * alpha,
				dir: Math.abs(actualPath[i + 1].pos.x - actualPath[i].pos.x) <
					Math.abs(actualPath[i + 1].pos.y - actualPath[i].pos.y) ?
					"up" : "right"
					
			};
		}
	}

	// wagons mover and animation controller
	function setWagonPositionAndAnimation({
		entWagon,
		pos, // includes .dir
		animationId
	}) {
		entWagon.comSprite.x = pos.x;
		entWagon.comSprite.y = pos.y;
		entWagon.setAnimation(animationId);

		// set collision zone based on pos.dir
		var dim = (pos.dir == "up" || pos.dir == "down")? {
				x: WAGON_HALFWIDTH,
				y: WAGON_HALFLENGTH
			} : {
				x: WAGON_HALFLENGTH,
				y: WAGON_HALFWIDTH
			}
			entWagon.comCollisionZone.setRect({
				x: pos.x - dim.x,
				y: pos.y - dim.y,
				width: dim.x * 2,
				height: dim.y * 2
			});
			entWagon.comCollisionZone.setOfferFlags({
				hitter: !me.scriptTools.stopped
			});
	}
	
	const wagPlainAnimations = {
		"up": "TrainWagonPepsiUp",
		"right": "TrainWagonPepsiRight"
	};
	const locoPlainAnimations = {
		"up": "TrainLocoPepsiUp",
		"right": "TrainLocoPepsiRight"
	};
	const wagHlebAnimations = {
		"up": "TrainWagonHlebUp",
		"right": "TrainWagonHlebRight"
	};
	const locoHlebAnimations = {
		"up": "TrainLocoHlebUp",
		"right": "TrainLocoHlebRight"
	};
	const wagPassAnimations = {
		"up": "TrainWagonPassUp",
		"right": "TrainWagonPassRight"
	};
	const locoPassAnimations = {
		"up": "TrainLocoPassUp",
		"right": "TrainLocoPassRight"
	};

	const WAGON_HALFWIDTH = MAP_CELL_WIDTH * 0.5 - 1,
		WAGON_HALFLENGTH = MAP_CELL_WIDTH * 0.5 * COROVAN_SEG_WIDTH - 1;
	function setWagonsPhase(phase) {
		// adjust positions and animations of the wagons
		for (var i = 0; i < N_COROVAN_WAGONS; i++) {
			var pos = getPointAndDirForPhase(
				gameState.train_phase - i * COROVAN_SEG_WIDTH);
			var animationDic;
			if (i == 0) {
				switch (currentState) {
				case "hleb-on":
					animationDic = locoHlebAnimations;
					break;
				case "pass-on":
					animationDic = locoPassAnimations;
					break;
				case "on":
				default:
					animationDic = locoPlainAnimations;
					break;
				}
			} else {
				switch (currentState) {
				case "hleb-on":
					animationDic = wagHlebAnimations;
					break;
				case "pass-on":
					animationDic = wagPassAnimations;
					break;
				case "on":
				default:
					animationDic = wagPlainAnimations;
					break;
				}
			}
			setWagonPositionAndAnimation({
				entWagon: entWagons[i],
				pos: pos,
				animationId: animationDic[pos.dir] || "",
			});
		}
	}

	var trainSfx = false;
	function enableTrainSound(yes) {
		if (!yes && trainSfx) {
			trainSfx = false;
			hlsfxStopSFX({
				sfxId: "train"
			});
		}

		if (yes && !trainSfx) {
			trainSfx = true;
			hlsfxPlaySFX({
				sfxId: "train"
			});
		}
	}

	var scrWagonMover = ent.newScript();
	var isTrainOnScreen = false;
	async function runWagonMover(s) {
		var tickNo = 0;
		for (;; tickNo++) {
			// wait one frame
			s.checkLeave();
			await s.waitGameFixedTicks(1);

			// do the per frame phase shift
			if (!me.scriptTools.stopped) {
				gameState.train_phase = 
					(gameState.train_phase || 0) + COROVAN_SPEED / 60;
				if (gameState.train_phase < minOffscreenPhase ||
					gameState.train_phase > maxOffscreenPhase) {
					gameState.train_phase = minOffscreenPhase;
					xcomGameScreen.scriptTools.entScreenSink.postEvent(
						"trainIncoming", {});
				}
			}

			// adjust positions and animations of the wagons
			setWagonsPhase(gameState.train_phase);
			var isOnScreenNow = me.scriptTools.isTrainOnScreen;
			if (isOnScreenNow != isTrainOnScreen) {
				isTrainOnScreen = isOnScreenNow;
				xcomGameScreen.scriptTools.entScreenSink.postEvent(
					"train", { value: isOnScreenNow });
			}

			enableTrainSound(!me.scriptTools.stopped && isOnScreenNow);
		}
	};

	function parkWagons() {
		for (var i = 0; i < N_COROVAN_WAGONS; i++) {
			var pos = getPointAndDirForPhase(0);
			entWagons[i].comSprite.x = pos.x;
			entWagons[i].comSprite.y = pos.y;
			entWagons[i].setAnimation("");
			// park collision zones
			entWagons[i].comCollisionZone.setRect({
				x: pos.x,
				y: pos.y,
				width: 0,
				height: 0
			});
			entWagons[i].comCollisionZone.setOfferFlags({
			});
		}
	}

	var currentState = "off";

	me = {
		dispose() {
			// sub-entities are automatically disposed
			enableTrainSound(false);
		},

		getState() {
			return currentState;
		},

		setState(stateId) {
			//"on", "pass-on", "hleb-on" switches the train on
			if (currentState != stateId) {
				var prevState = currentState;
				currentState = stateId;
				switch(stateId) {
				case "on":
				case "pass-on":
				case "hleb-on":
					if (prevState == "off") {
						scrWagonMover.run(runWagonMover);
					}
					break;

				default:
					scrWagonMover.stop();
					parkWagons();
					break;
				}
			}
		},

		scriptTools: {
			get ent() {
				// direct access to the entity
				return ent;
			},
			get id() {
				return ent.sceneId;
			},
			get rect() {
				// no actual geometry for this non-visual object
				return { x: 0, y: 0, width: 0, height: 0 };
			},
			// {x,y}
			get position() {
				// no actual geometry for this non-visual object
				return { x: 0, y: 0 };
			},
			set position(pos) {
				// no actual geometry for this non-visual object
				return;
			},
			// stateId
			get state() {
				return me.getState();
			},
			set state(stateId) {
				me.setState(stateId);
			},

			get currentPhase() {
				return gameState.train_phase - minPhase;
			},
			set currentPhase(phase) {
				gameState.train_phase = phase + minPhase;
				setWagonsPhase(gameState.train_phase);
			},
			get isTrainOnScreen() {
				if (currentState == "off") return false;
				var onScreen = false;
				const HALF_WIDTH = 0.5 * MAP_CELL_WIDTH / PIXEL_GRANULARITY;
				for(var i = 0; i < N_COROVAN_WAGONS; i++) {
					var entWagon = entWagons[i];
					var pos = {
						x: entWagon.comSprite.x,
						y: entWagon.comSprite.y
					};
					if ((pos.x + HALF_WIDTH <= 0) ||
						(pos.x - HALF_WIDTH >= SCREEN_WIDTH) ||
						(pos.y + HALF_WIDTH <= 0) ||
						(pos.y - HALF_WIDTH >= SCREEN_HEIGHT)) {
						continue;
					}
					onScreen = true;
					break;
				}

				return onScreen;
			},
			stopped: false
		}
	};

	return me;
}