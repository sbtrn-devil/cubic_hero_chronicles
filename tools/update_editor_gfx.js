// node update_editor_gfx.js
// run from project root!
var ResGFX = require(__dirname + '/../res_gfx.js').ResGFX;

const fs = require('fs');
const { NowThen } = require('crtk');
const jimp = require('jimp');

// because jimp's rotate is a fuck
function rotate(deg, image) {
    // Restore simple rotate of jimp v0.5.6
    // https://github.com/oliver-moran/jimp/issues/821

    if (deg % 90 !== 0) {
        return image;
    }

    let steps = Math.round(deg / 90) % 4;
    steps += steps < 0 ? 4 : 0;

    if (steps === 0) {
        return image;
    }

    const srcBuffer = image.bitmap.data;
    const len = srcBuffer.length;
    const dstBuffer = Buffer.allocUnsafe(len);

    let tmp;

    if (steps === 2) {
        // Upside-down
        for (let srcOffset = 0; srcOffset < len; srcOffset += 4) {
            tmp = srcBuffer.readUInt32BE(srcOffset, true);
            dstBuffer.writeUInt32BE(tmp, len - srcOffset - 4, true);
        }
    } else {
        // Clockwise or counter-clockwise rotation by 90 degree
        rotate90degrees(image.bitmap, dstBuffer, steps === 1);

        tmp = image.bitmap.width;
        image.bitmap.width = image.bitmap.height;
        image.bitmap.height = tmp;
    }

    image.bitmap.data = dstBuffer;

    return image;

    function rotate90degrees(bitmap, dstBuffer, clockwise) {
        const dstOffsetStep = clockwise ? -4 : 4;
        let dstOffset = clockwise ? dstBuffer.length - 4 : 0;

        let tmp;
        let x;
        let y;
        let srcOffset;

        for (x = 0; x < bitmap.width; x++) {
            for (y = bitmap.height - 1; y >= 0; y--) {
                srcOffset = (bitmap.width * y + x) << 2;
                tmp = bitmap.data.readUInt32BE(srcOffset, true);
                dstBuffer.writeUInt32BE(tmp, dstOffset, true);
                dstOffset += dstOffsetStep;
            }
        }
    }
};

var sheetsLoaded = {}; // sheetId -> jimp img

async function getSheet(sheetId) {
	return sheetsLoaded[sheetId] ||
		(sheetsLoaded[sheetId] = {
			image: await jimp.read(__dirname + '/../' + ResGFX.sheets[sheetId].src),
			tsize: ResGFX.sheets[sheetId].tsize
		});
}

const targetFolderName = __dirname + '/../tileset.gen';
async function main() {
	try {
		fs.mkdirSync(targetFolderName);
	} catch (e) {
		// exist ok
	}

	// restore graph id registry
	var graphIdRegistry;
	try {
		graphIdRegistry = require(targetFolderName + "/graph_id_reg.json");
	} catch (e) {
		graphIdRegistry = [];
	}
	var graphIdRegistrySet = new Set([...graphIdRegistry]);

	graphIdRegistry = {};
	var i = 0;
	for (var graphId of graphIdRegistrySet) {
		graphIdRegistry[graphId] = ++i;
	}
	//console.log(graphIdRegistrySet);
	//console.log(graphIdRegistry);
	
	function getGraphRegId(gfxId) {
		if (gfxId in graphIdRegistry) {
			return graphIdRegistry[gfxId];
		} else {
			graphIdRegistrySet.add(gfxId);
			console.log("Added ", gfxId , "=", graphIdRegistrySet.size);
			return (graphIdRegistry[gfxId] = graphIdRegistrySet.size);
		}
	}

	// this will be filled
	var outputTilesetData = {
		"columns":0,
		"grid":
		{
			"height":1,
			"orientation":"orthogonal",
			"width":1
		},
		"margin":0,
		"name":"tileset.gen",
		"spacing":0,
		"tilecount":0,
		"tiledversion":"2021.02.15",
		"tileheight":128,
		"tiles":[], // filled
		"tilewidth":64,
		"type":"tileset",
		"version":1.5
	};

	// process the gfx IDs
	for (var gfxId in ResGFX.gfxGroups.gfxGrpGame) {
		var graphic = ResGFX.gfxGroups.gfxGrpGame[gfxId],
			editor;
		if (!graphic[2] || !(editor = graphic[2].editor)) {
			continue; // no editor reflection
		}

		// extract data
		var graphRegId = getGraphRegId(gfxId);
		var graphSheet = await getSheet(graphic[0]);

		// prepare tile image
		var processedImage = graphSheet.image.clone();
		processedImage.crop(graphSheet.tsize[0]*graphic[1].t[0],
			graphSheet.tsize[1]*graphic[1].t[1],
			graphSheet.tsize[0],
			graphSheet.tsize[1]);
		processedImage.flip(
			graphic[1].s[0] < 0,
			graphic[1].s[1] < 0);
		processedImage = rotate(-graphic[1].r, processedImage);
		await processedImage.writeAsync(targetFolderName + "/" + gfxId
			+ ".png");

		// add the gfx tile data
		outputTilesetData.tiles.push({
			"id": graphRegId,
			"image": gfxId + ".png",
			"imageheight": processedImage.bitmap.height, //graphSheet.tsize[1],
			"imagewidth": processedImage.bitmap.width //graphSheet.tsize[0]
        });

        if (outputTilesetData.tileheight < graphSheet.tsize[1]) {
        	outputTilesetData.tileheight = graphSheet.tsize[1]
        }
        if (outputTilesetData.tilewidth < graphSheet.tsize[0]) {
        	outputTilesetData.tilewidth = graphSheet.tsize[0]
        }

		outputTilesetData.tilecount++;
	}

	fs.writeFileSync(targetFolderName + "/graph_id_reg.json",
		JSON.stringify([...graphIdRegistrySet], null, '\t'));
	fs.writeFileSync(targetFolderName + "/tileset.json",
		JSON.stringify(outputTilesetData, null, '\t'));
}

main();
