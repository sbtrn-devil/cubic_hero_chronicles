// sort of forward reference to ComGameScreen

// particle spawner
function ComParticleSpawner(ent, {
	x,
	y,
	particle, // particleId
	particles = [particle],
	period, // in ticks
	randomPeriodShift = 0,
	xcomGameScreen
} = {}) {
	var me;
	var xcomCollisionEngine = xcomGameScreen.comCollisionEngine,
		xcomScene = entApp.comScene,
		scriptTools = xcomGameScreen.scriptTools;

	var currentState = "off";

	var scrSpawnerPerform = ent.newScript();

	var particlesStack = new Array();
	function getNextParticle() {
		if (particlesStack.length <= 0) {
			particlesStack = particles.slice();

			// shuffle the options
			for (var i = 0; i < particlesStack.length; i++) {
				var j = Math.floor(Math.random() * particlesStack.length),
					t = particlesStack[j];
				particlesStack[j] = particlesStack[0];
				particlesStack[0] = t;
			}
		}

		return particlesStack.pop();
	}

	async function runSpawnerPerform(s) {
		if (randomPeriodShift) {
			await s.waitGameFixedTicks(Math.floor(Math.random()
				* randomPeriodShift));
		}

		for (;;) {
			scriptTools.playParticle({
				particleId: getNextParticle(),
				atPosition: { x: x, y: y }
			});

			s.checkLeave();
			await s.waitGameFixedTicks(period);
		}
	}

	me = {
		dispose() {
			// sub-entities are automatically disposed

			scrSpawnerPerform.dispose();
		},
		
		getState() {
			return currentState;
		},

		setState(stateId) {
			//"on" switches the spawner on
			if (currentState != stateId) {
				currentState = stateId;
				switch(stateId) {
				case "on":
					scrSpawnerPerform.run(runSpawnerPerform);
					break;

				default:
					scrSpawnerPerform.stop();
					break;
				}
			}
		},

		scriptTools: {
			get ent() {
				// direct access to the entity
				return ent;
			},
			get id() {
				return ent.sceneId;
			},
			get rect() {
				// only position for this object
				return { x: x, y: x, width: 0, height: 0 };
			},
			// {x,y}
			get position() {
				// only position for this object
				return { x: x, y: x };
			},
			set position(pos) {
				// no actual geometry for this non-visual object
				x = pos.x;
				y = pos.y;
			},
			// stateId
			get state() {
				return me.getState();
			},
			set state(stateId) {
				me.setState(stateId);
			}
		}
	};

	return me;
}