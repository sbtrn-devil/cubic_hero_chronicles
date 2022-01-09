//#include l04_scene.js

// component for displaying and managing hotspots state
function ComHotspots(ent, {
	comGame
} = {}) {
	const { MAP_WIDTH, MAP_HEIGHT, MAP_CELL_WIDTH } = GameConst;
	const SYNC_TICKS = 120;

	var me;
	var xcomScene = entApp.comScene;

	var entSpritesPerCell = new Array(MAP_WIDTH * MAP_HEIGHT).fill(null),
		hotspotIds = new Array(MAP_WIDTH * MAP_HEIGHT).fill(null),
		skData = new Array(MAP_WIDTH * MAP_HEIGHT).fill(null),
		activeX = null,
		activeY = null;

	function clearSprite({ x, y }) {
		if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
			if (entSpritesPerCell[y * MAP_WIDTH + x]) {
				entSpritesPerCell[y * MAP_WIDTH + x].dispose();
				entSpritesPerCell[y * MAP_WIDTH + x] = null;
			}
		}
	}

	// set the cell over which the hero currently is
	function setActiveCell({ x, y, force = false }) {
		if (x != activeX || y != activeY || force) {
			var entCell;

			// remove active cell animation
			if (activeX !== null && activeY !== null &&
				(entCell = entSpritesPerCell[activeY * MAP_WIDTH + activeX])) {
				entCell.comAnimator.playAnimation({
					story: entCell.offFocusAnimationId,
					tickSource: xcomScene.comGameFixedTicks,
					tickStartAlign: GameConst.HOTSPOT_TICK_ALIGN
				});
			}			

			// add active animation to new active cell (if any)
			if (x !== null && x >= 0 && x < MAP_WIDTH &&
				y !== null && y >= 0 && y < MAP_HEIGHT) {
				activeX = x;
				activeY = y;
				if ((entCell = entSpritesPerCell[activeY * MAP_WIDTH + activeX])) {
					entCell.comAnimator.playAnimation({
						story: "MapFXHotSpotBlankFocus",
						tickSource: xcomScene.comGameFixedTicks
					});
				}

				entUI.comSoftKeys.setSoftKey({
					side: "left",
					text: (entCell && entCell.leftSK && entCell.leftSK.text)
						|| (entCell ? "" : UIText.SK_INVENTORY),
					entEvtTarget: ent,
					evtType: (entCell && entCell.leftSK && entCell.leftSK.action)
						|| (entCell ? null : "gameAction"),
					evtData: (entCell && entCell.leftSK && entCell.leftSK.args)
						|| (entCell ? null : {
								action: "openInventory",
								forUse: false,
								hotspotId: null
							}),
				});

				entUI.comSoftKeys.setSoftKey({
					side: "right",
					text: (entCell && entCell.rightSK && entCell.rightSK.text)
						|| "",
					entEvtTarget: ent,
					evtType: entCell && entCell.rightSK && entCell.rightSK.action,
					evtData: entCell && entCell.rightSK && entCell.rightSK.args
				});
			} else {
				activeX = null;
				activeY = null;
				entUI.comSoftKeys.setSoftKey({
					side: "left",
					text: "",
					entEvtTarget: ent,
					evtType: null,
					evtData: null
				});
				entUI.comSoftKeys.setSoftKey({
					side: "right",
					text: "",
					entEvtTarget: ent,
					evtType: null,
					evtData: null
				});
			}
		}
	}

	function setHotspot({
		x,
		y,
		animationId = null,
		leftSK = {
			text: UIText.SK_INVENTORY,
			action: "gameAction",
			args: {
				action: "openInventory",
				forUse: false,
				hotspotId: null
			}
		},
		rightSK = null,
		hotspotId = null
	} = {}) {
		if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
			if (animationId == null) {
				clearSprite({ x, y });
			} else {
				var entCell;
				if (!(entCell = entSpritesPerCell[y * MAP_WIDTH + x])) {
					entCell = entSpritesPerCell[y * MAP_WIDTH + x]
						= ent.newSubEntity();
					xcomScene.getSpriteAndAnimator(entCell);
					entCell.comSprite.x = x * MAP_CELL_WIDTH
						+ (MAP_CELL_WIDTH >> 1);
					entCell.comSprite.y = y * MAP_CELL_WIDTH
						+ (MAP_CELL_WIDTH >> 1);
					entCell.leftSK = leftSK;
					entCell.rightSK = rightSK;
					entCell.offFocusAnimationId = animationId;

					entCell.comAnimator.playAnimation({
						story: animationId,
						tickSource: xcomScene.comGameFixedTicks,
						tickStartAlign: GameConst.HOTSPOT_TICK_ALIGN,
						evtPrefix: "a."
					});
				}

				entCell.hotspotId = hotspotId;

				if (activeX == x && activeY == y) {
					activeX = null;
					activeY = null;
					setActiveCell({ x: x, y: y });
				}
			}

			hotspotIds[y * MAP_WIDTH + x] = hotspotId;
		} else {
			console.log("Bad hotspot coords", x, y);
		}
	}

	return (me = {
		clear() {
			for (var x = 0; x < MAP_WIDTH; x++) {
				for (var y = 0; y < MAP_HEIGHT; y++) {
					setHotspot({ x: x, y: y }); // all other are nulls
				}
			}
		},
		setHotspot(args) { return setHotspot(args); },
		isHotspotBlank({ x, y }) {
			if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
				return hotspotIds[y * MAP_WIDTH + x] == null;
			} else {
				return true;
			}
		},
		getHotspotId({ x, y }) {
			if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
				return hotspotIds[y * MAP_WIDTH + x];
			}
		},
		setActiveCell(args) { return setActiveCell(args); },

		dispose() {
			me.clear();
		}
	});
}