// turns the outliner into the plain rig description the java emitters consume
// segments are flattened, MarionetteModel does root.getChild(name) (non-recursive) so every segment must be a top-level part regardless of nesting

import { UNITS_PER_BLOCK } from './constants.js';
import {
	chainOf, boneOf, exportOriginOf, lengthOf, ownGeometryOf,
	isGroup, isBone, isSegment, isLimb, isMisnestedLimb, limbsInAttachOrder, parentSegmentOf,
} from './roles.js';
import {
	cubeCorners, meshVertexPoints, boundsOfPoints, isUnrotated, worldDirection, worldToPart,
} from './geometry.js';
import {
	primeTargetOf, targetPosition, modelTransformOf, attachmentOffsetOf, partTransformOf,
} from './simulate.js';
import { normalize, subtract, scale } from './fabrik.js';

export function javaIdentifier(name, fallback = 'part') {
	let cleaned = String(name || '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '');
	if (!cleaned || /^[0-9]/.test(cleaned)) cleaned = `${fallback}_${cleaned}`;
	return cleaned;
}

function uniqueNamer() {
	const taken = new Set();
	return function unique(name) {
		let candidate = name;
		let n = 1;
		while (taken.has(candidate)) candidate = `${name}${++n}`;
		taken.add(candidate);
		return candidate;
	};
}

function cubeData(cube, integerSize) {
	const size = [0, 1, 2].map(axis => {
		const raw = cube.to[axis] - cube.from[axis];
		return integerSize ? Math.round(raw) : raw;
	});

	return {
		name: cube.name,
		from: cube.from.slice(),
		to: cube.to.slice(),
		size,
		inflate: cube.inflate || 0,
		// texOffs takes ints, and the codec rounds the same way (I() in the modded entity templates)
		uv: (cube.uv_offset || [0, 0]).map(Math.round),
		mirror: !!cube.mirror_uv,
		rotation: (cube.rotation || [0, 0, 0]).slice(),
		origin: (cube.origin || [0, 0, 0]).slice(),
	};
}

// buckets rotated cubes into synthetic _rN subgroups the way the codec does: cubes sharing a rotation merge, needing matching origins too when more than one rotation axis is non-zero
// else only zero-rotation axes must line up
export function bucketRotatedCubes(cubes) {
	const plain = [];
	const buckets = [];

	for (const cube of cubes) {
		if (isUnrotated(cube.rotation)) {
			plain.push(cube);
			continue;
		}

		const axes = cube.rotation.filter(r => r !== 0).length;
		const match = buckets.find(bucket => {
			if (!sameVector(bucket.rotation, cube.rotation)) return false;
			if (axes > 1) return sameVector(bucket.origin, cube.origin);
			return cube.rotation.every((r, i) => r !== 0 || bucket.origin[i] === cube.origin[i]);
		});

		if (match) {
			match.cubes.push(cube);
		} else {
			buckets.push({
				source: cube.name,
				rotation: cube.rotation.slice(),
				origin: cube.origin.slice(),
				cubes: [cube],
			});
		}
	}

	return { plain, buckets };
}

function sameVector(a, b) {
	return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

// builds part tree for one segment (segment part, rotated-cube subgroups, plain nested sub-groups)
// child segments excluded, and nested limbs with them, they become top-level parts of their own
function buildPart(node, origin, unique, integerSize, options) {
	const directCubes = [];
	const childGroups = [];

	for (const child of node.children || []) {
		if (isBone(child)) continue;
		if (isSegment(child)) continue;
		// a nested limb's segments become top-level parts of their own, folding it in here would emit
		// its geometry a second time as a child of this part
		if (isLimb(child)) continue;
		if (child.export === false) continue;

		if (isGroup(child)) {
			childGroups.push(child);
		} else if (options.isCube(child)) {
			directCubes.push(cubeData(child, integerSize));
		}
	}

	const { plain, buckets } = bucketRotatedCubes(directCubes);

	const part = {
		name: '', // caller assigns, it knows whether this is a segment
		var: '',
		origin: origin.slice(),
		rotation: [0, 0, 0],
		cubes: plain,
		children: [],
	};

	for (const bucket of buckets) {
		const name = unique(`${javaIdentifier(bucket.source)}_r1`);
		part.children.push({
			name,
			var: name,
			origin: bucket.origin.slice(),
			rotation: bucket.rotation.slice(),
			cubes: bucket.cubes,
			children: [],
		});
	}

	for (const group of childGroups) {
		const child = buildPart(group, group.origin, unique, integerSize, options);
		const name = unique(javaIdentifier(group.name));
		child.name = name;
		child.var = name;
		child.rotation = (group.rotation || [0, 0, 0]).slice();
		part.children.push(child);
	}

	return part;
}

export function segmentBounds(segment, options) {
	const points = [];
	for (const element of ownGeometryOf(segment)) {
		if (options.isCube(element)) points.push(...cubeCorners(element));
		else if (options.isMesh(element)) points.push(...meshVertexPoints(element));
	}
	return boundsOfPoints(points);
}

// prime object's direction from the chain root, in the frame the chain is rooted in, since that is
// where FabrikAnimator.setRootPrimeDirection reads it back: the parent part's own frame when nested,
// which is the one the editor carries the prime object around in, and the entity's otherwise
function primeDirectionOf(limbGroup, firstSegment, parentSegment) {
	const prime = primeTargetOf(limbGroup);
	if (!prime) return null;

	const root = modelTransformOf(firstSegment).position;
	const direction = normalize(subtract(targetPosition(prime), root));
	if (!direction[0] && !direction[1] && !direction[2]) return null;

	// no worldDirection on the nested path, the same way attachmentOffsetOf does without one: that flip is
	// a 180 yaw, which shifts the part frame's own yaw by 180 too, so it cancels out of a part-space
	// coordinate. flipping the vector alone would leave it a half turn off
	if (!parentSegment) return worldDirection(direction);
	return worldToPart(partTransformOf(parentSegment).direction, direction);
}

// which segment of which other limb this one hangs off, resolved once so the attachment offset and the
// prime direction cannot disagree about it
function nestingOf(limbGroup) {
	if (isMisnestedLimb(limbGroup)) return { misnested: true, parentSegment: null };
	return { misnested: false, parentSegment: parentSegmentOf(limbGroup) };
}

// fills in limb.attachment: which part of which other limb this one roots on, and where on it
function resolveAttachment(limb, limbGroup, nesting, locationOf) {
	if (nesting.misnested) {
		return [`Limb "${limb.name}" sits directly inside another limb with no segment between them, ` +
			`so there is nothing for it to attach to and it will be rooted on the entity. Move it into ` +
			`one of that limb's segments.`];
	}

	const parentSegment = nesting.parentSegment;
	if (!parentSegment) return [];

	const location = locationOf.get(parentSegment);
	if (!location) {
		return [`Limb "${limb.name}" is nested in segment "${parentSegment.name}", which was not ` +
			`exported, so the limb will be rooted on the entity instead.`];
	}

	const offset = scale(attachmentOffsetOf(limbGroup, parentSegment), 1 / UNITS_PER_BLOCK);
	limb.attachment = {
		limb: location.limb.var,
		partName: location.limb.segments[location.index].part.name,
		partIndex: location.index,
		offset,
	};

	if (!losesPerpendicular(parentSegment, offset)) return [];
	const perpendicular = Math.hypot(offset[0], offset[1]);
	return [`Limb "${limb.name}" attaches ${perpendicular.toFixed(3)} blocks off the axis of segment ` +
		`"${parentSegment.name}", which points very nearly straight up or down. A part has no roll, so ` +
		`there is no defined sideways direction on it and the limb will not root where the editor shows ` +
		`it. Move the attachment onto that segment's axis, or angle the segment away from vertical.`];
}

// a nested limb's prime direction rides the same frame the offset does, so it is lost the same way
function primeDirectionWarnings(limb, nesting) {
	if (!nesting.parentSegment || !limb.primeDirection) return [];
	if (!losesPerpendicular(nesting.parentSegment, limb.primeDirection)) return [];

	return [`Limb "${limb.name}" is primed across the axis of segment "${nesting.parentSegment.name}", ` +
		`which points very nearly straight up or down. A part has no roll, so there is no defined ` +
		`sideways direction on it and the bias will swing around as that segment wobbles. Prime it ` +
		`along the segment's axis, or angle the segment away from vertical.`];
}

// a part carries a direction and no roll, so which way "sideways" points is undefined once the
// direction goes vertical, and only the axial component of a part-space vector survives the trip. see
// MarionettePart.partToWorld
function losesPerpendicular(parentSegment, vector) {
	if (Math.hypot(vector[0], vector[1]) <= 1e-4) return false;
	return Math.abs(partTransformOf(parentSegment).direction[1]) > 0.999;
}

/** @returns {{limbs: Array, segments: Array, textureWidth: number, textureHeight: number, shadowRadius: number, warnings: string[]}} */
export function collectRig(options = {}) {
	const isCube = options.isCube || (el => typeof Cube !== 'undefined' && el instanceof Cube);
	const isMesh = options.isMesh || (el => typeof Mesh !== 'undefined' && el instanceof Mesh);
	const integerSize = options.integerSize !== undefined
		? options.integerSize
		: (typeof Format !== 'undefined' && !!Format.integer_size);
	const helpers = { isCube, isMesh };

	const unique = uniqueNamer();
	const warnings = [];
	const limbs = [];
	const segments = [];

	// group is kept out of the limb description itself so it stays plain data for the java emitters
	const groupOf = new Map();
	const locationOf = new Map();
	const nestingFor = new Map();

	// parents before children, so a limb's attachment can name a part of a chain already collected and
	// the generated constructor assigns the parent's field before the child reads it
	for (const limbGroup of limbsInAttachOrder()) {
		const chain = chainOf(limbGroup);

		if (!chain.length) {
			warnings.push(`Limb "${limbGroup.name}" has no segments and was skipped.`);
			continue;
		}

		const nesting = nestingOf(limbGroup);
		const limb = {
			name: limbGroup.name,
			var: unique(javaIdentifier(limbGroup.name, 'limb')),
			primeDirection: primeDirectionOf(limbGroup, chain[0], nesting.parentSegment),
			attachment: null,
			segments: [],
		};
		groupOf.set(limb, limbGroup);
		nestingFor.set(limb, nesting);

		for (const group of chain) {
			const bone = boneOf(group);
			if (!bone) {
				warnings.push(`Segment "${group.name}" has no bone and was skipped.`);
				continue;
			}

			const lengthUnits = lengthOf(group);
			if (lengthUnits <= 0) {
				warnings.push(`Segment "${group.name}" has zero length; its chain will collapse.`);
			}

			const origin = exportOriginOf(group);
			const part = buildPart(group, origin, unique, integerSize, helpers);
			const name = unique(javaIdentifier(group.name, 'segment'));
			part.name = name;
			part.var = name;

			const bounds = segmentBounds(group, helpers);
			const segment = {
				source: group.name,
				part,
				lengthUnits,
				lengthBlocks: lengthUnits / UNITS_PER_BLOCK,
				hasGeometry: !!bounds,
				// hitbox dimensions have no blockbench representation, derived from geometry as a starting point (noted in the sidecar). sizeXZ is the segment's cross-section so it comes from the X extent alone, Z extent is the bone's own length axis and feeding that in would give a long segment a hitbox as wide as it is long
				sizeXZ: bounds
					? bounds.size[0] / UNITS_PER_BLOCK
					: lengthUnits / UNITS_PER_BLOCK,
				sizeY: bounds
					? bounds.size[1] / UNITS_PER_BLOCK
					: lengthUnits / UNITS_PER_BLOCK,
			};

			locationOf.set(group, { limb, index: limb.segments.length });
			limb.segments.push(segment);
			segments.push(segment);
		}

		if (limb.segments.length) limbs.push(limb);
	}

	for (const limb of limbs) {
		const nesting = nestingFor.get(limb);
		warnings.push(...resolveAttachment(limb, groupOf.get(limb), nesting, locationOf));
		warnings.push(...primeDirectionWarnings(limb, nesting));
	}

	if (!limbs.length) warnings.push('No limbs with segments were found; nothing to export.');

	const textureWidth = options.textureWidth
		|| (typeof Project !== 'undefined' && Project.texture_width) || 16;
	const textureHeight = options.textureHeight
		|| (typeof Project !== 'undefined' && Project.texture_height) || 16;

	return {
		limbs,
		segments,
		textureWidth,
		textureHeight,
		shadowRadius: options.shadowRadius !== undefined ? options.shadowRadius : 0.5,
		warnings,
	};
}
