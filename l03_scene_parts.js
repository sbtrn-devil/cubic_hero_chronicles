//#include l01_renderer.js
//#include l02_map.js
//#include l02_drawable_sprites.js

// component responsible for keeping together the game scene front-end
// can be disposed and re-created, while keeping the scene stratum intact

function ComSceneParts(ent, {
	comRenderer,
	comTickSource
} = {}) {
	var me;

	var comDrawableMap = ent.newComponent(ComDrawableMap, {
		comTickSource: comTickSource
	});
	comRenderer.addDrawable({
		drawable: comDrawableMap,
		layerId: "ground"
	});

	var comDrawableDark = ent.newComponent(ComDrawableDark, {
	});
	comRenderer.addDrawable({
		drawable: comDrawableDark,
		layerId: "dark"
	});

	comVeil = ent.newComponent(ComDrawableVeil, {});
	comRenderer.addDrawable({
		drawable: comVeil,
		layerId: "veil"
	});

	var spriteLayers = new Object(); // layerId -> ComDrawableSpriteLayer
	// add one sprite layer per each renderer layer
	for (var layerId of comRenderer.layerIds) {
		spriteLayers[layerId] = ent.newComponent(ComDrawableSpriteLayer, {
		});
		comRenderer.addDrawable({
			drawable: spriteLayers[layerId],
			layerId: layerId
		});
	}

	return (me = {
		comDrawableMap: comDrawableMap,
		comDrawableDark: comDrawableDark,
		comVeil: comVeil,
		get spriteLayers() {
			return spriteLayers;
		},
		dispose() {
			if (me) {
				for (var layerId in spriteLayers) {
					comRenderer.removeDrawable(spriteLayers[layerId]);
					spriteLayers[layerId].dispose();
				}
				comDrawableVeil.dispose();
				comDrawableDark.dispose();
				comDrawableMap.dispose();
				me = null;
			}
		}
	});
}
