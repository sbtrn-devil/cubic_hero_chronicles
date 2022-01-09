//#include l01_hl_animators.js
//#include l03_scene_parts.js

// component responsible for keeping game scene control and logic
// also wraps the scene objects into the script tools system to expose them
// to the screen scripts (see l15_specs_scripts.js)

function ComStartScreen(ent, {
	xcomRenderer = entApp.comScene.comRenderer,
	xcomScene = entApp.comScene
} = {}) {
	var me, entScreen = ent.newSubEntity();
	var comTitleSprite = ent.newComponent(ComDrawableSprite, {
	});

	async function showScreen(s) {
		comTitleSprite.x = 0;
		comTitleSprite.y = 0;
		comTitleSprite.gfxId = "start_screen";
		xcomScene.comParts.spriteLayers["0"].addSprite(comTitleSprite);

		var [ evtStop ] = await s.anyOf(entScreen.event("stopShowing"));

		comTitleSprite.remove();
	}

	var scrShowScreen = ent.newScript(),
		ssShowScreen = null;

	return (me = {
		dispose() {
			comTitleSprite.dispose();
			scrShowScreen.dispose();
			entScreen.dispose();
		},

		async startShowing(s) {
			entScreen.clearEvent("stopShowing");
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxLoadGFXGroup("gfxGrpStartScreen"));
			ssShowScreen = scrShowScreen.run(showScreen);
		},

		async stopShowing(s) {
			entScreen.raiseEvent("stopShowing", {});
			if (ssShowScreen) {
				await s.anyOf(ssShowScreen);
				ssShowScreen = null;
			}
			await xcomScene.loadOrUnloadResources(s,
				...hlgfxUnloadGFXGroup("gfxGrpStartScreen"));
		}
	});
}
