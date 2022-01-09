//#include l01_renderer.js
//#include l01_hl_animators.js

// component responsible for drawing map ground level (tiles)

function ComDrawableMap(ent, {
	comTickSource,
	comTickSource$isValid = (comTickSource != null)
		|| argError("comTickSource must be provided")
} = {}) {
	const { MAP_WIDTH, MAP_HEIGHT, MAP_CELL_WIDTH } = GameConst;
	var me;
	var cells = new Array(MAP_WIDTH * MAP_HEIGHT).fill("map_empty"),
		tileData = new Array(MAP_WIDTH * MAP_HEIGHT).fill(null),
		tileAnimations = new Array(MAP_WIDTH * MAP_HEIGHT).fill(null),
		passability = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0),
		// obstacles from non-passable doodads - additive, as they may overlap
		obstacleCount = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);

	function disposeTileAnimation({ x, y }) {
		if (tileAnimations[y * MAP_WIDTH + x]) {
			tileAnimations[y * MAP_WIDTH + x].dispose();
			tileAnimations[y * MAP_WIDTH + x] = null;
		}
	}

	function setTileAnimation({ x, y, comAnimation }) {
		tileAnimations[y * MAP_WIDTH + x] = comAnimation;
	}

	function clearTileAnimations() {
		for (var i = 0; i < MAP_WIDTH; i++) {
			for (var j = 0; j < MAP_HEIGHT; j++) {
				disposeTileAnimation({ x: i, y: j });
			}
		}
	}

	return (me = {
		dispose() {
			me.clear();
		},

		draw(comRenderer) {
			var shakeOffset = comRenderer.shakeOffset, i = 0;
			for (var tileY = 0; tileY < MAP_HEIGHT; tileY++) {
				for (var tileX = 0; tileX < MAP_WIDTH; tileX++) {
					var gfxId = cells[i++];
					hlgfxDrawGFX({
						gfxId: gfxId,
						x: tileX * MAP_CELL_WIDTH + shakeOffset[0],
						y: tileY * MAP_CELL_WIDTH + shakeOffset[1]
					});
				}
			}
		},

		clear() {
			cells.fill("map_empty");
			tileData.fill(null);
			clearTileAnimations();
			passability.fill(0);
		},

		clearObstacles() {
			obstacleCount.fill(0);
		},

		applyTilePatch(patch) {
			var line = 0;
			for (var y = patch.y; y < patch.y + patch.height; y++) {
				var lineStr = patch.data[line++], col = 0;
				for (var x = patch.x; x < patch.x + patch.width; x++) {
					var tileCode = lineStr[col++];
					if (typeof (tileCode) === 'string' && tileCode != " ") {
						var tileId = patch.objMap[tileCode],
							tileData = ResMapTiles[tileId];
						if (tileData.attr.includes("+nopass")) {
							passability[y * MAP_WIDTH + x] |=
								GameConst.PASS_FLAG_NOPASS_STATIC;
							continue;
						}

						// is this cell application treated as passability
						// change without touching the existing tile?
						if (tileData.attr.includes("-nopass")) {
							passability[y * MAP_WIDTH + x] &=
								~GameConst.PASS_FLAG_NOPASS_STATIC;
							continue;
						}

						// apply passability
						if (tileData.attr.includes("nopass")) {
							passability[y * MAP_WIDTH + x] |=
								GameConst.PASS_FLAG_NOPASS_STATIC;
						}

						if (tileData.attr.includes("pass")) {
							passability[y * MAP_WIDTH + x] &=
								~GameConst.PASS_FLAG_NOPASS_STATIC;
						}

						// set tile image and data
						cells[y * MAP_WIDTH + x] = tileId;
						tileData[y * MAP_WIDTH + x] = ResMapTiles[tileId];

						// set animation (if available)
						disposeTileAnimation({ x: x, y: y });
						if (tileData.tileAnimId) {
							let theX = x, theY = y;
							var comAnimation = ent.newComponent(ComHLAnimation,
							{
								story: tileData.tileAnimId,
								parameters: {
									RANDOM_INITIAL_DELAY: Math.floor(
										Math.random() *
											GameConst.RANDOM_INITIAL_DELAY)
								},
								animator: function ({ varName, value, isEvent }) {
									switch (varName) {
									case "gfxId":
										// set the property of target tile ID
										cells[theY * MAP_WIDTH + theX] = value;
										tileData[theY * MAP_WIDTH + theX] = ResMapTiles[value];
									 	return;
									}
								},
								tickSource: comTickSource,
								ticksStartSkip: 200
							});
							setTileAnimation({
								x: theX,
								y: theY,
								comAnimation: comAnimation
							});
						}
					}
				}
			}
		},

		setTile({ x, y, tileGfxId }) {
			cells[y * MAP_WIDTH + x] = tileGfxId;
		},

		getTile({ x, y }) {
			return cells[y * MAP_WIDTH + x];
		},

		getTileData({ x, y }) {
			return tileData[y * MAP_WIDTH + x];
		},

		setPassability({ x, y, passable }) {
			passability[y * MAP_WIDTH + x] = passable;
		},

		getPassability({ x, y }) {
			return passability[y * MAP_WIDTH + x];
		},

		addObstacleCount({ x, y, plus }) {
			obstacleCount[y * MAP_WIDTH + x] += plus;
		},

		getObstacleCount({ x, y }) {
			return obstacleCount[y * MAP_WIDTH + x];
		},

		isPassable({ x, y }) {
			return !passability[y * MAP_WIDTH + x] &&
				obstacleCount[y * MAP_WIDTH + x] == 0;
		}
	});
}

// component responsible for rendering unlit map effect

function ComDrawableDark(ent, {
} = {}) {
	const { MAP_WIDTH, MAP_HEIGHT, MAP_CELL_WIDTH, LIGHT_RADIUS } = GameConst;
	var me;

	return (me = {
		enabled: false,
		lightLocation: [0, 0], // in cells
		lightRadius: LIGHT_RADIUS, 
		draw(comRenderer) {
			if (!me.enabled) {
				return;
			}

			var shakeOffset = comRenderer.shakeOffset;
			var lightGfxIds = [
				"mapfx_lit_0",
				"mapfx_lit_25",
				"mapfx_lit_50",
				"mapfx_lit_75",
				null
			], { lightRadius, lightLocation } = me;
			for (var tileX = 0; tileX < MAP_WIDTH; tileX++) {
				for (var tileY = 0; tileY < MAP_HEIGHT; tileY++) {
					var dist = Math.abs(tileX - lightLocation[0]) +
						Math.abs(tileY - lightLocation[1]),
						lightIdx = lightRadius - dist;
					if (lightIdx < 0) lightIdx = 0;
					if (lightIdx > 4) lightIdx = 4;
					
					var gfxId = lightGfxIds[lightIdx];
					if (gfxId) {
						hlgfxDrawGFX({
							gfxId: gfxId,
							x: tileX * MAP_CELL_WIDTH + shakeOffset[0],
							y: tileY * MAP_CELL_WIDTH + shakeOffset[1]
						});
					}
				}
			}
		},
		setTile({ x, y, tileGfxId }) {
			cells[y * MAP_WIDTH + x] = tileGfxId;
		}
	});
}