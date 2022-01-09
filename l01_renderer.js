//#include l00_app.js

// component responsible for rendering scene on the "game display" (i. e. not on
// popups or menus)
// scene is split into drawable layers, each of which contains a dynamic set of
// drawables. A drawable must support draw(comRenderer) method, supposed to do
// the canvas drawing - implementation of it is totally up to the drawable.
// Renderer only takes care of calling the draw() methods of the hosted
// drawables every render frame tick and in order corresponding to the layer
// grouping.

const renderer$drawablesSet = Symbol(); // private field name

// argObj:
// drawableLayers = array of String, layer IDs, in odrer of drawing
//  (backmost to frontmost)
function ComRenderer(ent, {
	drawableLayers = []
} = {}) {
	var layerDrawables = new Object(); // layerId -> Set
	var me;

	for (var layerId of drawableLayers) {
		layerDrawables[layerId] = new Set();
	}

	var scRenderer = ent.newScript();
	scRenderer.run(async function renderer(s) {
		for (;;) {
			var [ tickDraw ] = await s.anyOf(entApp.event("tickDraw"));
			var delta = tickDraw.delta;

			llgfxCls();
			for (var layerId of drawableLayers) {
				for (var drawable of layerDrawables[layerId]) {
					drawable.draw(me);
				}
			}

			// FPS (i. e. ms per frame) meter
			/*
			llgfx$ctx.setTransform(1, 0, 0, 1, 0, 0);
			llgfx$ctx.font = "16px Comic Sans MS";
			llgfx$ctx.fillStyle = "red";
			llgfx$ctx.fillText("" + delta, 0, 16);
			*/
		}
	});

	return (me = {
		shakeOffset: [0, 0], // for screen shake effect
		addDrawable({
			drawable,
			layerId
		} = {}) {
			if (drawable[renderer$drawablesSet]) {
				drawable[renderer$drawablesSet].delete(drawable);
			}
			var drawablesSet = layerDrawables[layerId] ||
				argError("Incorrect layer ID " + layerId);
			drawablesSet.add(drawable);
			drawable[renderer$drawablesSet] = drawablesSet;
		},
		removeDrawable(drawable) {
			if (drawable[renderer$drawablesSet]) {
				drawable[renderer$drawablesSet].delete(drawable);
			}
			delete drawable[renderer$drawablesSet];
		},
		get layerIds() {
			return drawableLayers;
		},
		dispose() {
			scRenderer.stop();
		}
	});
}


function ComDrawableVeil(ent, {
} = {}) {
	var me;

	return (me = {
		enabled: true,
		alpha: 0,
		color: "#000000",
		xOffset: 0,
		yOffset: 0,
		draw(comRenderer) {
			if (me.enabled) {
				llgfx$ctx.setTransform(1, 0, 0, 1, 0, 0);
				llgfx$ctx.fillStyle = this.color +
					((this.alpha * 255) | 1 << 8).toString(16).slice(1);
				llgfx$ctx.fillRect(0 + me.xOffset, 0 + me.yOffset, llgfx$ctx.canvas.width, llgfx$ctx.canvas.height);
			}
		}
	});
}
