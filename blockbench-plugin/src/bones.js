// the outliner bar's show/hide for every segment bone, plus the one piece of view state behind it.
// kept out of actions.js so invariants.js can read the state when it creates a bone without a cycle

import { FORMAT_ID } from './constants.js';
import { allSegments, bonesOf } from './roles.js';

// ArmatureBone.visibility is a plain instance field, NOT a registered Property the way Cube's and Mesh's
// are, so it never reaches the saved .bbmodel. that is what makes this a view toggle rather than an edit:
// no undo step to open, and nothing to dirty
let visible = true;

export function bonesVisible() {
	return visible;
}

export function allBones() {
	return allSegments().flatMap(bonesOf);
}

export function applyBoneVisibility(bones, value = visible) {
	const changed = [];
	for (const bone of bones) {
		if (bone.visibility === value) continue;
		bone.visibility = value;
		changed.push(bone);
	}

	if (!changed.length) return changed;
	// the path the per-bone eye button takes
	if (typeof Canvas !== 'undefined' && Canvas.updateVisibility) Canvas.updateVisibility();
	return changed;
}

export function buildBoneToggle() {
	return new Toggle('marionette_toggle_bones', {
		name: 'Show Marionette Bones',
		description: 'Show or hide every segment bone in the viewport; their outliner rows stay put',
		icon: 'humerus',
		category: 'edit',
		condition: { formats: [FORMAT_ID] },
		default: true,
		onChange(value) {
			visible = value;
			applyBoneVisibility(allBones(), value);
		},
	});
}

// after outliner_toggle rather than at a fixed index: a toolbar's children mix BarItem objects with
// generated separator strings, so counting positions would break the moment blockbench reorders the bar
function placeInOutliner(toggle) {
	const toolbar = typeof Toolbars !== 'undefined' && Toolbars.outliner;
	if (!toolbar) {
		console.warn('[Marionette] Toolbars.outliner is unavailable; the bone toggle was not added to ' +
			'the outliner bar. It is still in Tools and in the keybind list.');
		return false;
	}

	const anchor = typeof BarItems !== 'undefined' && BarItems.outliner_toggle;
	const index = anchor ? toolbar.children.indexOf(anchor) : -1;
	toolbar.add(toggle, index === -1 ? undefined : index + 1);
	return true;
}

export function installBoneVisibility() {
	const toggle = buildBoneToggle();
	const placed = placeInOutliner(toggle);

	// bones loaded from a file default to visible, so a hidden state has to be re-asserted per project.
	// createBone covers the ones born later
	const reapply = () => applyBoneVisibility(allBones());
	const onSelect = Blockbench.on('select_project', reapply);
	const onLoad = Blockbench.on('load_project', reapply);

	return () => {
		onSelect.delete();
		onLoad.delete();
		// Toolbar.add and .remove both save the bar layout to localStorage, so skipping this would leave
		// our id in the user's stored outliner bar after an uninstall. blockbench parks an unknown id in
		// postload rather than erroring, so a stale one is survivable, but it is still ours to clean up
		if (placed && Toolbars.outliner) Toolbars.outliner.remove(toggle);
		applyBoneVisibility(allBones(), true);
		toggle.delete();
	};
}
