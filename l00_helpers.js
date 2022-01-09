//#include entcore.js

// some helpers

// a component to report progress of a given array of thenables
// to the hosting entity
function ComHlpProgress(ent, {
	progressEventId = "helpers$progress",
	// ^data is always { completed: m, total: n }
	doneEventId = "helpers$done"
	// ^data is always { total: n }, raised persistently
} = {}) {
	var pendingTasks = new Set(),
		doneTasks = new Set();

	// by default
	ent.raiseEvent(doneEventId, { total: pendingTasks.size });

	function getCompleteTask(thenable) {
		return function completeTask() {
			pendingTasks.delete(thenable);
			doneTasks.add(thenable);
			var total = pendingTasks.size + doneTasks.size,
				completed = doneTasks.size;
			ent.postEvent(progressEventId,
				{ completed: completed, total: total });
			if (completed >= total) {
				ent.raiseEvent(doneEventId, { total: total });
			}
		}
	}

	return (me = {
		addTasks(...thenables) {
			if (thenables.length) {
				ent.clearEvent(doneEventId);
				for (var thenable of thenables) {
					pendingTasks.add(thenable);
					thenable.then(getCompleteTask(thenable),
						getCompleteTask(thenable));
				}
			}
		},
		dispose() {
			ent.clearEvent(doneEventId);
		}
	});
}

// compile generated resources
function compileFunctionsInRes({
	resRoot,
	resRoot$valid = (resRoot != null) ||
		argError("resRoot must be provided"),
	methodNames = ["getState"]
} = {}) {
	function compile(root) {
		for (var id in root) {
			if (typeof (root[id]) == 'object') {
				compile(root[id]);
			}
			if (methodNames.indexOf(id) != -1) {
				root[id] = eval(root[id]);
			}
		}
	}

	compile(resRoot);
}

// res_maps.gen.js
compileFunctionsInRes({
	resRoot: ResMaps
});
