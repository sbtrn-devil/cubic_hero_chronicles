//#include l01_renderer.js
//#include l01_collisions.js
//#include l03_scene_parts.js

// container for game related front-end
function ComScene(ent, {
} = {}) {
	var me;

	var comRenderer = ent.newComponent(ComRenderer, {
		drawableLayers: [
			"ground", // map ground
			"static_decals", // static ground decals (carpets etc.)
			"dynamic_decals", // dynamic ground decals (splashes etc.)
			"items", // pickable items
			"beacons", // special location marks (z/x/?, arrows, etc.)
			"actors", // most entities of player level
			"high_actors", // entities above player level, but below overlays
			"overlays", // explosions etc.
			"ceiling", // ceiling level decals (bridges, etc.)
			"dark", // darkened room
			"veil", // scenic veil
			// non-game layers for intro etc.
			"0",
			"1",
			"2"
		]
	});

	var comGameFixedTicks = ent.newComponent(ComTickSource, {
	});

	var comParts = ent.newComponent(ComSceneParts, {
		comRenderer: comRenderer,
		comTickSource: comGameFixedTicks
	});

	return (me = {
		comRenderer: comRenderer,
		comParts: comParts,
		comGameFixedTicks: comGameFixedTicks,
		dispose() {
			// subcomponents actually dispose automatically

			me.entSceneEventSink.dispose();
		},
		entSceneEventSink: ent.newSubEntity(),

		// creates comSprite and comAnimator components in given entity,
		// if they don't exist already
		// return: { comSprite, comAnimator }
		getSpriteAndAnimator(ent) {
			var comSprite = ent.comSprite;
			if (!comSprite) {
				comSprite = ent.comSprite = ent.newComponent(ComDrawableSprite, {
				});
			}

			var comAnimator = ent.comAnimator;
			if (!comAnimator) {
				comAnimator = ent.comAnimator = ent.newComponent(ComDrawableSpriteAnimator, {
					comTargetSprite: comSprite,
					spriteLayers: comParts.spriteLayers,
					xcomScene: me
				});
			}

			return {
				comSprite: comSprite,
				comAnimator: comAnimator
			};
		},

		async loadOrUnloadResources(s, ...resPromises) {
			var comLoaderProgress = s.ent.newComponent(ComHlpProgress, {
				progressEventId: "resLoadingUnloading",
				// ^{ completed: m, total: n }
				doneEventId: "resLoadedUnloaded" // { total: n }
			});
			comLoaderProgress.addTasks(...resPromises);

			var ssProgressTracker = s.fork();
			ssProgressTracker.run(async function(s) {
				for (;;) {
					var [ resLoadingUnloading ] =
						await s.anyOf(s.ent.event("resLoadingUnloading"));
					entUI.comUI.setBarSync(resLoadingUnloading.completed /
						resLoadingUnloading.total);
				}
			});

			var [ resDone ] = await s.anyOf(s.ent.event("resLoadedUnloaded"));

			ssProgressTracker.dispose();
			comLoaderProgress.dispose();
		},
	});
}

// extend ScriptControl prototype with helper to wait for n game fixed ticks
ScriptControlPrototype.waitGameFixedTicks =
async function waitGameFixedTicks(ticks) {
	typeof(ticks) == 'number' || argError("ticks must be a number");
	for (var i = 0; i < ticks; i++) {
		this.checkLeave();
		await this.anyOf(entApp.comScene.comGameFixedTicks.evtTick());
	}
}

