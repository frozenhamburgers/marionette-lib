// QUERIES only over the outliner: limbs, segments, bone ownership, chain order, nothing here should mutate

import { FORMAT_ID, ROLE_NONE, ROLE_LIMB, ROLE_SEGMENT } from './constants.js';
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

// depth-first in outliner order gives the right ordering for both layouts the exporter accepts:
// IMPORTANT: nested chains read parent-then-child, flat chains read top-to-bottom. segments nested inside another segment are still collected since the exporter flattens either way
export function chainOf(limb) {
	const out = [];
	walk(limb);
	return out;

	function walk(node) {
		if (!node || !node.children) return;
		for (const child of node.children) {
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

// segment group current selection is "in": a selected segment, the segment a selected element sits inside, or null
export function selectedSegment() {
	if (typeof Group !== 'undefined' && Group.first_selected) {
		if (isSegment(Group.first_selected)) return Group.first_selected;
		const ancestor = nearestAncestorWithRole(Group.first_selected, ROLE_SEGMENT);
		if (ancestor) return ancestor;
	}
	if (typeof Outliner !== 'undefined' && Outliner.selected && Outliner.selected.length) {
		return nearestAncestorWithRole(Outliner.selected[0], ROLE_SEGMENT);
	}
	return null;
}

export function selectedLimb() {
	const segment = selectedSegment();
	if (segment) {
		const limb = limbOf(segment);
		if (limb) return limb;
	}
	if (typeof Group !== 'undefined' && Group.first_selected) {
		if (isLimb(Group.first_selected)) return Group.first_selected;
		return nearestAncestorWithRole(Group.first_selected, ROLE_LIMB);
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
