// helpers factory for script tools

const ScriptHelpers = {
	// factory to construct playAnimation for a visible object
	// which plays a primary animation, plus optionally moves the sprite
	// between 2 given points using a movement animation, which can optionally
	// be tick-driven by an event from the primary animation (e. g. a footstep)
	// returns: awaitable wrapper around the animation, with added stop method
	playAnimationForVisibleObject(entObj) {
		return (function playAnimation({
			animationId, // the primary animation
			moveAnimationId = null, // movement animation (FROM/TO_X/Y), if any
			moveTickEvent = null, // coming from the animation animationId
			moveFrom = null,
			moveTo = null,
			parameters = {},
			atPosition = null
		} = {}) {
			// embed parameters, and the from/to parameters if provided
			var actualParameters = Object.assign({}, parameters);
			if (moveFrom) {
				actualParameters.FROM_X = moveFrom.x;
				actualParameters.FROM_Y = moveFrom.y;
			}
			if (moveTo) {
				actualParameters.TO_X = moveTo.x;
				actualParameters.TO_Y = moveTo.y;
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
			var { comSprite, comAnimator } =
				entApp.comScene.getSpriteAndAnimator(entObj);
			if (atPosition != null) {
				comSprite.x = atPosition.x;
				comSprite.y = atPosition.y;
			}
			var theAnimation = comAnimator.playAnimation({
				story: story,
				parameters: actualParameters,
				tickSource: entApp.comScene.comGameFixedTicks
			}), result = theAnimation.evtDone();

			// prepare and return the result
			result.stop = function stop() { theAnimation.dispose(); };
			return result;
		});
	},

	// sets up scriptTools for the doodad type entity
	setupDoodadScriptTools(entDoodad) {
		let scriptTools = entDoodad.scriptTools = {
			get ent() {
				// direct access to the entity
				return entDoodad;
			},
			get id() {
				return entDoodad.sceneId;
			},
			get rect() {
				return entDoodad.comSceneObject.getRect();
			},
			// {x,y}
			get position() {
				return entDoodad.comSceneObject.getPosition();
			},
			set position(pos) {
				entDoodad.comSceneObject.setPosition({
					x: pos.x,
					y: pos.y
				});
			},
			// stateId
			get state() {
				return entDoodad.comSceneObject.getState();
			},
			set state(stateId) {
				entDoodad.comSceneObject.setState(stateId);
			},
			playAnimation:
				ScriptHelpers.playAnimationForVisibleObject(
					entDoodad) // async playAnimation(s, {...})
		};
	},

	// items: array of
	// {
	//	text: string,
	//	enabled: true|false,
	//	leftText: string|undef,
	//  leftResult: ...|undef
	//  rightText: string|undef
	//  rightResult: ...|undef
	//  selected: true
	// }|"hr",
	async runMenu(s, {
		entTarget, // to use as sink for the menu events
		title,
		items,
		maxOnScreen
	}) {
		var preparedItems = new Array(items.length);
		for (var i in items) {
			var item = items[i];
			if (item && (item.leftText || item.rightText)) {
				preparedItems[i] = {
					text: item.text,
					enabled: item.enabled,
					leftText: item.leftText,
					leftEvtType: item.leftResult ? "menu$select" : null,
					leftEvtData: item.leftResult ? { data: item.leftResult }
						: null,
					entLeftEvtTarget: item.leftResult ? entTarget : null,
					rightText: item.rightText,
					rightEvtType: item.rightResult ? "menu$select" : null,
					rightEvtData: item.rightResult ? { data: item.rightResult }
						: null,
					entRightEvtTarget: item.rightResult ? entTarget : null,
					selected: item.selected
				};
			} else {
				preparedItems[i] = item;
			}
		}

		entUI.comUI.showMenuSync({
			title: title,
			items: preparedItems,
			maxOnScreen: maxOnScreen
		});
		var [ result ] = await s.anyOf(entTarget.event("menu$select"));
		entUI.comUI.hideMenuSync();
		return result.data;
	}
};