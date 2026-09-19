// turns the outliner into the plain rig description the java emitters consume
// segments are flattened, MarionetteModel does root.getChild(name) (non-recursive) so every segment must be a top-level part regardless of nesting

import { UNITS_PER_BLOCK } from './constants.js';
import {
	allLimbs, chainOf, boneOf, exportOriginOf, lengthOf, ownGeometryOf,
	isGroup, isBone, isSegment,
} from './roles.js';
import { cubeCorners, meshVertexPoints, boundsOfPoints, isUnrotated } from './geometry.js';

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
		uv: (cube.uv_offset || [0, 0]).slice(),
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
// child segments excluded, they become top-level parts of their own
function buildPart(node, origin, unique, integerSize, options) {
	const directCubes = [];
	const childGroups = [];

	for (const child of node.children || []) {
		if (isBone(child)) continue;
		if (isSegment(child)) continue;
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

	for (const limbGroup of allLimbs()) {
		const chain = chainOf(limbGroup);

		if (!chain.length) {
			warnings.push(`Limb "${limbGroup.name}" has no segments and was skipped.`);
			continue;
		}

		const limb = {
			name: limbGroup.name,
			var: unique(javaIdentifier(limbGroup.name, 'limb')),
			segments: [],
		};

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

			limb.segments.push(segment);
			segments.push(segment);
		}

		if (limb.segments.length) limbs.push(limb);
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
