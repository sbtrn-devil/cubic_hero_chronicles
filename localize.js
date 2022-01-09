// helper to translate strings like
// "@key:Non-localized string @key1:NL string 1 ... @:non-localed fragment"
// based on table "key" => "localized string"
var localize$dictionary = {}; // key => string

// TODO: setter for localize$dictionary;
const localize$keyRegexp = /(\s*)(@[-A-Za-z0-9._]*:|$)/,
	localize$keyOrWhitespace = /(\s*)/;
function localizeString(str) {
	if (!str) {
		// shortcut for any false values
		return "";
	}
	var splitStrs = str.split(localize$keyRegexp),
		n = splitStrs.length;
	var resultPieces = new Array();
	for (var i = 0; i < n; i++) {
		var piece = splitStrs[i];
		if (piece == '@:') {
			// non-localizeable fragment will follow, nothing to bother of
			continue;
		} else if (piece[0] == '@') {
			var key = piece.substring(1, piece.length - 1),
				value = localize$dictionary[key];
			if (value) {
				resultPieces.push(value);
			} else {
				// alas, no localization for this
				resultPieces.push(splitStrs[i + 1]);
			}
			i++; // skip the "quoted" unlocalized fragment
		} else {
			resultPieces.push(piece);
		}
	}

	return resultPieces.join("");
}

// extract "key => value" dictionary from the string, which can be used as base
// for preparing translations for later localizeString
function unlocalizeString(str) {
	var splitStrs = str.split(localize$keyRegexp),
		n = splitStrs.length;
	var result = new Array();
	for (var i = 0; i < n; i++) {
		var piece = splitStrs[i];
		if (piece != '@:' && piece[0] == '@') {
			var key = piece.substring(1, piece.length - 1),
				value = splitStrs[++i];
			result[key] = value;
		}
	}

	return result;
}

exports.unlocalizeString = unlocalizeString; // enable acquisition from node.js
