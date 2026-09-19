import {
	FORMAT_ID, ROLE_LIMB, ROLE_SEGMENT,
	DEFAULT_BONE_LENGTH, UNITS_PER_BLOCK,
} from './constants.js';
import {
	isMarionetteFormat, isSegment, isLimb, selectedSegment, selectedLimb,
	chainOf, childSegmentsOf, ownGeometryOf, lengthOf, boneOf, tipOf,
} from './roles.js';
import {
	cubeCorners, meshVertexPoints, boundsOfPoints, fitBoneToBounds, distanceSquared,
} from './geometry.js';
import { normalizeSegments } from './invariants.js';

const AVAILABLE = () => isMarionetteFormat() && Modes.edit;

function warn(messages) {
	Blockbench.showMessageBox({
		title: 'Marionette',
		icon: 'warning',
		message: messages.join('\n\n'),
	});
}

function geometryBounds(segment) {
	const points = [];
	for (const element of ownGeometryOf(segment)) {
		if (element instanceof Cube) {
			points.push(...cubeCorners(element));
		} else if (typeof Mesh !== 'undefined' && element instanceof Mesh) {
			points.push(...meshVertexPoints(element));
		}
	}
	return boundsOfPoints(points);
}

function createSegmentGroup(name, origin, parent) {
	const group = new Group({ name, origin: origin.slice() });
	group.marionette_type = ROLE_SEGMENT;

	const added = group.addTo(parent || 'root');
	if (added === undefined) return null;

	group.init();
	group.createUniqueName();
	return group;
}

export function buildActions() {
	const actions = [];

	actions.push(new Action('marionette_add_limb', {
		name: 'Add Marionette Limb',
		description: 'Create a limb group to hold a chain of segments',
		icon: 'polyline',
		category: 'edit',
		condition: AVAILABLE,
		click() {
			Undo.initEdit({ outliner: true, groups: [], selection: true });

			const limb = new Group({ name: 'limb' });
			limb.marionette_type = ROLE_LIMB;
			limb.addTo(Group.first_selected || 'root');
			limb.init();
			limb.createUniqueName();
			limb.select();

			Undo.finishEdit('Add Marionette limb', { outliner: true, groups: [limb], selection: true });
		},
	}));

	actions.push(new Action('marionette_add_segment', {
		name: 'Add Marionette Segment',
		description: 'Create a segment group with its bone, chained to the selected segment',
		icon: 'line_end_square',
		category: 'edit',
		condition: AVAILABLE,
		click() {
			const previous = selectedSegment();
			const limb = selectedLimb();

			// chain onto selected segment's tip, else start at limb origin
			const origin = previous ? tipOf(previous) : [0, 0, 0];

			// nest under previous segment so outliner reads as the chain, exporter flattens either layout
			const parent = previous || limb || 'root';

			Undo.initEdit({ outliner: true, elements: [], groups: [], selection: true });

			const segment = createSegmentGroup('segment', origin, parent);
			if (!segment) {
				Undo.finishEdit('Add Marionette segment');
				warn(['Could not create the segment group.']);
				return;
			}

			const created = normalizeSegments([segment], warn);
			segment.select();

			Undo.finishEdit('Add Marionette segment', {
				outliner: true,
				elements: created,
				groups: [segment],
				selection: true,
			});

			Canvas.updateView({ elements: created, element_aspects: { transform: true } });
		},
	}));

	actions.push(new Action('marionette_fit_bone', {
		name: 'Fit Bone to Geometry',
		description: "Move the segment's joint to the back of its geometry and match the bone length to it",
		icon: 'straighten',
		category: 'edit',
		condition: () => AVAILABLE() && !!selectedSegment(),
		click() {
			const segment = selectedSegment();
			if (!segment) return;

			const bounds = geometryBounds(segment);
			if (!bounds) {
				warn([`Segment "${segment.name}" has no geometry of its own to fit to.`]);
				return;
			}

			const bone = boneOf(segment);
			if (!bone) {
				warn([`Segment "${segment.name}" has no bone.`]);
				return;
			}

			// pivot move would drag posed geometry since rotation applies about pivot, require rest pose
			if (segment.rotation[0] || segment.rotation[1] || segment.rotation[2]) {
				warn([
					`Segment "${segment.name}" is rotated. Fit Bone to Geometry moves the ` +
					`pivot, which would swing the geometry around it. Zero the segment's ` +
					`rotation first.`,
				]);
				return;
			}

			const fit = fitBoneToBounds(bounds);

			// children whose joints sit on old tip need re-snapping to new one
			const oldTip = tipOf(segment);
			const children = childSegmentsOf(segment);
			const attached = children.filter(
				child => distanceSquared(child.origin, oldTip) < 1e-6
			);
			const detached = children.filter(child => !attached.includes(child));

			const applyResnap = attached.length > 0;

			Undo.initEdit({
				outliner: true,
				elements: [bone],
				groups: [segment, ...children],
			});

			// group origins are absolute model space, preview positions children at (child.origin - parent.origin) so moving pivot leaves cubes in place, verified against NodePreviewController.updateTransform's use_absolute_position branch
			segment.origin[0] = fit.origin[0];
			segment.origin[1] = fit.origin[1];
			segment.origin[2] = fit.origin[2];
			bone.length = fit.length;

			if (applyResnap) {
				const newTip = tipOf(segment);
				for (const child of attached) {
					child.origin[0] = newTip[0];
					child.origin[1] = newTip[1];
					child.origin[2] = newTip[2];
				}
			}

			Undo.finishEdit('Fit bone to geometry');

			Canvas.updateView({
				elements: [bone],
				groups: [segment, ...children],
				element_aspects: { transform: true },
				group_aspects: { transform: true },
			});

			if (detached.length) {
				warn([
					`Fitted "${segment.name}" to its geometry. Its bone is now ` +
					`${fit.length.toFixed(2)} units (${(fit.length / UNITS_PER_BLOCK).toFixed(4)} blocks).`,
					`${detached.length} child segment(s) were not sitting on the old tip, ` +
					`so they were left alone: ${detached.map(c => c.name).join(', ')}. ` +
					`Re-snap them by hand, or run Fit Bone on them too.`,
				]);
			} else {
				Blockbench.showQuickMessage(
					`Bone: ${fit.length.toFixed(2)} units / ` +
					`${(fit.length / UNITS_PER_BLOCK).toFixed(4)} blocks`,
					2000
				);
			}
		},
	}));

	return actions;
}

// creation actions belong next to Add Cube / Add Group / Add Null Object
const ADD_ELEMENT_IDS = ['marionette_add_limb', 'marionette_add_segment'];

// BarItems.add_element.side_menu.structure is a list of action id strings, not Action objects, since add_element's click handler does structure.map(id => BarItems[id]).find(...) and an Action object there makes the lookup yield undefined
function installAddElementEntries() {
	const addElement = typeof BarItems !== 'undefined' && BarItems.add_element;
	const structure = addElement && addElement.side_menu && addElement.side_menu.structure;

	if (!Array.isArray(structure)) {
		console.warn('[Marionette] BarItems.add_element.side_menu is unavailable; ' +
			'the Add Segment / Add Limb entries were not added to the Add Element menu.');
		return () => {};
	}

	for (const id of ADD_ELEMENT_IDS) {
		if (!structure.includes(id)) structure.push(id);
	}

	return () => {
		for (const id of ADD_ELEMENT_IDS) {
			const index = structure.indexOf(id);
			if (index >= 0) structure.splice(index, 1);
		}
	};
}

// `tools` not `filter`: MenuBar.menus has no `filter` entry at 5.1.6 (ids are file, edit, transform, mesh, skin, uv, image, animation, keyframe, timeline, display, tools, view, help), MenuBar.addAction fails silently on unknown menu
export function installActions() {
	const actions = buildActions();

	for (const action of actions) {
		MenuBar.addAction(action, 'tools');
		// '#manage' anchors to MenuSeparator('manage') near bottom of group context menu, above rename/delete
		Group.prototype.menu.addAction(action, '#manage');
	}

	const removeAddElementEntries = installAddElementEntries();

	console.log('[Marionette] actions registered:', actions.map(a => a.id).join(', '));

	return () => {
		removeAddElementEntries();
		for (const action of actions) {
			// action.delete() already walks action.menus and undoes both registrations, explicit removeAction calls below are belt-and-braces in case that list is stale
			Group.prototype.menu.removeAction(action);
			MenuBar.removeAction(`tools.${action.id}`);
			action.delete();
		}
	};
}
