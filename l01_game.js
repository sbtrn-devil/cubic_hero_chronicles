//#include entcore.js
//#include l00_app.js

// container for very abstract game foundation
function ComGame(ent, {
} = {}) {
	var me;
	var entGameEventSink = ent.newSubEntity();

	function deepCopy(obj) {
		if (obj instanceof Array) {
			var result = new Array(obj.length);
			for (var i in obj) {
				result[i] = deepCopy(obj[i]);
			}
			return result;
		} else if (typeof (obj) == 'object') {
			var result = new Object();
			for (var i in obj) {
				result[i] = deepCopy(obj[i]);
			}
			return result;
		} else {
			return obj;
		}
	}

	return (me = {
		gameState: {},
		gameStateCheckpoint: {},

		saveCheckpoint() {
			me.gameStateCheckpoint = deepCopy(me.gameState);
		},

		restoreCheckpoint() {
			me.gameState = deepCopy(me.gameStateCheckpoint);
		},

		resetGame() {
			me.gameState = {};
			me.gameStateCheckpoint = {};
			window.localStorage.removeItem('gameState');
			window.localStorage.removeItem('gameStateCheckpoint');
		},

		saveGame() {
			window.localStorage.gameState = JSON.stringify(me.gameState);
			window.localStorage.gameStateCheckpoint = JSON.stringify(
				me.gameStateCheckpoint);
		},

		// this has to be called before running ComGameContainer.gameLoop
		loadGame() {
			try {
				me.gameState = JSON.parse(window.localStorage.getItem(
					'gameState') || '{}') || {};
				me.gameStateCheckpoint = JSON.parse(window.localStorage.getItem(
					'gameStateCheckpoint') || '{}') || {};
			} catch (e) {
				me.gameState = {};
				me.gameStateCheckpoint = {};
			}
		},
		
		get entGameEventSink() {
			return entGameEventSink
		},

		dispose() {
			entGameEventSink.dispose();
		}
	});
}
