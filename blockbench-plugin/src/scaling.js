// stock scaleElements does two wrong things to a segment bone: scales origin as if it were model space (it isn't, ArmatureBone origins are parent-relative), dragging the bone off its joint, and never touches length, so scaling a limb leaves every segment its old size while joints move apart
// fix via dialog's handlers, Dialog stores them as instance properties and invokes via this.onConfirm(...), so wrapping is a plain property swap onunload reverses properly
// again kinda fucky

import { isMarionetteFormat, isSegment, boneOf, rotationChainOf } from './roles.js';
import { chainDirectionZ, lengthScaleFactor, isAxisAligned } from './geometry.js';

// key under which pre-scale length is parked on the bone's temp_data
const SNAPSHOT = 'marionette_length_before';

// one warning per dialog session, not one per slider tick
let warnedAboutShear = false;

// the same set blockbench uses for group origins, so joints and lengths scale together, if a segment's joint is being repositioned its length scales too, else not.
// loose cubes with no group selected means this is empty and lengths are left alone
export function scaleTargets() {
	if (!isMarionetteFormat()) return [];
	if (typeof ModelScaler === 'undefined') return [];
	return ModelScaler.getScaleGroups().filter(isSegment);
}

// disabled axes scale by 1
export function scaleVector(form) {
	const size = typeof form.scale === 'number' ? form.scale : 1;
	const axis = form.axis;
	if (!axis) return [size, size, size];
	return [axis.x ? size : 1, axis.y ? size : 1, axis.z ? size : 1];
}

export function snapshotLengths() {
	warnedAboutShear = false;
	for (const segment of scaleTargets()) {
		const bone = boneOf(segment);
		if (bone) bone.temp_data[SNAPSHOT] = bone.length;
	}
}

// always computed from the snapshot rather than current length, matching how scaleElements works off temp_data.before,
// also dragging the slider back and forth must land on the original value not compound
export function applyLengths(form) {
	const scale = scaleVector(form);
	const nonUniform = scale[0] !== scale[1] || scale[1] !== scale[2];
	const touched = [];

	for (const segment of scaleTargets()) {
		const bone = boneOf(segment);
		if (!bone) continue;

		const before = bone.temp_data[SNAPSHOT];
		if (before === undefined) continue;

		const direction = chainDirectionZ(rotationChainOf(segment));
		bone.length = before * lengthScaleFactor(direction, scale);

		// undo scaleElements' treatment of the parent-relative origin here rather than leave it to the invariant pass, so the live preview is honest (the pass only catches it at finish_edit)
		bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;

		if (nonUniform && !isAxisAligned(direction)) warnAboutShear();

		touched.push(bone);
	}

	refresh(touched);
	return touched;
}

// non-uniform scale of a rotated segment has no correct answer:
// bone endpoints land where lengthScaleFactor says (length is right)
// but direction has changed and blockbench doesn't rotate groups when scaling, and it's kinda not worth trying to deal with that for this specific edge case
// the pose would need to change to follow the geometry and won't, so notify
function warnAboutShear() {
	if (warnedAboutShear) return;
	warnedAboutShear = true;
	Blockbench.showQuickMessage(
		'Marionette: non-uniform scale on a rotated segment; lengths will follow, but poses do not.',
		4000,
	);
}

export function restoreLengths() {
	const touched = [];
	for (const segment of scaleTargets()) {
		const bone = boneOf(segment);
		if (!bone || bone.temp_data[SNAPSHOT] === undefined) continue;
		bone.length = bone.temp_data[SNAPSHOT];
		bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;
		touched.push(bone);
	}
	refresh(touched);
	clearSnapshots();
	return touched;
}

function clearSnapshots() {
	if (typeof ArmatureBone === 'undefined' || !ArmatureBone.all) return;
	for (const bone of ArmatureBone.all) delete bone.temp_data[SNAPSHOT];
}

function refresh(bones) {
	for (const bone of bones) {
		if (bone.preview_controller) bone.preview_controller.updateTransform(bone);
	}
}

export function installScaleHook() {
	if (typeof ModelScaler === 'undefined' || !ModelScaler.dialog) {
		console.warn('[Marionette] ModelScaler.dialog is missing; segment lengths will not follow the Scale tool.');
		return () => {};
	}

	const dialog = ModelScaler.dialog;
	const original = {
		onOpen: dialog.onOpen,
		onFormChange: dialog.onFormChange,
		onConfirm: dialog.onConfirm,
		onCancel: dialog.onCancel,
	};

	// dialog passes form result but not every caller so fall back to asking
	function formOf(args) {
		const first = args[0];
		if (first && typeof first === 'object' && 'scale' in first) return first;
		return dialog.getFormResult();
	}

	dialog.onOpen = function (...args) {
		const result = original.onOpen ? original.onOpen.apply(this, args) : undefined;
		if (isMarionetteFormat()) snapshotLengths(); // after the original: openDialog fills temp_data before show(), form isn't applied until setFormValues which runs later still
		return result;
	};

	dialog.onFormChange = function (...args) {
		const result = original.onFormChange ? original.onFormChange.apply(this, args) : undefined;
		if (isMarionetteFormat()) applyLengths(formOf(args));
		return result;
	};

	dialog.onConfirm = function (...args) {
		if (isMarionetteFormat()) applyLengths(formOf(args));
		const result = original.onConfirm ? original.onConfirm.apply(this, args) : undefined;
		clearSnapshots();
		return result;
	};

	dialog.onCancel = function (...args) {
		if (isMarionetteFormat()) restoreLengths();
		return original.onCancel ? original.onCancel.apply(this, args) : undefined;
	};

	return () => {
		Object.assign(dialog, original);
	};
}
