/*
// wraps an animation state that incapsulates current timer, assuming initial 0,
// and is able to "play" a step by delivering back (via a setter) the changes
// that occur over the current timer shifted by the given amount
LLAnimation::State = {
	rewindTo(nTick) // set current time to nTick (assuming 0 = start)
	playStep({ticks = N, setter = function({varName, value, isEvent}))
	// ^play time ticks(>=0) fwd, with the anim effects via setter
	isFinished // true if animation is at or past its logical end
	// ^assumed to be always false for looping animations
	ticksToNextEvent // -1 if no events ahead on the timeline
	// ^(always -1 for value and interpolation stories)
	currentLoop // 0 on 1st, 1 and on after others
}
*/
function llanim$State() {} // abstract prototype

/*
// wraps an animation blueprint (aka "story"), immutable and stateless per se,
// but referenced by possibly multiple independent LLAnimation::State's
LLAnimation::Story = {
	newState() // (AnimationState) returns new LLAnimation::State that will play
	// to this story
	durationTicks // how many ticks long from 0 to end/loop end
	ticksToFirstEvent // how many ticks from 0 to first event in the story
	// ^-1 if none (always -1 for value and interpolation stories)
}
*/
function llanim$Story() {} // abstract prototype

// story that only has a duration and does nothing during that
function llanim$StoryEmpty({
	ticks,
	ticks$valid = (ticks = Math.floor(+ticks)) >= 0
		|| argError("ticks must be non-negative")
} = {}) {
	if (new.target != null) {
		return llanim$StoryEmpty(...arguments);
	}

	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return ticks;
		},
		newState() {
			var curTick = 0;
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					curTick = nTick;
				},
				playStep({ ticks, setter }) {
					curTick += ticks;
				},
				get isFinished() {
					return curTick >= ticks;
				},
				get ticksToNextEvent() {
					return -1;
				},
				get currentLoop() {
					return 0;
				}
			});
		},
		get ticksToFirstEvent() {
			return -1;
		}
	});
}

// story for linear interpolation of numeric values, with variety of settings
// ticks<0 are assumed to deliver no effect
function llanim$StoryLinearInterpolation({
	varName = "value",
	from = 0,
	to = 1,
	granularity = null, // integer granularity
	rate,
	ticks = (rate > 0) ? Math.ceil(Math.abs(to - from) / rate) :
		argError("rate must be non-negative if explicitly specified"),
	ticks$valid = (ticks = Math.floor(+ticks)) >= 0
		|| argError("ticks must be non-negative if explicitly specified")
} = {}) {
	if (new.target != null) {
		return llanim$StoryLinearInterpolation(...arguments);
	}
	if (ticks == 0) {
		return ({
			__proto__: llanim$Story.prototype,
			get durationTicks() {
				return ticks;
			},
			newState() {
				var curTick = 0;
				return ({
					__proto__: llanim$State.prototype,
					rewindTo(nTick) {
						curTick = nTick;
					},
					playStep({ ticks, setter }) {
						curTick += ticks;
						setter({
							varName: varName,
							value: curTick < 0 ? from : to,
							isEvent: false
						});
					},
					get isFinished() {
						return curTick >= ticks;
					},
					get ticksToNextEvent() {
						return -1;
					},
					get currentLoop() {
						return 0;
					}
				});
			},
			get ticksToFirstEvent() {
				return -1;
			}
		});
	} else {
		if (!rate) {
			rate = (to - from) / ticks;
		} else {
			if (rate > 0 && to < from) {
				rate = -rate;
			}
		}

		return ({
			__proto__: llanim$Story.prototype,
			get durationTicks() {
				return ticks;
			},
			newState() {
				var curTick = 0, durTicks = ticks;
				return ({
					__proto__: llanim$State.prototype,
					rewindTo(nTick) {
						curTick = nTick;
					},
					playStep({ ticks, setter }) {
						curTick += ticks;

						var value;
						if (curTick < 0) {
							return;
						} else if (curTick >= durTicks) {
							value = to;
						} else {
							var delta = rate * curTick;
							if (granularity !== null) {
								delta = Math.round(delta / granularity)
									* granularity;
							}
							value = from + delta;
						}

						setter({
							varName: varName,
							value: value,
							isEvent: false
						});
					},
					get isFinished() {
						return curTick >= ticks;
					},
					get ticksToNextEvent() {
						return -1;
					},
					get currentLoop() {
						return 0;
					}
				});
			},
			get ticksToFirstEvent() {
				return -1;
			}
		});
	}
}

// story for setting a given constant value (number or anyting else) at tick 0
function llanim$StorySetConst({
	varName = "value",
	value,
	value$valid = typeof (value) != 'undefined'
		|| argError("value must be defined"),
	ticks, // not actually much use, but sets the formal animation duration
	ticks$valid = (ticks = Math.floor(+ticks)) >= 0
		|| argError("ticks must be non-negative")
} = {}) {
	if (new.target != null) {
		return llanim$StoryConstant(...arguments);
	}

	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return ticks;
		},
		newState() {
			var curTick = 0;
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					curTick = nTick;
				},
				playStep({ ticks, setter }) {
					curTick += ticks;
					if (curTick >= 0) {
						setter({
							varName: varName,
							value: value,
							isEvent: false
						});
					}
				},
				get isFinished() {
					return curTick >= ticks;
				},
				get ticksToNextEvent() {
					return -1;
				},
				get currentLoop() {
					return 0;
				}
			})
		},
		get ticksToFirstEvent() {
			return -1;
		}
	})
}

// story for emitting an event when reaching/crossing tick 0
// unlike a variable, event is only emitted once, when the tick is
// reached/crossed, not later
function llanim$StoryEvent({
	varName = "value",
	value,
	value$valid = typeof (value) != 'undefined'
		|| argError("value must be defined"),
	ticks, // not actually much use, but sets the formal animation duration
	ticks$valid = (ticks = Math.floor(+ticks)) >= 0
		|| argError("ticks must be non-negative")
} = {}) {
	if (new.target != null) {
		return llanim$StoryEvent(...arguments);
	}

	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return ticks;
		},
		newState() {
			var curTick = 0, emitted = false;
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					curTick = nTick;
					emitted = false;
				},
				playStep({ ticks, setter }) {
					curTick += ticks;
					if (curTick - ticks <= 0 && curTick >= 0 && !emitted) {
						emitted = true;
						setter({
							varName: varName,
							value: value,
							isEvent: true
						});
					}
				},
				get isFinished() {
					return curTick >= ticks;
				},
				get ticksToNextEvent() {
					if (curTick < 0 || (curTick == 0 && !emitted)) {
						return -curTick;
					} else {
						return -1;
					}
				},
				get currentLoop() {
					return 0;
				}
			})
		},
		get ticksToFirstEvent() {
			return 0;
		}
	})
}

const llanim$sequence = Symbol(); // private symbol

// story composed of sequence of other stories, playing in turn each after the
// previous one, with optional looping; the segment sub-stories that are looped
// themselves are considered unlooped and ending at end of their loop
// segments = array of (LLAnimation::Story | "loop-start")
// if loop-start is present then the sequence is looped, its end is the end
// of the loop, and "loop-start" is the marker of the story (next to the
// "loop-start" in the list) to restart the loop from
function llanim$StorySequence(...segments) {
	if (new.target != null) {
		return llanim$StorySequence(...arguments);
	}

	var actualSegments = new Array(), loopStartIdx = -1, loopStartTick,
		totalTicks = 0, // acts as accumulator during the story construction
		ticksToFirstEvent = -1,
		ticksToFirstEventInLoop = -1; // from 0, not from start of the loop
	for (var i = 0; i < segments.length; i++) {
		if (segments[i] == "loop-start") {
			loopStartIdx = actualSegments.length;
			loopStartTick = totalTicks;
		} else if (segments[i][llanim$sequence]) {
			// "flatten" nested sequences
			for (var nestedSeg of segments[i][llanim$sequence]) {
				actualSegments.push({
					startAtTick: totalTicks,
					endAtTick: totalTicks + nestedSeg.story.durationTicks,
					story: nestedSeg.story
				});
				if (ticksToFirstEvent == -1 &&
					nestedSeg.story.ticksToFirstEvent != -1) {
					ticksToFirstEvent = totalTicks + nestedSeg.story.ticksToFirstEvent;
				}
				if (loopStartIdx != -1 &&
					ticksToFirstEventInLoop == -1 &&
					nestedSeg.story.ticksToFirstEvent != -1) {
					ticksToFirstEventInLoop =
						totalTicks + nestedSeg.story.ticksToFirstEvent;
				}
				totalTicks += nestedSeg.story.durationTicks;
			}
		} else {
			var duration = segments[i].durationTicks;
			actualSegments.push({
				startAtTick: totalTicks,
				endAtTick: totalTicks + duration,
				story: segments[i]
			});
			if (ticksToFirstEvent == -1 &&
				segments[i].ticksToNextEvent != -1) {
				ticksToFirstEvent = totalTicks + segments[i].ticksToFirstEvent;
			}
			if (loopStartIdx != -1 &&
				ticksToFirstEventInLoop == -1 &&
				segments[i].ticksToFirstEvent != -1) {
				ticksToFirstEventInLoop =
					totalTicks + segments[i].ticksToFirstEvent;
			}
			totalTicks += duration;
		}
	}

	return ({
		__proto__: llanim$Story.prototype,
		[llanim$sequence]: actualSegments,
		get durationTicks() {
			return totalTicks;
		},
		newState() {
			var curTick = 0, curSegIdx = -1, curState = null;
			if (actualSegments.length <= 0) {
				// empty segments list - trivial case
				return ({
					__proto__: llanim$State.prototype,
					rewindTo(nTick) {},
					playStep({ ticks, setter }) {},
					get isFinished() { return true; },
					get ticksToNextEvent() { return -1; },
					get currentLoop() { return 0; }
				});
			}

			// initial rewind
			curSegIdx = 0;
			curState = actualSegments[0].story.newState();
			var currentLoop = 0;

			// non-empty
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					// correct to loop (if any specified)
					if (loopStartIdx >= 0 && nTick > totalTicks) {
						nTick = loopStartTick + (nTick - loopStartTick) %
							(loopStartTick > totalTicks ?
								totalTicks - loopStartTick : 1);
					}

					curTick = nTick;
					curSegIdx = -1;
					curState = null;
					if (curTick >= actualSegments[0].startAtTick) {
						for (var i in actualSegments) {
							i = +i;
							var actualSeg = actualSegments[i];
							if (actualSeg.startAtTick <= nTick &&
								actualSeg.endAtTick >= nTick) {
								curSegIdx = i;
								curState = actualSeg.story.newState();
								curState.rewindTo(nTick -
									actualSeg.startAtTick);
								return;
							}
						}

						// not in any of the segments - therefore past the end
						curSegIdx = actualSegments.length - 1;
						actualSeg = actualSegments[curSegIdx];
						curState = actualSeg.story.newState();
						curState.rewindTo(nTick - actualSeg.startAtTick);
					}
				},
				playStep({ ticks, setter }) {
					// some protection against zero ticks story
						var ticksBefore = ticks,
							looped = false;
					for (; curSegIdx != -1;) {
						// we are currently in one of the component stories
						var curSeg = actualSegments[curSegIdx];
						var curSegTicksRemaining = curSeg.endAtTick - curTick,
							goToNextComp = curSegTicksRemaining <= ticks;
						if (curSegTicksRemaining >= ticks) {
							// the requested ticks does not overflow the
							// remaining duration of the component -
							// just play it
							curState.playStep({ ticks: ticks, setter: setter });
							curTick += ticks;
							ticks = 0;
						} else {
							// the requested ticks overflows the component -
							// play however much is remaining
							curState.playStep({
								ticks: curSegTicksRemaining,
								setter: setter
							});
							curTick += curSegTicksRemaining;
							ticks -= curSegTicksRemaining;
						}

						if (goToNextComp) {
							// going to next component
							if (curSegIdx < actualSegments.length - 1) {
								// there is a next component
								curSegIdx++;
								curSeg = actualSegments[curSegIdx];
								curState = curSeg.story.newState();
								curState.rewindTo(0);
							} else if (loopStartIdx >= 0) {
								// we are at or past finish, and there is a loop
								curSegIdx = loopStartIdx;
								curSeg = actualSegments[curSegIdx];
								curTick = curSeg.startAtTick;
								curState = curSeg.story.newState();
								curState.rewindTo(0);
								currentLoop++;
								looped = true;
							} else {
								// we are at or past finish, and no loop -
								// stay at the current tick
								curTick = curSeg.endAtTick;
								break;
							}
						}

						if (ticks <= 0) {
							break;
						}

						if (looped && ticks >= ticksBefore) {
							// went loop and ticks have not reduced - that
							// means we're in a degenerate zero length loop edge
							// this is an edge case where we can only break
							// the result is the whole degenerate loop
							// played once in one go
							break;
						}
					}

					// if we ended up right at the beginning of a segment,
					// must play its first frame for 0 ticks
					// (for consistency with const setting and event emitting)
					if (curSeg.startAtTick == curTick) {
						curState.playStep({
							ticks: 0,
							setter: setter
						});
					}
				},
				get isFinished() {
					return loopStartIdx < 0 && curTick >= totalTicks;
				},
				get ticksToNextEvent() {
					// before the start
					if (curSegIdx == -1 && curTick < 0) {
						return ticksToFirstEvent - curTick;
					}
					// inside a state and before its next-to-event
					var ticksForCurState = curState && curState.ticksToNextEvent;
					if (ticksForCurState != -1) {
						return ticksForCurState;
					}
					// search in segments ahead
					for (var i = curSegIdx + 1; i < actualSegments.length; i++) {
						var actualSeg = actualSegments[i];
						if (actualSeg.story.ticksToFirstEvent != -1) {
							return actualSeg.story.ticksToFirstEvent + actualSeg.startAtTick
								- curTick;
						}
					}
					// none in segments ahead, but possibly back in loop?
					if (ticksToFirstEventInLoop != -1) {
						return totalTicks - curTick
							+ ticksToFirstEventInLoop - loopStartTick;
					}
					// none at all
					return -1;
				},
				get currentLoop() {
					return currentLoop;
				}
			});
		},
		get ticksToFirstEvent() {
			return ticksToFirstEvent;
		}
	});
}

// story composed of multiple stories, playing simultaneously and starting
// at the same time (tick 0)
// segments = array of (LLAnimation::Story | "primary" | "no-primary")
// the segment following "primary" mark is considered the primary segment,
// its durationTicks defines duration of the whole story, and the whole story
// is considered unlooped (the loops of non-primary stories that span beyond
// duration of the primary one are clamped).
// "no-primary" marks there is no primary segment
// if there is no primary segment, then the story is considered never finishing
// and segments and their loops are played with no restriction, but the story
// duration (for purpose of sequencing) is considered 0
// if "no-primary" and "primary" are not expicitly specified, then a story is
// automatically taken as primary that has the most duration (durationTicks)
function llanim$StoryBunch(...segments) {
	if (new.target != null) {
		return llanim$StoryBunch(...arguments);
	}

	var actualSegments = new Array(), primaryIdx = -1, totalTicks = 0,
		ticksToFirstEvent = -1, primarySelected = false;
	for (var i = 0; i < segments.length; i++) {
		if (segments[i] == "no-primary") {
			primarySelected = true;
			primaryIdx = -1;
		} else if (segments[i] == "primary") {
			primarySelected = true;
			primaryIdx = actualSegments.length;
		} else {
			actualSegments.push(segments[i]);
		}
	}

	if (actualSegments.length > 0 && !primarySelected) {
		// "primary" and "no primary" not explicitly specified - assume that we
		// have the primary, and it is the segment with the max duration
		primaryIdx = 0;
		totalTicks = actualSegments[0].durationTicks;
		for (var i in actualSegments) {
			i = +i;
			if (actualSegments[i].durationTicks > totalTicks) {
				primaryIdx = i;
				totalTicks = actualSegments[i].durationTicks;
			}
		}
	}

	if (primaryIdx >= actualSegments.length) {
		argError("'primary' marker must be followed by a story object");
	} else if (primaryIdx >= 0) {
		totalTicks = actualSegments[primaryIdx].durationTicks;
	}

	// calculate 1st event
	for (var segment of actualSegments) {
		var ticksToFirstEventOfSeg = segment.ticksToFirstEvent;
		if (ticksToFirstEventOfSeg >= 0 &&
			(primaryIdx == -1 || ticksToFirstEventOfSeg <= totalTicks) &&
			(ticksToFirstEvent <= 0 || ticksToFirstEvent > ticksToFirstEventOfSeg)) {
			ticksToFirstEvent = ticksToFirstEventOfSeg;
		}
	} 

	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return totalTicks;
		},
		newState() {
			var curTick = 0, subStates = new Array();
			for (var segment of actualSegments) {
				subStates.push(segment.newState());
			}
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					curTick = nTick;
					if (primaryIdx >= 0 && nTick > totalTicks) {
						// the bunch is clamped
						nTick = totalTicks;
					}

					for (var state of subStates) {
						state.rewindTo(nTick);
					}
				},
				playStep({ ticks, setter }) {
					if (primaryIdx >= 0 && curTick + ticks > totalTicks) {
						ticks = totalTicks - curTick;
					}

					if (ticks < 0) {
						ticks = 0;
					}

					for (var state of subStates) {
						state.playStep({ ticks: ticks, setter: setter });
					}

					curTick += ticks;
				},
				get isFinished() {
					return primaryIdx >= 0 && curTick >= totalTicks;
				},
				get ticksToNextEvent() {
					var resultTicks = -1;
					if (totalTicks == 0) {
						// no primary story and no clamp
						for (var state of subStates) {
							var ticksForSubState = state.ticksToNextEvent;
							if (ticksForSubState >= 0 && (resultTicks <= 0 ||
								resultTicks > ticksForSubState)) {
								resultTicks = ticksForSubState;
							}
						}
					} else {
						// clamped to primary story
						for (var state of subStates) {
							var ticksForSubState = state.ticksToNextEvent;
							if (ticksForSubState >= 0 &&
								ticksForSubState <= totalTicks &&
								(resultTicks <= 0 ||
								resultTicks > ticksForSubState)) {
								resultTicks = ticksForSubState;
							}
						}
					}

					return resultTicks;
				},
				get currentLoop() {
					return 0;
				}
			});
		},
		get ticksToFirstEvent() {
			return ticksToFirstEvent;
		}
	});
}


const llanim$dummySetter = function() {};

// a story that is made from tick driver story (directly receiving the ticks
// from playStep) and the primary story (which only receives the ticks from
// the given events emitted by the driver). Say, driver is a looped story that
// emits "step" event every 3 ticks, and primary story is a sequence that emits
// a "ok" event after 2 ticks - then the resulting StoryTickByEvent will emit
// "ok" event after 2 "step" events = after 6 ticks.
// The primary story (and the whole resulting StoryTickByEvent) are forced to be
// non-looped by design - wrap into StorySequence to loop.
// The events and variables from both driver and primary story are both emitted
// from the resulting StoryTickByEvent.
function llanim$StoryTickByEvent({
	primaryStory,
	driverStory,
	tickEvents,
	tickEvents$valid = (tickEvents && tickEvents.length > 0) ||
		argError("tickEvents must be list with at least one event name")
} = {}) {
	if (new.target != null) {
		return llanim$StoryTickByEvent(...arguments);
	}

	if (primaryStory.durationTicks <= 0) {
		// a simplistic degenerate case
		return llanim$StoryEmpty({
			ticks: 0
		});
	}

	// in order to make the story deterministic, we'll pre-calculate the
	// ticks emitted from driver story (they are assumed deterministic too)
	// into actual ticks using a single calibration run of the driver story,
	// and then will push the primary story using the pre-calculated list
	var primaryTotalTicks = primaryStory.durationTicks,
		totalTicks = 0,
		primaryTickAtTicks = new Array(), // i => ts from 0 to i-th primary tick
		primaryEventAtTicks = new Array(); // same, but for events
	var calibrationState = driverStory.newState(),
		calibratedState = primaryStory.newState(),
		ticksEmittedLastLoop = false;
	calibrationState.rewindTo(0);
	tickEvents = new Set(tickEvents);

	for (;;) {
		var calLoopPre = calibrationState.currentLoop,
			ticksToPlay = calibrationState.ticksToNextEvent,
			primaryTicksEmitted = 0;

		if (ticksToPlay < 0) {
			// protection against the incorrect driver
			argError("Driver animation finishes or loops at state unable to provide enough ticks to finish the primary animation");
		}

		// play to next event, inclusive, and add accumulated primary ticks
		// if any matching driver events were emitted
		calibrationState.playStep({
			ticks: ticksToPlay,
			setter: function({
				varName,
				value,
				isEvent
			}) {
				if (isEvent && tickEvents.has(varName)) {
					primaryTicksEmitted++;
				}
			}
		});

		totalTicks += ticksToPlay;
		if (primaryTicksEmitted > 0) {
			// in case there are more than one tick-driver events at same tick,
			// use a loop
			for (var i = 0; i < primaryTicksEmitted &&
				primaryTickAtTicks.length < primaryTotalTicks; i++) {
				// record the timestamp for the tick
				primaryTickAtTicks.push(totalTicks);

				// if an event in primary story has come (or comes after 1 tick,
				// which now will be played), record the timestamp for it
				if (calibratedState.ticksToNextEvent == 0 ||
					calibratedState.ticksToNextEvent == 1) {
					primaryEventAtTicks.push(totalTicks);
				}
				calibratedState.playStep({
					ticks: 1,
					setter: llanim$dummySetter
				});

				// mark that we've got a tick this loop
				ticksEmittedLastLoop = true;
			}

			if (primaryTickAtTicks.length >= primaryTotalTicks) {
				// we reached end of the primary animation
				break;
			}
		} else {
			// no ticks emitted this step
			if (calibrationState.isFinished ||
				(calibrationState.currentLoop > calLoopPre &&
					!ticksEmittedLastLoop)) {
				// protection against the incorrect driver
				argError("Driver animation finishes or loops at state unable to provide enough ticks to finish the primary animation");
			}

			if (calibrationState.currentLoop > calLoopPre) {
				// going next loop - mark no ticks at the loop for now
				ticksEmittedLastLoop = false;
			}
		}
	}

	tickEvents = null; // no longer need this list
	// at this point we have primaryTickAtTicks filled and totalTicks
	// counted the actual duration of the whole animation

	// now return the composite story object
	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return totalTicks;
		},
		newState() {
			var curTick = 0,
				priState = primaryStory.newState(),
				driverState = driverStory.newState(),
				curPriTickIdx = 0, // "next" primary tick
				curPriEventIdx = 0; // "next" primary story
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					curTick = nTick;
					driverState.rewindTo(nTick);
					for (curPriTickIdx = 0;
						curPriTickIdx < primaryTickAtTicks.length;
						curPriTickIdx++) {
						if (primaryTickAtTicks[curPriTickIdx] >= curTick) {
							priState.rewindTo(curPriTickIdx);
							break;
						}
					}

					// calculate the event
					for (curPriEventIdx = 0;
						curPriEventIdx < primaryEventAtTicks.length;
						curPriEventIdx++) {
						if (primaryEventAtTicks[curPriEventIdx] >= curTick) {
							break;
						}
					}
				},
				playStep({ ticks, setter }) {
					curTick += ticks;
					driverState.playStep({ ticks: ticks, setter: setter });

					// calculate how many primary ticks are skipped by the shift
					var priTicksToPlay;
					for (priTicksToPlay = 0;
						curPriTickIdx < primaryTickAtTicks.length &&
							primaryTickAtTicks[curPriTickIdx] <= curTick;
							curPriTickIdx++) {
						priTicksToPlay++;
					}

					// advance the events index skipped over these ticks
					for (; curPriEventIdx < primaryEventAtTicks.length &&
						primaryEventAtTicks[curPriEventIdx] <= curTick;
						curPriEventIdx++) {}

					priState.playStep({
						ticks: priTicksToPlay,
						setter: setter
					});
				},
				get isFinished() {
					return curTick >= totalTicks;
				},
				get ticksToNextEvent() {
					var ticksToNextPriEvent = -1,
						ticksToNextDriverEvent = driverState.ticksToNextEvent;
					if (curPriEventIdx >= 0 &&
						curPriEventIdx < primaryEventAtTicks.length) {
						ticksToNextPriEvent =
							primaryEventAtTicks[curPriEventIdx] - curTick;
					}

					if (ticksToNextPriEvent != -1 &&
						(ticksToNextDriverEvent == -1 ||
						ticksToNextDriverEvent >= ticksToNextPriEvent)) {
						// there is incoming primary event, and it is sooner
						// (in actual ticks) than next driver event (or there is
						// no driver event), then next event is the primary one
						return ticksToNextPriEvent;
					} else if (ticksToNextDriverEvent != -1 &&
						(ticksToNextPriEvent == -1 ||
						ticksToNextPriEvent >= ticksToNextDriverEvent)) {
						// there is incoming driver event, and it is sooner
						// (in actual ticks) than next pri event (or there is
						// no primary event), then next event is the driver one
						return ticksToNextDriverEvent;
					} else {
						// no primary nor driver events incoming
						return -1;
					}
				},
				get currentLoop() {
					return 0;
				}
			});
		}
	});
}

// a story that renames or filters out variable and event names from the other
// story as specified
// story = LLAnimation::Story
// xlt = { key: new_name }, where key is
// - explicit var/event name
// - '*' for the other var/event names
// and new name is:
// - explicit new name
// - null/false/0/"" - suppress this var/name
// - explicit new name with '*' for the source name, e. g. { '*': 'sec.*' }
function llanim$StoryRenameVars({
	story,
	xlt = {}
} = {}) {
	if (new.target != null) {
		return llanim$StoryAlterVarNames(...arguments);
	}

	var explicitReplacements = new Object(),
		explicitDeletes = new Object(), // key -> true
		defaultDelete = false,
		defaultReplacement = false;

	for (var srcId in xlt) {
		if (srcId == "*") {
			if (!xlt[srcId]) {
				defaultDelete = true;
			} else {
				defaultReplacement = xlt[srcId];
			}
		} else {
			if (!xlt[srcId]) {
				explicitDeletes[srcId] = true;
			} else {
				explicitReplacements[srcId] = String(xlt[srcId]).replace(
					"*", srcId);
			}
		}
	}

	function setterXlated(setter) {
		return function({ varName, value, isEvent }) {
			if (explicitDeletes[varName]) {
				return;
			}

			if (explicitReplacements[varName]) {
				return setter({
					varName: explicitReplacements[varName],
					value: value,
					isEvent: isEvent
				});
			}

			if (defaultDelete) {
				return;
			}

			if (defaultReplacement) {
				return setter({
					varName: defaultReplacement.replace("*", varName),
					value: value,
					isEvent: isEvent
				});
			}

			// the var/event is not subject to any xlation
			return setter({
				varName: varName,
				value: value,
				isEvent: isEvent
			});
		};
	}

	return ({
		__proto__: llanim$Story.prototype,
		get durationTicks() {
			return story.durationTicks;
		},
		newState() {
			var state = story.newState();
			return ({
				__proto__: llanim$State.prototype,
				rewindTo(nTick) {
					state.rewindTo(nTick);
				},
				playStep({ ticks, setter }) {
					state.playStep({
						ticks: ticks,
						setter: setterXlated(setter)
					});
				},
				get isFinished() {
					return state.isFinished;
				},
				get ticksToNextEvent() {
					return state.ticksToNextEvent;
				},
				get currentLoop() {
					return state.currentLoop;
				}
			});
		},
		get ticksToFirstEvent() {
			return story.ticksToFirstEvent;
		}
	});
}
