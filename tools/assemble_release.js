require('./compile_res_gfx.js');
require('./compile_res_sfx.js');
var iconvlite = require('iconv-lite');

const fs = require('fs');

function readFile(path) {
	return iconvlite.decode(
		fs.readFileSync(path),
		"win1251");
}

function writeFile(path, string) {
	fs.writeFileSync(path, iconvlite.encode(string, "win1251"));
}

var srcFile = readFile(__dirname + "/../test.html");
var fragments = srcFile.split(/(^<script src="[^"]*"><\/script>$)/gm),
	nFrag = fragments.length;

for (var i = 0; i < nFrag; i++) {
	var fragment = fragments[i],
		scriptMatch = fragment.match(/^<script src="([^"]*)"><\/script>$/);
	if (scriptMatch) {
		var scriptName = scriptMatch[1];
		if (scriptName == "res_gfx.js") {
			scriptName = "res_gfx.gen.js";
		}
		var scriptSrc = readFile(__dirname + "/../" + scriptName);
		fragments[i] = "<!-- " + scriptName + " [ -->\r\n<script>\r\n" +
			scriptSrc.trim() +
			"\r\n</script>\r\n<!-- ] " + scriptName + "-->";
	}
}

var finalFile = fragments.join("");

writeFile("release.html", finalFile);
