//#include l00_ll_gfx.js
//#include res_gfx.js
//^- declares ResGFX (the GFX resource specs)

// sheetID -> LLGFXSheet
const hlgfx$gfxSheets = new Object();
// compile GFX sheets
(function () {
	for (var sheetId in ResGFX.sheets) {
		var sheetSpec = ResGFX.sheets[sheetId],
			img = new Image();
		img.src = sheetSpec.src;
		hlgfx$gfxSheets[sheetId] = LLGFXSheet({
			img: img,
			tileWidth: sheetSpec.tsize && sheetSpec.tsize[0],
			tileHeight: sheetSpec.tsize && sheetSpec.tsize[1]
		});
	}
})();

// return LLGFXSheet by resource id
function hlgfxGetSheetImg(sheetId) {
	var gfxSheet = hlgfx$gfxSheets[sheetId];
	return (gfxSheet && gfxSheet.img) || null;
}

// "sheetID:tilex,tiley" -> LLGFXBitmap
const hlgfx$gfxBitmaps = new Object();

// gfxID -> { bitmap: LLGFXBitmap, preTransform: [a,b,c,d,e,f] }
const hlgfx$gfxData = new Object();

// groupID -> [...gfxIDs]
const hlgfx$gfxGroups = new Object();
// compile GFX group specs
(function () {
	for (var groupId in ResGFX.gfxGroups) {
		var gfxGroupSpec = ResGFX.gfxGroups[groupId],
			groupGfxIds = new Array();
		for (var gfxId in gfxGroupSpec) {
			var gfxSpec = gfxGroupSpec[gfxId];
			var sheet = hlgfx$gfxSheets[gfxSpec[0]];
			if (!sheet) {
				logError("ERROR: GFX sheet ", gfxSpec[0], " is undeclared in ResGFX");
				continue;
			}

			var tileX = +gfxSpec[1].t[0],
				tileY = +gfxSpec[1].t[1],
				bitmapId = gfxSpec[0] + ":" + tileX + "," + tileY,
				bitmap = hlgfx$gfxBitmaps[bitmapId] ||
					(hlgfx$gfxBitmaps[bitmapId] = LLGFXBitmap({
						sheet: sheet,
						column: tileX,
						row: tileY
					})),
				cx = -gfxSpec[1].c[0], // center offset X, from tile TL corner
				cy = -gfxSpec[1].c[1], // center offset Y, from tile TL corner
				Sx = +gfxSpec[1].s[0], // scale X, rel to the offseted center
				Sy = +gfxSpec[1].s[1], // scale Y, rel to the offseted center
				// rotation, too, is rel to the offseted center
				rotateRad = +gfxSpec[1].r / 180.0 * Math.PI,
				cosF = Math.cos(rotateRad),
				sinF = Math.sin(rotateRad);

			// preTransform matrix, as per ctx2d setTransform(a,b,c,d,e,f)
			// Sx*cosF, Sx*sinF, -Sy*sinF, Sy*cosF, -cy*Sy*sinF+cx*Sx*cosF + 128, cx*Sx*sinF+cy*Sy*cosF + 128
			var preTransform = [
				Sx * cosF, // a
				Sx * sinF, // b
				-Sy * sinF, // c
				Sy * cosF, // d
				-cy * Sy * sinF + cx * Sx * cosF, // e
				cx * Sx * sinF + cy * Sy * cosF // f
			];

			var gfx = {
				bitmap: bitmap,
				preTransform: preTransform
			};
			hlgfx$gfxData[gfxId] = gfx;
			groupGfxIds.push(gfxId);
		}

		// store the compiled group
		hlgfx$gfxGroups[groupId] = groupGfxIds;
	}
})();

// draw graphics
const hlgfx$rotFactor = Math.PI / -180.0;
function hlgfxDrawGFX({
	gfxId, // String; the GFX must be loaded by time of using this
	gfx = (gfxId || argError("gfxId or gfx must be specified")) &&
		hlgfx$gfxData[gfxId],
	x, // int, center X
	y, // int, center Y
	rotate = 0, // extra rotation around center (cw degree)
	scale = 1, // extra scale around center
	// shift is the image drawn as if it has been shifted on source bitmap
	shiftX = 0, // extra source X shift (- = leftwards, + = rightwards)
	shiftY = 0, // extra source Y shift (- = topwards, + = downwards)
	// shutter is clipping out left/top/right/bottom parts of the destination
	// image (unlike with shift, the actual unclipped pixels remain on the same
	// positions as they would've been drawn without shutter)
	shutterLeft = 0,
	shutterTop = 0,
	shutterRight = 0,
	shutterBottom = 0,
	alpha = 1
} = {}) {
	var bmp;
	if (!gfx || !(bmp = gfx.bitmap) || !bmp.bitmapImage) return;

	x = +x;
	y = +y;

	if (isNaN(x) || isNaN(y)) {
		return;
	}

	rotate = +rotate;
	scale = +scale;
	shiftX = +shiftX;
	shiftY = +shiftY;
	shutterLeft = +shutterLeft;
	shutterRight = +shutterRight;
	shutterTop = +shutterTop;
	shutterBottom = +shutterBottom;

	var [ptA, ptB, ptC, ptD, ptE, ptF] = gfx.preTransform,
		F = rotate * hlgfx$rotFactor,
		cosF = Math.cos(F),
		sinF = Math.sin(F),
		bmpWidth = bmp.width,
		bmpHeight = bmp.height;

	var transform = [
			scale * (ptB * sinF + ptA * cosF),
			scale * (ptB * cosF - ptA * sinF),
			scale * (ptD * sinF + ptC * cosF),
			scale * (ptD * cosF - ptC * sinF),
			scale * (ptF * sinF + ptE * cosF) + x,
			scale * (ptF * cosF - ptE * sinF) + y
		];

	var sx0 = 0 - shiftX + shutterLeft,
		sy0 = 0 - shiftY + shutterTop,
		sx1 = bmpWidth - shiftX - shutterRight,
		sy1 = bmpHeight - shiftY - shutterBottom,
		dx0 = 0 + shutterLeft,
		dy0 = 0 + shutterTop,
		dx1 = bmpWidth - shutterRight,
		dy1 = bmpHeight - shutterBottom;
	
	llgfxDrawImage({
		bitmap: bmp,
		preTransform: transform,
		sx0: sx0,
		sy0: sy0,
		sx1: sx1,
		sy1: sy1,
		dx0: dx0,
		dy0: dy0,
		dx1: dx1,
		dy1: dy1,
		alpha: alpha
	});
}

// return: array of promise-s
function hlgfxLoadGFXGroup(gfxGroupId) {
	var result = new Array();
	for (var gfxId of hlgfx$gfxGroups[gfxGroupId]) {
		result.push(hlgfx$gfxData[gfxId].bitmap.load());
	}
	return result;
}

// return: array of promise-s
function hlgfxUnloadGFXGroup(gfxGroupId) {
	var result = new Array();
	for (var gfxId of hlgfx$gfxGroups[gfxGroupId]) {
		result.push(hlgfx$gfxData[gfxId].bitmap.unload());
	}
	return result;
}
