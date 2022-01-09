// engine for calculating collisions
const coll$inCollision = Symbol(),
	coll$refilterCollisionsAndSendEvents = Symbol(),
	coll$offerFlags = Symbol(),
	coll$acceptFlags = Symbol();
function ComCollisionEngine(ent, {
} = {}) {
	var me;
	var collisionZones = new Set(),
		collisionZonesById = new Object(),
		activeCollisions = new Object(),
		zonesToForceRecalculation = new Set(),
		newZones = new Set(),
		needCollisionsRecalc = false;

	// return collision id for 2 collision zones, so that it is the same
	// for same unordered pair of zones
	function getCollisionId({ xcomZone1, xcomZone2 }) {
		var id1 = xcomZone1.id, id2 = xcomZone2.id;
		return "coll[" + (id1 < id2 ? id1 + ":" + id2 : id2 + ":" + id1) + "]";
	}

	// recalculate active collisions, send collision-exit events
	// to the ones that have them disappeared and collision-enter events
	// to the new ones
	function lazyRecalculateCollisions() {
		if (!needCollisionsRecalc) {
			return;
		}
		needCollisionsRecalc = false;

		var zones = [...collisionZones.values()],
			nextActiveCollisions = new Object();
		for (var i = 0; i < zones.length; i++) {
			var zI = zones[i],
				zIR = zI.rect,
				zIx0 = zIR.x,
				zIy0 = zIR.y,
				zIx1 = zIx0 + zIR.width,
				zIy1 = zIy0 + zIR.height;
			// the other zone can be chosen from half of table only,
			// to avoid considering same pair twice (normal + swapped)
			// also don't consider self-collisions
			for (var j = i + 1; j < zones.length; j++) {
				var zJ = zones[j],
					zJR = zJ.rect,
					zJx0 = zJR.x,
					zJy0 = zJR.y,
					zJx1 = zJx0 + zJR.width,
					zJy1 = zJy0 + zJR.height;

				if ((zIx0 < zJx0 && zIx1 < zJx0) ||
					(zIx0 > zJx1 && zIx1 > zJx1) ||
					(zIy0 < zJy0 && zIy1 < zJy0) ||
					(zIy0 > zJy1 && zIy1 > zJy1)) {
					// no collizion between these 2
					continue;
				}

				// otherwise, a collision
				nextActiveCollisions[getCollisionId({
					xcomZone1: zI,
					xcomZone2: zJ
				})] = {
					comZone1: zI,
					comZone2: zJ
				};
			}
		}

		var zonesToRecalculateFilteredCollisions = new Set();

		// list and notify lost collisions
		for (var activeCollisionId in activeCollisions) {
			if (!(activeCollisionId in nextActiveCollisions)) {
				var coll = activeCollisions[activeCollisionId],
					z1 = coll.comZone1,
					z2 = coll.comZone2;
				//z1.ent.postEvent("collisionExit", { comWithZone: z2 });
				//z2.ent.postEvent("collisionExit", { comWithZone: z1 });
				//ent.postEvent("collisionExit", { z1: z1, z2: z2 });
				z1[coll$inCollision].delete(z2);
				z2[coll$inCollision].delete(z1);
				zonesToRecalculateFilteredCollisions.add(z1);
				zonesToRecalculateFilteredCollisions.add(z2);
			}
		}

		// list and notify new collisions
		for (var activeCollisionId in nextActiveCollisions) {
			var coll = nextActiveCollisions[activeCollisionId],
				z1 = coll.comZone1,
				z2 = coll.comZone2;
			if (!(activeCollisionId in activeCollisions) ||
				newZones.has(z1) || newZones.has(z2)) {
				//z1.ent.postEvent("collisionEnter", { comWithZone: z2 });
				//z2.ent.postEvent("collisionEnter", { comWithZone: z1 });
				//ent.postEvent("collisionEnter", { z1: z1, z2: z2 });
				z1[coll$inCollision].add(z2);
				z2[coll$inCollision].add(z1);
				zonesToRecalculateFilteredCollisions.add(z1);
				zonesToRecalculateFilteredCollisions.add(z2);
			}
		}

		activeCollisions = nextActiveCollisions;

		// recalculate filtered collisions
		for (var z of zonesToForceRecalculation) {
			zonesToRecalculateFilteredCollisions.add(z);
		}
		zonesToForceRecalculation.clear();

		for (var z of zonesToRecalculateFilteredCollisions) {
			z[coll$refilterCollisionsAndSendEvents]();
		}

		newZones.clear();
	}

	var entEngine = ent;
	function ComCollisionZone(ent, {
		x,
		y,
		width,
		height,
		id = ent.sceneId,
		acceptFlags = {},
		offerFlags = {}
	}) {
		var me, 
			myRect = { x: x, y: y, height: height, width: width },
			inCollision = new Set(),
			inFilteredCollision = new Set();
			// acceptFlags, offerFlags continue as variables

		function setForceRecalculation() {
			// possibly affected zones are itself and all zones
			// in unfiltered collision with it
			zonesToForceRecalculation.add(me);
			for (var z of inCollision) {
				zonesToForceRecalculation.add(z);
			}
			needCollisionsRecalc = true;
		}

		me = {
			dispose() {
				collisionZones.delete(me);
				if (collisionZonesById[id] === me) {
					delete collisionZonesById[id];
				}
				needCollisionsRecalc = true;
			},
			get id() { return id; },
			get x() { return myRect.x; },
			get y() { return myRect.y; },
			get width() { return myRect.width; },
			get height() { return myRect.height; },
			get rect() { return myRect; },
			setRect({ x, y, width, height }) {
				myRect = { x: x, y: y, width: width, height: height };
				setForceRecalculation();
				//needCollisionsRecalc = true;
			},
			get center() {
				return {
					x: myRect.x + myRect.width * 0.5,
					y: myRect.y + myRect.height * 0.5
				};
			},

			// check which border will be hit from inside by
			// point moving from xFrom,yFrom to xTo,yTo
			// return: {"left":t/f,"right":t/f,"down":t/f,"up":t/f}
			checkOutwardBump({ xFrom, yFrom, xTo, yTo }) {
				var x0 = myRect.x, y0 = myRect.y,
					x1 = myRect.x + myRect.width,
					y1 = myRect.y + myRect.height,
					result = {
						left: false,
						right: false,
						down: false,
						up: false
					};
				if (xFrom >= x0 && xTo < x0) {
					// potential left bump
					var yHit = yFrom + (yTo - yFrom) * (x0 - xFrom) / (xTo - xFrom);
					if ((yHit >= y0 && yHit <= y1) ||
						(yFrom >= y0 && yFrom <= y1)) {
						result.left = true;
					}
				}

				if (xFrom <= x1 && xTo > x1) {
					// potential right bump
					var yHit = yFrom + (yTo - yFrom) * (x1 - xFrom) / (xTo - xFrom);
					if ((yHit >= y0 && yHit <= y1) || 
						(yFrom >= y0 && yFrom <= y1)) {
						result.right = true;
					}
				}

				if (yFrom >= y0 && yTo < y0) {
					// potential up bump
					var xHit = xFrom + (yTo - yFrom) * (y0 - yFrom) / (yTo - yFrom);
					if ((xHit >= x0 && xHit <= x1) ||
						(xFrom >= x0 && xFrom <= x1)) {
						result.up = true;
					}
				}

				if (yFrom <= y1 && yTo > y1) {
					// potential down bump
					var xHit = xFrom + (yTo - yFrom) * (y1 - yFrom) / (yTo - yFrom);
					if ((xHit >= x0 && xHit <= x1) ||
						(xFrom >= x0 && xFrom <= x1)) {
						result.down = true;
					}
				}

				return result;
			},

			containsPoint({ x, y }) {
				var x0 = myRect.x, y0 = myRect.y,
					x1 = myRect.x + myRect.width,
					y1 = myRect.y + myRect.height;
				return x >= x0 && y >= y0 && x <= x1 && y <= y1;
			},

			// the set of incident zones, as is atm, unfiltered
			[coll$inCollision]: inCollision,

			[coll$refilterCollisionsAndSendEvents]() {
				var collisionsLost = new Array(),
					collisionsNew = new Array();
				// update filtered collisions and note the new and the dropped
				// collisions
				// if the zone is no longer in unfiltered collision, then
				// it is lost for sure
				var ifcBefore = new Set(inFilteredCollision);
				for (var zc of inFilteredCollision) {
					if (!inCollision.has(zc)) {
						collisionsLost.push(zc);
						inFilteredCollision.delete(zc);
					}
				}

				for (var zc of inCollision) {
					var matches = true,
						enemyOfferFlags = zc[coll$offerFlags];

					for (var acceptFlag in acceptFlags) {
						if (!!enemyOfferFlags[acceptFlag] != !!acceptFlags[acceptFlag]) {
							matches = false;
							break;
						}
					}

					if (matches) {
						if (!inFilteredCollision.has(zc)) {
							collisionsNew.push(zc);
							inFilteredCollision.add(zc);
						}
					} else {
						if (inFilteredCollision.has(zc)) {
							collisionsLost.push(zc);
							inFilteredCollision.delete(zc);
						}
					}
				}

				// send out events
				for (var collisionLost of collisionsLost) {
					entEngine.postEvent("collisionExit", {
						z1: me,
						z2: collisionLost
					});
					me.ent.postEvent("collisionExit", {
						z1: me,
						z2: collisionLost
					});
				}

				for (var collisionNew of collisionsNew) {
					entEngine.postEvent("collisionEnter", {
						z1: me,
						z2: collisionNew
					});
					me.ent.postEvent("collisionEnter", {
						z1: me,
						z2: collisionNew
					});
				}
			},

			// same, but with lazy recalc
			get inCollision() {
				lazyRecalculateCollisions();
				return inFilteredCollision;
			},

			// set filter flags offered by this zone
			// flagName => true
			setOfferFlags(newOfferFlags) {
				offerFlags = newOfferFlags;
				setForceRecalculation();
			},

			get offerFlags() {
				return Object.assign({}, offerFlags);
			},

			get [coll$offerFlags]() {
				return offerFlags; // by ref, unprotected
			},

			// set filter flags accepted by this zone
			// flagName => true(exp. offer flag on) | false (exp. offer flag on)
			// the zones that can be in collision with this one
			// (this one as the first in pair) must offer the flags
			// that match this one's accept flags
			setAcceptFlags(newAcceptFlags) {
				acceptFlags = newAcceptFlags;
				setForceRecalculation();
			},

			get acceptFlags() {
				return Object.assign({}, acceptFlags);
			},

			get [coll$acceptFlags]() {
				return offerFlags; // by ref, unprotected
			}
		};

		newZones.add(me);
		collisionZones.add(me);
		collisionZonesById[id] = me;
		setForceRecalculation();
		return me;
	}

	var scRecalculatorPerFrame = ent.newScript();
	scRecalculatorPerFrame.run(async function renderer(s) {
		for (;;) {
			await s.waitGameFixedTicks(1);
			lazyRecalculateCollisions();
		}
	});

	return (me = {
		dispose() {
			//entCollisionEventsSink.dispose();
		},

		get ComCollisionZone() { return ComCollisionZone; },
		getCollisionZoneById(collId) {
			return collisionZonesById[collId] || null;
		},
		isInCollisionZone({ point, offerFlags }) {
			ZONE:
			for (var zone of collisionZones) {
				if (zone.containsPoint({
						x: point.x,
						y: point.y
					})) {
					for (var flag in offerFlags) {
						if (zone.offerFlags[flag] != offerFlags[flag]) {
							continue ZONE;
						}
					}

					return true;
				}
			}
			return false;
		}
	});
}
