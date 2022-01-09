//#include entcore.js

// entity - App: application, root of the whole action
// listenable events: keyDown { keyCode: int }
// listenable events: keyUp { keyCode: int }
// components: comKeyboard
var entApp = new Entity();

//
// keyboard handling
//

const AppKeyCode = {
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	X: 88,
	Z: 90
};
var app$keysPressed = new Set(); // codes

// component - Keyboard, low level keyboard handling
// methods: getKeyPressed()
entApp.comKeyboard = entApp.newComponent(function (ent) {
	return ({
		// returns set of codes of currently pressed keys
		// note they are ordered in the reverse chronoligical order of their
		// press, i. e. one pressed later will come firster
		getKeysPressed() {
			return new Set([...app$keysPressed].reverse());
		}
	});
});

function app$cancelKeyPresses() {
	for (var keyCode of app$keysPressed) {
		entApp.postEvent("keyUp", { keyCode: keyCode });
	}
	app$keysPressed.clear();
}

document.addEventListener('keydown', function onKeyDown(domEvent) {
	var keyCode = domEvent.keyCode;
	if (!app$keysPressed.has(keyCode)) {
		app$keysPressed.add(keyCode);
		entApp.postEvent("keyDown", { keyCode: keyCode });
	}
}, false);

document.addEventListener('keyup', function onKeyUp(domEvent) {
	var keyCode = domEvent.keyCode;
	if (app$keysPressed.has(keyCode)) {
		app$keysPressed.delete(keyCode);
		entApp.postEvent("keyUp", { keyCode: keyCode });
		if (keyCode == 18 && window.toolbar.visible) {
			// alt pressed with toolbar visible - it means the menu will steal
			// the key-ups of keys possibly pressed, so force keys "up"
			app$cancelKeyPresses();
		}
	}
}, false);

document.addEventListener('blur', function onBlur(domEvent) {
	// if document goes off focus, force keys "up"
	app$cancelKeyPresses();
}, false);

//
// draw and fixed tick handler
// fixed tick should normally be ~60 fps
//

var app$prevDrawTickTimestamp = 0,
	app$accumulatedFixedTick = 0;

function app$onAnimationTick(timestamp) {
	window.requestAnimationFrame(app$onAnimationTick);
	if (!app$prevDrawTickTimestamp) {
		app$prevDrawTickTimestamp = timestamp;
		return;
	}

	var delta = timestamp - app$prevDrawTickTimestamp;
	app$prevDrawTickTimestamp = timestamp;
	// if slower than 20 fps then consider it 20 fps
	if (delta > 50) { delta = 50; }

	entApp.postEvent("tickDraw", { delta: delta });
	app$accumulatedFixedTick += delta;

	// post fixed ticks at 60 fps (or however much it gets)
	while (app$accumulatedFixedTick >= 16.66666667) {
		app$accumulatedFixedTick -= 16.66666667;
		entApp.postEvent("tickFixed", {});
	}
}

window.requestAnimationFrame(app$onAnimationTick);

// timer working in ticks
function ComTickSource(ent, {
} = {}) {
	var me;

	var entSource = ent.newSubEntity();

	entSource.newScript().run(async function tickGetter(s) {
		for (;;) {
			await s.anyOf(entApp.event("tickDraw"));
			if (me.enabled) {
				me.ticksElapsed++;
				entSource.postEvent("tick", {});
			}
		}
	});

	return (me = {
		enabled: true,
		ticksElapsed: 0,
		evtTick() {
			return entSource.event("tick");
		},
		async waitTicks(s, nTicks) {
			for (var i = 0; i < nTicks; i++) {
				await s.anyOf(me.evtTick());
			}
		},
		dispose() {
			entSource.dispose();
		},
	});
}

// a "global" fixed tick source in the app
entApp.comAppFixedTicks = entApp.newComponent(ComTickSource, {});

var app$dummyScript = entApp.newScript(),
	app$dummyScriptControl = app$dummyScript.run(async function(s) {});

// extend ScriptControl prototype with helper to wait for n app fixed ticks
ScriptControlPrototype.waitAppFixedTicks =
async function waitAppFixedTicks(ticks) {
	typeof(ticks) == 'number' || argError("ticks must be a number");
	for (var i = 0; i < ticks; i++) {
		this.checkLeave();
		await this.anyOf(entApp.comAppFixedTicks.evtTick());
	}
}
