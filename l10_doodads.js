//#include l02_map.js
//#include l04_scene.js

const doodad$offState = {
	animationId: "",
	passable: true
};

// creates an immobile doodad
// desc: {
// states: {
//  stateId: {
//   animationId: x,
//   passable: true/false
//  }
// },
// width: cells,
// height: cells
// },
// x: int (real pixels)
// y: int (real pixels)
// initial state is "off" and needs no description
// (it is null animation and not passable)
function ComDoodad(ent, {
	desc,
	x,
	y
} = {}) {
	const { MAP_CELL_WIDTH } = GameConst;

	var me, curX, curY;

	var xcomScene = entApp.comScene;
	var xcomMap = xcomScene.comParts.comDrawableMap;

	var { comSprite, comAnimator } = xcomScene.getSpriteAndAnimator(ent);
	comSprite.x = curX = x;
	comSprite.y = curY = y;
	//comSprite.addToLayer(entApp.comScene.comParts.spriteLayers["actors"]);

	var curState = doodad$offState, curStateId = "off";

	// a script that switches the animation
	var currentAnimation = null;

	// update passability map data in the doodad's current position
	function updateMapPassability(plus) {
		var x1 = Math.floor(curX / MAP_CELL_WIDTH), 
			x2 = x1 + desc.width,
			y1 = Math.floor(curY / MAP_CELL_WIDTH), 
			y2 = y1 + desc.height;

		// clip the grid
		x1 = x1 < 0 ? 0 : x1;
		x2 = x2 < 0 ? 0 : x2;
		y1 = y1 < 0 ? 0 : y1;
		y2 = y2 < 0 ? 0 : y2;
		x1 = x1 > GameConst.MAP_WIDTH ? GameConst.MAP_WIDTH : x1;
		x2 = x2 > GameConst.MAP_WIDTH ? GameConst.MAP_WIDTH : x2;
		y1 = y1 > GameConst.MAP_HEIGHT ? GameConst.MAP_HEIGHT : y1;
		y2 = y2 > GameConst.MAP_HEIGHT ? GameConst.MAP_HEIGHT : y2;		

		for (var cx = x1; cx < x2; cx++) {
			for (var cy = y1; cy < y2; cy++) {
				xcomMap.addObstacleCount({
					x: cx,
					y: cy,
					plus: plus
				});
			}
		}
	}

	return (me = {
		setPosition({x, y, center = false }) {
			if (curState.passable) {
				updateMapPassability(-1);
			}
			if (center) {
				x += desc.width * MAP_CELL_WIDTH / 2;
				y += desc.height * MAP_CELL_WIDTH / 2;
			}
			curX = comSprite.x = x;
			curY = comSprite.y = y;
			if (curState.passable) {
				updateMapPassability(1);
			}
		},

		getPosition() {
			return { x: curX, y: curY };
		},

		getRect() {
			return {
				x: curX,
				y: curY,
				width: desc.width * MAP_CELL_WIDTH,
				height: desc.height * MAP_CELL_HEIGHT
			};
		},

		setState(stateId) {
			var state = desc.states[stateId] || doodad$offState;

			// did the state change at all?
			if (curState !== state) {
				// update passability
				if (curState.passable && !state.passable) {
					updateMapPassability(1);
				} else if (!curState.passable && state.passable) {
					updateMapPassability(-1);
				}

				// change animation
				curState = state;
				curStateId = stateId;
				if (currentAnimation) {
					currentAnimation.dispose();
					currentAnimation = null;
					comSprite.gfxId = "";
				}

				if (state.animationId) {
					currentAnimation = comAnimator.playAnimation({
						story: state.animationId,
						tickStartAlign: +state.animTickAlign || 1,
						tickSource: xcomScene.comGameFixedTicks,
						evtPrefix: "a.",
						ticksStartSkip: Math.random() * (state.randomAnimShiftTicks | 0)
					});
				}
			}
		},

		getState() {
			return curStateId;
		},

		dispose() {
			me.setState("off");
			if (currentAnimation) {
				currentAnimation.dispose();
			}
		}
	});
}
