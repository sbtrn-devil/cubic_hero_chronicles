//#include l10_script_helpers.js

// sort of forward reference to ComGameScreen

// patrolling doodad
function ComPatroller(ent, {
	route = [], // [{from: locId, to: locId} | {at: locId, over: ticks}]
	animations = {
		// left|right|up|down|stop:
		// { animationId, moveAnimationId, moveTickEvent, secAnimationId }
	},
	velocity,
	xcomGameScreen
} = {}) {
	var me,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools;
	var actualRoute = new Array(); // points with compiled data
	var currentState = "off";
	var entSecAnimation = ent.newSubEntity();
	var secAnimationId = null;

	var {
		comSprite, comAnimator
	} = xcomScene.getSpriteAndAnimator(ent);
	var {
		comSprite: comSecSprite, comAnimator: comSecAnimator
	} = xcomScene.getSpriteAndAnimator(entSecAnimation);

	var currentAnimSpec = {
		// a very default animation spec
		animationId: "",
		moveAnimationId: null,
		moveTickEvent: null,
		secAnimationId: ""
	};
	// pick first specified animation as default initial
	for (var anim of ['left', 'right', 'up', 'down', 'stop']) {
		if (animations[anim]) {
			currentAnimSpec = animations[anim];
		}
	}

	for (var routePoint of route) {
		if (routePoint.at) {
			// standing point
			var actRoutePoint = {
				at: scriptTools.object(routePoint.at).position,
				over: routePoint.over
			};

			if (animations.stop) {
				actRoutePoint.animSpec = animations.stop;
			}

			actualRoute.push(actRoutePoint);
		} else {
			// motion
			var actRoutePoint = {
				from: scriptTools.object(routePoint.from).position,
				to: scriptTools.object(routePoint.to).position
			};

			var dir = 'left';
			if (actRoutePoint.to.x < actRoutePoint.from.x &&
				Math.abs(actRoutePoint.to.x - actRoutePoint.from.x) >
				Math.abs(actRoutePoint.to.y - actRoutePoint.from.y)) {
				dir = 'left';
			}

			if (actRoutePoint.to.x > actRoutePoint.from.x &&
				Math.abs(actRoutePoint.to.x - actRoutePoint.from.x) >
				Math.abs(actRoutePoint.to.y - actRoutePoint.from.y)) {
				dir = 'right';
			}

			if (actRoutePoint.to.y < actRoutePoint.from.y &&
				Math.abs(actRoutePoint.to.x - actRoutePoint.from.x) <
				Math.abs(actRoutePoint.to.y - actRoutePoint.from.y)) {
				dir = 'up';
			}

			if (actRoutePoint.to.y > actRoutePoint.from.y &&
				Math.abs(actRoutePoint.to.x - actRoutePoint.from.x) <
				Math.abs(actRoutePoint.to.y - actRoutePoint.from.y)) {
				dir = 'down';
			}

			if (dir in animations) {
				actRoutePoint.animSpec = animations[dir];
			}

			actualRoute.push(actRoutePoint);
		}
	}

	const playAnimation = ScriptHelpers.playAnimationForVisibleObject(ent),
		playSecAnimation = ScriptHelpers.playAnimationForVisibleObject(
			entSecAnimation);

	var scrActorPerform = ent.newScript();
	var moveAnimation = null, secAnimation = null;
	async function runActorPerform(s) {
		if (actualRoute.length <= 0) {
			return;
		}

		await s.waitGameFixedTicks(1);
		for (;;) {
			// note that last point of route should match the first one
			// if the path is assumed continuous
			for (var routePoint of actualRoute) {
				if (routePoint.animSpec) {
					currentAnimSpec = routePoint.animSpec;
				}
				if (routePoint.at) {
					// play animation with no movement
					moveAnimation = playAnimation({
						animationId: currentAnimSpec.animationId,
						atPosition: routePoint.at
					});
					if (secAnimationId != currentAnimSpec.secAnimationId) {
						secAnimation = playSecAnimation({
							animationId: currentAnimSpec.secAnimationId,
							atPosition: routePoint.at
						});
						secAnimationId = currentAnimSpec.secAnimationId;
					}

					// wait until the wait elapses
					await s.waitGameFixedTicks(routePoint.over);
				} else {
					// play animation with movement
					//console.log(routePoint.from.x + "," + routePoint.from.y +
						//"->" + routePoint.to.x + "," + routePoint.to.y);
					moveAnimation = playAnimation({
						animationId: currentAnimSpec.animationId,
						moveAnimationId: currentAnimSpec.moveAnimationId,
						moveTickEvent: currentAnimSpec.moveTickEvent,
						moveFrom: routePoint.from,
						moveTo: routePoint.to,
						parameters: {
							RATE: velocity
						}
					});

					if (secAnimationId != currentAnimSpec.secAnimationId) {
						secAnimation = playSecAnimation({
							animationId: currentAnimSpec.secAnimationId,
							atPosition: routePoint.from
						});
						secAnimationId = currentAnimSpec.secAnimationId;
					}

					// wait until movement animation finishes
					await s.anyOf(moveAnimation);
				}
			}
		}
	}

	var scrActorCatchSecAnimation = ent.newScript();
	scrActorCatchSecAnimation.run(async function runActorCatchSecAnimation(s) {
		for (;;) {
			// every 1 frame
			s.checkLeave();
			await s.waitGameFixedTicks(1);

			comSecSprite.x = comSprite.x;
			comSecSprite.y = comSprite.y;
		}
	});

	me = {
		dispose() {
			// sub-entities are automatically disposed

			scrActorCatchSecAnimation.dispose();
			scrActorPerform.dispose();
		},
		
		getState() {
			return currentState;
		},

		setState(stateId) {
			//"on" switches the patrol on, rolling back to initial point
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					secAnimationId = null;
					scrActorPerform.run(runActorPerform);
					break;

				default:
					scrActorPerform.stop();
					moveAnimation && moveAnimation.stop();
					secAnimation && secAnimation.stop();
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