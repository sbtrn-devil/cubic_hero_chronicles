// node compile_map.js
// requires: tileset.gen/graph_id_reg.json (compiled via update_editor_gfx.js)
var mapSrc = require(__dirname + '/../src/hero_chronicle_map.json'),
	graphIdReg = require(__dirname + '/../tileset.gen/graph_id_reg.json'),
	tilesetJson = require(__dirname + '/../tileset.gen/tileset.json');
//var ResSFX = require(__dirname + '/../res_sfx.js').ResSFX;
var GameConst = require(__dirname + '/../res_game_const.js').GameConst;
var ResMapTiles = require(__dirname + '/../res_maptiles.js').ResMapTiles;
var gfxGrpGame = require(__dirname + '/../res_gfx.js').ResGFX.gfxGroups
	.gfxGrpGame;

// align tileset order
tilesetJson.tiles.sort(function (a, b) { return a.id - b.id; });

const
	// of the map tiles atlas
	MAP_TILESET_WIDTH = 16,
	MAP_TILESET_HEIGHT = 16,
	// of a single tile, in pixels
	TILE_WIDTH = GameConst.MAP_CELL_WIDTH / GameConst.PIXEL_GRANULARITY,
	TILE_HEIGHT = GameConst.MAP_CELL_WIDTH / GameConst.PIXEL_GRANULARITY;


var mapFirstGid = mapSrc.tilesets[0].firstgid,
	tilesetGenFirstGid = mapSrc.tilesets[1].firstgid;

var gidToGfxId = new Object(); // gid => gfx ID (textual)
var gidImageSize = new Object(); // gid => width

// build tiles mapping
for (var resMapTileId in ResMapTiles) {
	var tileGfx = gfxGrpGame[resMapTileId];
	if (tileGfx && tileGfx[0] == 'maptile') {
		var gid = mapFirstGid + tileGfx[1].t[1] * MAP_TILESET_WIDTH
			+ tileGfx[1].t[0];
		gidToGfxId[gid] = resMapTileId;
	}
}

// build doodad mapping
var gid = tilesetGenFirstGid + 1; // "0" of the tileset is reserved
for (var i = 0; i < graphIdReg.length; i++) {
	gidToGfxId[gid + i] = graphIdReg[i];
	gidImageSize[gid + i] = {
		width: tilesetJson.tiles[i].imagewidth,
		height: tilesetJson.tiles[i].imageheight
	};
}

// find base tiles and screen locations layers;
var baseTiles, screenLocations;
for (var layer of mapSrc.layers) {
	if (layer.name == 'base_tiles') {
		// this holds base layer tiles for the whole map
		// in a "global map" manner
		baseTiles = layer;
	}

	if (layer.name == 'screen_locations') {
		// this holds positions of the map pieces corresponding
		// to each screen (and the screen names) in the "global" coordinates
		screenLocations = layer;
	}
}

if (!baseTiles) throw "base_tiles layer does not exist";
if (!screenLocations) throw "screen_locations layer does not exist";

var tiledObjectsById = {};
function fillTiledObjectsById(root, name, isObject) {
	if (typeof (root) === 'object') {
		if (isObject && root.id) {
			tiledObjectsById[root.id] = root;
		}

		for (var m in root) {
			fillTiledObjectsById(root[m], m, name == 'objects');
		}
	}
}
fillTiledObjectsById(mapSrc, false);

function compileProperty(rootObj, propName, value) {
	var curObj = rootObj, curName;
	var propNames = new Array(), propNameLeft = propName;
	while (propNameLeft.length > 0) {
		var elemMatch = propNameLeft.match(
			/^\s*(\.?([-A-Za-z0-9_]+)|\[\s*([0-9]+)\s*\])\s*/);
		if (!elemMatch) {
			console.log("Incorrect name " + propName);
			return;
		}

		if (elemMatch[2]) {
			propNames.push(elemMatch[2]);
		} else if (elemMatch[3]) {
			propNames.push(+elemMatch[3]);
		}

		propNameLeft = propNameLeft.substring(elemMatch[0].length);
	}

	if (propNames.length < 1) {
		console.log("Incorrect name " + propName);
		return;
	}

	curName = propNames.shift();
	for (var idx of propNames) {
		if (typeof (idx) === 'string') {
			curObj[curName] = curObj = curObj[curName] || new Object();
			curName = idx;
		} else {
			curObj[curName] = curObj = curObj[curName] || new Array();
			curName = idx;
		}
	}

	curObj[curName] = value;
}

function flattenProperties(obj) {
	if (typeof (obj) === 'object') {
		if ("properties" in obj) {
			var properties = new Object();
			for (var prop of obj.properties) {
				var value;
				if (prop.type == "object") {
					value = {
						tiledId: prop.value,
						id: tiledObjectsById[prop.value].name
					};
				} else {
					value = prop.value;
				}
				compileProperty(properties, prop.name, value);
			}
			delete obj.properties;
			obj.p = properties;
		} else {
			obj.p = {};
		}

		// recursively process the object members
		for (var mbr in obj) {
			if (mbr != "p") {
				flattenProperties(obj[mbr]);
			}
		}
	}
}

flattenProperties(screenLocations);

// returns obj filtered of properties that may are to be compiled separately
// (the list given as a variadic parameter)
// and resolve the object IDs
function filterProperties(obj, ...props) {
	var filteredObj = typeof (obj.length) != 'undefined' ?
		new Array() : new Object();

	// make deep copy
	for (var prop in obj) {
		if (props.indexOf(prop) != -1) {
			continue;
		}

		if (typeof (obj[prop]) == 'object') {
			if ('tiledId' in obj[prop]) {
				// an object reference
				filteredObj[prop] = obj[prop].id;
			} else {
				// a nested object
				filteredObj[prop] = filterProperties(obj[prop], ...props);
			}
		} else {
			filteredObj[prop] = obj[prop];
		}
	}

	return filteredObj;
}

var screens = new Object(); // scr ID => { xOffs, yOffs, tileXOffs, tileYOffs }

for (var loc of screenLocations.objects) {
	screens[loc.name] = {
		xOffs: loc.x,
		yOffs: loc.y,
		tileXOffs: loc.x / TILE_WIDTH,
		tileYOffs: loc.y / TILE_HEIGHT,
		baseLocDataSrc: loc
	};
}

// extract the groups named after the screens
for (var layer of mapSrc.layers) {
	if (layer.type == "group" && (layer.name in screens)) {
		screens[layer.name].mainLocDataSrc = layer;
	}
}

var ENCODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function chunkToPatch(chunkData, screenId) {
	var encCharIdx = 0,
		charMap = new Object(); // gid => char
	var result = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		objMap: new Object(), // char => object ID
		data: new Array() // of string
	};

	var charIdx = 0;

	result.x = 0;
	result.y = 0;
	result.width = chunkData.width;
	result.height = chunkData.height;

	// calculate actual rectangle (drop off the empty edges)
	var foundNonEmpty = false;
	FIND_LEFT:
	for (var x = result.x; x < chunkData.width; x++) {
		for (var y = result.y; y < chunkData.height; y++) {
			if (chunkData.data[y * chunkData.width + x] != 0) {
				foundNonEmpty = true;
				break FIND_LEFT;
			}
		}
	}

	if (foundNonEmpty) {
		result.x = x;
	}

	foundNonEmpty = false;
	FIND_RIGHT:
	for (var x = chunkData.width - 1; x >= 0; x--) {
		for (var y = result.y; y < chunkData.height; y++) {
			if (chunkData.data[y * chunkData.width + x] != 0) {
				foundNonEmpty = true;
				break FIND_RIGHT;
			}
		}
	}

	if (foundNonEmpty) {
		result.width = x - result.x + 1;
	}

	FIND_UPPER:
	for (var y = result.y; y < chunkData.height; y++) {
		for (var x = result.x; x < chunkData.width; x++) {
			if (chunkData.data[y * chunkData.width + x] != 0) {
				foundNonEmpty = true;
				break FIND_UPPER;
			}
		}
	}

	if (foundNonEmpty) {
		result.y = y;
	}

	FIND_BOTTOM:
	for (var y = chunkData.height - 1; y >= 0; y--) {
		for (var x = result.x; x < chunkData.width; x++) {
			if (chunkData.data[y * chunkData.width + x] != 0) {
				foundNonEmpty = true;
				break FIND_BOTTOM;
			}
		}
	}

	if (foundNonEmpty) {
		result.height = y - result.y + 1;
	} else {
		// getting here is only possible if the rectangle is totally empty
		result.width = result.height = 0;
	}

	// compile the rectangle with the data
	var tileGidToChar = new Object();

	for (var y = result.y; y < result.y + result.height; y++) {
		var line = "";
		for (var x = result.x; x < result.x + result.width; x++) {
			var tileGid = chunkData.data[y * chunkData.width + x];
			if (tileGid == 0 || tileGid == tilesetGenFirstGid - 1) {
				line += " ";
			} else {
				var tileChar = tileGidToChar[tileGid];
				if (typeof(tileChar) !== 'string') {
					// the tile is not yet encoded
					tileChar = ENCODE_CHARS[charIdx++];
					if (typeof(tileChar) !== 'string') {
						// out of encoding chars
						console.log("WARNING: out of encoding chars in screen " + screenId);
						tileChar = ' ';
					} else {
						result.objMap[tileChar] = gidToGfxId[tileGid];
						tileGidToChar[tileGid] = tileChar;
					}
				}
				line += tileChar;
			}
		}
		result.data.push(line);
	}

	return result;
}

function compileGetState(condStr) {
	if (condStr) {
		if (condStr.match(/[{};]/)) {
			return "({gs,tmps}) => {" + condStr + "}";
		} else {
			return "({gs,tmps}) => ((" + condStr + ")? 'on' : 'off')";
		}
	} else {
		return "({gs,tmps}) => 'on'";
	}
}

// build result
var ResMaps = {};

// fill locations and their basal tile patches
for (var screenId in screens) {
	var baseLocDataSrc = screens[screenId].baseLocDataSrc;
	var screen = (ResMaps[screenId] = {
		alias: baseLocDataSrc.p.alias,
		name: baseLocDataSrc.p.name,
		tilePatches: new Array(),
		doodads: new Array(),
		transits: new Object(),
		hotspots: new Object(),
		locations: new Object()
	});

	// find base patch of the screen
	var chunk = null;
	for (var maybeChunk of baseTiles.chunks) {
		if (maybeChunk.x == screens[screenId].tileXOffs &&
			maybeChunk.y == screens[screenId].tileYOffs) {
			chunk = maybeChunk;
			break;
		}
	}

	if (!chunk) {
		console.log("Warning: failed to find base tile patch for " + screenId);
		continue;
	}

	var compiledPatch = chunkToPatch(chunk, screenId);
	compiledPatch.getState = compileGetState("true");
	screen.tilePatches.push(compiledPatch);

	var mainLocDataSrc = screens[screenId].mainLocDataSrc;

	// extract secondary patches
	for (var layer of mainLocDataSrc.layers) {
		flattenProperties(layer);

		var nameMatch = layer.name.match(/^patch_tile_(\d+)/);
		if (nameMatch) {
			var patchIdx = +nameMatch[1];
			for (var maybeChunk of layer.chunks) {
				if (maybeChunk.x == screens[screenId].tileXOffs &&
					maybeChunk.y == screens[screenId].tileYOffs) {
					chunk = maybeChunk;
					break;
				}
			}

			if (!chunk) {
				console.log("Warning: failed to find base tile patch for " +
					screenId + "/" + layer.name);
				continue;
			}

			// compile the patch
			var compiledPatch = chunkToPatch(chunk, screenId);
			compiledPatch.getState = compileGetState(
				layer.p.condition || layer.p.getState);

			// store the patch (its index from the name matches one in array)
			screen.tilePatches[patchIdx] = compiledPatch;
		}
	}

	// extract doodads
	var anonDoodId = 0;
	for (var layer of mainLocDataSrc.layers) {
		if (!layer.name.match(/^doodads/)) {
			continue;
		}

		for (var theObject of layer.objects) {
			var gfxId = gidToGfxId[theObject.gid];
			if (gfxId === undefined) {
				console.log("Warning - unidentified gid " + theObject.gid +
					" in screen " + screenId);
				continue;
			}
			var typeId = gfxGrpGame[gfxId][2].editor,
				gfxOffset = gfxGrpGame[gfxId][2].o;
			var offsetOnScreen = [
					theObject.x - screens[screenId].xOffs + gfxOffset[0],
					theObject.y - screens[screenId].yOffs
						// tiled stores rectangle object's bottom-left coords
						- gidImageSize[theObject.gid].height
						+ gfxOffset[1]
				];
			if (typeId == "NONVISUAL") {
				// special NONVISUAL object has its type specified directly
				// and verbatim in the tiled map
				typeId = theObject.type;
			}

			var compiledDoodad = {
				typeId: typeId,
				sceneId: theObject.name ? theObject.name : "@" + ++anonDoodId,
				// doodad's coords are coords of its ref point per-pixel
				// (given 1 pixel = 2 pixels in actual game space)
				x: offsetOnScreen[0],
				y: offsetOnScreen[1],
				getState: compileGetState(theObject.p.condition || theObject.p.getState),
				props: filterProperties(theObject.p,
					"condition", "getState")
			}
			screen.doodads.push(compiledDoodad);
		}
	}

	// extract transits (1st pass)
	for (var layer of mainLocDataSrc.layers) {
		if (!layer.name.match(/^transits/)) {
			continue;
		}

		for (var theObject of layer.objects) {
			if (!theObject.p.to) {
				continue;
			}

			screen.transits[theObject.name] = {
				x: theObject.x - screens[screenId].xOffs,
				y: theObject.y - screens[screenId].yOffs,
				width: theObject.width,
				height: theObject.height,
				dir: theObject.p.dir,
				transTypeIn: theObject.p.trans_type_in,
				transTypeOut: theObject.p.trans_type_out,
				getState: compileGetState(theObject.p.condition || theObject.p.getState),
				target: theObject.p.to, // ID
				props: filterProperties(theObject.p,
					"condition",
					"getState",
					"to",
					"dir",
					"trans_type_in",
					"trans_type_out")
			};

			// cache the hosting screen ID for 2nd pass
			theObject.screenId = screenId;
			theObject.transitId = theObject.name;
		}
	}

	// extract locations (generic locations for cutscenes, events and triggers)
	for (var layer of mainLocDataSrc.layers) {
		if (!layer.name.match(/^locations/)) {
			continue;
		}

		for (var theObject of layer.objects) {
			screen.locations[theObject.name] = {
				x: theObject.x - screens[screenId].xOffs,
				y: theObject.y - screens[screenId].yOffs,
				width: theObject.width,
				height: theObject.height,
				props: filterProperties(theObject.p,
					"condition", "getState")
			};
		}
	}

	// extract hotspots (one-cell locations which can have markers and
	// associated z/x context actions)
	for (var layer of mainLocDataSrc.layers) {
		if (!layer.name.match(/^hotspots/)) {
			continue;
		}

		for (var theObject of layer.objects) {
			var x0 = theObject.x - screens[screenId].xOffs,
				y0 = theObject.y - screens[screenId].yOffs,
				x1 = x0 + 1,
				y1 = y0 + 1;

			screen.hotspots[theObject.name] = {
				xt: Math.floor(x1 / TILE_WIDTH),
				yt: Math.floor(y1 / TILE_HEIGHT),
				props: filterProperties(theObject.p,
					"condition", "getState")
			};
		}
	}
}

// 2nd pass of transits extraction
for (var screenId in screens) {
	for (var transit in ResMaps[screenId].transits) {
		transit = ResMaps[screenId].transits[transit];
		transit.target = {
			screenId: tiledObjectsById[transit.target.tiledId].screenId,
			transitId: tiledObjectsById[transit.target.tiledId].transitId
		};
	}
}

// write out the result
const fs = require('fs'),
	iconv = require('iconv-lite');
fs.writeFileSync(__dirname + "/../res_maps.gen.js",
	iconv.encode(
		"// this file is generated by compile_map.js, do not edit!\n" +
		"const ResMaps = " +
		JSON.stringify(ResMaps, null, "\t"),
		"win1251"
	)
);
//console.log(JSON.stringify(ResMaps, null, "\t"));