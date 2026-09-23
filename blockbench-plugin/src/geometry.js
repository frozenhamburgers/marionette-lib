// pure geometry helpers, no blocbkench globals
const DEG = Math.PI / 180;

/**
 * rotation matrix for blockbench's default euler_order ZYX (R = Rz*Ry*Rx), matches minecraft's ModelPart.translateAndRotate
 * @param {number[]} rotation [x, y, z] in degrees
 * @returns {number[][]} 3x3 row-major matrix
 */
export function matrixZYX(rotation) {
	const [rx, ry, rz] = rotation.map(d => d * DEG);
	const cx = Math.cos(rx), sx = Math.sin(rx);
	const cy = Math.cos(ry), sy = Math.sin(ry);
	const cz = Math.cos(rz), sz = Math.sin(rz);

	return [
		[cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
		[sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
		[-sy, cy * sx, cy * cx],
	];
}

/** @returns {number[]} m (3x3 row-major) applied to v */
export function applyMatrix(m, v) {
	return [
		m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
		m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
		m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
	];
}

export function isUnrotated(rotation) {
	return !rotation || (rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0);
}

/**
 * eight model-space corners of a cube, inflate included, cube's own rotation about its own origin applied
 * @param {{from:number[], to:number[], inflate?:number, origin?:number[], rotation?:number[]}} cube
 * @returns {number[][]}
 */
export function cubeCorners(cube) {
	const inflate = cube.inflate || 0;
	const lo = [cube.from[0] - inflate, cube.from[1] - inflate, cube.from[2] - inflate];
	const hi = [cube.to[0] + inflate, cube.to[1] + inflate, cube.to[2] + inflate];

	const corners = [];
	for (const x of [lo[0], hi[0]]) {
		for (const y of [lo[1], hi[1]]) {
			for (const z of [lo[2], hi[2]]) {
				corners.push([x, y, z]);
			}
		}
	}

	if (isUnrotated(cube.rotation)) return corners;

	const m = matrixZYX(cube.rotation);
	const o = cube.origin || [0, 0, 0];
	return corners.map(c => {
		const local = [c[0] - o[0], c[1] - o[1], c[2] - o[2]];
		const r = applyMatrix(m, local);
		return [r[0] + o[0], r[1] + o[1], r[2] + o[2]];
	});
}

/**
 * model-space vertex positions, mesh vertices are stored relative to mesh origin with rotation applied about it
 * @param {{origin:number[], rotation?:number[], vertices:Record<string, number[]>}} mesh
 * @returns {number[][]}
 */
export function meshVertexPoints(mesh) {
	const o = mesh.origin || [0, 0, 0];
	const rotated = !isUnrotated(mesh.rotation);
	const m = rotated ? matrixZYX(mesh.rotation) : null;

	return Object.keys(mesh.vertices).map(key => {
		const v = mesh.vertices[key];
		const p = rotated ? applyMatrix(m, v) : v;
		return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
	});
}

/** @returns {{min:number[], max:number[], center:number[], size:number[]}|null} */
export function boundsOfPoints(points) {
	if (!points.length) return null;

	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];
	for (const p of points) {
		for (let i = 0; i < 3; i++) {
			if (p[i] < min[i]) min[i] = p[i];
			if (p[i] > max[i]) max[i] = p[i];
		}
	}

	return {
		min,
		max,
		center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
		size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
	};
}

// segment export origin: bone's centre, half a bone length along local +Z from joint computed in unposed model space ignoring groups own and ancestor rotations
export function exportOrigin(groupOrigin, boneLength) {
	return [groupOrigin[0], groupOrigin[1], groupOrigin[2] + boneLength / 2];
}

// where next segment in a chain gets pinned: bone's tip, full bone length along local +Z from joint
export function boneTip(groupOrigin, boneLength) {
	return [groupOrigin[0], groupOrigin[1], groupOrigin[2] + boneLength];
}

// squared to avoid a sqrt when only comparing against a tolerance
export function distanceSquared(a, b) {
	const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
	return dx * dx + dy * dy + dz * dz;
}

// pivot at (centre X, centre Y, min Z) since -Z is the parent-side joint, length = Z extent so bone's center lands exactly on geometry's center
export function fitBoneToBounds(bounds) {
	return {
		origin: [bounds.center[0], bounds.center[1], bounds.min[2]],
		length: bounds.size[2],
	};
}

export function multiplyMatrix(a, b) {
	const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 3; c++) {
			out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
		}
	}
	return out;
}

/**
 * model-space direction a segment's local +Z points, i.e. the direction its bone runs and length is measured along
 * @param {number[][]} rotations every group rotation from root down to and including the segment, outermost first
 * @returns {number[]} a unit vector
 */
export function chainDirectionZ(rotations) {
	let m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	for (const rotation of rotations) {
		if (isUnrotated(rotation)) continue;
		m = multiplyMatrix(m, matrixZYX(rotation));
	}
	return applyMatrix(m, [0, 0, 1]);
}

// how much a bone's length changes when model space is scaled by (sx,sy,sz) about any point:
// scaling about O maps p to O+S(p-O), so joint j and tip j+L*d map to j' and j'+L*S*d, new length is exactly L*|S*d|
// for an unrotated segment d=(0,0,1) and results in: full factor under uniform scale, Z factor under axis-limited scale
export function lengthScaleFactor(direction, scale) {
	const length = Math.hypot(direction[0], direction[1], direction[2]);
	if (!length) return 1;
	return Math.hypot(
		direction[0] * scale[0],
		direction[1] * scale[1],
		direction[2] * scale[2],
	) / length;
}

export function isAxisAligned(direction, epsilon = 1e-6) {
	let off = 0;
	for (const component of direction) if (Math.abs(component) > epsilon) off++;
	return off <= 1;
}

// quaternions below used by simulation to pose groups without touching model data

/** [x, y, z, w] from a 3x3 row-major rotation matrix */
export function quaternionFromMatrix(m) {
	const trace = m[0][0] + m[1][1] + m[2][2];

	if (trace > 0) {
		const s = 0.5 / Math.sqrt(trace + 1);
		return [(m[2][1] - m[1][2]) * s, (m[0][2] - m[2][0]) * s, (m[1][0] - m[0][1]) * s, 0.25 / s];
	}
	if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
		const s = 2 * Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]);
		return [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
	}
	if (m[1][1] > m[2][2]) {
		const s = 2 * Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]);
		return [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
	}
	const s = 2 * Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]);
	return [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
}

export function quaternionFromRotation(rotation) {
	if (isUnrotated(rotation)) return [0, 0, 0, 1];
	return quaternionFromMatrix(matrixZYX(rotation));
}

// hamilton product: rotation b followed by a
export function quaternionMultiply(a, b) {
	const [ax, ay, az, aw] = a;
	const [bx, by, bz, bw] = b;
	return [
		aw * bx + ax * bw + ay * bz - az * by,
		aw * by - ax * bz + ay * bw + az * bx,
		aw * bz + ax * by - ay * bx + az * bw,
		aw * bw - ax * bx - ay * by - az * bz,
	];
}

export function quaternionConjugate(q) {
	return [-q[0], -q[1], -q[2], q[3]];
}

export function applyQuaternion(q, v) {
	const [x, y, z, w] = q;
	// t = 2*(q_vec x v); v' = v + w*t + q_vec x t
	const tx = 2 * (y * v[2] - z * v[1]);
	const ty = 2 * (z * v[0] - x * v[2]);
	const tz = 2 * (x * v[1] - y * v[0]);
	return [
		v[0] + w * tx + y * tz - z * ty,
		v[1] + w * ty + z * tx - x * tz,
		v[2] + w * tz + x * ty - y * tx,
	];
}

// shortest rotation taking unit vector from onto unit vector to. antiparallel case has no shortest rotation (since any half turn about a perp axis works)
// so one is picked deterministically, else the formula divides by zero and the segment vanishes
export function quaternionFromUnitVectors(from, to) {
	const dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
	let w = 1 + dot;

	if (w < 1e-6) {
		// antiparallel: perpendicular axis picked off whichever component of from is smallest, keeps cross product well conditioned
		// arbritrary but deterministic so we'll go with this for now
		if (Math.abs(from[0]) > Math.abs(from[2])) {
			return normalizeQuaternion([-from[1], from[0], 0, 0]);
		}
		return normalizeQuaternion([0, -from[2], from[1], 0]);
	}

	return normalizeQuaternion([
		from[1] * to[2] - from[2] * to[1],
		from[2] * to[0] - from[0] * to[2],
		from[0] * to[1] - from[1] * to[0],
		w,
	]);
}

function normalizeQuaternion(q) {
	const d = Math.hypot(q[0], q[1], q[2], q[3]);
	if (!d) return [0, 0, 0, 1];
	return [q[0] / d, q[1] / d, q[2] / d, q[3] / d];
}

// blockbench model space to world space, a 180 yaw matching the renderer's Axis.YP.rotationDegrees(180), derived from setupAnim's setPos mapping composed with the codec's X/Y negation
export function worldDirection(direction) {
	return [-direction[0] + 0, direction[1] + 0, -direction[2] + 0];
}

// part space below: +Z along a part's direction, roll fixed at 0 with +Y up, the frame
// MarionettePart defines and MarionetteModel renders in. ports of MarionettePart's own methods so an
// attachment offset written by the exporter resolves to the same point at runtime.
// safe to feed blockbench-space vectors even though the runtime frame is built in world space: the two
// differ by worldDirection, a half turn about +Y, which leaves part-space components untouched (asserted
// in geometry.test.js)

// Vec3.normalize's 1e-4 zeroing, so a degenerate direction gives the identity frame here as it does there
function unitVector(v) {
	const d = Math.hypot(v[0], v[1], v[2]);
	if (d < 1.0e-4) return [0, 0, 0];
	return [v[0] / d, v[1] / d, v[2] / d];
}

export function partFrameAngles(direction) {
	const d = unitVector(direction);
	return {
		yaw: Math.atan2(d[0], d[2]),
		pitch: Math.asin(Math.max(-1, Math.min(1, d[1]))),
	};
}

// Vec3.xRot(a) is Rx(-a) while Vec3.yRot(a) is Ry(a), the two do not share a handedness, mirrored here
function xRot(v, a) {
	const c = Math.cos(a), s = Math.sin(a);
	return [v[0], v[1] * c + v[2] * s, v[2] * c - v[1] * s];
}

function yRot(v, a) {
	const c = Math.cos(a), s = Math.sin(a);
	return [v[0] * c + v[2] * s, v[1], v[2] * c - v[0] * s];
}

/** MarionettePart.partToWorld: `local` read in the frame `direction` defines */
export function partToWorld(direction, local) {
	const { yaw, pitch } = partFrameAngles(direction);
	return yRot(xRot(local, pitch), yaw);
}

/** MarionettePart.worldToPart */
export function worldToPart(direction, world) {
	const { yaw, pitch } = partFrameAngles(direction);
	return xRot(yRot(world, -yaw), -pitch);
}
