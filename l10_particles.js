//#include l04_scene.js

// particle system
function ComParticles(ent, {
	xcomScene = entApp.comScene
} = {}) {
	var me;
	const {
		MAX_PARTICLES
	} = GameConst;

	// we'll have all the particles always created
	// in a pool and rotating via ring buffer
	var entParticles = new Array(),
		ringBufferIn = new Array(),
		ringBufferOut = new Array();
	for (var i = 0; i < MAX_PARTICLES; i++) {
		var entParticle = ent.newSubEntity();
		xcomScene.getSpriteAndAnimator(entParticle);
		ringBufferIn.push(entParticle);
	}

	function getNextParticle() {
		if (ringBufferIn.length <= 0) {
			ringBufferIn = ringBufferOut.reverse();
			ringBufferOut = new Array();
		}

		var entParticle = ringBufferIn.pop();
		ringBufferOut.push(entParticle);
		return entParticle;
	}

	me = {
		dispose() {
			// sub-entities are automatically disposed
		},
		playParticle({
			animationId, // the primary animation
			moveAnimationId = null, // movement animation (FROM/TO_X/Y), if any
			moveTickEvent = null, // coming from the animation animationId
			moveFrom = null,
			moveTo = null,
			randomToOffset = null,
			parameters = {},
			atPosition = null
		}) {
			// embed parameters, and the from/to parameters if provided
			var actualParameters = Object.assign({}, parameters);
			if (moveFrom) {
				actualParameters.FROM_X = moveFrom.x;
				actualParameters.FROM_Y = moveFrom.y;
			}
			if (moveTo) {
				actualParameters.TO_X = moveTo.x;
				actualParameters.TO_Y = moveTo.y;
				if (randomToOffset) {
					actualParameters.TO_X += randomToOffset.x *
						(Math.random() * 2.0 - 1.0);
					actualParameters.TO_Y += randomToOffset.y *
						(Math.random() * 2.0 - 1.0);
				}
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
			var { comSprite, comAnimator } = getNextParticle();
			comSprite.reset();
			if (atPosition) {
				comSprite.x = atPosition.x;
				comSprite.y = atPosition.y;
			}
			comAnimator.playAnimation({
				story: story,
				parameters: actualParameters,
				tickSource: entApp.comScene.comGameFixedTicks
			});
		}
	};

	return me;
}