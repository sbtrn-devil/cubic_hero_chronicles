//#include entcore.js

// entity - UI: UI helper to leverage popups, menu, softkeys and status bars
// components: comSoftKeys
var entUI = Entity();

// constants: some non-OEM character cores
var UIChr = {
	TUGRIC: String.fromCharCode(8366),
	ARROW_UP: String.fromCharCode(9650),
	ARROW_DOWN: String.fromCharCode(9660)
};

var ui$softKeyStack = new Array(),
	ui$softKeyBottommost, // initialized below
	// current top of the stack (out of it, for shortcut)
	ui$softKeyCurrent; // initialized below

// script - softkey refreshment
const ui$refreshSoftKeys$data = {}; // use static data to unpost duplicate events
entUI.newScript().run(async function refreshSoftKeys(s) {
	for (;;) {
		await s.anyOf(entUI.event("ui$refreshSoftKeys"));

		appLeftButtonText.innerText = ui$softKeyCurrent.left.text || "";
		appRightButtonText.innerText = ui$softKeyCurrent.right.text || "";
	}
});

// softkey low level helpers:
// initiate refresh of softkeys front-end display
function ui$refreshSoftKeys() {
	entUI.postEvent("ui$refreshSoftKeys", ui$refreshSoftKeys$data);
}

// set a softkey
function ui$setSoftKey({
		keyLayer = ui$softKeyCurrent, // an object on the ui$softKeyStack
		side, // "left" or "right"
		text, // text to display
		entEvtTarget, // the entity that will receive event upon keypress
		evtType, // the entity type to assign to that event
		evtData // the event data to supply in that event
	} = {}) {
	var skData = {
		text: text,
		entEvtTarget: entEvtTarget,
		evtType: evtType,
		evtData: evtData
	};
	skData.text = skData.text && localizeString(skData.text);
	switch (side) {
	case "left": keyLayer.left = skData; break;
	case "right": keyLayer.right = skData; break;
	}

	// initiate SK refreshment if we've updated the current SK layer
	if (keyLayer == ui$softKeyCurrent) {
		ui$refreshSoftKeys();
	}
}

// push new softkey layer
function ui$pushSoftKeyLayer() {
	 var newLayer = {
		left: {
			text: "",
			entEvtTarget: null,
			evtType: null,
			evtData: null
		},
		right: {
			text: "",
			entEvtTarget: null,
			evtType: null,
			evtData: null
		}
	};

	if (ui$softKeyCurrent) {
		ui$softKeyStack.push(ui$softKeyCurrent);
	}

	ui$softKeyCurrent = newLayer;
	ui$refreshSoftKeys();
	return newLayer;
}
ui$softKeyBottommost = ui$pushSoftKeyLayer();

function ui$removeSoftKeyLayer(currentLayer) {
	if (ui$softKeyCurrent === currentLayer) {
		if (ui$softKeyStack.length > 0) {
			ui$softKeyCurrent = ui$softKeyStack.pop();
			ui$refreshSoftKeys();
		}
	} else {
		var layerIndex = ui$softKeyStack.indexOf(currentLayer);
		if (layerIndex > -1) {
			ui$softKeyStack.splice(layerIndex, 1);
			ui$refreshSoftKeys();
		}
	}
	
}

function ui$toppleSoftKeyStack() {
	ui$softKeyStack = new Array();
	ui$softKeyCurrent = ui$softKeyBottommost;
	ui$refreshSoftKeys();
}

// script - softkey handling
entUI.newScript().run(async function handleSoftKeys(s) {	
	LOOP: for (;;) {
		// expect for Z or X keydown
		var [ keyDown ] = await s.anyOf(entApp.event("keyDown"));

		var skData, appSKDiv;
		switch (keyDown.keyCode) {
		case AppKeyCode.Z:
			skData = ui$softKeyCurrent.left;
			appSKDiv = appLeftButtonText;
			break;
		case AppKeyCode.X:
			skData = ui$softKeyCurrent.right;
			appSKDiv = appRightButtonText;
			break;
		default: continue LOOP;
		}

		if (!(skData.entEvtTarget && skData.evtType && skData.evtData)) {
			// this softkey is blank - ignore whatever is happening about it
			continue LOOP;
		}

		// mark key as pressed
		appSKDiv.style.color = "gray";
		//appSKDiv.style['font-weight'] = "";

		// expect for the same key keyup (to complete keypress and avoid
		// responding interleaving keydown/keyup of different SKs
		for (;;) {
			var [ keyUp ] = await s.anyOf(entApp.event("keyUp"));
			if (keyUp.keyCode == keyDown.keyCode) {
				break;
			}
		}

		appSKDiv.style.color = "";
		//appSKDiv.style['font-weight'] = "bold";

		// post action (if any is assigned)
		if (skData.entEvtTarget && skData.evtType && skData.evtData) {
			skData.entEvtTarget.postEvent(skData.evtType, skData.evtData);
		}
	}
});

// component - SoftKeys, higher level soft keys handling
// methods:
// setSoftKey({
//  side: "left"|"right", // which softkey
//  opt text: String, // text to display
//  opt entEvtTarget: Entity, // target entity to send the event to
//   // on softkeypress, send to no one if not specified
//	opt evtType: String, // event type to assign to the softkeypress event
//	opt evtData: Object+ // event data to supply in the softkeypress event
// })
// -^ set softkey in user layer (can be temporarily overridden with
// popup/menu SKs)
entUI.comSoftKeys = entUI.newComponent(function (ent) {
	return ({
		setSoftKey({
			side = argError('side must be left or right'),
			text = "",
			entEvtTarget = null,
			evtType = "",
			evtData = null
		} = {}) {
			ui$setSoftKey({
				keyLayer: ui$softKeyBottommost,
				side: side,
				text: text,
				entEvtTarget: entEvtTarget,
				evtType: evtType,
				evtData: evtData
			});
		}
	});
});

// menu and popup helpers

function ui$hideOverlays() {
	appMenu.style.display = "none";
	appPopup.style.display = "none";
	appPopupIntro.style.display = "none";
}

async function ui$runMenu(s, {
	items = [],
	title = "",
	maxOnScreen = 16
} = {}) {
}

var ui$popupScript = entUI.newScript();
async function ui$runPopup(s, {
	type, // "intro"|"plain"|"iconLeft"|"iconRight"|"iconTop"
	header, // opt, string (n/a for intro)
	icon, // opt, HTMLImage (n/a for intro and plain)
	text,
	enableSkip = false
} = {}) {
	header = localizeString(header);
	text = localizeString(text);
	const textSkip = localizeString("@sk_skip:Пропустить"),
		textNext = localizeString("@sk_next:Дальше"),
		textEtc = localizeString("@sk_etc:...");

	var skLayer = ui$pushSoftKeyLayer();
	try {
		appPopup.style.display = "none";
		appPopupIntro.style.display = "none";

		// setup popup's front end visuals
		var appPopupTextDiv;

		switch (type) {
		case "intro":
			appPopupTextDiv = appPopupIntroText;
			appPopupIntro.style.display = "flex";
			break;

		case "plain":
		case "iconLeft":
		case "iconRight":
		case "iconTop":
			appPopupTextDiv = appPopupText;
			appPopup.style.display = "flex";
			if (header) {
				appPopupHeader.style.display = "flex";
				appPopupHeader.innerText = String(header);
			} else {
				appPopupHeader.style.display = "none";
			}
			break;

		default: throw new Error("Incorrect popup type " + type);
		}

		// unspecified icon means no icon
		if (!icon) {
			type = "plain";
		}

		appPopupImgTopHolder.style.display = "none";
		appPopupImgLeftHolder.style.display = "none";
		appPopupImgRightHolder.style.display = "none";

		switch (type) {
		case "iconLeft":
			appPopupImgLeftHolder.style.display = "flex";
			appPopupImgLeft.src = icon.src;
			break;

		case "iconRight":
			appPopupImgRightHolder.style.display = "flex";
			appPopupImgRight.src = icon.src;
			break;

		case "iconTop":
			appPopupImgTopHolder.style.display = "block";
			appPopupImgTop.src = icon.src;
			break;

		default:;
		}

		// setup skip SK (if skip is allowed)
		if (enableSkip) {
			ui$setSoftKey({
				keyLayer: skLayer,
				side: "right",
				text: textSkip,
				entEvtTarget: s.ent,
				evtType: "popup$skip",
				evtData: {}
			});
		}

		var currentText = "", texts = text.split("|");

		// expect keys
		for (var i = 0; i < texts.length; i++) {
			currentText += texts[i];
			var lastText = i >= texts.length - 1;
			appPopupTextDiv.innerText = currentText;

			ui$setSoftKey({
				keyLayer: skLayer,
				side: "left",
				text: lastText ? textNext : textEtc,
				entEvtTarget: s.ent,
				evtType: "popup$ok",
				evtData: {}
			});

			var [ ok, skip ] = await s.anyOf(
				s.ent.event("popup$ok"), s.ent.event("popup$skip"));

			if (skip) {
				return ({ "skipped": true });
			}
		}

		return ({ "skipped": false });
	} finally {
		appPopup.style.display = "none";
		appPopupIntro.style.display = "none";
		ui$removeSoftKeyLayer(skLayer);
	}
}

var ui$menuScript = entUI.newScript();
async function ui$runMenu(s, {
	title,
	items = [],
	maxOnScreen = items.length,
	maxOnScreen$valid = (maxOnScreen > 0)
		|| argError("maxScreen must be positive")
} = {}) {
	// the items fit already
	if (items.length <= maxOnScreen) {
		maxOnScreen = items.length;
	}

	// localize title
	title = localizeString(title);

	// localize items texts
	for (var item of items) {
		if (item != "hr") {
			if (item.text) {
				item.text = localizeString(item.text);
			}
			if (item.leftText) {
				item.leftText = localizeString(item.leftText);
			}
			if (item.rightText) {
				item.rightText = localizeString(item.rightText);
			}
		}
	}

	var skLayer = ui$pushSoftKeyLayer();
	
	try {
		appMenu.style.display = "flex";
		appMenu.innerHTML = '';

		// create header and HR
		var divHeader = document.createElement("div");
		divHeader.style["font-weight"] = "bold";
		divHeader.innerText = title;
		appMenu.appendChild(divHeader);
		var divHeaderHR = document.createElement("hr");
		divHeaderHR.style.width = "100%";
		appMenu.appendChild(divHeaderHR);

		// optionally create up and down arrows
		var divArrowTop = null,
			divArrowBottom = null;
		divArrowTop = document.createElement("div");
		divArrowTop.innerText = "\u25B2";
		divArrowBottom = document.createElement("div");
		divArrowBottom.innerText = "\u25BC";

		// create divs for visible items
		var divItemsOnScreen = new Array();
		for (var i = 0; i < maxOnScreen; i++) {
			divItemsOnScreen.push(document.createElement("div"));
		}

		// build menu and arrows
		appMenu.appendChild(divArrowTop);
		for (var divItemOnScreen of divItemsOnScreen) {
			appMenu.appendChild(divItemOnScreen);
		}
		appMenu.appendChild(divArrowBottom);

		var firstOnScreen = 0, currentItem = -1;
		var disabledColor = "#C0C0C0",
			focusColor = "white",
			focusBackColor = "#C04000";

		// select the item requested to select
		for (var i = 0; i < items.length; i++) {
			if (items[i].selected) {
				currentItem = i;
			}
		}

		function refreshPresentation() {
			// fit the visible items window
			if (currentItem != -1) {
				if (currentItem < firstOnScreen) {
					firstOnScreen = currentItem;
				} else if (currentItem >= firstOnScreen + maxOnScreen) {
					firstOnScreen = currentItem + 1 - maxOnScreen;
				}
			}

			// refresh picture
			for (var i = 0; i < maxOnScreen; i++) {
				var divItem = divItemsOnScreen[i],
					item = items[firstOnScreen + i];
				if (item == "hr") {
					divItem.innerHTML = '<hr style="width: 100%">';
					divItem.style = "";
				} else {
					divItem.innerText = item.text;
					divItem.style = "";
					if (!item.enabled) {
						divItem.style.color = disabledColor;
					} else if (currentItem == firstOnScreen + i) {
						divItem.style["background-color"] = focusBackColor;
						divItem.style.color = focusColor;
					}
				}
			}

			// show/hide arrows and header rule
			if (firstOnScreen == 0) {
				divArrowTop.style.display = "none";
				divHeaderHR.style.display = "";
			} else {
				divArrowTop.style.display = "";
				divHeaderHR.style.display = "none";
			}

			if (firstOnScreen + maxOnScreen == items.length) {
				divArrowBottom.style.display = "none";
			} else {
				divArrowBottom.style.display = "";
			}

			// refresh SKs
			var theCurrentItem = items[currentItem];
			if (!theCurrentItem || theCurrentItem == "hr" ||
				!theCurrentItem.enabled) {
				// no current item, or disabled - clear SKs
				ui$setSoftKey({
					keyLayer: skLayer,
					side: "left",
					evtType: null
				});
				ui$setSoftKey({
					keyLayer: skLayer,
					side: "right",
					evtType: null
				});
			} else {
				// set SKs assigned to the current item
				ui$setSoftKey({
					keyLayer: skLayer,
					side: "left",
					text: theCurrentItem.leftText,
					entEvtTarget: theCurrentItem.entLeftEvtTarget,
					evtType: theCurrentItem.leftEvtType,
					evtData: theCurrentItem.leftEvtData
				});
				ui$setSoftKey({
					keyLayer: skLayer,
					side: "right",
					text: theCurrentItem.rightText,
					entEvtTarget: theCurrentItem.entRightEvtTarget,
					evtType: theCurrentItem.rightEvtType,
					evtData: theCurrentItem.rightEvtData
				});
			}
		}

		// initial menu presentation refresh
		refreshPresentation();

		// handle keys
		LOOP: for (;;) {
			// up or down
			var [ keyDown ] = await s.anyOf(entApp.event("keyDown"));

			switch (keyDown.keyCode) {
			case AppKeyCode.UP:
				for (var i = currentItem - 1; i >= 0; i--) {
					if (items[i] != "hr" && items[i].enabled) {
						currentItem = i;
						refreshPresentation();
						break;
					}
				}
				break;

			case AppKeyCode.DOWN:
				for (var i = currentItem + 1; i >= 0 && i < items.length; i++) {
					if (items[i] != "hr" && items[i].enabled) {
						currentItem = i;
						refreshPresentation();
						break;
					}
				}
				break;
			}
		}

	} finally {
		appMenu.style.display = "none";
		ui$removeSoftKeyLayer(skLayer);
	}
}

async function ui$waitRealTime(s, { ms = 1 }) {
	await s.anyOf(new Promise((r) => { setTimeout(r, ms); }));
}

var ui$recScript = entUI.newScript();
var ui$recOverlayOwner = null; // protection vs show/hide async interleaving
async function ui$runRec(s) {
	ui$recOverlayOwner = s;
	appRecOverlay.style.display = "flex";

	try {
		// flash red/black
		for (;;) {
			appRecOverlay.style.color = "red";
			await ui$waitRealTime(s, { ms: 600 });

			appRecOverlay.style.color = "black";
			await ui$waitRealTime(s, { ms: 600 });
		}
	} finally {
		if (ui$recOverlayOwner == s) {
			appRecOverlay.style.display = "none";
		}
	}
}

var ui$barWidth = 0,
	ui$barScript = entUI.newScript();
function ui$setBar(width) {
	if (width < 0) { width = 0; }
	if (width > 1.0) { width = 1.0; }
	ui$barWidth = width;
	appHealthBar.style.width = Math.round(width * 100) + "%";
}

// gradual change of the "health" bar
async function ui$runBar(s, {
	width = ui$barWidth,
	entEvtTarget = null,
	evtType = "",
	// evtData is always { width: 0...1 }
	fullOverMs = 4000 // how many ms to run over the 0...1 path
} = {}) {
	if (width > 1.0) {
		width = 1.0;
	}

	if (width < 0.0) {
		width = 0;
	}

	var width0 = ui$barWidth,
		maxSteps = Math.floor(fullOverMs / (width > width0 ? 30 : 120)),
		nSteps = Math.floor (Math.abs(width - width0) * maxSteps);
	if (nSteps > 0) {
		for (var i = 0; i < nSteps; i++) {
			var newWidth = width0 + (width - width0) * i / nSteps;
			ui$setBar(newWidth);
			if (entEvtTarget && evtType) {
				entEvtTarget.postEvent(evtType, { width: newWidth });
			}
			await ui$waitRealTime(s, { ms: 30 });
		}
	}

	// final step (or at least the only one)
	if (Math.abs(ui$barWidth - width) > 0.001 && entEvtTarget && evtType) {
		entEvtTarget.postEvent(evtType, { width: width });
	}
	ui$setBar(width);
}

// component - UI, menu and popup handling
entUI.comUI = entUI.newComponent(function (ent) {
	return ({
		// wait for real (non-pauseable) time
		// ms = int (milliseconds)
		async waitRealTime(s, ms) {
			await ui$waitRealTime(s, { ms: +ms });
		},

		// show popup modally, async return when dismissed
		// argObj:
		// type, // "intro"|"plain"|"iconLeft"|"iconRight"|"iconTop"
		// header, // opt, string (n/a for intro)
		// icon, // opt, HTMLImage (n/a for intro and plain)
		// text,
		// enableSkip = false
		async popupModal(argObj) {
			return await ui$popupScript.run(ui$runPopup, argObj);
		},

		// menuItems = array of:
		// "hr" = hr item
		// { text: xxx, enabled: true|false, leftText: String|null,
		//  leftEvtType: String|null, leftEvtData: Object,
		//  leftText: String|null,
		//  rightEvtType: String|null, rightEvtData: Object,
		//  rightText: String|null }
		// Showing menu hides popups
		showMenuSync(argObj) {
			ui$popupScript.stop();
			ui$menuScript.stop();

			ui$menuScript.run(ui$runMenu, argObj);
		},

		// obviously
		hideMenuSync() {
			ui$menuScript.stop();
		},

		// show "REC" flasher
		showRecSync() {
			ui$recScript.run(ui$runRec);
			entUI.recVisible = true;
		},

		// hide "REC" flasher
		hideRecSync() {
			ui$recScript.stop();
			entUI.recVisible = false;
		},

		// return visibility status of "REC" flasher
		get isRecVisible() {
			return entUI.recVisible;
		},

		// set bar value (instantly)
		setBarSync(width) {
			ui$barScript.stop();
			ui$setBar(+width);
		},

		// set bar value (with gradual visualization, one step per 30 ms)
		// argObj:
		// width = ui$barWidth,
		// entEvtTarget = null, // entity to send the "bar updated" events to
		// evtType = "", // type of "bar updated" events
		// // evtData is always { width: 0...1 }
		// fullOverMs = 4000 // how many ms to run over the 0...1 path
		// return: the promise, resolves when bar settles, rejects if
		// bar settling process is interrupted
		async setBar(s, argObj) {
			ui$barScript.stop();
			return s.anyOf(ui$barScript.run(ui$runBar, argObj));
		},

		setLocationTitleSync(str) {
			appLocationTitle.innerText = localizeString(str);
		},

		setTugricsSync(nTugric) {
			appTugriks.innerText = +nTugric;
		}
	});
});