// QUERIES only over the outliner: limbs, segments, bone ownership, chain order, nothing here should mutate

import {
	FORMAT_ID, ROLE_NONE, ROLE_LIMB, ROLE_SEGMENT, TARGET_FABRIK,
} from './constants.js';
import { boneTip, exportOrigin } from './geometry.js';

export function isMarionetteFormat() {
	return typeof Format !== 'undefined' && Format && Format.id === FORMAT_ID;
}

// groups created in other formats never had the property reset onto them, so undefined must read as 'none'
export function getRole(node) {
	if (!isGroup(node)) return ROLE_NONE;
	return node.marionette_type || ROLE_NONE;
}

export function isGroup(node) {
	return typeof Group !== 'undefined' && node instanceof Group;
}

export function isSegment(node) {
	return getRole(node) === ROLE_SEGMENT;
}

export function isLimb(node) {
	return getRole(node) === ROLE_LIMB;
}

export function isBone(node) {
	return typeof ArmatureBone !== 'undefined' && node instanceof ArmatureBone;
}

// should be exactly one for a segment
export function bonesOf(group) {
	if (!group || !group.children) return [];
	return group.children.filter(isBone);
}

// null if invariant pass hasn't run yet / segment has none
export function boneOf(group) {
	return bonesOf(group)[0] || null;
}

export function lengthOf(group) {
	const bone = boneOf(group);
	return bone ? bone.length : 0;
}

export function exportOriginOf(group) {
	return exportOrigin(group.origin, lengthOf(group));
}

// where a child segments joint should sit
export function tipOf(group) {
	return boneTip(group.origin, lengthOf(group));
}

function allGroups() {
	if (typeof Group === 'undefined' || !Group.all) return [];
	return Group.all;
}

export function allLimbs() {
	return allGroups().filter(isLimb);
}

export function allSegments() {
	return allGroups().filter(isSegment);
}

export function nearestAncestorWithRole(node, role) {
	let parent = node && node.parent;
	while (parent && parent !== 'root') {
		if (getRole(parent) === role) return parent;
		parent = parent.parent;
	}
	return null;
}

export function limbOf(segment) {
	return nearestAncestorWithRole(segment, ROLE_LIMB);
}

// nearest ancestor holding a rig role, whichever of the two comes first, so plain organisational
// folders in between are transparent but a segment shadows the limb above it
function nearestRigAncestor(node) {
	let parent = node && node.parent;
	while (parent && parent !== 'root') {
		if (isSegment(parent) || isLimb(parent)) return parent;
		parent = parent.parent;
	}
	return null;
}

// segment a nested limb hangs off, null for a top-level limb
export function parentSegmentOf(limb) {
	const ancestor = nearestRigAncestor(limb);
	return isSegment(ancestor) ? ancestor : null;
}

export function enclosingLimbOf(limb) {
	return nearestAncestorWithRole(limb, ROLE_LIMB);
}

// limb sitting straight inside another limb with no segment between them: nothing owns an attachment
// point for it, so there is nowhere for its root to go
export function isMisnestedLimb(limb) {
	return isLimb(limb) && isLimb(nearestRigAncestor(limb));
}

// parents first, since an attachment names a part of its parent's chain and the generated constructor
// assigns limb fields in this order.
// Group.all is depth first, so a nested limb already trails the limb it hangs off and this sort is
// currently a no-op. it is here to make the requirement explicit instead of incidental to that order,
// and the outliner being a tree is what keeps it from cycling
export function limbsInAttachOrder() {
	const limbs = allLimbs();
	const order = [];
	const placed = new Set();

	for (const limb of limbs) place(limb);
	return order;

	function place(limb) {
		if (placed.has(limb)) return;
		placed.add(limb);

		const segment = parentSegmentOf(limb);
		const parent = segment && limbOf(segment);
		if (parent && parent !== limb) place(parent);

		order.push(limb);
	}
}

// depth-first in outliner order gives the right ordering for both layouts the exporter accepts:
// IMPORTANT: nested chains read parent-then-child, flat chains read top-to-bottom. segments nested inside another segment are still collected since the exporter flattens either way
export function chainOf(limb) {
	const out = [];
	walk(limb);
	return out;

	function walk(node) {
		if (!node || !node.children) return;
		for (const child of node.children) {
			// a nested limb owns its own chain, it attaches to a segment rather than extending one
			if (isLimb(child)) continue;
			if (isSegment(child)) out.push(child);
			// recurse regardless of role so segments wrapped in plain organisational folders are still found
			if (isGroup(child)) walk(child);
		}
	}
}

// used to warn about stale joints
export function childSegmentsOf(segment) {
	if (!segment || !segment.children) return [];
	return segment.children.filter(isSegment);
}

// segment `node` sits in, or null. a selected limb resolves to no segment at all, even though it is
// nested in one: the context is that limb, not the segment holding it, or adding to a nested limb would
// land everything in its parent chain instead
function segmentAround(node) {
	if (isSegment(node)) return node;
	if (isLimb(node)) return null;
	return isSegment(nearestRigAncestor(node)) ? nearestRigAncestor(node) : null;
}

// segment group current selection is "in": a selected segment, the segment a selected element sits inside, or null
export function selectedSegment() {
	if (typeof Group !== 'undefined' && Group.first_selected) {
		const segment = segmentAround(Group.first_selected);
		if (segment) return segment;
	}
	if (typeof Outliner !== 'undefined' && Outliner.selected && Outliner.selected.length) {
		return segmentAround(Outliner.selected[0]);
	}
	return null;
}

// nearest enclosing limb, which for a nested limb is that limb itself.
// resolved straight off the selection rather than via selectedSegment: going through the segment walks
// out past the limb boundary and lands on whichever limb owns that segment, so every nested limb used to
// resolve to the outermost one
export function selectedLimb() {
	if (typeof Group !== 'undefined' && Group.first_selected) {
		if (isLimb(Group.first_selected)) return Group.first_selected;
		const limb = nearestAncestorWithRole(Group.first_selected, ROLE_LIMB);
		if (limb) return limb;
	}
	if (typeof Outliner !== 'undefined' && Outliner.selected && Outliner.selected.length) {
		return nearestAncestorWithRole(Outliner.selected[0], ROLE_LIMB);
	}
	return null;
}

// bone-geometry pairing:
// geometry belonging to a segment itself: own cubes/meshes plus those in nested non-segment groups, child segments and bones excluded
export function ownGeometryOf(segment) {
	const out = [];
	walk(segment);
	return out;

	function walk(node) {
		if (!node || !node.children) return;
		for (const child of node.children) {
			if (isBone(child)) continue;
			if (isSegment(child)) continue; // child segments own their geometry
			if (isLimb(child)) continue; // as does a nested limb, all the way down
			if (isGroup(child)) {
				walk(child);
			} else if (child.export !== false) {
				out.push(child);
			}
		}
	}
}

// every group rotation from outermost ancestor down to and including node, outermost first, feed to geometry.chainDirectionZ to find which way a segment's bone actually points in model space
export function rotationChainOf(node) {
	const chain = [];
	let current = node;
	while (current && current !== 'root') {
		if (isGroup(current)) chain.unshift((current.rotation || [0, 0, 0]).slice());
		current = current.parent;
	}
	return chain;
}

export function targetTypeOf(node) {
	return (node && node.marionette_target) || TARGET_FABRIK;
}
