// runs on blockbench's finish_edit event, dispatched before undo.js snapshots post-edit state
// so changes here land in the same undo as the user's edit, one step with corrected bone length captured
// finished_edit fires after the snapshot and would be useless here

import { BONE_ROTATION, DEFAULT_BONE_LENGTH, DEFAULT_BONE_WIDTH } from './constants.js';
import { bonesOf, isSegment, allSegments, isMarionetteFormat } from './roles.js';

const warned = new WeakSet();

/** @returns {{changed: boolean, created: ArmatureBone|null, warnings: string[]}} */
export function normalizeSegment(group) {
	const warnings = [];
	let changed = false;
	let created = null;

	let bones = bonesOf(group);

	if (bones.length === 0) {
		created = createBone(group);
		if (!created) {
			warnings.push(`Could not add a bone to segment "${group.name}".`);
			return { changed, created: null, warnings };
		}
		bones = [created];
		changed = true;
	} else if (bones.length > 1 && !warned.has(bones[0])) {
		// warn rather than delete, extras may be the user's work
		warned.add(bones[0]);
		warnings.push(
			`Segment "${group.name}" has ${bones.length} bones. Marionette uses the ` +
			`first one ("${bones[0].name}") as the segment length. Delete the others.`
		);
	}

	const bone = bones[0];

	// bone sits at the joint. ArmatureBone origins are parent-relative (preview controller assigns origin straight to scene position without subtracting parent origin) unlike Group/Cube origins which are absolute, so Scale corrupts them
	if (bone.origin[0] !== 0 || bone.origin[1] !== 0 || bone.origin[2] !== 0) {
		bone.origin[0] = bone.origin[1] = bone.origin[2] = 0;
		changed = true;
	}

	// re-asserted every pass because ArmatureBone.flip() negates rotations on the axes it isnt flipping
	for (let i = 0; i < 3; i++) {
		if (bone.rotation[i] !== BONE_ROTATION[i]) {
			bone.rotation[i] = BONE_ROTATION[i];
			changed = true;
		}
	}

	// connected defaults to true, left on a parent bone would stretch itself to reach this one instead of honoring its own length
	if (bone.connected !== false) {
		bone.connected = false;
		changed = true;
	}

	// keep bone last among segments children
	const siblings = group.children;
	const index = siblings.indexOf(bone);
	if (index !== -1 && index !== siblings.length - 1) {
		siblings.splice(index, 1);
		siblings.push(bone);
		changed = true;
	}

	if (changed && bone.preview_controller) {
		bone.preview_controller.updateTransform(bone);
	}

	return { changed, created, warnings };
}

function createBone(group) {
	const bone = new ArmatureBone({
		name: `${group.name}_bone`,
		origin: [0, 0, 0],
		rotation: BONE_ROTATION.slice(),
		connected: false,
		length: DEFAULT_BONE_LENGTH,
		width: DEFAULT_BONE_WIDTH,
	});

	// addTo() returns undefined when parent_types rejects the target, so this cant be chained
	const added = bone.addTo(group);
	if (added === undefined) return null;

	bone.init();
	if (typeof Format !== 'undefined' && Format.bone_rig) bone.createUniqueName();

	// if segment was selected every descendant was too and a bone added afterwards must join them
	if (group.selected && typeof bone.markAsSelected === 'function') bone.markAsSelected();

	return bone;
}

/** @returns {{changed: boolean, created: ArmatureBone[], warnings: string[]}} */
export function normalizeAll() {
	const created = [];
	const warnings = [];
	let changed = false;

	for (const segment of allSegments()) {
		const result = normalizeSegment(segment);
		if (result.changed) changed = true;
		if (result.created) created.push(result.created);
		warnings.push(...result.warnings);
	}

	return { changed, created, warnings };
}

// skips the pass on the overwhelming majority of edits (texture changes, keyframes, etc) without touching the outliner
function editTouchesRig(aspects) {
	if (!aspects) return false;
	if (aspects.outliner) return true;
	if (aspects.groups && aspects.groups.length) return true;
	if (aspects.elements && aspects.elements.some(el => el instanceof ArmatureBone)) return true;
	return false;
}

export function installNormalizePass(reportWarnings) {
	let running = false;

	const listener = Blockbench.on('finish_edit', ({ aspects }) => {
		if (!isMarionetteFormat()) return;
		if (running) return; // our own mutations must not re-enter
		if (!editTouchesRig(aspects)) return;

		running = true;
		try {
			const result = normalizeAll();
			if (result.warnings.length) reportWarnings(result.warnings);
			if (result.changed || result.created.length) {
				Canvas.updateView({
					elements: result.created,
					element_aspects: { transform: true },
				});
			}
		} finally {
			running = false;
		}
	});

	return () => listener.delete();
}

// normalizes segments inside an undo step the caller already opened
export function normalizeSegments(segments, reportWarnings) {
	const warnings = [];
	const created = [];

	for (const segment of segments) {
		if (!isSegment(segment)) continue;
		const result = normalizeSegment(segment);
		if (result.created) created.push(result.created);
		warnings.push(...result.warnings);
	}

	if (warnings.length && reportWarnings) reportWarnings(warnings);
	return created;
}
