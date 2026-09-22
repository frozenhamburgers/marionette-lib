// kept apart from simulate.js so solver can be tested indepedently

import { Simulation, targetOf, primeTargetOf, modelTransformOf } from './simulate.js';
import { isMarionetteFormat, selectedLimb, chainOf, lengthOf, isGroup } from './roles.js';
import { applyQuaternion } from './geometry.js';
import { TARGET_PRIME } from './constants.js';

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

// halfway out and offset so it reads as a fold hint rather than something to reach
export function defaultPrimePosition(limb) {
	const tip = defaultTargetPosition(limb);
	return [tip[0] * 0.5, tip[1] * 0.5 + 8, tip[2] * 0.5];
}

function addTargetTo(limb, { name, position, type, existing }) {
	if (existing) {
		Blockbench.showQuickMessage(`"${limb.name}" already has a ${name}.`, 2000);
		existing.select();
		return null;
	}

	Undo.initEdit({ outliner: true, elements: [], selection: true });

	const target = new NullObject({ name: `${limb.name}_${name.replace(' ', '_')}` });
	const added = target.addTo(limb);
	if (added === undefined) {
		Undo.finishEdit(`Add Marionette ${name}`, { outliner: true });
		Blockbench.showMessageBox({
			title: 'Marionette',
			icon: 'error',
			message: `Could not add a ${name} to that limb.`,
		});
		return null;
	}

	target.init();
	if (type) target.marionette_target = type;
	target.position.splice(0, 3, ...position);
	target.createUniqueName();
	target.select();

	Undo.finishEdit(`Add Marionette ${name}`, {
		outliner: true, elements: [target], selection: true,
	});

	if (target.preview_controller) target.preview_controller.updateTransform(target);
	return target;
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
			addTargetTo(limb, {
				name: 'target',
				position: defaultTargetPosition(limb),
				existing: targetOf(limb),
			});
		},
	});

	const addPrimeTarget = new Action('marionette_add_prime_target', {
		name: 'Add Marionette Prime Target',
		description: 'Add a prime target biasing which way the selected limb folds',
		icon: 'turn_sharp_right',
		category: 'edit',
		condition: () => AVAILABLE() && !!selectedLimb(),
		click() {
			const limb = selectedLimb();
			if (!limb) return;
			addTargetTo(limb, {
				name: 'prime target',
				position: defaultPrimePosition(limb),
				type: TARGET_PRIME,
				existing: primeTargetOf(limb),
			});
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

	return [addTarget, addPrimeTarget, toggle];
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
