import { isMarionetteFormat, isGroup, getRole } from './roles.js';
import { ROLE_NONE } from './constants.js';

// plain organisational folders keep stock behavior
function isRigGroup(group) {
	return isGroup(group) && getRole(group) !== ROLE_NONE;
}

/** @returns {boolean} whether anything needed repairing */
export function reselectDescendants(group) {
	let repaired = false;

	group.forEachChild(node => {
		if (node.selected) return;
		// markAsSelected sets the flag, and for elements also puts them back into Outliner.selected which the transform tools actually read
		node.markAsSelected();
		repaired = true;
	});

	return repaired;
}

export function installSelectionFix() {
	const originalSelect = Group.prototype.select;

	Group.prototype.select = function (...args) {
		const result = originalSelect.apply(this, args);

		if (isMarionetteFormat() && this.selected && isRigGroup(this)) {
			// only after the fact and only when something is actually missing, no-ops on every normal select
			if (reselectDescendants(this) && typeof updateSelection === 'function') {
				updateSelection();
			}
		}

		return result;
	};

	return () => {
		Group.prototype.select = originalSelect;
	};
}
