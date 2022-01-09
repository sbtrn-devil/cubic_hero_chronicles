//#include l00_app.js
//#include res_animations.js

if (typeof (ResAnimations) === 'undefined') {
	global.ResAnimations = {
		"Sample": [
			{ var: "x @FROM->@TO .:@GRAN", ticks: "@TICKS" }
		]
	};
	function llanim$Story() {} // abstract prototype
	function logError(...args) {
		console.log(...args);
	}
}


const hlanim$regexVar = /^\s*(@?[-A-Za-z0-9._$]+)\s+(@?[-A-Za-z0-9._$]+)\s*$/,
	hlanim$regexInterp = /^\s*(@?[-A-Za-z0-9._$]+)\s+(@?[-A-Za-z0-9._$]+)\s*->\s*(@?[-A-Za-z0-9._$]+)(\s+\.:(@?[-A-Za-z0-9._$]+))?\s*$/,
	hlanim$regexNumber = /^[-+]?[0-9]+(\.[0-9]+)?$/,
	// keywords are primary, no-primary, loop-start;
	// others are treated as animation ids in res_anim.js
	hlanim$regexKeywordOrId = /^@?[-A-Za-z0-9._$]+$/,
	hlanim$isPrecompiled = Symbol(); // private field ID

// pre-compile animation description from human-friendly to more parse-friendly
// form:
// "var val" => { id: "var", value: "val" }
// "x from->to .:granularity" => { id: "var", from:, to:, granularity: }
// var:"...", evt:"...", tickOn:"..." are replaced with var/evt/tickOn:[elem]
// (assuming "..." is shortcut for a single element array in this context)
// intvar is disallowed inside evt - it is stripped and error is reported
// apply the replacement recursively
function hlanim$precompileHLAnimSpecInPlace(animSpec) {
	if (typeof(animSpec) === 'object' && animSpec[hlanim$isPrecompiled]) {
		// already done
		return;
	}

	animSpec[hlanim$isPrecompiled] = true;
	for (var sp in animSpec) {
		if (typeof (animSpec[sp]) === 'string') {
			var str = animSpec[sp];
			var varMatch = str.match(hlanim$regexVar),
				interpMatch = str.match(hlanim$regexInterp),
				keywordOrIdMatch = str.match(hlanim$regexKeywordOrId);
			if (varMatch) {
				var replacement = {
					id: varMatch[1],
					value: varMatch[2]
				};
				if (replacement.value.match(hlanim$regexNumber)) {
					replacement.value = Number(replacement.value);
				}

				animSpec[sp] = replacement;
			} else if (interpMatch) {
				var replacement = {
					id: interpMatch[1],
					from: interpMatch[2],
					to: interpMatch[3]
				};
				if (replacement.from.match(hlanim$regexNumber)) {
					replacement.from = Number(replacement.from);
				}
				if (replacement.to.match(hlanim$regexNumber)) {
					replacement.to = Number(replacement.to);
				}

				// optional granularity
				if (interpMatch[5]) {
					replacement.granularity = interpMatch[5];
					if (replacement.granularity.match(hlanim$regexNumber)) {
						replacement.granularity =
							Number(replacement.granularity);
					}
				}

				animSpec[sp] = replacement;
			} else if (keywordOrIdMatch) {
				// nothing required here right now
				continue;
			} else {
				// otherwise an error
				logError('Incorrect animation element spec', sp, '=', str);
				continue;
			}
		}
		
		// may be a fallthrough if animSpec[sp] was converted at prev branch
		if (typeof (animSpec[sp]) === 'object') {
			if (animSpec[sp] instanceof llanim$Story) {
				// skip if already a fully compiled story
				continue;
			}

			hlanim$precompileHLAnimSpecInPlace(animSpec[sp]);
			if (sp == "var" || sp == "evt" || sp == "tickOn") {
				// force animSpec[sp] into an array
				if (!(animSpec[sp] instanceof Array)) {
					animSpec[sp] = [animSpec[sp]];
				}

				if (sp == "evt" || sp == "tickOn") {
					// delete and barf all interpolations
					for (var subSp in animSpec[sp]) {
						var subSpSp = animSpec[sp][subSp];
						if (typeof (subSpSp) === 'object' &&
							(("from" in subSpSp) || ("to" in subSpSp))) {
							logError("Interpolarion spec not allowed in " + sp);
							delete animSpec[sp][subSp];
						}
					}
				}
			}
		}
	}
}

// compile a LLAnimation::Story
// args:
// story = array of story specs (can include "@parameter" placeholders)
// or a compiled story, 
// parameters = array of parameters to resolve the "@parameter" placeholders
function hlanimCompileStory({
	story = [],
	parameters = {}
} = {}) {
	// prepare the story spec
	if (typeof (story) === 'string' || (story instanceof llanim$Story)) {
		story = [story];
	}
	hlanim$precompileHLAnimSpecInPlace(story);

	var underParse = new Set(); // anti-infinite-recursion protection
	function pushUnderParse(spec) {
		if (underParse.has(spec)) {
			logError("Animation spec recursion detected");
			return false;
		}

		return true;
	}

	function popUnderParse(spec) {
		underParse.delete(spec);
	}

	// if "x" is a "@parameter name" then resolve it, or barf and return null
	// if not provided; otherwise return as is
	function resolve(x) {
		if (typeof (x) === 'string' && x[0] == "@") {
			x = x.substring(1);
			if ((x in parameters) && typeof(parameters[x]) !== 'undefined') {
				return parameters[x];
			} else {
				logError("Parameter " + x + " is not provided");
				return null;
			}
		} else {
			return x;
		}
	}

	// forward decl of functions, return compiled story or null if failed
	var compileFrameSpec,
		compileStorySpec,
		compileSequence,
		compileBunch,
		compileTickByEvent,
		compileRenameVars;

	// identify and compile a specific frame spec type
	function compileWhatever(frameSpec) {
		if (frameSpec) {
			if (frameSpec instanceof llanim$Story) {
				// an already compiled story
				return frameSpec;
			} else if (typeof (frameSpec) != "object") {
				// a story spec
				return compileStorySpec(String(frameSpec));
			} else if ("length" in frameSpec) {
				// an array or array like - a sequence
				return compileSequence(frameSpec);
			} else if (("var" in frameSpec) || ("evt" in frameSpec)) {
				// a framespec
				return compileFrameSpec(frameSpec);
			} else if ("bunch" in frameSpec) {
				// a bunch
				return compileBunch(frameSpec);
			} else if ("primary" in frameSpec) {
				// a tick-driven
				return compileTickByEvent(frameSpec);
			} else if ("rename" in frameSpec) {
				// a rename-type story
				return compileRenameVars(frameSpec);
			} else if ("ticks" in frameSpec) {
				// just "ticks" long - goes for an empty story
				var ticks = resolve(frameSpec.ticks);
				if (!(ticks = Number.isNaN(+ticks))) {
					return llanim$StoryEmpty({ ticks: ticks });
				} else {
					logError("in an empty frame/story, ticks must be a number");
					return null;
				}
			} else {
				// unidentified element - return a zero-length empty story
				return null;
			}
		}
	}

	// compiles framespec ({ var:[...] evt:[...] ticks|rate })
	// return: LLAnimation::Story (bunch, sequence, or an elementary story)
	compileFrameSpec = function compileFrameSpec(frameSpec) {
		if (!pushUnderParse(frameSpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			// the array of var's and evt's is essentially a bunch
			var bunchComponents = new Array(),
				setSpecs = new Array(),
				interpSpecs = new Array(),
				evtSpecs = new Array(),
				maxDelta = -1; // to calculate ticks for rate spec

			// pre-compile (resolve placeholders and justify data)
			// the var specs
			if (frameSpec.var) {
				for (var varSpec of frameSpec.var) {
					if (!varSpec) continue; // null marks spec error, skip

					// extract var id
					var id;
					if (!("id" in varSpec) ||
						(id = resolve(varSpec.id)) === null) {
						logError("var spec needs at least an id");
						continue;
					}

					// is it a from & to spec?
					if (("from" in varSpec) || ("to" in varSpec)) {
						// a from-to spec
						if (!("from" in varSpec) || !("to" in varSpec)) {
							logError("interp var spec needs from & to");
							continue;
						}

						var from = resolve(varSpec.from),
							to = resolve(varSpec.to),
							granularity = resolve(varSpec.granularity);
						if (granularity === 0) {
							logError("interp granularity 0 is disallowed");
							granularity = null;
						}
						if (typeof (granularity) === 'undefined') {
							granularity = null;
						}
						// granularity == null is treated as unspecified

						if (typeof (from) !== 'number' ||
							typeof (to) !== 'number') {
							logError("from (" + (varSpec.from) + "=" + from +
								") and to (" + (varSpec.to) + "=" + to +
								") must both be numbers");
							// incorrect interpolation endpoints
							continue;
						}

						// record the delta to use in possible rate spec
						if (Math.abs(to - from) > maxDelta) {
							maxDelta = Math.abs(to - from);
						}

						// do not compile it now, as we don't yet now the
						// actual ticks; just remember the pre-compiled set
						interpSpecs.push({
							id: id,
							from: from,
							to: to,
							granularity
						});
					} else {
						// otherwise it is a set-value spec
						if (!("value" in varSpec)) {
							logError("set var needs value");
							continue;
						}

						var value = resolve(varSpec.value);
						if (value === null) {
							logError("value (" + (varSpec.value) + "=" + value +
								") must be a non-null value");
							continue;
						}

						setSpecs.push({
							id: id,
							value: value,
							granularity: granularity
						});
					}
				}
			}

			// pre-compile the evt specs
			if (frameSpec.evt) {
				for (var evtSpec of frameSpec.evt) {
					if (!evtSpec) continue; // null marks spec error, skip

					if (typeof(evtSpec) === 'string') {
						// it is a "name" spec, which is shortcut
						// for { id: name, value: "" }
						evtSpec = resolve(evtSpec);
						if (evtSpec !== null) {
							evtSpecs.push({
								id: String(evtSpec),
								value: ""
							});
						}
						continue;
					}

					// extract evt id
					var id;
					if (!("id" in evtSpec) ||
						(id = resolve(evtSpec.id)) === null) {
						logError("evt spec needs at least an id");
						continue;
					}

					// otherwise it is a set-value spec
					if (!("value" in evtSpec)) {
						logError("set var needs value");
						continue;
					}

					var value = resolve(evtSpec.value);
					if (value === null) {
						logError("value (" + (evtSpec.value) + "=" + value +
							") must be a non-null value");
						continue;
					}

					evtSpecs.push({
						id: id,
						value: value
					});
				}
			}

			// calculate ticks:
			var ticks = 0;
			if ("rate" in frameSpec) {
				// rate is provided
				var rate = resolve(frameSpec.rate);
				if (rate === null || +rate <= 0) {
					logError("rate (" + (frameSpec.rate) + "=" + rate +
							") must be a positive number");
					return null;
				}
				if (maxDelta == -1) {
					logError("no interp frames is provided to use rate");
					return null;
				}
				ticks = maxDelta > 0 ? (maxDelta / +rate) +
					(maxDelta % +rate ? 1 : 0) : 0;
			} else if ("ticks" in frameSpec) {
				// ticks is provided (directly)
				ticks = resolve(frameSpec.ticks);
				if (ticks === null || +ticks < 0) {
					logError("ticks (" + (frameSpec.ticks) + "=" + ticks +
							") must be a non-negative number");
					return null;
				}
				ticks = +ticks;
			} else if (evtSpecs.length && !setSpecs.length &&
				!interpSpecs.length) {
				// no rate/ticks, but just an event - equals to zero ticks
				ticks = 0;
			} else {
				// otherwise an error
				logError("frame spec must have ticks, rate, or be event-only");
				return null;
			}

			// compile interp components
			for (var interpSpec of interpSpecs) {
				bunchComponents.push(llanim$StoryLinearInterpolation({
					varName: interpSpec.id,
					from: interpSpec.from,
					to: interpSpec.to,
					granularity: interpSpec.granularity,
					ticks: ticks
				}));
			}

			// compile set components
			for (var setSpec of setSpecs) {
				bunchComponents.push(llanim$StorySetConst({
					varName: setSpec.id,
					value: setSpec.value,
					ticks: ticks
				}));
			}

			// compile event components
			for (var evtSpec of evtSpecs) {
				bunchComponents.push(llanim$StoryEvent({
					varName: evtSpec.id,
					value: evtSpec.value,
					ticks: ticks
				}));
			}

			if (bunchComponents.length > 1) {
				// return as bunch
				return llanim$StoryBunch(
					"primary",
					...bunchComponents
				);
			} else if (bunchComponents.length == 1) {
				// a single element bunch - can return it as is
				return bunchComponents[0];
			} else {
				// otherwise return empty story (as below)
				return llanim$StoryEmpty({ ticks: 0 });
			}
		} finally {
			popUnderParse(frameSpec);
		}
	};

	// compiles storyspec (string, which is animation resource ID)
	// return: LLAnimation::StorySequence
	compileStorySpec = function compileStorySpec(storySpec) {
		var animId = resolve(storySpec);
		storySpec = ResAnimations.specs[animId];
		if (!storySpec) {
			logError("ERROR: animation " + animId +
				" is undeclared in ResAnimations");
			return llanim$StoryEmpty({ ticks: 0 });
		}

		if (!pushUnderParse(storySpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			// animation resource is a sequence story spec
			return compileSequence(storySpec);
		} finally {
			popUnderParse(storySpec);
		}
	};

	// compile [ framespec|storyspec, ... ] (may include "loop-start")
	// return: LLAnimation::StorySequence, or a more direct story if the
	// sequence only consists of a single element
	compileSequence = function compileSequence(storySpec) {
		if (!pushUnderParse(storySpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			var sequence = new Array();

			// collect items
			var i = 0;
			for (var frameSpec of storySpec) {
				if (frameSpec == "loop-start") {
					sequence.push(frameSpec);
				} else {
					var item = compileWhatever(frameSpec);
					if (item != null) {
						sequence.push(item);
					} else {
						logError("StorySequence: bad spec at entry #" + i);
					}
				}
				i++;
			}

			if (sequence.length != 1) {
				// an actual sequence (0 is a special case recognized too)
				return llanim$StorySequence(...sequence);
			} else {
				// a single, non-loop sequence - may well return the 0th elem
				return sequence[0];
			}
		} finally {
			popUnderParse(storySpec);
		}
	};

	// compile { bunch: [ framespec|storyspec, ... ] } (may include "primary",
	// "no-primary")
	// return: LLAnimation::StoryBunch
	compileBunch = function compileBunch(storySpec) {
		if (!pushUnderParse(storySpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			var bunch = new Array();

			// collect items
			var i = 0;
			for (var subSpec of storySpec.bunch) {
				if (subSpec == "primary" || subSpec == "no-primary") {
					bunch.push(subSpec);
				} else {
					var item = compileWhatever(subSpec);
					if (item != null) {
						bunch.push(item);
					} else {
						logError("StoryBunch: bad spec at entry #" + i);
					}
				}
				i++;
			}

			if (bunch.length >= 1) {
				// an actual bunch
				return llanim$StoryBunch(...bunch);
			} else {
				// a single, non-loop sequence - may well return the 0th elem
				// no components goes for an empty story
				return llanim$StoryEmpty({ ticks: 0 });
			}
		} finally {
			popUnderParse(storySpec);
		}
	};

	// compile { primary: [ framespec|storyspec, ...],
	//  driver: [ framespec|storyspec, ... ], tickOn: id|[id, ...] }
	// return: LLAnimation::StoryTickByEvent
	compileTickByEvent = function compileTickByEvent(storySpec) {
		if (!pushUnderParse(storySpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			var primary = compileWhatever(storySpec.primary),
				driver = compileWhatever(storySpec.driver);
			if (primary == null) {
				logError("StoryTickByEvent: invalid primary story spec");
				return null;
			}

			if (driver == null) {
				logError("StoryTickByEvent: invalid primary story spec");
				return null;
			}

			var tickOn = storySpec.tickOn;
			if (typeof (tickOn) !== 'object' ||
				typeof (tickOn.length) !== 'number') {
				tickOn = [tickOn]; // enforce an array
			}

			var actualTickOn = new Array();

			for (var srcTickOn of tickOn) {
				var dstTickOn = resolve(srcTickOn);
				if (dstTickOn) {
					actualTickOn.push(dstTickOn);
				} else {
					logError("StoryTickByEvent: tick ID must resolve to a string");
				}
			}

			if (actualTickOn.length <= 0) {
				logError("StoryTickByEvent: must include at least one tickOn");
				return null;
			}

			return llanim$StoryTickByEvent({
				primaryStory: primary,
				driverStory: driver,
				tickEvents: actualTickOn
			});
		} finally {
			popUnderParse(storySpec);
		}
	};

	// compile { rename: { varId: varTo, ... }, in: [ framespec|storyspec ] }
	// return: LLAnimation::StoryRenameVars
	compileRenameVars = function compileRenameVars(storySpec) {
		if (!pushUnderParse(storySpec)) {
			return llanim$StoryEmpty({ ticks: 0 });
		}

		try {
			var storyIn = compileWhatever(storySpec.in);
			if (!storyIn) {
				logError("StoryRenameVars: 'in' must be a valid story spec");
				return null;
			}

			var actualXlt = new Object();
			if (typeof (storySpec.rename) !== 'object') {
				logError("StoryRenameVars: 'rename' must be a valid hashmap");
				return null;
			}

			for (var key in storySpec.rename) {
				var val = storySpec.rename[key];
				key = resolve(key);
				if (!key) {
					logError("StoryRenameVars: invalid source varname spec");
					continue;
				}
				if (val) {
					val = resolve(val);
				}
				actualXlt[key] = val;
			}

			return llanim$StoryRenameVars({
				story: storyIn,
				xlt: actualXlt
			});
		} finally {
			popUnderParse(storySpec);
		}
	};

	// do the actual magic
	return compileSequence(story);
}

// create a component to play an animation using a given animator
// (one-shot)
// args:
// story = story spec or compiled LLAnimation::Story
// parameters = parameters, if story is a storyspec
// tickSource = ticks source (entApp.comAppFixedTicks by default)
// tickStartAlign = align animation start to Nth tick of tickSource,
//  can be used to make multiple animations play synchronously
// ticksStartSkip = fixed amount of ticks to skip from start of the animation
// animator = function({ varName, value, isEvent })
// methods:
// evtDone() = awaitable that can be used to wait for animation finish
// dispose() = stop animation + dispose the component, auto-disposes on finish
function ComHLAnimation(ent, {
	story,
	parameters = {},
	tickSource = entApp.comAppFixedTicks,
	tickStartAlign = 1,
	ticksStartSkip = 0,
	animator
} = {}) {
	var script = ent.newScript(),
		s = null,
		me;

	try {
		story = hlanimCompileStory({
			story: story,
			parameters: parameters
		});
	} catch (e) {
		if (s) {
			s.dispose();
		}
		throw e;
	}

	var state = story.newState(),
		ticksToSkipOnStart = tickSource.ticksElapsed % tickStartAlign - 1
			+ ticksStartSkip;
	function playFrame(ticks) {
		var toSet = {}, toEmit = [];

			state.playStep({
				ticks: ticks,
				setter: function({
					varName,
					value,
					isEvent
				}) {
					if (isEvent) {
						toEmit.push({ varName: varName, value: value, isEvent: true });
					} else {
						// variable changes marge
						toSet[varName] = value;
					}
				}
			});

			// distribute the vars changes
			for (var k in toSet) {
				animator({ varName: k, value: toSet[k], isEvent: false });
			}

			// emit events
			for (var evt of toEmit) {
				animator(evt); // contains {varName,value,isEvent=true} triple
			}
	}

	var s = script.run(async function playAnimation(s) {
		do {
			var toSet = {}, toEmit = [];

			playFrame(1);

			// wait for a tick
			await s.anyOf(tickSource.evtTick());
		} while (!state.isFinished);
		me.dispose();

		return true; // to avoid undefined result (false no-catch) in anyOf
	});

	playFrame(ticksToSkipOnStart);
	ticksToSkipOnStart = 0;

	return (me = {
		evtDone() {
			return s;
		},
		dispose() {
			script.dispose();
		}
	});
}

// precompile animation resources
for (var animId in ResAnimations.specs) {
	hlanim$precompileHLAnimSpecInPlace(ResAnimations.specs[animId]);
}