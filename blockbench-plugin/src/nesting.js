// a limb dropped straight into another limb has nowhere to attach: only a segment owns an attachment
// point, since the offset is read in a MarionettePart's frame and a limb group is not a part.
// rather than let it export silently rooted on the entity, prompt for the segment it belongs to.

import {
	allLimbs, chainOf, enclosingLimbOf, isMarionetteFormat, isMisnestedLimb,
} from './roles.js';
import { distanceSquared } from './geometry.js';
import { modelTransformOf } from './simulate.js';

// once per group, so cancelling is not punished with the dialog on every later edit. cleared again if the
// group is moved somewhere valid, so a limb broken a second time still prompts
const prompted = new WeakSet();

export function misnestedLimbs() {
	const found = [];
	for (const limb of allLimbs()) {
		if (isMisnestedLimb(limb)) found.push(limb);
		else prompted.delete(limb);
	}
	return found;
}

// closest by where the limb's root actually sits, which is nearly always the segment the user meant
export function nearestSegment(limb, segments) {
	const chain = chainOf(limb);
	if (!chain.length || !segments.length) return segments[0] || null;

	const root = modelTransformOf(chain[0]).position;
	let best = segments[0];
	let bestDistance = Infinity;

	for (const segment of segments) {
		const distance = distanceSquared(root, modelTransformOf(segment).position);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = segment;
		}
	}
	return best;
}

export function attachLimbTo(limb, segment) {
	Undo.initEdit({ outliner: true, groups: [limb, segment] });

	const moved = limb.addTo(segment);
	if (moved === undefined) {
		Undo.finishEdit('Nest Marionette limb');
		Blockbench.showMessageBox({
			title: 'Marionette',
			icon: 'error',
			message: `Could not move "${limb.name}" into "${segment.name}".`,
		});
		return null;
	}

	Undo.finishEdit('Nest Marionette limb', { outliner: true, groups: [limb, segment] });
	Canvas.updateView({ groups: [limb, segment], group_aspects: { transform: true } });
	return limb;
}

export function buildPrompt(limb) {
	const enclosing = enclosingLimbOf(limb);
	const segments = enclosing ? chainOf(enclosing) : [];

	if (!segments.length) {
		Blockbench.showMessageBox({
			title: 'Marionette',
			icon: 'warning',
			message:
				`"${limb.name}" is nested directly inside "${enclosing ? enclosing.name : 'another limb'}", ` +
				`which has no segments to attach it to. Add a segment there first, then move ` +
				`"${limb.name}" into it.`,
		});
		return null;
	}

	const options = {};
	for (const segment of segments) options[segment.uuid] = segment.name;
	const suggested = nearestSegment(limb, segments);

	return new Dialog({
		id: 'marionette_nest_limb',
		title: 'Marionette',
		form: {
			info: {
				type: 'info',
				text:
					`"${limb.name}" sits directly inside "${enclosing.name}". A limb attaches to a ` +
					`segment, not to another limb, so pick the segment it hangs off. Its root offset is ` +
					`then measured in that segment's own frame.`,
			},
			segment: {
				label: 'Attach to segment',
				type: 'select',
				options,
				default: suggested && suggested.uuid,
			},
		},
		onConfirm(form) {
			const segment = segments.find(candidate => candidate.uuid === form.segment);
			if (segment) attachLimbTo(limb, segment);
			this.hide();
		},
	});
}

export function installNesting() {
	// deferred out of the edit that caused it: finish_edit runs inside the user's undo step, and opening a
	// dialog there would fold the reparent into whatever they were actually doing
	let pending = null;

	function review() {
		if (!isMarionetteFormat()) return;

		for (const limb of misnestedLimbs()) {
			if (prompted.has(limb)) continue;
			prompted.add(limb);

			const dialog = buildPrompt(limb);
			if (dialog) dialog.show();
			return; // one at a time, moving this one may well fix the rest
		}
	}

	const listener = Blockbench.on('finish_edit', () => {
		if (pending !== null) return;
		pending = setTimeout(() => {
			pending = null;
			review();
		}, 0);
	});

	return () => {
		if (pending !== null) clearTimeout(pending);
		listener.delete();
	};
}
