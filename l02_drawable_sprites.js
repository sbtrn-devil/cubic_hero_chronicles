//#include l01_renderer.js

// component responsible for drawing and animating sprites
// and for sprite layers

const
	sprites$layerSet = Symbol(), // private field id
	sprites$preDrawAdjust = Symbol(), // private method id
	sprites$defaultAnimatorOffset = {
		x: 0,
		y: 0,
		rotate: 0,
		scale: 1,
		shiftX: 0,
		shiftY: 0,
		offsetX: 0,
		offsetY: 0,
		shutterLeft: 0,
		shutterRight: 0,
		shutterTop: 0,
		shutterBottom: 0,
		alpha: 1,
		depthOffset: 0,
		gfxId: ""
	};

// component implementing a single sprite, with possibly several sub-layers
// (they are drawn in the order and with same transforms)
// properties:
// x, y = ref point coordinates
// rotate = ccw, degrees
// shiftX, shiftY = extra image shift, hiding other side behind the border
//  (- = left/up, + = right/bottom)
// offsetX, offsetY = same, but without hiding the image
// shutterLeft, shutterTop, shutterRight, shutterBottom = hide left/right/
//  top/bottom parts of the sprite without image shifting
// alpha = 0..1
// depthOffset = added to y for drawing order sorting purposes
// animatorOffset = set of the same properties as above (x, y etc.) applied
//  to the main ones additionally/multiplicatively/replacively (based on each
//  parameter's logic), filled by animator (if available), used to apply
//  secondary animations
function ComDrawableSprite(ent, {
	x = 0,
	y = 0,
	rotate = 0,
	scale = 1,
	shiftX = 0,
	shiftY = 0,
	offsetX = 0,
	offsetY = 0,
	shutterLeft = 0,
	shutterTop = 0,
	shutterRight = 0,
	shutterBottom = 0,
	alpha = 1,
	depthOffset = 0, // added to y to order sorting
	gfxId = "", // gfxId or array of gfxIds in the drawing order
} = {}) {
	var me;

	return (me = {
		x: x,
		y: y,
		rotate: rotate,
		scale: scale,
		shiftX: shiftX,
		shiftY: shiftY,
		offsetX: offsetX,
		offsetY: offsetY,
		shutterLeft: shutterLeft,
		shutterTop: shutterTop,
		shutterRight: shutterRight,
		shutterBottom: shutterBottom,
		alpha: alpha,
		depthOffset: depthOffset,
		gfxId: gfxId,
		animatorOffset: null,
		[sprites$layerSet]: null,
		[sprites$preDrawAdjust]: null,

		// comSpriteLayer = ComDrawableSpriteLayer, see below
		addToLayer(comSpriteLayer) {
			if (!me) return;
			me.remove();
			comSpriteLayer[sprites$layerSet].add(me);
			me[sprites$layerSet] = comSpriteLayer[sprites$layerSet];
		},
		remove() {
			if (!me) return;
			if (me[sprites$layerSet]) {
				me[sprites$layerSet].delete(me);
				me[sprites$layerSet] = null;
			}
		},
		draw(comRenderer) {
			if (!me) return;
			if (me[sprites$preDrawAdjust]) {
				// perform pre-draw adjust, if specified
				me[sprites$preDrawAdjust]();
			}

			var gfxIds = typeof (me.gfxId) !== 'string' ? me.gfxId : [me.gfxId],
				shakeOffset = comRenderer.shakeOffset,
				animOffset = me.animatorOffset ||
					sprites$defaultAnimatorOffset;
			if (animOffset.gfxId) {
				gfxIds = typeof (animOffset.gfxId) !== 'string' ?
					animOffset.gfxId : [animOffset.gfxId]
			}
			for (var gfxId of gfxIds) {
				if (gfxId && gfxId != "-") {
					hlgfxDrawGFX({
						gfxId: gfxId || animOffset.gfxId,
						x: me.x + me.offsetX +
							animOffset.x + animOffset.offsetX + shakeOffset[0],
						y: me.y + me.offsetY +
							animOffset.y + animOffset.offsetY + shakeOffset[1],
						rotate: me.rotate + animOffset.rotate,
						scale: me.scale * animOffset.scale,
						shiftX: me.shiftX + animOffset.shiftX,
						shiftY: me.shiftY + animOffset.shiftY,
						shutterLeft: me.shutterLeft + animOffset.shutterLeft,
						shutterRight: me.shutterRight + animOffset.shutterRight,
						shutterTop: me.shutterTop + animOffset.shutterTop,
						shutterBottom: me.shutterBottom +
							animOffset.shutterBottom,
						alpha: me.alpha * animOffset.alpha
					});
				}
			}
		},

		// the parameters to default (except for position)
		reset() {
			//me.x = 0;
			//me.y = 0;
			me.rotate = 0;
			me.scale = 1;
			me.shiftX = 0;
			me.shiftY = 0;
			me.offsetX = 0;
			me.offsetY = 0;
			me.shutterLeft = 0;
			me.shutterTop = 0;
			me.shutterRight = 0;
			me.shutterBottom = 0;
			me.alpha = 1;
			me.depthOffset = 0;
			me.gfxId = "";
		},

		dispose() {
			if (me) {
				me.remove(); // remove from the layer
				me = null;
			}
		}
	});
}

// component implementing a layer of drawable sprites - the sprites can be
// added and removed
function ComDrawableSpriteLayer(ent, {
} = {}) {
	var me;
	var layerSet = new Set();

	return (me = {
		[sprites$layerSet]: layerSet,
		addSprite(comSprite) {
			if (!me) return;
			comSprite.addToLayer(me);
		},
		removeAllSprites() {
			for (var comSprite of layerSet) {
				layerSet.delete(comSprite);
				comSprite[sprites$layerSet] = null;
			}
		},
		draw(comRenderer) {
			var sprites = [...layerSet];
			const { PIXEL_GRANULARITY } = GameConst;
			sprites.sort((a, b) =>
				(a.y + PIXEL_GRANULARITY * (a.depthOffset +
					(a.animOffset ? a.animOffset.depthOffset : 0))) -
				(b.y + PIXEL_GRANULARITY * (b.depthOffset +
					(b.animOffset ? b.animOffset.depthOffset : 0))));
			var spritesStr = "";
			for (var comSprite of sprites) {
				comSprite.draw(comRenderer);
				spritesStr += comSprite.y + comSprite.depthOffset +
					(comSprite.animOffset ? comSprite.animOffset.depthOffset : 0) + ",";
			}
		},

		dispose() {
			me = null;
		}
	});
}

var sprites$animationProperties = [
	"x",
	"y",
	"rotate",
	"scale",
	"shiftX",
	"shiftY",
	"offsetX",
	"offsetY",
	"shutterLeft",
	"shutterTop",
	"shutterRight",
	"shutterBottom",
	"alpha",
	"depthOffset",
	"gfxId"
];
var sprites$comAnim = Symbol();

// component able to play animations on a ComDrawableSprite
// parameter names are x, y etc. There must be no more than one
// ComDrawableSpriteAnimator per ComDrawableSprite, and it is stored as
// comSprite.comAnimator - previous animator is disposed if it has been set
// handles playSfx event and setLayer property setter (comRenderer is used)
// args:
// spriteLayers = dictionary of ComDrawableSpriteLayer-s to use for setLayer
//  event for the animated sprite
// comTargetSprite = sprite to animate, sets its comRenderer property
function ComDrawableSpriteAnimator(ent, {
	spriteLayers = {},
	comTargetSprite,
	xcomScene
} = {}) {
	var me,
		activeAnimations = new Set(),
		primaryAnimation = null,
		pendingSetToLayer = null;

	if (comTargetSprite.comAnimator) {
		comTargetSprite.comAnimator.dispose();
		delete comTargetSprite.comAnimator;
	}

	function preSpriteDrawAdjust() {
		// apply primary animation, if any
		if (primaryAnimation) {
			var output = primaryAnimation.output;
			for (var prop of sprites$animationProperties) {
				if (prop in output) {
					comTargetSprite[prop] = output[prop];
				}
			}
		}

		// calculate summary animation offset for non-primary animations
		var animatorOffset = Object.assign({}, sprites$defaultAnimatorOffset);
		for (var animation of activeAnimations) {
			var output = animation.output;
			for (var varName in output) {
				switch (varName) {
				case "x":
				case "y":
				case "rotate":
				case "shiftX":
				case "shiftY":
				case "offsetX":
				case "offsetY":
				case "shutterLeft":
				case "shutterTop":
				case "shutterRight":
				case "shutterBottom":
				case "depthOffset":
					animatorOffset[varName] += output[varName];
					break;
				
				case "scale":
				case "alpha":
					animatorOffset[varName] *= output[varName];
					break;
				
				case "gfxId":
					if (output.gfxId) {
						animatorOffset.gfxId = output.gfxId;
					}
					break;
				}
			}
		}

		comTargetSprite.animatorOffset = animatorOffset;
	}

	// set adjuster
	comTargetSprite[sprites$preDrawAdjust] = preSpriteDrawAdjust;

	function playAnimation({
		primary, // true if operating on non-offset properties of the sprite
		story,
		parameters,
		tickSource,
		tickStartAlign,
		ticksStartSkip,
		evtPrefix
	}) {
		var result = { output: {} };
		var comAnim = ent.newComponent(ComHLAnimation,
		{
			story: story,
			parameters: parameters,
			animator: function ({ varName, value, isEvent }) {
				switch (varName) {
				case "x":
				case "y":
				case "rotate":
				case "scale":
				case "shiftX":
				case "shiftY":
				case "offsetX":
				case "offsetY":
				case "shutterRight":
				case "shutterLeft":
				case "shutterTop":
				case "shutterBottom":
				case "depthOffset":
				case "alpha":
				case "gfxId":
					// set the property of target animation/offset
					result.output[varName] = value;
				 	return;

				case "playSfx":
					// play SFX
					hlsfxPlaySFX({ sfxId: value });
					return;
				case "stopSfx":
					// stop SFX
					hlsfxStopSFX({ sfxId: value });
					return;
				case "setLayer":
					// move target sprite to the said layer
					comTargetSprite.remove();
					var layer = spriteLayers[value];
					if (layer) {
						comTargetSprite.addToLayer(layer);
					}
					return;
				case "particle":
					// play particle
					xcomScene.entSceneEventSink.postEvent("playParticle", {
						particleId: value,
						xcomAtSprite: comTargetSprite
					});
					return;
				}

				if (varName.startsWith("gfxId.")) {
					var idx = +varName.slice(6);
					if (typeof(result.output.gfxId) !== "object" ||
						!result.output.gfxId.length) {
						result.output.gfxId = [];
					}
					result.output.gfxId[idx] = value;
					return;
				}

				// all otherwise, if it is an event then post it to the hosting
				// entity with the event prefix
				if (isEvent) {
					ent.postEvent(evtPrefix + varName, { value: value });
				}
			},
			tickSource: tickSource,
			tickStartAlign: tickStartAlign,
			ticksStartSkip: ticksStartSkip
		});

		// create the resulting object
		var scrAutoDisposer;
		if (primary) {
			// dispose possibly existing primary animation
			if (primaryAnimation) {
				primaryAnimation.dispose();
			}

			primaryAnimation = result;
			result.dispose = function dispose() {
				if (primaryAnimation === result) {
					primaryAnimation = null;
				}
				comAnim.dispose();
				scrAutoDisposer.dispose();
			};
		} else {
			activeAnimations.add(result);
			result.dispose = function dispose() {
				activeAnimations.delete(result);
				comAnim.dispose();
				scrAutoDisposer.dispose();
			};
		}

		// automatcally dispose when animation is done
		scrAutoDisposer = ent.newScript();
		scrAutoDisposer.run(async function(s) {
			await s.anyOf(comAnim.evtDone());
			// apply the last frame (cover an edge case for 0 length primary
			// animations where the last frame is intended to persist)
			if (comTargetSprite[sprites$preDrawAdjust] === preSpriteDrawAdjust) {
				preSpriteDrawAdjust();
			}
			result.dispose();
		});

		result.evtDone = comAnim.evtDone;
		return result;
	}

	return (me = {
		// begin playing a primary animation, the sprite changes applied via
		// it will stay after the animation is finished or disposed
		// args:
		// story = story spec or compiled LLAnimation::Story
		// parameters = parameters, if story is a storyspec
		// tickSource = ComTickSource for the ticks, default = app fixed ticks
		// tickStartAlign = to which-th tick from tickSource to align the
		//  animation start
		// return:
		// animation handle with several methods:
		// dispose() = stop the animation and discard it (if the animation is
		//  non-looping it also auto-disposes on finish)
		// evtDone() = awaitable that can be used to wait the animation to
		//  finish
		playAnimation({
			story,
			parameters = {},
			tickSource = entApp.comAppFixedTicks,
			tickStartAlign = 1,
			ticksStartSkip = 0,
			evtPrefix = ""
		} = {}) {
			return playAnimation({
				primary: true,
				story: story,
				parameters: parameters,
				tickSource: tickSource,
				tickStartAlign: tickStartAlign,
				ticksStartSkip: ticksStartSkip,
				evtPrefix: evtPrefix
			});
		},
		// begin playing an extra animation, blending with other animations
		// after it is finished or is disposed the sprite changes done by it
		// are cancelled
		// args:
		//  same as playAnimation
		// return:
		//  same as playAnimation
		playExtraAnimation({
			story,
			parameters = {},
			tickSource = entApp.comAppFixedTicks,
			tickStartAlign = 1,
			ticksStartSkip = 0,
			evtPrefix = ""
		} = {}) {
			return playAnimation({
				primary: false,
				story: story,
				parameters: parameters,
				tickSource: tickSource,
				tickStartAlign: tickStartAlign,
				ticksStartSkip: ticksStartSkip,
				evtPrefix: evtPrefix
			});
		},
		// dispose the animator, the animations started via it will stop
		// and the sprite will remain with the last parameters applied to it
		// via primary animation (but not with the extra animations)
		dispose() {
			if (comTargetSprite[sprites$preDrawAdjust] === preSpriteDrawAdjust) {
				// remove pre-draw adjust from the target sprite, if it is ours
				// (but also call it first, in order to ensure our changes are
				// in effect)
				comTargetSprite[sprites$preDrawAdjust] = null;
			}

			// dispose the active animations
			for (var animation of [...activeAnimations]) {
				animation.dispose();
			}
			if (primaryAnimation) {
				primaryAnimation.dispose();
			}

			// clean up animation offset
			comTargetSprite.animatorOffset = null;
		}
	});
}