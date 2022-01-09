//#include entcore.js

// 2D context
const llgfx$ctx = appCanvas.getContext('2d'),
	llgfx$imgComplete = Symbol(); // private field id
llgfx$ctx.imageSmoothingEnabled = false; // we'll draw pixelated

// a spec for tile/sprite sheet from an image, plus the image itself
// argObj:
// img = HTMLImage
// tileWidth = tile width, in pixels
// tileHeight = tile height, in pixels
function LLGFXSheet(argObj = {}) {
	if (new.target) return LLGFXSheet(argObj);

	var {
		img,
		tileWidth,
		tileHeight
	} = argObj;

	if (!img) {
		argError("img must be a HTMLImage");
	}

	var imgComplete = Future();
	if (img.complete) {
		imgComplete.resolve();
	} else {
		img.onload = imgComplete.resolve;
	}

	return ({
		img: img,
		[llgfx$imgComplete]: imgComplete,
		tileWidth: tileWidth,
		tileHeight: tileHeight
	});
}

// a drawable bitmap extracted from a GFXSheet,
// must be loaded before drawing, and should be unloaded
// after no longer needed
// argObj:
// sheet = LLGFXSheet
// row = tile row (0-based)
// column = tile column (0-based)
function LLGFXBitmap(argObj = {}) {
	if (new.target) return LLGFXBitmap(argObj);

	var {
		sheet,
		row = 0,
		column = 0
	} = argObj;

	if (!sheet) {
		argError("sheet must be a LLGFXSheet");
	}

	var bitmapImage = null;
	return ({
		async load() {
			if (!bitmapImage) {
				await sheet[llgfx$imgComplete];
				if (!sheet.tileWidth || !sheet.tileHeight) {
					sheet.tileWidth = sheet.img.width;
					sheet.tileHeight = sheet.img.height;
				}
				bitmapImage = await createImageBitmap(
					sheet.img,
					sheet.tileWidth * column,
					sheet.tileHeight * row,
					sheet.tileWidth,
					sheet.tileHeight
				);
			}
		},
		async unload() {
			if (bitmapImage) {
				bitmapImage.close();
				bitmapImage = null;
			}
		},
		get bitmapImage() { return bitmapImage; },
		get width() { return sheet.tileWidth; },
		get height() { return sheet.tileHeight; }
	});
}

// clear screen
function llgfxCls() {
	llgfx$ctx.setTransform(1, 0, 0, 1, 0, 0);
	llgfx$ctx.clearRect(0, 0, llgfx$ctx.canvas.width, llgfx$ctx.canvas.height);
}

// draw an image with all possible options we'll need for sprites
function llgfxDrawImage({
	bitmap, // LLGFXBitmap
	sx0 = 0, // X of source top left corner in bitmap
	sy0 = 0, // Y of source top left corner in bitmap
	sx1 = bitmap.width, // X of source bottom right corner in bitmap
	sy1 = bitmap.height, // Y of source bottom right corner in bitmap
	dx0 = sx0, // X of target top left corner on screen
	dy0 = sy0, // Y of target top left corner on screen
	dx1 = dx0 + (sx1 - sx0), // X of target bottom right corner on screen
	dy1 = dy0 + (sy1 - sy0), // Y of target bottom right corner on screen
	preTransform = [1, 0, 0, 1, 0, 0], // transform to apply prior to drawing
	alpha = 1
} = {}) {
	llgfx$ctx.setTransform(...preTransform);
	var bmpi = bitmap.bitmapImage;
	if (bmpi) {
		llgfx$ctx.globalAlpha = alpha;
		llgfx$ctx.drawImage(bmpi, sx0, sy0, sx1 - sx0, sy1 - sy0,
			dx0, dy0, dx1 - dx0, dy1 - dy0);
		llgfx$ctx.globalAlpha = 1;
	}
}