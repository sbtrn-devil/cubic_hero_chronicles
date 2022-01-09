//#include l00_app.js
//#include l02_drawable_sprites.js
//#include l04_scene.js

// component responsible for showing and moving hero under player's control

function ComControlledHero(ent, {
	x = 0,
	y = 0,
	xcomGameScreen
} = {}) {
	const { MAP_WIDTH, MAP_HEIGHT, MAP_CELL_WIDTH } = GameConst;

	if (ent.comControlledHero) {
		ent.comControlledHero.dispose();
	}

	var currentX = x, currentY = y,
		currentMapX = Math.floor(currentX / MAP_CELL_WIDTH),
		currentMapY = Math.floor(currentY / MAP_CELL_WIDTH);
	ent.postEvent("moveOnMap", {
		xt: currentMapX,
		yt: currentMapY
	});

	var xcomScene = entApp.comScene;
	var xcomMap = xcomScene.comParts.comDrawableMap;
	var comCollisionEngine = xcomGameScreen.comCollisionEngine;
	var scriptTools = xcomGameScreen.scriptTools;

	var me;
	var { comSprite, comAnimator } = xcomScene.getSpriteAndAnimator(ent);
	comSprite.x = currentX;
	comSprite.y = currentY;
	comSprite.addToLayer(entApp.comScene.comParts.spriteLayers["actors"]);

	// a script that is polling controls and determines direction
	// of walking and of walking animation
	var scrPollControls = ent.newScript();
	var requiredAnimationId = "HeroStand";
	var wantDirX = 0, wantDirY = 0;

	scrPollControls.run(async function runPollControls(s) {
		LOOP: for (;;) {
			await s.waitGameFixedTicks(1);

			var keysPressed = entApp.comKeyboard.getKeysPressed();
			wantDirX = wantDirY = 0;
			requiredAnimationId = "HeroStand";

			if (keysPressed.has(AppKeyCode.Z) ||
				keysPressed.has(AppKeyCode.X)) {
				// no move while an action or examine key is down
				continue;
			}

			for (var keyCode of keysPressed) {
				switch (keyCode) {
				case AppKeyCode.LEFT:
					if (!wantDirX) {
						wantDirX = -1;
						requiredAnimationId = "HeroWalkLeft";
					}
					break;
				case AppKeyCode.RIGHT:
					if (!wantDirX) {
						wantDirX = 1;
						requiredAnimationId = "HeroWalkRight";
					}
					break;
				case AppKeyCode.DOWN:
					if (!wantDirY) {
						wantDirY = 1;
						requiredAnimationId = "HeroWalkDown";
					}
					break;
				case AppKeyCode.UP:
					if (!wantDirY) {
						wantDirY = -1;
						requiredAnimationId = "HeroWalkUp";
					}
					break;
				}
			}
		}
	});

	// a script that switches the animation
	var currentAnimationId = "",
		currentAnimation = null;

	function switchAnimation() {
		if (currentAnimationId != requiredAnimationId) {
			currentAnimationId = requiredAnimationId;
			if (currentAnimation) {
				currentAnimation.dispose();
			}
			currentAnimation = comAnimator.playAnimation({
				story: currentAnimationId,
				tickSource: xcomScene.comGameFixedTicks,
				evtPrefix: "a."
			});
		}
	}
	switchAnimation();

	var comCollHitbox = ent.newComponent(
		comCollisionEngine.ComCollisionZone, {
			id: "loc_hero_hitbox",
			x: x - GameConst.HERO_HITBOX_RADIUS,
			y: y - GameConst.HERO_HITBOX_RADIUS,
			width: GameConst.HERO_HITBOX_RADIUS * 2,
			height: GameConst.HERO_HITBOX_RADIUS * 2,
			acceptFlags: {
				hitter: true
			}
		});
	var comCollPinPoint = ent.newComponent(
		comCollisionEngine.ComCollisionZone, {
			id: "loc_hero_pinpoint",
			x: x,
			y: y,
			width: 0,
			height: 0
		});

	function updateHitboxes() {
		comCollHitbox.setRect({
			x: currentX - GameConst.HERO_HITBOX_RADIUS,
			y: currentY - GameConst.HERO_HITBOX_RADIUS,
			width: GameConst.HERO_HITBOX_RADIUS,
			height: GameConst.HERO_HITBOX_RADIUS
		});

		comCollPinPoint.setRect({
			x: currentX,
			y: currentY,
			width: 0,
			height: 0
		});
	}

	var scrSwitchAnimation = ent.newScript();
	scrSwitchAnimation.run(async function runSwitchAnimation(s) {
		LOOP: for (;;) {
			await s.waitGameFixedTicks(1);
			switchAnimation();
		}
	});

	// commit hero movement to some point x,y
	function commitMove({ x, y, forceMoveOnMap = false }) {
		currentX = x;
		currentY = y;
		comSprite.x = currentX;
		comSprite.y = currentY;

		updateHitboxes();

		maybeNewMapX = Math.floor(currentX / MAP_CELL_WIDTH),
		maybeNewMapY = Math.floor(currentY / MAP_CELL_WIDTH);
		if (maybeNewMapX != currentX || maybeNewMapY != currentY ||
			forceMoveOnMap) {
			currentMapX = maybeNewMapX;
			currentMapY = maybeNewMapY;
			ent.postEvent("moveOnMap", {
				xt: currentMapX,
				yt: currentMapY
			});

			entApp.comScene.comParts.comDrawableDark.lightLocation = [currentMapX, currentMapY];
			entApp.comScene.comParts.comDrawableDark.lightRadius = GameConst.LIGHT_RADIUS;
		}
	}

	// a script that attempts the motion
	var scrMove = ent.newScript();
	scrMove.run(async function runMove(s) {
		LOOP: for (;;) {
			var [ evtStep ] = await s.anyOf(ent.event("a.step"));

			if (wantDirX || wantDirY) {
				var maybeNewX = currentX + wantDirX * GameConst.HERO_STEP_SIZE,
					maybeNewY = currentY + wantDirY * GameConst.HERO_STEP_SIZE;

				var nowMapX = Math.floor(currentX / GameConst.MAP_CELL_WIDTH),
					nowMapY = Math.floor(currentY / GameConst.MAP_CELL_WIDTH);

				var maybeNewMapX =
						Math.floor(maybeNewX / GameConst.MAP_CELL_WIDTH),
					maybeNewMapY =
						Math.floor(maybeNewY / GameConst.MAP_CELL_WIDTH);

				// advice check for location border bumps
				ent.postEvent("checkTransitBump", {
					xFrom: currentX,
					xTo: maybeNewX,
					yFrom: currentY,
					yTo: maybeNewY
				});

				// clip actual movement:
				// against map borders
				if (maybeNewMapX < 0) {
					maybeNewMapX = 0;
					maybeNewX = 0;
				}

				if (maybeNewMapY < 0) {
					maybeNewMapY = 0;
					maybeNewY = 0;
				}

				if (maybeNewMapX >= GameConst.MAP_WIDTH) {
					maybeNewMapX = GameConst.MAP_WIDTH - 1;
					maybeNewX = GameConst.MAP_WIDTH * GameConst.MAP_CELL_WIDTH
						- GameConst.PIXEL_GRANULARITY;
				}

				if (maybeNewMapY >= GameConst.MAP_HEIGHT) {
					maybeNewMapY = GameConst.MAP_HEIGHT - 1;
					maybeNewY = GameConst.MAP_HEIGHT * GameConst.MAP_CELL_WIDTH
						- GameConst.PIXEL_GRANULARITY;
				}

				// against impassable cells
				if (xcomMap.isPassable({ x: nowMapX, y: nowMapY }) &&
					!xcomMap.isPassable({ x: maybeNewMapX, y: maybeNewMapY })) {
					// we would be getting from passable into impassable cell

					// clip it
					var clippedHzMapX = maybeNewMapX,
						clippedHzX = maybeNewX,
						clippedHzMapY = maybeNewMapY,
						clippedHzY = maybeNewY,
						clippedVtMapX = maybeNewMapX,
						clippedVtX = maybeNewX,
						clippedVtMapY = maybeNewMapY,
						clippedVtY = maybeNewY;

					if (wantDirX < 0) {
						clippedHzMapX = nowMapX;
						clippedHzX = nowMapX * GameConst.MAP_CELL_WIDTH;
					}

					if (wantDirX > 0) {
						clippedHzMapX = nowMapX;
						clippedHzX = nowMapX * GameConst.MAP_CELL_WIDTH
							+ GameConst.MAP_CELL_WIDTH
							- GameConst.PIXEL_GRANULARITY;
					}

					if (wantDirY < 0) {
						clippedVtMapY = nowMapY;
						clippedVtY = nowMapY * GameConst.MAP_CELL_WIDTH;
					}

					if (wantDirY > 0) {
						clippedVtMapY = nowMapY;
						clippedVtY = nowMapY * GameConst.MAP_CELL_WIDTH
							+ GameConst.MAP_CELL_WIDTH
							- GameConst.PIXEL_GRANULARITY;
					}

					var clippedHzIsPassable =
							xcomMap.isPassable({
								x: clippedHzMapX,
								y: clippedHzMapY }) && wantDirX,
						clippedVtIsPassable =
							xcomMap.isPassable({
								x: clippedVtMapX,
								y: clippedVtMapY }) && wantDirY;
					
					if (clippedHzIsPassable &&
						(!clippedVtIsPassable ||
						Math.abs(clippedHzX - currentX) +
						Math.abs(clippedHzY - currentY) <=
						Math.abs(clippedVtX - currentX) +
						Math.abs(clippedVtY - currentY))) {
						// hz clipped path is free and shifts shorter
						// than vt clipped, or is the only free way
						maybeNewX = clippedHzX;
						maybeNewY = clippedHzY;
					} else if (clippedVtIsPassable &&
						(!clippedHzIsPassable ||
						Math.abs(clippedHzX - currentX) +
						Math.abs(clippedHzY - currentY) >
						Math.abs(clippedVtX - currentX) +
						Math.abs(clippedVtY - currentY))) {
						// vt clipped path is free and shifts shorter
						// than hz clipped, or is the only free way
						maybeNewY = clippedVtY;
						maybeNewX = clippedVtX;
					} else {
						// no way is free
						maybeNewX = clippedHzX;
						maybeNewY = clippedVtY;
					}
				}

				// the new position calculated, now actually set it
				commitMove({ x: maybeNewX, y: maybeNewY });
			}
		}
	});

	// move hero on an external decision
	var scrExtMove = ent.newScript();
	scrExtMove.run(async function runMove(s) {
		LOOP: for (;;) {
			var [ evtExtMove ] = await s.anyOf(ent.event("extMove"));

			commitMove({
				x: evtExtMove.x,
				y: evtExtMove.y,
				forceMoveOnMap: true
			});
		}
	});

	var scrHitCheck = ent.newScript();
	scrHitCheck.run(async function runMove(s) {
		LOOP: for (;;) {
			var [ evtHitterCollEnter ] = await s.anyOf(scriptTools
				.entScreenSink.event("collisionEnter"));

			if (evtHitterCollEnter && evtHitterCollEnter.z1 == comCollHitbox) {
				scriptTools.entScreenSink.postEvent("gameAction", {
					action: "ac.heroHit",
					cause: evtHitterCollEnter.z2.hitCause
				});
			}
		}
	});

	// the component as is
	me = ent.comControlledHero = {
		comCollHitbox: comCollHitbox,
		comCollPinPoint: comCollPinPoint,
		dispose() {
			scrExtMove.dispose();
			scrMove.dispose();
			scrHitCheck.dispose();
			scrPollControls.dispose();
			scrSwitchAnimation.dispose();
			if (currentAnimation) {
				currentAnimation.dispose();
			}
			comCollHitbox.dispose();
			comCollPinPoint.dispose();
			delete ent.comControlledHero;
		}
	};

	commitMove({ x: x, y: y, forceOnMap: true });
	
	return me;
}