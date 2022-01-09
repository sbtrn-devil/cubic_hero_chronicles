//#include l00_ll_sfx.js
//#include l00_app.js
//#include res_sfx.js

//
// beeper support
//

var hlsfx$entBeeper = entApp.newSubEntity();
hlsfx$entBeeper.newScript().run(async function beeper(s) {
	// create oscillator
	const gainNode = llsfx$ctx.createGain();
	const oscillator = llsfx$ctx.createOscillator();
	oscillator.type = 'square';
	oscillator.start();
	oscillator.connect(gainNode);
	gainNode.connect(llsfx$masterGain);
	gainNode.gain.value = 0;

	// expect and exec beep commands
	for (;;) {
		var [ play ] = await s.anyOf(s.ent.event("beep"));
		oscillator.frequency.value = +play.frequency;
		gainNode.gain.value = +play.volume;
		await s.anyOf(s.waitAppFixedTicks(+play.ticks));
		gainNode.gain.value = 0;
	}
});

// emit a beep at the given fq
// argObj:
//  frequency: beep frequency, Hz
function hlsfxBeep({
	frequency = 400,
	volume = 0.5,
	ticks = 1
} = {}) {
	hlsfx$entBeeper.postEvent("beep", {
		frequency: frequency,
		volume: volume,
		ticks: ticks
	});
}

//
// sampled SFX support
//

// soundID -> LLSFXSound
const hlsfx$sfxSounds = new Object();
// compile SFX sounds
(function () {
	for (var soundId in ResSFX.sounds) {
		var soundSpec = ResSFX.sounds[soundId],
			audio = new Audio();
		audio.src = soundSpec.src;
		audio.loop = !!soundSpec.loop;
		audio.controls = '';
		hlsfx$sfxSounds[soundId] = LLSFXSound({
			audio: audio,
			gain: ("gain" in soundSpec)? +soundSpec.gain : 1.0
		});
	}
})();

// return LLSFXSound by resource id
function hlsfxGetSoundAudio(soundId) {
	var sfxSound = hlsfx$sfxSounds[soundId];
	return (sfxSound && sfxSound.audio) || null;
}

// "soundID" -> LLSFXPlayableSound
const hlsfx$sfxPlayableSounds = new Object();

// sfxID -> { playableSound: LLSFXPlayableSound }
const hlsfx$sfxData = new Object();

// groupID -> [...sfxIDs]
const hlsfx$sfxGroups = new Object();
// compile SFX group specs
(function () {
	for (var groupId in ResSFX.sfxGroups) {
		var sfxGroupSpec = ResSFX.sfxGroups[groupId],
			groupSfxIds = new Array();
		for (var sfxId in sfxGroupSpec) {
			var sfxSpec = sfxGroupSpec[sfxId];
			var sound = hlsfx$sfxSounds[sfxSpec[0]];
			if (!sound) {
				logError("ERROR: sound ", sfxSpec[0], " is undeclared in ResSFX");
				continue;
			}

			var playableSoundId = sfxSpec[0];
			var playableSound = hlsfx$sfxPlayableSounds[playableSoundId] ||
					(hlsfx$sfxPlayableSounds[playableSoundId] =
						LLSFXPlayableSound({
							sound: sound
						}));
			var sfx = {
				playableSound: playableSound
			};
			hlsfx$sfxData[sfxId] = sfx;
			groupSfxIds.push(sfxId);
		}

		// store the compiled group
		hlsfx$sfxGroups[groupId] = groupSfxIds;
	}
})();

function hlsfxPlaySFX({
	sfxId, // String; the SFX must be loaded by time of using this
	sfx = (sfxId || argError("sfxId or sfx must be specified")) &&
		hlsfx$sfxData[sfxId],
} = {}) {
	var playableSound;
	if (!sfx || !(playableSound = sfx.playableSound)) return;
	
	llsfxPlaySound({
		playableSound: playableSound
	});
}

function hlsfxStopSFX({
	sfxId, // String; the SFX must be loaded by time of using this
	sfx = (sfxId || argError("sfxId or sfx must be specified")) &&
		hlsfx$sfxData[sfxId]
} = {}) {
	var playableSound;
	if (!sfx || !(playableSound = sfx.playableSound)) return;
	
	llsfxStopSound({
		playableSound: playableSound
	});
}

var hlsfx$currentMusicSfx = null;
function hlsfxPlayMusic({
	sfxId, // String; the SFX must be loaded by time of using this
	sfx = (sfxId || null) &&
		hlsfx$sfxData[sfxId]
} = {}) {
	if (hlsfx$currentMusicSfx == sfx) {
		return; // already this music
	}

	if (hlsfx$currentMusicSfx != null) {
		hlsfxStopSFX({ sfx: hlsfx$currentMusicSfx });
	}

	hlsfx$currentMusicSfx = sfx;
	if (hlsfx$currentMusicSfx) {
		hlsfxPlaySFX({ sfx: hlsfx$currentMusicSfx });
	}
}

// return: array of promise-s
function hlsfxLoadSFXGroup(sfxGroupId) {
	var result = new Array();
	for (var sfxId of hlsfx$sfxGroups[sfxGroupId]) {
		result.push(hlsfx$sfxData[sfxId].playableSound.load());
	}
	return result;
}

// return: array of promise-s
function hlsfxUnloadSFXGroup(sfxGroupId) {
	var result = new Array();
	for (var sfxId of hlsfx$sfxGroups[sfxGroupId]) {
		result.push(hlsfx$sfxData[sfxId].playableSound.unload());
	}
	return result;
}
