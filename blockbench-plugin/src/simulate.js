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
	applyQuaternion, partQuaternion, partToWorld, worldToPart,
} from './geometry.js';
import { createChain, solve, jointsOf, add, subtract, scale, normalize } from './fabrik.js';

const NO_POSE = new Map();

export function isTarget(node) {
	return typeof NullObject !== 'undefined' && node instanceof NullObject;
}

// mirrors what blockbench's preview controller does for use_absolute_position groups: each group's scene position is origin-parent.origin, rotated by everything above it
// posed maps a group to the world transform simulation has already written onto its scene object, and composition starts at the nearest such ancestor:
// everything below one rides along with it, so reading the rest pose there transforms a nested limb twice over
export function modelTransformOf(node, posed = NO_POSE) {
	const ancestors = [];
	let current = node;
	while (isGroup(current) && !posed.has(current)) {
		ancestors.unshift(current);
		current = current.parent;
	}

	const base = posed.get(current) || null;
	let position = base ? base.position : [0, 0, 0];
	let quaternion = base ? base.quaternion : [0, 0, 0, 1];
	let parentOrigin = base ? current.origin : [0, 0, 0];

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

// NodePreviewController.updateTransform (outliner.js:294) writes a node's mesh position as its own origin
// then subtracts the parent's, since Group.behavior sets use_absolute_position, and NullObject's origin
// getter returns its position, so the local offset is position - parent.origin, which is also how
// NullObject.getWorldCenter reads it back. dropping that term is invisible while a limb group sits at
// 0,0,0 and is off by exactly the limb's own origin once it does not, which is every nested limb
export function targetPosition(target, posed = NO_POSE) {
	const group = target.parent;
	const parent = modelTransformOf(group, posed);
	const local = isGroup(group) ? subtract(target.position, group.origin) : target.position;
	return add(parent.position, applyQuaternion(parent.quaternion, local));
}

/** inverse of {@link targetPosition}: where to store a null object so it sits at `world` */
export function targetLocalPosition(group, world) {
	const parent = modelTransformOf(group);
	const local = applyQuaternion(quaternionConjugate(parent.quaternion), subtract(world, parent.position));
	return isGroup(group) ? add(local, group.origin) : local;
}

// direction from the chain root toward the prime object, matching FabrikAnimator.setPrimeDirection
function primeDirectionOf(description, root, posed) {
	if (!description.primeTarget) return null;
	const position = scale(targetPosition(description.primeTarget, posed), 1 / UNITS_PER_BLOCK);
	const direction = normalize(subtract(position, root));
	return direction[0] || direction[1] || direction[2] ? direction : null;
}

// a segment's MarionettePart at rest: the centre of its bone, which is what the part's position() is,
// and the direction the bone runs
export function partTransformOf(segment, posed = NO_POSE) {
	const transform = modelTransformOf(segment, posed);
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
// preferred and the rest pose is only the fallback for a parent limb that has no target and so never solves.
// that fallback still reads through posed, since an unsimulated limb hanging off a simulated one moves with it
function rootOf(description, parts, posed) {
	if (description.parentSegment) {
		const parent = parts.get(description.parentSegment)
			|| scaleTransform(partTransformOf(description.parentSegment, posed), 1 / UNITS_PER_BLOCK);
		const offset = scale(
			attachmentOffsetOf(description.limb, description.parentSegment),
			1 / UNITS_PER_BLOCK,
		);
		return add(parent.position, partToWorld(parent.direction, offset));
	}
	return scale(modelTransformOf(description.segments[0], posed).position, 1 / UNITS_PER_BLOCK);
}

function scaleTransform(transform, factor) {
	return { position: scale(transform.position, factor), direction: transform.direction };
}

function buildChain(description, parts, posed) {
	const directions = description.segments.map(segment =>
		applyQuaternion(modelTransformOf(segment, posed).quaternion, [0, 0, 1])
	);

	return createChain(
		description.lengths.map(length => length / UNITS_PER_BLOCK),
		rootOf(description, parts, posed),
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
		const parts = new Map();

		// the same frame in scene terms, every group whose transform has already been written this frame,
		// keyed for modelTransformOf so anything below one is read where it now is rather than where it was authored
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
					chain: buildChain(description, parts, posed),
				};
				this.entries.set(limb, entry);
			}

			const target = scale(targetPosition(description.target, posed), 1 / UNITS_PER_BLOCK);
			entry.chain.root = rootOf(description, parts, posed);
			entry.chain.primeDirection = primeDirectionOf(description, entry.chain.root, posed);
			solve(entry.chain, target);
			this.apply(entry, posed);

			entry.segments.forEach((segment, i) => parts.set(segment, {
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
	// so posed transforms are tracked as we go rather than read back off the scene.
	// posed spans the whole frame, not just this limb: the parent of a nested limb's first segment is the limb group,
	// which is not posed itself but hangs off a segment that is, and composing from rest there is what displaced the whole nested chain
	apply(entry, posed) {
		const joints = jointsOf(entry.chain).map(joint => scale(joint, UNITS_PER_BLOCK));

		for (let i = 0; i < entry.segments.length; i++) {
			const group = entry.segments[i];
			const sceneObject = group.mesh;
			if (!sceneObject) continue;

			const world = {
				position: joints[i],
				// the part frame, not the shortest rotation onto the direction. the two differ by a roll, and
				// everything parented under a posed segment -- a nested limb, its targets -- rides on this one,
				// while rootOf resolves the attachment in part space. reaching for a target a roll away from
				// where it is drawn is what that mismatch looks like. this is also the frame the renderer uses
				quaternion: partQuaternion(entry.chain.parts[i].direction),
			};

			const parent = modelTransformOf(group.parent, posed);

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
