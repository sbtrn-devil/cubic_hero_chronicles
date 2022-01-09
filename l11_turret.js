// sort of forward reference to ComGameScreen

// turret (tank, security)
function ComTurret(ent, {
	idleAnimationId,
	fireAnimationId,
	x,
	y,
	hitCause,
	xcomGameScreen
} = {}) {
	var me;
	var xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools;
	var { comSprite, comAnimator } = xcomScene.getSpriteAndAnimator(ent);
	comSprite.x = x;
	comSprite.y = y;
	const {
		TURRET_MAX_YAW_SPEED,
		TURRET_COOLDOWN,
		TURRET_FIRE_HIT_DURATION,
		TURRET_FIRE_HIT_RADIUS,
		TURRET_RETARGET_COOLDOWN
	} = GameConst;
	var currentState = "off",
		theAnimation = null,
		fireEnabled = false;
	var entHitter = ent.newSubEntity();
	entHitter.comCollisionZone = entHitter.newComponent(
		xcomCollisionEngine.ComCollisionZone, {
			id: ent.sceneId + "@firehit",
			x: 0,
			y: 0,
			width: 0,
			height: 0
		});
	entHitter.comCollisionZone.hitCause = hitCause;

	var targets = new Set(), // location ids
		closestTarget = null,
		closestTargetId = null,
		targetOn = false;

	var scrTurretTargeter = ent.newScript();
	async function runTurretTargeter(s) {
		for (;;) {
			// every frame
			s.checkLeave();
			await s.waitGameFixedTicks(1);

			// dismiss target shortcut if it is no longer valid
			if (closestTarget != null && (
				closestTarget.turretNoTargetCountdown ||
				// (case when target is hero and his entity is re-created)
				xcomCollisionEngine.getCollisionZoneById(
					closestTargetId) != closestTarget)) {
				closestTarget = null;
				closestTargetId = null;
			}

			// by "closest" we actually mean "leftmost"
			if (!closestTarget) {
				//var minDist = Number.POSITIVE_INFINITY;
				var minX = Number.POSITIVE_INFINITY;
				for (var targetLocId of targets) {
					var targetLoc = xcomCollisionEngine.getCollisionZoneById(
						targetLocId);
					if (!targetLoc || (targetLoc.turretNoTargetCountdown
						&& targetLoc.turretNoTargetCountdown-- > 0)) {
						continue;
					}
					var pos = targetLoc.center;
					if (!pos.x && !pos.y) {
						continue;
					}
					var tgtX = pos.x;
					if (tgtX < minX) {
						minX = tgtX;
						closestTarget = targetLoc;
						closestTargetId = targetLocId;
					}
				}
			}

			if (closestTarget) {
				var pos = closestTarget.center;
				var angle = Math.atan2(pos.y - y, pos.x - x) * 180.0 / Math.PI;
				if (Math.abs(comSprite.rotate - angle) <=
					GameConst.TURRET_MAX_YAW_SPEED) {
					comSprite.rotate = angle;
					targetOn = true;
				} else {
					comSprite.rotate += comSprite.rotate < angle ?
						GameConst.TURRET_MAX_YAW_SPEED :
						-GameConst.TURRET_MAX_YAW_SPEED;
					targetOn = false;
				}
			}
		}
	};

	var scrTurretFirer = ent.newScript();
	async function runTurretFirer(s) {
		for (;;) {
			// every frame
			s.checkLeave();
			theAnimation = comAnimator.playAnimation({
				story: idleAnimationId,
				parameters: {},
				tickSource: xcomScene.comGameFixedTicks
			});

			while (!fireEnabled || !closestTarget || !targetOn) {
				s.checkLeave();
				await s.waitGameFixedTicks(1);
			}
			var chosenTarget = closestTarget;

			// note: playing new primary animation automatically disposes
			// the previous one
			theAnimation = comAnimator.playAnimation({
				story: fireAnimationId,
				parameters: {},
				tickSource: xcomScene.comGameFixedTicks
			});

			// move hitter onto the target for a while to trigger the hit
			var pos = chosenTarget.center;
			entHitter.comCollisionZone.setRect({
				x: pos.x - TURRET_FIRE_HIT_RADIUS,
				y: pos.y - TURRET_FIRE_HIT_RADIUS,
				width: TURRET_FIRE_HIT_RADIUS * 2,
				height: TURRET_FIRE_HIT_RADIUS * 2
			});
			entHitter.comCollisionZone.setOfferFlags({
				hitter: true,
				enemyHitter: true
			});

			// spawn boom particle at impact point
			scriptTools.playParticle({
				particleId: "boom",
				atPosition: pos
			});

			// mark the target as already hit
			chosenTarget.turretNoTargetCountdown = TURRET_RETARGET_COOLDOWN;
			if (closestTarget == chosenTarget) {
				closestTarget = null;
			}

			await s.waitGameFixedTicks(TURRET_FIRE_HIT_DURATION);

			// after the while, move it back
			entHitter.comCollisionZone.setOfferFlags({});
			entHitter.comCollisionZone.setRect({
				x: pos.x,
				y: pos.y,
				width: 0,
				height: 0
			});

			// wait until animation plays
			await s.anyOf(theAnimation.evtDone());

			// wait for cooldown
			await s.waitGameFixedTicks(TURRET_COOLDOWN);
		}
	};

	me = {
		dispose() {
			// sub-entities are automatically disposed

			scrTurretTargeter.dispose();
			scrTurretFirer.dispose();
			theAnimation && theAnimation.dispose();
		},

		getState() {
			return currentState;
		},

		setState(stateId) {
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					//scrTractorPerform.run(runTractorPerform);
					scrTurretTargeter.run(runTurretTargeter);
					scrTurretFirer.run(runTurretFirer);
					break;

				default:
					scrTurretTargeter.stop();
					scrTurretFirer.stop();
					theAnimation && theAnimation.dispose();
					comSprite.gfxId = "";
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
				// the object is pointlike
				return { x: x, y: y, width: 0, height: 0 };
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
			addTarget(locId) {
				targets.add(locId);
			},
			deleteTarget(locId) {
				targets.delete(locId);
			},
			get fireEnabled() { return fireEnabled; },
			set fireEnabled(yes) { fireEnabled = yes; }
		}
	};

	return me;
}
