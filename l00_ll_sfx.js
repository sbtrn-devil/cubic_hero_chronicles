//#include entcore.js

const llsfx$ctx = new (window.AudioContext || window.webkitAudioContext)(),
	llsfx$masterGain = llsfx$ctx.createGain(),
	llsfx$audioComplete = Symbol(); // private field id
llsfx$masterGain.connect(llsfx$ctx.destination);
llsfx$masterGain.gain.value = 0.05; // default volume

// a spec for primary sfx source, plus the audio itself
// argObj:
// audio = HTMLAudioElement
function LLSFXSound(argObj = {}) {
	if (new.target) return LLGFXSheet(argObj);

	var {
		audio,
		gain
	} = argObj;

	if (!audio) {
		argError("img must be a HTMLAudioElement");
	}
	audio.load();

	// the audio has no
	var audioComplete = Future();
	if (audio.readyState != 0) {
		audioComplete.resolve();
	} else {
		audio.oncanplaythrough = audioComplete.resolve;
	}

	return ({
		audio: audio,
		gain: gain,
		[llsfx$audioComplete]: audioComplete
	});
}

// a playable sound extracted from a LLSFXSound,
// must be loaded before drawing, and should be unloaded
// after no longer needed
// argObj:
// sound = LLSFXSound
// gain = coeff, def 1.0
function LLSFXPlayableSound(argObj = {
}) {
	if (new.target) return LLSFXPlayableSound(argObj);

	var {
		sound
	} = argObj;

	if (!sound) {
		argError("sound must be a LLSFXSound");
	}

	var mediaSource = null,
		gainNode = null;
	return ({
		async load() {
			if (!mediaSource) {
				await sound[llsfx$audioComplete];
				mediaSource = llsfx$ctx.createMediaElementSource(sound.audio);
				gainNode = llsfx$ctx.createGain();
				gainNode.gain.value = sound.gain;
				mediaSource.connect(gainNode);
				gainNode.connect(llsfx$masterGain);
			}
		},
		async unload() {
			if (mediaSource) {
				mediaSource.disconnect();
				mediaSource = null;
			}
			if (gainNode) {
				gainNode.disconnect();
				gainNode = null;
			}
		},
		get mediaSource() { return mediaSource; },
		get audio() { return sound.audio; }
	});
}

function llsfxPlaySound({
	playableSound
} = {}) {
	if (playableSound.mediaSource) {
		// but the play is still controlled via the audio element
		var audio = playableSound.audio;
		audio.pause();
		audio.currentTime = 0;
		audio.play().catch(function(e) {});
	}
}

function llsfxStopSound({
	playableSound
} = {}) {
	if (playableSound.mediaSource) {
		// but the play is still controlled via the audio element
		var audio = playableSound.audio;
		audio.pause();
	}
}
