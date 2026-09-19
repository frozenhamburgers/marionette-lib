// port of FabrikAnimatore
// units are blocks not model units, library's tolerance and reach threshold are absolute worldspac

const TOLERANCE = 0.01;
const MAX_ITERATIONS = 100;

// Vec3.normalize: returns ZERO below 1e-4 like minecraft
export function normalize(v) {
	const d = Math.hypot(v[0], v[1], v[2]);
	if (d < 1.0e-4) return [0, 0, 0];
	return [v[0] / d, v[1] / d, v[2] / d];
}

export function subtract(a, b) {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a, b) {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(v, factor) {
	return [v[0] * factor, v[1] * factor, v[2] * factor];
}

export function distance(a, b) {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// MarionettePart stores its centre, joints are centre -/+ direction * length/2
export function rootPos(part) {
	return subtract(part.position, scale(part.direction, part.length / 2));
}

export function endPos(part) {
	return add(part.position, scale(part.direction, part.length / 2));
}

export function setRootPos(part, root) {
	part.position = add(root, scale(part.direction, part.length / 2));
}

export function setEndPos(part, end) {
	part.position = subtract(end, scale(part.direction, part.length / 2));
}

export function setDirection(part, vector) {
	part.direction = normalize(vector);
}

/**
 * @param {number[]} lengths segment lengths in blocks, root-most first
 * @param {number[]} root chain root in blocks
 * @param {number[][]} directions initial unit direction per segment
 */
export function createChain(lengths, root, directions) {
	const parts = lengths.map((length, i) => ({
		length,
		direction: directions && directions[i] ? normalize(directions[i]) : [0, 0, 1],
		position: [0, 0, 0],
	}));

	const chain = { parts, root: root.slice(), followRootOnly: false };
	layOutFrom(chain, null);
	return chain;
}

// this is basically primeMultipart aslo reused for how a fresh chain gets its initial positions
export function layOutFrom(chain, direction) {
	let lastEnd = chain.root;
	for (const part of chain.parts) {
		if (direction) setDirection(part, direction);
		setRootPos(part, lastEnd);
		lastEnd = endPos(part);
	}
}

function fabrikForward(chain, target) {
	const { parts } = chain;
	for (let i = parts.length - 1; i >= 0; i--) {
		const part = parts[i];
		const lastEnd = i === 0 ? chain.root : endPos(parts[i - 1]);
		const nextRoot = i === parts.length - 1 ? target : rootPos(parts[i + 1]);

		setDirection(part, subtract(nextRoot, lastEnd));
		setEndPos(part, nextRoot);
	}
}

function fabrikBackward(chain, target) {
	const { parts } = chain;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const lastEnd = i === 0 ? chain.root : endPos(parts[i - 1]);

		let nextRoot;
		if (i === parts.length - 1) {
			nextRoot = chain.followRootOnly ? endPos(part) : target;
		} else {
			nextRoot = rootPos(parts[i + 1]);
		}

		setDirection(part, subtract(nextRoot, lastEnd));
		setRootPos(part, lastEnd);
	}
}

/**
 * tickMultipart minus part.tick(), no partial ticks to interpolate in the editor.
 * @returns {number} iterations run for nonconvergence flagging
 */
export function solve(chain, target) {
	const totalLength = chain.parts.reduce((sum, part) => sum + part.length, 0);
	const distToTarget = distance(target, chain.root);

	if (distToTarget >= totalLength && !chain.followRootOnly) {
		// out of reach, skip FABRIK and lay chain out straight at it, iterating would only creep toward a point it can't occupy
		layOutFrom(chain, subtract(target, chain.root));
		return 0;
	}

	let iterations = 0;
	// at least one pass per tick even when already converged, so a segment the user just dragged gets pulled back into the chain
	do {
		if (!chain.followRootOnly) fabrikForward(chain, target);
		fabrikBackward(chain, target);
		iterations++;
	} while (
		!chain.followRootOnly &&
		distance(target, endPos(chain.parts[chain.parts.length - 1])) > TOLERANCE &&
		iterations < MAX_ITERATIONS
	);

	return iterations;
}

// what the editor poses to
export function jointsOf(chain) {
	return chain.parts.map(rootPos);
}
