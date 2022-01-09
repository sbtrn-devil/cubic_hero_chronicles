// sort of forward reference to ComGameScreen

// control for partizans

function ComPartizanControl(ent, {
	shooters = [], // array of { locId, dir, triggerLocId, hitLocId }
	xcomGameScreen
} = {}) {
	var me;
	var actualPath = new Array(),
		xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools,
		gameState = scriptTools.gameState;

	var currentState = "off";

	const animationByDir = {
		"up": "PartizanShootUp",
		"down": "PartizanShootDown",
		"left": "PartizanShootLeft",
		"right": "PartizanShootRight"
	};

	var entShooters = new Array(shooters.length);
	for (var i = 0; i < shooters.length; i++) {
		entShooters[i] = ent.newSubEntity();
		xcomScene.getSpriteAndAnimator(entShooters[i]);
		entShooters[i].currentAnimation = null;
		var position = scriptTools.object(shooters[i].locId).position;
		entShooters[i].comSprite.x = position.x;
		entShooters[i].comSprite.y = position.y;
		entShooters[i].animationId = animationByDir[shooters[i].dir];
		entShooters[i].entLocTrigger = scriptTools.object(
			shooters[i].triggerLocId).ent;
		entShooters[i].entLocHit = scriptTools.object(
			shooters[i].hitLocId).ent;
	}

	function animateShooter(entShooter) {
		entShooter.currentAnimation &&
			entShooter.currentAnimation.dispose();
		entShooter.currentAnimation = entShooter.comAnimator.playAnimation({
			story: entShooter.animationId,
			tickSource: xcomScene.comGameFixedTicks,
			//evtPrefix: "a.",
			atPosition: entShooter.position
		});
		return entShooter.currentAnimation;
	}


	// shooters rotation
	var nextShot = null;
	var currentState = "off";

	var scrShootersPerform = ent.newScript();
	scrShootersPerform.run(async function runShootersPerform(s) {
		for (;;) {
			s.checkLeave();
			await s.waitGameFixedTicks(1);

			if (nextShot) {
				if (--nextShot.countdown > 0) {
					continue;
				}

				var entShooter = nextShot.entShooter;
				nextShot = null;
				var animation = animateShooter(entShooter);
				await s.anyOf(animation.evtDone());
				animation.dispose();
				entShooter.comSprite.gfxId = "";
			}

			if (!nextShot && currentState != "off") {
				nextShot = {
					countdown: Math.floor(Math.random() * 100),
					entShooter:
						entShooters[Math.floor(Math.random() *
							shooters.length)]
				};
			}
		}
	});

	var scrShootersHeroTrigger = ent.newScript();
	scrShootersHeroTrigger.run(async function runShootersHeroTrigger(s) {
		for (;;) {
			//s.checkLeave();
			await s.waitGameFixedTicks(1);

			if (currentState != "off") {
				var heroPosition = scriptTools.object("hero").position;
				for (var entShooter of entShooters) {
					if (entShooter.entLocTrigger.comCollisionZone
						.containsPoint(heroPosition)) {
						// hero entered partizan's shoot trigger -
						// schedule this shooter's fire asap
						if (!nextShot || nextShot.entShooter != entShooter) {
							nextShot = {
								countdown: 0,
								entShooter: entShooter
							};
						}
					}
				}
			}
		}
	});

	var scrShootersHeroHitter = ent.newScript();
	scrShootersHeroHitter.run(async function runShootersHeroHitter(s) {
		for (;;) {
			var evtFires = new Array(shooters.length);
			for (var i = 0; i < shooters.length; i++) {
				evtFires[i] = entShooters[i].event("fire");
			}

			// wait until a shooter fires
			var evtActualFires = await s.anyOf(...evtFires);

			// check if the hero is its hitting zone
			var heroPosition = scriptTools.object("hero").position;
			for (var i = 0; i < shooters.length; i++) {
				if (evtActualFires[i]) {
					// found the shooter actually fired
					var entShooterFired = entShooters[i];
					if (entShooterFired.entLocHit.comCollisionZone
						.containsPoint(heroPosition)) {
						scriptTools.entScreenSink.postEvent("gameAction", {
							action: "ac.heroHit",
							cause: "partizan"
						});
					}
					break;
				}
			}
		}
	});

	me = {
		dispose() {
			// sub-entities are automatically disposed, so just stop
			// the animations

			for (var entShooter of entShooters) {
				entShooter.currentAnimation &&
					entShooter.currentAnimation.dispose();
			}
			scrShootersPerform.dispose();
			scrShootersHeroTrigger.dispose();
			scrShootersHeroHitter.dispose();
		},

		getState() {
			return currentState;
		},

		setState(stateId) {
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					// TODO: activate partizans
					//scrWagonMover.run(runWagonMover);
					break;

				default:
					// TODO: deactivate partizans
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
			}
		}
	};

	return me;
}