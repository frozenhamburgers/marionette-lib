// the marionette ModelFormat, marionette_type group property
// and behavior overrides letting a bone live inside a plain group all torn down by the returned teardown so unloading leaves other formats untouched

import {
	FORMAT_ID, ROLE_NONE, ROLE_LIMB, ROLE_SEGMENT, TARGET_FABRIK, TARGET_PRIME,
} from './constants.js';

// flags copied from modded_entity so marionette models behave identically in editor
function baseFlags() {
	const source = Formats.modded_entity;
	if (!source) {
		console.warn('[Marionette] Formats.modded_entity is missing; using built-in defaults.');
		return {
			box_uv: true,
			box_uv_float_size: true,
			single_texture: true,
			bone_rig: true,
			centered_grid: true,
			rotate_cubes: true,
			animation_mode: true,
			pbr: true,
			node_name_regex: '\\w',
		};
	}

	return {
		box_uv: source.box_uv,
		box_uv_float_size: source.box_uv_float_size,
		single_texture: source.single_texture,
		bone_rig: source.bone_rig,
		centered_grid: source.centered_grid,
		rotate_cubes: source.rotate_cubes,
		animation_mode: source.animation_mode, // animation_mode gates Null Object element used as simulation mode's draggable target
		pbr: source.pbr,
		node_name_regex: source.node_name_regex,
	};
}

export function registerFormat() {
	const format = new ModelFormat(FORMAT_ID, {
		icon: 'polyline',
		category: 'minecraft',
		target: 'Minecraft: Java Edition',
		name: 'Marionette Rig',
		description: 'Procedurally animated multipart entity for the Marionette library',
		show_on_start_screen: true,
		...baseFlags(),
	});

	Object.defineProperty(format, 'integer_size', {
		configurable: true,
		get() {
			const setting = typeof settings !== 'undefined' && settings.modded_entity_integer_size;
			return setting ? !!setting.value : false;
		},
	});

	return format;
}

export function registerRoleProperty() {
	return new Property(Group, 'enum', 'marionette_type', {
		default: ROLE_NONE,
		values: [ROLE_NONE, ROLE_LIMB, ROLE_SEGMENT],
		condition: { formats: [FORMAT_ID] },
		label: 'Marionette role',
		inputs: {
			element_panel: {
				input: {
					label: 'Marionette role',
					type: 'select',
					options: {
						[ROLE_NONE]: 'None',
						[ROLE_LIMB]: 'Limb (chain of segments)',
						[ROLE_SEGMENT]: 'Segment (pivot is the joint)',
					},
				},
			},
		},
	});
}

export function registerBehaviorOverrides() {
	const overrides = [];

	overrides.push(ArmatureBone.addBehaviorOverride({
		condition: { formats: [FORMAT_ID] },
		priority: 10,
		behavior: {
			// bones never parent other bones, replacing the array (not extending) enforces that
			parent_types: ['group'],
			child_types: [],

			// movable/rotatable actually NOT set false here, causes attachment issues for higher level groups
			// + locking isn't needed for correctness since trying to manually rotate the bones will just cause it to snap back to its segment rotation once released
			// probably a more elegant way to do this but i can't be bothered for now
		},
	}));

	return overrides;
}

/** @returns {{format: ModelFormat, teardown: () => void}} */
export function registerTargetProperty() {
	return new Property(NullObject, 'enum', 'marionette_target', {
		default: TARGET_FABRIK,
		values: [TARGET_FABRIK, TARGET_PRIME],
		condition: { formats: [FORMAT_ID] },
		label: 'Marionette target',
		inputs: {
			element_panel: {
				input: {
					label: 'Marionette target',
					type: 'select',
					options: {
						[TARGET_FABRIK]: 'FABRIK target (chain reaches for it)',
						[TARGET_PRIME]: 'Prime target (biases which way it folds)',
					},
				},
			},
		},
	});
}

export function installFormat() {
	const format = registerFormat();
	const properties = [registerRoleProperty(), registerTargetProperty()];
	const overrides = registerBehaviorOverrides();

	return {
		format,
		teardown() {
			for (const override of overrides) override.delete();
			for (const property of properties) property.delete();
			format.delete();
		},
	};
}
