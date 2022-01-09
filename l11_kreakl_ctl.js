// sort of forward reference to ComGameScreen

// control for kreakliat

function ComKreaklControl(ent, {
	srcLocId,
	dstLocId,
	nKreakls = 4, // max on screen at a time
	avgRespawnPeriod,
	xcomGameScreen
} = {}) {
	var me;
	const {
		MAP_CELL_WIDTH,
		PIXEL_GRANULARITY,
		KREAKL_RADIUS,
		TURRET_RETARGET_COOLDOWN
	} = GameConst;

	var entKreakls = new Array(nKreakls),
		kreaklPool = new Array(),
		xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools,
		currentState = "off";

	for (var i = 0; i < nKreakls; i++) {
		entKreakls[i] = ent.newSubEntity();
		entKreakls[i].comCollisionZone = entKreakls[i].newComponent(
			xcomCollisionEngine.ComCollisionZone, {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				id: "@kreakl_" + i
			});
		entKreakls[i].comCollisionZone.turretNoTargetCountdown =
			TURRET_RETARGET_COOLDOWN;
		entKreakls[i].comCollisionZone.hitCause = "kreakl";
		xcomScene.getSpriteAndAnimator(entKreakls[i]);
		entKreakls[i].scrRunner = entKreakls[i].newScript();
		entKreakls[i].animation = null;
		entKreakls[i].playAnimation =
			ScriptHelpers.playAnimationForVisibleObject(entKreakls[i]);
		kreaklPool.push(entKreakls[i]);
	}

	var KREAKL_ANIMATIONS = [
		"HamsterRunLeft",
		"PenguinRunLeft"
	];

	function parkKreakl(entKreakl) {
		entKreakl.comCollisionZone.offerFlags = {};
		entKreakl.comCollisionZone.acceptFlags = {};
		entKreakl.comCollisionZone.setRect({
			x: 0, y: 0, width: 0, height: 0
		});
		entKreakl.comCollisionZone.turretNoTargetCountdown =
			TURRET_RETARGET_COOLDOWN;
		entKreakl.animation && entKreakl.animation.stop();
		entKreakl.scrRunner && entKreakl.scrRunner.stop();
		entKreakl.animation = null;
		entKreakl.comSprite.gfxId = "";
	}

	var kreaklsHit = 0;

	function launchKreakl(entKreakl) {
		parkKreakl(entKreakl);
		var stSrcLoc = scriptTools.object(srcLocId),
			stDstLoc = scriptTools.object(dstLocId);
		var srcX = stSrcLoc.position.x,
			dstX = stDstLoc.position.x;
		var srcY = stSrcLoc.rect.y + Math.floor(
				Math.random() * (stSrcLoc.rect.height - MAP_CELL_WIDTH))
				+ MAP_CELL_WIDTH * 0.5,
			dstY = stDstLoc.rect.y + Math.floor(
				Math.random() * (stDstLoc.rect.height - MAP_CELL_WIDTH))
				+ MAP_CELL_WIDTH * 0.5;
		//srcY = 149; // DEBUG

		entKreakl.animation && entKreakl.animation.stop();
		entKreakl.animation = entKreakl.playAnimation({
			animationId: KREAKL_ANIMATIONS[Math.floor(
				KREAKL_ANIMATIONS.length * Math.random())],
			moveAnimationId: "MoveAtRate",
			moveTickEvent: "step",
			moveFrom: { x: srcX, y: srcY },
			moveTo: { x: dstX, y: dstY },
			parameters: {
				RATE: Math.floor(8 + Math.random() * 4)
			}
		});
		entKreakl.comCollisionZone.turretNoTargetCountdown = false;
		entKreakl.comCollisionZone.setRect({
			x: srcX - KREAKL_RADIUS,
			y: srcY - KREAKL_RADIUS,
			width: KREAKL_RADIUS * 2,
			height: KREAKL_RADIUS * 2
		});
		entKreakl.comCollisionZone.setOfferFlags({
			hitter: true
		});
		entKreakl.comCollisionZone.setAcceptFlags({
			enemyHitter: true
		});

		entKreakl.scrRunner.run(async function runRunner(s) {
			try {
				for (;;) {
					s.checkLeave();
					var [
						animationDone,
						evtGameTick,
						evtTankHit
					] = await s.anyOf(
						entKreakl.animation,
						entApp.comScene.comGameFixedTicks.evtTick(),
						entKreakl.event("collisionEnter")
					);

					if (evtTankHit) {
						if (evtTankHit.DEBUG && evtTankHit.DEBUG.collEnter) {
							console.log("Handled by " + entKreakl.comCollisionZone.id);
						}
						// spawn squish particle
						scriptTools.playParticle({
							particleId: "squish",
							atPosition: entKreakl.comCollisionZone.center
						});
						parkKreakl(entKreakl);
						if (++kreaklsHit >= 4) {
							scriptTools.entScreenSink.postEvent("4kreaklsHit", {});
						}
						break;
					}

					if (evtGameTick) {
						// move the kreakl hitbox along the path
						entKreakl.comCollisionZone.setRect({
							x: entKreakl.comSprite.x - KREAKL_RADIUS,
							y: entKreakl.comSprite.y - KREAKL_RADIUS,
							width: KREAKL_RADIUS * 2,
							height: KREAKL_RADIUS * 2
						});
					}
					
					if (animationDone) {
						parkKreakl(entKreakl);
						break;
					}
				}
			} finally {
				kreaklPool.push(entKreakl);
			}
		});
	}
	
	var scrKreaklPerform = ent.newScript();
	scrKreaklPerform.run(async function runKreaklPerform(s) {
		for (var first = true;; first = false) {
			s.checkLeave();
			if (!first) {
				await s.waitGameFixedTicks(Math.floor(
					avgRespawnPeriod * (Math.random() * 1.5 + 0.5)));
			}

			if (currentState != "on") {
				continue;
			}

			if (kreaklPool.length > 0) {
				var entKreakl = kreaklPool.pop();
				launchKreakl(entKreakl);
			}
		}
	});

	me = {
		dispose() {
			// sub-entities are automatically disposed

			for (var i = 0; i < nKreakls; i++) {
				entKreakls[i].scrRunner.dispose();
			}
			scrKreaklPerform.dispose();
		},

		getState() {
			return currentState;
		},

		setState(stateId) {
			//"on" switches the kreakls flow on
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					// it will be handled by the subscripts
					break;

				default:
					// cancels kreakls already in motion
					kreaklPool = new Array();
					for (var i = 0; i < nKreakls; i++) {
						parkKreakl(entKreakls[i]);
						kreaklPool.push(entKreakls[i]);
					}
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