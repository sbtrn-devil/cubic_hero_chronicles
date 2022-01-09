// sort of forward reference to ComGameScreen

// control for tractor

function ComTractorControl(ent, {
	tracks = [], // array of { from: dir, to: dir, locId: loc id }
	xcomGameScreen
} = {}) {
	var me;
	var actualTracks = new Array(),
		xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools,
		gameState = scriptTools.gameState;
	const {
		TRACTOR_RADIUS,
		TRACTOR_SPEED,
		TRACTOR_MIN_DELAY,
		TRACTOR_MAX_PLUS_DELAY
	} = GameConst;

	// build list of tracks
	for (var track of tracks) {
		actualTracks.push({
			from: track.from,
			to: track.to,
			entLoc: scriptTools.object(track.locId).ent
		});
	}

	var entTractor = ent.newSubEntity();
	xcomScene.getSpriteAndAnimator(entTractor);
	entTractor.comCollisionZone = entTractor.newComponent(
		xcomCollisionEngine.ComCollisionZone, {
			id: "@tractor"
		});
	entTractor.comCollisionZone.hitCause = "tractor";
	entTractor.playAnimation = ScriptHelpers.playAnimationForVisibleObject(
		entTractor);

	const OPPOSITE_DIR = {
		"up": "down",
		"down": "up",
		"left": "right",
		"right": "left"
	};

	const ANIMATION_PER_DIR = {
		"up": "PigTractorUp",
		"down": "PigTractorDown",
		"left": "PigTractorLeft",
		"right": "PigTractorRight"
	};

	const FX_PER_DIR = {
		"up": { type: "shaker", x: 0, y: -4, duration: 15 },
		"down": { type: "shaker", x: 0, y: 4, duration: 15 },
		"left": { type: "shaker", x: -4, y: 0, duration: 15 },
		"right": { type: "shaker", x: 4, y: 0, duration: 15 },
	};

	var currentState = "off";

	var nextSpawn = null,
		exitedToDir = "",
		// a position to exclude on next track choice, to prevent tractor
		// from hitting the hero just entered the screen right away
		exclusionPos = null;

	function chooseNextSpawn() {
		var spawnPossibleTracks = new Array();
		for (var track of actualTracks) {
			if (track.from == OPPOSITE_DIR[exitedToDir]) {
				// tractor can't appear from opposite side than it exited to
				continue;
			}

			// skip if track.entLoc contains exclusion point
			if (exclusionPos && scriptTools.isInLocation({
				point: exclusionPos,
				locId: track.entLoc.sceneId
			})) {
				continue;
			}

			spawnPossibleTracks.push(track);
		}
		// reset exclusion point after the choice
		exclusionPos = null;

		// shuffle the options
		for (var i = 0; i < spawnPossibleTracks.length; i++) {
			var j = Math.floor(Math.random() * spawnPossibleTracks.length),
				t = spawnPossibleTracks[j];
			spawnPossibleTracks[j] = spawnPossibleTracks[0];
			spawnPossibleTracks[0] = t;
		}

		if (i > 0) {
			nextSpawn = {
				countdown: Math.floor(TRACTOR_MIN_DELAY +
					Math.random() * TRACTOR_MAX_PLUS_DELAY),
				track: spawnPossibleTracks[0]
			};
		}
	}

	function getPoint({ rect, side }) {
		switch (side) {
		case "up":
			return {
				x: rect.x + rect.width * 0.5,
				y: rect.y
			}
			break;

		case "down":
			return {
				x: rect.x + rect.width * 0.5,
				y: rect.y + rect.height
			}
			break;

		case "left": return {
				x: rect.x,
				y: rect.y + rect.height * 0.5
			}
			break;

		case "right": return {
				x: rect.x + rect.width,
				y: rect.y + rect.height * 0.5
			}
			break;
		}

		// for unknown direction, take center of the rect
		return {
			x: rect.x + rect.width * 0.5,
			y: rect.y + rect.height * 0.5
		};

	}

	// main tractor movement script
	var scrTractorPerform = ent.newScript();
	async function runTractorPerform(s) {
		for (;;) {
			// do every frame
			s.checkLeave();
			await s.waitGameFixedTicks(1);

			if (!nextSpawn) {
				chooseNextSpawn();
				continue;
			}

			if (--nextSpawn.countdown > 0) {
				continue;
			}

			var track = nextSpawn.track;
			nextSpawn = null;

			var trackRect = track.entLoc.comCollisionZone.rect;
			var fromPos = getPoint({ rect: trackRect, side: track.from }),
				dir = track.to != track.from ? track.to :
					OPPOSITE_DIR[track.from],
				toPos = getPoint({
					rect: trackRect,
					side: dir
				}),
				animation,
				sscrCollMover = s.fork();

			try {
				hlsfxPlaySFX({ sfxId: "tractor_honk" });

				animation = entTractor.playAnimation({
					animationId: ANIMATION_PER_DIR[dir],
					moveAnimationId: "MoveAtRate",
					moveFrom: fromPos,
					moveTo: toPos,
					parameters: {
						RATE: TRACTOR_SPEED
					}
				});

				// run collision mover to catch up with the animation
				sscrCollMover.run(async function runCollMover(s) {

					for (;;) {
						// do every frame
						s.checkLeave();
						await s.waitGameFixedTicks(1);
						entTractor.comCollisionZone.setRect({
							x: entTractor.comSprite.x - TRACTOR_RADIUS,
							y: entTractor.comSprite.y - TRACTOR_RADIUS,
							width: TRACTOR_RADIUS * 2,
							height: TRACTOR_RADIUS * 2
						});
						entTractor.comCollisionZone.setOfferFlags({
							hitter: true
						});
					}
				});
				await s.anyOf(animation);

				// this is forth-and-back track?
				if (track.to == track.from) {
					// play bump sound
					hlsfxPlaySFX({ sfxId: "tractor_bump" });

					// spawn crash particle at impact point
					scriptTools.playParticle({
						particleId: "crash",
						atPosition: toPos
					});

					// shake the screen
					var fx = FX_PER_DIR[dir];
					scriptTools.playScreenFX(fx);

					// move in reverse
					animation = entTractor.playAnimation({
						animationId: ANIMATION_PER_DIR[OPPOSITE_DIR[dir]],
						moveAnimationId: "MoveAtRate",
						moveFrom: toPos,
						moveTo: fromPos,
						parameters: {
							RATE: TRACTOR_SPEED
						}
					});
					await s.anyOf(animation);
				}

				exitedToDir = track.to;
			} finally {
				// stop the animation and collision mover
				animation && animation.stop();
				sscrCollMover && sscrCollMover.dispose();
				hlsfxStopSFX({ sfxId: "tractor" });
				scriptTools.entScreenSink.postEvent("tractorOut", {});
			}
		}
	}

	function parkTractor() {
		entTractor.comSprite.gfxId = "";
		entTractor.currentAnimation && entTractor.currentAnimation.dispose();
		entTractor.comCollisionZone.setOfferFlags({});
	}

	me = {
		dispose() {
			// sub-entities are automatically disposed

			scrTractorPerform.dispose();
		},

		getState() {
			return currentState;
		},

		setState(stateId) {
			//"on" switches the tractor on
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					scrTractorPerform.run(runTractorPerform);
					break;

				default:
					scrTractorPerform.stop();
					parkTractor();
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
			setExclusionPoint(pos) {
				exclusionPos = pos;
				nextSpawn = null; // to enforce its recalculation
			}

		}
	};

	return me;
}