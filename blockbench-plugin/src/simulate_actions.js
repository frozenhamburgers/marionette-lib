// kept apart from simulate.js so solver can be tested indepedently

import { Simulation, targetOf, modelTransformOf } from './simulate.js';
import { isMarionetteFormat, selectedLimb, chainOf, lengthOf, isGroup } from './roles.js';
import { applyQuaternion } from './geometry.js';

const AVAILABLE = () => isMarionetteFormat() && Modes.edit;

// just past the tip of the limb's chain so it chain solves to pose close to being its rest position
export function defaultTargetPosition(limb) {
	const segments = chainOf(limb);
	if (!segments.length) return [0, 0, 0];

	const last = segments[segments.length - 1];
	const transform = modelTransformOf(last);
	const direction = applyQuaternion(transform.quaternion, [0, 0, 1]);
	const length = lengthOf(last);

	const tip = [
		transform.position[0] + direction[0] * length,
		transform.position[1] + direction[1] * length,
		transform.position[2] + direction[2] * length,
	];

	// NullObject.position is parent-relative, subtract the limb's origin
	const limbOrigin = isGroup(limb) ? limb.origin : [0, 0, 0];
	return [tip[0] - limbOrigin[0], tip[1] - limbOrigin[1], tip[2] - limbOrigin[2]];
}

export function buildSimulationActions(simulation) {
	const addTarget = new Action('marionette_add_target', {
		name: 'Add Marionette Target',
		description: 'Add an IK target to the selected limb for the simulation to reach',
		icon: 'ads_click',
		category: 'edit',
		condition: () => AVAILABLE() && !!selectedLimb(),
		click() {
			const limb = selectedLimb();
			if (!limb) return;

			const existing = targetOf(limb);
			if (existing) {
				Blockbench.showQuickMessage(`"${limb.name}" already has a target.`, 2000);
				existing.select();
				return;
			}

			Undo.initEdit({ outliner: true, elements: [], selection: true });

			const target = new NullObject({ name: `${limb.name}_target` });
			const added = target.addTo(limb);
			if (added === undefined) {
				Undo.finishEdit('Add Marionette target', { outliner: true });
				Blockbench.showMessageBox({
					title: 'Marionette',
					icon: 'error',
					message: 'Could not add a target to that limb.',
				});
				return;
			}

			target.init();
			target.position.splice(0, 3, ...defaultTargetPosition(limb));
			target.createUniqueName();
			target.select();

			Undo.finishEdit('Add Marionette target', {
				outliner: true, elements: [target], selection: true,
			});

			if (target.preview_controller) target.preview_controller.updateTransform(target);
		},
	});

	const toggle = new Action('marionette_toggle_simulation', {
		name: 'Simulate Marionette Rig',
		description: 'Solve every limb with a target toward it, the way the library will at runtime',
		icon: 'animation',
		category: 'edit',
		condition: AVAILABLE,
		click() {
			const running = simulation.toggle();
			Blockbench.showQuickMessage(
				running
					? 'Marionette simulation on. Drag a target to pose its limb.'
					: 'Marionette simulation off; the authored pose has been restored.',
				2500,
			);
		},
	});

	return [addTarget, toggle];
}

export function installSimulation() {
	const simulation = new Simulation();
	const actions = buildSimulationActions(simulation);

	for (const action of actions) {
		MenuBar.addAction(action, 'tools');
		Group.prototype.menu.addAction(action, '#manage');
	}

	// leaving the format or closing the project must not leave a rig frozen in a simulated pose, the transforms are ours to undo and nothing else knows they're there
	const onFormat = Blockbench.on('convert_format', () => simulation.stop());
	const onProject = Blockbench.on('select_project', () => simulation.stop());

	return () => {
		onFormat.delete();
		onProject.delete();
		simulation.stop();
		for (const action of actions) {
			Group.prototype.menu.removeAction(action);
			MenuBar.removeAction(`tools.${action.id}`);
			action.delete();
		}
	};
}
