// replacement for Promise.race that does not leak
// see https://github.com/nodejs/node/issues/17469
// credits to https://github.com/brainkim for the solution
function entcore$isPrimitive(value) {
	return (
		value === null ||
			(typeof value !== "object" && typeof value !== "function")
	);
}

// Keys are the values passed to race, values are a record of data containing a
// set of deferreds and whether the value has settled.
/** @type {WeakMap<object, {deferreds: Set<Deferred>, settled: boolean}>} */
const entcore$raceWM = new WeakMap();
function entcore$raceThatDoesntFuckingLeak(contenders) {
	let deferred;
	const result = new Promise((resolve, reject) => {
		deferred = {resolve, reject};
		for (const contender of contenders) {
			if (entcore$isPrimitive(contender)) {
				// If the contender is a primitive, attempting to use it as a key in the
				// weakmap would throw an error. Luckily, it is safe to call
				// `Promise.resolve(contender).then` on a primitive value multiple times
				// because the promise fulfills immediately.
				Promise.resolve(contender).then(resolve, reject);
				continue;
			}

			let record = entcore$raceWM.get(contender);
			if (record === undefined) {
				record = {deferreds: new Set([deferred]), settled: false};
				entcore$raceWM.set(contender, record);
				// This call to `then` happens once for the lifetime of the value.
				Promise.resolve(contender).then(
					(value) => {
						for (const {resolve} of record.deferreds) {
							resolve(value);
						}

						record.deferreds.clear();
						record.settled = true;
					},
					(err) => {
						for (const {reject} of record.deferreds) {
							reject(err);
						}
						record.deferreds.clear();
						record.settled = true;
					},
				);
			} else if (record.settled) {
				// If the value has settled, it is safe to call
				// `Promise.resolve(contender).then` on it.
				Promise.resolve(contender).then(resolve, reject);
			} else {
				record.deferreds.add(deferred);
			}
		}
	});

	// The finally callback executes when any value settles, preventing any of
	// the unresolved values from retaining a reference to the resolved value.
	return result.finally(() => {
		for (const contender of contenders) {
			if (!entcore$isPrimitive(contender)) {
				const record = entcore$raceWM.get(contender);
				record.deferreds.delete(deferred);
			}
		}
	});
}

// Future - awaitable and resolvable interface
// use:
// var f = new Future();
// ...in async function:
// var r = await f;
// ...elsewhere: f.resolve("result"); or f.reject(e);
// Future is thenable, so can be await'ed
function Future() {
	if (new.target) return Future();

	var reject,
		resolve,
		promise = new Promise(
			function (res, rej) {
				reject = rej;
				resolve = res;
			}),
		done = false,
		result,
		failure;

	var me = {
		__proto__: Future.prototype,

		// Resolves the Future with the given result
		resolve(arg) { if (!done) { done = true; result = arg; resolve(arg); } },

		// Rejects the Future with the given result
		reject(arg) { if (!done) { done = true; failure = arg; reject(arg); } },

		// true if future is completed
		get done() { return done; }, // true if future is completed

		// result (undefined until resolved)
		get result() { return result; }, 

		// result (only meaningful if rejected)
		get failure() { return failure; }, 
		then: promise.then.bind(promise),
		catch: promise.catch.bind(promise)
	};

	return me;
}

// wraps a Promise into Future - in addition to being resolved/rejected as the
// wrapped Promise, it can be resolved/rejected explicitly as a Future (whatever
// happens first determines the result)
// return: Future
Future.fromThenable = function fromPromise(thenable) {
	var future = Future();
	thenable.then(future.resolve, future.reject);
	return future;
}

// stats
const entcoreStats = {
	nScripts: 0,
	nEntities: 0,
	nComponents: 0
};
const entcoreRegistry = {
	scripts: new Set(),
	entities: new Set(),
	components: new Set()
};

//
// Script + ScriptControl subframework
//

const entcore$scripts$sScriptStopped = Symbol(); // thrown to mark script stopped while expecting, also a private method name
var entcore$scripts$currentSC = null; // currently running SC
const entcore$events$sEventSinkLink = Symbol(); // a private field name
	entcore$events$sRetainersCount = Symbol(); // a private field name in EventSink (see below)

var enctore$scAutoNameCounter = 0;

var entcore$setCurrentSC$count = 0;
function entcore$setCurrentSC(currentSC, comment) {
	var from = entcore$scripts$currentSC ? entcore$scripts$currentSC.scName : null,
		to = currentSC ? currentSC.scName : null;
	entcore$scripts$currentSC = currentSC;

	/*
	if (entcore$setCurrentSC$count < 256) {
		entcore$setCurrentSC$count++;
		console.log(comment, from, "->", to);
	} else {
		if (entcore$setCurrentSC$count == 256) {
			entcore$setCurrentSC$count = 257;
			console.log("DONE!");
		}
	}
	*/
}

// ScriptControl (SC) is the script's "client side" which will be passed
// into the scriptAsyncFunction(s, argObj) as "s" when running a script.
// Script can be re-run, SC can only be stopped once and for all -
// script's re-runs result in new SCs each time, disposing the old ones.
// SC provides the tools for awaiting events and running subscripts (it is
// assumed to only be done by the script itself, not from outside). When
// you are awaiting something inside the script, only use these tools, in
// order to be consistent with the script control and hierarchy logic.
// Script only provides tools to run and stop.
// Stopping a script or SC causes its subscripts to stop as well, and
// terminate their current awaitings (provided it is done via SC's tools)
// via a graceful exception that you must not catch - it is meant to leave
// the script's code flow.
// ScriptControl object can also hold ent property, referring to the
// hosting Entity (see below), and whatever extra props/methods you add
// to the ScriptControlPrototype (see below)
function entcore$ScriptControl(ent) {
	var me = this;
	var stopMe = Future();
	var subScripts = new Set();

	// items = array of Future|Promise
	// converts them all to Future
	function prepareItems(items) {
		for (var itemIdx in items) {
			if (!(items[itemIdx] instanceof Future)) {
				items[itemIdx] = Future.fromThenable(items[itemIdx]);
			}

			// if it is a listener from an EventSink (see below),
			// register a retainer, so that we didn't lose it
			var eventSink = items[itemIdx][entcore$events$sEventSinkLink];
			if (eventSink) {
				eventSink[entcore$events$sRetainersCount]++;
			}
		}
	}

	// items = array previously passed thru prepareItems
	function getResults(items) {
		var result = new Array();
		for (var item of items) {
			result.push(item.done ? item.result : null);
		}
		return result;
	}

	// items = array previously passed thru prepareItems
	function disarmItems(items) {
		for (var item of items) {
			if (item[entcore$events$sRemoveListener]) {
				item[entcore$events$sRemoveListener]();
				var eventSink = item[entcore$events$sEventSinkLink];
				if (eventSink) {
					eventSink[entcore$events$sRetainersCount]--;
				}
			}				
			item.reject("cancelled"); // has no effect if the item is already resolved
		}
	}

	var leaveChecked = false;
	async function eitherOf(items, raceFunc, maxResults) {
		if (stopMe.done) {
			if (!leaveChecked) {
				// this edge case is sometimes possible
				leaveChecked = true;
				throw entcore$scripts$sScriptStopped;
			} else {
				// attempt to expect after the script is known to have been stopped is an explicit error
				throw new Error("Can not await in disposed script");
			}
		}
		prepareItems(items);

		try {
			//entcore$setCurrentSC(null, "ENTER(" + me.scName + ")");

			// expect for either result or script control stop
			//await Promise.race([raceFunc.call(Promise, items), stopMe]);
			await entcore$raceThatDoesntFuckingLeak(
				[raceFunc.call(Promise, items), stopMe]);
			if (stopMe.done) {
				// this was a script control stop - leave
				throw entcore$scripts$sScriptStopped;
			}

			var result = new Array();
			for (var item of items) {
				// NOTE: the experiment shows that in .anyOf mode
				// it is possible to end up with several items resolved
				// at this stage - they can't be handled better than
				// provided into the response altogether, the developer
				// will just have to deal with it
				/*
				if (item.done && maxResults-- > 0) {
					result.push(item.result);
				} else {
					if (item.done) {
						console.log("Dropping item ", item.result);
					} else {
						result.push(undefined);
					}
				}
				*/
				if (item.done) {
					result.push(item.result);
				} else {
					result.push(undefined);
				}
			}

			return result;
		} finally {
			//entcore$setCurrentSC(me, "EXIT");
			disarmItems(items);
		}
	};

	// use: var [ result1, result2, ... ] = await sc.anyOf(item1, item2, ...);
	// items = array of Promise|Future|other thenable
	// return: Promise (assumed to be used in place)
	// Return Promise to expect for resolution of any of the given items
	// and to deliver the result as a desctucturable array. Only the
	// actually finished item will have its corresponding array element
	// set to the result.
	// Rejection of any item is thrown as an exception.
	// Note that the expecting can be aborted by stopping the script
	// from outside. In this case an exception will be thrown that is meant
	// to unwind and leave the script, and you must avoid catching it
	// (see checkLeave)
	this.anyOf = function anyOf(...items) {
		//return eitherOf(items, Promise.race, 1);
		return eitherOf(items, entcore$raceThatDoesntFuckingLeak, 1);
	};

	// use: var [ result1, result2, ... ] = await sc.allOf(item1, item2, ...);
	// items = array of Promise|Future|other thenable
	// return: Promise (assumed to be used in place)
	// Return Promise to expects for resolution of all of the given items
	// and to deliver the result as a desctucturable array. Every finished
	// item will have its corresponding array element set to the result.
	// Rejection of any item is thrown as an exception.
	// Note that the expecting can be aborted by stopping the script
	// from outside. In this case an exception will be thrown that is meant
	// to unwind and leave the script, and you must avoid catching it
	// (see checkLeave)
	this.allOf = function allOf(...items) {
		return eitherOf(items, Promise.all, items.length);
	};

	// Call this as first statement of catch(e) clause when using try/catch
	// inside a function running under Script, in order to be consistent
	// with script control convention.
	// If the current script flow is stopped, the checkLeave will not return
	// and instead will throw to proceed the unwinding
	this.checkLeave = function checkLeave() {
		/* // does not work reliably to this extent
		if (entcore$scripts$currentSC === me && stopMe.done) {
			throw entcore$scripts$sScriptStopped;
		}
		*/
		if (stopMe.done) {
			leaveChecked = true;
			throw entcore$scripts$sScriptStopped;
		}
	};

	// Stop this ScriptControl and dispose all subscripts forked from it.
	// Note that, unlike Script, a stopped ScriptControl is not re-usable
	this.stop = function stop() {
		if (!stopMe.done) {
			stopMe.resolve(null);

			for (var subScript of subScripts) {
				subScript.dispose();
			}

			/* // does not work reliably to this extent
			if (entcore$scripts$currentSC === me) {
				// stop while running self logically means we are leaving
				console.log(new Error());
				throw entcore$scripts$sScriptStopped;
			}
			*/
		}
	};

	this[entcore$scripts$sScriptStopped] = function isStopped() {
		return stopMe.done;
	};

	this.isStopped = function() {
		return stopMe.done;
	};

	// create a subscript to run under this script control
	// return: Script
	// note: you can use plain async functions to fork script's execution,
	// but you will have little control over these - they will only stop
	// when they exit, or when the whole script stops; wrapping them into
	// subscripts allows your "master" script to stop them at will
	this.fork = function fork() {
		if (stopMe.done) {
			// attempt to expect after the script is known to have been stopped is an explicit error
			throw new Error("Can not create fork from disposed script");
		}

		var newScript = Script(subScripts, ent);
		return newScript;
	};

	me.ent = ent;
	me.scName = "sc" + (enctore$scAutoNameCounter++);
}

// prototype of ScriptControl, exposed for extensibility
const ScriptControlPrototype = entcore$ScriptControl.prototype;

// Script - wraps a script function to provide it with toolkit to run within
// the paradygm of cooperative multitasking with hierarchic control.
// Most of its power comes in context of Entity (see below) and its attached
// scripts
function Script(parentScriptSet, ent) {
	if (new.target) return Script(parentScriptSet, ent);

	var me,
		currentSC = null,
		disposed = false;	

	me = {
		__proto__: Script.prototype,

		// stop the script; the script remains attached to the parent object
		// (if any) and can be run again after stopped
		stop() {
			currentSC && currentSC.stop();
			currentSC = null;
		},

		// stop and dispose the script; the script is deleted from the parent
		// object and can no longer be run
		dispose() {
			if (!disposed) {
				me.stop();
				parentScriptSet && parentScriptSet.delete(me);
				disposed = true;
				entcoreStats.nScripts--;
				entcoreRegistry.scripts.delete(me);
			}
		},

		// run the script with the given scriptAsyncFunction; automatically does
		// stop() before passing control to the custom function
		// scriptAsyncFunc = custom function, async function(s, argObj), where:
		// s = ScriptControl, argObj will be the one from the run's argObj
		// return: Promise (when the scriptAsyncFunc(...) finishes)
		run(scriptAsyncFunc, argObj = {}) {
			if (disposed) {
				throw new Error("Can not run a disposed script or its subscripts");
			}

			me.stop();
			currentSC = new entcore$ScriptControl(ent);
			var myCurrentSC = currentSC;

			async function doRun() {
				// ensure that script will start asynchronously
				// so that the previous flow, if any, got chance to unwind
				// completely before the new code starts
				await Promise.resolve(null);
				try {
					try {
						//entcore$setCurrentSC(myCurrentSC, "BEGIN RUN");
						if (myCurrentSC[entcore$scripts$sScriptStopped]()) {
							return; // script stopped before start
						}
						return await scriptAsyncFunc(myCurrentSC, argObj);
					} finally {
						//entcore$setCurrentSC(null, "END RUN(" + myCurrentSC.scName + ")");
						myCurrentSC.stop();
					}
				} catch (e) {
					if (e != entcore$scripts$sScriptStopped) {
						throw e;
					}
				} finally {
					if (currentSC == myCurrentSC) {
						currentSC = null;
					}
				}
			}

			return doRun();
		}
	};

	parentScriptSet && parentScriptSet.add(me);
	entcoreStats.nScripts++;
	entcoreRegistry.scripts.add(me);
	return me;
}

//
// Events queue and EventSink subframework
//

// array of { sink: EventSink, mode: "raise"|"clear"|"pulse", data: Object+ }
var entcore$events$eventQueue = new Array();
var entcore$events$eventQueueHandleScheduled = false,
	entcore$events$eventQueueLoopId = null; // replaced with new object on each new loop
const entcore$sEventsProcessEvent = Symbol(); // a private method name
var entcore$setImmediate;

if (typeof (setImmediate) == 'undefined') {
	var entcore$nextTickMsgName = "NEXT_TICK." + Math.random(); // fucking mozilla & google, give us setImmediate
	var entcore$nextTickItems = new Array();
	function entcore$handleTickMsg(e) {
		if (e && e.source == window && e.data == entcore$nextTickMsgName) {
			e.stopPropagation();
			if (entcore$nextTickItems.length) {
				entcore$nextTickItems.shift()();
			}
		}
	}

	entcore$setImmediate = function setImmediate(f) {
		entcore$nextTickItems.push(f);
		window.postMessage(entcore$nextTickMsgName, '*');
	}
	
	window.addEventListener('message', entcore$handleTickMsg);
} else {
	entcore$setImmediate = setImmediate;
}

function entcore$events$processEventQueue() {
	if (!entcore$events$eventQueue.length) {
		entcore$events$eventQueueHandleScheduled = false;
		return;
	}
	entcore$events$eventQueueHandleScheduled = true;
	// tear down the old queue for processing and start the new one
	var currentQueue = entcore$events$eventQueue;
	entcore$events$eventQueue = new Array();
	entcore$events$eventQueueLoopId = {};
	for (var event of currentQueue) {
		// resolves the promises of listeners - they'll run async
		event.sink[entcore$sEventsProcessEvent](event);
	}
	// schedule next processing run, so that the delivered events
	// got chance to execute code before the next run
	//setTimeout(entcore$events$processEventQueue, 0);
	entcore$setImmediate(entcore$events$processEventQueue);
}

const entcore$events$isPosted = Symbol(); // a private field name
function entcore$events$postEvent({sink, mode, data}) {
	// sink = EventSink (see below)
	if (data[entcore$events$isPosted]) {
		return;
	}
	data[entcore$events$isPosted] = true;
	entcore$events$eventQueue.push({ sink: sink, mode: mode, data: data });
	if (!entcore$events$eventQueueHandleScheduled) {
		// schedule events processing if this event was 1st in the current loop
		entcore$setImmediate(entcore$events$processEventQueue);
		entcore$events$eventQueueHandleScheduled = true;
	}
}

const entcore$events$sRemoveListener = Symbol(); // a private method name
const entcore$events$sRaisedMark = Symbol(); // a private field name
const entcore$dummyData = {}; // for clear events

// EventSink is an abstract event subscription/delivery slot.
// Producers post events to it, cosumers request listeners and are awaiting
// for the incoming events
function EventSink() {
	if (new.target) return EventSink();

	var me;
	var listeners = new Set(); // set of Future
	var raised = false, raisedMark = {},raisedData;

	// entcore$events$eventQueueLoopId

	function deliverEvent(event) {
		var DEBUG = event.data.DEBUG;
		if (listeners.size) {
			// if there is anyone listening, deliver to them
			// and note that we did a trigger at this loop
			var data = event.data, currentListeners = listeners;
			if (data[entcore$events$sRaisedMark] &&
				data[entcore$events$sRaisedMark] !== raisedMark) {
				// it is a belated raiser, which has been invalidated since,
				// ignore it
				if (DEBUG) {
					console.log("Event DEBUG = ", DEBUG, " dropped (case 1)");
				}
				return;
			}
			listeners = new Set();
			data[entcore$events$isPosted] = false;
			for (var listener of currentListeners) {
				listener.resolve(data);
			}
			if (DEBUG) {
				console.log("Event DEBUG = ", DEBUG, " resolves listeners: ", currentListeners);
			}
		} else {
			// if no one is listening right now, check retainers count -
			// non-zero indicates that there may be listeners that'll
			// subscribe in already pending continuations
			if (me[entcore$events$sRetainersCount] > 0) {
				event.data[entcore$events$isPosted] = false;
				entcore$events$postEvent(event);
				if (DEBUG) {
					console.log("Event DEBUG = ", DEBUG, " reposted");
				}
			} else {
				if (DEBUG) {
					console.log("Event DEBUG = ", DEBUG, " dropped (case 2)");
				}
			}
			// motivation behind this is to allow loops like
			// "for (;;) { var s = await sink.newListener(); }"
			// to not lose events posted in synchronous batch
		}
	}

	me = {
		__proto__: EventSink.prorotype,

		// Request a Future of a one-shot listener to the next event
		// into this sink, use it in await sc.allOf/sc.anyOf
		newListener() {
			var future = new Future();
			if (raised) {
				// if the event is in raised mode, emit the resolution now
				entcore$events$postEvent({
					sink: me,
					mode: "autoresolve",
					data: raisedData
				});
			}

			future[entcore$events$sRemoveListener] = function() {
				listeners.delete(future);
			}
			future[entcore$events$sEventSinkLink] = me;
			listeners.add(future);

			return future;
		},
		[entcore$sEventsProcessEvent](event) {
			if (event.mode == "clear") {
				raised = false;
				raisedData = null;
				return;
			}

			if (event.mode == "raise") {
				raisedData = event.data;
				raised = true;
			}

			deliverEvent(event);
		},

		// Post an event with the custom data. The posted event will trigger
		// the listeners currently listening on this sink (see newListener)
		post(eventData) {
			if (!raised) {
				entcore$events$postEvent({
					sink: me,
					mode: "post",
					data: eventData
				});
			} else {
				throw new Error("Can not post event which has been raised");
			}
		},

		// Raise the event with the custom data. The raised event will trigger
		// the listeners currently listening on this sink (see newListener),
		// and will keep immediately triggering any ones subscribing in future
		// (with the data last provided) until it is cleared (see clear).
		// Note that it is illegal to use post() on Sink that is currently in
		// raised mode.
		raise(eventData) {
			eventData[entcore$events$sRaisedMark] = raisedMark;
			entcore$events$postEvent({
				sink: me,
				mode: "raise",
				data: eventData
			});
		},

		// Clear raised mode (see raise)
		clear(eventType) {
			raisedMark = {}; // to disarm possibly pending earlier raises
			entcore$events$postEvent({
				sink: me,
				mode: "clear",
				//data: entcore$dummyData,
				data: { DEBUG: eventType }
			});
		},

		[entcore$events$sRetainersCount]: 0
	};

	return me;
}

//
// Entity and Component subframework
//

const entcore$entity$dummySink = EventSink(); // will never trigger
const entcore$entity$dummyFunction = function() {};

// Entity is a disposable container for other disposables:
// - components (are primarily meant to expose methods and properties),
// - scripts,
// - sub-entities.
// Additionally, Entity is a hub for posting and receiving events.
// parentEntSet = you should omit this when invoking Entity ctor manually
function Entity(parentEntSet) {
	if (new.target) return Entity(parentEntSet);

	var subEnts = new Set(),
		components = new Set(),
		scripts = new Set(),
		eventSinks = {}, // { [eventId]: EventSink }
		disposed = false;

	var me = {
		__proto__: Entity.prototype,

		newScript() {
			var script = new Script(scripts, me);
			scripts.add(script);
			return script;
		},

		// Return a one-shot listener for event of given type
		// eventType = String
		// return: Future (assumed to be used in place)
		event(eventType) {
			eventType = String(eventType);
			var eventSink = eventSinks[eventType] ||
				(eventSinks[eventType] = EventSink());
			return eventSink.newListener();
		},

		// Post an event of given type to the entity
		// eventType = String
		// eventData = Object (as arbitrary dicionary)
		postEvent(eventType, eventData) {
			eventType = String(eventType);
			var eventSink = eventSinks[eventType];
			if (eventSink) {
				eventSink.post(eventData);
			}
		},

		// Raise an event of given type on the entity (it will stay raised
		// and immediately trigger any subseqent listeners, until cleared)
		// eventType = String
		// eventData = Object (as arbitrary dicionary)
		// Note: don't use raise and post on same entity with same event type,
		// they are mutually exclusive notification strategies
		// Note 2: posting _same instance_ of eventData will be ignored
		// until it is handled/dropped
		raiseEvent(eventType, eventData) {
			eventType = String(eventType);
			var eventSink = eventSinks[eventType] ||
				(eventSinks[eventType] = EventSink());
			eventSink.raise(eventData);
		},

		// Clear an event of given type on the entity
		// eventType = String
		clearEvent(eventType) {
			eventType = String(eventType);
			var eventSink = eventSinks[eventType];
			if (eventSink) {
				eventSink.clear(eventType);
			}
		},

		// Create a blank sub-entity. Prefer always creating an entity as
		// a sub-entity of some parent entity (except for maybe one single
		// topmost "application" entity) this will allow to control the entities
		// life spans
		// return: Entity
		newSubEntity() {
			return Entity(subEnts);
		},

		// Create a component
		// compCreate = function(ent, argObj)
		// where: ent = Entity (this one), argObj = forwarded argObj
		// supposed to return: an object with optional dispose() method
		// (it will be added if not exists)
		// return: result returned by compCreate(thisEnt, argObj),
		// with dispose() method added or wrapped for disposal
		// and ent property set/replaced to the entity itself
		newComponent(compCreate, argObj) {
			var unwrappedDispose,
				component = compCreate(me, argObj);
			unwrappedDispose = component.dispose;
			if (!(unwrappedDispose instanceof Function)) {
				unwrappedDispose = entcore$entity$dummyFunction;
			} else {
				unwrappedDispose = unwrappedDispose.bind(component);
			}

			components.add(component);
			entcoreStats.nComponents++;
			entcoreRegistry.components.add(component);
			component.dispose = function dispose() {
				try {
					unwrappedDispose();
				} finally {
					unwrappedDispose = entcore$entity$dummyFunction;
					if (components.delete(component)) {
						entcoreRegistry.components.delete(component);
						entcoreStats.nComponents--;
					}
				}
			}
			component.ent = me;

			return component;
		},

		// Dispose the entity, all its sub-entities, contained scripts,
		// and components. A disposed entity can not be re-used, although
		// it is still a legitimate dummy target for posting and listening
		// for events
		dispose() {
			if (!disposed) {
				disposed = true;
				for (var script of scripts) {
					script.dispose();
				}

				for (var component of components) {
					component.dispose();
				}

				for (var subEnt of subEnts) {
					subEnt.dispose();
				}

				parentEntSet && parentEntSet.delete(me);
				entcoreStats.nEntities--;
				entcoreRegistry.entities.delete(me);
			}
		}
	};

	parentEntSet && parentEntSet.add(me);
	entcoreRegistry.entities.add(me);
	entcoreStats.nEntities++;
	return me;
}

// an error for required or invalid named arg
// usage: function ({requiredArg = argError("requiredArg is required")})
// or: function ({x = 10,
//  x$valid = (typeof(x) is 'number') || argError("x must be number")})
function argError(s) {
	throw new Error(s);
}

// print a complaint in whatever appropriate matter
function logError(...args) {
	console.log(...args);
}
