// node compile_res_sfx.js
var ResSFX = require(__dirname + '/../res_sfx.js').ResSFX;

const fs = require('fs');
const extensionRegexp = /\.([^.]+)$/;
const dataTypes = {
	"mp3": "audio/mpeg",
	"ogg": "audio/ogg",
	"wav": "audio/x-wav"
};

for (var soundId in ResSFX.sounds) {
	var sound = ResSFX.sounds[soundId];
	var dataType = dataTypes[extensionRegexp.exec(sound.src)[1]]
		|| "";

	let buff = fs.readFileSync(__dirname + '/../' + sound.src);
	var encoded = buff.toString('base64');
	sound.src = "data:" + dataType + ";base64," + encoded;
}

fs.writeFileSync(__dirname + "/../res_sfx.gen.js",
"// this file is generated by compile_res_sfx.js, do not edit!\n"
+ "// note: workaround for fucking cors tightening by mozilla fucktards\n"
+ "const ResSFX = \n"
+ JSON.stringify(ResSFX, null, '\t') + "\n"
+ ";"
);