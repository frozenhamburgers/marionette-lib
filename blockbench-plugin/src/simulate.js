// simulation mode: drag a target, limb reaches for it using the library's own solver.
// add a Null Object under a limb group and it becomes that limb's FABRIK target, turning simulation on makes every limb with one start reaching
// nothing here writes model data, pose lives entirely in three.js transforms on the group scene objects:
// origin/rotation/bone.length never touched, no undo entry opened, stopping restores exact prior transforms.
// difference between a preview and an edit and MUST stay absolute, a simulation that baked itself into the rig would destroy the rest pose the exporter depends on
// solver runs in blocks (fabrik.js), so this module is the only place converting to/from model units

import { UNITS_PER_BLOCK, TARGET_FABRIK, TARGET_PRIME } from './constants.js';
import {
	chainOf, lengthOf, isGroup, isLimb, isMarionetteFormat, targetTypeOf,
	limbsInAttachOrder, parentSegmentOf,
} from './roles.js';
import {
	quaternionFromRotation, quaternionMultiply, quaternionConjugate,
	applyQuaternion, quaternionFromUnitVectors, partToWorld, worldToPart,
} from './geometry.js';
import { createChain, solve, jointsOf, add, subtract, scale, normalize } from './fabrik.js';

const IDENTITY = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };

export function isTarget(node) {
	return typeof NullObject !== 'undefined' && node instanceof NullObject;
}

// mirrors what blockbench's preview controller does for use_absolute_position groups: each group's scene position is origin-parent.origin, rotated by everything above it
export function modelTransformOf(node) {
	const ancestors = [];
	let current = node;
	while (isGroup(current)) {
		ancestors.unshift(current);
		current = current.parent;
	}

	let position = [0, 0, 0];
	let quaternion = [0, 0, 0, 1];
	let parentOrigin = [0, 0, 0];

	for (const group of ancestors) {
		const local = subtract(group.origin, parentOrigin);
		position = add(position, applyQuaternion(quaternion, local));
		quaternion = quaternionMultiply(quaternion, quaternionFromRotation(group.rotation));
		parentOrigin = group.origin;
	}

	return { position, quaternion };
}

function findTarget(limb, type) {
	let found = null;
	(function walk(node) {
		if (found || !node.children) return;
		for (const child of node.children) {
			if (found) return;
			if (isLimb(child)) continue; // a nested limb's targets drive that limb, not this one
			if (isTarget(child) && targetTypeOf(child) === type) { found = child; return; }
			walk(child);
		}
	})(limb);
	return found;
}

export function targetOf(limb) {
	return findTarget(limb, TARGET_FABRIK);
}

export function primeTargetOf(limb) {
	return findTarget(limb, TARGET_PRIME);
}

// NullObject.behavior sets no use_absolute_position, so its position is relative to its parent group's origin, unlike Group/Cube origins which are absolute.
// getting this backwards puts the target somewhere plausible but wrong, looks exactly like a solver bug
export function targetPosition(target) {
	const parent = modelTransformOf(target.parent);
	return add(parent.position, applyQuaternion(parent.quaternion, target.position));
}

// direction from the chain root toward the prime object, matching FabrikAnimator.setPrimeDirection
function primeDirectionOf(description, root) {
	if (!description.primeTarget) return null;
	const position = scale(targetPosition(description.primeTarget), 1 / UNITS_PER_BLOCK);
	const direction = normalize(subtract(position, root));
	return direction[0] || direction[1] || direction[2] ? direction : null;
}

// a segment's MarionettePart at rest: the centre of its bone, which is what the part's position() is,
// and the direction the bone runs
export function partTransformOf(segment) {
	const transform = modelTransformOf(segment);
	const direction = applyQuaternion(transform.quaternion, [0, 0, 1]);
	return {
		position: add(transform.position, scale(direction, lengthOf(segment) / 2)),
		direction,
	};
}

// where the chain root sits in the parent part's own frame, read off the authored rest pose since that
// is the one place the attachment is expressed. the roll-0 frame is used rather than the parent group's
// authored quaternion, whose roll the runtime has no way to reproduce
export function attachmentOffsetOf(limb, parentSegment) {
	const segments = chainOf(limb);
	if (!segments.length) return [0, 0, 0];

	const root = modelTransformOf(segments[0]).position;
	const parent = partTransformOf(parentSegment);
	return worldToPart(parent.direction, subtract(root, parent.position));
}

function describeLimb(limb) {
	const segments = chainOf(limb).filter(segment => lengthOf(segment) > 0);
	if (!segments.length) return null;

	const target = targetOf(limb);
	if (!target) return null;

	return {
		limb, segments, target,
		primeTarget: primeTargetOf(limb),
		parentSegment: parentSegmentOf(limb),
		lengths: segments.map(lengthOf),
	};
}

function stillMatches(entry, description) {
	if (entry.segments.length !== description.segments.length) return false;
	if (entry.target !== description.target) return false;
	if (entry.primeTarget !== description.primeTarget) return false;
	if (entry.parentSegment !== description.parentSegment) return false;
	return entry.segments.every((segment, i) =>
		segment === description.segments[i] &&
		entry.chain.parts[i].length === description.lengths[i] / UNITS_PER_BLOCK
	);
}

// an attached limb roots on its parent part wherever that part is *now*, so the parent's solved pose is
// preferred and the rest pose is only the fallback for a parent limb that has no target and so never solves
function rootOf(description, posed) {
	if (description.parentSegment) {
		const parent = posed.get(description.parentSegment)
			|| scaleTransform(partTransformOf(description.parentSegment), 1 / UNITS_PER_BLOCK);
		const offset = scale(
			attachmentOffsetOf(description.limb, description.parentSegment),
			1 / UNITS_PER_BLOCK,
		);
		return add(parent.position, partToWorld(parent.direction, offset));
	}
	return scale(modelTransformOf(description.segments[0]).position, 1 / UNITS_PER_BLOCK);
}

function scaleTransform(transform, factor) {
	return { position: scale(transform.position, factor), direction: transform.direction };
}

function buildChain(description, posed) {
	const directions = description.segments.map(segment =>
		applyQuaternion(modelTransformOf(segment).quaternion, [0, 0, 1])
	);

	return createChain(
		description.lengths.map(length => length / UNITS_PER_BLOCK),
		rootOf(description, posed),
		directions,
	);
}

// one instance, installSimulation wires it to an action and guarantees teardown
export class Simulation {
	constructor() {
		this.running = false;
		this.entries = new Map();
		this.snapshots = new Map();
		this.frame = null;
	}

	start() {
		if (this.running) return;
		this.running = true;
		this.tick = this.tick.bind(this);
		this.frame = requestAnimationFrame(this.tick);
	}

	// always restores even if the loop never started
	// guarding the whole method on 'running' would skip the restore a case that matters (posed the rig then stopped some other way)
	stop() {
		const wasRunning = this.running;
		this.running = false;
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
			this.frame = null;
		}
		this.restoreAll();
		this.entries.clear();
		return wasRunning;
	}

	toggle() {
		if (this.running) this.stop(); else this.start();
		return this.running;
	}

	tick() {
		if (!this.running) return;
		try {
			this.step();
		} catch (err) {
			// throw inside requestAnimationFrame would stop the loop and leave the rig stuck half-simulated so stop deliberately instead
			console.error('[Marionette] simulation stopped after an error:', err);
			this.stop();
			Blockbench.showQuickMessage('Marionette simulation stopped; see the console.', 3000);
			return;
		}
		this.frame = requestAnimationFrame(this.tick);
	}

	step() {
		if (!isMarionetteFormat()) return;

		const live = new Set();

		// solved pose of every segment simulated this frame, so a limb attached to one roots on where it
		// actually ended up rather than where it was authored. attach order guarantees the parent is in
		// here before any child reads it
		const posed = new Map();

		for (const limb of limbsInAttachOrder()) {
			const description = describeLimb(limb);
			if (!description) continue;
			live.add(limb);

			let entry = this.entries.get(limb);
			if (!entry || !stillMatches(entry, description)) {
				// rebuilt whenever the rig changed under us (segment added, length edited, target swapped)
				// cheaper AND more predictable than trying to patch a stale chain, and enables important function of editing while simulating
				entry = {
					segments: description.segments,
					target: description.target,
					primeTarget: description.primeTarget,
					parentSegment: description.parentSegment,
					chain: buildChain(description, posed),
				};
				this.entries.set(limb, entry);
			}

			const target = scale(targetPosition(description.target), 1 / UNITS_PER_BLOCK);
			entry.chain.root = rootOf(description, posed);
			entry.chain.primeDirection = primeDirectionOf(description, entry.chain.root);
			solve(entry.chain, target);
			this.apply(entry);

			entry.segments.forEach((segment, i) => posed.set(segment, {
				position: entry.chain.parts[i].position,
				direction: entry.chain.parts[i].direction,
			}));
		}

		// a limb that lost its target goes back to its authored pose immediately
		for (const limb of [...this.entries.keys()]) {
			if (!live.has(limb)) {
				this.restoreLimb(limb);
				this.entries.delete(limb);
			}
		}
	}

	// each group's transform has to be expressed in its parent's frame for a nested chain that parent is the segment posed one step earlier,
	// so posed transforms are tracked as we go rather than read back off the scene
	apply(entry) {
		const joints = jointsOf(entry.chain).map(joint => scale(joint, UNITS_PER_BLOCK));
		const posed = new Map();

		for (let i = 0; i < entry.segments.length; i++) {
			const group = entry.segments[i];
			const sceneObject = group.mesh;
			if (!sceneObject) continue;

			const world = {
				position: joints[i],
				quaternion: quaternionFromUnitVectors([0, 0, 1], entry.chain.parts[i].direction),
			};

			const parent = posed.get(group.parent)
				|| (isGroup(group.parent) ? modelTransformOf(group.parent) : IDENTITY);

			const inverse = quaternionConjugate(parent.quaternion);
			const localPosition = applyQuaternion(inverse, subtract(world.position, parent.position));
			const localQuaternion = quaternionMultiply(inverse, world.quaternion);

			this.snapshot(group, sceneObject);
			sceneObject.position.set(localPosition[0], localPosition[1], localPosition[2]);
			sceneObject.quaternion.set(
				localQuaternion[0], localQuaternion[1], localQuaternion[2], localQuaternion[3],
			);
			sceneObject.updateMatrixWorld();

			posed.set(group, world);
		}
	}

	snapshot(group, sceneObject) {
		if (this.snapshots.has(group)) return;
		this.snapshots.set(group, {
			position: [sceneObject.position.x, sceneObject.position.y, sceneObject.position.z],
			quaternion: [
				sceneObject.quaternion.x, sceneObject.quaternion.y,
				sceneObject.quaternion.z, sceneObject.quaternion.w,
			],
		});
	}

	restoreLimb(limb) {
		const entry = this.entries.get(limb);
		if (!entry) return;
		for (const segment of entry.segments) this.restoreGroup(segment);
	}

	restoreGroup(group) {
		const snapshot = this.snapshots.get(group);
		if (!snapshot) return;
		this.snapshots.delete(group);

		const sceneObject = group.mesh;
		if (sceneObject) {
			sceneObject.position.set(...snapshot.position);
			sceneObject.quaternion.set(...snapshot.quaternion);
			sceneObject.updateMatrixWorld();
		}
	}

	restoreAll() {
		for (const group of [...this.snapshots.keys()]) this.restoreGroup(group);
		this.snapshots.clear();
	}
}
